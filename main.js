import { createCampScene } from './scene.js';
import { ITEMS, createState, advance, act, getHour, getWeather, validPlacement, getShelter, restoreState, summarize } from './simulation.js';
import { createCampAudio } from './audio.js';

const $=id=>document.getElementById(id);
const ICONS={
 tent:'<path d="m3 20 9-16 9 16H3Z"/><path d="m8 20 4-8 4 8M9 3l3 3 3-3"/>',
 canopy:'<path d="M3 20V8l9-4 9 4v12M3 8l9 2 9-2M12 10v10"/>',
 chair:'<path d="m6 3 2 10h10l2-7M8 13l-3 8M17 13l2 8M6 10h13M5 3h9l3 7"/>',
 table:'<path d="m3 9 9-5 9 5-9 5-9-5ZM5 10v9M19 10v9M12 14v7"/>',
 lantern:'<path d="M8 8h8l2 11H6L8 8ZM9 8V5a3 3 0 0 1 6 0v3M5 21h14M12 11v5"/>',
 campfire:'<path d="M9 14c-5-5 5-7 3-12 7 6 8 9 5 12M12 10c3 3 3 5 0 6-3-1-3-3 0-6ZM4 18l16 4M4 22l16-4"/>',
 fire:'<path d="M12 3c2 5-5 6-4 10-3-2-4-1-4 2a8 8 0 0 0 16 0c0-4-3-8-8-12Z"/><path d="M12 13c3 3 4 6 0 7-4-1-3-4 0-7Z"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
 cloudy:'<path d="M7 17a5 5 0 1 1 1-9 6 6 0 0 1 11 3 3 3 0 0 1 0 6H7Z"/>',
 rain:'<path d="M6 14a4 4 0 1 1 1-8 6 6 0 0 1 11 3 3 3 0 0 1 0 6H7M8 18l-1 3m6-3-1 3m6-3-1 3"/>',
 moon:'<path d="M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11Z"/>',
 sunrise:'<path d="M3 17h18M5 21h14M7 17a5 5 0 0 1 10 0M12 3v4M3 9l3 2m12 0 3-2"/><path d="m9 5 3-3 3 3"/>',
 pin:'<path d="M19 10c0 6-7 11-7 11S5 16 5 10a7 7 0 0 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',
 arrow:'<path d="M4 12h15m-5-5 5 5-5 5"/>',
 chevron:'<path d="m8 10 4 4 4-4"/>',
 heart:'<path d="M20 5c-3-3-7-1-8 1C9 1 1 4 3 10c1 5 9 10 9 10s8-5 9-10c1-2 0-4-1-5Z"/>',
 leaf:'<path d="M20 3C8 2 2 8 5 15c7 7 17-1 15-12ZM4 21 16 9"/>',
 wood:'<path d="m5 8 13 8m-1-12L5 15"/><ellipse cx="4" cy="7" rx="2" ry="3" transform="rotate(-45 4 7)"/><ellipse cx="19" cy="17" rx="2" ry="3" transform="rotate(-45 19 17)"/><path d="m7 19 3 2M18 3l3 3"/>',
 food:'<path d="M3 10h18a9 9 0 0 1-18 0ZM8 21h8M8 2c-3 3 3 3 0 6m6-6c-3 3 3 3 0 6"/>',
 drop:'<path d="M12 2S5 10 5 15a7 7 0 0 0 14 0c0-5-7-13-7-13ZM9 15c0 2 1 3 3 3"/>',
 mug:'<path d="M4 8h12v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8ZM16 9h2a3 3 0 0 1 0 6h-2M7 2v3m5-3v3"/>',
 soundOff:'<path d="m11 4-6 5H2v6h3l6 5V4ZM16 9l6 6m0-6-6 6"/>',
 sound:'<path d="m11 4-6 5H2v6h3l6 5V4ZM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
 camera:'<path d="M3 7h4l2-3h6l2 3h4v13H3V7Z"/><circle cx="12" cy="13" r="4"/>',
 settings:'<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2" fill="currentColor" stroke="none"/><circle cx="16" cy="12" r="2" fill="currentColor" stroke="none"/><circle cx="10" cy="18" r="2" fill="currentColor" stroke="none"/>',
 pause:'<path d="M8 5v14M16 5v14"/>',play:'<path d="m8 4 12 8-12 8V4Z"/>',
 focus:'<path d="M3 8V3h5m8 0h5v5m0 8v5h-5m-8 0H3v-5"/><circle cx="12" cy="12" r="3"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',minus:'<path d="M5 12h14"/>',
 book:'<path d="M12 5C8 2 4 3 2 4v16c3-2 7-2 10 0 3-2 7-2 10 0V4c-3-1-7-2-10 1ZM12 5v15"/>',
 rotate:'<path d="M20 9a8 8 0 1 0 0 7M20 3v6h-6"/>',undo:'<path d="M4 10h10a6 6 0 0 1 0 12M4 10l5-5m-5 5 5 5"/>',
 help:'<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 5 2c-1 1-2 1-2 3m0 3v.1"/>',
 close:'<path d="m6 6 12 12M6 18 18 6"/>',mouse:'<rect x="7" y="2" width="10" height="20" rx="5"/><path d="M12 3v6"/>',
 rest:'<path d="M3 9v11m0-5h18v5M3 13V7h5v6m0-5h10a3 3 0 0 1 3 3v4"/>',
 eat:'<path d="M5 2v7m3-7v7m-6-7v7a3 3 0 0 0 6 0M5 12v10M19 2c-5 2-5 9 0 10v10m0-20v10"/>'
};
const icon=name=>`<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]||ICONS.tent}</svg>`;
function paintIcons(root=document){root.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon));}
paintIcons();
const STORAGE='cream-camp.save.v1';
let state=createState(),settings={quality:'medium',reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,volume:.35};
let restoreNotice='',mode='build',selected=null,preview=null,selectedId=null,history=[],scene;
let ready=false,dialogs=0,soundOn=false,lastEnv='',lastSaved=0,dirty=true,toastTimer,summaryShown=false;
const audio=createCampAudio();
try{
  const saved=localStorage.getItem(STORAGE);
  if(saved){
    const parsed=JSON.parse(saved);state=restoreState(parsed.state??parsed);
    const s=parsed.settings;
    if(s&&['low','medium','high'].includes(s.quality))settings.quality=s.quality;
    if(typeof s?.reducedMotion==='boolean')settings.reducedMotion=s.reducedMotion;
    if(Number.isFinite(s?.volume))settings.volume=Math.max(0,Math.min(1,s.volume));
    if(state.started&&!state.finished){state.paused=true;mode='life';}
    restoreNotice='已找回你的营地，时间停在离开的时候。';
  }
}catch{restoreNotice='没有读到完整存档，已为你铺好新的营地。';}

const toolLabels={tent:'帐篷',canopy:'天幕',chair:'露营椅',table:'小桌',lantern:'营灯',campfire:'营火'};
function buildTools(){
  const panel=$('build-panel');
  for(const [type,def]of Object.entries(ITEMS)){
    const button=document.createElement('button');button.type='button';button.className='tool-button';button.dataset.type=type;button.setAttribute('aria-pressed','false');button.setAttribute('aria-label',`放置${def.name}`);button.title=def.description;
    button.innerHTML=`<span class="tool-count"></span><span class="tool-icon">${icon(type)}</span><span class="tool-name">${toolLabels[type]}</span>`;
    button.addEventListener('click',()=>chooseItem(type));panel.append(button);
  }
  const actions=[['lightFire','点火','fire','1 份木柴'],['addWood','添柴','wood','延长温暖'],['cook','做饭','food','食材 + 饮水'],['eat','吃饭','eat','享用热料理'],['drink','饮水','mug','1 份饮水'],['rest','小憩','rest','帐篷里休息']];
  for(const[action,name,symbol,meta]of actions){
    const b=document.createElement('button');b.type='button';b.className='tool-button';b.dataset.action=action;b.setAttribute('aria-label',name);b.innerHTML=`<span class="tool-icon">${icon(symbol)}</span><span class="tool-name">${name}</span><span class="tool-meta">${meta}</span>`;
    b.addEventListener('click',()=>perform(action));$('life-panel').append(b);
  }
  const gather=document.createElement('button');gather.id='gather-button';gather.className='text-button';gather.innerHTML=`${icon('leaf')}捡些木柴`;
  gather.addEventListener('click',()=>perform('gatherWood'));
  const wishes=$('daily-wishes');wishes.append(gather);
}
buildTools();
function toast(text,error=false){const el=$('toast');el.textContent=text;el.classList.toggle('error',error);el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),3900);const dialog=document.querySelector('dialog[open]');if(dialog){let feedback=dialog.querySelector('.dialog-feedback');if(!feedback){feedback=document.createElement('p');feedback.className='dialog-feedback';feedback.setAttribute('role','status');dialog.append(feedback);}feedback.textContent=text;feedback.classList.toggle('error',error);}}
function persist(force=false){
  if(!force&&(!dirty||performance.now()-lastSaved<5000))return;
  try{localStorage.setItem(STORAGE,JSON.stringify({format:'cream-camp',state,settings}));$('save-status').innerHTML='<i></i> 已自动保存';dirty=false;lastSaved=performance.now();}
  catch{$('save-status').textContent='请导出备份';if(force)toast('浏览器暂时不能保存，可以在设置中导出备份。',true);}
}
function sync(){scene?.sync(state.items);dirty=true;render();persist(true);}
function perform(action,payload){
  if(!ready)return;
  const result=act(state,action,payload);
  if(result.ok){state=result.state;audio.effect(action==='cook'?'cook':action==='place'||action==='move'?'place':'success');sync();}
  else audio.effect('error');
  toast(result.message,!result.ok);return result.ok;
}
function updateMode(next){
  mode=next;clearSelection();
  $('build-tab').classList.toggle('active',mode==='build');$('build-tab').setAttribute('aria-selected',String(mode==='build'));
  $('life-tab').classList.toggle('active',mode==='life');$('life-tab').setAttribute('aria-selected',String(mode==='life'));
  $('build-panel').hidden=mode!=='build';$('life-panel').hidden=mode!=='life';
  $('dock-gather').hidden=mode!=='life';
  $('mode-hint').textContent=mode==='build'?'布置时光暂停，安心安放喜欢的小物':'添一点柴，煮一点热乎乎的日常';
  $('interaction-hint').textContent=mode==='build'?'拖动旋转视角 · 选物后点击草地放置':'拖动旋转视角 · 选择下方活动 · 后台自动暂停';
  scene?.setMode('observe');render();
}
function clearSelection(){
  selected=null;preview=null;selectedId=null;scene?.setPreview(null);scene?.setMode('observe');$('selection-bar').hidden=true;
  document.querySelectorAll('[data-type]').forEach(el=>el.setAttribute('aria-pressed','false'));
}
function chooseItem(type){
  if(state.finished){toast('这次露营已经收好，开启新旅程就能继续布置。');return;}
  if(selected===type&&!selectedId){clearSelection();return;}
  const existing=state.items.filter(item=>item.type===type);
  if(existing.length>=ITEMS[type].limit){selectObject(existing[0].id);return;}
  clearSelection();selected=type;preview={type,x:0,z:0,rotation:0};scene?.setMode('place');
  document.querySelector(`[data-type="${type}"]`).setAttribute('aria-pressed','true');showSelection(true);updatePreview({x:0,z:0});
}
function showSelection(placing){
  $('selection-bar').hidden=false;$('selection-name').textContent=ITEMS[selected].name;
  $('rotate-button').hidden=!placing;$('move-button').hidden=placing;$('remove-button').hidden=placing;
  $('placement-message').textContent=placing?'点击草地放置':'选择移动，或收起后重新布置';
}
function updatePreview(point){
  if(!selected||!preview)return;
  preview={...preview,x:Math.round(point.x*2)/2,z:Math.round(point.z*2)/2};
  const valid=validPlacement(state,preview);scene?.setPreview(preview,valid.ok);$('selection-bar').classList.toggle('invalid',!valid.ok);$('placement-message').textContent=valid.ok?'点击草地放置':valid.message;
}
function selectObject(id){
  if(mode!=='build'){const item=state.items.find(i=>i.id===id);if(item)toast(ITEMS[item.type].description);return;}
  const item=state.items.find(i=>i.id===id);if(!item)return;
  clearSelection();selected=item.type;selectedId=id;showSelection(false);
}
function groundClick(point){
  if(!selected||!preview)return;
  updatePreview(point);
  const previous=state.items.map(i=>({...i}));
  const result=act(state,selectedId?'move':'place',preview);
  if(!result.ok){toast(result.message,true);audio.effect('error');return;}
  history.push(previous);history=history.slice(-12);state=result.state;clearSelection();audio.effect('place');sync();toast(result.message);
}
function rotate(){if(!preview)return;preview.rotation=(preview.rotation+Math.PI/2)%(Math.PI*2);updatePreview(preview);}
$('rotate-button').addEventListener('click',rotate);
$('cancel-button').addEventListener('click',clearSelection);
$('move-button').addEventListener('click',()=>{const item=state.items.find(i=>i.id===selectedId);if(!item)return;preview={...item};scene.setMode('place');showSelection(true);updatePreview(preview);});
$('remove-button').addEventListener('click',()=>{const previous=state.items.map(i=>({...i}));if(perform('remove',{id:selectedId})){history.push(previous);clearSelection();render();}});
$('undo-button').addEventListener('click',()=>{if(!history.length||state.finished)return;const previous=history.at(-1);if(((state.fire.lit||state.pending?.type==='cook')&&!previous.some(i=>i.type==='campfire'))||(state.pending?.type==='rest'&&!previous.some(i=>i.type==='tent'))){toast('这件设施正在使用，等活动结束后再撤回吧。',true);return;}try{const candidate=restoreState({...state,items:previous});history.pop();state=candidate;}catch{toast('这次布置暂时不能撤回，当前营地已保留。',true);return;}clearSelection();audio.effect('place');sync();toast('已撤回上一次布置。');});
$('build-tab').addEventListener('click',()=>updateMode('build'));$('life-tab').addEventListener('click',()=>updateMode('life'));
$('dock-gather').addEventListener('click',()=>perform('gatherWood'));
$('start-button').addEventListener('click',()=>{
  if(state.finished){showSummary();return;}
  if(!state.started){if(perform('start'))updateMode('life');return;}
  if(mode==='build'){updateMode('life');if(state.paused)perform('resume');}
  else perform(state.paused?'resume':'pause');
});
$('pause-button').addEventListener('click',()=>{
  if(!state.started){if(perform('start'))updateMode('life');return;}
  if(mode==='build'){updateMode('life');if(state.paused)perform('resume');return;}
  perform(state.paused?'resume':'pause');
});
document.querySelectorAll('[data-speed]').forEach(b=>b.addEventListener('click',()=>perform('setSpeed',Number(b.dataset.speed))));
function setWeather(value){if(perform('setWeather',value))$('weather-select').value=value;}
$('weather-button').addEventListener('click',()=>{const options=['auto','sunny','cloudy','rain'];setWeather(options[(options.indexOf(state.weatherOverride)+1)%options.length]);});
$('weather-select').addEventListener('change',e=>setWeather(e.target.value));
function openDialog(id){clearSelection();$(id).showModal();dialogs++;render();}
document.querySelectorAll('.close-dialog').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
document.querySelectorAll('dialog').forEach(d=>{d.addEventListener('close',()=>{dialogs=Math.max(0,dialogs-1);d.querySelector('.dialog-feedback')?.remove();render();});d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}});});
$('settings-button').addEventListener('click',()=>openDialog('settings-dialog'));
$('help-button').addEventListener('click',()=>openDialog('help-dialog'));
$('journal-button').addEventListener('click',()=>{renderJournal();openDialog('journal-dialog');});
$('quality').value=settings.quality;$('reduced-motion').checked=settings.reducedMotion;$('volume').value=Math.round(settings.volume*100);$('weather-select').value=state.weatherOverride;
$('quality').addEventListener('change',e=>{settings.quality=e.target.value;lastEnv='';dirty=true;render();persist(true);});
$('reduced-motion').addEventListener('change',e=>{settings.reducedMotion=e.target.checked;lastEnv='';dirty=true;render();persist(true);});
$('volume').addEventListener('input',e=>{settings.volume=Number(e.target.value)/100;audio.setVolume(settings.volume);dirty=true;});
$('sound-toggle').addEventListener('click',async()=>{
  if(!soundOn){const ok=await audio.start();if(!ok){toast('这个浏览器暂时无法开启声音，仍然可以安心露营。',true);return;}audio.setVolume(settings.volume);soundOn=true;audio.setMuted(false);audio.update({weather:getWeather(state),fireLit:state.fire.lit,hour:getHour(state)});}
  else{soundOn=false;audio.setMuted(true);}
  $('sound-toggle').innerHTML=icon(soundOn?'sound':'soundOff');$('sound-toggle').classList.toggle('is-on',soundOn);$('sound-toggle').setAttribute('aria-label',soundOn?'关闭环境声音':'开启环境声音');$('sound-toggle').title=soundOn?'关闭环境声音':'开启环境声音';toast(soundOn?'听，山野的声音。':'声音已关闭。');
});
function download(data,name){const a=document.createElement('a');a.href=data;a.download=name;document.body.append(a);a.click();a.remove();}
function takePhoto(){try{download(scene.screenshot(),`奶油营地-${new Date().toISOString().slice(0,10)}.png`);toast('这一刻已经收进照片。');}catch{toast('暂时没能拍下照片，请稍后再试。',true);}}
$('photo').addEventListener('click',takePhoto);$('summary-photo').addEventListener('click',takePhoto);
$('camera-reset').addEventListener('click',()=>scene?.resetCamera());$('zoom-in').addEventListener('click',()=>scene?.zoom(-1));$('zoom-out').addEventListener('click',()=>scene?.zoom(1));
$('export-save').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({format:'cream-camp',state,settings},null,2)],{type:'application/json'}));download(url,'奶油营地-存档.json');setTimeout(()=>URL.revokeObjectURL(url),1000);toast('存档已导出，留好这份小小的山野。');});
$('import-save').addEventListener('click',()=>$('import-file').click());
$('import-file').addEventListener('change',async e=>{
  const file=e.target.files[0];if(!file)return;
  try{if(file.size>200000)throw new Error('文件过大，请选择营地导出的存档。');const parsed=JSON.parse(await file.text());const restored=restoreState(parsed.state??parsed);if(!confirm('导入后会替换当前营地。继续吗？'))return;state=restored;if(state.started&&!state.finished)state.paused=true;history=[];summaryShown=false;clearSelection();updateMode(state.started?'life':'build');$('weather-select').value=state.weatherOverride;lastEnv='';sync();$('settings-dialog').close();toast('你的营地回来了。');}
  catch(err){toast(err.message||'这个存档无法读取，当前营地已保留。',true);}finally{e.target.value='';}
});
function restart(){if(!confirm('重新开始会替换当前进度。需要的话，请先导出存档。继续吗？'))return;document.querySelectorAll('dialog[open]').forEach(d=>d.close());state=createState();history=[];summaryShown=false;clearSelection();lastEnv='';updateMode('build');$('weather-select').value='auto';scene?.resetCamera();sync();toast('新的一天，新的小营地。');}
$('restart-button').addEventListener('click',restart);$('new-trip').addEventListener('click',restart);
$('reload').addEventListener('click',()=>location.reload());
document.addEventListener('keydown',e=>{if(e.target.matches('input,select,textarea,[contenteditable]')||dialogs)return;if(e.code==='Escape')clearSelection();if(e.code==='KeyR'&&preview){e.preventDefault();rotate();}if(preview&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter'].includes(e.code)){e.preventDefault();if(e.code==='Enter')groundClick(preview);else updatePreview({x:preview.x+(e.code==='ArrowRight'?.5:e.code==='ArrowLeft'?-.5:0),z:preview.z+(e.code==='ArrowDown'?.5:e.code==='ArrowUp'?-.5:0)});}if(e.code==='Space'&&!e.target.closest('button,a')){e.preventDefault();$('pause-button').click();}});
document.addEventListener('visibilitychange',()=>{lastFrame=performance.now();if(document.hidden){persist(true);audio.setMuted(true);}else if(soundOn)audio.setMuted(false);render();});
window.addEventListener('pagehide',()=>{persist(true);audio.setMuted(true);});

function timeLabel(elapsed){const minutes=Math.floor(14*60+elapsed*1.5)%1440;return`${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`;}
function renderJournal(){const list=$('journal-list');list.replaceChildren();for(const entry of [...state.log].reverse()){const li=document.createElement('li'),time=document.createElement('time'),text=document.createElement('span');time.textContent=timeLabel(entry.time);text.textContent=entry.text;li.append(time,text);list.append(li);}}
function showSummary(){
  if($('summary-dialog').open)return;
  const report=summarize(state);const box=$('summary-content');box.replaceChildren();const grid=document.createElement('div');grid.className='summary-grid';
  for(const[value,label]of [[report.score,'营地舒适印象'],[report.meals,'享用的热料理'],[state.items.length,'安放的小物']]){const cell=document.createElement('div'),b=document.createElement('b'),s=document.createElement('span');b.textContent=String(value);s.textContent=label;cell.append(b,s);grid.append(cell);}
  const note=document.createElement('p');note.className='summary-observation';note.textContent=report.tentSheltered?'天幕替你接住了雨。好好布置的小营地，陪你等到了晨光。':'听过雨声，也见过晨光。下一次，试试为帐篷添一片天幕。';box.append(grid,note);openDialog('summary-dialog');summaryShown=true;
}
function render(){
  const hour=getHour(state),weather=getWeather(state),night=hour>=19||hour<6;
  $('app').classList.toggle('playing',state.started);
  $('clock').textContent=timeLabel(state.elapsed);$('day-label').textContent=14+state.elapsed/40>=24?'DAY 02':'DAY 01';
  $('time-period').textContent=hour>=6&&hour<11?'晨光刚好':hour>=11&&hour<17?'午后时光':hour>=17&&hour<19?'黄昏来信':'围炉等星';
  const waiting=state.paused||mode==='build'||dialogs>0||document.hidden;
  $('running-label').textContent=state.finished?'旅程已完成':!state.started?'准备出发':waiting?'时光暂停':'正在露营';
  $('pause-button').innerHTML=icon(waiting||!state.started?'play':'pause');$('pause-button').disabled=state.finished;
  $('pause-button').setAttribute('aria-label',waiting||!state.started?'继续露营':'暂停露营');
  $('weather-icon').innerHTML=icon(weather==='rain'?'rain':weather==='cloudy'?'cloudy':night?'moon':'sun');
  $('weather-text').textContent=weather==='rain'?'小雨 · 听雨落在天幕上':weather==='cloudy'?'多云 · 云朵慢慢聚拢':night?'晴夜 · 让星星陪你坐坐':'晴朗 · 微风经过湖面';
  $('forecast-text').textContent=state.weatherOverride!=='auto'?'手动天气试验 · 设置中可恢复':state.elapsed<230?'傍晚可能有一场小雨':state.elapsed<385?'雨会停，温暖还会回来':'雨过天晴，继续慢慢享受';
  $('day-progress').style.width=`${state.elapsed/state.duration*100}%`;
  for(const key of ['comfort','energy','warmth']){$(`${key}-meter`).value=state.stats[key];$(`${key}-value`).textContent=Math.round(state.stats[key]);}
  for(const key of ['wood','food','water'])$(`${key}-count`).textContent=state.resources[key];
  for(const button of document.querySelectorAll('[data-type]')){const type=button.dataset.type,count=state.items.filter(i=>i.type===type).length;button.querySelector('.tool-count').textContent=`${count}/${ITEMS[type].limit}`;button.disabled=state.finished;}
  document.querySelectorAll('[data-speed]').forEach(b=>b.classList.toggle('active',Number(b.dataset.speed)===state.speed));
  $('undo-button').disabled=!history.length||state.finished;
  $('wish-shelter').classList.toggle('done',getShelter(state,'tent'));
  $('wish-fire').classList.toggle('done',state.fire.lit||state.log.some(l=>l.text.startsWith('用 1 份木柴点起营火')));
  $('wish-food').classList.toggle('done',state.meals>0||state.cooked>0);
  if(state.started){
    $('start-button').innerHTML=state.finished?'看看这次的露营记录 '+icon('arrow'):mode==='build'?'布置好了，继续 '+icon('arrow'):state.paused?'继续这段时光 '+icon('play'):'暂停，看看风景 '+icon('pause');
    $('session-description').textContent=state.finished?'晨光到了，故事也收好了。':state.pending?({cook:'饭香正慢慢升起来。',rest:'帐篷里，正适合小憩。',gatherWood:'去林间捡一点温暖。'})[state.pending.type]:state.fire.lit?`营火还会温暖 ${Math.ceil(state.fire.fuel/state.speed)} 秒，记得添一点柴。`:'先点一团火，让山野暖起来。';
    $('session-hint').textContent=state.finished?'可以留在这里欣赏，也能开启新旅程':mode==='build'?'正在布置 · 露营时间已暂停':'每个小决定，都写进你的营地手记';
  }
  else{$('start-button').innerHTML='开始露营 '+icon('arrow');$('session-description').innerHTML='搭一顶喜欢的帐篷，<br>等一场雨，也等一顿热饭。';$('session-hint').textContent='一个约 12 分钟的露营日 · 随时暂停';}
  $('journal-preview').textContent=state.log.at(-1)?.text||'故事从抵达的这一刻开始';
  $('activity-status').hidden=!state.pending||mode!=='life';
  if(state.pending){$('activity-name').textContent=({cook:'正在煮饭',rest:'正在小憩',gatherWood:'正在捡木柴'})[state.pending.type];$('activity-progress').value=(1-state.pending.remaining/state.pending.total)*100;$('activity-remaining').textContent=state.pending.type==='cook'&&!state.fire.lit?'等待营火':`约 ${Math.ceil(state.pending.remaining/state.speed)} 秒`;}
  const eat=document.querySelector('[data-action="eat"]');eat.querySelector('.tool-meta').textContent=`${state.cooked} 份已做好`;
  $('gather-button').title=`附近还可收集 ${Math.max(0,3-state.gathered)} 次`;
  const envKey=[Math.round(hour*20),weather,state.fire.lit,settings.quality,settings.reducedMotion].join('|');
  if(envKey!==lastEnv){scene?.setEnvironment({hour,weather:weather==='sunny'?'clear':weather,fireLit:state.fire.lit,quality:settings.quality,reducedMotion:settings.reducedMotion});audio.update({hour,weather,fireLit:state.fire.lit});lastEnv=envKey;}
  if(state.finished&&!summaryShown)showSummary();
}
let lastFrame=performance.now(),lastPaint=0;
function loop(now){
  const dt=Math.max(0,Math.min(.5,(now-lastFrame)/1000));lastFrame=now;
  if(ready&&!document.hidden&&mode==='life'&&!dialogs&&state.started&&!state.paused&&!state.finished){state=advance(state,dt*state.speed);dirty=true;}
  if(now-lastPaint>250){lastPaint=now;render();persist();}
  requestAnimationFrame(loop);
}
try{
  scene=createCampScene($('scene'),{onGround:groundClick,onSelect:selectObject,onHoverGround:updatePreview});scene.sync(state.items);ready=true;updateMode(mode);render();$('loading').classList.add('loaded');setTimeout(()=>$('loading').hidden=true,550);if(restoreNotice)setTimeout(()=>toast(restoreNotice),700);requestAnimationFrame(loop);
}catch(err){console.error('营地渲染初始化失败',err);$('loading').hidden=true;$('error-state').hidden=false;$('error-detail').textContent=`营地需要支持 WebGL 2 的浏览器。请开启硬件加速后重试。${err.message?'（'+err.message+'）':''}`;}
