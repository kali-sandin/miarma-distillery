const STORAGE_KEY = 'miarma-distillery-state-v2';
const FIELD_TILES = 20;
const MALT_TILES = 8;

const fitStage = () => {
  const scale = Math.min(innerWidth / 1920, innerHeight / 1080, 1);
  document.documentElement.style.setProperty('--scale', scale.toString());
  document.documentElement.style.setProperty('--offset-x', `${(innerWidth - 1920 * scale) / 2}px`);
  document.documentElement.style.setProperty('--offset-y', `${(innerHeight - 1080 * scale) / 2}px`);
};
addEventListener('resize', fitStage);
fitStage();

const $ = (q, root=document) => root.querySelector(q);
const $$ = (q, root=document) => [...root.querySelectorAll(q)];
const clamp = (n,a,b)=>Math.max(a,Math.min(b,n));
const pct = n => `${clamp(n,0,100).toFixed(0)}%`;

const defaultState = () => ({
  distilleryName: 'Miarma Distillery',
  speedStep: 0,
  coins: 50,
  seeds: 0,
  bottles: 0,
  market: 2.4,
  marketPhase: Math.random()*10,
  field: Array.from({length: FIELD_TILES}, () => ({status:'empty', growth:0, moisture:35})),
  malt: Array.from({length: MALT_TILES}, () => ({status:'empty', germ:0, moisture:0})),
  vat: { volume: 0, ferment: 0, yeast: false, idle: 0, rotten: false },
  still: { input: 0, inputAbv: 0, runs: 0, output: 0, outputAbv: 0, outputRuns: 0, temp: 22, fire: false },
  barrels: [],
  boxes: []
});

let state = defaultState();
let dragging = null;
let saveDirty = false;

function normaliseLoaded(s){
  const fresh = defaultState();
  const merged = {...fresh, ...s};
  merged.field = Array.from({length: FIELD_TILES}, (_, i) => ({...fresh.field[i], ...(s.field?.[i] || {})}));
  merged.malt = Array.from({length: MALT_TILES}, (_, i) => ({...fresh.malt[i], ...(s.malt?.[i] || {})}));
  merged.vat = {...fresh.vat, ...(s.vat || {})};
  merged.still = {...fresh.still, ...(s.still || {})};
  merged.barrels = Array.isArray(s.barrels) ? s.barrels : [];
  merged.boxes = Array.isArray(s.boxes) ? s.boxes : [];
  merged.speedStep = clamp(Number(merged.speedStep || 0), -4, 4);
  return merged;
}

function loadGame(){
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw) state = normaliseLoaded(JSON.parse(raw));
  } catch(err) {
    console.warn('No se pudo cargar la partida guardada', err);
  }
}
function saveGame(){
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); saveDirty = false; }
  catch(err) { console.warn('No se pudo guardar la partida', err); }
}
function markDirty(){ saveDirty = true; }

function speedMultiplier(){
  const step = Number(state.speedStep || 0);
  return step >= 0 ? 1 + step : 1 / (1 - step);
}
function speedLabel(){
  const m = speedMultiplier();
  return m >= 1 ? `x${m.toFixed(0)}` : `/${Math.round(1/m)}`;
}

function initTiles(){
  const field = $('#field'); const malt = $('#malting');
  field.innerHTML = ''; malt.innerHTML = '';
  for(let i=0;i<FIELD_TILES;i++){
    const el = document.createElement('div');
    el.className='tile field-tile drop-target';
    el.dataset.i=i; el.dataset.accept='seed';
    field.appendChild(el);
  }
  for(let i=0;i<MALT_TILES;i++){
    const el = document.createElement('div');
    el.className='tile malt-tile drop-target';
    el.dataset.i=i; el.dataset.accept='crop';
    malt.appendChild(el);
  }
}

function render(){
  if(dragging) return;
  $('#distilleryName').value = state.distilleryName;
  $('#coins').textContent = `${state.coins.toFixed(0)} k€`;
  $('#seeds').textContent = `${state.seeds.toFixed(0)} Kg`;
  $('#bottles').textContent = `${state.bottles}`;
  $('#market').textContent = `${state.market.toFixed(2)} €`;
  $('#speedSlider').value = state.speedStep;
  $('#speedLabel').textContent = speedLabel();
  $('#seedBag').style.opacity = state.seeds > 0 ? '1' : '.38';

  $$('.field-tile').forEach(el=>{
    const t = state.field[+el.dataset.i];
    el.innerHTML = bars(t.moisture, t.growth, 75, 20, t.status==='rotten');
    el.dataset.tip = fieldTip(t);
    if(t.status==='planted'){
      const plant = document.createElement('div');
      plant.className='plant';
      plant.textContent = t.status==='rotten'?'☠️': t.growth<35?'🌱':'🌾';
      el.appendChild(plant);
      if(t.growth>=75 && t.growth<=95){
        plant.className += ' token crop-token';
        plant.dataset.drag='crop'; plant.dataset.source=el.dataset.i;
        plant.dataset.tip='Cebada madura: arrástrala a malteado/germinación.';
        plant.textContent='🌾';
      }
    }
    if(t.status==='rotten') addClean(el, () => Object.assign(t,{status:'empty',growth:0,moisture:25}));
  });

  $$('.malt-tile').forEach(el=>{
    const t = state.malt[+el.dataset.i];
    el.innerHTML = bars(t.moisture, t.germ, 68, 22, t.status==='rotten');
    el.dataset.tip = maltTip(t);
    if(t.status==='filled'){
      const plant = document.createElement('div');
      plant.className='plant'; plant.textContent = t.status==='rotten'?'☠️':'🌿';
      el.appendChild(plant);
      if(t.germ>=68 && t.germ<=90){
        plant.className += ' token malt-token';
        plant.dataset.drag='malt'; plant.dataset.source=el.dataset.i;
        plant.dataset.tip='Malta germinada en óptimo: arrástrala a la cuba.';
        plant.textContent='🌿';
      }
    }
    if(t.status==='rotten') addClean(el, () => Object.assign(t,{status:'empty',germ:0,moisture:0}));
  });

  $('#vatCapacity').style.width = pct(state.vat.volume);
  $('#vatFerment').style.width = pct(state.vat.ferment);
  $('#fermentDrag').classList.toggle('hidden', !(state.vat.volume>0 && state.vat.ferment>=65 && state.vat.ferment<=90 && !state.vat.rotten));
  $('#fermentDrag').dataset.tip = `Mosto: ${state.vat.volume.toFixed(0)}% de cuba · fermentación ${state.vat.ferment.toFixed(0)}%${state.vat.yeast?' · con levadura':''}.`;
  $('#fermentation').dataset.tip = state.vat.rotten ? 'La cuba se ha podrido: pulsa aquí para limpiar.' : `Cuba ${state.vat.volume.toFixed(0)}% · fermentación ${state.vat.ferment.toFixed(0)}% · rango óptimo 65-90%.`;

  $('#stillIn').textContent = `${state.still.input.toFixed(0)}% · ${state.still.inputAbv.toFixed(0)}º`;
  $('#stillOut').textContent = `${state.still.output.toFixed(1)}% · ${state.still.outputRuns}x`;
  $('#tempBar').style.width = pct(state.still.temp);
  $('#fire').textContent = state.still.fire ? 'Apagar' : 'Fuego';
  $('#spiritDrag').classList.toggle('hidden', state.still.output <= 0);
  $('#spiritDrag').dataset.tip = `Destilado ${state.still.output.toFixed(1)}% · ${state.still.outputAbv.toFixed(0)}º · pasadas ${state.still.outputRuns}. ${state.still.outputRuns<2?'Necesita segunda destilación.':'Listo para barrica.'}`;

  renderCards();
}

function bars(a,b,start,width,bad=false){
  return `<div class="mini-bars"><div class="bar moist"><i style="width:${pct(a)}"></i></div><div class="bar ranged ${bad?'bad':''}"><em style="left:${start}%;width:${width}%"></em><i style="width:${pct(b)}"></i></div></div>`;
}
function addClean(el, fn){
  const b=document.createElement('button');
  b.className='clean'; b.textContent='Limpiar';
  b.onclick=e=>{e.stopPropagation(); fn(); markDirty(); render();};
  el.appendChild(b);
}
function fieldTip(t){ if(t.status==='empty') return 'Tile vacío. Arrastra 1 Kg de semillas aquí.'; if(t.status==='rotten') return 'Cultivo estropeado por pasarse de madurez. Click para limpiar.'; return `Cultivo: humedad ${t.moisture.toFixed(0)}% · crecimiento ${t.growth.toFixed(0)}% · cosecha entre 75-95%. Click para regar.`; }
function maltTip(t){ if(t.status==='empty') return 'Tile seco/vacío. Suelta cebada madura aquí; no germina hasta que le eches agua.'; if(t.status==='rotten') return 'Malta podrida por exceso de humedad/tiempo. Click para limpiar.'; if(t.moisture<=0 && t.germ<=0) return 'Cebada almacenada en seco. Puede esperar indefinidamente; click/drag para regar y empezar germinación.'; return `Malteado: humedad ${t.moisture.toFixed(0)}% · germinación ${t.germ.toFixed(0)}% · óptimo 68-90%. Click/drag para regar.`; }

function renderCards(){
  const aging=$('#aging'), bottling=$('#bottling');
  aging.innerHTML=''; bottling.innerHTML='';
  state.barrels.forEach(b=>{
    const el=document.createElement('div'); el.className='card barrel-card'; el.dataset.drag='barrel'; el.dataset.id=b.id;
    el.dataset.tip=`Barrica: ${b.volume.toFixed(1)}% volumen · ${b.age.toFixed(1)} años · ${b.abv.toFixed(0)}º. Arrastra a embotellado.`;
    el.innerHTML=`<img src="img/placeholder_barrel.png" alt="barrica"><strong>Barrica</strong><br>${b.age.toFixed(1)} años<br>${b.volume.toFixed(1)}%<div class="bar"><i style="width:${pct((b.age%10)*10)}"></i></div>`;
    aging.appendChild(el);
  });
  state.boxes.forEach(b=>{
    const el=document.createElement('div'); el.className='card box-card'; el.dataset.drag='box'; el.dataset.id=b.id;
    el.dataset.tip=`Caja: ${b.bottles} botellas · whisky de ${b.age.toFixed(1)} años. Arrastra al camión para vender.`;
    el.innerHTML=`<img src="img/placeholder_box.png" alt="caja"><strong>Caja</strong><br>${b.bottles} bot.<br>${b.age.toFixed(1)} años<div class="bar"><i style="width:${pct(b.bottles)}"></i></div>`;
    bottling.appendChild(el);
  });
}

function tick(){
  const sp = speedMultiplier();
  state.marketPhase += 0.018 * sp;
  state.market = 3 + Math.sin(state.marketPhase)*1.15 + Math.sin(state.marketPhase*2.7)*0.55 + (Math.random()-.5)*0.035;
  state.market = clamp(state.market,1,5);
  for(const t of state.field){
    if(t.status==='planted'){
      t.moisture=clamp(t.moisture-.12*sp,0,100);
      if(t.moisture>8) t.growth += 0.075*sp*(0.55+t.moisture/100);
      if(t.growth>102) t.status='rotten';
    }
  }
  for(const t of state.malt){
    if(t.status==='filled'){
      t.moisture=clamp(t.moisture-.06*sp,0,100);
      if(t.moisture>88) t.status='rotten';
      if(t.moisture>8) t.germ += 0.095*sp*(t.moisture/62);
      if(t.germ>104) t.status='rotten';
    }
  }
  const v=state.vat;
  if(v.volume>0 && !v.rotten){
    v.idle += sp;
    if(v.yeast) v.ferment=clamp(v.ferment+0.09*sp,0,100);
    if(!v.yeast && v.idle>420) v.rotten=true;
    if(v.ferment>98) v.rotten=true;
  }
  const s=state.still;
  s.temp = clamp(s.temp + (s.fire ? .42*sp : -.22*sp), 18, 115);
  if(s.input>0 && s.temp>=78 && s.temp<100){
    const take=Math.min(s.input,.08*sp);
    s.input-=take; s.output+=take*.10;
    s.outputRuns=Math.max(s.outputRuns, s.runs+1);
    s.outputAbv=s.outputRuns===1?25:65;
    s.inputAbv=s.input>0?s.inputAbv:0;
    if(s.input<=0) s.runs=0;
  }
  for(const b of state.barrels){
    const old=Math.floor(b.age);
    b.age += sp/1800;
    if(Math.floor(b.age)>old) b.volume*=.95;
  }
  markDirty();
  render();
}

function waterMalt(tile, amount){
  const t = state.malt[+tile.dataset.i];
  if(t?.status==='filled' && t.status!=='rotten'){
    t.moisture=clamp(t.moisture+amount,0,100);
    markDirty(); render();
  }
}
function waterField(tile){
  const t=state.field[+tile.dataset.i];
  if(t?.status==='planted'){
    t.moisture=clamp(t.moisture+28,0,100);
    markDirty(); render();
  }
}

function dragDataFrom(el){
  const type = el.dataset.drag;
  if(type==='seed' && state.seeds < 1) return null;
  return {...el.dataset, label: el.textContent.trim() || type};
}
function startDrag(e, source){
  if(e.button !== undefined && e.button !== 0) return;
  const data = dragDataFrom(source);
  if(!data) return;
  e.preventDefault();
  source.setPointerCapture?.(e.pointerId);
  const ghost = source.cloneNode(true);
  ghost.classList.add('drag-ghost');
  ghost.style.width = `${Math.max(source.offsetWidth, 46)}px`;
  document.body.appendChild(ghost);
  dragging = {data, ghost, pointerId:e.pointerId, source, lastTarget:null, x:e.clientX, y:e.clientY, moved:false};
  moveGhost(e.clientX, e.clientY);
}
function moveGhost(x,y){
  if(!dragging) return;
  dragging.ghost.style.left = `${x}px`;
  dragging.ghost.style.top = `${y}px`;
}
function clearHover(){ dragging?.lastTarget?.classList.remove('hover'); if(dragging) dragging.lastTarget=null; }
function updateDropHover(e){
  if(!dragging) return;
  dragging.ghost.style.display='none';
  const target = document.elementFromPoint(e.clientX, e.clientY)?.closest('.drop-target');
  dragging.ghost.style.display='';
  if(target !== dragging.lastTarget){
    clearHover();
    if(target){ target.classList.add('hover'); dragging.lastTarget = target; }
  }
}
function endDrag(e){
  if(!dragging) return;
  dragging.ghost.style.display='none';
  const target = document.elementFromPoint(e.clientX, e.clientY)?.closest('.drop-target');
  dragging.ghost.style.display='';
  const data = dragging.data;
  clearHover();
  dragging.ghost.remove();
  dragging = null;
  if(target){ handleDrop(target, data); markDirty(); render(); }
}

document.addEventListener('pointerdown', e=>{
  const dragSource = e.target.closest('[data-drag]');
  if(dragSource) return startDrag(e, dragSource);
  const maltTile = e.target.closest('.malt-tile');
  if(maltTile) return waterMalt(maltTile, 11);
});
document.addEventListener('pointermove', e=>{
  if(!dragging) return;
  if(Math.hypot(e.clientX-dragging.x, e.clientY-dragging.y)>4) dragging.moved = true;
  moveGhost(e.clientX, e.clientY);
  updateDropHover(e);
});
document.addEventListener('pointerup', endDrag);
document.addEventListener('pointercancel', endDrag);
document.addEventListener('pointerover', e=>{
  if(dragging) return;
  const maltTile = e.target.closest('.malt-tile');
  if(maltTile && e.buttons) waterMalt(maltTile, 4);
});
document.addEventListener('click', e=>{
  if(e.target.closest('[data-drag], .clean, button, input')) return;
  const fieldTile = e.target.closest('.field-tile');
  if(fieldTile) waterField(fieldTile);
  if(e.target.closest('#fermentation') && state.vat.rotten){
    Object.assign(state.vat,{volume:0,ferment:0,yeast:false,idle:0,rotten:false});
    markDirty(); render();
  }
});

function handleDrop(target,data){
  if(target.classList.contains('field-tile') && data.drag==='seed'){
    const t=state.field[+target.dataset.i];
    if(t.status==='empty' && state.seeds>=1){ state.seeds--; Object.assign(t,{status:'planted', growth:0, moisture:55}); }
  }
  if(target.classList.contains('malt-tile') && data.drag==='crop'){
    const dst=state.malt[+target.dataset.i], src=state.field[+data.source];
    if(dst.status==='empty' && src?.growth>=75 && src.growth<=95){
      Object.assign(dst,{status:'filled', germ:0, moisture:0});
      Object.assign(src,{status:'empty', growth:0, moisture:25});
    }
  }
  if(target.id==='fermentation' && data.drag==='malt') addMaltToVat(data.source);
  if(target.id==='stillInput' && data.drag==='wash') transferWashToStill();
  if(target.id==='stillInput' && data.drag==='spirit') redistill();
  if(target.id==='aging' && data.drag==='spirit') makeBarrel();
  if(target.id==='bottling' && data.drag==='barrel') bottleBarrel(data.id);
  if(target.id==='truckDock' && data.drag==='box') sellBox(data.id);
}
function addMaltToVat(source){
  const t=state.malt[+source];
  if(!t || t.status!=='filled' || t.germ<68 || t.germ>90) return;
  const add=Math.min(20, 100-state.vat.volume);
  if(add<=0) return;
  Object.assign(t,{status:'empty',germ:0,moisture:0});
  state.vat.ferment = state.vat.volume ? state.vat.ferment*(state.vat.volume/(state.vat.volume+add)) : 0;
  state.vat.volume += add; state.vat.rotten=false; state.vat.idle=0;
}
function transferWashToStill(){
  const v=state.vat, s=state.still;
  if(v.volume<=0 || v.ferment<65 || v.ferment>90 || v.rotten) return;
  const move=Math.min(v.volume*.20, 100-s.input);
  if(move<=0) return;
  v.volume-=move;
  if(v.volume<1){ v.volume=0; v.ferment=0; v.yeast=false; }
  s.input+=move; s.inputAbv=8; s.runs=0;
}
function redistill(){
  const s=state.still;
  if(s.output<=0) return;
  s.input += s.output; s.inputAbv=s.outputAbv; s.runs=s.outputRuns;
  s.output=0; s.outputAbv=0; s.outputRuns=0;
}
function makeBarrel(){
  const s=state.still;
  if(s.output<=0 || s.outputRuns<2) return;
  state.barrels.push({id:crypto.randomUUID(), volume:clamp(s.output*10,5,100), age:0.1, abv:s.outputAbv});
  s.output=0; s.outputAbv=0; s.outputRuns=0;
}
function bottleBarrel(id){
  const i=state.barrels.findIndex(b=>b.id===id);
  if(i<0) return;
  const b=state.barrels.splice(i,1)[0];
  const bottles=Math.max(1,Math.round(clamp(b.volume,0,100)));
  state.boxes.push({id:crypto.randomUUID(), bottles, age:b.age}); state.bottles += bottles;
}
function sellBox(id){
  const i=state.boxes.findIndex(b=>b.id===id);
  if(i<0) return;
  const b=state.boxes.splice(i,1)[0];
  const euros=b.bottles * Math.max(.1,b.age) * state.market;
  state.coins += euros/1000; state.bottles -= b.bottles;
}

$('#buySeeds').onclick=()=>{ if(state.coins>=10){ state.coins-=10; state.seeds+=1; markDirty(); render(); }};
$('#yeast').onclick=()=>{ if(state.vat.volume>0 && !state.vat.rotten){ state.vat.yeast=true; state.vat.idle=0; markDirty(); render(); }};
$('#fire').onclick=()=>{ state.still.fire=!state.still.fire; markDirty(); render(); };
$('#distilleryName').addEventListener('input', e=>{ state.distilleryName=e.target.value || 'Miarma Distillery'; markDirty(); });
$('#speedSlider').addEventListener('input', e=>{ state.speedStep=Number(e.target.value); $('#speedLabel').textContent=speedLabel(); markDirty(); });
$('#resetGame').onclick=()=>{
  if(confirm('¿Reiniciar la partida y borrar el guardado local de Miarma Distillery?')){
    localStorage.removeItem(STORAGE_KEY);
    state = defaultState();
    markDirty(); render(); saveGame();
  }
};

const tip=$('#tooltip');
document.addEventListener('pointermove', e=>{ tip.style.left=e.clientX+'px'; tip.style.top=e.clientY+'px'; });
document.addEventListener('pointerover', e=>{ const el=e.target.closest('[data-tip]'); if(!el) return; tip.textContent=el.dataset.tip; tip.classList.add('show'); });
document.addEventListener('pointerout', e=>{ if(e.target.closest('[data-tip]')) tip.classList.remove('show'); });

loadGame();
initTiles();
render();
setInterval(tick, 120);
setInterval(()=>{ if(saveDirty) saveGame(); }, 20000);
addEventListener('beforeunload', saveGame);
