const STORAGE_KEY = 'miarma-distillery-state-v3';
const SPLASH_KEY = 'sim-distillery-splash-seen-v1';
const FIELD_TILES = 20;
const MALT_TILES = 4;
const VAT_COUNT = 4;
const STILL_COUNT = 4;

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
const rnd = (a,b) => a + Math.random()*(b-a);
const uuid = () => crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
const scaleNow = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--scale')) || 1;
const localPoint = (el, x, y) => { const r=el.getBoundingClientRect(), sc=scaleNow(); return {x: clamp((x-r.left)/sc, 6, Math.max(6, el.offsetWidth-120)), y: clamp((y-r.top)/sc, 6, Math.max(6, el.offsetHeight-90))}; };
const localDropPoint = (el, e, data) => { const r=el.getBoundingClientRect(), sc=scaleNow(); return {x: clamp((e.clientX-r.left)/sc - (Number(data?.offsetX)||0), 6, Math.max(6, el.offsetWidth-120)), y: clamp((e.clientY-r.top)/sc - (Number(data?.offsetY)||0), 6, Math.max(6, el.offsetHeight-90))}; };
const hasVatContents = v => !!(v && ((v.volume||0)>0 || (v.ferment||0)>0 || v.rotten || v.yeast));
const hasStillContents = s => !!(s && ((s.input||0)>0 || (s.output||0)>0 || s.fire || (s.temp||20)>24));
const isVatActive = (v,i) => i===0 || !!v?.unlocked || hasVatContents(v);
const isStillActive = (s,i) => i===0 || !!s?.unlocked || hasStillContents(s);
const pointIn = (el, x, y) => { const r=el.getBoundingClientRect(); return x>=r.left && x<=r.right && y>=r.top && y<=r.bottom; };

const ALCOHOL_BOIL = 78.3;
const WATER_BOIL = 100;
const TEMP_MAX = 120;
const TEMP_MIN = 20;
const FIELD_WATER_CAP = 50;
const SEED_KG_PER_PLOT = 20;
const SEED_PACK_KG = 20;
const SEED_PACK_COST = 1;
const BARREL_PACK_SIZE = 10;
const EQUIPMENT_COST = 50;
const BOURBON_BARREL_LITRES = 200;
const CASK_FILL_ABV = 63.5;
const VAT_WASH_LITRES = 16000;
const STILL_INPUT_LITRES = 8000;
const STILL_OUTPUT_LITRES = 2000;
const BOTTLE_LITRES = 0.7;
const TICK_MS = 120;
const BACKGROUND_SIM_CAP_MS = 5 * 60 * 1000;
const MAX_TICK_CATCHUP_MS = 2000;
const EQUIPMENT_LIMITS = { field: FIELD_TILES, malt: MALT_TILES, vats: VAT_COUNT, stills: STILL_COUNT };
const FIELD_PLOT_AREA_HA = 0.105;
const BARLEY_YIELD_KG_PER_HA = 5500;
const FIELD_BARLEY_KG_PER_PLOT = Math.round(FIELD_PLOT_AREA_HA * BARLEY_YIELD_KG_PER_HA);
const BARLEY_TO_MALT_RATIO = 1 / 1.3;
const MALT_KG_PER_PLOT = Math.round(FIELD_BARLEY_KG_PER_PLOT * BARLEY_TO_MALT_RATIO);
const FIELD_PLOTS_PER_MAX_BATCH = 8;
const MALT_TILE_CAPACITY_KG = Math.round((MALT_KG_PER_PLOT * FIELD_PLOTS_PER_MAX_BATCH) / MALT_TILES / 10) * 10;
const MALT_KG_PER_FULL_VAT = MALT_TILE_CAPACITY_KG * MALT_TILES;
const WASH_ABV_TARGET = 9;
const LOW_WINES_ABV_TARGET = 33.5;
const NEW_MAKE_ABV_TARGET = 70;
const THIRD_DISTILL_ABV_TARGET = 82;
const DISTILL_TAKE_L_PER_TICK = 4;
const DISTILL_WATER_TAKE_L_PER_TICK = 7;
const MARKET_HISTORY_SAMPLE_MS = 1000;
const MARKET_HISTORY_MAX = 90;
const DISTILLATION_TARGETS = {
  1: { abv: LOW_WINES_ABV_TARGET, recovery: .93, label: 'low wines' },
  2: { abv: NEW_MAKE_ABV_TARGET, recovery: .948, label: 'new make' },
  3: { abv: THIRD_DISTILL_ABV_TARGET, recovery: .88, label: 'triple destilado' }
};
const ROOM_CAPACITY = { vatPct: 100, vatLitres: VAT_WASH_LITRES, stillInputL: STILL_INPUT_LITRES, stillOutputL: STILL_OUTPUT_LITRES, maltTileKg: MALT_TILE_CAPACITY_KG };
const FERMENT_IDLE_ROT = 900;
const TURBA_MAX_PPM = 60;
const FIELD_HARVEST_START = 50;
const FIELD_OPTIMAL_START = 70;
const FIELD_OPTIMAL_MID = 82;
const FIELD_OPTIMAL_END = 95;
const FIELD_FULL_GROWTH = 100;
const FIELD_DRY_SECONDS = 7;
const FIELD_OVERDUE_SECONDS = 5;
const MALT_HARVEST_START = 50;
const MALT_OPTIMAL_START = 68;
const MALT_OPTIMAL_MID = 79;
const MALT_OPTIMAL_END = 90;
const FERMENT_OPTIMAL_START = 65;
const FERMENT_OPTIMAL_MID = 77.5;
const FERMENT_OPTIMAL_END = 90;
const FERMENT_ROTTEN_AT = 98;
const MALT_DRY_SECONDS = 7;
const MALT_KILNED_GRACE = 4800;
const PLANT_IMAGES = { sprout: 'img/avena_recien_plantada.png', green: 'img/avena_joven.png', mature: 'img/avena_madura.png', dry: 'img/avena_seca.png' };
const MALT_IMAGES = { wet: 'img/avena_germinando.png', water1: 'img/avena_germinando_1.png', water2: 'img/avena_germinando_2.png', bad: 'img/avena_germinando_estropeada.png', heated: 'img/avena_germinando_malteada.png' };
const bottleImage = b => b.age >= 18 ? 'img/bottles_18.png' : (b.age >= 12 ? 'img/bottles_12.png' : 'img/bottles_no_age.png');
const BARREL_TYPES = {
  bourbon: { label:'Bourbon', wood:'Roble americano', litres:200, cost:3, image:'img/barril_bourbon.png' },
  sherry: { label:'Jerez', wood:'Roble europeo', litres:500, cost:8, image:'img/barril_sherry.png' }
};
const LIQUID_PALETTE = ['#ffe08a','#f6c65b','#e9a93f','#d98a2d','#c86b24','#f2b45a','#b85a1d','#ffd071'];
function barrelCapacityL(b){ const def=BARREL_TYPES[b?.type || 'bourbon'] || BARREL_TYPES.bourbon; return def.litres * (b?.count || BARREL_PACK_SIZE); }
function barrelLiquidL(b){ return (Number(b?.volume)||0) / 100 * barrelCapacityL(b); }
function barrelPctFromL(b, litres){ return clamp((litres / barrelCapacityL(b)) * 100, 0, 100); }
function vatLitres(v){ return (Number(v?.volume)||0) / 100 * VAT_WASH_LITRES; }
function vatPctFromL(litres){ return clamp(litres / VAT_WASH_LITRES * 100, 0, 100); }
function stillInLitres(s){ return (Number(s?.input)||0) / 100 * STILL_INPUT_LITRES; }
function stillInPct(litres){ return clamp(litres / STILL_INPUT_LITRES * 100, 0, 100); }
function stillOutLitres(s){ return (Number(s?.output)||0) / 100 * STILL_OUTPUT_LITRES; }
function stillOutPct(litres){ return clamp(litres / STILL_OUTPUT_LITRES * 100, 0, 100); }
function newBarrel(type='bourbon', x=24, y=48){ return {id:uuid(), type, count:BARREL_PACK_SIZE, barrelQuality:100, volume:0, age:0, abv:0, quality:100, peatPpm:0, components:[], lineage:[], x, y}; }
function defaultBarrels(){ return [newBarrel('bourbon',24,56)]; }
const barrelImage = b => BARREL_TYPES[b.type || 'bourbon']?.image || (b.age >= 10 ? 'img/barril_old.png' : (b.age >= 4 ? 'img/barril_sherry.png' : 'img/barril_bourbon.png'));

const newVat = (unlocked=false) => ({ unlocked, capacityPct:ROOM_CAPACITY.vatPct, volume:0, ferment:0, yeast:false, idle:0, rotten:false, warned:false, baseQuality:100, quality:100, abv:0, peatPpm:0, lineage:[] });
const newStill = (unlocked=false) => ({ unlocked, input:0, inputAbv:0, inputQuality:100, inputPeatPpm:0, inputLineage:[], runs:0, output:0, outputAbv:0, outputQuality:100, outputPeatPpm:0, outputLineage:[], outputRuns:0, temp:20, fire:false });
const defaultState = () => ({
  distilleryName: 'Miarma Distillery',
  speedStep: 0,
  coins: 10,
  seeds: 0,
  bottles: 0,
  market: 3.5,
  marketPhase: Math.random()*10,
  marketTrend: 0,
  marketTrendUntil: Date.now(),
  marketHistory: [{t: Date.now(), p: 3.5}],
  marketHistoryAt: Date.now(),
  debugQuality: false,
  musicEnabled: true,
  fxEnabled: true,
  field: Array.from({length: FIELD_TILES}, () => ({status:'empty', growth:0, moisture:0, dry:0, overdue:0, quality:100, peatPpm:0})),
  malt: Array.from({length: MALT_TILES}, () => ({status:'empty', amount:0, germ:0, moisture:0, quality:100, peatPpm:0, heated:false, peat:false, dry:0, stable:0})),
  vats: Array.from({length: EQUIPMENT_LIMITS.vats}, (_,i) => newVat(i===0)),
  stills: Array.from({length: EQUIPMENT_LIMITS.stills}, (_,i) => newStill(i===0)),
  barrels: defaultBarrels(),
  boxes: []
});

let state = defaultState();
let dragging = null;
let saveDirty = false;
let nameEditing = false;
let pointerActive = false;
let renderPending = false;
let suppressNextClick = false;
let suppressClickTimer = null;

function normaliseLoaded(s){
  const fresh = defaultState();
  const merged = {...fresh, ...s};
  merged.field = Array.from({length: FIELD_TILES}, (_, i) => ({...fresh.field[i], ...(s.field?.[i] || {})}));
  merged.malt = Array.from({length: MALT_TILES}, (_, i) => ({...fresh.malt[i], ...(s.malt?.[i] || {})}));
  merged.vats = Array.from({length: EQUIPMENT_LIMITS.vats}, (_, i) => { const v={...newVat(i===0), ...(s.vats?.[i] || {})}; v.baseQuality = qualityOrDefault(v.baseQuality, qualityOrDefault(v.quality)); v.lineage = Array.isArray(v.lineage) ? v.lineage : []; v.unlocked = i===0 || !!v.unlocked || hasVatContents(v); v.capacityPct = Number(v.capacityPct) || ROOM_CAPACITY.vatPct; return v; });
  merged.stills = Array.from({length: EQUIPMENT_LIMITS.stills}, (_, i) => { const st={...newStill(i===0), ...(s.stills?.[i] || {})}; st.inputLineage = Array.isArray(st.inputLineage) ? st.inputLineage : []; st.outputLineage = Array.isArray(st.outputLineage) ? st.outputLineage : []; st.unlocked = i===0 || !!st.unlocked || hasStillContents(st); return st; });
  merged.barrels = Array.isArray(s.barrels) && s.barrels.length ? s.barrels.map((b,i)=>{ const nb={...newBarrel(b.type || 'bourbon'), ...b, count:b.count || BARREL_PACK_SIZE, barrelQuality:b.barrelQuality || 100, lineage:Array.isArray(b.lineage)?b.lineage:[], components:Array.isArray(b.components)?b.components:[], x: Number.isFinite(b.x)?b.x:20+i*110, y: Number.isFinite(b.y)?b.y:48}; nb.components=normalizeComponents(nb, barrelLiquidL(nb)); return nb; }) : defaultBarrels();
  merged.boxes = Array.isArray(s.boxes) ? s.boxes.map((b,i)=>{ const box={...b, components:Array.isArray(b.components)?b.components:[], x: Number.isFinite(b.x)?b.x:18+i*95, y: Number.isFinite(b.y)?b.y:20}; box.components=normalizeComponents(box, Math.max(0,(Number(box.bottles)||0)*BOTTLE_LITRES), 'Botellas existentes'); return box; }) : [];
  merged.speedStep = 0;
  merged.marketHistory = Array.isArray(s.marketHistory) ? s.marketHistory.map(x=>({t:Number(x.t)||Date.now(), p:clamp(Number(x.p)||merged.market, 2, 5)})).slice(-MARKET_HISTORY_MAX) : [{t:Date.now(), p:merged.market}];
  merged.marketHistoryAt = Number(s.marketHistoryAt) || Date.now();
  merged.marketTrend = Number(s.marketTrend) || 0;
  merged.marketTrendUntil = Number(s.marketTrendUntil) || Date.now();
  merged.debugQuality = !!merged.debugQuality;
  merged.musicEnabled = s.musicEnabled !== false;
  merged.fxEnabled = s.fxEnabled !== false;
  return merged;
}
let musicStarted = false;
function startMainLoop(){
  const audio=$('#mainLoop');
  if(!audio || musicStarted || state.musicEnabled === false) return;
  musicStarted = true;
  audio.volume = .35;
  audio.play().catch(()=>{ musicStarted = false; });
}
function setMusicEnabled(enabled){
  state.musicEnabled = !!enabled;
  const audio=$('#mainLoop');
  if(audio && !state.musicEnabled){ audio.pause(); musicStarted = false; }
  if(audio && state.musicEnabled) startMainLoop();
  refreshAudioToggles(); markDirty();
}
function refreshAudioToggles(){
  $('#toggleMusic')?.classList.toggle('off', state.musicEnabled === false);
  $('#toggleMusic')?.setAttribute('aria-pressed', String(state.musicEnabled !== false));
  $('#toggleFx')?.classList.toggle('off', state.fxEnabled === false);
  $('#toggleFx')?.setAttribute('aria-pressed', String(state.fxEnabled !== false));
  updateLoopFx?.();
}
function playFx(id, volume=.78){
  if(state.fxEnabled === false) return;
  const src=$(`#${id}`); if(!src) return;
  const fx=src.cloneNode(true);
  fx.volume=volume;
  fx.play().catch(()=>{});
  fx.addEventListener('ended', ()=>fx.remove(), {once:true});
}
const LOOP_FX_IDS = ['fxChicharrasCicada', 'fxFireLong', 'fxRottenFlies'];
function setLoopFx(id, active, volume=.45){
  const el=$(`#${id}`); if(!el) return;
  el.loop = true;
  el.volume = volume;
  if(state.fxEnabled === false || !active){
    if(!el.paused){ el.pause(); el.currentTime = 0; }
    return;
  }
  if(el.paused) el.play().catch(()=>{});
}
function updateLoopFx(){
  const dryCrop = state.field?.some(t=>t.status==='dry');
  const rotten = state.field?.some(t=>t.status==='rotten') || state.malt?.some(t=>t.status==='rotten') || state.vats?.some(v=>v.rotten);
  const fire = state.stills?.some(s=>s.fire);
  setLoopFx('fxChicharrasCicada', dryCrop, .34);
  setLoopFx('fxRottenFlies', rotten, .34);
  setLoopFx('fxFireLong', fire, .48);
  if(state.fxEnabled === false) LOOP_FX_IDS.forEach(id=>setLoopFx(id, false));
}
function showSplash(){
  const splash=$('#splashScreen');
  if(!splash) return;
  splash.classList.remove('hidden','leaving');
}
function hideSplash(){
  const splash=$('#splashScreen');
  if(!splash || splash.classList.contains('hidden')) return;
  startMainLoop();
  splash.classList.add('leaving');
  setTimeout(()=>splash.classList.add('hidden'), 520);
}
function setupSplash(){
  const splash=$('#splashScreen');
  if(!splash) return;
  showSplash();
  splash.addEventListener('click', hideSplash);
  splash.addEventListener('keydown', e=>{ if(e.key==='Enter' || e.key===' ' || e.key==='Escape') hideSplash(); });
  document.addEventListener('pointerdown', startMainLoop, {once:true, capture:true});
}
function loadGame(){
  try { const raw = localStorage.getItem(STORAGE_KEY); if(raw) state = normaliseLoaded(JSON.parse(raw)); }
  catch(err) { console.warn('No se pudo cargar la partida guardada', err); }
}
function saveGame(){
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); saveDirty = false; }
  catch(err) { console.warn('No se pudo guardar la partida', err); }
}
function markDirty(){ saveDirty = true; }
function speedMultiplier(){ const step = Number(state.speedStep || 0); return step >= 0 ? 1 + step : 1 / (1 - step); }
function speedLabel(){ const m = speedMultiplier(); return m >= 1 ? `x${m.toFixed(0)}` : `/${Math.round(1/m)}`; }
function setSpeedStep(step){ state.speedStep=clamp(Number(step)||0, -4, 9); $('#speedSlider').value=state.speedStep; $('#speedLabel').textContent=speedLabel(); markDirty(); }
function tempPct(n){ return pct((n - TEMP_MIN) / (TEMP_MAX - TEMP_MIN) * 100); }
function qualityOrDefault(q, fallback=100){ const n=Number(q); return Number.isFinite(n) ? n : fallback; }
function weightedQuality(oldVol, oldQ, addVol, addQ){ const o=qualityOrDefault(oldQ), a=qualityOrDefault(addQ); return oldVol>0 ? (o * oldVol + a * addVol) / (oldVol + addVol) : a; }
function weightedValue(oldVol, oldValue, addVol, addValue){ return oldVol>0 ? ((oldValue || 0) * oldVol + (addValue || 0) * addVol) / (oldVol + addVol) : (addValue || 0); }
function qualityCurve(value, start, mid, end){
  if(value < start) return 0;
  if(value <= mid) return 80 + (value - start) / (mid - start) * 20;
  if(value <= end) return 100 - (value - mid) / (end - mid) * 20;
  return 80;
}
function cropQuality(t){ return qualityCurve(t.growth, FIELD_HARVEST_START, FIELD_OPTIMAL_MID, FIELD_OPTIMAL_END); }
function maltQuality(t){ return qualityCurve(t.germ, MALT_HARVEST_START, MALT_OPTIMAL_MID, MALT_OPTIMAL_END); }
function fermentQuality(v){
  const f = Number(v?.ferment || 0);
  if(f <= FERMENT_OPTIMAL_END) return qualityCurve(f, FERMENT_OPTIMAL_START, FERMENT_OPTIMAL_MID, FERMENT_OPTIMAL_END);
  return clamp(80 - ((f - FERMENT_OPTIMAL_END) / (FERMENT_ROTTEN_AT - FERMENT_OPTIMAL_END)) * 80, 0, 80);
}
function vatDisplayQuality(v){
  if(!v.volume) return qualityOrDefault(v.quality);
  const base = qualityOrDefault(v.baseQuality, qualityOrDefault(v.quality));
  if(!v.yeast || v.ferment < FERMENT_OPTIMAL_START) return base;
  return base * fermentQuality(v) / 100;
}
function qualityColor(q){
  q=clamp(Number(q)||0,0,100);
  if(q>=80){ const t=(q-80)/20; return `rgb(${Math.round(230-(175*t))}, ${Math.round(186+(69*t))}, ${Math.round(48-( -17*t))})`; }
  const t=q/80; return `rgb(${Math.round(180 + 50*t)}, ${Math.round(38 + 148*t)}, ${Math.round(34 + 14*t)})`;
}
function lineageCount(lineage){ return Array.isArray(lineage) ? lineage.length : 0; }
function lineageDebug(lineage){ const n=lineageCount(lineage); return n ? ` · L${n}` : ''; }
function mergeLineage(...parts){ return parts.flat().filter(Boolean).slice(-40); }
function qualityHtml(q, peat=0, lineage=[]){ return state.debugQuality ? `<div class="quality-pill">Q ${Math.round(qualityOrDefault(q))}${peat ? ` · T ${Math.round(peat)}ppm` : ''}${lineageDebug(lineage)}</div>` : ''; }
function escapeHtml(value){ return String(value ?? '').replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[ch] || ch)); }
function escapeAttr(value){ return escapeHtml(value).replace(/'/g, '&#39;'); }
function hashString(value){ return [...String(value || '')].reduce((acc,ch)=>((acc<<5)-acc+ch.charCodeAt(0))|0,0); }
function liquidColor(id){ return LIQUID_PALETTE[Math.abs(hashString(id)) % LIQUID_PALETTE.length]; }
function liquidLabel(prefix, lineage=[]){
  const last=[...(Array.isArray(lineage)?lineage:[])].reverse().find(x=>x?.stage);
  if(last?.stage==='destilado') return `${last.run || ''}º dest.`.trim();
  if(last?.stage==='barrica') return 'Líquido de barrica';
  return prefix;
}
function displayLiquidLabel(label){
  const clean = String(label || 'Líquido')
    .replace(/\bDebug\b/gi,'')
    .replace(/Destilado\s+(\d+)[ªº]?\s+pasada/gi, '$1º dest.')
    .replace(/(\d+)[ªº]?\s+destilaci[oó]n/gi, '$1º dest.')
    .replace(/\bTanda\s*\d*\b/gi,'Destilado')
    .replace(/\s+/g,' ')
    .trim();
  return clean || 'Líquido';
}
function normalizeComponents(owner, totalLitres, fallbackLabel='Líquido existente'){
  const total=Number(totalLitres)||0;
  let comps=Array.isArray(owner?.components) ? owner.components.map((c,i)=>({
    id:c.id || `${fallbackLabel}-${i}`,
    label:c.label || fallbackLabel,
    color:c.color || liquidColor(c.id || `${fallbackLabel}-${i}`),
    litres:Math.max(0, Number(c.litres)||0),
    abv:Number.isFinite(Number(c.abv)) ? Number(c.abv) : (owner?.abv || 0),
    quality:qualityOrDefault(c.quality, owner?.quality || 100),
    peatPpm:Number(c.peatPpm)||0,
    age:Number(c.age)||0
  })).filter(c=>c.litres>.01) : [];
  const sum=comps.reduce((a,c)=>a+c.litres,0);
  if(total<=.01) return [];
  if(sum<=.01) return [{id:`legacy-${owner?.id || 'liquid'}`, label:fallbackLabel, color:liquidColor(owner?.id || fallbackLabel), litres:total, abv:owner?.abv || 0, quality:owner?.quality || 100, peatPpm:owner?.peatPpm || 0, age:owner?.age || 0}];
  if(Math.abs(sum-total)>.1){ const ratio=total/sum; comps=comps.map(c=>({...c, litres:c.litres*ratio})); }
  return comps;
}
function mergeComponents(existing=[], incoming=[]){
  const map=new Map();
  for(const c of [...existing, ...incoming].filter(x=>(x?.litres||0)>.01)){
    const key=c.id || c.label || uuid();
    const prev=map.get(key);
    if(!prev){ map.set(key,{...c, id:key, color:c.color || liquidColor(key)}); continue; }
    const total=prev.litres + c.litres;
    map.set(key,{...prev, litres:total, abv:weightedValue(prev.litres, prev.abv, c.litres, c.abv), quality:weightedQuality(prev.litres, prev.quality, c.litres, c.quality), peatPpm:weightedValue(prev.litres, prev.peatPpm, c.litres, c.peatPpm), age:Math.min(prev.age||0, c.age||0)});
  }
  return [...map.values()].slice(-12);
}
function splitComponents(owner, totalLitres, moveLitres, fallbackLabel='Líquido existente'){
  const comps=normalizeComponents(owner, totalLitres, fallbackLabel);
  const ratio=totalLitres>0 ? clamp(moveLitres/totalLitres,0,1) : 0;
  const moved=comps.map(c=>({...c, litres:c.litres*ratio})).filter(c=>c.litres>.01);
  owner.components=comps.map(c=>({...c, litres:c.litres*(1-ratio)})).filter(c=>c.litres>.01);
  return moved;
}
function scaleComponents(owner, factor){ if(Array.isArray(owner?.components)) owner.components=owner.components.map(c=>({...c, litres:(c.litres||0)*factor})).filter(c=>c.litres>.01); }
function barrelSegmentsHtml(b){
  const capacity=barrelCapacityL(b), liquid=barrelLiquidL(b);
  if(liquid<=.01) return '<i style="height:0%"></i>';
  let bottom=0;
  return normalizeComponents(b, liquid).map(c=>{
    const h=clamp(c.litres/capacity*100,0,100-bottom);
    const html=`<span class="liquid-segment" style="bottom:${bottom.toFixed(2)}%;height:${h.toFixed(2)}%;background:${c.color}"></span>`;
    bottom+=h; return html;
  }).join('');
}
function componentsTip(owner, totalLitres, fallbackLabel='Líquido existente'){
  const comps=normalizeComponents(owner, totalLitres, fallbackLabel);
  if(!comps.length) return '';
  const total=comps.reduce((a,c)=>a+c.litres,0) || totalLitres || 1;
  return comps.map(c=>`<span class="liquid-swatch" style="background:${c.color}"></span>${escapeHtml(displayLiquidLabel(c.label))}: ${Math.round(c.litres)}l (${Math.round(c.litres/total*100)}%) 🧪 ${Math.round(c.abv||0)}° ⭐ ${Math.round(qualityOrDefault(c.quality))} 🪵 ${Math.round(c.peatPpm||0)}ppm`).join('\n');
}
function clearVat(v){ const unlocked=!!v?.unlocked; Object.assign(v,newVat(unlocked)); }
function clearStillInput(s){ Object.assign(s,{input:0, inputAbv:0, inputQuality:100, inputPeatPpm:0, inputLineage:[], runs:0}); }
function clearStillOutput(s){ Object.assign(s,{output:0, outputAbv:0, outputQuality:100, outputPeatPpm:0, outputLineage:[], outputRuns:0}); }
function recordMarketSample(now=Date.now(), force=false){
  if(!Array.isArray(state.marketHistory)) state.marketHistory=[];
  if(force || !state.marketHistory.length || now-(state.marketHistoryAt||0)>=MARKET_HISTORY_SAMPLE_MS){
    state.marketHistory.push({t:now, p:Number(state.market)||3.5});
    state.marketHistory=state.marketHistory.slice(-MARKET_HISTORY_MAX);
    state.marketHistoryAt=now;
  }
}
function updateMarketTrend(now=Date.now()){
  if(now >= (state.marketTrendUntil || 0)){
    state.marketTrend = rnd(-.62, .62);
    state.marketTrendUntil = now + rnd(12000, 42000);
  }
}
function marketSparklineHtml(){
  const data=(Array.isArray(state.marketHistory) && state.marketHistory.length ? state.marketHistory : [{p:state.market}]).slice(-30);
  const w=220,h=58,pad=5;
  const vals=data.map(x=>Number(x.p)||state.market);
  const min=Math.min(...vals), max=Math.max(...vals), span=Math.max(.15,max-min);
  const points=vals.map((v,i)=>`${pad+(i/(Math.max(1,vals.length-1)))*(w-pad*2)},${h-pad-((v-min)/span)*(h-pad*2)}`).join(' ');
  return `<svg class='market-chart' viewBox='0 0 ${w} ${h}' aria-label='histórico reciente'><polyline points='${points}'></polyline><text x='4' y='11'>histórico reciente</text><text x='${w-4}' y='${h-5}' text-anchor='end'>${min.toFixed(2)}–${max.toFixed(2)}€</text></svg>`;
}
function maltedWarning(t){ return t.status==='filled' && t.heated && (t.stable || 0) > MALT_KILNED_GRACE/2; }
function notice(msg){ alert(msg); }
function tipHtml(text){
  const [main, note] = String(text || '').split('||');
  const lines = main.split(/\s*·\s*|\n+/).map(x=>x.trim()).filter(Boolean);
  const body = lines.map(x=>`<div>${x}</div>`).join('');
  return body + (note ? `<span class="tip-note">${note.trim()}</span>` : '');
}
function vatAbv(v){ return v.volume>0 ? clamp((v.ferment / FERMENT_OPTIMAL_END) * WASH_ABV_TARGET, 0, WASH_ABV_TARGET) : 0; }
function maltWaterImage(t){ if(t.status==='rotten') return MALT_IMAGES.bad; if(t.moisture>66) return MALT_IMAGES.water2; if(t.moisture>0) return MALT_IMAGES.water1; return ''; }
function fermentWarning(v){ return !v.yeast && v.volume>0 && !v.rotten && v.idle > FERMENT_IDLE_ROT/2; }
function clearHints(){ $$('.can-drop').forEach(el=>el.classList.remove('can-drop')); }
function markDropHints(data){
  clearHints(); if(!data) return;
  let sel = '';
  if(data.drag==='seed') sel = '.field-tile';
  if(data.drag==='crop') sel = '.malt-tile';
  if(data.drag==='malt') sel = '.vat-unit';
  if(data.drag==='wash') sel = '.still-drop.in';
  if(data.drag==='spirit') sel = '.still-drop.in, .barrel-card';
  if(data.drag==='barrel') sel = '#aging, #bottling';
  if(data.drag==='box') sel = '#bottling, #truckDock';
  if(sel) $$(sel).forEach(el=>el.classList.add('can-drop'));
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

function bars(a,b,start,width,bad=false, opts=''){
  return `<div class="mini-bars"><div class="bar moist"><em class="dry-zone"></em><i style="width:${pct(a)}"></i></div><div class="bar ranged quality-gradient ${bad?'bad':''}"><em style="left:${start}%;width:${width}%"></em><i style="width:${pct(b)}"></i></div></div>`;
}
function addClean(el, fn){
  const b=document.createElement('button');
  b.className='clean'; b.type='button'; b.textContent='Limpiar';
  let done = false;
  const cleanNow = e=>{
    e.preventDefault(); e.stopPropagation();
    if(done) return;
    done = true;
    dragging?.ghost?.remove?.(); dragging = null;
    playFx('fxDropGrain');
    fn(); markDirty(); render(); saveGame();
  };
  b.onpointerdown=e=>{ e.preventDefault(); e.stopPropagation(); };
  b.onpointerup=cleanNow; b.onclick=cleanNow;
  el.appendChild(b);
}
function fieldTip(t){
  if(t.status==='empty') return `Parcela vacía (${FIELD_PLOT_AREA_HA} ha). Arrastra ${SEED_KG_PER_PLOT} Kg de semillas aquí.`;
  if(t.status==='dry') return 'Cultivo seco. Pulsa Limpiar en la zona de barritas.';
  if(t.status==='rotten') return 'Cultivo estropeado. Pulsa Limpiar.';
  return `🌾 Cultivo.
Humedad: ${t.moisture.toFixed(0)}%.
Crecimiento: ${t.growth.toFixed(0)}%.
Cosechable desde: ${FIELD_HARVEST_START}%.
Calidad: ${Math.round(cropQuality(t))}.||Click para regar; arrastra al malteado cuando madure.`;
}
function maltTip(t){
  if(t.status==='empty') return `Malteado vacío.
Capacidad: ${MALT_TILE_CAPACITY_KG} Kg de malta.
Suelta cebada madura aquí.||No germina hasta que añadas agua.`;
  if(t.status==='rotten') return `Malta estropeada.
Ya no se puede usar: pulsa Limpiar.`;
  if(t.heated) return `Malta calentada${t.peatPpm?' con turba':''}.
Germinación detenida: ${t.germ.toFixed(0)}%.
Calidad: ${Math.round(t.quality || 100)}.
Turba: ${Math.round(t.peatPpm || 0)}ppm.${maltedWarning(t)?'||Atención: esta malta lleva mucho tiempo secada; si la dejas demasiado, se estropeará.':''}`;
  if(t.moisture<=0 && t.germ<=0) return 'Cebada almacenada en seco. Click para llenar el depósito de agua y empezar germinación.';
  return `🌿 Malteado.
Cantidad: ${Math.round(t.amount||0)} Kg / ${MALT_TILE_CAPACITY_KG} Kg.
Humedad: ${t.moisture.toFixed(0)}%.
Germinación: ${t.germ.toFixed(0)}%.
Óptimo: ${MALT_HARVEST_START}-${MALT_OPTIMAL_END}%.||Click para llenar el depósito de agua.`;
}

function renderField(){
  $$('.field-tile').forEach(el=>{
    const t = state.field[+el.dataset.i];
    el.classList.toggle('empty', t.status==='empty');
    el.innerHTML = t.status==='empty' ? '' : bars((t.moisture/FIELD_WATER_CAP)*100, t.growth, FIELD_HARVEST_START, FIELD_OPTIMAL_END - FIELD_HARVEST_START, t.status==='rotten' || t.status==='dry', 'field');
    el.dataset.tip = fieldTip(t);
    if(t.status==='planted' || t.status==='dry'){
      const plant = document.createElement('div');
      plant.className='plant';
      const img = document.createElement('img');
      img.className='plant-img'; img.draggable=false;
      if(t.status==='dry'){ plant.className += ' dry'; img.src=PLANT_IMAGES.dry; img.alt='cultivo seco'; }
      else if(t.growth>=FIELD_HARVEST_START){ img.src=PLANT_IMAGES.mature; img.alt='cultivo maduro'; }
      else if(t.growth>=35){ img.src=PLANT_IMAGES.green; img.alt='cultivo verde'; }
      else { img.src=PLANT_IMAGES.sprout; img.alt='cultivo recién plantado'; }
      plant.appendChild(img); el.appendChild(plant);
      if(t.status==='planted' && t.growth>=FIELD_HARVEST_START){
        plant.className += ' token crop-token';
        plant.dataset.drag='crop'; plant.dataset.source=el.dataset.i;
        plant.dataset.tip=`🌾 Cebada madura.
Rendimiento: ~${FIELD_BARLEY_KG_PER_PLOT} Kg de cebada (${FIELD_PLOT_AREA_HA} ha).
⭐ Q: ${Math.round(cropQuality(t))}.||Arrástrala a malteado.`;
        if(!state.debugQuality) el.insertAdjacentHTML('beforeend', `<div class="quality-pill crop-q">Q ${Math.round(cropQuality(t))}</div>`);
      }
      if(state.debugQuality) el.insertAdjacentHTML('beforeend', qualityHtml(cropQuality(t), t.peatPpm || 0));
    }
    if(t.status==='rotten' || t.status==='dry') addClean(el, () => Object.assign(t,{status:'empty',growth:0,moisture:0,dry:0,overdue:0,quality:100}));
  });
}

function renderMalt(){
  $$('.malt-tile').forEach(el=>{
    const i=+el.dataset.i, t=state.malt[i];
    el.classList.toggle('empty', t.status==='empty');
    el.innerHTML = `<div class="malt-capacity"><i style="height:${pct(((t.amount||0)/MALT_TILE_CAPACITY_KG)*100)}"></i></div>` + (t.status==='empty' ? '' : bars(t.moisture, t.germ, MALT_HARVEST_START, MALT_OPTIMAL_END - MALT_HARVEST_START, t.status==='rotten', 'quality'));
    el.dataset.tip = maltTip(t);
    if(t.status==='filled' || t.status==='rotten'){
      const plant = document.createElement('div');
      plant.className='plant';
      plant.innerHTML = `<img class="plant-img" src="${t.heated ? MALT_IMAGES.heated : MALT_IMAGES.wet}" alt="malta" draggable="false">`;
      const waterImg = maltWaterImage(t);
      if(waterImg) el.insertAdjacentHTML('beforeend', `<div class="malt-overlay"><img src="${waterImg}" alt="agua germinando"></div>`);
      if(maltedWarning(t)) el.insertAdjacentHTML('beforeend', '<div class="warning-overlay malt-warning">⚠️</div>');
      el.appendChild(plant);
      if(t.status==='filled' && t.heated && t.germ>=MALT_HARVEST_START){
        plant.className += ' token malt-token';
        plant.dataset.drag='malt'; plant.dataset.source=i;
        plant.dataset.tip=`Malta secada${t.peatPpm?' con turba':''}.
Cantidad: ${Math.round(t.amount || 0)} Kg.
Calidad: ${Math.round(t.quality || 100)}.
Turba: ${Math.round(t.peatPpm || 0)}ppm.||Arrástrala a una tina.`;
      }
      if(!t.heated && t.status!=='rotten'){
        const controls = document.createElement('div');
        controls.className='malt-controls';
        controls.innerHTML = `<button class="pixel-btn heat-tile" type="button" data-i="${i}" data-tip="🔥 Calentar: seca la malta y detiene la germinación en este punto.">🔥</button><button class="peat-icon ${t.peat?'on':''}" type="button" data-i="${i}" data-tip="🪵 Turba: marca esta malta como ahumada antes de calentar.">🪵</button>`;
        el.appendChild(controls);
      }
      if(state.debugQuality) el.insertAdjacentHTML('beforeend', qualityHtml(t.quality || 100, t.peatPpm || 0, t.lineage || []));
    }
    if(t.status==='rotten') addClean(el, () => Object.assign(t,{status:'empty',amount:0,germ:0,moisture:0,quality:100,peatPpm:0,lineage:[],heated:false,peat:false,dry:0,stable:0}));
  });
}

function renderVats(){
  const root = $('#fermentation');
  const canBuyVat = state.vats.some((v,i)=>i>0 && !isVatActive(v,i));
  root.innerHTML = `${canBuyVat ? `<div class="equipment-shop vat-shop"><button class="equipment-buy" type="button" data-equipment="vat" data-tip="Comprar una tina de fermentación nueva.\nCoste: ${EQUIPMENT_COST} k€.">+ Tina 50k€</button></div>` : ''}` + state.vats.map((v,i)=>{
    const q = vatDisplayQuality(v);
    const ready = v.volume>0 && v.ferment>=FERMENT_OPTIMAL_START && !v.rotten;
    const drag = ready ? `data-drag="wash" data-vat="${i}" data-label="mosto"` : '';
    const abv = vatAbv(v);
    const warn = fermentWarning(v);
    const volumeL = vatLitres(v);
    const tip = v.rotten ? `Tina estropeada.
Pulsa para limpiar.` : `🧪 Tina ${i+1}.
Volumen: ${v.volume.toFixed(0)}% (${Math.round(volumeL)}l / ${VAT_WASH_LITRES}l).
Fermentación: ${v.ferment.toFixed(0)}%.
ABV: ${abv.toFixed(1)}°.
Calidad: ${Math.round(q)}.
Turba: ${Math.round(v.peatPpm || 0)}ppm.${warn?'||Atención: si no echas levadura pronto, se estropeará.':''}`;
    return `<div class="machine-unit vat-unit drop-target ${ready?'ready-drag':''} ${isVatActive(v,i)?'':'inactive'}" data-i="${i}" ${drag} data-tip="${tip}">
      ${qualityHtml(q, v.peatPpm || 0, v.lineage || [])}
      <div class="bar vertical vol"><i style="height:${pct(v.volume)}"></i><span class="bar-abv">Vol</span></div>
      <img class="machine-sprite vat-sprite" src="img/tina_fermentacion.png" alt="tina de fermentación" draggable="false">
      ${v.rotten ? '<div class="vat-rot-overlay"><img src="img/tina_fermentacion_estropeada.png" alt="fermentación estropeada"></div>' : ''}
      ${warn ? '<div class="warning-overlay">⚠️</div>' : ''}
      <div class="bar vertical ranged ferment quality-gradient"><em style="height:${FERMENT_ROTTEN_AT-FERMENT_OPTIMAL_START}%;bottom:${FERMENT_OPTIMAL_START}%"></em><i style="height:${pct(v.ferment)};background:${qualityColor(q)}"></i><span class="bar-abv">Ferm ${abv.toFixed(1)}°</span></div>
      ${v.rotten ? `<button class="pixel-btn small clean-vat-btn" type="button" data-i="${i}">Limpiar</button>` : `<button class="pixel-btn small yeast-btn ${v.yeast?'used':''}" type="button" data-i="${i}">Echar levadura</button>`}
    </div>`;
  }).join('');
}

function renderStills(){
  const root = $('#stillhouse');
  const canBuyStill = state.stills.some((s,i)=>i>0 && !isStillActive(s,i));
  root.innerHTML = `${canBuyStill ? `<div class="equipment-shop still-shop"><button class="equipment-buy" type="button" data-equipment="still" data-tip="Comprar un alambique nuevo.\nCoste: ${EQUIPMENT_COST} k€.">+ Alambique 50k€</button></div>` : ''}` + state.stills.map((s,i)=>{
    const spiritReady = s.output > 0;
    const heat = tempPct(s.temp);
    const tip = `⚗️ Alambique ${i+1}.
Entrada: ${s.input.toFixed(0)}% (${Math.round(s.input/100*STILL_INPUT_LITRES)}l) / ${s.inputAbv.toFixed(0)}° ABV.
Salida: ${s.output.toFixed(1)}% (${Math.round(stillOutLitres(s))}l) / ${s.outputAbv.toFixed(0)}° ABV.
Calor: ${heat}.
Calidad: ${Math.round(s.output>0 ? qualityOrDefault(s.outputQuality) : qualityOrDefault(s.inputQuality))}.||1ª pasada: low wines ~${LOW_WINES_ABV_TARGET}°. 2ª pasada: new make ~${NEW_MAKE_ABV_TARGET}°. 3ª pasada opcional: triple destilado ~${THIRD_DISTILL_ABV_TARGET}°. Por encima de 100° arrastra agua: más volumen, menos ABV/calidad, nunca más LPA.`;
    return `<div class="machine-unit still-unit ${isStillActive(s,i)?'':'inactive'}" data-i="${i}" data-tip="${tip}">
      ${qualityHtml(s.output>0 ? s.outputQuality : s.inputQuality, s.output>0 ? s.outputPeatPpm : s.inputPeatPpm, s.output>0 ? s.outputLineage : s.inputLineage)}
      <div class="temp-chip">${s.temp.toFixed(0)}°C</div>
      <div class="bar vertical input"><i style="height:${pct(s.input)}"></i><span class="bar-abv">${s.inputAbv.toFixed(0)}°</span></div>
      <div class="bar vertical tempv"><em class="alcohol-zone" style="height:4%;bottom:58%"></em><b class="water-line" style="bottom:80%"></b><i style="height:${tempPct(s.temp)}"></i><span class="bar-abv">🌡️</span></div>
      <div class="still-visual"><img class="machine-sprite still-sprite" src="img/alambique.png" alt="alambique" draggable="false"><img class="machine-sprite still-sprite fire-gif ${s.fire?'':'hidden'}" src="img/alambique.gif" alt="fuego" draggable="false"></div>
      <div class="bar vertical output"><i style="height:${pct(s.output)}"></i><span class="bar-abv">${s.outputAbv.toFixed(0)}°</span></div>
      <div class="still-drop in drop-target" data-still="${i}" data-zone="in" data-tip="Entrada del alambique: suelta mosto o destilado para segunda pasada."></div>
      <div class="still-drop out ${spiritReady?'ready-drag':''}" data-still="${i}" data-zone="out" ${spiritReady ? 'data-drag="spirit" data-label="destilado"' : ''} data-tip="Salida del alambique: arrastra de aquí a IN para segunda pasada o a barricas."></div>
      <button class="pixel-btn small empty-still-btn" type="button" data-i="${i}" data-tip="Vaciar entrada.\nDescarta el líquido de la parte izquierda para preparar otra destilación.">🪣 Vaciar</button><button class="pixel-btn small fire-btn" type="button" data-i="${i}" data-tip="Fuego.\nEnciende o apaga el calentamiento.">🔥 ${s.fire?'Apagar':'Fuego'}</button>
    </div>`;
  }).join('');
}

function renderCards(){
  const aging=$('#aging'), bottling=$('#bottling');
  aging.innerHTML=''; bottling.innerHTML='';
  const shop=document.createElement('div');
  shop.className='barrel-shop';
  shop.innerHTML=`<button class="barrel-buy" type="button" data-type="bourbon" data-tip="Comprar pack de ${BARREL_PACK_SIZE} barricas de Bourbon.\nRoble americano · 200l · ${BARREL_TYPES.bourbon.cost} k€.">+ 10 barricas de Bourbon ${BARREL_TYPES.bourbon.cost}k€</button><button class="barrel-buy" type="button" data-type="sherry" data-tip="Comprar pack de ${BARREL_PACK_SIZE} barricas de Jerez.\nRoble europeo · 500l · ${BARREL_TYPES.sherry.cost} k€.">+ 10 barricas de Jerez ${BARREL_TYPES.sherry.cost}k€</button>`;
  aging.appendChild(shop);
  if(state.barrels.some(b=>(b.barrelQuality||100)<90)){
    const discard=document.createElement('div');
    discard.id='barrelDiscard'; discard.className='barrel-discard drop-target';
    discard.dataset.tip='Descartar barriles viejos.\nSuelta aquí un pack con Q de barril menor de 90 para retirarlo.';
    discard.textContent='🗑️ Descartar barriles Q<90';
    aging.appendChild(discard);
  }
  state.barrels.forEach((b,i)=>{
    if(!Number.isFinite(b.x)) b.x=24+i*120; if(!Number.isFinite(b.y)) b.y=56;
    const type=BARREL_TYPES[b.type || 'bourbon'] || BARREL_TYPES.bourbon;
    const el=document.createElement('div'); el.className=`card barrel-card drop-target barrel-${b.type || 'bourbon'} ${b.volume>0?'filled':'empty-barrel'}`; el.dataset.drag='barrel'; el.dataset.id=b.id;
    el.style.left=`${b.x}px`; el.style.top=`${b.y}px`;
    const liquidL=barrelLiquidL(b);
    const breakdown=componentsTip(b, liquidL);
    el.dataset.tip=`🛢️ Pack ${b.count || BARREL_PACK_SIZE} barriles · ${type.wood} ${type.litres}l.
Volumen líquido: ${(b.volume||0).toFixed(1)}% (${Math.floor(liquidL)}l / ${barrelCapacityL(b)}l).
🕰️ Años: ${(b.age||0).toFixed(1)}.
🧪 Alcohol: ${(b.abv||0).toFixed(0)}°.
⭐ Q líquido: ${Math.round(b.quality || 100)}.
🪵 Turba líquido: ${Math.round(b.peatPpm || 0)}ppm.
🏷️ Q barril: ${Math.round(b.barrelQuality || 100)}.${breakdown?`\n\nDesglose por líquido:\n${breakdown}`:''}||Arrastra destilado aquí, mueve líquido entre barriles o lleva el barril a embotellado.`;
    el.innerHTML=`${qualityHtml(b.quality, b.peatPpm || 0, b.lineage || [])}<div class="vol-label">${(b.volume||0).toFixed(0)}%</div><div class="bar vol-bar liquid-stack">${barrelSegmentsHtml(b)}</div><div class="barrel-text"><span>🕰️ ${(b.age||0).toFixed(1)}a</span><span class="abs-label">🧪 ${(b.abv||0).toFixed(0)}°</span></div><img src="${barrelImage(b)}" alt="barrica">`;
    aging.appendChild(el);
  });
  if(!state.boxes.length){
    bottling.innerHTML='<div class="card empty-card" data-tip="Aquí aparecerá una caja cuando embotelles una barrica.\nAhora cada icono de barril representa 10 barriles, así que las cajas salen x10 botellas."><img src="img/bottles_no_age.png" alt="botellas">Vacío<br>Embotella barricas</div>';
  }
  state.boxes.forEach((b,i)=>{
    if(!Number.isFinite(b.x)) b.x=18+i*95; if(!Number.isFinite(b.y)) b.y=20;
    const el=document.createElement('div'); el.className='card box-card bottle-card drop-target'; el.dataset.drag='box'; el.dataset.id=b.id;
    el.style.left=`${b.x}px`; el.style.top=`${b.y}px`;
    const boxLitres=(Number(b.bottles)||0)*BOTTLE_LITRES;
    const breakdown=componentsTip(b, boxLitres, 'Botellas');
    el.dataset.tip=`📦 Caja · 🍾 ${b.bottles} botellas · 🕰️ ${Math.floor(b.age)} años · 🧪 ${Math.round(b.abv || 0)}° ABV · ⭐ Calidad ${Math.round(b.quality || 100)} · 🪵 Turba ${Math.round(b.peatPpm || 0)}ppm.${breakdown?`\n\nDesglose por líquido:\n${breakdown}`:''}||Muévela por la tienda o arrástrala al camión para vender.`;
    el.innerHTML=`${qualityHtml(b.quality, b.peatPpm || 0, b.lineage || [])}<div class="box-text"><span>🍾 ${b.bottles}</span><span>🕰️ ${Math.floor(b.age)}a</span></div><img src="${bottleImage(b)}" alt="botellas">`;
    bottling.appendChild(el);
  });
}

function buyBarrel(type){
  const def=BARREL_TYPES[type]; if(!def || state.coins<def.cost) return;
  state.coins-=def.cost;
  state.barrels.push(newBarrel(type, 24 + (state.barrels.length%4)*185, 56 + Math.floor(state.barrels.length/4)*118));
  playFx('fxCashRegister', .72);
  markDirty(); render(); saveGame();
}

function buyEquipment(kind){
  if(state.coins < EQUIPMENT_COST){ notice(`Necesitas ${EQUIPMENT_COST} k€ para comprar este equipo.`); return; }
  if(kind==='vat'){
    const idx=state.vats.findIndex((v,i)=>i>0 && !isVatActive(v,i));
    if(idx<0){ notice('No queda espacio para más tinas.'); return; }
    state.coins -= EQUIPMENT_COST;
    state.vats[idx] = newVat(true);
    playFx('fxCashRegister', .72);
  } else if(kind==='still'){
    const idx=state.stills.findIndex((s,i)=>i>0 && !isStillActive(s,i));
    if(idx<0){ notice('No queda espacio para más alambiques.'); return; }
    state.coins -= EQUIPMENT_COST;
    state.stills[idx] = newStill(true);
    playFx('fxCashRegister', .72);
  } else return;
  markDirty(); render(); saveGame();
}

function handleDrop(target,data,e){
  if(e && data.drag==='box' && pointIn($('#truckDock'), e.clientX, e.clientY)){ sellBox(data.id); return; }
  if(e && data.drag==='box' && pointIn($('#bottling'), e.clientX, e.clientY)){ moveBox(data.id, e, data); return; }
  if(data.drag==='barrel' && target.closest('#barrelDiscard')){ discardBarrel(data.id); return; }
  if(data.drag==='barrel' && target.classList.contains('barrel-card')){
    if(target.dataset.id !== data.id) transferBarrelToBarrel(data.id, target.dataset.id);
    else if(e) moveBarrel(data.id, e, data);
    return;
  }
  if(data.drag==='barrel' && target.closest('#bottling')){ bottleBarrel(data.id, e, data); return; }
  if(data.drag==='barrel' && target.closest('#aging')){ moveBarrel(data.id, e, data); return; }
  if(target.classList.contains('field-tile') && data.drag==='seed'){
    const t=state.field[+target.dataset.i];
    if(t.status==='empty' && state.seeds>=SEED_KG_PER_PLOT){ state.seeds-=SEED_KG_PER_PLOT; Object.assign(t,{status:'planted', growth:0, moisture:0, dry:0, overdue:0, quality:100}); playFx('fxDropGrain'); }
  }
  if(target.classList.contains('malt-tile') && data.drag==='crop'){
    const dst=state.malt[+target.dataset.i], src=state.field[+data.source];
    if(dst && src?.growth>=FIELD_HARVEST_START && (dst.amount||0)<MALT_TILE_CAPACITY_KG){
      const add=Math.min(MALT_KG_PER_PLOT, MALT_TILE_CAPACITY_KG-(dst.amount||0)), old=dst.amount||0;
      Object.assign(dst,{status:'filled', amount:old+add, germ:dst.germ||0, moisture:dst.moisture||0, quality:weightedQuality(old, dst.quality||100, add, cropQuality(src)), lineage:mergeLineage(dst.lineage||[], [{stage:'cultivo', q:cropQuality(src), barleyKg:FIELD_BARLEY_KG_PER_PLOT, maltKg:add, areaHa:FIELD_PLOT_AREA_HA}]), heated:false, peat:dst.peat||false, dry:0, stable:0});
      Object.assign(src,{status:'empty', growth:0, moisture:0, dry:0, overdue:0, quality:100});
      playFx('fxDropGrain');
    }
  }
  if(target.classList.contains('vat-unit') && data.drag==='malt') addMaltToVat(+target.dataset.i, data.source);
  if(target.classList.contains('still-drop') && target.dataset.zone==='in' && data.drag==='wash') transferWashToStill(+data.vat, +target.dataset.still);
  if(target.classList.contains('still-drop') && target.dataset.zone==='in' && data.drag==='spirit') redistill(+data.still, +target.dataset.still);
  if(target.classList.contains('barrel-card') && data.drag==='spirit') addSpiritToBarrel(+data.still, target.dataset.id);
  if(target.closest('#bottling') && data.drag==='box') moveBox(data.id, e, data);
}
function addMaltToVat(vatIndex, source){
  const t=state.malt[+source], v=state.vats[vatIndex];
  if(!t || !v || t.status!=='filled' || !t.heated || t.germ<MALT_HARVEST_START || v.rotten) return;
  const maltKg=Number(t.amount)||0;
  const add=Math.min((maltKg/MALT_KG_PER_FULL_VAT)*100,100-v.volume); if(add<=0) return;
  const washLitres=add/100*VAT_WASH_LITRES;
  v.unlocked = true;
  v.baseQuality=weightedQuality(vatLitres(v), qualityOrDefault(v.baseQuality, qualityOrDefault(v.quality)), washLitres, qualityOrDefault(t.quality));
  v.quality=v.baseQuality;
  v.peatPpm=weightedValue(vatLitres(v), v.peatPpm, washLitres, t.peatPpm || 0);
  v.lineage=mergeLineage(v.lineage||[], t.lineage||[], [{stage:'malteado', q:t.quality||100, peat:t.peatPpm||0, maltKg, washLitres}]);
  v.ferment = v.volume ? v.ferment*(v.volume/(v.volume+add)) : 0;
  v.volume += add; v.rotten=false; v.warned=false; v.idle=0;
  Object.assign(t,{status:'empty',amount:0,germ:0,moisture:0,quality:100,peatPpm:0,lineage:[],heated:false,peat:false,dry:0,stable:0});
  playFx('fxBubblesDrop');
}
function transferWashToStill(vatIndex, stillIndex){
  const v=state.vats[vatIndex], s=state.stills[stillIndex];
  if(!v || !s || v.volume<=0 || v.ferment<FERMENT_OPTIMAL_START || v.rotten) return;
  const sourceL=vatLitres(v), oldInputL=stillInLitres(s), availableL=STILL_INPUT_LITRES-oldInputL;
  const moveL=Math.min(sourceL, availableL); if(moveL<=0) return;
  const moveVatPct=moveL/VAT_WASH_LITRES*100;
  const addStillPct=moveL/STILL_INPUT_LITRES*100;
  const q=vatDisplayQuality(v);
  s.inputQuality=weightedQuality(oldInputL, s.inputQuality, moveL, q);
  s.inputPeatPpm=weightedValue(oldInputL, s.inputPeatPpm, moveL, v.peatPpm || 0);
  s.inputLineage=mergeLineage(s.inputLineage||[], v.lineage||[], [{stage:'fermentacion', q, ferment:v.ferment, litres:moveL}]);
  s.input += addStillPct; s.inputAbv=weightedValue(oldInputL, s.inputAbv, moveL, vatAbv(v)); s.runs=0;
  v.volume -= moveVatPct;
  playFx('fxBubblesDrop');
  if(v.volume<1) clearVat(v);
}
function redistill(fromIndex, toIndex){
  const from=state.stills[fromIndex], to=state.stills[toIndex];
  if(!from || !to || from.output<=0) return;
  if((from.outputRuns || 0) >= 3){ notice('Ya está en tercera destilación. Puedes embotellar/envejecer ese destilado; no hace falta una cuarta pasada.'); return; }
  const fromL=stillOutLitres(from);
  const availableInputL=(100-to.input)/100*STILL_INPUT_LITRES;
  const moveL=Math.min(fromL, availableInputL); if(moveL<=0) return;
  const toOldL=to.input/100*STILL_INPUT_LITRES;
  const toAddPct=moveL/STILL_INPUT_LITRES*100;
  const fromSubPct=moveL/STILL_OUTPUT_LITRES*100;
  to.inputQuality=weightedQuality(toOldL, to.inputQuality, moveL, qualityOrDefault(from.outputQuality));
  to.inputPeatPpm=weightedValue(toOldL, to.inputPeatPpm, moveL, from.outputPeatPpm || 0);
  to.inputLineage=mergeLineage(to.inputLineage||[], from.outputLineage||[], [{stage:'redestilacion_entrada', from:fromIndex, litres:moveL}]);
  to.inputAbv=weightedValue(toOldL, to.inputAbv, moveL, from.outputAbv || 0);
  to.input += toAddPct; to.runs=from.outputRuns;
  playFx('fxBubblesDrop');
  from.output -= fromSubPct;
  if(from.output<.1) clearStillOutput(from);
}
function firstEmptyBarrel(){ return state.barrels.find(b=>(b.volume||0)<=0); }
function makeBarrel(stillIndex,e,data){
  const b=firstEmptyBarrel();
  if(!b) return;
  if(e) Object.assign(b, localDropPoint($('#aging'), e, data));
  addSpiritToBarrel(stillIndex, b.id);
}
function addSpiritToBarrel(stillIndex, id){
  const s=state.stills[stillIndex], b=state.barrels.find(x=>x.id===id);
  if(!s || !b || s.output<=0) return;
  if(s.outputAbv<40){ notice('El destilado tiene menos de 40° ABV. Mínimo debe tener 40°; haz una nueva destilación antes de meterlo en barrica.'); return; }
  if(s.outputRuns<2){ notice('Este destilado necesita una nueva destilación antes de pasar a barrica.'); return; }
  const oldLitres=barrelLiquidL(b), availableL=barrelCapacityL(b)-oldLitres;
  if(availableL<=0) return;
  const sourceL=stillOutLitres(s);
  const targetAbv=Math.min(s.outputAbv,CASK_FILL_ABV);
  const dilutedL=s.outputAbv>CASK_FILL_ABV ? sourceL * s.outputAbv / targetAbv : sourceL;
  const addL=Math.min(dilutedL, availableL);
  if(addL<=0) return;
  const oldVol=b.volume||0;
  const barrelFactor=(b.barrelQuality || 100)/100;
  const incomingQ=qualityOrDefault(s.outputQuality)*barrelFactor;
  const batchId=uuid();
  const batchComponent={id:batchId, label:liquidLabel(`${s.outputRuns || 1}º dest.`, s.outputLineage), color:liquidColor(batchId), litres:addL, abv:targetAbv, quality:incomingQ, peatPpm:s.outputPeatPpm || 0, age:0};
  b.age = oldLitres>0 ? Math.min(b.age || 0, 0) : 0;
  b.quality = weightedQuality(oldLitres, b.quality, addL, incomingQ);
  b.peatPpm = weightedValue(oldLitres, b.peatPpm, addL, s.outputPeatPpm || 0);
  b.abv = weightedValue(oldLitres, b.abv, addL, targetAbv);
  b.components = mergeComponents(normalizeComponents(b, oldLitres), [batchComponent]);
  b.lineage = mergeLineage(b.lineage||[], s.outputLineage||[], [{stage:'barrica', batchId, barrelType:b.type||'bourbon', barrelQ:b.barrelQuality||100, sourceL, dilutedL, addedL:addL, discardedL:Math.max(0,dilutedL-addL), abv:targetAbv, peat:s.outputPeatPpm||0}]);
  b.volume = barrelPctFromL(b, oldLitres + addL);
  playFx('fxBubblesDrop', .62);
  playFx('fxWoodRelease', .52);
  clearStillOutput(s);
}
function transferBarrelToBarrel(fromId,toId){
  const from=state.barrels.find(x=>x.id===fromId), to=state.barrels.find(x=>x.id===toId);
  if(!from || !to || from===to || (from.volume||0)<=0) return;
  const fromL=barrelLiquidL(from), toL=barrelLiquidL(to), availableL=barrelCapacityL(to)-toL;
  const moveL=Math.min(fromL, availableL); if(moveL<=0) return;
  const barrelFactor=(to.barrelQuality||100)/100;
  const movedComponents=splitComponents(from, fromL, moveL).map(c=>({...c, quality:qualityOrDefault(c.quality)*barrelFactor}));
  to.quality=weightedQuality(toL, to.quality, moveL, (from.quality||100)*barrelFactor);
  to.peatPpm=weightedValue(toL, to.peatPpm, moveL, from.peatPpm||0);
  to.abv=weightedValue(toL, to.abv, moveL, from.abv||0);
  to.age=toL>0 ? Math.min(to.age||0, from.age||0) : (from.age||0);
  to.components=mergeComponents(normalizeComponents(to, toL), movedComponents);
  to.lineage=mergeLineage(to.lineage||[], from.lineage||[], [{stage:'trasiego_barril', from:from.type||'bourbon', to:to.type||'bourbon', litres:moveL}]);
  to.volume=barrelPctFromL(to, toL+moveL);
  from.volume=barrelPctFromL(from, fromL-moveL);
  if(from.volume<.1) Object.assign(from,{volume:0,age:0,abv:0,quality:100,peatPpm:0,components:[],lineage:[]});
}
function moveBarrel(id,e,data){
  const b=state.barrels.find(x=>x.id===id); if(!b || !e) return;
  Object.assign(b, localDropPoint($('#aging'), e, data));
}
function discardBarrel(id){
  const i=state.barrels.findIndex(b=>b.id===id); if(i<0) return;
  const b=state.barrels[i];
  if((b.barrelQuality||100)>=90){ notice('Sólo se descartan aquí barriles antiguos con Q menor de 90.'); return; }
  if(confirm('¿Descartar este pack de barriles antiguos? Se perderá también cualquier líquido que contenga.')){ state.barrels.splice(i,1); markDirty(); render(); saveGame(); }
}
function bottleOptions(abv){
  const max=Math.floor(abv||0);
  const base=[40,43,45].filter(x=>x<=max);
  for(let x=46;x<=max;x++) base.push(x);
  return [...new Set(base)];
}
function bottleBarrel(id,e,data){
  const b=state.barrels.find(x=>x.id===id); if(!b || (b.volume||0)<=0) return;
  if(b.abv < 40){ notice('Para embotellar whisky legalmente debe tener al menos 40° ABV.'); return; }
  if(b.age < 3){ notice('Aún no puede embotellarse como whisky escocés auténtico: necesita al menos 3 años de envejecimiento.'); return; }
  const p=e ? localDropPoint($('#bottling'), e, data) : {x:18+state.boxes.length*95,y:20};
  openBottleDialog(b,p);
}
function openBottleDialog(b,p){
  const opts=bottleOptions(b.abv); if(!opts.length) return;
  const old=$('#bottleModal'); old?.remove();
  const modal=document.createElement('div'); modal.id='bottleModal'; modal.className='bottle-modal';
  modal.innerHTML=`<div class="bottle-card-modal"><h3>Embotellar</h3><p>Elige grado ABS final</p><input id="bottleAbvRange" type="range" min="0" max="${opts.length-1}" step="1" value="${opts.length-1}"><strong id="bottleAbvLabel"></strong><div><button id="bottleOk" class="pixel-btn small" type="button">Embotellar</button><button id="bottleCancel" class="pixel-btn small danger" type="button">Cancelar</button></div></div>`;
  document.body.appendChild(modal);
  const input=$('#bottleAbvRange'), label=$('#bottleAbvLabel');
  const update=()=>{ const abv=opts[+input.value]; label.textContent=abv>=46 ? `${abv}° cask strength` : `${abv}°`; };
  input.oninput=update; update();
  $('#bottleCancel').onclick=()=>modal.remove();
  $('#bottleOk').onclick=()=>{ finishBottleBarrel(b.id, opts[+input.value], p); modal.remove(); markDirty(); render(); saveGame(); };
}
function finishBottleBarrel(id,targetAbv,p={x:18+state.boxes.length*95,y:20}){
  const b=state.barrels.find(x=>x.id===id); if(!b || (b.volume||0)<=0 || b.age<3 || targetAbv<40 || targetAbv>b.abv) return;
  const liquidL = barrelLiquidL(b);
  const finalLitres = liquidL * (b.abv || targetAbv) / targetAbv;
  const bottles=Math.floor(finalLitres / BOTTLE_LITRES);
  if(bottles<=0) return;
  const age=Math.floor(b.age || 0);
  const bottleComponents=normalizeComponents(b, liquidL).map(c=>({...c, litres:c.litres * (finalLitres/liquidL), abv:targetAbv, age}));
  state.boxes.push({id:uuid(), bottles, age, abv:targetAbv, quality:b.quality || 100, peatPpm:b.peatPpm||0, components:bottleComponents, lineage:mergeLineage(b.lineage||[], [{stage:'embotellado', abv:targetAbv, liquidL, finalLitres, bottles, peat:b.peatPpm||0}]), x:p.x, y:p.y});
  playFx('fxNewBottles', .82);
  state.bottles += bottles;
  b.barrelQuality=Math.max(0,(b.barrelQuality||100)-1);
  Object.assign(b,{volume:0,age:0,abv:0,quality:100,peatPpm:0,components:[],lineage:[]});
}
function moveBox(id,e,data){
  const b=state.boxes.find(x=>x.id===id); if(!b || !e) return;
  Object.assign(b, localDropPoint($('#bottling'), e, data));
}
function sellBox(id){
  const i=state.boxes.findIndex(b=>b.id===id); if(i<0) return;
  const b=state.boxes.splice(i,1)[0];
  const euros=b.bottles * Math.max(.1,b.age) * state.market * ((b.quality || 100)/100);
  state.coins += euros/1000; state.bottles -= b.bottles;
  playFx('fxCashRegister', .78);
}


function render(){
  if(dragging || pointerActive){ renderPending = true; return; }
  renderPending = false;
  $('.name-field').classList.toggle('editing', nameEditing);
  $('#distilleryNameView').textContent = state.distilleryName;
  $('#distilleryName').value = state.distilleryName;
  $('#coins').textContent = `${state.coins.toFixed(0)} k€`;
  $('#seeds').textContent = `${state.seeds.toFixed(0)} Kg`;
  $('#bottles').textContent = `${state.bottles}`;
  $('#market').textContent = `${state.market.toFixed(2)} €`;
  $('#resources').dataset.tip = `Recursos: 🪙 Monedas ${state.coins.toFixed(0)} k€ · 🌾 Semillas ${state.seeds.toFixed(0)} Kg (${SEED_KG_PER_PLOT} Kg/parcela) · 🍾 Botellas ${state.bottles} · 📈 Mercado ${state.market.toFixed(2)} € x botella x años`;
  $('#market').closest('.stat, .market')?.setAttribute('data-tip', `Precio de mercado: ${state.market.toFixed(2)} € x botella x años.\nLa calidad multiplica el precio: Q90 = x0.90.\n${marketSparklineHtml()}`);
  $('#speedSlider').value = state.speedStep;
  $('#speedLabel').textContent = speedLabel();
  $('#seedInventory').classList.toggle('disabled', state.seeds < SEED_KG_PER_PLOT);
  $('#game').classList.toggle('debug-zones', !!state.debugQuality);
  $('#toggleDebugView').classList.toggle('on', !!state.debugQuality);
  refreshAudioToggles();
  renderField(); renderMalt(); renderVats(); renderStills(); renderCards();
  updateLoopFx();
}

function simulate(timeStep=1, speed=speedMultiplier()){
  const sp = Math.max(0, speed) * Math.max(0, timeStep);
  if(sp<=0) return;
  updateMarketTrend(Date.now());
  state.marketPhase += 0.018 * sp;
  state.market = clamp(3.5 + Math.sin(state.marketPhase)*1.05 + Math.sin(state.marketPhase*2.7)*0.38 + (state.marketTrend || 0) + (Math.random()-.5)*0.08, 2, 5);
  recordMarketSample(Date.now());
  for(const t of state.field){
    if(t.status==='planted'){
      t.moisture=clamp(t.moisture-.06*sp,0,FIELD_WATER_CAP);
      if(t.moisture>8 && t.growth < FIELD_FULL_GROWTH) t.growth = clamp(t.growth + 0.0375*sp*(0.55+t.moisture/FIELD_WATER_CAP), 0, FIELD_FULL_GROWTH);
      t.dry = t.moisture<=4 ? (t.dry || 0) + sp : 0;
      t.overdue = t.growth>=FIELD_FULL_GROWTH ? (t.overdue || 0) + sp : 0;
      if(t.dry>FIELD_DRY_SECONDS*10 || t.overdue>FIELD_OVERDUE_SECONDS*10) t.status='dry';
    }
  }
  for(const t of state.malt){
    if(t.status==='filled'){
      if(t.heated){
        t.moisture=0; t.stable=(t.stable || 0)+sp;
        if(t.stable>MALT_KILNED_GRACE) t.status='rotten';
      } else {
        t.moisture=clamp(t.moisture-.06*sp,0,100);
        if(t.moisture>8) t.germ += 0.22*sp*(t.moisture/62);
        t.dry = (t.germ>0 && t.moisture<=4) ? (t.dry || 0) + sp : 0;
        if(t.germ>100 || t.dry>MALT_DRY_SECONDS*14) t.status='rotten';
      }
    }
  }
  for(const v of state.vats){
    if(v.volume>0 && !v.rotten){
      v.idle += sp;
      if(v.yeast){ v.ferment=clamp(v.ferment+0.18*sp,0,100); v.abv=vatAbv(v); v.quality=vatDisplayQuality(v); }
      if(!v.yeast && !v.warned && v.idle>FERMENT_IDLE_ROT/2){ v.warned=true; playFx('fxWarning', .68); }
      if(!v.yeast && v.idle>FERMENT_IDLE_ROT) v.rotten=true;
      if(v.ferment>FERMENT_ROTTEN_AT) v.rotten=true;
    }
  }
  for(const s of state.stills){
    s.temp = clamp(s.temp + (s.fire ? .42*sp : -.22*sp), TEMP_MIN, TEMP_MAX);
    if(s.input>0 && s.temp>=ALCOHOL_BOIL){
      const waterRange = s.temp>=WATER_BOIL;
      const run=s.runs+1;
      if(run > 3) continue;
      const target=DISTILLATION_TARGETS[Math.min(run,3)] || DISTILLATION_TARGETS[3];
      const waterFactor=waterRange ? clamp((s.temp-WATER_BOIL)/(TEMP_MAX-WATER_BOIL),0,1) : 0;
      const outAbv=clamp(target.abv*(1-waterFactor*.55),8,target.abv);
      const recovery=target.recovery*(1-waterFactor*.15);
      const inputL=stillInLitres(s), availableOutL=STILL_OUTPUT_LITRES-stillOutLitres(s);
      const requestedTakeL=Math.min(inputL,(waterRange ? DISTILL_WATER_TAKE_L_PER_TICK : DISTILL_TAKE_L_PER_TICK)*sp);
      const lpaPerInputL=(s.inputAbv||0)/100*recovery;
      if(lpaPerInputL<=0 || availableOutL<=0) continue;
      const maxInputByOutput=availableOutL*(outAbv/100)/lpaPerInputL;
      const actualTakeL=Math.min(requestedTakeL,maxInputByOutput,inputL);
      if(actualTakeL<=0) continue;
      const recoveredLpa=actualTakeL*lpaPerInputL;
      const outLitres=recoveredLpa/(outAbv/100);
      const inputPct=actualTakeL/STILL_INPUT_LITRES*100;
      const outVolume=outLitres/STILL_OUTPUT_LITRES*100;
      if(outVolume<=0) continue;
      const prevOut=s.output, inputQuality=qualityOrDefault(s.inputQuality);
      s.input-=inputPct; s.output+=outVolume;
      s.outputRuns=Math.max(s.outputRuns,run);
      s.outputAbv=prevOut>0 ? ((s.outputAbv*prevOut)+(outAbv*outVolume))/(prevOut+outVolume) : outAbv;
      const outQuality=inputQuality*(1-waterFactor*.45);
      s.outputQuality=prevOut>0 ? (((s.outputQuality||100)*prevOut)+(outQuality*outVolume))/(prevOut+outVolume) : outQuality;
      s.outputPeatPpm=prevOut>0 ? weightedValue(prevOut, s.outputPeatPpm, outVolume, s.inputPeatPpm) : (s.inputPeatPpm || 0);
      s.outputLineage=mergeLineage(s.outputLineage, s.inputLineage, [{stage:'destilado', run, kind:target.label, abv:outAbv, inputLitres:actualTakeL, litres:outLitres, lpa:recoveredLpa, recovery, q:outQuality}]);
      s.inputAbv=s.input>0?s.inputAbv:0;
      if(s.input<=0){ s.runs=0; s.inputQuality=100; s.inputPeatPpm=0; s.inputLineage=[]; }
    }
  }
  for(const b of state.barrels){ if((b.volume||0)>0){ const old=Math.floor(b.age); b.age += sp/1800; if(Math.floor(b.age)>old){ b.volume*=.95; scaleComponents(b,.95); } } }
  markDirty(); render();
}

let lastTickAt = Date.now();
let backgroundSince = null;
let backgroundSimulatedMs = 0;
function isForegroundSim(){ return document.visibilityState === 'visible' && document.hasFocus(); }
function startBackgroundSim(now=Date.now()){ if(backgroundSince===null){ backgroundSince=now; backgroundSimulatedMs=0; } }
function finishBackgroundSim(now=Date.now()){
  if(backgroundSince!==null){
    const target=Math.min(now-backgroundSince, BACKGROUND_SIM_CAP_MS);
    const missing=clamp(target-backgroundSimulatedMs,0,BACKGROUND_SIM_CAP_MS);
    if(missing>0) simulate(missing/TICK_MS, 1);
  }
  backgroundSince=null; backgroundSimulatedMs=0; lastTickAt=now; setSpeedStep(0);
}
function tick(){
  const now=Date.now();
  const elapsed=Math.max(0, now-lastTickAt);
  lastTickAt=now;
  if(isForegroundSim()){
    if(backgroundSince!==null) finishBackgroundSim(now);
    simulate(Math.min(elapsed, MAX_TICK_CATCHUP_MS)/TICK_MS);
    return;
  }
  startBackgroundSim(now-elapsed);
  const target=Math.min(now-backgroundSince, BACKGROUND_SIM_CAP_MS);
  const allowed=clamp(target-backgroundSimulatedMs,0,BACKGROUND_SIM_CAP_MS);
  if(allowed<=0){ if(saveDirty) saveGame(); return; }
  const simMs=Math.min(elapsed, allowed);
  backgroundSimulatedMs += simMs;
  simulate(simMs/TICK_MS, 1);
}

function waterField(tile){
  const t=state.field[+tile.dataset.i];
  if(t?.status==='planted'){
    t.moisture=FIELD_WATER_CAP; t.dry=0;
    playFx('fxWater', .62);
    markDirty(); render();
  }
}
function waterMalt(tile, amount=100){
  const t=state.malt[+tile.dataset.i];
  if(t?.status==='filled' && t.status!=='rotten' && !t.heated){
    t.moisture=100; t.dry=0;
    playFx('fxWater', .62);
    markDirty(); render();
  }
}
function heatMalt(i){
  const t=state.malt[+i];
  if(!t || t.status!=='filled' || t.heated || t.status==='rotten' || t.germ<MALT_HARVEST_START) return;
  t.peat = !!t.peat;
  t.peatPpm = t.peat ? TURBA_MAX_PPM : 0;
  t.heated = true; t.moisture = 0; t.stable = 0;
  t.quality = maltQuality(t);
  t.lineage = mergeLineage(t.lineage||[], [{stage:'secado_malta', q:t.quality, peat:t.peatPpm||0, germ:t.germ}]);
  playFx('fxFlameShort', .72);
  markDirty(); render(); saveGame();
}

function dragDataFrom(el){
  const type = el.dataset.drag;
  if(type==='seed' && state.seeds < SEED_KG_PER_PLOT) return null;
  return {...el.dataset, label: el.dataset.label || el.textContent.trim() || type};
}
function makeGhost(data, source){
  const ghost = document.createElement('div');
  ghost.className = `drag-ghost token ${data.drag}-token`;
  if(data.drag==='crop') ghost.innerHTML = `<img class="plant-img" src="${MALT_IMAGES.wet}" alt="grano para maltear">`;
  else if(data.drag==='malt') ghost.innerHTML = `<img class="plant-img" src="${MALT_IMAGES.heated}" alt="malta">`;
  else if(data.drag==='wash') ghost.textContent = 'mosto';
  else if(data.drag==='spirit') ghost.textContent = 'dest.';
  else { const clone=source.cloneNode(true); clone.classList.add('drag-ghost'); return clone; }
  return ghost;
}
function startDrag(e, source){
  if(e.button !== undefined && e.button !== 0) return;
  const data = dragDataFrom(source);
  if(!data) return;
  e.preventDefault();
  source.setPointerCapture?.(e.pointerId);
  const rect = source.getBoundingClientRect();
  data.offsetX = (e.clientX - rect.left) / scaleNow();
  data.offsetY = (e.clientY - rect.top) / scaleNow();
  if(data.drag==='barrel' || data.drag==='box') playFx('fxWoodGrab', .58);
  markDropHints(data);
  const ghost = makeGhost(data, source);
  if(source.classList.contains('card')){ ghost.style.width=`${rect.width}px`; ghost.style.height=`${rect.height}px`; }
  document.body.appendChild(ghost);
  dragging = {data, ghost, pointerId:e.pointerId, source, lastTarget:null, x:e.clientX, y:e.clientY, moved:false, card:source.classList.contains('card')};
  moveGhost(e.clientX, e.clientY);
}
function moveGhost(x,y){ if(!dragging) return; if(dragging.card){ dragging.ghost.style.transform='none'; dragging.ghost.style.left=`${x - dragging.data.offsetX*scaleNow()}px`; dragging.ghost.style.top=`${y - dragging.data.offsetY*scaleNow()}px`; } else { dragging.ghost.style.left=`${x}px`; dragging.ghost.style.top=`${y}px`; } }
function clearHover(){ dragging?.lastTarget?.classList.remove('hover'); if(dragging) dragging.lastTarget=null; }
function updateDropHover(e){
  if(!dragging) return;
  dragging.ghost.style.display='none';
  const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('.drop-target');
  dragging.ghost.style.display='';
  if(target!==dragging.lastTarget){ clearHover(); if(target){ target.classList.add('hover'); dragging.lastTarget=target; } }
}
function endDrag(e){
  if(!dragging) return;
  dragging.ghost.style.display='none';
  const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('.drop-target');
  dragging.ghost.style.display='';
  const {data, source, moved} = dragging;
  clearHover(); clearHints(); dragging.ghost.remove(); dragging=null;
  if(moved && (data.drag==='barrel' || data.drag==='box')) playFx('fxWoodRelease', .58);
  if(!moved && source?.closest?.('.field-tile')){ waterField(source.closest('.field-tile')); return; }
  if(moved){ suppressNextClick = true; clearTimeout(suppressClickTimer); suppressClickTimer = setTimeout(()=>{ suppressNextClick=false; }, 350); }
  if(target){ handleDrop(target, data, e); markDirty(); render(); }
}

document.addEventListener('pointerdown', e=>{ pointerActive = true; }, true);
document.addEventListener('pointerup', () => setTimeout(()=>{ pointerActive = false; if(renderPending) render(); }, 0), true);
document.addEventListener('pointercancel', () => setTimeout(()=>{ pointerActive = false; if(renderPending) render(); }, 0), true);

document.addEventListener('pointerdown', e=>{
  if(e.target.closest('button, input, label')) return;
  const dragSource = e.target.closest('[data-drag]');
  if(dragSource) return startDrag(e, dragSource);
  const maltTile = e.target.closest('.malt-tile');
  if(maltTile) return waterMalt(maltTile, 100);
});
document.addEventListener('pointermove', e=>{
  if(!dragging) return;
  if(Math.hypot(e.clientX-dragging.x, e.clientY-dragging.y)>10) dragging.moved=true;
  moveGhost(e.clientX,e.clientY); updateDropHover(e);
});
document.addEventListener('pointerup', endDrag);
document.addEventListener('pointercancel', endDrag);
document.addEventListener('click', e=>{
  if(suppressNextClick){ suppressNextClick=false; clearTimeout(suppressClickTimer); e.preventDefault(); e.stopPropagation(); return; }
  if(e.target.closest('.clean, button, input')) return;
  const fieldTile=e.target.closest('.field-tile');
  if(fieldTile){
    const t=state.field[+fieldTile.dataset.i];
    if(t?.status==='dry' || t?.status==='rotten'){ Object.assign(t,{status:'empty',growth:0,moisture:0,dry:0,overdue:0,quality:100}); playFx('fxDropGrain'); markDirty(); render(); saveGame(); return; }
    if(t?.status==='empty' && state.seeds>=SEED_KG_PER_PLOT){ state.seeds-=SEED_KG_PER_PLOT; Object.assign(t,{status:'planted', growth:0, moisture:0, dry:0, overdue:0, quality:100}); playFx('fxDropGrain'); markDirty(); render(); }
    else waterField(fieldTile);
  }
  const maltTile=e.target.closest('.malt-tile');
  if(maltTile){ const t=state.malt[+maltTile.dataset.i]; if(t?.status==='rotten'){ Object.assign(t,{status:'empty',amount:0,germ:0,moisture:0,quality:100,peatPpm:0,lineage:[],heated:false,peat:false,dry:0,stable:0}); playFx('fxDropGrain'); markDirty(); render(); saveGame(); return; } }
  const vat=e.target.closest('.vat-unit');
  if(vat){ const v=state.vats[+vat.dataset.i]; if(v?.rotten){ clearVat(v); markDirty(); render(); } }
});
document.addEventListener('click', e=>{
  const cleanVat=e.target.closest('.clean-vat-btn'); if(cleanVat){ e.preventDefault(); e.stopPropagation(); const v=state.vats[+cleanVat.dataset.i]; if(v?.rotten){ clearVat(v); markDirty(); render(); saveGame(); } return; }
  const peatIcon=e.target.closest('.peat-icon'); if(peatIcon){ e.preventDefault(); e.stopPropagation(); const t=state.malt[+peatIcon.dataset.i]; if(t && t.status==='filled' && !t.heated){ t.peat=!t.peat; markDirty(); render(); } return; }
  const heat=e.target.closest('.heat-tile'); if(heat) heatMalt(heat.dataset.i);
  const yeast=e.target.closest('.yeast-btn'); if(yeast){ const v=state.vats[+yeast.dataset.i]; if(v?.volume>0 && !v.rotten){ v.yeast=true; v.warned=false; v.idle=0; markDirty(); render(); } }
  const fire=e.target.closest('.fire-btn'); if(fire){ const s=state.stills[+fire.dataset.i]; if(s){ s.fire=!s.fire; markDirty(); render(); } }
  const empty=e.target.closest('.empty-still-btn'); if(empty){ const s=state.stills[+empty.dataset.i]; if(s && (!s.input || confirm('¿Vaciar la entrada izquierda del alambique?'))){ clearStillInput(s); markDirty(); render(); } }
});

function debugFill(){
  state.coins = rnd(80,180); state.seeds = Math.floor(rnd(20,80));
  for(const t of state.field){
    const r=Math.random();
    if(r<.15) Object.assign(t,{status:'empty', growth:0, moisture:0, dry:0, overdue:0, quality:100});
    else if(r<.28) Object.assign(t,{status:'dry', growth:100, moisture:0, dry:80, overdue:80, quality:90});
    else Object.assign(t,{status:'planted', growth:rnd(12,100), moisture:rnd(8,FIELD_WATER_CAP), dry:0, overdue:0, quality:100});
  }
  for(const t of state.malt){
    const heated=Math.random()<.5;
    const germ=heated ? rnd(MALT_HARVEST_START,96) : rnd(0,96);
    const peat=heated && Math.random()<.5;
    const q=heated?maltQuality({germ}):(germ>=MALT_HARVEST_START?maltQuality({germ}):100);
    Object.assign(t,{status:'filled', amount:rnd(MALT_TILE_CAPACITY_KG*.35,MALT_TILE_CAPACITY_KG), germ, moisture:heated?0:rnd(12,78), quality:q, heated, peat, peatPpm:peat?TURBA_MAX_PPM:0, lineage:[{stage:'debug_malta', q, germ}], dry:0, stable:0});
  }
  state.vats = Array.from({length:VAT_COUNT}, (_,i)=>newVat(i===0));
  state.vats[0] = {unlocked:true, capacityPct:ROOM_CAPACITY.vatPct, volume:rnd(35,92), ferment:rnd(FERMENT_OPTIMAL_START,FERMENT_OPTIMAL_END), yeast:true, idle:0, rotten:false, baseQuality:95, quality:95, peatPpm:Math.random()<.4?rnd(0,60):0, lineage:[{stage:'debug_vat'}], abv:0};
  state.vats[0].abv = vatAbv(state.vats[0]);
  if(Math.random()<.55){
    const v={unlocked:true, capacityPct:ROOM_CAPACITY.vatPct, volume:rnd(20,80), ferment:rnd(FERMENT_OPTIMAL_START,FERMENT_ROTTEN_AT-1), yeast:true, idle:0, rotten:false, baseQuality:rnd(82,98), quality:95, peatPpm:Math.random()<.4?rnd(0,60):0, lineage:[{stage:'debug_vat_extra'}], abv:0};
    v.quality = vatDisplayQuality(v); v.abv = vatAbv(v); state.vats[1]=v;
  }
  state.stills = Array.from({length:STILL_COUNT}, (_,i)=>newStill(i===0));
  state.stills[0] = {input:rnd(10,75), inputAbv:WASH_ABV_TARGET, inputQuality:95, inputPeatPpm:Math.random()<.4?rnd(0,60):0, inputLineage:[{stage:'debug_input'}], runs:0, output:rnd(42,88), outputAbv:rnd(45,68), outputQuality:94, outputPeatPpm:Math.random()<.4?rnd(0,60):0, outputLineage:[{stage:'debug_output'}], outputRuns:2, temp:rnd(78,104), fire:Math.random()<.5};
  if(Math.random()<.55){
    state.stills[1] = {input:rnd(8,64), inputAbv:rnd(6,25), inputQuality:rnd(78,96), inputPeatPpm:Math.random()<.4?rnd(0,60):0, inputLineage:[{stage:'debug_input_extra'}], runs:Math.random()<.5?0:1, output:rnd(0,55), outputAbv:rnd(35,72), outputQuality:rnd(78,96), outputPeatPpm:Math.random()<.4?rnd(0,60):0, outputLineage:[{stage:'debug_output_extra'}], outputRuns:Math.random()<.5?1:2, temp:rnd(50,106), fire:Math.random()<.5};
  }
  state.barrels = [newBarrel('bourbon',24,56), newBarrel('sherry',210,56)];
  Object.assign(state.barrels[0], {volume:rnd(35,88), age:rnd(3.2,8), abv:rnd(45,68), quality:rnd(82,100), peatPpm:Math.random()<.4?rnd(0,60):0, lineage:[{stage:'debug_barrel'}]});
  state.barrels[0].components=normalizeComponents(state.barrels[0], barrelLiquidL(state.barrels[0]), 'Debug Bourbon');
  const bottles=Math.floor(rnd(300,900));
  state.boxes = [{id:uuid(), bottles, age:rnd(3,12), abv:rnd(40,55), quality:rnd(82,100), peatPpm:Math.random()<.4?rnd(0,60):0, lineage:[{stage:'debug_box'}], x:rnd(18,160), y:rnd(20,80)}];
  state.bottles = bottles;
  markDirty(); render(); saveGame();
}


document.addEventListener('click', e=>{ const buy=e.target.closest('.barrel-buy'); if(buy){ e.preventDefault(); buyBarrel(buy.dataset.type); } const eq=e.target.closest('.equipment-buy'); if(eq){ e.preventDefault(); buyEquipment(eq.dataset.equipment); } });
$('#buySeeds').onclick=()=>{ if(state.coins>=SEED_PACK_COST){ state.coins-=SEED_PACK_COST; state.seeds+=SEED_PACK_KG; playFx('fxCashRegister', .72); markDirty(); render(); }};
$('#distilleryName').addEventListener('input', e=>{ state.distilleryName=e.target.value || 'Miarma Distillery'; markDirty(); });
$('#editName').onclick=()=>{ nameEditing=true; render(); $('#distilleryName').focus(); $('#distilleryName').select(); };
function acceptName(){ nameEditing=false; state.distilleryName=$('#distilleryName').value.trim() || 'Miarma Distillery'; markDirty(); render(); saveGame(); }
$('#acceptName').onclick=acceptName;
$('#distilleryName').addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); acceptName(); }});
document.addEventListener('keydown', e=>{
  const editing = e.target.closest('input, textarea, select') || nameEditing;
  if(e.key==='Escape'){ e.preventDefault(); $('#hud').classList.toggle('collapsed'); return; }
  if(editing || e.ctrlKey || e.metaKey || e.altKey) return;
  if(e.key==='º'){ e.preventDefault(); setSpeedStep((state.speedStep||0)-1); render(); return; }
  if(e.key==='1'){ e.preventDefault(); setSpeedStep(0); render(); return; }
  if(e.key==='2'){ e.preventDefault(); setSpeedStep((state.speedStep||0)+1); render(); return; }
  if(e.key==='3'){ e.preventDefault(); setSpeedStep(9); render(); }
});
$('#speedSlider').addEventListener('input', e=>{ setSpeedStep(Number(e.target.value)); });
$('#speedReset').onclick=()=>{ setSpeedStep(0); render(); };
$('#speedSlider').addEventListener('wheel', e=>{ e.preventDefault(); setSpeedStep(Number(state.speedStep||0)+(e.deltaY<0?1:-1)); }, {passive:false});
$('#debugFill').onclick=debugFill;
$('#toggleDebugView').onclick=()=>{ state.debugQuality=!state.debugQuality; $('#toggleDebugView').classList.toggle('on', state.debugQuality); markDirty(); render(); };
$('#toggleMusic').onclick=()=>{ setMusicEnabled(state.musicEnabled === false); saveGame(); };
$('#toggleFx').onclick=()=>{ state.fxEnabled = state.fxEnabled === false; refreshAudioToggles(); markDirty(); saveGame(); };
$('#hudIcon').onclick=()=>{ $('#hud').classList.toggle('collapsed'); };
$('#helpButton').onclick=()=>$('#helpModal').classList.remove('hidden');
$('#helpModal').onclick=()=>$('#helpModal').classList.add('hidden');
$('#magnitudesButton').onclick=()=>$('#magnitudesModal').classList.remove('hidden');
$('#magnitudesModal').onclick=()=>$('#magnitudesModal').classList.add('hidden');
$('#resetGame').onclick=()=>{
  if(confirm('¿Reiniciar la partida y borrar el guardado local de Miarma Distillery?')){
    localStorage.removeItem(STORAGE_KEY); state=defaultState(); markDirty(); render(); saveGame(); showSplash();
  }
};

const tip=$('#tooltip');
document.body.appendChild(tip);
document.addEventListener('pointermove', e=>{
  const padX=10, padY=6;
  const w=tip.offsetWidth || 260, h=tip.offsetHeight || 50;
  let left = e.clientX + padX, top = e.clientY + padY;
  let tx = '0', ty = '0';
  if(left + w > innerWidth){ left = e.clientX - padX; tx = '-100%'; }
  if(top + h > innerHeight){ top = e.clientY - padY; ty = '-100%'; }
  tip.style.left=`${left}px`; tip.style.top=`${top}px`; tip.style.transform=`translate(${tx}, ${ty})`;
});
document.addEventListener('pointerover', e=>{ const el=e.target.closest('[data-tip]'); if(!el) return; tip.innerHTML=tipHtml(el.dataset.tip); tip.classList.add('show'); });
document.addEventListener('pointerout', e=>{ if(e.target.closest('[data-tip]')) tip.classList.remove('show'); });
addEventListener('blur', () => startBackgroundSim());
addEventListener('focus', () => finishBackgroundSim());
document.addEventListener('visibilitychange', () => document.hidden ? startBackgroundSim() : finishBackgroundSim());

setupSplash();
loadGame();
recordMarketSample(Date.now(), true);
initTiles();
render();
setInterval(tick, TICK_MS);
setInterval(()=>{ if(saveDirty) saveGame(); }, 20000);
addEventListener('beforeunload', saveGame);
