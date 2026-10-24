import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
// The browser has no build step and does not need a package.json to declare ESM.
const source = await readFile(new URL('../dist/simulation.js', import.meta.url), 'utf8');
const { createState, advance, act, getHour, getWeather, getShelter, validPlacement, restoreState } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const action = (state, name, payload) => { const result = act(state, name, payload); assert.equal(result.ok, true, result.message); return result.state; };
const running = () => action(createState(), 'start');

test('initial layout is valid and the clock spans 14:00 to 08:00', () => {
  const state = createState();
  for (const item of state.items) assert.equal(validPlacement(state, item).ok, true, item.type);
  assert.equal(getHour(state), 14);
  assert.equal(advance(state, 30).elapsed, 0);
  const end = advance(running(), 720);
  assert.equal(getHour(end), 8); assert.equal(end.finished, true);
});

test('rain shelter materially improves rest and warmth', () => {
  let wet = action(running(), 'setWeather', 'rain'); wet.stats.energy = 40;
  let dry = action(wet, 'place', { type: 'canopy', x: -2, z: -1.5, rotation: 0 });
  assert.equal(getShelter(dry), true); assert.equal(getShelter(wet), false);
  wet = advance(action(wet, 'rest'), 70); dry = advance(action(dry, 'rest'), 70);
  assert.ok(dry.stats.energy > wet.stats.energy + 15);
  assert.ok(dry.stats.warmth > wet.stats.warmth + 3);
});

test('fire consumes actual wood and expires, with faster rain consumption', () => {
  const state = action(running(), 'lightFire');
  assert.equal(state.resources.wood, 7); assert.equal(state.fire.fuel, 90);
  const rain = advance(action(state, 'setWeather', 'rain'), 60);
  assert.equal(rain.fire.lit, false); assert.equal(rain.fire.fuel, 0);
  assert.equal(advance(state, 60).fire.lit, true);
  assert.equal(advance(state, 90).fire.lit, false);
});

test('cooking is timed, consumes supplies, pauses without fire, then can be eaten', () => {
  let state = action(action(running(), 'lightFire'), 'cook');
  assert.equal(state.cooked, 0); assert.equal(state.resources.food, 3); assert.equal(state.resources.water, 4);
  state.fire.fuel = 1; state = advance(state, 20);
  assert.ok(state.pending.remaining > 16); assert.equal(state.cooked, 0);
  state = advance(action(state, 'lightFire'), 18);
  assert.equal(state.pending, null); assert.equal(state.cooked, 1);
  state.stats.energy = 50; state = action(state, 'eat');
  assert.equal(state.cooked, 0); assert.equal(state.stats.energy, 66);
});

test('insufficient resources fail without mutation or negative inventory', () => {
  const state = running(); state.resources.wood = 0; state.resources.water = 0;
  const before = JSON.stringify(state);
  assert.equal(act(state, 'lightFire').ok, false); assert.equal(act(state, 'drink').ok, false);
  assert.equal(JSON.stringify(state), before);
});

test('wood gathering costs time and energy and has a strict three-trip limit', () => {
  let state = running(); const initialEnergy = state.stats.energy;
  for (let i = 0; i < 3; i++) state = advance(action(state, 'gatherWood'), 14);
  assert.equal(state.resources.wood, 17); assert.equal(state.gathered, 3);
  assert.ok(state.stats.energy < initialEnergy); assert.equal(act(state, 'gatherWood').ok, false);
});

test('pause freezes time and tasks; speed is applied by caller exactly once', () => {
  const state = action(action(running(), 'lightFire'), 'cook');
  const paused = action(state, 'pause');
  assert.deepEqual(advance(paused, 80), paused);
  assert.equal(act(paused, 'drink').ok, false);
  const fast = action(state, 'setSpeed', 10);
  assert.equal(advance(fast, 5).elapsed, 5);
  assert.equal(advance(fast, 5 * fast.speed).elapsed, 50);
});

test('fractional frame steps and one large step produce identical results', () => {
  const state = action(action(running(), 'setWeather', 'rain'), 'lightFire');
  const once = advance(state, 105);
  let framed = state;
  for (let i = 0; i < 1050; i++) framed = advance(framed, 0.1);
  assert.deepEqual(framed, once);
  assert.equal(state.elapsed, 0); assert.equal(state.fire.fuel, 90);
});

test('placement checks bounds, collisions, limits, and real canopy coverage', () => {
  let state = createState();
  assert.equal(validPlacement(state, { type: 'chair', x: 4, z: 0 }).ok, false);
  assert.equal(validPlacement(state, { type: 'chair', x: -2, z: -1.5 }).ok, false);
  const onlyFire = { ...state, items: state.items.filter(item => item.type === 'campfire') };
  assert.equal(validPlacement(onlyFire, { type: 'table', x: 0, z: 0 }).ok, false);
  assert.equal(validPlacement(state, { type: 'chair', x: NaN, z: 0 }).ok, false);
  state = action(state, 'place', { type: 'canopy', x: -2, z: -1.5 });
  assert.equal(getShelter(state), true);
  assert.equal(act(state, 'place', { type: 'canopy', x: 2, z: 0 }).ok, false);
  assert.equal(act(state, 'remove', { id: 'missing' }).ok, false);
  const moved = action(state, 'move', { id: 'tent-1', x: 2.5, z: -1.5 });
  assert.equal(getShelter(moved), false);
  assert.equal(act(state, 'move', { id: 'tent-1', x: 4, z: 0 }).ok, false);
});

test('round-trip restores independent data; malicious and damaged saves are rejected', () => {
  let state = action(action(running(), 'lightFire'), 'cook'); state = advance(state, 4.1);
  const saved = JSON.parse(JSON.stringify(state));
  assert.deepEqual(restoreState(saved), state);
  const restored = restoreState(saved); restored.resources.wood = 0; assert.equal(saved.resources.wood, 7);
  for (const corrupt of [
    raw => raw.resources.wood = Infinity,
    raw => raw.stats.energy = NaN,
    raw => raw.items[0].x = 999,
    raw => raw.items[1].id = raw.items[0].id,
    raw => raw.pending.remaining = -1,
    raw => raw.elapsed = 721,
    raw => raw.speed = 100,
    raw => raw.fire.lit = 'yes',
  ]) {
    const raw = structuredClone(saved); corrupt(raw); assert.throws(() => restoreState(raw), /存档/);
  }
});

test('weather schedule advances and logs remain bounded', () => {
  let state = advance(running(), 235); assert.equal(getWeather(state), 'rain');
  for (let i = 0; i < 100; i++) state = action(state, 'setWeather', i % 2 ? 'sunny' : 'cloudy');
  assert.equal(state.log.length, 60);
});
