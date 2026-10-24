// A deterministic, dependency-free camp simulation. advance receives speed-adjusted seconds.
export const ITEMS = Object.freeze({
  tent: { name: '棉花糖帐篷', description: '休息的地方；雨天配合天幕能获得更好的恢复。', width: 2.5, depth: 2.85, limit: 1 },
  canopy: { name: '奶油天幕', description: '覆盖帐篷或营火，减少雨水影响。可与其他设施重叠。', width: 3.4, depth: 3.1, limit: 1 },
  chair: { name: '蜜桃露营椅', description: '提升营地舒适度。', width: 0.95, depth: 1.1, limit: 4 },
  table: { name: '饼干小桌', description: '整齐的用餐区会提升舒适度。', width: 1.65, depth: 1.18, limit: 2 },
  lantern: { name: '暖光营灯', description: '在夜间提供光线和舒适感。', width: 0.6, depth: 0.6, limit: 4 },
  campfire: { name: '小小营火', description: '需要木柴；提供温暖并用于烹饪。雨中燃烧更快。', width: 1.6, depth: 1.6, limit: 1 },
});

export const WEATHER_SCHEDULE = Object.freeze([
  { elapsed: 0, weather: 'sunny' }, { elapsed: 150, weather: 'cloudy' },
  { elapsed: 230, weather: 'rain' }, { elapsed: 385, weather: 'cloudy' },
  { elapsed: 500, weather: 'sunny' },
]);
const STEP = 0.25;
const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const has = (state, type) => state.items.some(item => item.type === type);
const copy = state => ({ ...state, items: state.items.map(item => ({ ...item })), resources: { ...state.resources }, stats: { ...state.stats }, fire: { ...state.fire }, pending: state.pending ? { ...state.pending } : null, log: state.log.map(event => ({ ...event })) });
function log(state, text) {
  state.log.push({ id: `event-${state.nextId++}`, text, time: state.elapsed });
  state.log = state.log.slice(-60);
}
export function createState() {
  return {
    version: 1, elapsed: 0, duration: 720, carry: 0, started: false, paused: false,
    finished: false, speed: 1, weatherOverride: 'auto',
    items: [
      { id: 'tent-1', type: 'tent', x: -2, z: -1.5, rotation: 0 },
      { id: 'fire-1', type: 'campfire', x: 0.8, z: 0.8, rotation: 0 },
      { id: 'chair-1', type: 'chair', x: -0.6, z: 1.4, rotation: 0 },
      { id: 'table-1', type: 'table', x: -2, z: 1.2, rotation: 0 },
      { id: 'lantern-1', type: 'lantern', x: -0.3, z: -1.5, rotation: 0 },
    ],
    resources: { wood: 8, food: 4, water: 5 },
    stats: { comfort: 70, energy: 85, warmth: 75 },
    fire: { lit: false, fuel: 0 }, cooked: 0, pending: null,
    gathered: 0, meals: 0, drinks: 0, nextId: 1,
    log: [{ id: 'welcome', text: '一片奶油色的草地，等你安放今天的好心情。', time: 0 }],
  };
}
export function getHour(state) { return (14 + state.elapsed / 40) % 24; }
export function getWeather(state) {
  if (state.weatherOverride !== 'auto') return state.weatherOverride;
  return WEATHER_SCHEDULE.filter(event => event.elapsed <= state.elapsed).at(-1).weather;
}
function bounds(item) {
  const def = ITEMS[item.type], angle = item.rotation ?? 0;
  const w = Math.abs(Math.cos(angle)) * def.width + Math.abs(Math.sin(angle)) * def.depth;
  const d = Math.abs(Math.sin(angle)) * def.width + Math.abs(Math.cos(angle)) * def.depth;
  return { left: item.x - w / 2, right: item.x + w / 2, top: item.z - d / 2, bottom: item.z + d / 2 };
}
export function validPlacement(state, candidate) {
  if (!candidate || !Object.hasOwn(ITEMS, candidate.type)) return { ok: false, message: '请选择有效的露营设施。' };
  if (![candidate.x, candidate.z, candidate.rotation ?? 0].every(Number.isFinite)) return { ok: false, message: '放置坐标无效。' };
  const others = state.items.filter(item => item.id !== candidate.id);
  if (others.filter(item => item.type === candidate.type).length >= ITEMS[candidate.type].limit) return { ok: false, message: `${ITEMS[candidate.type].name}已达到数量上限。` };
  const a = bounds(candidate);
  if (a.left < -5 || a.right > 4 || a.top < -3.8 || a.bottom > 3.8) return { ok: false, message: '设施需要完整放在草地范围内。' };
  if (candidate.type !== 'canopy') {
    for (const other of others) {
      if (other.type === 'canopy') continue;
      const b = bounds(other);
      if (a.left < b.right - 0.035 && a.right > b.left + 0.035 && a.top < b.bottom - 0.035 && a.bottom > b.top + 0.035) return { ok: false, message: '这里有其他设施，稍微挪开一点吧。' };
    }
  }
  return { ok: true, message: '可以放在这里。' };
}
export function getShelter(state, type = 'tent') {
  const target = state.items.find(item => item.type === type);
  if (!target) return false;
  // Cover the centre and most of the target, rather than a misleading edge overlap.
  const t = bounds(target);
  return state.items.filter(item => item.type === 'canopy').some(item => {
    const c = bounds(item);
    const intersection = Math.max(0, Math.min(c.right, t.right) - Math.max(c.left, t.left)) * Math.max(0, Math.min(c.bottom, t.bottom) - Math.max(c.top, t.top));
    return intersection / ((t.right - t.left) * (t.bottom - t.top)) >= 0.7;
  });
}
function finish(state) {
  state.finished = true; state.paused = false; state.pending = null; state.carry = 0;
  log(state, '晨光到了。把这一夜的温暖和小小收获，收进露营日记。');
}
function tick(state) {
  const previousWeather = getWeather(state);
  state.elapsed = Math.min(state.duration, state.elapsed + STEP);
  const weather = getWeather(state), rainy = weather === 'rain';
  if (weather !== previousWeather) log(state, ({ sunny: '云散了，天空变得清澈。', cloudy: '云朵慢慢聚拢，看看接下来的天气吧。', rain: '雨点落下了。天幕能为帐篷和营火遮雨。' })[weather]);
  const hour = getHour(state), night = hour >= 19 || hour < 6;
  const fireShelter = getShelter(state, 'campfire');
  let heat = 0;
  if (state.fire.lit) {
    heat = rainy && !fireShelter ? 0.45 : 1;
    state.fire.fuel = Math.max(0, state.fire.fuel - STEP * (rainy && !fireShelter ? 1.6 : 1));
    if (state.fire.fuel <= 0) { state.fire.lit = false; heat = 0; log(state, '木柴烧完了。添一根木柴，再点起营火吧。'); }
  }
  const sheltered = getShelter(state, 'tent');
  state.stats.warmth = clamp(state.stats.warmth + STEP * ((night ? -0.042 : -0.008) - (rainy ? (sheltered ? 0.012 : 0.045) : 0) + heat * 0.135));
  state.stats.energy = clamp(state.stats.energy - STEP * (0.017 + (state.stats.warmth < 25 ? 0.02 : 0)));
  const targetComfort = clamp(45 + (has(state, 'tent') ? 12 : 0) + (has(state, 'chair') ? 8 : 0) + (has(state, 'table') ? 5 : 0) + (night && has(state, 'lantern') ? 8 : 0) + heat * 7 - (rainy && !sheltered ? 17 : 0) - (state.stats.warmth < 25 ? 10 : 0));
  state.stats.comfort = clamp(state.stats.comfort + clamp(targetComfort - state.stats.comfort, -0.055 * STEP, 0.055 * STEP));
  if (state.pending) {
    const pending = state.pending;
    if (pending.type !== 'cook' || state.fire.lit) pending.remaining = Math.max(0, pending.remaining - STEP);
    if (pending.type === 'rest') {
      state.stats.energy = clamp(state.stats.energy + STEP * (rainy && !sheltered ? 0.13 : 0.4));
      state.stats.warmth = clamp(state.stats.warmth + STEP * (rainy && !sheltered ? -0.012 : 0.035));
    }
    if (pending.type === 'gatherWood') state.stats.energy = clamp(state.stats.energy - STEP * 0.12);
    if (pending.remaining <= 0) {
      if (pending.type === 'cook') { state.cooked++; log(state, '热乎乎的营地料理做好了，记得趁热吃。'); }
      if (pending.type === 'rest') log(state, rainy && !sheltered ? '小憩结束。雨声很近，下次给帐篷搭一片天幕吧。' : '小憩结束，精神恢复了一些。');
      if (pending.type === 'gatherWood') { state.resources.wood = Math.min(24, state.resources.wood + 3); state.gathered++; log(state, `捡到了 3 份干木柴。附近还能收集 ${3 - state.gathered} 次。`); }
      state.pending = null;
    }
  }
  if (state.elapsed >= state.duration) finish(state);
}
export function advance(state, seconds) {
  const next = copy(state);
  if (!next.started || next.paused || next.finished || !Number.isFinite(seconds) || seconds <= 0) return next;
  next.carry += Math.min(seconds, next.duration - next.elapsed);
  const steps = Math.floor((next.carry + 1e-8) / STEP);
  next.carry = Math.max(0, Math.round((next.carry - steps * STEP) * 1e9) / 1e9);
  for (let i = 0; i < steps && !next.finished; i++) tick(next);
  return next;
}
export function act(state, action, payload) {
  const next = copy(state);
  const fail = message => ({ state: next, ok: false, message });
  const success = message => { log(next, message); return { state: next, ok: true, message }; };
  if (action === 'setWeather') {
    const weather = typeof payload === 'string' ? payload : payload?.weather;
    if (!['auto', 'sunny', 'cloudy', 'rain'].includes(weather)) return fail('天气选项无效。');
    next.weatherOverride = weather;
    return success(weather === 'auto' ? '已恢复自然天气变化。' : `天气切换为${({ sunny: '晴天', cloudy: '多云', rain: '下雨' })[weather]}。`);
  }
  if (action === 'setSpeed') {
    const speed = typeof payload === 'number' ? payload : payload?.speed;
    if (![1, 3, 10].includes(speed)) return fail('请选择 1、3 或 10 倍速度。');
    next.speed = speed; return success(`时间速度设为 ${speed} 倍。`);
  }
  if (action === 'start') { if (next.finished) return fail('这次露营已经结束，创建新营地再来一次吧。'); next.started = true; next.paused = false; return success('露营开始！先点起营火，或给帐篷搭一片天幕。'); }
  if (next.finished) return fail('本次露营已结束。可以查看日记，或开启新的一次露营。');
  if (action === 'pause') { if (!next.started) return fail('先开始露营吧。'); next.paused = true; return success('时间暂停了，慢慢欣赏这一刻。'); }
  if (action === 'resume') { next.paused = false; return success('继续露营。'); }
  if (action === 'move') {
    const existing = next.items.find(item => item.id === payload?.id);
    if (!existing) return fail('没有找到这件设施。');
    const candidate = { ...existing, x: payload.x, z: payload.z, rotation: payload.rotation ?? existing.rotation };
    const valid = validPlacement(next, candidate);
    if (!valid.ok) return fail(valid.message);
    next.items = next.items.map(item => item.id === candidate.id ? candidate : item);
    return success(`移动好了${ITEMS[existing.type].name}。`);
  }
  if (action === 'place') {
    const item = { ...(payload?.item ?? payload), rotation: (payload?.item ?? payload)?.rotation ?? 0 };
    if (item.id && !next.items.some(existing => existing.id === item.id)) delete item.id;
    const valid = validPlacement(next, item);
    if (!valid.ok) return fail(valid.message);
    const existing = next.items.findIndex(existing => existing.id === item.id);
    const placed = { id: existing >= 0 ? item.id : `item-${next.nextId++}`, type: item.type, x: item.x, z: item.z, rotation: item.rotation };
    if (existing >= 0) next.items[existing] = placed; else next.items.push(placed);
    return success(`安放好了${ITEMS[item.type].name}。`);
  }
  if (action === 'remove') {
    const item = next.items.find(item => item.id === (typeof payload === 'string' ? payload : payload?.id));
    if (!item) return fail('没有找到这件设施。');
    if (item.type === 'tent' && next.pending?.type === 'rest') return fail('休息结束后再收起帐篷吧。');
    if (item.type === 'campfire' && (next.fire.lit || next.pending?.type === 'cook')) return fail('营火正在使用，稍后再收起。');
    next.items = next.items.filter(existing => existing.id !== item.id);
    return success(`收起了${ITEMS[item.type].name}。`);
  }
  if (!next.started) return fail('点击「开始露营」后就能进行这项活动。');
  if (next.paused) return fail('先继续时间，再进行活动吧。');
  if (action === 'finish') { finish(next); return { state: next, ok: true, message: '这次露营已写进日记。' }; }
  if (action === 'lightFire') {
    if (!has(next, 'campfire')) return fail('先安放一处营火。');
    if (next.fire.lit) return fail('营火已经点燃，可以添柴延长燃烧。');
    if (next.resources.wood < 1) return fail('木柴不足，试着去收集一些。');
    next.resources.wood--; next.fire.fuel = Math.min(360, next.fire.fuel + 90); next.fire.lit = true;
    return success('用 1 份木柴点起营火。火光带来温暖，也能烹饪。');
  }
  if (action === 'addWood') {
    if (!has(next, 'campfire')) return fail('先安放一处营火。');
    if (!next.fire.lit) return fail('先点燃营火吧。');
    if (next.resources.wood < 1) return fail('木柴不足。');
    if (next.fire.fuel > 270) return fail('炉边已经有足够的木柴，稍后再添吧。');
    next.resources.wood--; next.fire.fuel += 90; return success('添入 1 份木柴，营火可以多陪你一会儿。');
  }
  if (action === 'eat') {
    if (next.cooked < 1) return fail('还没有做好的料理，先到营火边烹饪吧。');
    next.cooked--; next.meals++; next.stats.energy = clamp(next.stats.energy + 16); next.stats.warmth = clamp(next.stats.warmth + 8); next.stats.comfort = clamp(next.stats.comfort + 4);
    return success('吃下热料理：体力 +16，温暖 +8。');
  }
  if (action === 'drink') {
    if (next.resources.water < 1) return fail('饮水用完了，下次烹饪前记得留一份。');
    next.resources.water--; next.drinks++; next.stats.energy = clamp(next.stats.energy + 6); next.stats.comfort = clamp(next.stats.comfort + 3);
    return success('喝了一份饮水：体力 +6，舒适 +3。');
  }
  if (['cook', 'rest', 'gatherWood'].includes(action)) {
    if (next.pending) return fail('先完成手头的活动吧。');
    if (action === 'cook') {
      if (!next.fire.lit) return fail('先点燃营火，料理需要持续的火。');
      if (next.resources.food < 1 || next.resources.water < 1) return fail('料理需要 1 份食材和 1 份饮水。');
      next.resources.food--; next.resources.water--; next.pending = { type: 'cook', remaining: 18, total: 18 };
      return success('开始做饭，消耗食材和饮水各 1 份。保持营火燃烧，等待 18 秒。');
    }
    if (action === 'rest') {
      if (!has(next, 'tent')) return fail('先安放帐篷，才能安心小憩。');
      next.pending = { type: 'rest', remaining: 70, total: 70 };
      return success(getWeather(next) === 'rain' && !getShelter(next) ? '在帐篷里小憩 70 秒。雨中没有天幕，恢复会慢一些。' : '钻进帐篷小憩 70 秒，让精神慢慢恢复。');
    }
    if (next.gathered >= 3) return fail('附近的干木柴已收集完，给树林留一点吧。');
    if (next.resources.wood > 21) return fail('木柴已经很多了，先用掉一些吧。');
    next.pending = { type: 'gatherWood', remaining: 14, total: 14 };
    return success(`去附近捡木柴，14 秒后带回 3 份；还可收集 ${3 - next.gathered} 次。`);
  }
  return fail('暂时没有这项活动。');
}

export function restoreState(raw) {
  const bad = () => { throw new Error('存档无效或已损坏，请创建新的营地。'); };
  const number = (value, min, max) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
  const integer = (value, min, max) => number(value, min, max) && Number.isInteger(value);
  if (!raw || raw.version !== 1 || raw.duration !== 720 || !number(raw.elapsed, 0, 720)) bad();
  if (!['started', 'paused', 'finished'].every(key => typeof raw[key] === 'boolean')) bad();
  if (!['auto', 'sunny', 'cloudy', 'rain'].includes(raw.weatherOverride) || ![1, 3, 10].includes(raw.speed)) bad();
  if (!raw.resources || !integer(raw.resources.wood, 0, 24) || !integer(raw.resources.food, 0, 12) || !integer(raw.resources.water, 0, 12)) bad();
  if (!raw.stats || !['energy', 'comfort', 'warmth'].every(key => number(raw.stats[key], 0, 100))) bad();
  if (!raw.fire || typeof raw.fire.lit !== 'boolean' || !number(raw.fire.fuel, 0, 360) || (raw.fire.lit && raw.fire.fuel <= 0)) bad();
  if (!integer(raw.cooked, 0, 12) || !Array.isArray(raw.items) || raw.items.length > 14 || !Array.isArray(raw.log) || raw.log.length > 60) bad();
  const result = createState();
  Object.assign(result, { elapsed: raw.elapsed, started: raw.started, paused: raw.paused, finished: raw.finished, speed: raw.speed, weatherOverride: raw.weatherOverride, resources: { wood: raw.resources.wood, food: raw.resources.food, water: raw.resources.water }, stats: { energy: raw.stats.energy, comfort: raw.stats.comfort, warmth: raw.stats.warmth }, fire: { lit: raw.fire.lit, fuel: raw.fire.fuel }, cooked: raw.cooked });
  if (raw.carry !== undefined && !number(raw.carry, 0, STEP - 1e-10)) bad();
  result.carry = raw.carry ?? 0;
  for (const [key, max] of [['gathered', 3], ['meals', 12], ['drinks', 12], ['nextId', 1000000]]) {
    if (raw[key] !== undefined && !integer(raw[key], key === 'nextId' ? 1 : 0, max)) bad();
    result[key] = raw[key] ?? (key === 'nextId' ? 1 : 0);
  }
  result.items = [];
  for (const item of raw.items) {
    if (!item || typeof item.id !== 'string' || !/^[\w-]{1,64}$/.test(item.id) || result.items.some(existing => existing.id === item.id)) bad();
    if (!validPlacement(result, item).ok || !number(item.rotation ?? 0, -Math.PI * 100, Math.PI * 100)) bad();
    result.items.push({ id: item.id, type: item.type, x: item.x, z: item.z, rotation: item.rotation ?? 0 });
  }
  if (result.fire.lit && !has(result, 'campfire')) bad();
  result.pending = null;
  if (raw.pending != null) {
    const totals = { cook: 18, rest: 70, gatherWood: 14 }, pending = raw.pending;
    if (!Object.hasOwn(totals, pending.type) || pending.total !== totals[pending.type] || !number(pending.remaining, 0.00001, pending.total)) bad();
    if ((pending.type === 'rest' && !has(result, 'tent')) || (pending.type === 'cook' && !has(result, 'campfire')) || (pending.type === 'gatherWood' && result.gathered >= 3)) bad();
    result.pending = { type: pending.type, remaining: pending.remaining, total: pending.total };
  }
  if ((result.finished && result.pending) || (result.elapsed >= result.duration && !result.finished) || (!result.started && (result.elapsed > 0 || result.pending || result.fire.lit))) bad();
  result.log = raw.log.map(event => {
    if (!event || typeof event.id !== 'string' || event.id.length > 64 || typeof event.text !== 'string' || event.text.length > 300 || !number(event.time, 0, result.elapsed)) bad();
    return { id: event.id, text: event.text, time: event.time };
  });
  // Old saves may lack the counter; never reuse an existing generated id.
  const used = [...result.items.map(item => item.id), ...result.log.map(event => event.id)].map(id => Number(id.match(/^(?:item|event)-(\d+)$/)?.[1] || 0));
  result.nextId = Math.max(result.nextId, ...used.map(id => id + 1));
  if (result.nextId > 1000000) bad();
  return result;
}
export function summarize(state) {
  return {
    hour: getHour(state), weather: getWeather(state), tentSheltered: getShelter(state, 'tent'), fireSheltered: getShelter(state, 'campfire'),
    meals: state.meals, drinks: state.drinks, gathered: state.gathered,
    score: Math.round((state.stats.comfort + state.stats.energy + state.stats.warmth) / 3),
    title: state.stats.comfort >= 65 ? '把日子过成一颗棉花糖' : '每一场露营都有小小收获',
  };
}
