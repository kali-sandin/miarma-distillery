const STORAGE_KEY = 'miarma-distillery-state-v3';
const SPLASH_KEY = 'sim-distillery-splash-seen-v1';
const HAMBURGER_HINT_KEY = 'miarma-hamburger-hint-seen-v1';
const HELP_HINT_KEY = 'miarma-help-hint-seen-v1';
const SCOTLAND_HINT_KEY = 'miarma-scotland-hint-seen-v1';
const FIELD_TILES = 20;
const MALT_TILES = 4;
const VAT_COUNT = 1;
const STILL_COUNT = 4;

let baseScale = 1;
let gameZoom = 1;
let stageOffsetX = 0;
let stageOffsetY = 0;
const clampStage = (n,a,b)=>Math.max(a,Math.min(b,n));
const stageScale = () => baseScale * gameZoom;
function stagePanAir(){
  if(gameZoom <= 1.01) return 0;
  return clampStage(Math.min(innerWidth, innerHeight) * .18, 72, 220);
}
function clampStageOffset(x, y){
  const scale = stageScale();
  const sw = 1920 * scale, sh = 1080 * scale;
  const minX = Math.min(0, innerWidth - sw), minY = Math.min(0, innerHeight - sh);
  const air = stagePanAir();
  return {
    x: sw <= innerWidth ? (innerWidth - sw) / 2 : clampStage(x, minX - air, air),
    y: sh <= innerHeight ? (innerHeight - sh) / 2 : clampStage(y, minY - air, air)
  };
}
function syncViewportFade(){
  const fade=document.getElementById('edgeViewportFade');
  if(!fade) return;
  const scale=stageScale() || 1;
  fade.style.left=`${-stageOffsetX / scale}px`;
  fade.style.top=`${-stageOffsetY / scale}px`;
  fade.style.width=`${innerWidth / scale}px`;
  fade.style.height=`${innerHeight / scale}px`;
  fade.style.setProperty('--fade-size', `${Math.max(48, 92 / scale)}px`);
}
function applyStageTransform(){
  const p = clampStageOffset(stageOffsetX, stageOffsetY);
  stageOffsetX = p.x; stageOffsetY = p.y;
  document.documentElement.style.setProperty('--scale', stageScale().toString());
  document.documentElement.style.setProperty('--offset-x', `${stageOffsetX}px`);
  document.documentElement.style.setProperty('--offset-y', `${stageOffsetY}px`);
  syncViewportFade();
}
const fitStage = () => {
  const oldScale = stageScale();
  const cx = innerWidth / 2, cy = innerHeight / 2;
  const worldX = (cx - stageOffsetX) / oldScale;
  const worldY = (cy - stageOffsetY) / oldScale;
  baseScale = Math.min(innerWidth / 1920, innerHeight / 1080, 1);
  const nextScale = stageScale();
  stageOffsetX = cx - worldX * nextScale;
  stageOffsetY = cy - worldY * nextScale;
  applyStageTransform();
};
function setGameZoom(nextZoom, anchorX=innerWidth/2, anchorY=innerHeight/2){
  nextZoom = Math.round(clampStage(nextZoom, 1, 3) * 100) / 100;
  if(Math.abs(nextZoom - gameZoom) < .001) return;
  const oldScale = stageScale();
  const worldX = (anchorX - stageOffsetX) / oldScale;
  const worldY = (anchorY - stageOffsetY) / oldScale;
  gameZoom = nextZoom;
  const nextScale = stageScale();
  stageOffsetX = anchorX - worldX * nextScale;
  stageOffsetY = anchorY - worldY * nextScale;
  applyStageTransform();
}
addEventListener('resize', fitStage);
addEventListener('resize', () => { const root=$('#scotlandMapOverlay.visible'); if(root) renderPlayerDistilleryOnMap(root); });
fitStage();

const hasVatContents = v => !!(v && ((v.volume||0)>0 || (v.ferment||0)>0 || v.rotten || v.yeast));
const hasStillContents = s => !!(s && ((s.input||0)>0 || (s.output||0)>0 || s.fire || (s.temp||20)>24));
const isVatActive = (v,i) => i===0 || !!v?.unlocked || hasVatContents(v);
const isStillActive = (s,i) => i===0 || !!s?.unlocked || hasStillContents(s);
const ALCOHOL_BOIL = 78.3;
const WATER_BOIL = 100;
const TEMP_MAX = 120;
const TEMP_MIN = 20;
const FIELD_WATER_CAP = 50;
const SEED_KG_PER_PLOT = 20;
const SEED_PACK_KG = 20;
const SEED_PACK_COST = 1;
const BARREL_PACK_SIZE = 10;
const EQUIPMENT_COST = 100;
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
const VAT_CAPACITY_UPGRADE_COSTS = [50, 80];
const FIELD_PLOT_AREA_HA = 0.105;
const BARLEY_YIELD_KG_PER_HA = 5500;
const FIELD_BARLEY_KG_PER_PLOT = Math.round(FIELD_PLOT_AREA_HA * BARLEY_YIELD_KG_PER_HA);
const BARLEY_TO_MALT_RATIO = 1 / 1.3;
const MALT_KG_PER_PLOT = Math.round(FIELD_BARLEY_KG_PER_PLOT * BARLEY_TO_MALT_RATIO);
const FIELD_WAREHOUSE_TILES = [14, 15, 18, 19];
const FIELD_HARVESTER_TILES = [16, 17];
const FIELD_WAREHOUSE_TILE_SET = new Set(FIELD_WAREHOUSE_TILES);
const FIELD_HARVESTER_TILE_SET = new Set(FIELD_HARVESTER_TILES);
const FIELD_WAREHOUSE_COST = 30;
const FIELD_WAREHOUSE_DUPLICATE_COST = 100;
const FIELD_WAREHOUSE_SECOND_DUPLICATE_COST = 180;
const FIELD_AUTOWATER_COST = 80;
const FIELD_AUTOHARVESTER_COST = 120;
const FIELD_WAREHOUSE_CAPACITY_KG = MALT_KG_PER_PLOT * 12;
const FIELD_WAREHOUSE_KG_PER_PLOT = MALT_KG_PER_PLOT;
const FIELD_AUTOHARVEST_QUALITY = 95;
const FIELD_PLOTS_PER_MAX_BATCH = 8;
const MALT_TILE_CAPACITY_KG = Math.round((MALT_KG_PER_PLOT * FIELD_PLOTS_PER_MAX_BATCH) / MALT_TILES / 10) * 10;
const MALT_CAPACITY_UPGRADE_COST = 80;
const MALT_CAPACITY_UPGRADE_FACTOR = 1.5;
const MALT_AUTOMALTING_COST = 150;
const AUTOMATION_QUALITY_PENALTY = 5;
const MALT_KG_PER_FULL_VAT = MALT_TILE_CAPACITY_KG * MALT_TILES;
const WASH_ABV_TARGET = 9;
const LOW_WINES_ABV_TARGET = 33.5;
const NEW_MAKE_ABV_TARGET = 70;
const THIRD_DISTILL_ABV_TARGET = 82;
const DISTILL_TAKE_L_PER_TICK = 16;
const DISTILL_WATER_TAKE_L_PER_TICK = 26;
const THERMOSTAT_COST = 150;
const THERMOSTAT_TEMP_MAX = 101;
const THERMOSTAT_AUTOMATION_COST = 200;
const THERMOSTAT_AUTOMATION_TEMP = 98;
const THERMOSTAT_AUTOMATION_QUALITY_FACTOR = .98;
const MARKET_HISTORY_SAMPLE_MS = 1000;
const MARKET_HISTORY_MAX = 90;
const MARKET_MIN = 3;
const MARKET_MAX = 5;
const MARKET_MID = (MARKET_MIN + MARKET_MAX) / 2;
const AD_CAMPAIGN_COSTS = [15, 20, 30, 50, 75, 100, 125, 150];
const AD_MARKET_STEP = .25;
const DISTILLATION_TARGETS = {
  1: { abv: LOW_WINES_ABV_TARGET, recovery: .93, label: 'low wines' },
  2: { abv: NEW_MAKE_ABV_TARGET, recovery: .948, label: 'new make' },
  3: { abv: THIRD_DISTILL_ABV_TARGET, recovery: .88, label: 'triple destilado' }
};
const ROOM_CAPACITY = { vatPct: 100, vatLitres: VAT_WASH_LITRES, stillInputL: STILL_INPUT_LITRES, stillOutputL: STILL_OUTPUT_LITRES, maltTileKg: MALT_TILE_CAPACITY_KG };
const FERMENT_IDLE_ROT = 1800;
const FERMENT_RATE_PER_TICK = .09;
const FERMENT_ROTTEN_GRACE = 600;
const TURBA_MAX_PPM = 60;
const FIELD_HARVEST_START = 50;
const FIELD_OPTIMAL_START = 70;
const FIELD_OPTIMAL_MID = 82;
const FIELD_OPTIMAL_END = 95;
const FIELD_FULL_GROWTH = 100;
const FIELD_INITIAL_MOISTURE = FIELD_WATER_CAP * .10;
const FIELD_DRY_SECONDS = 14;
const FIELD_OVERDUE_SECONDS = 10;
const MALT_HARVEST_START = 50;
const MALT_OPTIMAL_START = 68;
const MALT_OPTIMAL_MID = 79;
const MALT_OPTIMAL_END = 90;
const FERMENT_OPTIMAL_START = 65;
const FERMENT_OPTIMAL_MID = 77.5;
const FERMENT_OPTIMAL_END = 90;
const FERMENT_ROTTEN_AT = 100;
const MALT_DRY_SECONDS = 7;
const MALT_KILNED_GRACE = 4800;
const PLANT_IMAGES = { sprout: 'img/cebada_recien_plantada.png', green: 'img/cebada_joven.png', mature: 'img/cebada_madura.png', dry: 'img/cebada_seca.png' };
const MALT_IMAGES = { raw: 'img/cebada_germinando.png', wet: 'img/cebada_germinando.png', tilled: 'img/cebada_arada.png', water1: 'img/cebada_germinando_1.png', water2: 'img/cebada_germinando_2.png', bad: 'img/cebada_germinando_estropeada.png', heated: 'img/cebada_germinando_malteada.png', maltedPlain: 'img/cebada_malteada_sin.png', maltedPeat: 'img/cebada_malteada_turba.png' };
const SCOTLAND_DESTILLERY_ASSETS = Array.from({length:15}, (_,i)=>`img/mapa/dest${String(i+1).padStart(2,'0')}.png`);
const SCOTLAND_REGIONS = {
  speyside: {id:'speyside', name:'Speyside', color:'#4aafe4', mask:'img/mapa/mapa-speyside.png', desc:'Valles fértiles, ríos claros y whiskies elegantes, dulces y frutales. Aquí mandan los jereces bien puestos y la malta limpia.', example:'Macallan, Glenfiddich, Balvenie, Glenlivet, Glenfarclas, Aberlour, Cardhu, Glenrothes, Mortlach', bonus:'+⭐⭐⭐ Calidad · +🏆 Reputación · 🌾 Cebada x1.5', bonusLines:['+⭐⭐⭐ Calidad con Jerez/Port Pipe <em>(Peat < 10ppm)</em>','+🏆 Reputación con Jerez/Port Pipe <em>(Peat < 10ppm)</em>','🌾 Cebada x1.5']},
  highlands: {id:'highlands', name:'Highlands', color:'#61ff4b', mask:'img/mapa/mapa-highlands.png', desc:'La región grande y salvaje: montañas, costa, valles y estilos muy variados. Puede salir gloria líquida o un escocés opinando fuerte.', example:'Glenmorangie, Dalmore, Oban, Clynelish, Old Pulteney, Edradour, Glendronach', bonus:'🎲 Calidad aleatoria · 🎲 Reputación aleatoria', bonusLines:['🎲 hasta ⭐⭐⭐ Calidad','🎲 hasta 🏆 Reputación']},
  campbeltown: {id:'campbeltown', name:'Campbeltown', color:'#ff6e6e', mask:'img/mapa/mapa-campbeltown.png', desc:'Pequeña, marinera y con carácter aceitoso, salino y contundente. Pocas destilerías, pero mucho orgullo.', example:'Springbank, Glen Scotia, Glengyle/Kilkerran', bonus:'+🏆🏆 Reputación', bonusLines:['+🏆🏆 Reputación en mezcla Bourbon + Jerez <em>(Q > 98)</em>']},
  islay: {id:'islay', name:'Islay', color:'#ffe873', mask:'img/mapa/mapa-islay.png', desc:'Turba, humo, salitre y drama atlántico. Si quieres que el whisky abrace como una hoguera mojada, esta es tu isla.', example:'Laphroaig, Ardbeg, Lagavulin, Bowmore, Bruichladdich, Caol Ila, Bunnahabhain, Kilchoman', bonus:'30–35ppm: +⭐⭐⭐ Calidad · +🏆🏆 Reputación · 25–29/36–40ppm: +🏆 Reputación', bonusLines:['30–35ppm: +⭐⭐⭐ Calidad','30–35ppm: +🏆🏆 Reputación','25–29ppm o 36–40ppm: +🏆 Reputación']},
  lowlands: {id:'lowlands', name:'Lowlands', color:'#cf4af5', mask:'img/mapa/mapa-lowlands.png', desc:'Whiskies más ligeros, florales y limpios, con tradición de triple destilación y perfil amable.', example:'Auchentoshan, Glenkinchie, Bladnoch, Daftmill, Kingsbarns, Rosebank, Ailsa Bay', bonus:'+⭐⭐⭐ Calidad · +🏆 Reputación', bonusLines:['+⭐⭐⭐ Calidad en triple destilado <em>(Peat = 0ppm)</em>','+🏆 Reputación en triple destilado <em>(Peat = 0ppm)</em>']}
};
const SCOTLAND_REGION_ORDER = ['speyside','highlands','campbeltown','islay','lowlands'].map(id=>SCOTLAND_REGIONS[id]);
const SCOTLAND_REGION_MASK_ASSETS = SCOTLAND_REGION_ORDER.map(r=>r.mask);
const SCOTLAND_MAP_ASSETS = ['img/mapa/mapa.jpg', ...SCOTLAND_REGION_MASK_ASSETS];
const BOTTLE_ART_FILES = [
  'img/bottles/bottle_0.png',
  'img/bottles/bottle_0P.png',
  'img/bottles/bottle_0Q.png',
  'img/bottles/bottle_0_.png',
  'img/bottles/bottle_0__.png',
  'img/bottles/bottle_0b.png',
  'img/bottles/bottle_0bPQ.png',
  'img/bottles/bottle_0b_.png',
  'img/bottles/bottle_0b__.png',
  'img/bottles/bottle_0b___.png',
  'img/bottles/bottle_0b____.png',
  'img/bottles/bottle_0b_____.png',
  'img/bottles/bottle_0bq.png',
  'img/bottles/bottle_0p_.png',
  'img/bottles/bottle_0p_2.png',
  'img/bottles/bottle_0q_2.png',
  'img/bottles/bottle_10.png',
  'img/bottles/bottle_10_.png',
  'img/bottles/bottle_10p.png',
  'img/bottles/bottle_10q.png',
  'img/bottles_12.png',
  'img/bottles/bottle_12P.png',
  'img/bottles/bottle_12_.png',
  'img/bottles/bottle_12__.png',
  'img/bottles/bottle_12bQ.png',
  'img/bottles/bottle_15.png',
  'img/bottles/bottle_15Q.png',
  'img/bottles/bottle_15bPQ.png',
  'img/bottles/bottle_18.png',
  'img/bottles/bottle_18P.png',
  'img/bottles/bottle_18Q.png',
  'img/bottles/bottle_18Q_.png',
  'img/bottles/bottle_18q_2.png',
  'img/bottles/bottle_21.png',
  'img/bottles/bottle_21Q.png',
  'img/bottles/bottle_21Q_.png',
  'img/bottles/bottle_25Q.png',
  'img/bottles/bottle_25q_2.png',
  'img/bottles/bottle_30Q.png',
  'img/bottles/bottle_30Q_.png',
  'img/bottles/bottle_30q_2.png',
  'img/bottles/bottle_32q.png',
  'img/bottles/bottle_35Q.png',
  'img/bottles/bottle_35Q_.png',
  'img/bottles/bottle_40Q.png',
  'img/bottles/bottle_40q_2.png',
  'img/bottles/bottle_50Q_.png',
  'img/bottles/bottle_50q.png'
];
const parseBottleArt = path => {
  const name=String(path||'').split('/').pop() || '';
  const m=name.match(/^bottle_(\d+)([bBpPqQ]*)(.*)\.png$/);
  if(!m) return null;
  const flags=m[2] || '';
  return { path, year:Number(m[1])||0, blend:/b/.test(flags), peat:/P/.test(flags)?2:(/p/.test(flags)?1:0), quality:/Q/.test(flags)?2:(/q/.test(flags)?1:0), variant:m[3] || '' };
};
const BOTTLE_ARTS = BOTTLE_ART_FILES.map(parseBottleArt).filter(Boolean).sort((a,b)=>a.year-b.year || a.path.localeCompare(b.path));
const BOTTLE_YEARS = [...new Set(BOTTLE_ARTS.map(x=>x.year))].sort((a,b)=>a-b);
function bottleAgeBucket(age){
  const a=Math.max(0, Math.floor(Number(age)||0));
  let best=BOTTLE_YEARS[0] ?? 0;
  for(const y of BOTTLE_YEARS){ if(y<=a) best=y; else break; }
  return best;
}
function bottleTraits(lot={}){
  const comps=Array.isArray(lot.components) ? lot.components.filter(c=>(Number(c.litres)||0)>.01) : [];
  const distinct=new Set(comps.map(c=>c.id || c.label || JSON.stringify([Math.round(c.age||0), Math.round(c.peatPpm||0), Math.round(c.quality||0)])));
  const ppm=Number(lot.peatPpm)||weightedValue(0,0,1,0);
  const q=qualityOrDefault(lot.quality, 100);
  return {
    year:bottleAgeBucket(lot.age),
    blend:distinct.size>1,
    peat:ppm>20 ? 2 : (ppm>0 ? 1 : 0),
    quality:q>=95 ? 2 : (q>=90 ? 1 : 0)
  };
}
function bottleDistance(candidate, target){
  return (candidate.blend===target.blend ? 0 : 4)
    + Math.abs(candidate.peat-target.peat)*2.2
    + Math.abs(candidate.quality-target.quality)*1.6;
}
function usedBottleArtCounts(){
  const counts=new Map();
  for(const lot of [...(state.bottleHistory||[]), ...(state.boxes||[])]){
    const img=String(lot?.image||'');
    if(img.startsWith('img/bottles/bottle_')) counts.set(img, (counts.get(img)||0)+1);
  }
  return counts;
}
function chooseBottleArt(lot={}){
  if(lot.image && String(lot.image).startsWith('img/bottles/bottle_')) return lot.image;
  if(!BOTTLE_ARTS.length) return 'img/bottles_no_age.png';
  const target=bottleTraits(lot);
  const bucket=BOTTLE_ARTS.filter(x=>x.year===target.year);
  const pool=bucket.length ? bucket : BOTTLE_ARTS.filter(x=>x.year===BOTTLE_YEARS[0]);
  const scored=pool.map(x=>({...x, score:bottleDistance(x,target)})).sort((a,b)=>a.score-b.score || a.path.localeCompare(b.path));
  const bestScore=scored[0]?.score ?? 0;
  const best=scored.filter(x=>Math.abs(x.score-bestScore)<.001);
  const counts=usedBottleArtCounts();
  best.sort((a,b)=>(counts.get(a.path)||0)-(counts.get(b.path)||0) || a.path.localeCompare(b.path));
  return best[0]?.path || pool[0]?.path || 'img/bottles_no_age.png';
}
const bottleArtImg = lot => lot?.image || chooseBottleArt(lot || {});
const bottleImage = b => b.age >= 18 ? 'img/bottles_18.png' : (b.age >= 12 ? 'img/bottles_12.png' : 'img/bottles_no_age.png');
const bottleArtFallback = `this.onerror=null;this.src='img/bottles_no_age.png'`;
function boxArtKey(age){
  const a=Number(age)||0;
  // There is no caja_18 asset yet; 18y lots keep the nearest lower box art while the overlaid text still says 18a.
  if(a>=30) return '30';
  if(a>=21) return '21';
  if(a>=15) return '15';
  if(a>=12) return '12';
  if(a>=10) return '10';
  return 'nas';
}
function boxArt(lot){ const k=boxArtKey(lot?.age); return {base:`img/cajas/caja_${k}.png`, lid:`img/cajas/caja_${k}_tapa.png`, key:k}; }
function boxStackHtml(lot){
  const art=boxArt(lot), img=bottleArtImg(lot);
  return `<div class="box-art box-art-${art.key}">
    <img class="box-base" src="${art.base}" alt="caja" draggable="false">
    <img class="box-bottle box-bottle-top" src="${img}" alt="botella" draggable="false" onerror="${bottleArtFallback}">
    <img class="box-bottle box-bottle-left" src="${img}" alt="botella" draggable="false" onerror="${bottleArtFallback}">
    <img class="box-bottle box-bottle-right" src="${img}" alt="botella" draggable="false" onerror="${bottleArtFallback}">
    <img class="box-bottle box-bottle-bottom" src="${img}" alt="botella" draggable="false" onerror="${bottleArtFallback}">
    <img class="box-lid" src="${art.lid}" alt="tapa" draggable="false">
  </div>`;
}
const BARREL_TYPES = {
  ex_bourbon_barrel: { label:'Ex-Bourbon Barrel', wood:'Roble americano ex-bourbon', desc:'Barrica estándar de roble americano ex-bourbon. La base del Scotch moderno.', litres:200, cost:3, image:'img/barriles/ex_bourbon_barrel.png', oldImage:'img/barriles/ex_bourbon_barrel_old.png', bonus:'Sin penalizaciones. Barrica base, barata, fiable.' },
  ex_bourbon_hogshead: { label:'Ex-Bourbon Hogshead', wood:'Roble americano ex-bourbon reconstruido', desc:'Hogshead reconstruido desde barricas bourbon, muy común en maduración escocesa.', litres:250, cost:4, image:'img/barriles/ex_bourbon_hogshead.png', oldImage:'img/barriles/ex_bourbon_hogshead_old.png', bonus:'Sin penalizaciones. Base con más capacidad total.' },
  quarter_cask: { label:'Quarter Cask', wood:'Roble americano pequeño', desc:'Barrica pequeña de maduración acelerada. Más contacto con madera.', litres:125, cost:8, image:'img/barriles/quarter_cask.png', oldImage:'img/barriles/quarter_cask_old.png', agingFactor:1.5, bonus:'Tiempo de envejecimiento x1.5. Ideal para acelerar whisky joven.' },
  sherry_butt: { label:'Sherry Butt', wood:'Roble de Jerez', desc:'Gran barrica de Jerez, formato clásico premium.', litres:500, cost:30, image:'img/barriles/sherry_butt.png', oldImage:'img/barriles/sherry_butt_old.png', qBonus:5, repBonus:1, bonus:'+5 calidad y +1 reputación.' },
  sherry_hogshead: { label:'Sherry Hogshead', wood:'Roble de Jerez hogshead', desc:'Versión más pequeña e intensa que el butt, también premium.', litres:250, cost:18, image:'img/barriles/sherry_hogshead.png', oldImage:'img/barriles/sherry_hogshead_old.png', qBonus:5, repBonus:1, bonus:'+5 calidad y +1 reputación.' },
  str_wine_barrique: { label:'STR Wine Barrique', wood:'Vino STR', desc:'Barrica de vino reacondicionada: Shaved, Toasted, Re-charred.', litres:250, cost:10, image:'img/barriles/STR_wine_barrique.png', oldImage:'img/barriles/STR_wine_barrique_old.png', degradeFactor:.5, bonus:'La barrica se degrada la mitad.' },
  port_pipe: { label:'Port Pipe', wood:'Oporto', desc:'Barrica grande de Oporto, usada sobre todo para finishes largos/premium.', litres:650, cost:25, image:'img/barriles/port_pipe.png', oldImage:'img/barriles/port_pipe_old.png', qBonus:3, repBonus:1, bonus:'+3 calidad y +1 reputación.' },
  virgin_oak_hogshead: { label:'Virgin Oak Hogshead', wood:'Roble nuevo', desc:'Roble nuevo, permitido pero menos habitual. Potente y arriesgado.', litres:250, cost:15, image:'img/barriles/virgin_oak_hogshead.png', oldImage:'img/barriles/virgin_oak_hogshead_old.png', agingFactor:1.2, virginBonus:true, bonus:'Envejecimiento x1.20 y bonus Q aleatorio [0..8].' },
  bourbon: { alias:'ex_bourbon_barrel' },
  sherry: { alias:'sherry_butt' }
};
const BARREL_SHOP_TYPES = ['ex_bourbon_barrel','ex_bourbon_hogshead','quarter_cask','sherry_butt','sherry_hogshead','str_wine_barrique','port_pipe','virgin_oak_hogshead'];
function barrelTypeKey(type='ex_bourbon_barrel'){
  const raw=String(type||'ex_bourbon_barrel');
  const def=BARREL_TYPES[raw];
  return def?.alias || (def ? raw : 'ex_bourbon_barrel');
}
function barrelDef(type='ex_bourbon_barrel'){ return BARREL_TYPES[barrelTypeKey(type)] || BARREL_TYPES.ex_bourbon_barrel; }
function barrelIsOld(b){ return Number(b?.barrelQuality ?? 100) <= 90; }
function degradeBarrel(b, amount=2){ if(!b) return; const def=barrelDef(b.type); b.barrelQuality=Math.max(0, Number(b.barrelQuality ?? 100) - amount*Number(def.degradeFactor ?? 1)); }
function barrelQualityBonusPoints(def){ return Math.round(Number(def?.qBonus || 0) || ((Number(def?.qualityFactor || 1)-1)*100)); }
function barrelAgingBonusText(def){ return Number(def?.agingFactor || 1)!==1 ? `🕰️ Envejecimiento x${Number(def.agingFactor).toFixed(2).replace(/\.00$/,'')}` : ''; }
function barrelBonusParts(def, b=null, verbose=false){
  const parts=[];
  const q=barrelQualityBonusPoints(def); if(q) parts.push(verbose ? `⭐ +${q} Calidad` : `+${q} ⭐`);
  if(def?.repBonus) parts.push(verbose ? `🏆 ${def.repBonus>0?'+':''}${def.repBonus} Reputación de la Destilería` : `${def.repBonus>0?'+':''}${def.repBonus} 🏆`);
  const age=barrelAgingBonusText(def); if(age) parts.push(age);
  if(def?.degradeFactor && Number(def.degradeFactor)!==1) parts.push('Degradación x0.5');
  if(def?.virginBonus) parts.push(verbose ? (b ? `⭐ +${Math.round(b.virginBonus||0)} Calidad del pack` : '⭐ +0..8 Calidad aleatoria') : (b ? `+${Math.round(b.virginBonus||0)} ⭐ pack` : '+0..8 ⭐ aleatorio'));
  return parts;
}
function barrelBonusLine(def, fallback='Sin bonus', b=null, verbose=false){
  return barrelBonusParts(def,b,verbose).join(' · ') || fallback;
}
const PRELOAD_IMAGE_ASSETS = [
  ...SCOTLAND_MAP_ASSETS,
  'img/finca/finca.jpg',
  'img/finca/finca_C.jpg',
  'img/finca/finca_D.jpg',
  'img/finca/finca_L.jpg',
  'img/finca/finca_LD.jpg',
  'img/finca/finca_LU.jpg',
  'img/finca/finca_R.jpg',
  'img/finca/finca_RD.jpg',
  'img/finca/finca_RU.jpg',
  'img/finca/finca_U.jpg',
  'img/finca/tejados.gif',
  'img/finca/etiqueta.png',
  'img/finca/generated/tile_C_pair.jpg',
  'img/finca/generated/tile_U_pair.jpg',
  'img/finca/generated/tile_D_pair.jpg',
  'img/finca/generated/tile_L_pair.jpg',
  'img/finca/generated/tile_R_pair.jpg',
  'img/finca/generated/tile_LU_pair.jpg',
  'img/finca/generated/tile_RU_pair.jpg',
  'img/finca/generated/tile_LD_pair.jpg',
  'img/finca/generated/tile_RD_pair.jpg',
  'img/ayuda.png',
  'img/alambique.png',
  'img/tina_fermentacion.png',
  'img/tina_fermentacion_estropeada.png',
  'img/tina_maceracion.png',
  'img/mill.png',
  'img/cebada_germinando.png',
  'img/cebada_arada.png',
  'img/cebada_germinando_1.png',
  'img/cebada_germinando_2.png',
  'img/cebada_germinando_estropeada.png',
  'img/cebada_germinando_malteada.png',
  'img/cebada_malteada_sin.png',
  'img/cebada_malteada_turba.png',
  'img/cebada_joven.png',
  'img/cebada_madura.png',
  'img/cebada_recien_plantada.png',
  'img/cebada_seca.png',
  'img/barril_bourbon.png',
  'img/barriles/ex_bourbon_barrel.png',
  'img/barriles/ex_bourbon_barrel_old.png',
  'img/barriles/ex_bourbon_hogshead.png',
  'img/barriles/ex_bourbon_hogshead_old.png',
  'img/barriles/quarter_cask.png',
  'img/barriles/quarter_cask_old.png',
  'img/barriles/sherry_butt.png',
  'img/barriles/sherry_butt_old.png',
  'img/barriles/sherry_hogshead.png',
  'img/barriles/sherry_hogshead_old.png',
  'img/barriles/STR_wine_barrique.png',
  'img/barriles/STR_wine_barrique_old.png',
  'img/barriles/port_pipe.png',
  'img/barriles/port_pipe_old.png',
  'img/barriles/virgin_oak_hogshead.png',
  'img/barriles/virgin_oak_hogshead_old.png',
  ...AD_CAMPAIGN_COSTS.map((_,i)=>`img/adds/add${String(i+1).padStart(2,'0')}.jpg`),
  'img/truck1.png',
  'img/truck2.png',
  'img/truck3.png',
  'img/truck4.png'
];
let preloadReady = false;
let preloadStarted = false;
let assetsPreloadedEver = false;
let preloadPromise = null;
let splashDismissRequested = false;
const LIQUID_PALETTE = ['#ffe08a','#f6c65b','#e9a93f','#d98a2d','#c86b24','#f2b45a','#b85a1d','#ffd071'];
const SPEED_BASE_MAX_STEP = 2; // x3 inicial; x5-x10 se desbloquean con logros.
const ACHIEVEMENTS = [
  {id:'first_whisky', name:'Mi primer Whisky', img:'img/logros/mi primer whisky.png', desc:'Parece fácil, ¡pero no lo es! Crear tu primer whisky pasando por cada fase del proceso midiendo meticulosamente cada decisión con dudas e incertidumbre... Y ver finalmente esas maravillosas primeras botellas... ¡Qué orgullo! Los inicios son siempre lo más difícil. A partir de aquí ¡lo tienes todo hecho!', condition:'Primera caja de botellas producida.', reward:'+10 reputación'},
  {id:'rat_dignity', name:'Matarratas con dignidad', img:'img/logros/matarratas con dignidad.png', desc:'¿Estamos seguros de que este brebaje califica como Whisky? Espero que nuestros antepasados miren hacia otro lado...', condition:'Primera tanda de botellas con 60 < Q < 65.', reward:'+50 k€ · reputación -5'},
  {id:'double_cask', name:'Double cask', img:'img/logros/double cask.png', desc:'Producir un whisky con diferentes matices y carácter no es fácil. Para paladares exigentes y snobs de las notas de cata.', condition:'Primera caja con líquidos de dos tipos de barrica diferentes, cada barrica al menos 3 años.', reward:'+10 reputación'},
  {id:'triple_cask', name:'Triple cask', img:'img/logros/triple cask.png', desc:'¿Buscas algo más exótico? Si suelta taninos y aromas, ¡le metemos whisky a ver qué sale de ahí!', condition:'Primera caja con líquidos de tres tipos de barrica diferentes, cada barrica al menos 3 años.', reward:'+20 reputación'},
  {id:'serious_business', name:'Serious business', img:'img/logros/serious business.png', desc:'Aquí ya dejamos de vender matarratas para cockteles, para adentrarnos en el terreno de los líquidos con solera y carisma que toda destilería seria debe ofrecer.', condition:'Primera tanda de 12 años o más.', reward:'Desbloquea tiempo x5 · +10 reputación'},
  {id:'woody_taste', name:'Woody taste', img:'img/logros/woody taste.png', desc:'Mmm... La madera de la barrica se puede cortar con un cuchillo.', condition:'Serious business + tanda de 15 años o más.', reward:'Desbloquea tiempo x7 · +15 reputación'},
  {id:'angels_share', name:'Angel’s share', img:'img/logros/angels share.png', desc:'¿Queda algo aún ahí dentro? ¿Lo rellenamos con cocacola para compensar?', condition:'Woody taste + tanda de 18 años o más.', reward:'Desbloquea tiempo x8 · +20 reputación'},
  {id:'collectors_item', name:'Collectors item', img:'img/logros/collectors item.png', desc:'Este no se bebe, va directo a la vitrina.', condition:'Angel’s share + tanda de 30 años o más.', reward:'Desbloquea tiempo x10 · +30 reputación'},
  {id:'max_q', name:'Max Q', img:'img/logros/max q.png', desc:'Nada de diluir a 40º, chill filtered, Non Age Statement o E-150a... ¡Aquí seleccionamos con lupa hasta el último grano de cebada para que todo sea perfecto!', condition:'Whisky mínimo 46º, 12 años, Q ≥ 99, sin chill filtered y sin colorante.', reward:'+20 reputación'},
  {id:'triple_distillation', name:'Triple destilación', img:'img/logros/triple destilacion.png', desc:'¿En serio es necesario? ¿Otra vez?', condition:'Todo el líquido de la tanda ha sido triplemente destilado.', reward:'+20 reputación · +10 k€'},
  {id:'monster_peat', name:'Monster Peat', img:'img/logros/monster peat.png', desc:'¡Cough cough! ¡Aggghhh! Esto es como masticar tierra quemada... ¡qué exquisita textura!', condition:'Crear botellas con turba entre 40 y 45 ppm.', reward:'+20 reputación'},
  {id:'professional_distillery', name:'Destilería profesional', img:'img/logros/destileria profesional.png', desc:'¿Qué estás buscando? ...¡Lo tenemos!', condition:'Vender al menos una caja NAS, 10, 12, 15 y 18 años; además una sin turba, una con turba y una triple destilación.', reward:'+50 k€ · +10 reputación'},
  {id:'solera', name:'Solera', img:'img/logros/solera.png', desc:'¡Eres todo un experto en ingeniería de la fermentación! No es fácil combinar 5 líquidos diferentes en un mismo proceso de fermentación en una misma tina. Like a pro.', condition:'Con levadura ya añadida, sumar al menos cuatro tandas nuevas de malta a la misma tina: 5 tandas en un proceso.', reward:'+10 reputación'},
  {id:'master_blender', name:'Master Blender', img:'img/logros/master blender.png', desc:'Un poquito de aquí... otra pizca de allá... me llevo una... No sé ni lo que estoy haciendo... ¡hip!', condition:'Crear una tanda de botellas con al menos 5 líquidos diferentes.', reward:'1 pack 🛢️ Sherry Butt + 1 pack 🛢️ Port Pipe · 💰 +10 k€'},
  {id:'the_factory', name:'The factory', img:'img/logros/the factory.png', desc:'Aún no tenemos robots humanoides, pero... tampoco es que nos hagan falta a estas alturas, ¡lo tenemos todo totalmente automatizado! (¡menos las catas, por supuesto!)', condition:'Comprar todas las mejoras disponibles: tina al máximo, todos los alambiques, 8 packs de barricas, almacén completo, riego, autocosechadora, capacidad de malteado, automalteado y termostato automático.', reward:'Fin de juego actual: futura segunda destilería'}
];
const ACH_BY_ID = Object.fromEntries(ACHIEVEMENTS.map(a=>[a.id,a]));
let suppressAchievements = false;
let achievementPopupQueue = [];
let achievementPopupActive = false;
function defaultDistillery(){ return {reputation:0, achievements:{}, stats:{lotsSold:0,bottlesSold:0,litresSold:0,maxBottlesLot:0,oldestSoldAge:0,maxBottlePrice:0, soldCategories:{nas:false,y10:false,y12:false,y15:false,y18:false,unpeated:false,peated:false,triple:false}}, debugStats:false, secondDistilleryUnlocked:false}; }
function normalizeAchievements(raw={}){
  if(Array.isArray(raw)) return Object.fromEntries(raw.filter(Boolean).map(id=>[id, {at:Date.now(), migrated:true}]));
  return {...(raw || {})};
}
function normalizeDistillery(d){ const fresh=defaultDistillery(), src=d||{}; return {...fresh, ...src, achievements:{...fresh.achievements, ...normalizeAchievements(src.achievements)}, stats:{...fresh.stats, ...(src.stats||{}), soldCategories:{...fresh.stats.soldCategories, ...(src.stats?.soldCategories||{})}}}; }
function distillery(){ state.distillery = normalizeDistillery(state.distillery); return state.distillery; }
function normalizeScotlandLocation(loc){
  if(!loc || !SCOTLAND_REGIONS[loc.region]) return null;
  const dest=SCOTLAND_DESTILLERY_ASSETS.includes(loc.dest) ? loc.dest : SCOTLAND_DESTILLERY_ASSETS[0];
  return {region:loc.region, x:clamp(Number(loc.x)||.5,0,1), y:clamp(Number(loc.y)||.5,0,1), dest};
}
function hasAchievement(id){ return !!distillery().achievements?.[id]; }
function achievementMaxSpeedStep(){ const d=distillery(); if(d.achievements.collectors_item) return 9; if(d.achievements.angels_share) return 7; if(d.achievements.woody_taste) return 6; if(d.achievements.serious_business) return 4; return SPEED_BASE_MAX_STEP; }
function addReputation(delta){ const d=distillery(); d.reputation = Math.round((Number(d.reputation)||0) + delta); markPublicProfileDirty('reputation'); }
async function processAchievementPopupQueue(){
  if(achievementPopupActive) return;
  achievementPopupActive = true;
  while(achievementPopupQueue.length){
    const ach=achievementPopupQueue.shift();
    playFx('fxSuccess', .82);
    await gamePopup({
      title:'🏆 Logro',
      mood:'happy',
      html:`<div class="achievement-unlock-popup"><img class="achievement-unlock-img" src="${ach.img}" alt="${escapeHtml(ach.name)}" onerror="this.src='img/logros/logros 1.png'"><div><p><b>Logro desbloqueado:</b> ${escapeHtml(ach.name)}</p><p><b>Premio:</b> ${escapeHtml(ach.reward || '')}</p></div></div>`,
      ok:'¡Olé!'
    });
  }
  achievementPopupActive = false;
}
function queueAchievementPopup(ach){
  achievementPopupQueue.push(ach);
  processAchievementPopupQueue();
}
function awardAchievement(id){
  if(suppressAchievements) return false;
  const d=distillery(); if(d.achievements[id]) return false;
  d.achievements[id] = {at:Date.now()};
  const rewards={first_whisky:{rep:10}, rat_dignity:{rep:-5, coins:50}, double_cask:{rep:10}, triple_cask:{rep:20}, serious_business:{rep:10}, woody_taste:{rep:15}, angels_share:{rep:20}, collectors_item:{rep:30}, max_q:{rep:20}, triple_distillation:{rep:20, coins:10}, monster_peat:{rep:20}, professional_distillery:{coins:50, rep:10}, solera:{rep:10}, master_blender:{coins:10, barrels:['sherry_butt','port_pipe']}, the_factory:{factory:true}};
  const r=rewards[id]||{};
  if(r.rep) addReputation(r.rep);
  if(r.coins) state.coins += r.coins;
  if(Array.isArray(r.barrels)){ recordBarrelPacksAcquired(r.barrels.length); r.barrels.forEach((type,idx)=>state.barrels.push(newBarrel(type,24+(state.barrels.length+idx)*42,64))); }
  if(r.factory) d.secondDistilleryUnlocked = true;
  const ach=ACH_BY_ID[id] || {name:id, reward:'', img:'img/logros/logros 1.png'};
  queueAchievementPopup(ach);
  markPublicProfileDirty('achievement');
  return true;
}
function barrelTrailTypes(lot){ const set=new Set(); for(const c of normalizeComponents(lot, Math.max(0,(Number(lot.bottles)||0)*BOTTLE_LITRES), 'Lote')) for(const t of (c.barrelTrail||[])) if(t) set.add(t); for(const x of (lot.lineage||[])){ const t=x.barrelType||x.to||x.from; if(t) set.add(t); } return [...set]; }
function allComponentsTripleDistilled(lot){ const comps=normalizeComponents(lot, Math.max(0,(Number(lot.bottles)||0)*BOTTLE_LITRES), 'Lote'); return comps.length>0 && comps.every(c=>Number(c.runs)>=3 || /3º|triple/i.test(String(c.label||''))); }
function lotHasBottleAdditive(lot, key){ return (lot?.lineage||[]).some(x=>x?.stage==='embotellado' && !!x?.[key]); }
function barrelPacksAcquiredValue(s=state){ return Math.max(1, Math.floor(Number(s?.barrelPacksAcquired)||0), Array.isArray(s?.barrels) ? s.barrels.length : 0); }
function recordBarrelPacksAcquired(count=1){ state.barrelPacksAcquired = barrelPacksAcquiredValue(state) + Math.max(0, Math.floor(Number(count)||0)); }
function hasAllFactoryUpgrades(){
  const upgrades=fieldUpgrades(), vat=state.vats?.[0];
  return (state.stills||[]).every(st=>st.unlocked)
    && barrelPacksAcquiredValue(state)>=8
    && vatUpgradeCount(vat)>=VAT_CAPACITY_UPGRADE_COSTS.length
    && upgrades.warehouseBuilt
    && upgrades.warehouseDuplicated
    && upgrades.warehouseSecondExpanded
    && upgrades.autoWater
    && upgrades.autoHarvester
    && upgrades.maltCapacityUpgraded
    && upgrades.autoMalting
    && upgrades.thermostatBuilt
    && upgrades.thermostatAutomation;
}
function checkFactoryAchievement(){
  if(hasAllFactoryUpgrades() && awardAchievement('the_factory')){
    markDirty();
    saveGame();
    return true;
  }
  return false;
}
function checkLotAchievements(lot, achievementsBefore={...(distillery().achievements||{})}){
  const q=qualityOrDefault(lot.quality), age=Number(lot.age)||0, peat=Number(lot.peatPpm)||0, types=barrelTrailTypes(lot), comps=normalizeComponents(lot, Math.max(0,(Number(lot.bottles)||0)*BOTTLE_LITRES), 'Lote');
  const unlocked=[];
  const got=id=>{ if(awardAchievement(id)) unlocked.push(id); };
  if(!achievementsBefore.first_whisky) got('first_whisky');
  if(q>60 && q<65) got('rat_dignity');
  if(types.length>=2 && comps.every(c=>Number(c.age)>=3)) got('double_cask');
  if(types.length>=3 && comps.every(c=>Number(c.age)>=3)) got('triple_cask');
  if(!achievementsBefore.serious_business && age>=12) got('serious_business');
  else if(achievementsBefore.serious_business && !achievementsBefore.woody_taste && age>=15) got('woody_taste');
  else if(achievementsBefore.woody_taste && !achievementsBefore.angels_share && age>=18) got('angels_share');
  else if(achievementsBefore.angels_share && !achievementsBefore.collectors_item && age>=30) got('collectors_item');
  if(Number(lot.abv)>=46 && age>=12 && q>=99 && !lotHasBottleAdditive(lot,'chillFilter') && !lotHasBottleAdditive(lot,'caramelColor')) got('max_q');
  if(allComponentsTripleDistilled(lot)) got('triple_distillation');
  if(peat>=40 && peat<=45) got('monster_peat');
  if(comps.length>=5) got('master_blender');
  if(hasAllFactoryUpgrades()) got('the_factory');
  if(unlocked.length) lot.achievements=[...(lot.achievements||[]), ...unlocked.filter(id=>!(lot.achievements||[]).includes(id))];
  return unlocked;
}
function noteLotCreated(lot){
  if(!lot) return;
  const q=qualityOrDefault(lot.quality), age=Number(lot.age)||0, types=barrelTrailTypes(lot);
  const achievementsBefore={...(distillery().achievements||{})};
  if(q>=90) addReputation(2); else if(q>=80) addReputation(1); else if(q<80) addReputation(-1);
  if(age>=18) addReputation(2); else if(age>=10) addReputation(1);
  if(types.length>=2) addReputation(1);
  checkLotAchievements(lot, achievementsBefore);
}
function reevaluateExistingBottleAchievements(){
  const before=Object.keys(distillery().achievements||{}).length;
  const seen=new Set();
  const wasSuppressing=suppressAchievements;
  suppressAchievements = true;
  try{
    for(const lot of [...(state.bottleHistory||[]), ...(state.boxes||[])]){
      if(!lot || seen.has(lot.id)) continue;
      seen.add(lot.id);
      checkLotAchievements(lot);
    }
  } finally {
    suppressAchievements = wasSuppressing;
  }
  if(Object.keys(distillery().achievements||{}).length > before){ markDirty(); saveGame(); render(); }
}
function soldLotsFromHistory(){
  const seen=new Set();
  return (state.bottleHistory||[]).filter(lot=>{
    if(!lot?.sold || seen.has(lot.id)) return false;
    seen.add(lot.id);
    return true;
  });
}
function emptySoldCategories(){ return {...defaultDistillery().stats.soldCategories}; }
function noteSoldCategory(st, lot){
  const age=Number(lot.age)||0, peat=Number(lot.peatPpm)||0;
  if(age<10) st.soldCategories.nas=true; if(age>=10) st.soldCategories.y10=true; if(age>=12) st.soldCategories.y12=true; if(age>=15) st.soldCategories.y15=true; if(age>=18) st.soldCategories.y18=true;
  if(peat<=0) st.soldCategories.unpeated=true; if(peat>0) st.soldCategories.peated=true; if(allComponentsTripleDistilled(lot)) st.soldCategories.triple=true;
}
function rebuildSoldStatsFromHistory({award=false, save=false}={}){
  const d=distillery();
  const next={...defaultDistillery().stats, soldCategories:emptySoldCategories()};
  for(const lot of soldLotsFromHistory()){
    const bottles=Number(lot.bottles)||0, age=Number(lot.age)||0;
    const price=Number(lot.salePricePerBottle) || ((Number(lot.saleTotal)||0)/Math.max(1,bottles));
    next.lotsSold += 1;
    next.bottlesSold += bottles;
    next.litresSold += bottles*BOTTLE_LITRES;
    next.maxBottlesLot = Math.max(next.maxBottlesLot||0, bottles);
    next.oldestSoldAge = Math.max(next.oldestSoldAge||0, age);
    next.maxBottlePrice = Math.max(next.maxBottlePrice||0, price);
    noteSoldCategory(next, lot);
  }
  const before=JSON.stringify(d.stats||{});
  d.stats=next;
  if(before!==JSON.stringify(next)){
    markPublicProfileDirty('sold-stats');
    if(save){ markDirty(); saveGame(); }
  }
  const c=next.soldCategories;
  if(award && c.nas&&c.y10&&c.y12&&c.y15&&c.y18&&c.unpeated&&c.peated&&c.triple) awardAchievement('professional_distillery');
  return next;
}
function updateSoldStats(lot, euros=0){
  if(lot){
    lot.sold=true;
    if(euros && !lot.saleTotal) lot.saleTotal=euros;
    if(euros && !lot.salePricePerBottle) lot.salePricePerBottle=euros/Math.max(1, Number(lot.bottles)||0);
    checkLotAchievements(lot);
  }
  const st=rebuildSoldStatsFromHistory({award:true});
  const c=st.soldCategories; if(c.nas&&c.y10&&c.y12&&c.y15&&c.y18&&c.unpeated&&c.peated&&c.triple) awardAchievement('professional_distillery');
}
function forceAchievement(id){ awardAchievement(id); markDirty(); render(); saveGame(); }
function barrelCapacityL(b){ const def=barrelDef(b?.type); return def.litres * (b?.count || BARREL_PACK_SIZE); }
function barrelLiquidL(b){ return (Number(b?.volume)||0) / 100 * barrelCapacityL(b); }
function barrelPctFromL(b, litres){ return clamp((litres / barrelCapacityL(b)) * 100, 0, 100); }
function vatCapacityPctForUpgrades(count=0){ return ROOM_CAPACITY.vatPct + 50 * clamp(Math.round(Number(count)||0), 0, VAT_CAPACITY_UPGRADE_COSTS.length); }
function vatCapacityPct(v){ return Math.max(ROOM_CAPACITY.vatPct, Number(v?.capacityPct)||ROOM_CAPACITY.vatPct); }
function vatCapacityLitres(v){ return VAT_WASH_LITRES * vatCapacityPct(v) / ROOM_CAPACITY.vatPct; }
function vatLitres(v){ return (Number(v?.volume)||0) / 100 * vatCapacityLitres(v); }
function vatPctFromL(litres, v=null){ return clamp(litres / vatCapacityLitres(v) * 100, 0, 100); }
function inferredVatUpgradeCount(v){
  if(Number.isFinite(Number(v?.capacityUpgrades))) return Math.round(Number(v.capacityUpgrades));
  const pct=Number(v?.capacityPct)||ROOM_CAPACITY.vatPct;
  if(pct>=ROOM_CAPACITY.vatPct*2.2) return 2;
  if(pct>=ROOM_CAPACITY.vatPct*1.35) return 1;
  return 0;
}
function vatUpgradeCount(v){ return clamp(inferredVatUpgradeCount(v),0,VAT_CAPACITY_UPGRADE_COSTS.length); }
function nextVatUpgradeCost(v){ return VAT_CAPACITY_UPGRADE_COSTS[vatUpgradeCount(v)] || 0; }
function nextVatUpgradeInfo(v){
  const currentUpgrades=vatUpgradeCount(v), cost=nextVatUpgradeCost(v);
  if(!cost) return null;
  const currentLitres=VAT_WASH_LITRES * vatCapacityPctForUpgrades(currentUpgrades) / ROOM_CAPACITY.vatPct;
  const nextLitres=VAT_WASH_LITRES * vatCapacityPctForUpgrades(currentUpgrades + 1) / ROOM_CAPACITY.vatPct;
  return {cost, currentLitres, nextLitres, deltaLitres:nextLitres-currentLitres, label:currentUpgrades ? '+8.000l' : '+50%'};
}
function stillInLitres(s){ return (Number(s?.input)||0) / 100 * STILL_INPUT_LITRES; }
function stillInPct(litres){ return clamp(litres / STILL_INPUT_LITRES * 100, 0, 100); }
function stillOutLitres(s){ return (Number(s?.output)||0) / 100 * STILL_OUTPUT_LITRES; }
function stillOutPct(litres){ return clamp(litres / STILL_OUTPUT_LITRES * 100, 0, 100); }
function recalcStillInputFromComponents(s){
  const comps=(Array.isArray(s.inputComponents)?s.inputComponents:[]).filter(c=>(Number(c.litres)||0)>.01);
  const total=comps.reduce((sum,c)=>sum+(Number(c.litres)||0),0);
  if(total<=0) return;
  s.inputQuality=comps.reduce((sum,c)=>sum+(Number(c.litres)||0)*qualityOrDefault(c.quality),0)/total;
  s.inputAbv=comps.reduce((sum,c)=>sum+(Number(c.litres)||0)*(Number(c.abv)||0),0)/total;
  s.inputPeatPpm=comps.reduce((sum,c)=>sum+(Number(c.litres)||0)*(Number(c.peatPpm)||0),0)/total;
}
function addStillInputComponent(s, comp){
  s.inputComponents=[...(Array.isArray(s.inputComponents)?s.inputComponents:[]), comp];
  recalcStillInputFromComponents(s);
}
function scaleStillInputComponents(s, factor){
  if(!Array.isArray(s.inputComponents)) return;
  s.inputComponents=s.inputComponents.map(c=>({...c, litres:(Number(c.litres)||0)*factor})).filter(c=>(Number(c.litres)||0)>.01);
  recalcStillInputFromComponents(s);
}
function newBarrel(type='ex_bourbon_barrel', x=24, y=48){ const key=barrelTypeKey(type), def=barrelDef(key); return {id:uuid(), type:key, count:BARREL_PACK_SIZE, barrelQuality:100, virginBonus:def.virginBonus?Math.floor(Math.random()*9):0, volume:0, age:0, abv:0, quality:100, peatPpm:0, components:[], lineage:[], x, y}; }
function defaultBarrels(){ return [newBarrel('ex_bourbon_barrel',24,56)]; }
const barrelImage = b => { const def=barrelDef(b?.type); return (barrelIsOld(b) && def.oldImage) ? def.oldImage : def.image; };

const newVat = (unlocked=false) => ({ unlocked, capacityPct:ROOM_CAPACITY.vatPct, capacityUpgrades:0, volume:0, ferment:0, yeast:false, idle:0, overferment:0, rotten:false, warned:false, baseQuality:100, quality:100, abv:0, peatPpm:0, lineage:[] });
const newStill = (unlocked=false) => ({ unlocked, input:0, inputAbv:0, inputQuality:100, inputPeatPpm:0, inputLineage:[], inputComponents:[], runs:0, output:0, outputAbv:0, outputQuality:100, outputPeatPpm:0, outputLineage:[], outputRuns:0, temp:20, fire:false });
const newMaltTile = () => ({status:'empty', amount:0, germ:0, moisture:0, baseQuality:100, quality:100, peatPpm:0, heated:false, peat:false, dry:0, stable:0, warned:false, maltStage:'empty', lineage:[]});
const newFieldUpgrades = () => ({
  warehouseBuilt:false,
  warehouseCapacity:0,
  warehouseKg:0,
  warehouseQuality:100,
  warehouseDuplicated:false,
  warehouseSecondExpanded:false,
  autoWater:false,
  autoHarvester:false,
  autoHarvesterEnabled:true,
  maltCapacityUpgraded:false,
  autoMalting:false,
  autoMaltingEnabled:true,
  thermostatBuilt:false,
  thermostatOn:true,
  thermostatAutomation:false,
  thermostatAutomationEnabled:true
});
function resetMaltTile(t){ Object.assign(t, newMaltTile()); }
function normalizeMaltStage(t){
  if(!t || t.status==='empty') return 'empty';
  if(t.status==='rotten') return 'rotten';
  if(t.heated) return 'kilned';
  if(t.maltStage && t.maltStage!=='empty') return t.maltStage;
  if((Number(t.moisture)||0)>0 || (Number(t.germ)||0)>0) return 'germinating';
  return 'raw';
}
function normalizeMaltTile(t){
  const m={...newMaltTile(), ...(t||{})};
  m.lineage=Array.isArray(m.lineage) ? m.lineage : [];
  m.maltStage=normalizeMaltStage(m);
  m.baseQuality=qualityOrDefault(m.baseQuality, qualityOrDefault(m.quality));
  if(m.status==='empty') Object.assign(m, newMaltTile());
  return m;
}
function normalizeVat(v={}, unlocked=false){
  const n={...newVat(unlocked), ...(v||{})};
  n.lineage=Array.isArray(n.lineage) ? n.lineage : [];
  n.baseQuality=qualityOrDefault(n.baseQuality, qualityOrDefault(n.quality));
  n.capacityUpgrades=vatUpgradeCount(n);
  const expectedPct=vatCapacityPctForUpgrades(n.capacityUpgrades);
  n.capacityPct=expectedPct;
  n.volume=clamp(Number(n.volume)||0,0,100);
  n.ferment=clamp(Number(n.ferment)||0,0,FERMENT_ROTTEN_AT);
  n.overferment=Math.max(0, Number(n.overferment)||0);
  n.unlocked=!!unlocked || !!n.unlocked || hasVatContents(n);
  n.abv=vatAbv(n);
  n.quality=vatDisplayQuality(n);
  return n;
}
function normalizeFieldUpgrades(raw={}){
  const n={...newFieldUpgrades(), ...(raw || {})};
  n.warehouseBuilt=!!n.warehouseBuilt;
  n.warehouseDuplicated=!!n.warehouseDuplicated;
  n.warehouseSecondExpanded=!!n.warehouseSecondExpanded || Number(n.warehouseCapacity)>=FIELD_WAREHOUSE_CAPACITY_KG*4;
  if(n.warehouseSecondExpanded) n.warehouseDuplicated=true;
  n.autoWater=!!n.autoWater;
  n.autoHarvester=!!n.autoHarvester && n.warehouseBuilt && n.autoWater;
  n.autoHarvesterEnabled=n.autoHarvester ? n.autoHarvesterEnabled !== false : true;
  n.maltCapacityUpgraded=!!n.maltCapacityUpgraded;
  n.autoMalting=!!n.autoMalting && n.maltCapacityUpgraded;
  n.autoMaltingEnabled=n.autoMalting ? n.autoMaltingEnabled !== false : true;
  n.thermostatBuilt=!!n.thermostatBuilt;
  n.thermostatOn=n.thermostatBuilt ? n.thermostatOn !== false : true;
  n.thermostatAutomation=!!n.thermostatAutomation && n.thermostatBuilt;
  n.thermostatAutomationEnabled=n.thermostatAutomation ? n.thermostatAutomationEnabled !== false : true;
  n.warehouseKg=Math.max(0, Number(n.warehouseKg)||0);
  n.warehouseQuality=qualityOrDefault(n.warehouseQuality);
  if(!n.warehouseBuilt){
    n.warehouseCapacity=0;
    n.warehouseKg=0;
    n.warehouseQuality=100;
    n.warehouseDuplicated=false;
    n.warehouseSecondExpanded=false;
    n.autoHarvester=false;
    n.autoHarvesterEnabled=true;
    return n;
  }
  const minimumCapacity = FIELD_WAREHOUSE_CAPACITY_KG;
  const expectedCapacity = FIELD_WAREHOUSE_CAPACITY_KG * (n.warehouseSecondExpanded ? 4 : (n.warehouseDuplicated ? 2 : 1));
  n.warehouseCapacity=Math.max(minimumCapacity, expectedCapacity, Number(n.warehouseCapacity)||0);
  n.warehouseKg=Math.min(n.warehouseKg, n.warehouseCapacity || 0);
  if(n.warehouseKg<=0) n.warehouseQuality=100;
  return n;
}
function mergeSavedVats(vats=[]){
  const active=(Array.isArray(vats)?vats:[]).filter((v,i)=>i===0 || v?.unlocked || hasVatContents(v));
  if(!active.length) return [newVat(true)];
  const main=normalizeVat(active[0], true);
  for(const raw of active.slice(1)){
    const extra=normalizeVat(raw, true);
    const oldL=vatLitres(main), addL=Math.min(vatLitres(extra), Math.max(0, vatCapacityLitres(main)-oldL));
    if(addL<=.01) continue;
    main.baseQuality=weightedQuality(oldL, main.baseQuality, addL, extra.baseQuality);
    main.quality=main.baseQuality;
    main.peatPpm=weightedValue(oldL, main.peatPpm, addL, extra.peatPpm || 0);
    main.ferment=weightedValue(oldL, main.ferment, addL, extra.ferment || 0);
    main.yeast=main.yeast || extra.yeast;
    main.overferment=Math.min(main.overferment || 0, extra.overferment || 0);
    main.lineage=mergeLineage(main.lineage||[], extra.lineage||[]);
    main.volume=vatPctFromL(oldL+addL, main);
  }
  main.abv=vatAbv(main);
  main.quality=vatDisplayQuality(main);
  return [main];
}
const defaultState = () => ({
  bottleHistorySeq: 0,
  bottleHistory: [],
  distilleryName: 'Mi destilería',
  scotlandLocation: null,
  speedStep: 0,
  coins: 10,
  seeds: 0,
  bottles: 0,
  market: MARKET_MID,
  marketPhase: Math.random()*10,
  marketTrend: 0,
  marketTarget: MARKET_MID,
  marketVelocity: 0,
  marketVolatility: .018,
  marketTrendUntil: Date.now(),
  marketHistory: [{t: Date.now(), p: 3.5}],
  marketHistoryAt: Date.now(),
  advertisingCampaigns: 0,
  barrelPacksAcquired: 1,
  distillery: defaultDistillery(),
  debugQuality: false,
  musicEnabled: true,
  fxEnabled: true,
  fieldUpgrades: newFieldUpgrades(),
  field: Array.from({length: FIELD_TILES}, () => ({status:'empty', growth:0, moisture:0, dry:0, overdue:0, quality:100, peatPpm:0})),
  malt: Array.from({length: MALT_TILES}, () => newMaltTile()),
  vats: [newVat(true)],
  stills: Array.from({length: EQUIPMENT_LIMITS.stills}, (_,i) => newStill(i===0)),
  barrels: defaultBarrels(),
  boxes: []
});

function normalizeEquipmentUnlocks(){
  state.vats = mergeSavedVats(state?.vats);
  if(Array.isArray(state?.stills)) state.stills.forEach((s,i)=>{ if(i===0 || s?.unlocked || hasStillContents(s)) s.unlocked = true; });
}

let state = defaultState();
let dragging = null;
let saveDirty = false;
let nameEditing = false;
let pointerActive = false;
let renderPending = false;
let suppressNextClick = false;
let suppressClickTimer = null;
let barrelShopOpen = false;
let advertisingShopOpen = false;
let advertisingCarouselIndex = 0;
let marketSimOpen = false;
let marketSimChartPoints = [];
let stagePan = null;
let debugToolsVisible = false;
let truckBusy = false;
let currentTruck = null;
let truckTimerIds = [];
const HARVESTER_PARK = {left:5, top:82};
const HARVESTER_MOVE_MS = 620;
const HARVESTER_WORK_MS = 1000;
let harvesterQueue = [];
let harvesterQueuedTiles = new Set();
let harvesterRun = null;
let harvesterTimer = null;
let roofFadeTimer = null;
let konamiIndex = 0;
const KONAMI_SEQUENCE = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a','Enter'];
function handleKonamiKey(e){
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  const expected = KONAMI_SEQUENCE[konamiIndex];
  if(key === expected){
    konamiIndex += 1;
    if(konamiIndex === KONAMI_SEQUENCE.length){
      konamiIndex = 0;
      debugToolsVisible = !debugToolsVisible;
      $('#game')?.classList.toggle('debug-tools-visible', debugToolsVisible);
    }
    return true;
  }
  konamiIndex = key === KONAMI_SEQUENCE[0] ? 1 : 0;
  return false;
}

function normaliseLoaded(s){
  const fresh = defaultState();
  const merged = {...fresh, ...s};
  merged.field = Array.from({length: FIELD_TILES}, (_, i) => ({...fresh.field[i], ...(s.field?.[i] || {})}));
  merged.malt = Array.from({length: MALT_TILES}, (_, i) => normalizeMaltTile({...fresh.malt[i], ...(s.malt?.[i] || {})}));
  merged.vats = mergeSavedVats(s.vats);
  merged.stills = Array.from({length: EQUIPMENT_LIMITS.stills}, (_, i) => { const st={...newStill(i===0), ...(s.stills?.[i] || {})}; st.inputLineage = Array.isArray(st.inputLineage) ? st.inputLineage : []; st.outputLineage = Array.isArray(st.outputLineage) ? st.outputLineage : []; st.inputComponents = Array.isArray(st.inputComponents) ? st.inputComponents : []; st.unlocked = i===0 || !!st.unlocked || hasStillContents(st); return st; });
  merged.barrels = Array.isArray(s.barrels) && s.barrels.length ? s.barrels.map((b,i)=>{ const key=barrelTypeKey(b.type || 'ex_bourbon_barrel'), def=barrelDef(key); const nb={...newBarrel(key), ...b, type:key, count:b.count || BARREL_PACK_SIZE, barrelQuality:Number.isFinite(Number(b.barrelQuality))?Number(b.barrelQuality):100, virginBonus:def.virginBonus?(Number.isFinite(Number(b.virginBonus))?clamp(Number(b.virginBonus),0,8):Math.floor(Math.random()*9)):0, lineage:Array.isArray(b.lineage)?b.lineage:[], components:Array.isArray(b.components)?b.components:[], x: Number.isFinite(b.x)?b.x:20+i*110, y: Number.isFinite(b.y)?b.y:48}; nb.components=normalizeComponents(nb, barrelLiquidL(nb)); if((nb.volume||0)>0 && b.bottlingRegionRoll) nb.bottlingRegionRoll=normalizeHighlandsRoll(b.bottlingRegionRoll); else delete nb.bottlingRegionRoll; return nb; }) : defaultBarrels();
  merged.barrelPacksAcquired = barrelPacksAcquiredValue(merged);
  merged.boxes = Array.isArray(s.boxes) ? s.boxes.map((b,i)=>{ const box={...b, components:Array.isArray(b.components)?b.components:[], x: Number.isFinite(b.x)?b.x:18+i*95, y: Number.isFinite(b.y)?b.y:20}; box.components=normalizeComponents(box, Math.max(0,(Number(box.bottles)||0)*BOTTLE_LITRES), 'Botellas existentes'); if(!box.image || /^img\/botella\d+\.png$/.test(String(box.image))) box.image=chooseBottleArt(box); return box; }) : [];
  merged.bottleHistory = Array.isArray(s.bottleHistory) ? s.bottleHistory.map((b,i)=>{ const h={...b, seq:Number(b.seq)||i+1, bottledAt:Number(b.bottledAt)||Date.now(), components:Array.isArray(b.components)?b.components:[], lineage:Array.isArray(b.lineage)?b.lineage:[]}; h.components=normalizeComponents(h, Math.max(0,(Number(h.bottles)||0)*BOTTLE_LITRES), 'Botellas históricas'); if(!h.image || /^img\/botella\d+\.png$/.test(String(h.image))) h.image=chooseBottleArt(h); return h; }) : [];
  if(!merged.bottleHistory.length && merged.boxes.length) merged.bottleHistory = merged.boxes.map((b,i)=>({...b, seq:i+1, image:b.image || chooseBottleArt(b), bottledAt:Date.now()-i, sold:false, salePricePerBottle:0, saleTotal:0, components:(b.components||[]).map(c=>({...c})), lineage:(b.lineage||[]).map(x=>({...x}))}));
  merged.bottleHistorySeq = Math.max(Number(s.bottleHistorySeq)||0, ...merged.bottleHistory.map(x=>Number(x.seq)||0), 0);
  merged.speedStep = 0;
  merged.advertisingCampaigns = clamp(Math.floor(Number(s.advertisingCampaigns)||0), 0, AD_CAMPAIGN_COSTS.length);
  const mMin = marketLowerBound(merged.advertisingCampaigns), mMax = marketUpperBound(merged.advertisingCampaigns);
  merged.marketHistory = Array.isArray(s.marketHistory) ? s.marketHistory.map(x=>({t:Number(x.t)||Date.now(), p:clamp(Number(x.p)||merged.market, mMin, mMax)})).slice(-MARKET_HISTORY_MAX) : [{t:Date.now(), p:merged.market}];
  merged.marketHistoryAt = Number(s.marketHistoryAt) || Date.now();
  merged.market = clamp(Number(merged.market)||MARKET_MID, mMin, mMax);
  merged.marketTrend = Number(s.marketTrend) || 0;
  merged.marketTarget = clamp(Number(s.marketTarget) || merged.market || MARKET_MID, mMin, mMax);
  merged.marketVelocity = clamp(Number(s.marketVelocity) || 0, -.12, .12);
  merged.marketVolatility = clamp(Number(s.marketVolatility) || .012, .004, .026);
  merged.marketTrendUntil = Number(s.marketTrendUntil) || Date.now();
  merged.distillery = normalizeDistillery(s.distillery);
  merged.scotlandLocation = normalizeScotlandLocation(s.scotlandLocation);
  merged.fieldUpgrades = normalizeFieldUpgrades(s.fieldUpgrades);
  merged.field.forEach(t=>{ delete t.autoHarvesting; });
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
  audio.volume = .26;
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
  const mult = id==='fxAhhh' ? .60 : (id==='fxCork' ? .80 : 1);
  fx.volume=clamp(volume * mult, 0, 1);
  fx.play().catch(()=>{});
  fx.addEventListener('ended', ()=>fx.remove(), {once:true});
}
const SCOT_RUMBLING_FX = ['fxEscocesRumbling1','fxEscocesRumbling2','fxEscocesRumbling3','fxEscocesRumbling4','fxEscocesRumbling5'];
const SCOT_GRUMPY_FX = ['fxEscocesGrumpy','fxEscocesGrumpy2'];
const BOTTLE_BOX_FX = ['fxBottles1','fxBottles2','fxBottles3'];
function playRandomFx(ids, volume=.72, except=''){
  const pool=ids.filter(id=>id!==except && $(`#${id}`));
  const usable=pool.length ? pool : ids.filter(id=>$(`#${id}`));
  if(!usable.length) return '';
  const id=usable[Math.floor(Math.random()*usable.length)];
  playFx(id, volume);
  return id;
}
function playScotVoice(mood='explain'){
  if(mood === 'angry') return playRandomFx(SCOT_GRUMPY_FX, .82);
  const id = SCOT_RUMBLING_FX[Math.floor(Math.random()*SCOT_RUMBLING_FX.length)];
  playFx(id, .56);
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
function setSplashProgress(done,total){
  const pctDone = total ? Math.round(done / total * 100) : 100;
  const bar=$('#splashProgress'), pctEl=$('#splashPercent'), status=$('#splashStatus'), hint=$('#splashHint');
  if(bar) bar.style.width=`${pctDone}%`;
  if(pctEl) pctEl.textContent=`${pctDone}%`;
  if(status) status.textContent = preloadReady ? 'Finca lista' : 'Cargando finca…';
  if(hint) hint.textContent = preloadReady ? 'Pulsa para entrar' : 'Precargando texturas del mapa';
}
function preloadImage(src){
  return new Promise(resolve=>{
    const img=new Image();
    img.onload=()=>resolve({src, ok:true});
    img.onerror=()=>resolve({src, ok:false});
    img.src=src;
  });
}
const scotlandMaskCache = new Map();
let scotlandMaskPromise = null;
let scotlandHitMap = null;
let scotlandSelectionPrepared = false;
function buildScotlandHitMap(entries){
  const valid=entries.filter(x=>x?.ctx && x.w && x.h);
  if(!valid.length) return null;
  const w=valid[0].w, h=valid[0].h, pixels=new Uint8Array(w*h);
  valid.forEach((entry, idx)=>{
    if(entry.w!==w || entry.h!==h) return;
    try{
      const alpha=entry.ctx.getImageData(0,0,w,h).data;
      const code=idx+1;
      for(let p=0, a=3; a<alpha.length; p++, a+=4){
        if(!pixels[p] && alpha[a] > 12) pixels[p]=code;
      }
    }catch(_){ }
  });
  return {w, h, pixels, regions:valid.map(x=>x.region)};
}
function startScotlandMaskPreload(){
  if(scotlandMaskPromise) return scotlandMaskPromise;
  scotlandSelectionPrepared = false;
  scotlandMaskPromise = Promise.all(SCOTLAND_REGION_ORDER.map(region=>new Promise(resolve=>{
    const img=new Image();
    img.onload=()=>{
      let entry=null;
      try{
        const canvas=document.createElement('canvas'); canvas.width=img.naturalWidth||2280; canvas.height=img.naturalHeight||1282;
        const ctx=canvas.getContext('2d', {willReadFrequently:true});
        ctx.drawImage(img,0,0,canvas.width,canvas.height);
        entry={region, canvas, ctx, w:canvas.width, h:canvas.height};
        scotlandMaskCache.set(region.id, entry);
      }catch(_){ }
      resolve(entry);
    };
    img.onerror=()=>resolve(null);
    img.src=region.mask;
  }))).then(entries=>{
    scotlandHitMap = buildScotlandHitMap(entries);
    scotlandSelectionPrepared = !!scotlandHitMap;
    return true;
  });
  return scotlandMaskPromise;
}
function scotlandBaseMapReady(root=ensureScotlandMapOverlay()){
  const img=root.querySelector('.scotland-base-map');
  if(!img || (img.complete && img.naturalWidth)) return Promise.resolve(true);
  return new Promise(resolve=>{
    img.addEventListener('load', ()=>resolve(true), {once:true});
    img.addEventListener('error', ()=>resolve(false), {once:true});
  });
}
async function scotlandSelectionReady(root=ensureScotlandMapOverlay()){
  startScotlandMaskPreload();
  await Promise.all([scotlandMaskPromise, scotlandBaseMapReady(root)]);
  return true;
}
async function startAssetPreload(){
  if(preloadPromise) return preloadPromise;
  preloadStarted = true;
  const assets=[...new Set(PRELOAD_IMAGE_ASSETS)];
  let done=0;
  setSplashProgress(0, assets.length || 1);
  const preloadLimited = async (limit=6) => {
    const results=[];
    for(let i=0;i<assets.length;i+=limit){
      const batch=assets.slice(i,i+limit);
      const loaded=await Promise.all(batch.map(src=>preloadImage(src).then(r=>{ done += 1; setSplashProgress(done, assets.length); return r; })));
      results.push(...loaded);
      await new Promise(requestAnimationFrame);
    }
    return results;
  };
  preloadPromise = preloadLimited().then(()=>startScotlandMaskPreload()).then(()=>{
    preloadReady = true;
    assetsPreloadedEver = true;
    $('#splashScreen')?.classList.remove('loading');
    setSplashProgress(assets.length || 1, assets.length || 1);
    if(splashDismissRequested) hideSplash();
    return true;
  });
  return preloadPromise;
}
function showSplash(){
  const splash=$('#splashScreen');
  if(!splash) return;
  splashDismissRequested = false;
  splash.classList.remove('hidden','leaving');
  if(assetsPreloadedEver){
    preloadReady = true;
    preloadStarted = true;
    splash.classList.remove('loading');
    setSplashProgress(PRELOAD_IMAGE_ASSETS.length || 1, PRELOAD_IMAGE_ASSETS.length || 1);
    return;
  }
  preloadReady = false;
  preloadStarted = false;
  splash.classList.add('loading');
  startAssetPreload();
}
function hideSplash(){
  const splash=$('#splashScreen');
  if(!splash || splash.classList.contains('hidden')) return;
  if(!preloadReady){ splashDismissRequested = true; $('#splashHint') && ($('#splashHint').textContent='Entraremos en cuanto termine la precarga'); return; }
  playFx('fxCork', .72);
  startMainLoop();
  if(!state.scotlandLocation){
    openScotlandMap('select');
    $('#splashHint') && ($('#splashHint').textContent='Elige dónde fundar la destilería');
    return;
  }
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
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw){
      state = normaliseLoaded(JSON.parse(raw));
      rebuildSoldStatsFromHistory({save:true});
    }
  }
  catch(err) { console.warn('No se pudo cargar la partida guardada', err); }
}
function saveGame(){
  normalizeEquipmentUnlocks();
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); saveDirty = false; }
  catch(err) { console.warn('No se pudo guardar la partida', err); }
}
function markDirty(){ saveDirty = true; }
let speedLimitNoticeAt = 0;
function speedMultiplier(){ const step = Number(state.speedStep || 0); return step >= 0 ? 1 + step : 1 / (1 - step); }
function speedLabel(){ const m = speedMultiplier(); return m >= 1 ? `x${m.toFixed(0)}` : `/${Math.round(1/m)}`; }
function setSpeedStep(step, {silent=false}={}){
  const requested=clamp(Number(step)||0, -4, 9), max=achievementMaxSpeedStep();
  const next=clamp(requested, -4, max);
  if(requested>max && !silent){
    const now=Date.now(), popupOpen=!!$('#gamePopup:not(.hidden)');
    if(!popupOpen && now-speedLimitNoticeAt>1800){
      speedLimitNoticeAt=now;
      notice(`De momento el tiempo máximo está limitado a x${max+1}. El viejo escocés gruñe algo sobre logros, paciencia y no fermentar con prisas.`, 'explain', 'Tiempo bloqueado');
    }
  }
  state.speedStep=next;
  $('#speedSlider').value=state.speedStep;
  $('#speedLabel').textContent=speedLabel();
  $('#speedSlider')?.style.setProperty('--speed-unlock', `${((max+4)/13*100).toFixed(1)}%`);
  markDirty();
}
function tempPct(n){ return pct((n - TEMP_MIN) / (TEMP_MAX - TEMP_MIN) * 100); }
function qualityOrDefault(q, fallback=100){ const n=Number(q); return Number.isFinite(n) ? n : fallback; }
function weightedQuality(oldVol, oldQ, addVol, addQ){ const o=qualityOrDefault(oldQ), a=qualityOrDefault(addQ); return oldVol>0 ? (o * oldVol + a * addVol) / (oldVol + addVol) : a; }
function weightedValue(oldVol, oldValue, addVol, addValue){ return oldVol>0 ? ((oldValue || 0) * oldVol + (addValue || 0) * addVol) / (oldVol + addVol) : (addValue || 0); }
function advertisingBought(count=state?.advertisingCampaigns){ return clamp(Math.floor(Number(count)||0), 0, AD_CAMPAIGN_COSTS.length); }
function marketLowerBound(count=state?.advertisingCampaigns){ return MARKET_MIN + advertisingBought(count) * AD_MARKET_STEP; }
function marketUpperBound(count=state?.advertisingCampaigns){ return MARKET_MAX + advertisingBought(count) * AD_MARKET_STEP; }
function fieldPlantMoisture(){ return fieldUpgrades().autoWater ? FIELD_WATER_CAP : FIELD_INITIAL_MOISTURE; }
function qualityCurve(value, start, mid, end){
  if(value < start) return 0;
  if(value <= mid) return 80 + (value - start) / (mid - start) * 20;
  if(value <= end) return 100 - (value - mid) / (end - mid) * 20;
  return 80;
}
function cropQuality(t){ return clamp(qualityOrDefault(t?.quality) * qualityCurve(t.growth, FIELD_HARVEST_START, FIELD_OPTIMAL_MID, FIELD_OPTIMAL_END) / 100, 0, 100); }
function maltQuality(t){
  const g = Number(t?.germ || 0);
  if(g < MALT_HARVEST_START) return 0;
  if(g < MALT_OPTIMAL_START) return clamp(42 + (g - MALT_HARVEST_START) / (MALT_OPTIMAL_START - MALT_HARVEST_START) * 43, 35, 85);
  if(g <= MALT_OPTIMAL_END){
    const dist=Math.abs(g-MALT_OPTIMAL_MID) / Math.max(MALT_OPTIMAL_MID-MALT_OPTIMAL_START, MALT_OPTIMAL_END-MALT_OPTIMAL_MID);
    return clamp(100 - Math.pow(dist, 1.35) * 15, 85, 100);
  }
  return clamp(85 - (g - MALT_OPTIMAL_END) / (100 - MALT_OPTIMAL_END) * 45, 35, 85);
}
function maltBaseQuality(t){ return qualityOrDefault(t?.baseQuality, qualityOrDefault(t?.quality)); }
function maltFinalQuality(t){ return clamp(maltBaseQuality(t) * maltQuality(t) / 100, 0, maltBaseQuality(t)); }
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
function actionIcon(src, alt=''){
  return `<img class="action-btn-icon" src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" draggable="false">`;
}
function actionButtonLabel(src, label, alt=''){
  return `${actionIcon(src, alt)}<span>${label}</span>`;
}
function actionPrice(cost){ return `<b class="action-price">${cost}k€</b>`; }
function actionLabel(label, cost=null){ return `${escapeHtml(label)}${cost===null ? '' : ` ${actionPrice(cost)}`}`; }
function lerpColorHex(a,b,t){
  const x=Math.max(0,Math.min(1,t));
  const ca=a.match(/\w\w/g).map(v=>parseInt(v,16)), cb=b.match(/\w\w/g).map(v=>parseInt(v,16));
  return `rgb(${ca.map((v,i)=>Math.round(v+(cb[i]-v)*x)).join(', ')})`;
}
function temperatureColor(temp){
  const t=Number(temp)||TEMP_MIN;
  if(t<=64) return lerpColorHex('4aa8ff','5bb765',(t-TEMP_MIN)/(64-TEMP_MIN));
  if(t<=78.3) return lerpColorHex('5bb765','ff4a32',(t-64)/(78.3-64));
  if(t<=WATER_BOIL) return lerpColorHex('ff4a32','b91d17',(t-78.3)/(WATER_BOIL-78.3));
  return lerpColorHex('b91d17','4aa8ff',(t-WATER_BOIL)/(TEMP_MAX-WATER_BOIL));
}
function temperatureBarColor(temp){
  const t=Number(temp)||TEMP_MIN;
  if(t<=ALCOHOL_BOIL) return lerpColorHex('4aa8ff','ffe16d',(t-TEMP_MIN)/(ALCOHOL_BOIL-TEMP_MIN));
  if(t<=WATER_BOIL) return lerpColorHex('ffe16d','ff4a32',(t-ALCOHOL_BOIL)/(WATER_BOIL-ALCOHOL_BOIL));
  return lerpColorHex('ff4a32','4aa8ff',(t-WATER_BOIL)/(TEMP_MAX-WATER_BOIL));
}
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
    age:Number(c.age)||0,
    runs:Number(c.runs)||0,
    barrelTrail:Array.isArray(c.barrelTrail)?c.barrelTrail.map(barrelTypeKey):[]
  })).filter(c=>c.litres>.01) : [];
  const sum=comps.reduce((a,c)=>a+c.litres,0);
  if(total<=.01) return [];
  if(sum<=.01) return [{id:`legacy-${owner?.id || 'liquid'}`, label:fallbackLabel, color:liquidColor(owner?.id || fallbackLabel), litres:total, abv:owner?.abv || 0, quality:owner?.quality || 100, peatPpm:owner?.peatPpm || 0, age:owner?.age || 0, runs:0, barrelTrail:owner?.type?[barrelTypeKey(owner.type)]:[]}];
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
    map.set(key,{...prev, litres:total, abv:weightedValue(prev.litres, prev.abv, c.litres, c.abv), quality:weightedQuality(prev.litres, prev.quality, c.litres, c.quality), peatPpm:weightedValue(prev.litres, prev.peatPpm, c.litres, c.peatPpm), age:Math.min(prev.age||0, c.age||0), runs:Math.max(Number(prev.runs)||0, Number(c.runs)||0), barrelTrail:[...new Set([...(prev.barrelTrail||[]), ...(c.barrelTrail||[])]).values()].map(barrelTypeKey)});
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
  return comps.map(c=>`<span class="liquid-swatch" style="background:${c.color}"></span>${escapeHtml(displayLiquidLabel(c.label))}: ${Math.round(c.litres)}l (${Math.round(c.litres/total*100)}%)  ⭐ ${Math.round(qualityOrDefault(c.quality))}  🕰️ ${Number(c.age||0).toFixed(1)}a  🧪 ${Math.round(c.abv||0)}°  🪵 ${Math.round(c.peatPpm||0)}ppm`).join('\n');
}
function barrelTooltipHtml(b, type, liquidL, breakdown=''){
  const capacity=barrelCapacityL(b), bonus=barrelBonusParts(type,b,true), pack=b.count || BARREL_PACK_SIZE;
  return `<div class="tip-wide barrel-tip"><div class="tip-head"><b>🛢️ ${escapeHtml(type.label)}</b><span>pack x${pack}</span></div>
<div class="tip-desc"><em>${escapeHtml(type.desc || type.wood || '')}</em></div>
<div class="tip-line">💧 ${Math.floor(liquidL/Math.max(1,pack))}l/u · ${Math.floor(liquidL)}l total · ${(b.volume||0).toFixed(1)}% ocupado · cap. ${type.litres}l/u (${capacity.toLocaleString('es-ES')}l total)</div>
<div class="tip-line tip-kpis"><span class="tip-quality">⭐ Calidad ${Math.round(b.quality || 100)}</span><span>🕰️ ${(b.age||0).toFixed(1)}a</span><span>🧪 ${(b.abv||0).toFixed(0)}°</span><span>🪵 ${Math.round(b.peatPpm || 0)}ppm</span></div>
<div class="tip-line">🏷️ Calidad barril <span class="tip-quality">${Math.round(b.barrelQuality ?? 100)}</span>${bonus.length?` <span class="tip-bonus">${escapeHtml(bonus.join(' · '))}</span>`:''}${barrelIsOld(b)?' <span class="tip-muted">Barrica usada</span>':''}</div>
${breakdown?`<div class="tip-liquids">${breakdown.split('\n').map(x=>`<div>${x}</div>`).join('')}</div>`:''}</div>||Arrastra destilado aquí, mueve líquido entre barriles o lleva el barril a embotellado.`;
}
function boxTooltipHtml(b, boxLitres, breakdown=''){
  return `<div class="tip-wide box-tip"><div class="tip-head"><b>📦 Caja</b><span>🍾 ${Math.round(b.bottles || 0)} botellas</span></div>
<div class="tip-line tip-kpis"><span class="tip-quality">⭐ Calidad ${Math.round(b.quality || 100)}</span><span>🕰️ ${Math.floor(b.age || 0)} años</span><span>🧪 ${Math.round(b.abv || 0)}°</span><span>🪵 ${Math.round(b.peatPpm || 0)}ppm</span></div>
${breakdown?`<div class="tip-liquids">${breakdown.split('\n').map(x=>`<div>${x}</div>`).join('')}</div>`:''}</div>||Muévela por la tienda o arrástrala al camión para vender.`;
}
function stablePick(seed, arr, count=1){
  let h=0; for(const ch of String(seed)) h=(h*31 + ch.charCodeAt(0)) >>> 0;
  const pool=[...arr], out=[];
  while(pool.length && out.length<count){ h=(h*1664525+1013904223)>>>0; out.push(pool.splice(h%pool.length,1)[0]); }
  return out;
}
function tastingNotes(lot){
  const q=qualityOrDefault(lot.quality), peat=Number(lot.peatPpm)||0, age=Number(lot.age)||0;
  const byKind={
    appearance:[
      'Apariencia: oro viejo con destellos de miel y cobre.','Apariencia: ámbar claro, limpio, con lágrima lenta.','Apariencia: bronce de atardecer sevillano, sin ponerse intenso.','Apariencia: dorado pajizo, más elegante que presumido.',
      'Apariencia: caoba pulida con ribete cobrizo.','Apariencia: miel oscura, brillante y aceitosa en copa.','Apariencia: oro de cosecha tardía, limpio y luminoso.','Apariencia: ámbar profundo con destellos de naranja quemada.',
      'Apariencia: color puesta de sol en barrica con complejo de diva.','Apariencia: dorado sospechosamente guapo, como de anuncio caro.','Apariencia: brilla como moneda encontrada bajo un sofá victoriano.','Apariencia: ámbar de taberna fina, sin pedir permiso.'
    ],
    nose:[
      'Nariz: vainilla, cereal dulce, manzana asada y madera tostada.','Nariz: miel, naranja confitada, frutos secos y un guiño de cacao.','Nariz: caramelo, roble amable y especia de armario caro.','Nariz: parece serio, hasta que aparece una galleta escondida.',
      'Nariz: pera madura, malta limpia, toffee y canela suave.','Nariz: pasas, nuez moscada, cáscara de naranja y roble seco.','Nariz: chocolate con leche, avellana, vainilla y fruta de hueso.','Nariz: flor seca, miel de brezo, manzana roja y cereal tostado.',
      'Nariz: biblioteca antigua donde alguien ha escondido un bizcocho.','Nariz: feria medieval, barril noble y un señor vendiendo caramelo.','Nariz: sofá de cuero, biblioteca vieja y una galleta que no piensa compartir.','Nariz: huele a plan excelente después de cancelar una reunión.'
    ],
    palate:[
      'Paladar: entrada dulce, cuerpo medio, especias y roble integrado.','Paladar: malta, caramelo salado, nuez y un punto de chocolate.','Paladar: cálido y redondo, con fruta seca y madera limpia.','Paladar: pide sillón, hielo opcional y cero reuniones.',
      'Paladar: cremoso, con vainilla, pera, clavo suave y cereal tostado.','Paladar: frutos secos, naranja amarga, cacao y roble especiado.','Paladar: miel, manzana horneada, pimienta blanca y final de almendra.','Paladar: textura oleosa, dulce de leche, madera seca y fruta madura.',
      'Paladar: entra con modales y sale haciendo air guitar.','Paladar: sabe a sobremesa larga y excusa perfecta para no fregar.','Paladar: abrazo de barrica con botas embarradas.','Paladar: una magdalena con doctorado en sobremesa aplicada.'
    ],
    finish:[
      'Final: medio-largo, especiado, con vainilla y cereal tostado.','Final: seco, amable, dejando roble, cacao y fruta madura.','Final: cálido, limpio y con ganas de repetir sin hacer drama.','Final: se va despacio, como camión cargado de gloria.',
      'Final: largo, con roble dulce, naranja seca y pimienta fina.','Final: persistente, con cacao, nuez y un eco de vainilla.','Final: elegante, seco, con malta tostada y especia moderada.','Final: limpio y cálido, con fruta madura y madera bien pulida.',
      'Final: deja la boca como una chimenea con estudios superiores.','Final: se queda mirando desde la puerta, dramático pero encantador.','Final: largo como explicación técnica antes de dormir.','Final: desaparece dejando una nota: compra más barricas.'
    ]
  };
  if(peat>0){
    const peatByKind = peat<15 ? {
      nose:['Nariz: humo fino de chimenea lejana y brasa discreta.','Nariz: barbacoa apagada ayer, pero con modales.'],
      finish:['Final: turba suave, más manta que incendio.','Final: un hilillo de humo que firma el acta y se va.']
    } : peat<35 ? {
      nose:['Nariz: hoguera, cuero, salitre y ceniza limpia.','Nariz: pescador escocés secando botas sobre una fogata filosófica.'],
      palate:['Paladar: turba marcada, madera tostada y un punto marino.','Paladar: galleta de maltas servida en una pala de carbón elegante.'],
      finish:['Final: ceniza dulce, brasa controlada y abrazo de manta ahumada.']
    } : peat<55 ? {
      nose:['Nariz: tierra quemada por un vikingo pirómano.','Nariz: hospital de campaña, algas, carbón y una vaca opinando desde Islay.','Nariz: extintor vacío, playa fría y orgullo familiar en peligro.'],
      palate:['Paladar: alquitrán noble, limón chamuscado y drama marítimo.','Paladar: parece lamer una chimenea, pero una chimenea con pedigrí.'],
      finish:['Final: ceniza, brea elegante y campamento vikingo después de discutir.','Final: humo que te manda un burofax desde el paladar.']
    } : {
      nose:['Nariz: volcán en una farmacia, botas mojadas y turba con antecedentes penales.','Nariz: el suelo de Escocia tostado en modo apocalipsis amable.'],
      palate:['Paladar: masticas una hoguera y, contra todo pronóstico, quieres otra copa.','Paladar: torba nuclear, cuero, sal y una tos con denominación de origen.'],
      finish:['Final: largo, oscuro y con sirenas antiniebla.','Final: deja la lengua como si hubiera sobrevivido a un ritual druida.']
    };
    for(const [k,v] of Object.entries(peatByKind)) byKind[k].push(...v);
  }
  const ageByKind = age<6 ? {appearance:['Apariencia: joven y brillante, todavía con nervio de novato.'], palate:['Paladar: cereal vivo, vainilla joven y roble empezando a hablar.']}
    : age<12 ? {nose:['Nariz: fruta seca, miel oscura y especias de barrica bien llevada.'], finish:['Final: madera integrada, cálido, con paciencia de sobremesa.']}
    : {appearance:['Apariencia: ámbar profundo, de mirar dos veces.'], nose:['Nariz: cuero viejo, fruta confitada, cacao seco y roble profundo.']};
  for(const [k,v] of Object.entries(ageByKind)) byKind[k].push(...v);
  const qByKind = q<55 ? {nose:['Nariz: garrafa castigada por el destino, pero con autoestima.'], palate:['Paladar: notas de matarratas industrial con ambición de sobremesa.'], finish:['Final: ideal para tomar con cocacola. Pero sin el whisky.']}
    : q<75 ? {nose:['Nariz: algo rústica, entre almacén noble y barril enfadado.'], finish:['Final: regusto entre alquitrán educado y tierra mojada.']}
    : q>92 ? {palate:['Paladar: fino, equilibrado, de esos que miran por encima del hombro.'], finish:['Final: largo y limpio, como si alguien hubiera hecho los deberes.']}
    : {};
  for(const [k,v] of Object.entries(qByKind)) byKind[k].push(...v);
  return ['appearance','nose','palate','finish'].map(k=>stablePick(`${lot.id}-${k}`, byKind[k], 1)[0]);
}
function bottleTimelineMaxAge(lots){
  return Math.max(.1, ...lots.flatMap(l=>[Number(l.age)||0, ...normalizeComponents(l, Math.max(0,(Number(l.bottles)||0)*BOTTLE_LITRES), 'Botellas históricas').map(c=>Number(c.age)||0)]));
}
function compositionPieHtml(lot){
  const comps=normalizeComponents(lot, Math.max(0,(Number(lot.bottles)||0)*BOTTLE_LITRES), 'Botellas históricas');
  const total=comps.reduce((a,c)=>a+c.litres,0) || 1;
  let from=0;
  const stops=[];
  const legend=[];
  const segments=[];
  for(const c of comps){
    const part=clamp(c.litres/total*100,0,100);
    const to=from+part;
    const color=c.color || liquidColor(c.id || c.label || String(from));
    const label=displayLiquidLabel(c.label);
    const segmentTip=`${label}: ${Math.round(part)}% (${Math.round(c.litres)}l) · ⭐${Math.round(qualityOrDefault(c.quality))} · 🕰️${(Number(c.age)||0).toFixed(1)}a · 🧪${Math.round(c.abv||lot.abv||0)}° · 🪵${Math.round(c.peatPpm||0)}ppm`;
    stops.push(`${color} ${from.toFixed(2)}% ${to.toFixed(2)}%`);
    legend.push(segmentTip);
    segments.push({from, to, tip:segmentTip});
    from=to;
  }
  const tip=legend.join('\n');
  const style=`--pie:${stops.join(',') || '#6d4a25 0 100%'}`;
  return `<div class="lot-liquid-pie" style="${style}" data-tip="${escapeHtml(tip)}" data-pie-summary="${escapeHtml(tip)}" data-pie-segments="${escapeHtml(JSON.stringify(segments))}"><i></i><span>${Math.round(total)}l</span></div>`;
}
function compositionTimelineHtml(lot, globalMaxAge){
  const comps=normalizeComponents(lot, Math.max(0,(Number(lot.bottles)||0)*BOTTLE_LITRES), 'Botellas históricas');
  const total=comps.reduce((a,c)=>a+c.litres,0) || 1;
  const maxAge=Math.max(Number(globalMaxAge)||0, .1);
  const ages=[0, maxAge, ...comps.map(c=>Number(c.age)||0)].filter((v,i,a)=>v>=0 && a.findIndex(x=>Math.abs(x-v)<.05)===i).sort((a,b)=>a-b);
  const axis=`<div class="comp-time-axis">${ages.map(v=>`<b style="left:${clamp(v/maxAge*100,0,100).toFixed(1)}%">${v.toFixed(v%1?.1:0)}a</b>`).join('')}</div>`;
  const rows=comps.map(c=>{
    const age=clamp(Number(c.age)||0,0,maxAge), width=clamp(age/maxAge*100,2,100), volPct=clamp(c.litres/total*100,0,100);
    const label=`${displayLiquidLabel(c.label)} · ${Math.round(volPct)}% · ⭐${Math.round(qualityOrDefault(c.quality))} · 🕰️${age.toFixed(1)}a · 🧪${Math.round(c.abv||lot.abv||0)}° · 🪵${Math.round(c.peatPpm||0)}ppm`;
    return `<div class="comp-row" data-tip="${escapeHtml(label)}"><span style="left:0%;width:${width.toFixed(1)}%;background:${c.color}"><em>${escapeHtml(label)}</em></span></div>`;
  }).join('');
  return `<div class="comp-timeline">${axis}${rows}</div>`;
}
function barrelTypesForLot(lot){
  const types=[];
  for(const c of (lot.components||[])) for(const t of (c.barrelTrail||[])) if(t && !types.includes(t)) types.push(t);
  for(const x of (lot.lineage||[])){ const t=x.barrelType||x.to||x.from; if(t && !types.includes(t)) types.push(t); }
  return types.length ? types : ['ex_bourbon_barrel'];
}
function lotAchievementStickersHtml(lot){
  const ids=[...(lot.achievements||[])].filter(id=>ACH_BY_ID[id]);
  if(!ids.length) return '';
  return `<div class="lot-achievement-stickers">${ids.map(id=>`<img class="zoomable-sticker" src="${ACH_BY_ID[id].img}" alt="${escapeHtml(ACH_BY_ID[id].name)}" data-tip="Logro desbloqueado con este lote: ${escapeHtml(ACH_BY_ID[id].name)}" onerror="this.src='img/logros/logros 1.png'">`).join('')}</div>`;
}
function barrelImagesHtml(lot){
  const barrels=barrelTypesForLot(lot).map(t=>{ const def=barrelDef(t); return `<img src="${def.image}" alt="${escapeHtml(def.label)}" data-tip="${escapeHtml(def.label)} · ${escapeHtml(def.wood)}">`; }).join('');
  const triple=(lot.lineage||[]).some(x=>Number(x.run)>=3 || /triple/i.test(String(x.kind||x.stage||'')) || Number(x.outputRuns)>=3) || (lot.components||[]).some(c=>Number(c.runs)>=3 || /triple/i.test(String(c.label||'')));
  return `<div class="bottle-history-barrels">${barrels}${triple?`<img src="img/alambique.png" alt="triple destilación" data-tip="Triple destilación">`:''}${lotAchievementStickersHtml(lot)}</div>`;
}
function rewardHtml(text=''){
  return escapeHtml(text)
    .replace(/(\+?\d+\s*k€)/gi, '💰 $1')
    .replace(/(reputación|Reputación)/g, '🏆 $1')
    .replace(/(tina de fermentación|tina)/gi, '🧪 $1')
    .replace(/(Sherry Butt|Port Pipe|Virgin Oak Hogshead|Bourbon|Jerez|barrica|pack)/gi, '🛢️ $1')
    .replace(/(tiempo x\d+)/gi, '⏩ $1');
}
function achievementCardHtml(a){
  const got=hasAchievement(a.id), when=got ? new Date(distillery().achievements[a.id].at||Date.now()).toLocaleDateString('es-ES') : '';
  return `<article class="achievement-card ${got?'unlocked':'locked'}"><div class="achievement-sticker"><img class="${got?'zoomable-sticker':''}" src="${a.img}" alt="${escapeHtml(a.name)}" onerror="this.src='img/logros/logros 1.png'"></div><div class="achievement-copy"><h4>${escapeHtml(a.name)}${got?` <small>Conseguido ${escapeHtml(when)}</small>`:''}</h4><p>${escapeHtml(a.desc)}</p><dl><dt>Condición</dt><dd>${escapeHtml(a.condition)}</dd><dt>Premio</dt><dd class="achievement-reward">${rewardHtml(a.reward)}</dd></dl></div>${debugToolsVisible?`<button class="pixel-btn small force-achievement" type="button" data-ach="${a.id}">Conseguir</button>`:''}</article>`;
}
function showDistilleryStats(){
  let root=$('#distilleryModal');
  if(!root){ root=document.createElement('div'); root.id='distilleryModal'; root.className='distillery-modal hidden'; document.body.appendChild(root); }
  rebuildSoldStatsFromHistory({save:true});
  const d=distillery(), st=d.stats, got=Object.keys(d.achievements||{}).length, loc=state.scotlandLocation, region=loc?SCOTLAND_REGIONS[loc.region]:null;
  const regionBonusHtml=region ? (region.bonusLines||[region.bonus]).map(x=>`<li>${formatBonusInfoLine(x)}</li>`).join('') : '';
  root.innerHTML=`<div class="distillery-window"><button class="game-popup-close" type="button" aria-label="Cerrar">×</button><header><div class="trophy-mark">🏆</div><div><h3>${escapeHtml(state.distilleryName || 'Mi destilería')}</h3><p>Ficha de destilería, marcadores y logros.</p></div></header><section class="distillery-score-grid"><b><span><i>🏆</i><em>Reputación</em></span><strong>${Math.round(d.reputation||0)}</strong></b><b><span><i>📦</i><em>Lotes vendidos</em></span><strong>${Math.round(st.lotsSold||0)}</strong></b><b><span><i>🍾</i><em>Botellas vendidas</em></span><strong>${Math.round(st.bottlesSold||0)}</strong></b><b><span><i>🍾/📦</i><em>Mayor lote</em></span><strong>${Math.round(st.maxBottlesLot||0)} bot.</strong></b><b><span><i>🧪</i><em>Litros vendidos</em></span><strong>${Math.round(Number(st.litresSold)||0)} l.</strong></b><b><span><i>🕰️</i><em>Mayor edad</em></span><strong>${(Number(st.oldestSoldAge)||0).toFixed(1)}a</strong></b><b><span><i>💎</i><em>Botella más cara</em></span><strong>${(Number(st.maxBottlePrice)||0).toFixed(2)}€</strong></b><b><span><i>🏅</i><em>Logros</em></span><strong>${got}/${ACHIEVEMENTS.length}</strong></b></section>${region?`<section class="distillery-region-summary" style="--region:${region.color}"><b>🗺️ ${escapeHtml(region.name)}</b><ul class="region-bonus-list region-summary-bonuses">${regionBonusHtml}</ul></section>`:''}<h4 class="achievement-title">Logros</h4><section class="achievement-list">${ACHIEVEMENTS.map(achievementCardHtml).join('')}</section></div>`;
  root.classList.remove('hidden'); playFx('fxCork', .68);
  root.querySelector('.game-popup-close').onclick=()=>{ root.classList.add('hidden'); playFx('fxAhhh', .58); };
  root.onclick=e=>{ if(e.target===root){ root.classList.add('hidden'); playFx('fxAhhh', .58); } };
}
function makeDebugLot(seqOffset=0, overrides={}){
  const id=uuid(), age=overrides.age ?? rnd(3,22), q=overrides.quality ?? rnd(62,99), peat=overrides.peatPpm ?? (Math.random()<.45?rnd(0,50):0), bottles=Math.floor(overrides.bottles ?? rnd(160,980));
  const compCount=overrides.compCount || (Math.random()<.35?3:2), totalL=bottles*BOTTLE_LITRES;
  const types=overrides.types || ['ex_bourbon_barrel','sherry_butt','port_pipe'];
  const comps=Array.from({length:compCount}, (_,i)=>({id:uuid(), label:i===2?'3º dest. exótico':(i?'Jerez viejo':'Bourbon base'), color:liquidColor(`${id}-${i}`), litres:totalL/compCount, age:Math.max(3, age-rnd(0,2)), abv:overrides.abv || rnd(43,58), quality:clamp(q+rnd(-5,4), 45, 100), peatPpm:peat, runs:overrides.triple?3:(i===0?2:3), barrelTrail:[types[i%types.length]]}));
  const lot={id, seq:++state.bottleHistorySeq, bottledAt:Date.now()-seqOffset*86400000, bottles, age, abv:overrides.abv || rnd(43,58), quality:q, peatPpm:peat, components:comps, lineage:types.slice(0,compCount).map(t=>({stage:'debug_barrica', barrelType:t})), sold:!!overrides.sold, salePricePerBottle:0, saleTotal:0};
  lot.image=chooseBottleArt(lot); if(lot.sold){ lot.salePricePerBottle=rnd(8,80); lot.saleTotal=lot.salePricePerBottle*bottles; lot.soldAt=Date.now()-seqOffset*86000000; }
  return lot;
}
let bottleHistorySort = 'chrono';
function bottleSortValue(lot, key){
  if(key==='bottles') return Number(lot.bottles)||0;
  if(key==='quality') return qualityOrDefault(lot.quality);
  if(key==='age') return Number(lot.age)||0;
  if(key==='abv') return Number(lot.abv)||0;
  if(key==='peat') return Number(lot.peatPpm)||0;
  return Number(lot.seq)||0;
}
function renderBottleHistoryList(){
  const list=$('#bottleHistoryList');
  if(!list) return;
  const lots=[...(state.bottleHistory||[])].sort((a,b)=>bottleSortValue(b,bottleHistorySort)-bottleSortValue(a,bottleHistorySort));
  const timelineMax=bottleTimelineMaxAge(state.bottleHistory||[]);
  list.innerHTML = lots.length ? lots.map(l=>`<article class="bottle-history-card">
    <div class="bottle-history-cover"><img src="${bottleArtImg(l)}" onerror="${bottleArtFallback}" alt="botella" draggable="false"></div>
    <div class="bottle-history-main"><div class="bottle-history-kpis"><b class="lot-label" data-tip="Número de lote embotellado.">Lote #${l.seq}</b><b data-tip="Botellas embotelladas en este lote.">🍾 ${l.bottles}</b><b class="quality-kpi" data-tip="Calidad media del lote.">⭐ Q ${Math.round(qualityOrDefault(l.quality))}</b><b data-tip="Edad del whisky más joven del lote.">🕰️ ${Math.floor(l.age||0)} años</b><b data-tip="Gradación alcohólica final.">🧪 ${Math.round(l.abv||0)}°</b><b data-tip="Contenido de turba del lote.">🪵 ${Math.round(l.peatPpm||0)}ppm</b></div>${compositionTimelineHtml(l,timelineMax)}<div class="bottle-history-lower">${compositionPieHtml(l)}${barrelImagesHtml(l)}<ul>${tastingNotes(l).map(n=>`<li>${escapeHtml(n)}</li>`).join('')}</ul></div></div>
    <div class="bottle-history-price">${l.sold?`<strong>${(l.salePricePerBottle||0).toFixed(2)}€ / bot.</strong><span>Total ${(l.saleTotal||0).toFixed(0)}€</span>`:'<strong>En tienda</strong>'}</div>
  </article>`).join('') : '<div class="bottle-history-empty">Aún no hay botellas embotelladas en el histórico.</div>';
}
function showBottleHistory(){
  let root=$('#bottleHistoryModal');
  if(!root){ root=document.createElement('div'); root.id='bottleHistoryModal'; root.className='bottle-history-modal hidden'; document.body.appendChild(root); }
  root.innerHTML=`<div class="bottle-history-window"><button class="game-popup-close" type="button" aria-label="Cerrar">×</button><header><img src="img/bottles/bottle_title.png" onerror="${bottleArtFallback}" alt=""><div><h3>Archivo de botellas</h3><p>Histórico de lotes embotellados, vendidos o todavía en tienda.</p></div></header><div class="bottle-history-toolbar"><select id="bottleHistorySort"><option value="chrono">Cronológico</option><option value="bottles">🍾 Botellas</option><option value="quality">⭐ Calidad</option><option value="age">🕰️ Años</option><option value="abv">🧪 Gradación</option><option value="peat">🪵 Turba ppm</option></select></div><section id="bottleHistoryList"></section></div>`;
  root.classList.remove('hidden');
  $('#bottleHistorySort').value=bottleHistorySort;
  $('#bottleHistorySort').onchange=e=>{ bottleHistorySort=e.target.value; renderBottleHistoryList(); };
  root.querySelector('.game-popup-close').onclick=()=>{ root.classList.add('hidden'); playFx('fxAhhh', .58); };
  root.onclick=e=>{ if(e.target===root){ root.classList.add('hidden'); playFx('fxAhhh', .58); } };
  playFx('fxCork', .68); renderBottleHistoryList();
}
function closeTopPopupByEsc(){
  if(closeMarketSimulator(true)) return true;
  const distilleryModal=$('#distilleryModal:not(.hidden)');
  if(distilleryModal){ distilleryModal.querySelector('.game-popup-close')?.click(); return true; }
  const bottleHistory=$('#bottleHistoryModal:not(.hidden)');
  if(bottleHistory){ bottleHistory.querySelector('.game-popup-close')?.click(); return true; }
  if(closeAdvertisingShop(true)) return true;
  if(barrelShopOpen) return closeBarrelShop(true);
  const bottleModal=$('#bottleModal');
  if(bottleModal){ $('#bottleCancel')?.click(); return true; }
  const popup=$('#gamePopup:not(.hidden)');
  if(popup){ popup.querySelector('.cancel, .game-popup-close, .ok')?.click(); return true; }
  if(closeOverlay('#magnitudesModal')) return true;
  if(closeOverlay('#helpModal', {silent:true})) return true;
  return false;
}
function clearVat(v){ const unlocked=!!v?.unlocked, capacityPct=vatCapacityPct(v), capacityUpgrades=vatUpgradeCount(v); Object.assign(v,newVat(unlocked), {capacityPct, capacityUpgrades}); }
function clearStillInput(s){ const unlocked=!!s?.unlocked; Object.assign(s,{unlocked, input:0, inputAbv:0, inputQuality:100, inputPeatPpm:0, inputLineage:[], inputComponents:[], runs:0}); }
function clearStillOutput(s){ const unlocked=!!s?.unlocked; Object.assign(s,{unlocked, output:0, outputAbv:0, outputQuality:100, outputPeatPpm:0, outputLineage:[], outputRuns:0}); }
function recordMarketSample(now=Date.now(), force=false){
  if(!Array.isArray(state.marketHistory)) state.marketHistory=[];
  if(force || !state.marketHistory.length || now-(state.marketHistoryAt||0)>=MARKET_HISTORY_SAMPLE_MS){
    state.marketHistory.push({t:now, p:clamp(Number(state.market)||MARKET_MID, marketLowerBound(), marketUpperBound())});
    state.marketHistory=state.marketHistory.slice(-MARKET_HISTORY_MAX);
    state.marketHistoryAt=now;
  }
}
function updateMarketTrend(now=Date.now()){
  if(now >= (state.marketTrendUntil || 0)){
    const min=marketLowerBound(), max=marketUpperBound();
    const r = Math.random();
    state.marketTarget = r < .24 ? rnd(min + .02, min + .25)
      : r > .76 ? rnd(max - .25, max - .02)
      : rnd(min + .20, max - .20);
    state.marketTrend = rnd(-.006, .006);
    state.marketVolatility = rnd(.010, .030);
    state.marketTrendUntil = now + rnd(7000, 26000);
  }
}
function marketSparklineHtml(){
  const data=(Array.isArray(state.marketHistory) && state.marketHistory.length ? state.marketHistory : [{p:state.market}]).slice(-30);
  const w=220,h=58,pad=5;
  const vals=data.map(x=>Number(x.p)||state.market);
  const min=Math.min(...vals), max=Math.max(...vals), span=Math.max(.15,max-min);
  const points=vals.map((v,i)=>`${pad+(i/(Math.max(1,vals.length-1)))*(w-pad*2)},${h-pad-((v-min)/span)*(h-pad*2)}`).join(' ');
  return `<div class="market-spark"><svg class='market-chart' viewBox='0 0 ${w} ${h}' aria-label='histórico reciente'><polyline points='${points}'></polyline><text x='4' y='11'>histórico reciente</text></svg><span class="market-side"><em>${max.toFixed(2)}€</em><b>${state.market.toFixed(2)}€</b><em>${min.toFixed(2)}€</em></span></div>`;
}
function updateMarketHud(){
  const market=$('#market');
  if(!market) return;
  const min=marketLowerBound(), max=marketUpperBound();
  market.textContent = `${state.market.toFixed(2)} €`;
  market.closest('.stat, .market')?.setAttribute('data-tip', `Precio de mercado: ${state.market.toFixed(2)} € x botella x años.\nRango actual: ${min.toFixed(2)}€ - ${max.toFixed(2)}€.\nLa calidad multiplica el precio: Q90 = x0.90.\nClick: abrir simulador de embotellado.\n${marketSparklineHtml()}`);
}
function ensureDragMarketChart(){
  let el=$('#dragMarketChart');
  if(!el){ el=document.createElement('div'); el.id='dragMarketChart'; el.className='drag-market-chart hidden'; document.body.appendChild(el); }
  return el;
}
function updateDragMarketChart(){
  const el=ensureDragMarketChart();
  if(dragging?.data?.drag==='box'){
    const b=state.boxes.find(x=>x.id===dragging.data.id);
    const est=b ? b.bottles * Math.max(.1,b.age) * state.market * ((b.quality || 100)/100) : 0;
    el.innerHTML=`<b>📈 Mercado vivo</b>${marketSparklineHtml()}<strong>${state.market.toFixed(2)}€</strong><span>Valor estimado caja: ${Math.round(est)}€</span>`;
    el.classList.remove('hidden');
  } else el.classList.add('hidden');
}
const MARKET_SIM_DEFAULTS = {litres:1000, quality:95, initialAbv:63.5, bottleAbv:46, years:40};
const marketSimEuro = n => `${Math.round(n).toLocaleString('es-ES')}€`;
const marketSimYear = n => `${Math.round(n).toLocaleString('es-ES')} años`;
function marketSimAgedLitres(initialLitres, years){ return initialLitres * Math.pow(.95, Math.floor(Math.max(0, years))); }
function ensureMarketSimModal(){
  let root=$('#marketSimModal');
  if(root) return root;
  root=document.createElement('div');
  root.id='marketSimModal';
  root.className='market-sim-modal hidden';
  root.innerHTML=`<div class="market-sim-window">
    <button class="game-popup-close market-sim-close" type="button" aria-label="Cerrar">×</button>
    <header><h3>Simulador de embotellado</h3><p>Ganancia estimada por años de barrica, volumen perdido y mercado.</p></header>
    <section class="market-sim-shell">
      <form class="market-sim-controls" id="marketSimControls">
        <label>Litros al embarricar <input id="simLitres" type="number" min="1" step="10"></label>
        <label>Calidad Q <input id="simQuality" type="number" min="1" max="100" step="1"></label>
        <label>Grado inicial <input id="simInitialAbv" type="number" min="40" max="90" step=".1"></label>
        <label class="sim-range-label">Grado al embotellar <span id="simBottleAbvLabel"></span><input id="simBottleAbv" type="range" min="40" max="90" step="1"></label>
        <label>Años máximos <input id="simYears" type="number" min="3" max="60" step="1"></label>
      </form>
      <section class="market-sim-chart-panel">
        <canvas id="marketSimChart" width="960" height="420"></canvas>
        <div class="market-sim-chart-tip hidden" id="marketSimChartTip"></div>
        <div class="market-sim-legend">
          <span id="simLegendMin"><i style="--c:#ff7c65"></i></span>
          <span id="simLegendMid"><i style="--c:#f0b75b"></i></span>
          <span id="simLegendMax"><i style="--c:#a8e36f"></i></span>
        </div>
        <div class="market-sim-kpis">
          <div class="market-sim-kpi"><small><i>⏳</i><em>Óptimo medio</em></small><strong id="simBestYear">-</strong></div>
          <div class="market-sim-kpi"><small><i>💶</i><em>Ingreso medio</em></small><strong id="simBestMoney">-</strong></div>
          <div class="market-sim-kpi"><small><i>🍾</i><em>Botellas</em></small><strong id="simBestBottles">-</strong></div>
          <div class="market-sim-kpi"><small><i>🧪</i><em>Volumen final</em></small><strong id="simBestLitres">-</strong></div>
        </div>
      </section>
    </section>
    <section class="market-sim-formula">
      <img src="img/bottles/bottle_18Q.png" alt="Botella">
      <div id="marketSimFormula"></div>
    </section>
  </div>`;
  document.body.appendChild(root);
  root.querySelector('.market-sim-close').onclick=()=>closeMarketSimulator(true);
  root.onclick=e=>{ if(e.target===root) closeMarketSimulator(true); };
  root.querySelector('#marketSimControls').addEventListener('input', drawMarketSimulator);
  root.querySelector('#marketSimChart').addEventListener('pointermove', handleMarketSimChartMove);
  root.querySelector('#marketSimChart').addEventListener('pointerleave', ()=>root.querySelector('#marketSimChartTip')?.classList.add('hidden'));
  return root;
}
function marketSimEls(root=ensureMarketSimModal()){
  return Object.fromEntries(['simLitres','simQuality','simInitialAbv','simBottleAbv','simBottleAbvLabel','simYears','simBestYear','simBestMoney','simBestBottles','simBestLitres','marketSimFormula','marketSimChart','marketSimChartTip','simLegendMin','simLegendMid','simLegendMax'].map(id=>[id, root.querySelector(`#${id}`)]));
}
function setMarketSimDefaults(root=ensureMarketSimModal()){
  const els=marketSimEls(root), d=MARKET_SIM_DEFAULTS;
  els.simLitres.value=d.litres; els.simQuality.value=d.quality; els.simInitialAbv.value=d.initialAbv; els.simBottleAbv.value=d.bottleAbv; els.simYears.value=d.years;
}
function marketSimValues(root=ensureMarketSimModal()){
  const els=marketSimEls(root);
  const initialAbv=clamp(Number(els.simInitialAbv.value)||MARKET_SIM_DEFAULTS.initialAbv, 40, 90);
  const maxBottle=Math.max(40, initialAbv);
  els.simBottleAbv.max=String(maxBottle);
  const bottleAbv=Math.round(clamp(Number(els.simBottleAbv.value)||MARKET_SIM_DEFAULTS.bottleAbv, 40, maxBottle));
  els.simBottleAbv.value=bottleAbv;
  els.simBottleAbvLabel.textContent=`${bottleAbv}°`;
  return {
    litres:Math.max(1, Number(els.simLitres.value)||MARKET_SIM_DEFAULTS.litres),
    quality:clamp(Number(els.simQuality.value)||MARKET_SIM_DEFAULTS.quality, 1, 100),
    initialAbv,
    bottleAbv,
    years:clamp(Math.floor(Number(els.simYears.value)||MARKET_SIM_DEFAULTS.years), 3, 60)
  };
}
function marketSimResultAt(year, price, v){
  const barrelL=marketSimAgedLitres(v.litres, year);
  const finalL=barrelL * v.initialAbv / v.bottleAbv;
  const bottles=Math.floor(finalL / BOTTLE_LITRES);
  const money=bottles * Math.max(.1, year) * price * (v.quality / 100);
  return {year, price, barrelL, finalL, bottles, money};
}
function marketSimEnvelope(price, v){
  const points=[];
  for(let y=0; y<v.years; y++) points.push(marketSimResultAt(Math.min(v.years, y + .99), price, v));
  points.push(marketSimResultAt(v.years, price, v));
  return points;
}
function smoothMarketSimLine(ctx, pts){
  if(!pts.length) return;
  ctx.beginPath();
  ctx.moveTo(pts[0].sx, pts[0].sy);
  for(let i=1; i<pts.length-1; i++){
    const midX=(pts[i].sx+pts[i+1].sx)/2, midY=(pts[i].sy+pts[i+1].sy)/2;
    ctx.quadraticCurveTo(pts[i].sx, pts[i].sy, midX, midY);
  }
  if(pts.length>1) ctx.lineTo(pts[pts.length-1].sx, pts[pts.length-1].sy);
}
function drawMarketSimulator(){
  const root=ensureMarketSimModal(), els=marketSimEls(root), v=marketSimValues(root);
  const min=marketLowerBound(), max=marketUpperBound(), mid=(min+max)/2;
  els.simLegendMin.innerHTML='<i style="--c:#ff7c65"></i>Mercado mínimo '+min.toFixed(2)+'€';
  els.simLegendMid.innerHTML='<i style="--c:#f0b75b"></i>Mercado medio '+mid.toFixed(2)+'€';
  els.simLegendMax.innerHTML='<i style="--c:#a8e36f"></i>Mercado máximo '+max.toFixed(2)+'€';
  const series=[
    {price:min, color:'#ff7c65', label:'mínimo'},
    {price:mid, color:'#f0b75b', label:'medio'},
    {price:max, color:'#a8e36f', label:'máximo'}
  ].map(s=>({...s, data:marketSimEnvelope(s.price, v)}));
  const best=series[1].data.reduce((a,b)=>b.money>a.money?b:a, series[1].data[0]);
  els.simBestYear.textContent=marketSimYear(best.year);
  els.simBestMoney.textContent=marketSimEuro(best.money);
  els.simBestBottles.textContent=best.bottles.toLocaleString('es-ES');
  els.simBestLitres.textContent=`${Math.round(best.finalL).toLocaleString('es-ES')} l`;
  els.marketSimFormula.innerHTML=[
    'Volumen en barrica = litros iniciales x 0,95 por cada año entero.',
    'Litros finales = litros de barrica x grado inicial / grado de embotellado.',
    'Botellas = litros finales / 0,7.',
    `Rango de mercado actual con publicidad: ${min.toFixed(2)}€ - ${max.toFixed(2)}€ (${advertisingBought()} campañas compradas).`,
    'Venta = botellas x años x precio de mercado x Q/100.'
  ].map(x=>`<span>${x}</span>`).join('');
  const canvas=els.marketSimChart, ctx=canvas.getContext('2d');
  const dpr=Math.max(1, Math.min(2, devicePixelRatio || 1)), rect=canvas.getBoundingClientRect();
  canvas.width=Math.floor(rect.width*dpr); canvas.height=Math.floor(rect.height*dpr); ctx.setTransform(dpr,0,0,dpr,0,0);
  const w=rect.width, h=rect.height, pad={l:68,r:20,t:18,b:44};
  const maxMoney=Math.max(1, ...series.flatMap(s=>s.data.map(p=>p.money)));
  const x=year=>pad.l + (year / v.years) * (w - pad.l - pad.r);
  const y=money=>h - pad.b - (money / maxMoney) * (h - pad.t - pad.b);
  ctx.clearRect(0,0,w,h);
  ctx.fillStyle='rgba(0,0,0,.24)'; ctx.fillRect(pad.l,pad.t,w-pad.l-pad.r,h-pad.t-pad.b);
  ctx.strokeStyle='rgba(255,232,189,.13)'; ctx.lineWidth=1; ctx.fillStyle='rgba(255,232,189,.70)'; ctx.font='900 11px ui-monospace, monospace';
  for(let i=0;i<=5;i++){ const yy=pad.t+i*(h-pad.t-pad.b)/5; ctx.beginPath(); ctx.moveTo(pad.l,yy); ctx.lineTo(w-pad.r,yy); ctx.stroke(); ctx.fillText(marketSimEuro(maxMoney*(1-i/5)),8,yy+4); }
  for(let year=0; year<=v.years; year+=Math.max(1, Math.ceil(v.years/8))){ const xx=x(year); ctx.beginPath(); ctx.moveTo(xx,pad.t); ctx.lineTo(xx,h-pad.b); ctx.stroke(); ctx.fillText(`${year}a`, xx-10, h-16); }
  marketSimChartPoints=[];
  for(const s of series){
    const pts=s.data.map(p=>({...p, sx:x(p.year), sy:y(p.money), color:s.color, label:s.label}));
    marketSimChartPoints.push(...pts);
    ctx.strokeStyle=s.color; ctx.lineWidth=3.5; ctx.lineJoin='round'; ctx.lineCap='round'; ctx.shadowColor=s.color; ctx.shadowBlur=10;
    smoothMarketSimLine(ctx, pts); ctx.stroke(); ctx.shadowBlur=0;
  }
  const bx=x(best.year), by=y(best.money);
  ctx.fillStyle='#fff2c8'; ctx.strokeStyle='#130c08'; ctx.lineWidth=4; ctx.beginPath(); ctx.arc(bx,by,6,0,Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#fff2c8'; ctx.font='1000 12px ui-monospace, monospace';
  ctx.fillText(`Óptimo ${Math.round(best.year)}a · ${marketSimEuro(best.money)}`, Math.min(bx+10, w-240), Math.max(18, by-10));
}
function handleMarketSimChartMove(e){
  const root=ensureMarketSimModal(), tip=root.querySelector('#marketSimChartTip'), canvas=e.currentTarget;
  if(!tip || !canvas || !marketSimChartPoints.length) return;
  const r=canvas.getBoundingClientRect(), x=e.clientX-r.left, y=e.clientY-r.top;
  let best=null, dist=Infinity;
  for(const p of marketSimChartPoints){
    const d=Math.hypot(p.sx-x, p.sy-y);
    if(d<dist){ dist=d; best=p; }
  }
  if(!best || dist>28){ tip.classList.add('hidden'); return; }
  tip.innerHTML=`<b style="color:${best.color}">Mercado ${best.label}</b><span>${marketSimYear(best.year)}</span><span>${marketSimEuro(best.money)}</span><span>${best.bottles.toLocaleString('es-ES')} botellas · ${Math.round(best.finalL).toLocaleString('es-ES')} l</span>`;
  tip.style.left=`${Math.min(r.width-190, Math.max(10, x+14))}px`;
  tip.style.top=`${Math.min(r.height-86, Math.max(10, y+14))}px`;
  tip.classList.remove('hidden');
}
function openMarketSimulator({toggle=false}={}){
  if(toggle && marketSimOpen) return closeMarketSimulator(true);
  const root=ensureMarketSimModal();
  if(!marketSimOpen) setMarketSimDefaults(root);
  marketSimOpen=true;
  root.classList.remove('hidden');
  playFx('fxCork', .68);
  requestAnimationFrame(drawMarketSimulator);
}
function closeMarketSimulator(play=true){
  const root=$('#marketSimModal');
  if(!root || root.classList.contains('hidden')){ marketSimOpen=false; return false; }
  marketSimOpen=false;
  root.classList.add('hidden');
  root.querySelector('#marketSimChartTip')?.classList.add('hidden');
  if(play) playFx('fxAhhh', .58);
  return true;
}
function advertisingImage(n){ return `img/adds/add${String(n).padStart(2,'0')}.jpg`; }
function advertisingNextCost(){ return AD_CAMPAIGN_COSTS[advertisingBought()] ?? null; }
function advertisingEffectLine(count=advertisingBought()){
  return `${marketLowerBound(count).toFixed(2)}€ - ${marketUpperBound(count).toFixed(2)}€`;
}
function ensureAdvertisingShopModal(){
  let root=$('#advertisingShopModal');
  if(root) return root;
  root=document.createElement('div');
  root.id='advertisingShopModal';
  root.className='advertising-shop-modal hidden';
  document.body.appendChild(root);
  return root;
}
function renderAdvertisingShopModal(){
  const root=ensureAdvertisingShopModal();
  if(!advertisingShopOpen){ root.classList.add('hidden'); root.innerHTML=''; return; }
  const bought=advertisingBought();
  advertisingCarouselIndex=clamp(advertisingCarouselIndex, 0, Math.max(0, bought-1));
  const nextCost=advertisingNextCost();
  const canBuy=nextCost!==null && state.coins>=nextCost;
  const current=bought ? advertisingCarouselIndex + 1 : 1;
  const img=advertisingImage(current);
  const title=bought ? `Campaña ${current}/${bought}` : 'Sin campañas compradas';
  const effectNext=nextCost===null ? 'Todas las campañas compradas.' : `Rango de mercado: ${advertisingEffectLine(bought)} → ${advertisingEffectLine(bought+1)}.`;
  root.innerHTML=`<div class="advertising-shop-window">
    <button class="game-popup-close advertising-shop-close" type="button" aria-label="Cerrar">×</button>
    <header><h3>Publicidad</h3><p>Campañas compradas: ${bought}. Cada campaña sube 0,25€ el mínimo y el máximo del mercado.</p></header>
    <section class="advertising-carousel ${bought ? '' : 'empty'}">
      <button class="ad-carousel-arrow prev" type="button" ${bought>1?'':'disabled'} aria-label="Campaña anterior">‹</button>
      <figure>
        <img src="${escapeHtml(img)}" alt="${escapeHtml(title)}" draggable="false" onerror="this.src='img/adds/add01.jpg'">
        <figcaption>${escapeHtml(title)}<small>Mercado actual: ${advertisingEffectLine()}</small></figcaption>
      </figure>
      <button class="ad-carousel-arrow next" type="button" ${bought>1?'':'disabled'} aria-label="Campaña siguiente">›</button>
    </section>
    <button class="pixel-btn advertising-buy ${canBuy?'':'locked'}" type="button" ${nextCost===null?'disabled':''}>
      ${nextCost===null ? 'Campañas agotadas' : `Comprar Campaña Publicitaria ${actionPrice(nextCost)}`}
    </button>
    <p class="advertising-effect">${escapeHtml(effectNext)}${nextCost!==null && !canBuy ? ` Necesitas ${nextCost} k€.` : ''}</p>
  </div>`;
  root.classList.remove('hidden');
}
function closeAdvertisingShop(play=true){
  const root=$('#advertisingShopModal');
  if(!advertisingShopOpen && (!root || root.classList.contains('hidden'))) return false;
  advertisingShopOpen=false;
  renderAdvertisingShopModal();
  if(play) playFx('fxAhhh', .58);
  return true;
}
function playMarchOnce(){
  const march=$('#fxMarch'), main=$('#mainLoop');
  if(state.fxEnabled === false || !march) return Promise.resolve();
  const shouldResume=!!(main && state.musicEnabled !== false && !main.paused);
  if(main && shouldResume) main.pause();
  return new Promise(resolve=>{
    const finish=()=>{
      march.removeEventListener('ended', finish);
      march.removeEventListener('error', finish);
      if(shouldResume){ musicStarted=false; startMainLoop(); }
      resolve();
    };
    march.currentTime=0;
    march.volume=.82;
    march.addEventListener('ended', finish, {once:true});
    march.addEventListener('error', finish, {once:true});
    march.play().catch(finish);
  });
}
async function showAdvertisingCampaign(n){
  const marchPromise=playMarchOnce();
  await gamePopup({
    title:'Campaña publicitaria',
    mood:'happy',
    html:`<div class="advertising-unlock"><img src="${escapeHtml(advertisingImage(n))}" alt="Campaña publicitaria ${n}" onerror="this.src='img/adds/add01.jpg'"><p><b>Campaña ${n} activada.</b><br>El mercado queda en ${advertisingEffectLine()}.</p></div>`,
    ok:'Perfecto',
    closeFx:'fxAhhh'
  });
  await marchPromise;
}
async function buyAdvertisingCampaign(){
  const bought=advertisingBought(), cost=advertisingNextCost();
  if(cost===null){ notice('Ya has comprado todas las campañas publicitarias.', 'happy', 'Publicidad completa'); return; }
  if(state.coins<cost){ notice(`Necesitas ${cost} k€ para esta campaña publicitaria.`, 'explain', 'No hay dinero'); return; }
  const ok=await gamePopup({
    title:'Comprar campaña',
    mood:'warn',
    confirm:true,
    ok:'Comprar',
    cancel:'Cancelar',
    html:`<p>¿Comprar campaña publicitaria por <b>${cost} k€</b>?</p>`
  });
  if(!ok){ renderAdvertisingShopModal(); return; }
  state.coins=Math.max(0, state.coins-cost);
  state.advertisingCampaigns=bought+1;
  state.market=clamp((Number(state.market)||MARKET_MID)+AD_MARKET_STEP, marketLowerBound(), marketUpperBound());
  state.marketTarget=clamp((Number(state.marketTarget)||state.market)+AD_MARKET_STEP, marketLowerBound(), marketUpperBound());
  advertisingCarouselIndex=state.advertisingCampaigns-1;
  recordMarketSample(Date.now(), true);
  playFx('fxCashRegister', .70);
  markDirty(); render(); saveGame(); renderAdvertisingShopModal();
  await showAdvertisingCampaign(state.advertisingCampaigns);
}
function maltedWarning(t){ return t.status==='filled' && t.heated && (t.stable || 0) > MALT_KILNED_GRACE/2; }
function shouldWarnMalted(t){ return maltedWarning(t) && !t.warned; }
const SCOT_MOODS = {
  angry: ['img/escoces-angry.png','img/escoces-enfadado.png','img/escoces_angry.png','img/scot-angry.png'],
  explain: ['img/escoces-explicando.png','img/escoces_explicando.png','img/scot-explaining.png'],
  warn: ['img/escoces-advirtiendo.png','img/escoces_warning.png','img/scot-warning.png'],
  sad: ['img/escoces-sad.png','img/escoces-triste.png','img/escoces_sad.png','img/scot-sad.png'],
  happy: ['img/escoces-happy.png','img/scot-happy.png']
};
function scotImg(mood='explain'){ return (SCOT_MOODS[mood] || SCOT_MOODS.explain)[0]; }
function popupCloseSound(id='fxAhhh', volume=.68){ if(id) playFx(id, volume); }
function gamePopup({title='Aviso', msg='', html='', mood='explain', confirm=false, ok='Vale', cancel='Cancelar', closeFx='fxAhhh', closeOnAnyClick=false}={}){
  const root=$('#gamePopup'); if(!root){ if(confirm) return Promise.resolve(window.confirm(msg)); noticeFallback(msg); return Promise.resolve(true); }
  if(root.parentElement !== document.body) document.body.appendChild(root);
  playFx('fxCork', .72);
  playScotVoice(mood);
  return new Promise(resolve=>{
    const img=scotImg(mood);
    const body = html || `<p>${escapeHtml(msg)}</p>`;
    root.innerHTML=`<div class="game-popup-card ${mood}">
      <button class="game-popup-close" type="button" aria-label="Cerrar">×</button>
      <img class="game-popup-character" src="${img}" alt="" onerror="this.hidden=true">
      <div class="game-popup-copy"><h3>${escapeHtml(title)}</h3>${body}<div class="game-popup-actions"><button class="pixel-btn small ok" type="button">${escapeHtml(ok)}</button>${confirm?`<button class="pixel-btn small danger cancel" type="button">${escapeHtml(cancel)}</button>`:''}</div></div>
    </div>`;
    root.classList.remove('hidden');
    const done=answer=>{ root.classList.add('hidden'); root.innerHTML=''; popupCloseSound(closeFx, .68); resolve(answer); };
    root.querySelector('.ok')?.addEventListener('click', e=>{ e.stopPropagation(); done(true); });
    root.querySelector('.cancel')?.addEventListener('click', e=>{ e.stopPropagation(); done(false); });
    root.querySelector('.game-popup-close')?.addEventListener('click', e=>{ e.stopPropagation(); done(false); });
    root.onclick = e=>{ if(closeOnAnyClick || e.target===root) done(false); };
  });
}
let scotlandMapMode = 'view';
let scotlandMapHover = null;
let scotlandTransitioning = false;
let scotlandZoom = {scale:1, x:0, y:0};
let scotlandPan = null;
let scotlandSuppressClick = false;
let scotlandSelectPointerHandled = false;
let scotlandSelectClickBusy = false;
let scotlandReturnHudCollapsed = null;
let publicScotlandPlayers = [];
let selectedPublicPlayerIds = new Set();
const SCOTLAND_COMPARE_COLORS = ['#7de1ff', '#ff9ad5', '#a7e184'];
const SCOTLAND_ZOOM_MIN = .72;
const SCOTLAND_ZOOM_MAX = 2.85;
function scotlandRegionLayersHtml(){
  return `<div class="scotland-region-layers">${SCOTLAND_REGION_ORDER.map(region=>`<img class="scotland-region-mask" data-region="${escapeHtml(region.id)}" src="${escapeHtml(region.mask)}" alt="" draggable="false">`).join('')}</div>`;
}
function ensureScotlandMapOverlay(){
  let root=$('#scotlandMapOverlay');
  if(root) return root;
  root=document.createElement('div');
  root.id='scotlandMapOverlay';
  root.className='scotland-map-overlay hidden';
  root.innerHTML=`<div class="scotland-map-stage">
    <img class="scotland-base-map" src="img/mapa/mapa.jpg" alt="Mapa de Escocia" draggable="false">
    ${scotlandRegionLayersHtml()}
  </div><div class="scotland-other-markers"></div><figure class="scotland-player-marker hidden"><img class="scotland-player-dest" alt="Destilería" draggable="false"><figcaption></figcaption></figure><aside id="scotlandSocialPanel" class="scotland-social-panel"></aside><aside class="scotland-player-card hidden"></aside><aside class="scotland-region-card hidden"></aside><div class="scotland-select-cursor">📍</div><div class="scotland-map-hint"></div>`;
  document.body.appendChild(root);
  root.addEventListener('pointermove', handleScotlandMapMove);
  root.addEventListener('pointerleave', clearScotlandHover);
  root.addEventListener('click', handleScotlandMapClick);
  root.addEventListener('wheel', handleScotlandWheel, {passive:false});
  root.addEventListener('pointerdown', startScotlandPan);
  root.addEventListener('pointerup', handleScotlandSelectPointerUp);
  root.addEventListener('pointerup', endScotlandPan);
  root.addEventListener('pointercancel', endScotlandPan);
  return root;
}
function applyScotlandZoom(root=ensureScotlandMapOverlay()){
  scotlandZoom = clampScotlandZoom(scotlandZoom);
  const st=root.querySelector('.scotland-map-stage');
  if(st) st.style.transform=`translate(${scotlandZoom.x}px, ${scotlandZoom.y}px) scale(${scotlandZoom.scale})`;
  renderPlayerDistilleryOnMap(root);
  renderOtherScotlandPlayers(root);
}
function resetScotlandZoom(root=ensureScotlandMapOverlay()){ scotlandZoom={scale:1,x:0,y:0}; applyScotlandZoom(root); }
function clampScotlandZoom(z=scotlandZoom){
  const scale=clamp(Number(z.scale)||1,SCOTLAND_ZOOM_MIN,SCOTLAND_ZOOM_MAX);
  const margin=Math.max(120, Math.min(260, Math.min(innerWidth, innerHeight)*.16));
  const minX=innerWidth - innerWidth*scale - margin;
  const minY=innerHeight - innerHeight*scale - margin;
  return {scale, x:clamp(Number(z.x)||0, minX, margin), y:clamp(Number(z.y)||0, minY, margin)};
}
function setScotlandZoom(nextScale, cx=innerWidth/2, cy=innerHeight/2){
  const old=scotlandZoom.scale, scale=clamp(Number(nextScale)||1,SCOTLAND_ZOOM_MIN,SCOTLAND_ZOOM_MAX);
  const localX=(cx-scotlandZoom.x)/old, localY=(cy-scotlandZoom.y)/old;
  scotlandZoom.scale=scale;
  scotlandZoom.x=cx-localX*scale;
  scotlandZoom.y=cy-localY*scale;
  applyScotlandZoom();
}
function handleScotlandWheel(e){ e.preventDefault(); e.stopPropagation(); setScotlandZoom(scotlandZoom.scale + (e.deltaY < 0 ? .22 : -.22), e.clientX, e.clientY); }
function startScotlandPan(e){
  const root=e.currentTarget;
  const leftViewDrag=e.button===0 && root.classList.contains('view-mode') && !e.target.closest('.scotland-social-panel,.scotland-player-marker,.scotland-player-card,.scotland-region-card,.scotland-map-hint,.scotland-other-marker');
  if(!(e.button===1 || leftViewDrag) || !root.classList.contains('visible')) return;
  e.preventDefault(); e.stopPropagation();
  scotlandPan={pointerId:e.pointerId,x:e.clientX,y:e.clientY,startX:scotlandZoom.x,startY:scotlandZoom.y,moved:false};
  root.setPointerCapture?.(e.pointerId);
}
function moveScotlandPan(e){
  if(!scotlandPan || e.pointerId!==scotlandPan.pointerId) return false;
  e.preventDefault();
  if(Math.hypot(e.clientX-scotlandPan.x, e.clientY-scotlandPan.y)>4) scotlandPan.moved=true;
  scotlandZoom.x=scotlandPan.startX + e.clientX - scotlandPan.x;
  scotlandZoom.y=scotlandPan.startY + e.clientY - scotlandPan.y;
  applyScotlandZoom();
  return true;
}
function endScotlandPan(e){
  if(scotlandPan && (e?.pointerId===undefined || e.pointerId===scotlandPan.pointerId)){
    if(scotlandPan.moved) scotlandSuppressClick=true;
    scotlandPan=null;
  }
}
function isScotlandControlTarget(target){
  return !!target?.closest?.('.scotland-social-panel,.scotland-player-marker,.scotland-player-card,.scotland-region-card,.scotland-map-hint,.scotland-other-marker');
}
function handleScotlandSelectPointerUp(e){
  const root=e.currentTarget;
  if(e.button!==0 || !root.classList.contains('visible') || !root.classList.contains('select-mode')) return;
  if(scotlandTransitioning || scotlandPan || isScotlandControlTarget(e.target)) return;
  e.preventDefault(); e.stopPropagation();
  scotlandSelectPointerHandled = true;
  handleScotlandMapClick(e, {fromPointer:true});
}
function scotlandMapBox(root=ensureScotlandMapOverlay()){
  const img=root.querySelector('.scotland-base-map');
  const r=img.getBoundingClientRect();
  const nw=img.naturalWidth||2280, nh=img.naturalHeight||1282;
  const s=Math.min(r.width/nw, r.height/nh);
  const w=nw*s, h=nh*s;
  return {left:r.left+(r.width-w)/2, top:r.top+(r.height-h)/2, width:w, height:h, nw, nh};
}
function scotlandImagePoint(clientX, clientY, root=ensureScotlandMapOverlay()){
  const b=scotlandMapBox(root);
  const x=(clientX-b.left)/b.width, y=(clientY-b.top)/b.height;
  if(x<0 || x>1 || y<0 || y>1) return null;
  return {x,y, ix:Math.floor(x*b.nw), iy:Math.floor(y*b.nh), box:b};
}
function scotlandRegionFromImagePoint(pt){
  if(!pt) return null;
  const offsets=[0, -4, 4, -8, 8, -12, 12];
  if(scotlandHitMap?.pixels){
    const sx=scotlandHitMap.w / pt.box.nw, sy=scotlandHitMap.h / pt.box.nh;
    for(const oy of offsets) for(const ox of offsets){
      const hx=clamp(Math.floor((pt.ix+ox)*sx),0,scotlandHitMap.w-1), hy=clamp(Math.floor((pt.iy+oy)*sy),0,scotlandHitMap.h-1);
      const code=scotlandHitMap.pixels[hy*scotlandHitMap.w+hx];
      if(code) return {...scotlandHitMap.regions[code-1], point:pt};
    }
    return null;
  }
  for(const region of SCOTLAND_REGION_ORDER){
    const mask=scotlandMaskCache.get(region.id);
    if(!mask?.ctx) continue;
    try{
      for(const oy of offsets) for(const ox of offsets){
        const px=mask.ctx.getImageData(clamp(pt.ix+ox,0,mask.w-1), clamp(pt.iy+oy,0,mask.h-1), 1, 1).data;
        if(px[3] > 12) return {...region, point:pt};
      }
    }catch(_){ }
  }
  return null;
}
function scotlandRegionAt(clientX, clientY, root=ensureScotlandMapOverlay()){
  return scotlandRegionFromImagePoint(scotlandImagePoint(clientX, clientY, root));
}
function formatBonusInfoLine(line){
  return escapeHtml(line).replace(/&lt;em&gt;/g,'<em>').replace(/&lt;\/em&gt;/g,'</em>');
}
function regionInfoHtml(region){
  if(!region) return '';
  const bonuses=(region.bonusLines?.length ? region.bonusLines : [region.bonus]).map(x=>`<li>${formatBonusInfoLine(x)}</li>`).join('');
  return `<h3 style="--region:${region.color}">${escapeHtml(region.name)}</h3><p>${escapeHtml(region.desc)}</p><dl><dt>Destilerías</dt><dd>${escapeHtml(region.example)}</dd><dt>Bonus</dt><dd><ul class="region-bonus-list">${bonuses}</ul></dd></dl>`;
}
function updateScotlandHover(region, clientX=innerWidth/2, clientY=innerHeight/2){
  const root=ensureScotlandMapOverlay(), masks=[...root.querySelectorAll('.scotland-region-mask')], card=root.querySelector('.scotland-region-card'), cursor=root.querySelector('.scotland-select-cursor');
  const regionChanged=region?.id !== scotlandMapHover?.id;
  scotlandMapHover = region;
  root.classList.toggle('valid-region', !!region && scotlandMapMode==='select');
  if(cursor){ cursor.style.left=`${clientX}px`; cursor.style.top=`${clientY}px`; }
  if(!regionChanged) return;
  for(const mask of masks){
    const active=!!region && mask.dataset.region===region.id;
    mask.classList.toggle('active', active);
    mask.style.opacity=active ? (scotlandMapMode==='view' ? '.4' : '.5') : '0';
  }
  if(region){
    root.style.setProperty('--region', region.color);
    card.innerHTML=regionInfoHtml(region); card.classList.remove('hidden'); card.style.setProperty('--region', region.color);
  } else {
    card.classList.add('hidden'); card.innerHTML='';
  }
}
function clearScotlandHover(){ updateScotlandHover(null); }
function handleScotlandMapMove(e){
  if(scotlandTransitioning) return;
  if(moveScotlandPan(e)) return;
  const region=scotlandRegionAt(e.clientX, e.clientY, e.currentTarget || undefined);
  if(region?.id !== scotlandMapHover?.id) updateScotlandHover(region, e.clientX, e.clientY);
  else if(scotlandMapMode==='select') updateScotlandHover(scotlandMapHover, e.clientX, e.clientY);
}
function chosenDistilleryAsset(){ return SCOTLAND_DESTILLERY_ASSETS[Math.floor(Math.random()*SCOTLAND_DESTILLERY_ASSETS.length)] || SCOTLAND_DESTILLERY_ASSETS[0]; }
function renderPlayerDistilleryOnMap(root=ensureScotlandMapOverlay()){
  const marker=root.querySelector('.scotland-player-marker'), img=root.querySelector('.scotland-player-dest'), loc=state.scotlandLocation;
  if(!img || !marker || !loc){ marker?.classList.add('hidden'); return; }
  const box=scotlandMapBox(root);
  img.src=loc.dest || SCOTLAND_DESTILLERY_ASSETS[0];
  marker.style.left=`${box.left + box.width*loc.x}px`;
  marker.style.top=`${box.top + box.height*loc.y}px`;
  marker.querySelector('figcaption').textContent=state.distilleryName || 'Mi destilería';
  marker.classList.remove('hidden');
}
function publicPlayerTip(p){
  return `#${p.rank || '?'} · ${p.publicName || 'Jugador'}\n${p.distilleryName || 'Destilería'}\nRegión: ${regionName(p.region)}\n🏆 Rep ${Math.round(Number(p.reputation)||0)} · ⭐ Q media ${Math.round(Number(p.bestQuality)||0)}\n🍾 ${Math.round(Number(p.bottlesSold)||0)} botellas · 🧪 ${Math.round(Number(p.litresSold)||0)} l\n📦 lote máx ${Math.round(Number(p.maxBottlesLot)||0)} · 🕰️ edad media ${Number(p.oldestSoldAge||0).toFixed(1)}a\nClick: añadir/quitar del radar`;
}
function isSameLocalPublicDistillery(p){
  const mine=window.MiarmaMultiplayer?.currentProfile?.();
  if(!mine || !p) return false;
  const sameCoord=Math.abs((Number(p.x)||0)-mine.x)<0.0001 && Math.abs((Number(p.y)||0)-mine.y)<0.0001;
  return sameCoord
    && String(p.region||'')===String(mine.region||'')
    && String(p.distilleryName||'').trim()===String(mine.distilleryName||'').trim()
    && String(p.distilleryImage||'')===String(mine.distilleryImage||'');
}
function renderOtherScotlandPlayers(root=ensureScotlandMapOverlay()){
  const layer=root.querySelector('.scotland-other-markers');
  if(!layer){ return; }
  layer.innerHTML='';
  const box=scotlandMapBox(root);
  const myUid=window.MiarmaMultiplayer?.currentUserId?.();
  for(const p of publicScotlandPlayers.slice(0,10)){
    if((myUid && p.uid===myUid) || (!myUid && isSameLocalPublicDistillery(p))) continue;
    if(!SCOTLAND_REGIONS[p.region]) continue;
    const x=clamp(Number(p.x)||.5,0,1), y=clamp(Number(p.y)||.5,0,1);
    const marker=document.createElement('figure');
    marker.className=`scotland-other-marker ${selectedPublicPlayerIds.has(p.uid)?'selected':''}`;
    marker.dataset.uid=p.uid || '';
    marker.style.left=`${box.left + box.width*x}px`;
    marker.style.top=`${box.top + box.height*y}px`;
    marker.dataset.tip=publicPlayerTip(p);
    marker.innerHTML=`<figcaption class="other-player-label"><small>#${escapeHtml(String(p.rank || '?'))}</small><b>${escapeHtml(p.publicName || 'Jugador')}</b><span>🏆 ${Math.round(Number(p.reputation)||0)}</span></figcaption><img src="${/^img\/mapa\/dest\d{2}\.png$/.test(String(p.distilleryImage||'')) ? p.distilleryImage : 'img/mapa/dest01.png'}" alt=""><figcaption class="other-distillery-label"><b>${escapeHtml(p.distilleryName || 'Destilería')}</b></figcaption>`;
    layer.appendChild(marker);
  }
}
function renderPublicPlayers(players=[]){
  publicScotlandPlayers = Array.isArray(players) ? players : [];
  selectedPublicPlayerIds = new Set([...selectedPublicPlayerIds].filter(id=>publicScotlandPlayers.some(p=>p.uid===id)));
  const root=$('#scotlandMapOverlay.visible');
  if(root){ renderOtherScotlandPlayers(root); renderScotlandPlayerCard(root); }
}
function selectedPublicPlayers(){ return publicScotlandPlayers.filter(p=>selectedPublicPlayerIds.has(p.uid)).slice(0,3); }
function togglePublicPlayerSelection(uid){
  if(!uid) return;
  if(selectedPublicPlayerIds.has(uid)) selectedPublicPlayerIds.delete(uid);
  else {
    if(selectedPublicPlayerIds.size>=3) selectedPublicPlayerIds.delete([...selectedPublicPlayerIds][0]);
    selectedPublicPlayerIds.add(uid);
  }
  const root=ensureScotlandMapOverlay();
  renderOtherScotlandPlayers(root);
  renderScotlandPlayerCard(root);
}
function scotlandPlayerScreenPoint(root=ensureScotlandMapOverlay()){
  const marker=root.querySelector('.scotland-player-marker:not(.hidden)');
  if(marker){ const r=marker.getBoundingClientRect(); return {x:r.left+r.width/2, y:r.top+r.height*.28}; }
  const loc=state.scotlandLocation;
  if(loc){ const box=scotlandMapBox(root); return {x:box.left+box.width*loc.x, y:box.top+box.height*loc.y}; }
  return {x:innerWidth/2, y:innerHeight/2};
}
function regionName(id){ return SCOTLAND_REGIONS[id]?.name || 'Escocia'; }
function uniqueBottleLots(){
  const byId=new Map();
  for(const lot of [...(state.bottleHistory||[]), ...(state.boxes||[])]){
    if(!lot) continue;
    byId.set(lot.id || `${lot.seq || ''}-${byId.size}`, lot);
  }
  return [...byId.values()];
}
function averageLotQuality(lots=uniqueBottleLots()){
  const vals=lots.map(x=>qualityOrDefault(x.quality,0)).filter(x=>Number.isFinite(x));
  return vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : 0;
}
function averageSoldLotAge(){
  const sold=(state.bottleHistory||[]).filter(x=>x?.sold);
  const total=sold.reduce((a,x)=>a+(Number(x.bottles)||0),0);
  if(total>0) return sold.reduce((a,x)=>a+(Number(x.age)||0)*(Number(x.bottles)||0),0)/total;
  return 0;
}
const RADAR_METRIC_INFO = {
  rep:'Reputación pública acumulada de la destilería.',
  qavg:'Calidad media de todos los lotes embotellados, incluyendo los que siguen en tienda.',
  bottles:'Botellas vendidas históricamente.',
  litres:'Litros vendidos históricamente.',
  lot:'Mayor lote embotellado/vendido en número de botellas.',
  age:'Edad media ponderada por botellas de todo el whisky vendido.',
  price:'Precio máximo alcanzado por botella vendida.',
  achievements:'Logros conseguidos.'
};
function distilleryRadarData(){
  const d=distillery(), st=d.stats||{}, lots=uniqueBottleLots();
  const avgQ=averageLotQuality(lots);
  const avgSoldAge=averageSoldLotAge();
  return [
    {key:'rep', icon:'🏆', label:'Rep', value:Math.round(d.reputation||0), raw:Math.max(0, Number(d.reputation)||0)},
    {key:'qavg', icon:'⭐', label:'Q med', value:avgQ.toFixed(1), raw:avgQ},
    {key:'bottles', icon:'🍾', label:'Bot.', value:Math.round(st.bottlesSold||0), raw:Math.max(0, Number(st.bottlesSold)||0)},
    {key:'litres', icon:'🧪', label:'Litros', value:Math.round(st.litresSold||0), raw:Math.max(0, Number(st.litresSold)||0)},
    {key:'lot', icon:'📦', label:'Lote', value:Math.round(st.maxBottlesLot||0), raw:Math.max(0, Number(st.maxBottlesLot)||0)},
    {key:'age', icon:'🕰️', label:'Edad med', value:`${avgSoldAge.toFixed(1)}a`, raw:avgSoldAge},
    {key:'price', icon:'💶', label:'Precio', value:`${(Number(st.maxBottlePrice)||0).toFixed(0)}€`, raw:Math.max(0, Number(st.maxBottlePrice)||0)},
    {key:'achievements', icon:'🏅', label:'Logros', value:`${Object.keys(d.achievements||{}).length}/${ACHIEVEMENTS.length}`, raw:Object.keys(d.achievements||{}).length}
  ];
}
function publicPlayerRadarData(p){
  return [
    {key:'rep', icon:'🏆', label:'Rep', value:Math.round(Number(p.reputation)||0), raw:Math.max(0, Number(p.reputation)||0)},
    {key:'qavg', icon:'⭐', label:'Q med', value:Math.round(Number(p.bestQuality)||0), raw:Math.max(0, Number(p.bestQuality)||0)},
    {key:'bottles', icon:'🍾', label:'Bot.', value:Math.round(Number(p.bottlesSold)||0), raw:Math.max(0, Number(p.bottlesSold)||0)},
    {key:'litres', icon:'🧪', label:'Litros', value:Math.round(Number(p.litresSold)||0), raw:Math.max(0, Number(p.litresSold)||0)},
    {key:'lot', icon:'📦', label:'Lote', value:Math.round(Number(p.maxBottlesLot)||0), raw:Math.max(0, Number(p.maxBottlesLot)||0)},
    {key:'age', icon:'🕰️', label:'Edad med', value:`${Number(p.oldestSoldAge||0).toFixed(1)}a`, raw:Math.max(0, Number(p.oldestSoldAge)||0)},
    {key:'price', icon:'💶', label:'Precio', value:`${Math.round(Number(p.maxBottlePrice)||0)}€`, raw:Math.max(0, Number(p.maxBottlePrice)||0)},
    {key:'achievements', icon:'🏅', label:'Logros', value:String(Math.round(Number(p.achievementsCount)||0)), raw:Math.max(0, Number(p.achievementsCount)||0)}
  ];
}
function normalizeRadarSeries(baseMetrics, comparisons=[]){
  const all=[baseMetrics, ...comparisons.map(c=>c.metrics)];
  const maxes=baseMetrics.map((_,i)=>Math.max(1, ...all.map(series=>Number(series[i]?.raw)||0)));
  const norm=series=>series.map((m,i)=>({...m, pct:clamp((Number(m.raw)||0)/maxes[i],0,1)}));
  return {base:norm(baseMetrics), comparisons:comparisons.map(c=>({...c, metrics:norm(c.metrics)}))};
}
function radarSvg(metrics, comparisons=[]){
  const norm=normalizeRadarSeries(metrics, comparisons);
  metrics=norm.base; comparisons=norm.comparisons;
  const cx=110, cy=110, r=78, n=metrics.length;
  const point=(pct,i)=>{ const a=-Math.PI/2 + i*2*Math.PI/n; return [cx+Math.cos(a)*r*pct, cy+Math.sin(a)*r*pct]; };
  const seriesPointTip=(name,m)=>`${m.icon || ''} ${name} · ${m.label}: ${m.value}||${RADAR_METRIC_INFO[m.key] || 'Métrica pública del radar.'}`;
  const poly=metrics.map((m,i)=>point(m.pct,i).map(v=>v.toFixed(1)).join(',')).join(' ');
  const axes=metrics.map((m,i)=>{
    const [x,y]=point(1,i), [ix,iy]=point(1.47,i), [vx,vy]=point(1.23,i);
    const tip=`${m.icon || ''} ${m.label}: ${m.value}||${RADAR_METRIC_INFO[m.key] || 'Métrica pública del radar.'}`;
    return `<g class="radar-axis radar-axis-${escapeHtml(m.key||i)}" data-tip="${escapeHtml(tip)}"><line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/><text class="radar-icon" x="${ix.toFixed(1)}" y="${iy.toFixed(1)}">${escapeHtml(m.icon || '')}</text><text class="radar-value" x="${vx.toFixed(1)}" y="${vy.toFixed(1)}">${escapeHtml(String(m.value))}</text></g>`;
  }).join('');
  const compPolys=comparisons.map((c,i)=>`<polygon class="radar-compare radar-compare-${i}" style="--compare:${escapeHtml(c.color)}" points="${c.metrics.map((m,j)=>point(m.pct,j).map(v=>v.toFixed(1)).join(',')).join(' ')}"/>`).join('');
  const baseName=state.distilleryName || 'Mi destilería';
  const basePoints=metrics.map((m,i)=>{ const [x,y]=point(m.pct,i); return `<circle class="radar-point radar-point-base" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.3" data-tip="${escapeHtml(seriesPointTip(baseName,m))}"/>`; }).join('');
  const compPoints=comparisons.map((c,ci)=>c.metrics.map((m,i)=>{ const [x,y]=point(m.pct,i); return `<circle class="radar-point radar-point-compare radar-point-compare-${ci}" style="--compare:${escapeHtml(c.color)}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.3" data-tip="${escapeHtml(seriesPointTip(c.label,m))}"/>`; }).join('')).join('');
  return `<svg class="scotland-radar" viewBox="0 0 220 220" aria-label="Radar de desempeño"><g class="radar-grid"><polygon points="${metrics.map((_,i)=>point(.33,i).map(v=>v.toFixed(1)).join(',')).join(' ')}"/><polygon points="${metrics.map((_,i)=>point(.66,i).map(v=>v.toFixed(1)).join(',')).join(' ')}"/><polygon points="${metrics.map((_,i)=>point(1,i).map(v=>v.toFixed(1)).join(',')).join(' ')}"/>${axes}</g><polygon class="radar-shape" points="${poly}"/>${compPolys}<g class="radar-points">${basePoints}${compPoints}</g></svg>`;
}
function playerScotlandCardHtml(){
  const loc=state.scotlandLocation, metrics=distilleryRadarData();
  const comparisons=selectedPublicPlayers().map((p,i)=>({label:`#${p.rank || '?'} ${p.distilleryName || p.publicName || 'Destilería'}`, color:SCOTLAND_COMPARE_COLORS[i], metrics:publicPlayerRadarData(p)}));
  const legend=`<div class="scotland-radar-legend"><span><i style="--c:#ffe16d"></i>${escapeHtml(state.distilleryName || 'Mi destilería')}</span>${comparisons.map(c=>`<span><i style="--c:${escapeHtml(c.color)}"></i>${escapeHtml(c.label)}</span>`).join('')}</div>`;
  return `<h3>${escapeHtml(state.distilleryName || 'Mi destilería')}</h3><img src="${loc?.dest || SCOTLAND_DESTILLERY_ASSETS[0]}" alt="Destilería">${radarSvg(metrics, comparisons)}${legend}${scotlandAchievementBadgesHtml()}`;
}
function scotlandAchievementBadgesHtml(){
  const owned=ACHIEVEMENTS.filter(a=>hasAchievement(a.id));
  if(!owned.length) return '<div class="scotland-achievement-badges empty">Sin logros todavía</div>';
  return `<div class="scotland-achievement-badges">${owned.map(a=>`<img src="${a.img}" alt="${escapeHtml(a.name)}" data-tip="${escapeHtml(`🏅 ${a.name}||${a.desc}\nCondición: ${a.condition}\nPremio: ${a.reward}`)}" onerror="this.src='img/logros/logros 1.png'">`).join('')}</div>`;
}
function renderScotlandPlayerCard(root=ensureScotlandMapOverlay()){
  const card=root.querySelector('.scotland-player-card');
  if(!card || !state.scotlandLocation){ card?.classList.add('hidden'); return; }
  card.innerHTML=playerScotlandCardHtml(); card.classList.remove('hidden');
}
function buildPublicProfile(publicName=''){
  return window.MiarmaPublicProfile?.buildPublicProfile?.({state, distillery:distillery(), publicName}) || null;
}
function markPublicProfileDirty(reason='change'){
  try{ window.MiarmaMultiplayer?.markDirty?.(reason); }catch(_){ }
}
function exportLocalAccountData(){
  saveGame();
  let saved=null;
  try{ saved=JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); }catch(_){ saved=null; }
  return {
    schemaVersion:1,
    storageKey:STORAGE_KEY,
    exportedAtClient:Date.now(),
    gameState:saved || state
  };
}
function importLocalAccountData(payload={}){
  if(!payload || payload.schemaVersion !== 1 || !payload.gameState) throw new Error('Backup de cuenta no válido');
  state = normaliseLoaded(payload.gameState);
  rebuildSoldStatsFromHistory({save:false});
  saveGame();
  render({force:true});
  markPublicProfileDirty('manual');
  return true;
}
window.MiarmaGame = {...(window.MiarmaGame||{}), buildPublicProfile, renderPublicPlayers, exportLocalAccountData, importLocalAccountData};
function confirmScotlandLocation(region){
  const root=$('#gamePopup'); if(!root) return Promise.resolve({ok:window.confirm(`¿Fundar la destilería en ${region.name}?`), name:state.distilleryName});
  if(root.parentElement !== document.body) document.body.appendChild(root);
  playFx('fxCork', .72); playScotVoice('warn');
  return new Promise(resolve=>{
    const current=(state.distilleryName || 'Mi destilería').trim();
    root.innerHTML=`<div class="game-popup-card warn scotland-confirm-popup">
      <button class="game-popup-close" type="button" aria-label="Cerrar">×</button>
      <img class="game-popup-character" src="${scotImg('warn')}" alt="" onerror="this.hidden=true">
      <div class="game-popup-copy"><h3>Elegir localización</h3>
        <p>¿Fundar tu destilería en <b>${escapeHtml(region.name)}</b>? La localización no podrá cambiarse en el futuro.</p>
        <label class="initial-distillery-name"><span>Nombre de la destilería</span><input id="initialDistilleryName" maxlength="28" value="${escapeHtml(current)}" autocomplete="off"></label>
        <div class="game-popup-actions"><button class="pixel-btn small ok" type="button">Aceptar</button><button class="pixel-btn small danger cancel" type="button">Cancelar</button></div>
      </div>
    </div>`;
    root.classList.remove('hidden');
    const input=root.querySelector('#initialDistilleryName'); input?.focus(); input?.select();
    const done=ok=>{ const name=(input?.value || current || 'Mi destilería').trim() || 'Mi destilería'; root.classList.add('hidden'); root.innerHTML=''; popupCloseSound('fxAhhh', .68); resolve({ok, name}); };
    root.querySelector('.ok')?.addEventListener('click', e=>{ e.stopPropagation(); done(true); });
    root.querySelector('.cancel')?.addEventListener('click', e=>{ e.stopPropagation(); done(false); });
    root.querySelector('.game-popup-close')?.addEventListener('click', e=>{ e.stopPropagation(); done(false); });
    input?.addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); done(true); } if(e.key==='Escape'){ e.preventDefault(); done(false); } });
    root.onclick=e=>{ if(e.target===root) done(false); };
  });
}
async function handleScotlandMapClick(e, {fromPointer=false}={}){
  if(scotlandTransitioning) return;
  if(scotlandPan) return;
  if(!fromPointer && scotlandSelectPointerHandled){ scotlandSelectPointerHandled=false; return; }
  if(scotlandSuppressClick){ scotlandSuppressClick=false; return; }
  if(scotlandSelectClickBusy) return;
  const root=ensureScotlandMapOverlay();
  if(scotlandMapMode==='view'){
    if(e.target.closest('.scotland-social-panel')) return;
    const other=e.target.closest('.scotland-other-marker');
    if(other){ togglePublicPlayerSelection(other.dataset.uid); return; }
    if(e.target.closest('.scotland-player-marker')) return closeScotlandMapToDistillery();
    return;
  }
  scotlandSelectClickBusy = true;
  const clickX=e.clientX, clickY=e.clientY;
  try{
    if(!scotlandSelectionPrepared){
      root.querySelector('.scotland-map-hint').textContent='Leyendo región…';
      await scotlandSelectionReady(root);
    }
    const clickedPoint=scotlandImagePoint(clickX, clickY, root);
    let region=scotlandRegionFromImagePoint(clickedPoint) || scotlandRegionAt(clickX, clickY, root);
    if(!region && scotlandMapHover?.id && clickedPoint) region=scotlandMapHover;
    if(!region) return;
    const pt=clickedPoint || region.point;
    if(!pt) return;
    const choice=await confirmScotlandLocation(region);
    if(!choice.ok) return;
    state.distilleryName=choice.name || 'Mi destilería';
    state.scotlandLocation={region:region.id, x:pt.x, y:pt.y, dest:chosenDistilleryAsset()};
    markPublicProfileDirty('region-selected');
    markDirty(); saveGame(); render();
    await transitionScotlandMapToDistillery(clickX, clickY, true);
  } finally {
    scotlandSelectClickBusy = false;
  }
}
function openScotlandMap(mode='view'){
  startScotlandMaskPreload();
  scotlandMapMode=mode;
  scotlandReturnHudCollapsed=$('#hud')?.classList.contains('collapsed') ?? null;
  const root=ensureScotlandMapOverlay();
  scotlandTransitioning=false;
  scotlandPan=null;
  scotlandSuppressClick=false;
  scotlandSelectPointerHandled=false;
  scotlandSelectClickBusy=false;
  root.className=`scotland-map-overlay visible ${mode==='select'?'select-mode':'view-mode'}`;
  resetScotlandZoom(root);
  root.querySelector('.scotland-map-hint').textContent = mode==='select' && !scotlandSelectionPrepared ? 'Preparando regiones…' : (mode==='select' ? 'Elige una región válida para fundar la destilería' : 'ESC o click en tu destilería para volver');
  if(mode==='select'){
    scotlandSelectionReady(root).then(()=>{
      const current=$('#scotlandMapOverlay.visible.select-mode');
      if(current) current.querySelector('.scotland-map-hint').textContent='Elige una región válida para fundar la destilería';
    });
  }
  root.querySelector('.scotland-base-map').onload=()=>renderPlayerDistilleryOnMap(root);
  renderPlayerDistilleryOnMap(root);
  renderOtherScotlandPlayers(root);
  renderScotlandPlayerCard(root);
  clearScotlandHover();
  if(mode==='view') window.MiarmaMultiplayer?.onScotlandMapOpen?.({autoLogin:true});
  else window.MiarmaMultiplayer?.renderMapControls?.();
  playFx('fxCork', .62);
}
function restoreHudAfterScotlandMap(fromSplash=false){
  if(fromSplash){ hideHud(); return; }
  if(scotlandReturnHudCollapsed === false) showHud();
  else hideHud();
  scotlandReturnHudCollapsed=null;
}
function transitionScotlandMapToDistillery(x=null, y=null, fromSplash=false){
  return new Promise(resolve=>{
    const root=ensureScotlandMapOverlay();
    scotlandTransitioning=true;
    const pt=(x===null || y===null) ? scotlandPlayerScreenPoint(root) : {x,y};
    x=pt.x; y=pt.y;
    const localX=(x-scotlandZoom.x)/scotlandZoom.scale, localY=(y-scotlandZoom.y)/scotlandZoom.scale;
    const toScale=2.25;
    root.style.setProperty('--zoom-from-x', `${scotlandZoom.x}px`);
    root.style.setProperty('--zoom-from-y', `${scotlandZoom.y}px`);
    root.style.setProperty('--zoom-from-scale', scotlandZoom.scale.toString());
    root.style.setProperty('--zoom-to-x', `${innerWidth/2 - localX*toScale}px`);
    root.style.setProperty('--zoom-to-y', `${innerHeight/2 - localY*toScale}px`);
    root.style.setProperty('--zoom-to-scale', toScale.toString());
    root.style.setProperty('--zoom-x', `${x}px`); root.style.setProperty('--zoom-y', `${y}px`);
    root.classList.add('zoom-to-black');
    setTimeout(()=>{
      root.className='scotland-map-overlay hidden';
      root.classList.remove('zoom-to-black');
      clearScotlandHover();
      scotlandTransitioning=false;
      if(fromSplash){ const splash=$('#splashScreen'); splash?.classList.add('hidden'); }
      startMainLoop(); restoreHudAfterScotlandMap(fromSplash); render(); resolve(true);
    }, 720);
  });
}
function closeScotlandMapToDistillery(x=null, y=null){ return transitionScotlandMapToDistillery(x,y,false); }
function showKeybindingsPopup(){
  return gamePopup({
    title:'Atajos de teclado',
    mood:'happy',
    html:`<div class="keybindings-copy">
      <div class="keybind-icons"><img src="img/alambique.png" alt=""><span>🔥</span><img src="img/bottles_12.png" alt=""></div>
      <div class="keybind-grid">
        <b>f / g / h / j</b><i>🔥</i><span>Fuego alambiques 1 / 2 / 3 / 4</span>
        <b>m</b><i>🎵</i><span>Música on/off</span>
        <b>x</b><i>🔊</i><span>Efectos on/off</span>
        <b>º / 1 / 2 / 3 / 4</b><i>⏱️</i><span>Tiempo: bajar / x1 / subir / x5 / x10</span>
        <b>Esc</b><i>☰</i><span>Mostrar/ocultar menú principal</span>
        <b>b</b><i>🍾</i><span>Abrir archivo de botellas</span>
        <b>p</b><i>📣</i><span>Abrir/cerrar publicidad</span>
        <b>+</b><i>📈</i><span>Abrir/cerrar simulador de embotellado</span>
        <b>l</b><i>🏆</i><span>Abrir ficha de destilería y logros</span>
        <b>-</b><i>🗺️</i><span>Ir al mapa de Escocia</span>
        <b>Rueda ratón</b><i>🔍</i><span>Zoom sobre el mapa</span>
        <b>Click central + arrastrar</b><i>🖐️</i><span>Desplazar el mapa cuando hay zoom</span>
      </div>
    </div>`,
    ok:'Vale',
    closeOnAnyClick:true
  });
}
function noticeFallback(msg){ alert(msg); }
function notice(msg, mood='explain', title='Aviso'){ return gamePopup({title, msg, mood}); }
function tipHtml(text){
  const [main, note] = String(text || '').split('||');
  const rich = /<[^>]+>/.test(main);
  const splitter = rich ? /\n+/ : /\s*·\s*|\n+/;
  const lines = main.split(splitter).map(x=>x.trim()).filter(Boolean);
  const body = lines.map(x=>x.startsWith('<') ? x : `<div>${x}</div>`).join('');
  return body + (note ? `<span class="tip-note">${note.trim()}</span>` : '');
}
function vatAbv(v){ return v.volume>0 ? clamp((v.ferment / FERMENT_OPTIMAL_END) * WASH_ABV_TARGET, 0, WASH_ABV_TARGET) : 0; }
function maltBaseImage(t){
  const stage=normalizeMaltStage(t);
  if(t.status==='rotten') return MALT_IMAGES.tilled;
  if(t.heated) return (Number(t.peatPpm)||0)>0 ? MALT_IMAGES.maltedPeat : MALT_IMAGES.maltedPlain;
  if(stage==='tilled' || stage==='germinating') return MALT_IMAGES.tilled;
  return MALT_IMAGES.raw;
}
function maltWaterImage(t){
  const stage=normalizeMaltStage(t);
  if(t.status==='rotten') return MALT_IMAGES.bad;
  if(t.heated || stage!=='germinating') return '';
  if(t.moisture>66 || t.germ>0) return MALT_IMAGES.water2;
  if(t.moisture>0) return MALT_IMAGES.water1;
  return '';
}
function fermentWarning(v){ return !v.yeast && v.volume>0 && !v.rotten && v.idle > FERMENT_IDLE_ROT/2; }
function clearHints(){ $$('.can-drop').forEach(el=>el.classList.remove('can-drop')); }
function markDropHints(data){
  clearHints(); if(!data) return;
  let sel = '';
  if(data.drag==='seed' || data.drag==='barley-store') sel = '.field-tile:not(.field-disabled)';
  if(data.drag==='crop') sel = warehouseBuilt() ? '.malt-tile, .barley-warehouse-drop' : '.malt-tile';
  if(data.drag==='barley-store') sel = '.field-tile:not(.field-disabled), .malt-tile';
  if(data.drag==='malt') sel = '.mill-prop';
  if(data.drag==='wash') sel = '.still-drop.in';
  if(data.drag==='spirit') sel = '.still-drop.in, .barrel-card';
  if(data.drag==='barrel') sel = '#aging, #bottling, #barrelDiscard';
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
function fieldUpgrades(){ state.fieldUpgrades = normalizeFieldUpgrades(state.fieldUpgrades); return state.fieldUpgrades; }
function warehouseBuilt(){ return !!fieldUpgrades().warehouseBuilt; }
function warehouseKg(){ return Number(fieldUpgrades().warehouseKg)||0; }
function warehouseCapacity(){ return Number(fieldUpgrades().warehouseCapacity)||0; }
function warehouseFreeKg(){ return Math.max(0, warehouseCapacity() - warehouseKg()); }
function thermostatBuilt(){ return !!fieldUpgrades().thermostatBuilt; }
function thermostatActive(){ const upgrades=fieldUpgrades(); return !!upgrades.thermostatBuilt && upgrades.thermostatOn !== false; }
function thermostatAutomationActive(){ const upgrades=fieldUpgrades(); return !!upgrades.thermostatAutomation && upgrades.thermostatAutomationEnabled !== false; }
function stillTempCap(){
  const upgrades=fieldUpgrades();
  if(upgrades.thermostatAutomation) return upgrades.thermostatAutomationEnabled === false ? TEMP_MAX : THERMOSTAT_AUTOMATION_TEMP;
  return thermostatActive() ? THERMOSTAT_TEMP_MAX : TEMP_MAX;
}
function thermostatFireSyncActive(){ return stillTempCap() < TEMP_MAX; }
function autoHarvesterActive(){ const upgrades=fieldUpgrades(); return !!upgrades.autoHarvester && upgrades.autoHarvesterEnabled !== false; }
function autoMaltingActive(){ const upgrades=fieldUpgrades(); return !!upgrades.autoMalting && upgrades.autoMaltingEnabled !== false; }
function maltTileCapacityKg(){ return Math.round(MALT_TILE_CAPACITY_KG * (fieldUpgrades().maltCapacityUpgraded ? MALT_CAPACITY_UPGRADE_FACTOR : 1)); }
function availableSeedKg(){ return warehouseBuilt() ? warehouseKg() : (Number(state.seeds)||0); }
function fieldTileDisabledReason(i){
  const upgrades=fieldUpgrades();
  if(upgrades.warehouseBuilt && FIELD_WAREHOUSE_TILE_SET.has(i)) return 'almacén';
  if(upgrades.autoHarvester && FIELD_HARVESTER_TILE_SET.has(i)) return 'autocosechadora';
  return '';
}
function resetFieldTile(t){ Object.assign(t,{status:'empty', growth:0, moisture:0, dry:0, overdue:0, quality:100, peatPpm:0}); delete t.autoHarvesting; }
function clearDisabledFieldTiles(){
  state.field.forEach((t,i)=>{ if(fieldTileDisabledReason(i)) resetFieldTile(t); });
}
function addBarleyToWarehouse(kg, quality=100){
  const upgrades=fieldUpgrades();
  if(!upgrades.warehouseBuilt) return 0;
  const free=Math.max(0, (Number(upgrades.warehouseCapacity)||0) - (Number(upgrades.warehouseKg)||0));
  const add=Math.min(Math.max(0, Number(kg)||0), free);
  if(add<=0) return 0;
  const old=Number(upgrades.warehouseKg)||0;
  upgrades.warehouseQuality=weightedQuality(old, upgrades.warehouseQuality, add, quality);
  upgrades.warehouseKg=old+add;
  return add;
}
function takeBarleyFromWarehouse(kg){
  const upgrades=fieldUpgrades();
  const take=Math.min(Math.max(0, Number(kg)||0), Number(upgrades.warehouseKg)||0);
  if(take<=0) return 0;
  upgrades.warehouseKg=Math.max(0, upgrades.warehouseKg-take);
  if(upgrades.warehouseKg<=0) upgrades.warehouseQuality=100;
  return take;
}
function storeCropInWarehouse(source){
  const src=state.field[+source];
  if(!warehouseBuilt() || !src || src.growth<FIELD_HARVEST_START) return false;
  const accepted=addBarleyToWarehouse(FIELD_WAREHOUSE_KG_PER_PLOT, cropQuality(src));
  if(accepted<=0){ notice('El almacén de cebada está lleno.', 'explain', 'Almacén lleno'); return false; }
  resetFieldTile(src);
  playFx('fxDropGrain');
  return true;
}
function addWarehouseToMaltTile(i){
  const dst=state.malt[+i];
  if(!dst || warehouseKg()<=0) return false;
  const stage=normalizeMaltStage(dst);
  if(stage==='germinating' || stage==='kilned' || dst.heated){
    notice('Cuando la cebada ya está germinando o secada, no puedes añadir más cosecha a ese montón.', 'explain', 'Ese montón ya va por otro paso');
    return false;
  }
  const old=Number(dst.amount)||0;
  const cap=maltTileCapacityKg();
  const add=Math.min(warehouseKg(), Math.max(0, cap-old));
  if(add<=0){ notice('Ese montón de malteado ya está lleno.', 'explain', 'Sin espacio'); return false; }
  const q=fieldUpgrades().warehouseQuality;
  takeBarleyFromWarehouse(add);
  const baseQ=weightedQuality(old, dst.baseQuality ?? dst.quality ?? 100, add, q);
  Object.assign(dst,{status:'filled', amount:old+add, germ:0, moisture:0, baseQuality:baseQ, quality:baseQ, lineage:mergeLineage(dst.lineage||[], [{stage:'almacen_cebada', q, maltKg:add}]), heated:false, peat:dst.peat||false, dry:0, stable:0, warned:false, maltStage:'raw'});
  playFx('fxDropGrain');
  return true;
}
function plantFieldFromWarehouse(i){
  const t=state.field[+i];
  if(!t || fieldTileDisabledReason(+i)) return false;
  if(t.status!=='empty') return false;
  if(warehouseKg()<SEED_KG_PER_PLOT){ notice('No quedan semillas suficientes en el almacén.', 'explain', 'Sin semillas'); return false; }
  takeBarleyFromWarehouse(SEED_KG_PER_PLOT);
  Object.assign(t,{status:'planted', growth:0, moisture:fieldPlantMoisture(), dry:0, overdue:0, quality:100, peatPpm:0});
  playFx('fxDropGrain');
  return true;
}
function harvesterTileTarget(i){
  const tile=$(`.field-tile[data-i="${i}"]`), field=$('#field');
  let left=HARVESTER_PARK.left, top=HARVESTER_PARK.top;
  if(tile && field){
    const tw=tile.offsetWidth || 1, th=tile.offsetHeight || 1, fw=field.clientWidth || 1, fh=field.clientHeight || 1;
    const centerX=tile.offsetLeft + tw/2, centerY=tile.offsetTop + th/2;
    left=clamp((centerX/fw)*100 - 20, -2, 62);
    top=clamp((centerY/fh)*100 - 8, -2, 86);
  }
  return {left, top};
}
function harvesterCurrentPosition(now=Date.now()){
  if(!harvesterRun) return {...HARVESTER_PARK};
  if(harvesterRun.phase==='working') return {...harvesterRun.to};
  const p=clamp((now-harvesterRun.start)/Math.max(1, harvesterRun.duration),0,1);
  const eased=p<.5 ? 2*p*p : 1-Math.pow(-2*p+2,2)/2;
  return {
    left:harvesterRun.from.left + (harvesterRun.to.left-harvesterRun.from.left)*eased,
    top:harvesterRun.from.top + (harvesterRun.to.top-harvesterRun.from.top)*eased
  };
}
function scheduleHarvester(fn, ms){
  clearTimeout(harvesterTimer);
  harvesterTimer=setTimeout(fn, ms);
}
function startHarvesterQueue(){
  if(harvesterRun || harvesterTimer) return;
  beginNextHarvesterJob(harvesterCurrentPosition());
}
function beginNextHarvesterJob(from=HARVESTER_PARK){
  clearTimeout(harvesterTimer); harvesterTimer=null;
  while(harvesterQueue.length){
    const i=harvesterQueue.shift();
    harvesterQueuedTiles.delete(i);
    const t=state.field[+i];
    if(!t || t.status!=='planted' || t.growth<FIELD_OPTIMAL_MID || fieldTileDisabledReason(+i) || warehouseFreeKg()<FIELD_WAREHOUSE_KG_PER_PLOT){
      if(t) delete t.autoHarvesting;
      continue;
    }
    const to=harvesterTileTarget(i);
    const distance=Math.hypot(to.left-from.left, to.top-from.top);
    const duration=clamp(distance*18, 320, HARVESTER_MOVE_MS);
    harvesterRun={phase:'moving', tile:+i, from:{...from}, to, start:Date.now(), duration, face:to.left<from.left ? -1 : 1};
    render({force:true});
    scheduleHarvester(beginHarvesterWork, duration);
    return;
  }
  beginHarvesterReturn(from);
}
function beginHarvesterWork(){
  if(!harvesterRun) return;
  harvesterRun={...harvesterRun, phase:'working', start:Date.now(), duration:HARVESTER_WORK_MS};
  playFx('fxHarvester', .41);
  render({force:true});
  scheduleHarvester(finishHarvesterWork, HARVESTER_WORK_MS);
}
function finishHarvesterWork(){
  if(!harvesterRun) return;
  const i=harvesterRun.tile, t=state.field[+i], from={...harvesterRun.to};
  if(t){
    if(t.status==='planted' && t.growth>=FIELD_OPTIMAL_MID && warehouseFreeKg()>=FIELD_WAREHOUSE_KG_PER_PLOT){
      const accepted=addBarleyToWarehouse(FIELD_WAREHOUSE_KG_PER_PLOT, FIELD_AUTOHARVEST_QUALITY);
      if(accepted>0){ resetFieldTile(t); playFx('fxDropGrain', .45); markDirty(); saveGame(); }
      else delete t.autoHarvesting;
    } else {
      delete t.autoHarvesting;
    }
  }
  harvesterRun=null;
  render({force:true});
  beginNextHarvesterJob(from);
}
function beginHarvesterReturn(from=harvesterCurrentPosition()){
  const distance=Math.hypot(HARVESTER_PARK.left-from.left, HARVESTER_PARK.top-from.top);
  if(distance<.5){ harvesterRun=null; render({force:true}); return; }
  const duration=clamp(distance*18, 320, HARVESTER_MOVE_MS);
  harvesterRun={phase:'returning', tile:null, from:{...from}, to:{...HARVESTER_PARK}, start:Date.now(), duration, face:HARVESTER_PARK.left<from.left ? -1 : 1};
  render({force:true});
  scheduleHarvester(()=>{ harvesterRun=null; harvesterTimer=null; render({force:true}); if(harvesterQueue.length) beginNextHarvesterJob({...HARVESTER_PARK}); }, duration);
}
function queueAutoHarvest(i){
  const t=state.field[+i];
  if(!t || t.autoHarvesting || harvesterQueuedTiles.has(+i)) return !!t?.autoHarvesting;
  if(warehouseFreeKg()<FIELD_WAREHOUSE_KG_PER_PLOT) return false;
  t.autoHarvesting=true;
  harvesterQueuedTiles.add(+i);
  harvesterQueue.push(+i);
  startHarvesterQueue();
  return true;
}
function autoHarvestCrop(i){
  const t=state.field[+i];
  if(!t || !autoHarvesterActive() || t.status!=='planted' || t.growth<FIELD_OPTIMAL_MID) return false;
  return queueAutoHarvest(+i);
}
function fieldTip(t){
  if(t.status==='empty') return `Parcela vacía (${FIELD_PLOT_AREA_HA} ha). Arrastra ${SEED_KG_PER_PLOT} Kg ${warehouseBuilt() ? 'desde el almacén' : 'de semillas'} aquí.`;
  if(t.status==='dry') return 'Cultivo seco. Pulsa Limpiar en la zona de barritas.';
  if(t.status==='rotten') return 'Cultivo estropeado. Pulsa Limpiar.';
  return `🌾 Cultivo.
Humedad: ${t.moisture.toFixed(0)}%.
Crecimiento: ${t.growth.toFixed(0)}%.
Cosechable desde: ${FIELD_HARVEST_START}%.
Calidad: ${Math.round(cropQuality(t))}.||${fieldUpgrades().autoWater ? 'Riego automático activo.' : 'Click para regar.'} Arrastra al malteado${warehouseBuilt() ? ' o al almacén' : ''} cuando madure.`;
}
function maltTip(t){
  if(t.status==='empty') return `Malteado vacío.
Capacidad: ${maltTileCapacityKg()} Kg de malta.
Suelta cebada madura aquí.||Primero se ara, luego se humedece y por último se seca.`;
  if(t.status==='rotten') return `Malta estropeada.
Ya no se puede usar: pulsa Limpiar.`;
  const qNow = t.heated ? qualityOrDefault(t.quality) : maltFinalQuality(t);
  if(t.heated) return `Malta calentada${t.peatPpm?' con turba':''}.
Germinación detenida: ${t.germ.toFixed(0)}%.
Calidad: ${Math.round(t.quality || 100)}.
Turba: ${Math.round(t.peatPpm || 0)}ppm.${maltedWarning(t)?'||Atención: esta malta lleva mucho tiempo secada; si la dejas demasiado, se estropeará.':''}`;
  const stage=normalizeMaltStage(t);
  if(stage==='raw') return `Cebada almacenada en seco.
Cantidad: ${Math.round(t.amount||0)} Kg / ${maltTileCapacityKg()} Kg.
Calidad base: ${Math.round(maltBaseQuality(t))}.||Click con el arado para preparar la cebada.`;
  if(stage==='tilled') return `Cebada arada.
Cantidad: ${Math.round(t.amount||0)} Kg / ${maltTileCapacityKg()} Kg.
Calidad base: ${Math.round(maltBaseQuality(t))}.||Click con la gota para humedecer y empezar germinación.`;
  return `🌿 Malteado.
Cantidad: ${Math.round(t.amount||0)} Kg / ${maltTileCapacityKg()} Kg.
Humedad: ${t.moisture.toFixed(0)}%.
Germinación: ${t.germ.toFixed(0)}%.
Calidad: ${Math.round(qNow)}.
Óptimo: ${MALT_HARVEST_START}-${MALT_OPTIMAL_END}%.||${t.germ>=MALT_HARVEST_START?'Click con la llama para secar y detener la germinación.':'Espera a que llegue al mínimo viable para poder secar.'}`;
}

function fieldUpgradeButtonsHtml(){
  const upgrades=fieldUpgrades();
  const buttons=[];
  if(!upgrades.warehouseBuilt){
    buttons.push(`<button class="field-upgrade-buy icon-action-btn" type="button" data-upgrade="warehouse" data-tip="Construir almacén de cebada.\nCoste: ${FIELD_WAREHOUSE_COST} k€.\nCapacidad: ${FIELD_WAREHOUSE_CAPACITY_KG.toLocaleString('es-ES')} Kg.">${actionButtonLabel('img/almacen.png', actionLabel('Almacén', FIELD_WAREHOUSE_COST), 'almacén')}</button>`);
  } else if(!upgrades.warehouseDuplicated){
    buttons.push(`<button class="field-upgrade-buy icon-action-btn" type="button" data-upgrade="warehouse-duplicate" data-tip="Duplicar la capacidad del almacén.\nCoste: ${FIELD_WAREHOUSE_DUPLICATE_COST} k€.\nNueva capacidad: ${(FIELD_WAREHOUSE_CAPACITY_KG*2).toLocaleString('es-ES')} Kg.">${actionButtonLabel('img/almacen.png', actionLabel('Duplicar', FIELD_WAREHOUSE_DUPLICATE_COST), 'duplicar almacén')}</button>`);
  } else if(!upgrades.warehouseSecondExpanded){
    buttons.push(`<button class="field-upgrade-buy icon-action-btn" type="button" data-upgrade="warehouse-second-expansion" data-tip="Nueva ampliación del almacén.\nCoste: ${FIELD_WAREHOUSE_SECOND_DUPLICATE_COST} k€.\nNueva capacidad: ${(FIELD_WAREHOUSE_CAPACITY_KG*4).toLocaleString('es-ES')} Kg.">${actionButtonLabel('img/almacen.png', actionLabel('Ampliar', FIELD_WAREHOUSE_SECOND_DUPLICATE_COST), 'ampliar almacén')}</button>`);
  }
  if(!upgrades.autoWater){
    buttons.push(`<button class="field-upgrade-buy icon-action-btn" type="button" data-upgrade="auto-water" data-tip="Riego automático.\nCoste: ${FIELD_AUTOWATER_COST} k€.\nLas parcelas cultivadas se mantienen al 100% de agua.">${actionButtonLabel('img/riego.gif', actionLabel('Riego', FIELD_AUTOWATER_COST), 'riego automático')}</button>`);
  } else if(upgrades.warehouseBuilt && !upgrades.autoHarvester){
    buttons.push(`<button class="field-upgrade-buy icon-action-btn" type="button" data-upgrade="auto-harvester" data-tip="Autocosechadora.\nCoste: ${FIELD_AUTOHARVESTER_COST} k€.\nCosecha en el punto óptimo y guarda en almacén con Q 95.">${actionButtonLabel('img/cosechadora.png', actionLabel('Autocosechadora', FIELD_AUTOHARVESTER_COST), 'autocosechadora')}</button>`);
  } else if(upgrades.autoHarvester){
    buttons.push(`<button class="field-upgrade-toggle icon-action-btn ${upgrades.autoHarvesterEnabled===false?'off':'on'}" type="button" data-upgrade-toggle="auto-harvester" data-tip="Autocosechadora ${upgrades.autoHarvesterEnabled===false?'desactivada':'activada'}.\nON: cosecha sola en el punto óptimo y guarda cebada Q ${FIELD_AUTOHARVEST_QUALITY} (-${AUTOMATION_QUALITY_PENALTY}Q por automatización).\nOFF: puedes cosechar manualmente sin esta pérdida.">${actionButtonLabel('img/cosechadora.png', upgrades.autoHarvesterEnabled===false?'OFF':'ON', 'autocosechadora')}</button>`);
  }
  return buttons.length ? `<div class="field-upgrade-panel">${buttons.join('')}</div>` : '';
}
function renderFieldUpgrades(root){
  const upgrades=fieldUpgrades();
  root.insertAdjacentHTML('beforeend', fieldUpgradeButtonsHtml());
  if(upgrades.autoWater) root.insertAdjacentHTML('beforeend', '<div class="field-upgrade-overlay irrigation-overlay" aria-hidden="true"><img src="img/riego.gif" alt=""></div>');
  if(upgrades.warehouseBuilt){
    const pctFull=(warehouseKg()/Math.max(1, warehouseCapacity()))*100;
    root.insertAdjacentHTML('beforeend', '<div class="field-upgrade-overlay warehouse-base-overlay" aria-hidden="true"><img src="img/almacen_base.png" alt=""></div>');
    root.insertAdjacentHTML('beforeend', `<div class="field-upgrade-overlay warehouse-overlay barley-warehouse-drop drop-target ${upgrades.warehouseDuplicated?'expanded':''} ${upgrades.warehouseSecondExpanded?'expanded-2':''} ${warehouseKg()>0?'token':''}" data-drag="barley-store" data-label="almacén de cebada" data-tip="Almacén de cebada.\n${Math.round(warehouseKg()).toLocaleString('es-ES')} / ${Math.round(warehouseCapacity()).toLocaleString('es-ES')} Kg.\nQ media: ${Math.round(upgrades.warehouseQuality)}.||Arrastra cosecha aquí para guardar. Arrastra desde aquí a parcelas o a malteado."><img src="img/almacen.png" alt="almacén"><div class="warehouse-stock-bar bar vertical" aria-hidden="true"><i style="height:${pct(pctFull)}"></i></div></div>`);
  }
  if(upgrades.autoHarvester){
    const pos=harvesterCurrentPosition(), phase=harvesterRun?.phase || 'idle', face=harvesterRun?.face || 1;
    const style=` style="--harvester-left:${pos.left.toFixed(2)}%;--harvester-top:${pos.top.toFixed(2)}%;--harvester-face:${face}"`;
    root.insertAdjacentHTML('beforeend', `<div class="field-upgrade-overlay harvester-base-overlay" aria-hidden="true"><img src="img/cosechadora_base.png" alt=""></div><div class="field-upgrade-overlay harvester-overlay ${phase} ${upgrades.autoHarvesterEnabled===false?'off':''}"${style} data-tip="Autocosechadora ${upgrades.autoHarvesterEnabled===false?'OFF':'ON'}: activada cosecha automáticamente en el punto óptimo y guarda Q ${FIELD_AUTOHARVEST_QUALITY}; desactivada te deja cosechar manualmente sin perder Q."><img src="img/cosechadora.png" alt="autocosechadora"></div>`);
  }
}

function renderField(){
  $$('#field .field-upgrade-overlay, #field .field-upgrade-panel').forEach(el=>el.remove());
  $$('.field-tile').forEach(el=>{
    const i=+el.dataset.i, t = state.field[i];
    const disabled=fieldTileDisabledReason(i);
    el.classList.toggle('field-disabled', !!disabled);
    el.classList.toggle('empty', t.status==='empty');
    el.classList.toggle('dry-crop', !disabled && (t.status==='dry' || t.status==='rotten'));
    el.classList.toggle('needs-water', !disabled && t.status==='planted' && t.growth < FIELD_HARVEST_START && t.moisture < FIELD_WATER_CAP);
    el.classList.toggle('click-plantable', !disabled && t.status==='empty' && availableSeedKg() >= SEED_KG_PER_PLOT);
    if(disabled){
      el.innerHTML='';
      el.dataset.tip=disabled==='almacén' ? 'Parcela ocupada por el almacén de cebada.' : 'Parcela ocupada por la autocosechadora.';
      return;
    }
    el.innerHTML = t.status==='empty' ? '' : bars((t.moisture/FIELD_WATER_CAP)*100, t.growth, FIELD_HARVEST_START, FIELD_OPTIMAL_END - FIELD_HARVEST_START, t.status==='rotten' || t.status==='dry', 'field');
    el.dataset.tip = fieldTip(t);
    if(t.status==='planted' || t.status==='dry'){
      const plant = document.createElement('div');
      plant.className='plant';
      const img = document.createElement('img');
      img.className='plant-img'; img.draggable=false;
      if(t.status==='dry'){ plant.className += ' dry'; img.src=PLANT_IMAGES.dry; img.alt='cultivo seco'; }
      else if(t.growth>=FIELD_HARVEST_START){ img.src=PLANT_IMAGES.mature; img.alt='cultivo maduro'; }
      else if(t.growth>=20){ img.src=PLANT_IMAGES.green; img.alt='cultivo verde'; }
      else { img.src=PLANT_IMAGES.sprout; img.alt='cultivo recién plantado'; }
      plant.appendChild(img); el.appendChild(plant);
      if(t.status==='planted' && t.growth>=FIELD_HARVEST_START){
        plant.className += ' token crop-token';
        plant.dataset.drag='crop'; plant.dataset.source=el.dataset.i;
        plant.dataset.tip=`🌾 Cebada madura.
	Rendimiento: ~${FIELD_WAREHOUSE_KG_PER_PLOT} Kg de cebada (${FIELD_PLOT_AREA_HA} ha).
	⭐ Q: ${Math.round(cropQuality(t))}.||Arrástrala a malteado${warehouseBuilt() ? ' o al almacén' : ''}.`;
        if(!state.debugQuality) el.insertAdjacentHTML('beforeend', `<div class="quality-pill crop-q">Q ${Math.round(cropQuality(t))}</div>`);
      }
      if(state.debugQuality) el.insertAdjacentHTML('beforeend', qualityHtml(cropQuality(t), t.peatPpm || 0));
    }
    if(t.status==='rotten' || t.status==='dry') addClean(el, () => Object.assign(t,{status:'empty',growth:0,moisture:0,dry:0,overdue:0,quality:100}));
  });
  renderFieldUpgrades($('#field'));
}

function renderMalt(){
  $$('#maltingWrap .malt-upgrade-panel').forEach(el=>el.remove());
  const upgrades=fieldUpgrades();
  if(!upgrades.maltCapacityUpgraded){
    $('#maltingWrap')?.insertAdjacentHTML('beforeend', `<div class="malt-upgrade-panel"><button class="field-upgrade-buy icon-action-btn malt-capacity-upgrade-buy" type="button" data-upgrade="malt-capacity" data-tip="Ampliar un 50% la capacidad de cebada de las 4 zonas de malteado.\nCoste: ${MALT_CAPACITY_UPGRADE_COST} k€.\nNueva capacidad por zona: ${Math.round(MALT_TILE_CAPACITY_KG*MALT_CAPACITY_UPGRADE_FACTOR).toLocaleString('es-ES')} Kg.">${actionButtonLabel('img/cebada_germinando.png', actionLabel('Capacidad', MALT_CAPACITY_UPGRADE_COST), 'capacidad malteado')}</button></div>`);
  } else if(!upgrades.autoMalting){
    $('#maltingWrap')?.insertAdjacentHTML('beforeend', `<div class="malt-upgrade-panel"><button class="field-upgrade-buy icon-action-btn malt-capacity-upgrade-buy" type="button" data-upgrade="auto-malting" data-tip="Automalteado.\nCoste: ${MALT_AUTOMALTING_COST} k€.\nSeca la malta automáticamente en el momento preciso.\nAl usarlo aplica -${AUTOMATION_QUALITY_PENALTY}Q a esa malta.">${actionButtonLabel('img/cebada_germinando_malteada.png', actionLabel('Automalteado', MALT_AUTOMALTING_COST), 'automalteado')}</button></div>`);
  } else {
    $('#maltingWrap')?.insertAdjacentHTML('beforeend', `<div class="malt-upgrade-panel"><button class="field-upgrade-toggle icon-action-btn malt-capacity-upgrade-buy ${upgrades.autoMaltingEnabled===false?'off':'on'}" type="button" data-upgrade-toggle="auto-malting" data-tip="Automalteado ${upgrades.autoMaltingEnabled===false?'desactivado':'activado'}.\nON: seca automáticamente en el punto preciso y aplica -${AUTOMATION_QUALITY_PENALTY}Q.\nOFF: secado manual; si aciertas el rango no pierdes calidad por automatización.">${actionButtonLabel('img/cebada_germinando_malteada.png', upgrades.autoMaltingEnabled===false?'OFF':'ON', 'automalteado')}</button></div>`);
  }
  $$('.malt-tile').forEach(el=>{
    const i=+el.dataset.i, t=state.malt[i];
    const stage=normalizeMaltStage(t);
    t.maltStage=stage;
    el.classList.toggle('empty', t.status==='empty');
    el.classList.toggle('rotten-malt', t.status==='rotten');
    el.classList.toggle('needs-plough', t.status==='filled' && stage==='raw');
    el.classList.toggle('needs-water', t.status==='filled' && stage==='tilled');
    el.classList.toggle('ready-kiln', t.status==='filled' && stage==='germinating' && !t.heated && t.germ>=MALT_HARVEST_START);
    const capacityHtml = (Number(t.amount)||0) > 0 ? `<div class="malt-capacity"><i style="height:${pct(((t.amount||0)/maltTileCapacityKg())*100)}"></i></div>` : '';
    el.innerHTML = capacityHtml + (t.status==='empty' ? '' : bars(t.moisture, t.germ, MALT_HARVEST_START, MALT_OPTIMAL_END - MALT_HARVEST_START, t.status==='rotten', 'quality'));
    el.dataset.tip = maltTip(t);
    if(t.status==='filled' || t.status==='rotten'){
      const plant = document.createElement('div');
      plant.className='plant';
      plant.innerHTML = `<img class="plant-img" src="${maltBaseImage(t)}" alt="malta" draggable="false">`;
      const waterImg = maltWaterImage(t);
      if(waterImg) el.insertAdjacentHTML('beforeend', `<div class="malt-overlay"><img src="${waterImg}" alt="agua germinando"></div>`);
      if(maltedWarning(t) || t.warned) el.insertAdjacentHTML('beforeend', '<div class="warning-overlay malt-warning">⚠️</div>');
      el.appendChild(plant);
      if(t.status==='filled' && t.heated && t.germ>=MALT_HARVEST_START){
        plant.className += ' token malt-token';
        plant.dataset.drag='malt'; plant.dataset.source=i;
        plant.dataset.tip=`Malta secada${t.peatPpm?' con turba':''}.
Cantidad: ${Math.round(t.amount || 0)} Kg.
Calidad: ${Math.round(t.quality || 100)}.
Turba: ${Math.round(t.peatPpm || 0)}ppm.||Arrástrala al molino / grinder.`;
      }
      if(!t.heated && t.status!=='rotten'){
        const controls = document.createElement('div');
        controls.className='malt-controls';
        controls.innerHTML = `<button class="peat-icon ${t.peat?'on':''}" type="button" data-i="${i}" data-tip="🪵 Turba: marca esta malta como ahumada antes de secar.">🪵</button>`;
        el.appendChild(controls);
      }
      if(t.peat && !t.heated && t.status!=='rotten') el.insertAdjacentHTML('beforeend', `<div class="malt-smoke" data-smoke-i="${i}" style="--smoke-seed:${(i*733)%4200}" aria-hidden="true"><i></i><i></i><i></i></div>`);
      if(state.debugQuality) el.insertAdjacentHTML('beforeend', qualityHtml(t.quality || 100, t.peatPpm || 0, t.lineage || []));
    }
    if(t.status==='rotten') addClean(el, () => resetMaltTile(t));
  });
}

function renderVats(){
  const root = $('#fermentation');
  const v0=state.vats[0] || (state.vats[0]=newVat(true));
  const upgrade=nextVatUpgradeInfo(v0);
  root.innerHTML = `<div class="fermentation-props"><div class="mash-tun-prop" data-i="0" data-tip="Tina de maceración: recibe la mezcla tras pasar por el molino."><img src="img/tina_maceracion.png" alt=""></div><div class="mill-prop drop-target" data-i="0" data-tip="Molino / grinder.\nSuelta aquí la malta secada para molerla y macerarla antes de pasarla a fermentación."><img src="img/mill.png" alt=""></div></div>${upgrade ? `<div class="equipment-shop vat-shop"><button class="equipment-buy icon-action-btn vat-capacity-buy" type="button" data-equipment="vat-capacity" data-tip="Ampliar la capacidad de la tina de fermentación.\nCoste: ${upgrade.cost} k€.\nCapacidad actual: ${Math.round(upgrade.currentLitres).toLocaleString('es-ES')} l.\nNueva capacidad: ${Math.round(upgrade.nextLitres).toLocaleString('es-ES')} l.">${actionButtonLabel('img/tina_fermentacion.png', actionLabel(`Capacidad ${upgrade.label}`, upgrade.cost), 'tina de fermentación')}</button></div>` : ''}` + state.vats.slice(0,1).map((v,i)=>{
    const q = vatDisplayQuality(v);
    const ready = v.volume>0 && v.ferment>=FERMENT_OPTIMAL_START && !v.rotten;
    const drag = ready ? `data-drag="wash" data-vat="${i}" data-label="mosto"` : '';
    const abv = vatAbv(v);
    const warn = fermentWarning(v);
    const volumeL = vatLitres(v);
    const capacityL=vatCapacityLitres(v);
    const hasLiquid=v.volume>0;
    const tip = v.rotten ? `Tina estropeada.
Pulsa para limpiar.` : (hasLiquid ? `🧪 Tina de fermentación.
💧 Volumen: ${v.volume.toFixed(0)}% (${Math.round(volumeL)}l / ${Math.round(capacityL)}l).
🌿 Fermentación: ${v.ferment.toFixed(0)}%.
⭐ Calidad: ${Math.round(q)}.
🧪 Gradación: ${abv.toFixed(1)}°.
🪵 Turba: ${Math.round(v.peatPpm || 0)}ppm.${warn?'||Atención: si no echas levadura pronto, se estropeará.':''}` : `🧪 Tina de fermentación.
Capacidad: ${Math.round(capacityL).toLocaleString('es-ES')} l.
Sin líquido.`);
    const canYeast=hasLiquid && !v.yeast && !v.rotten;
    return `<div class="machine-unit vat-unit primary-vat vat-upgrades-${vatUpgradeCount(v)} drop-target ${ready?'ready-drag':''} ${v.rotten?'rotten-vat':''} ${canYeast?'can-yeast':''}" data-i="${i}" ${drag} data-tip="${tip}">
      ${hasLiquid ? qualityHtml(q, v.peatPpm || 0, v.lineage || []) : ''}
      <div class="bar vertical vol"><i style="height:${pct(v.volume)}"></i><span class="bar-abv">Vol</span></div>
      <img class="machine-sprite vat-sprite" src="img/tina_fermentacion.png" alt="tina de fermentación" draggable="false">
      ${v.rotten ? '<div class="vat-rot-overlay"><img src="img/tina_fermentacion_estropeada.png" alt="fermentación estropeada"></div>' : ''}
      ${warn ? '<div class="warning-overlay">⚠️</div>' : ''}
      <div class="bar vertical ranged ferment quality-gradient"><em style="height:${FERMENT_ROTTEN_AT-FERMENT_OPTIMAL_START}%;bottom:${FERMENT_OPTIMAL_START}%"></em><i style="height:${pct(v.ferment)};background:${qualityColor(q)}"></i><span class="bar-abv">Ferm ${abv.toFixed(1)}°</span></div>
      ${v.rotten ? `<button class="pixel-btn small clean-vat-btn" type="button" data-i="${i}">Limpiar</button>` : (canYeast ? `<button class="pixel-btn small yeast-btn" type="button" data-i="${i}">🧫 Echar levadura</button>` : '')}
    </div>`;
  }).join('');
}

function renderStills(){
  const root = $('#stillhouse');
  const canBuyStill = state.stills.some((s,i)=>i>0 && !isStillActive(s,i));
  const upgrades=fieldUpgrades();
  const shopButtons=[];
  if(canBuyStill) shopButtons.push(`<button class="equipment-buy icon-action-btn" type="button" data-equipment="still" data-tip="Comprar un alambique nuevo.\nCoste: ${EQUIPMENT_COST} k€.">${actionButtonLabel('img/alambique.png', actionLabel('Comprar', EQUIPMENT_COST), 'alambique')}</button>`);
  if(!upgrades.thermostatBuilt) shopButtons.push(`<button class="equipment-buy icon-action-btn thermostat-buy" type="button" data-equipment="thermostat" data-tip="Termostato para la sala de alambiques.\nCoste: ${THERMOSTAT_COST} k€.\nON: sincroniza el fuego de todos los alambiques activos y limita a ${THERMOSTAT_TEMP_MAX}°C.">${actionButtonLabel('img/termostato_ON.png', actionLabel('Termostato', THERMOSTAT_COST), 'termostato')}</button>`);
  if(upgrades.thermostatBuilt && !upgrades.thermostatAutomation) shopButtons.push(`<button class="equipment-buy icon-action-btn thermostat-buy" type="button" data-equipment="thermostat-auto" data-tip="Mejorar termostato.\nCoste: ${THERMOSTAT_AUTOMATION_COST} k€.\nCon la mejora ON, cualquier fuego sincroniza todos los alambiques activos y se limita exactamente a ${THERMOSTAT_AUTOMATION_TEMP}°C.\nAl usarlo aplica -2% Q por pasada de destilación.">${actionButtonLabel('img/termostato_ON.png', actionLabel('Mejorar', THERMOSTAT_AUTOMATION_COST), 'mejorar termostato')}</button>`);
  const thermostatTip=upgrades.thermostatAutomation
    ? `Termostato automático ${upgrades.thermostatAutomationEnabled===false?'OFF':'ON'}.\nClick para ${upgrades.thermostatAutomationEnabled===false?'activar':'desactivar'} automatización.\nON: cualquier fuego sincroniza todos los alambiques activos, limita a ${THERMOSTAT_AUTOMATION_TEMP}°C y aplica -2% Q por pasada.\nOFF: control manual de uno en uno, sin límite de ${THERMOSTAT_AUTOMATION_TEMP}°C ni penalización por automatización.`
    : `Termostato ${upgrades.thermostatOn===false?'apagado':'encendido'}.\nClick para ${upgrades.thermostatOn===false?'encender':'apagar'}.\nON: cualquier fuego sincroniza todos los alambiques activos y limita a ${THERMOSTAT_TEMP_MAX}°C.\nOFF: control manual de uno en uno, sin límite de termostato.`;
  const thermostatOverlay=upgrades.thermostatBuilt ? `<button class="thermostat-overlay ${upgrades.thermostatAutomation ? 'auto' : ''} ${upgrades.thermostatOn===false || upgrades.thermostatAutomationEnabled===false?'off':'on'}" type="button" data-tip="${escapeHtml(thermostatTip)}"><img src="${upgrades.thermostatOn===false || upgrades.thermostatAutomationEnabled===false?'img/termostato.png':'img/termostato_ON.png'}" alt="termostato" draggable="false"></button>` : '';
  root.innerHTML = `${shopButtons.length ? `<div class="equipment-shop still-shop">${shopButtons.join('')}</div>` : ''}${thermostatOverlay}` + state.stills.map((s,i)=>{
    const spiritReady = s.output > 0;
    const visualTemp = Number.isFinite(Number(s.tempDisplay)) ? Number(s.tempDisplay) : s.temp;
    const tempColor=temperatureColor(s.temp);
    const visualTempColor=temperatureBarColor(visualTemp);
    const hasInput=s.input>0, hasOutput=s.output>0;
    const inputTip=hasInput ? `<p>💧 ${s.input.toFixed(0)}% (${Math.round(s.input/100*STILL_INPUT_LITRES)}l)</p><p>⭐ Calidad ${Math.round(qualityOrDefault(s.inputQuality))}</p><p>🧪 Gradación ${s.inputAbv.toFixed(0)}°</p><p>🪵 Turba ${Math.round(s.inputPeatPpm||0)}ppm</p>` : '<p class="tip-muted">Sin líquido.</p>';
    const outputTip=hasOutput ? `<p>💧 ${s.output.toFixed(1)}% (${Math.round(stillOutLitres(s))}l)</p><p>⭐ Calidad ${Math.round(qualityOrDefault(s.outputQuality))}</p><p>🧪 Gradación ${s.outputAbv.toFixed(0)}°</p><p>🪵 Turba ${Math.round(s.outputPeatPpm||0)}ppm</p>` : '<p class="tip-muted">Sin líquido.</p>';
    const autoText=thermostatAutomationActive() ? `<p>🤖 Termostato automático: fuego sincronizado, límite ${THERMOSTAT_AUTOMATION_TEMP}°C, -2% Q por pasada.</p>` : '';
    const tip = `<div class="tip-wide still-tip"><div class="tip-head"><b>⚗️ Alambique ${i+1}</b><span class="still-heat" style="--still-temp-color:${tempColor};color:${tempColor}">🔥 ${s.temp.toFixed(0)}°C</span></div>${autoText}
<div class="tip-cols"><section><h5>Entrada</h5>${inputTip}</section><section><h5>Salida</h5>${outputTip}</section></div></div>||1ª pasada: low wines ~${LOW_WINES_ABV_TARGET}°. 2ª pasada: new make ~${NEW_MAKE_ABV_TARGET}°. 3ª pasada opcional: triple destilado ~${THIRD_DISTILL_ABV_TARGET}°. Por encima de 100° arrastra agua: más volumen, menos ABV/calidad, nunca más LPA.`;
    const mirrored=i%2===1;
    const inputSide=mirrored?'right':'left', outputSide=mirrored?'left':'right';
    const inputBtn=`<button class="pixel-btn small empty-still-btn empty-still-input empty-side-${inputSide}" type="button" data-i="${i}" data-zone="input" data-tip="Vaciar entrada del alambique.\nDescarta el líquido del lado de entrada."><span class="empty-icon">🪣</span></button>`;
    const fireBtn=`<button class="pixel-btn small fire-btn" type="button" data-i="${i}" data-tip="Fuego.\nEnciende o apaga el calentamiento."><span class="fire-icon">🔥</span></button>`;
    const outputBtn=`<button class="pixel-btn small empty-still-btn empty-still-output empty-side-${outputSide}" type="button" data-i="${i}" data-zone="output" data-tip="Vaciar salida del alambique.\nDescarta el destilado del lado de salida."><span class="empty-icon">🪣</span></button>`;
    const controlRow=mirrored ? `${outputBtn}${fireBtn}${inputBtn}` : `${inputBtn}${fireBtn}${outputBtn}`;
    return `<div class="machine-unit still-unit ${i%2===1?'still-mirrored':''} ${s.fire?'fire-on':''} ${isStillActive(s,i)?'':'inactive'}" data-i="${i}" data-tip="${escapeHtml(tip)}">
      ${(hasInput || hasOutput) ? qualityHtml(hasOutput ? s.outputQuality : s.inputQuality, hasOutput ? s.outputPeatPpm : s.inputPeatPpm, hasOutput ? s.outputLineage : s.inputLineage) : ''}
      <div class="temp-chip" style="color:${tempColor}">${s.temp.toFixed(0)}°C</div>
      <div class="bar vertical input"><i style="height:${pct(s.input)}"></i><span class="bar-abv">${hasInput ? `${s.inputAbv.toFixed(0)}°` : ''}</span></div>
      <div class="bar vertical tempv"><em class="alcohol-zone" style="height:4%;bottom:58%"></em><b class="water-line" style="bottom:80%"></b><i style="height:${tempPct(visualTemp)};background:${visualTempColor}"></i><span class="bar-abv">🌡️</span></div>
      <div class="still-visual"><img class="machine-sprite still-sprite" src="img/alambique.png" alt="alambique" draggable="false">${s.fire?'<img class="machine-sprite still-sprite fire-gif" src="img/alambique.gif" alt="fuego" draggable="false">':''}</div>
      <div class="bar vertical output ${s.outputRuns>=3?'run3':''}"><i style="height:${pct(s.output)}"></i><span class="bar-abv">${hasOutput ? `${s.outputAbv.toFixed(0)}°` : ''}</span></div>
      <div class="still-drop in drop-target" data-still="${i}" data-zone="in" data-tip="Entrada del alambique: suelta mosto o destilado para segunda pasada."></div>
      <div class="still-drop out ${spiritReady?'ready-drag':''}" data-still="${i}" data-zone="out" ${spiritReady ? 'data-drag="spirit" data-label="destilado"' : ''} data-tip="Salida del alambique: arrastra de aquí a IN para segunda pasada o a barricas."></div>
      <div class="still-control-row">${controlRow}</div>
    </div>`;
  }).join('');
}

function barrelShopOptionsHtml(){
  return BARREL_SHOP_TYPES.map((key,i)=>{
    const def=barrelDef(key), total=def.litres*BARREL_PACK_SIZE, locked=state.coins<def.cost;
    const bonus=locked ? '???' : barrelBonusLine(def, 'Sin bonus', null, true);
    const tip=locked ? `No tienes dinero suficiente para ${def.label}.\nCoste: ${def.cost} k€.` : `${def.desc}\n\nCapacidad total x${BARREL_PACK_SIZE}: ${total.toLocaleString('es-ES')}l.\nBonus: ${bonus}`;
    return `<button class="barrel-shop-option ${locked?'locked':''}" type="button" data-type="${key}" ${locked?'aria-disabled="true" tabindex="-1"':''} data-tip="${escapeHtml(tip)}">
      <img class="barrel-shop-img" src="${def.image}" alt="${escapeHtml(def.label)}" draggable="false">
      <b>${i+1}. ${escapeHtml(def.label)}</b>
      <span>${escapeHtml(def.desc)}</span>
      <em><i>💰 ${def.cost} k€</i><i>🛢️ ${total.toLocaleString('es-ES')}l total</i><small>${def.litres}l/u</small></em>
      <strong>${escapeHtml(bonus)}</strong>
    </button>`;
  }).join('');
}

function renderBarrelShopModal(){
  let root=$('#barrelShopModal');
  if(!root){ root=document.createElement('div'); root.id='barrelShopModal'; root.className='barrel-shop-modal hidden'; document.body.appendChild(root); }
  if(!barrelShopOpen){ root.classList.add('hidden'); root.innerHTML=''; return; }
  root.innerHTML=`<div class="barrel-shop-window"><button class="game-popup-close barrel-shop-close" type="button" aria-label="Cerrar">×</button><header><h3>Comprar barricas</h3><p>Elige un pack de ${BARREL_PACK_SIZE} barricas.</p></header><div class="barrel-shop-grid">${barrelShopOptionsHtml()}</div></div>`;
  root.classList.remove('hidden');
}

function closeBarrelShop(play=true){
  if(!barrelShopOpen) return false;
  barrelShopOpen=false;
  renderBarrelShopModal();
  if(play) playFx('fxAhhh', .68);
  render();
  return true;
}

function renderCards(){
  const aging=$('#aging'), bottling=$('#bottling');
  aging.innerHTML=''; bottling.innerHTML='';
  const shop=document.createElement('div');
  shop.className=`barrel-shop ${barrelShopOpen?'open':''}`;
  shop.innerHTML=`<button id="barrelShopToggle" class="barrel-buy icon-action-btn" type="button" data-tip="Comprar packs de ${BARREL_PACK_SIZE} barricas.">${actionButtonLabel('img/barril_bourbon.png', 'Comprar', 'barricas')}</button>`;
  aging.appendChild(shop);
  renderBarrelShopModal();
  const discard=document.createElement('div');
  discard.id='barrelDiscard'; discard.className='barrel-discard drop-target';
  discard.dataset.tip='Descartar barriles.\nSuelta aquí cualquier pack cuando quieras retirarlo; se perderá también el líquido que contenga.';
  discard.textContent='🗑️ Barril';
  aging.appendChild(discard);
  const hist=document.createElement('button');
  hist.id='bottleHistorySide'; hist.className='bottle-history-side icon-action-btn'; hist.type='button';
  hist.dataset.tip='Histórico de botellas embotelladas. Abre fichas de lotes, composición, cata y venta.';
  hist.innerHTML=actionButtonLabel('img/bottles/bottle_title.png', 'Historial', 'historial de botellas');
  bottling.appendChild(hist);
  const ad=document.createElement('button');
  ad.id='advertisingShopToggle'; ad.className='advertising-side icon-action-btn'; ad.type='button';
  ad.dataset.tip=`Publicidad.\nCampañas compradas: ${advertisingBought()}.\nCada campaña sube 0,25€ el mínimo y máximo del mercado.`;
  ad.innerHTML=actionButtonLabel('img/adds/add01.jpg', 'Publicidad', 'publicidad');
  bottling.appendChild(ad);
  renderAdvertisingShopModal();
  state.barrels.forEach((b,i)=>{
    if(!Number.isFinite(b.x)) b.x=24+i*120; if(!Number.isFinite(b.y)) b.y=56;
    const type=barrelDef(b.type), key=barrelTypeKey(b.type);
    const el=document.createElement('div'); el.className=`card barrel-card drop-target barrel-${key} ${b.volume>0?'filled':'empty-barrel'} ${barrelIsOld(b)?'old-barrel':''}`; el.dataset.drag='barrel'; el.dataset.id=b.id;
    el.style.left=`${b.x}px`; el.style.top=`${b.y}px`;
    const liquidL=barrelLiquidL(b);
    const breakdown=componentsTip(b, liquidL);
    el.dataset.tip=barrelTooltipHtml(b, type, liquidL, breakdown);
    el.innerHTML=`${qualityHtml(b.quality, b.peatPpm || 0, b.lineage || [])}<div class="vol-label">${(b.volume||0).toFixed(0)}%</div><div class="bar vol-bar liquid-stack">${barrelSegmentsHtml(b)}</div><div class="barrel-text"><span>🕰️ ${(b.age||0).toFixed(1)}a</span><span class="abs-label">🧪 ${(b.abv||0).toFixed(0)}°</span></div><img src="${barrelImage(b)}" alt="barrica">`;
    aging.appendChild(el);
  });
  if(!state.boxes.length){
    bottling.insertAdjacentHTML('beforeend','<div class="card empty-card" data-tip="Aquí aparecerán las cajas cuando embotelles barricas maduras.\nDespués podrás moverlas por la tienda o llevarlas al camión para vender."><img src="img/bottles_no_age.png" alt="botellas">Vacío<br>Embotella barricas</div>');
  }
  state.boxes.forEach((b,i)=>{
    if(!Number.isFinite(b.x)) b.x=18+i*95; if(!Number.isFinite(b.y)) b.y=20;
    const el=document.createElement('div'); el.className='card box-card bottle-card drop-target'; el.dataset.drag='box'; el.dataset.id=b.id;
    el.style.left=`${b.x}px`; el.style.top=`${b.y}px`;
    const boxLitres=(Number(b.bottles)||0)*BOTTLE_LITRES;
    const breakdown=componentsTip(b, boxLitres, 'Botellas');
    el.dataset.tip=boxTooltipHtml(b, boxLitres, breakdown);
    el.innerHTML=`${qualityHtml(b.quality, b.peatPpm || 0, b.lineage || [])}<div class="box-text"><span>🍾 ${b.bottles}</span><span>🕰️ ${Math.floor(b.age)}a</span></div>${boxStackHtml(b)}`;
    bottling.appendChild(el);
  });
}

function buyBarrel(type){
  const key=barrelTypeKey(type), def=barrelDef(key); if(!def) return;
  if(state.coins<def.cost){ notice(`Necesitas ${def.cost} k€ para comprar barricas de ${def.label}.`, 'explain', 'No hay dinero'); return; }
  state.coins-=def.cost;
  recordBarrelPacksAcquired();
  state.barrels.push(newBarrel(key, 24 + (state.barrels.length%4)*185, 56 + Math.floor(state.barrels.length/4)*118));
  barrelShopOpen=false;
  playFx('fxCashRegister', .72);
  checkFactoryAchievement();
  markDirty(); render(); saveGame();
}

function buyEquipment(kind){
  if(kind==='vat'){
    notice('La sala trabaja ahora con una sola tina de fermentación. Usa la mejora de capacidad.', 'explain', 'Tina única');
    return;
  } else if(kind==='vat-capacity'){
    const v=state.vats[0] || (state.vats[0]=newVat(true)), upgrade=nextVatUpgradeInfo(v);
    if(!upgrade){ notice('La tina ya está al máximo de capacidad.', 'explain'); return; }
    if(state.coins < upgrade.cost){ notice(`Necesitas ${upgrade.cost} k€ para ampliar la tina.`, 'explain', 'No hay dinero'); return; }
    const litres=vatLitres(v);
    state.coins -= upgrade.cost;
    v.capacityUpgrades = vatUpgradeCount(v) + 1;
    v.capacityPct = vatCapacityPctForUpgrades(v.capacityUpgrades);
    v.volume = vatPctFromL(litres, v);
    playFx('fxCashRegister', .86);
  } else if(kind==='still'){
    if(state.coins < EQUIPMENT_COST){ notice(`Necesitas ${EQUIPMENT_COST} k€ para comprar este equipo.`, 'explain', 'No hay dinero'); return; }
    const idx=state.stills.findIndex((s,i)=>i>0 && !isStillActive(s,i));
    if(idx<0){ notice('No queda espacio para más alambiques.', 'explain'); return; }
    state.coins -= EQUIPMENT_COST;
    state.stills[idx] = newStill(true);
    playFx('fxCashRegister', .72);
  } else if(kind==='thermostat'){
    const upgrades=fieldUpgrades();
    if(upgrades.thermostatBuilt) return;
    if(state.coins < THERMOSTAT_COST){ notice(`Necesitas ${THERMOSTAT_COST} k€ para comprar el termostato.`, 'explain', 'No hay dinero'); return; }
    state.coins -= THERMOSTAT_COST;
    upgrades.thermostatBuilt=true;
    upgrades.thermostatOn=true;
    playFx('fxCashRegister', .78);
  } else if(kind==='thermostat-auto'){
    const upgrades=fieldUpgrades();
    if(!upgrades.thermostatBuilt){ notice('Primero instala el termostato inicial.', 'explain', 'Falta termostato'); return; }
    if(upgrades.thermostatAutomation) return;
    if(state.coins < THERMOSTAT_AUTOMATION_COST){ notice(`Necesitas ${THERMOSTAT_AUTOMATION_COST} k€ para mejorar el termostato.`, 'explain', 'No hay dinero'); return; }
    state.coins -= THERMOSTAT_AUTOMATION_COST;
    upgrades.thermostatAutomation=true;
    upgrades.thermostatAutomationEnabled=true;
    upgrades.thermostatOn=true;
    playFx('fxCashRegister', .78);
  } else return;
  checkFactoryAchievement();
  markDirty(); render(); saveGame();
}

function buyFieldUpgrade(kind){
  const upgrades=fieldUpgrades();
  let cost=0;
  if(kind==='warehouse'){
    if(upgrades.warehouseBuilt) return;
    cost=FIELD_WAREHOUSE_COST;
    if(state.coins < cost){ notice(`Necesitas ${cost} k€ para construir el almacén.`, 'explain', 'No hay dinero'); return; }
    state.coins-=cost;
    Object.assign(upgrades,{warehouseBuilt:true, warehouseCapacity:FIELD_WAREHOUSE_CAPACITY_KG});
  } else if(kind==='warehouse-duplicate'){
    if(!upgrades.warehouseBuilt || upgrades.warehouseDuplicated) return;
    cost=FIELD_WAREHOUSE_DUPLICATE_COST;
    if(state.coins < cost){ notice(`Necesitas ${cost} k€ para duplicar el almacén.`, 'explain', 'No hay dinero'); return; }
    state.coins-=cost;
    upgrades.warehouseDuplicated=true;
    upgrades.warehouseCapacity=FIELD_WAREHOUSE_CAPACITY_KG*2;
  } else if(kind==='warehouse-second-expansion'){
    if(!upgrades.warehouseBuilt || !upgrades.warehouseDuplicated || upgrades.warehouseSecondExpanded) return;
    cost=FIELD_WAREHOUSE_SECOND_DUPLICATE_COST;
    if(state.coins < cost){ notice(`Necesitas ${cost} k€ para ampliar el almacén.`, 'explain', 'No hay dinero'); return; }
    state.coins-=cost;
    upgrades.warehouseSecondExpanded=true;
    upgrades.warehouseCapacity=FIELD_WAREHOUSE_CAPACITY_KG*4;
  } else if(kind==='auto-water'){
    if(upgrades.autoWater) return;
    cost=FIELD_AUTOWATER_COST;
    if(state.coins < cost){ notice(`Necesitas ${cost} k€ para instalar el riego automático.`, 'explain', 'No hay dinero'); return; }
    state.coins-=cost;
    upgrades.autoWater=true;
    state.field.forEach((t,i)=>{ if(!fieldTileDisabledReason(i) && t.status==='planted'){ t.moisture=FIELD_WATER_CAP; t.dry=0; } });
  } else if(kind==='auto-harvester'){
    if(!upgrades.warehouseBuilt){ notice('Primero necesitas un almacén para guardar la cosecha automática.', 'explain', 'Sin almacén'); return; }
    if(!upgrades.autoWater){ notice('Primero instala el riego automático.', 'explain', 'Falta riego'); return; }
    if(upgrades.autoHarvester) return;
    cost=FIELD_AUTOHARVESTER_COST;
    if(state.coins < cost){ notice(`Necesitas ${cost} k€ para comprar la autocosechadora.`, 'explain', 'No hay dinero'); return; }
    state.coins-=cost;
    upgrades.autoHarvester=true;
    upgrades.autoHarvesterEnabled=true;
  } else if(kind==='malt-capacity'){
    if(upgrades.maltCapacityUpgraded) return;
    cost=MALT_CAPACITY_UPGRADE_COST;
    if(state.coins < cost){ notice(`Necesitas ${cost} k€ para ampliar el malteado.`, 'explain', 'No hay dinero'); return; }
    state.coins-=cost;
    upgrades.maltCapacityUpgraded=true;
  } else if(kind==='auto-malting'){
    if(!upgrades.maltCapacityUpgraded){ notice('Primero amplía la capacidad de malteado.', 'explain', 'Falta capacidad'); return; }
    if(upgrades.autoMalting) return;
    cost=MALT_AUTOMALTING_COST;
    if(state.coins < cost){ notice(`Necesitas ${cost} k€ para instalar el automalteado.`, 'explain', 'No hay dinero'); return; }
    state.coins-=cost;
    upgrades.autoMalting=true;
    upgrades.autoMaltingEnabled=true;
  } else return;
  clearDisabledFieldTiles();
  playFx('fxCashRegister', .76);
  checkFactoryAchievement();
  markDirty(); render(); saveGame();
}

function handleDrop(target,data,e){
  const warehouseDrop=$('.barley-warehouse-drop');
  if(e && data.drag==='box' && pointIn($('#truckDock'), e.clientX, e.clientY)){ sellBox(data.id); return; }
  if(e && data.drag==='box' && pointIn($('#bottling'), e.clientX, e.clientY)){ moveBox(data.id, e, data); return; }
  if(e && data.drag==='crop' && warehouseDrop && pointIn(warehouseDrop, e.clientX, e.clientY)){ storeCropInWarehouse(data.source); return; }
  if(data.drag==='barrel' && target.closest('#barrelDiscard')){ discardBarrel(data.id); return; }
  if(data.drag==='barrel' && target.classList.contains('barrel-card')){
    if(target.dataset.id !== data.id) transferBarrelToBarrel(data.id, target.dataset.id);
    else if(e) moveBarrel(data.id, e, data);
    return;
  }
  if(data.drag==='barrel' && target.closest('#bottling')){ bottleBarrel(data.id, e, data); return; }
  if(data.drag==='barrel' && target.closest('#aging')){ moveBarrel(data.id, e, data); return; }
  if(target.classList.contains('field-tile') && (data.drag==='seed' || data.drag==='barley-store')){
    const i=+target.dataset.i, t=state.field[i];
    if(fieldTileDisabledReason(i)) return;
    if(data.drag==='barley-store' || warehouseBuilt()){ plantFieldFromWarehouse(i); return; }
    if(t.status==='empty' && state.seeds>=SEED_KG_PER_PLOT){ state.seeds-=SEED_KG_PER_PLOT; Object.assign(t,{status:'planted', growth:0, moisture:fieldPlantMoisture(), dry:0, overdue:0, quality:100}); playFx('fxDropGrain'); }
    else if(t.status==='empty') notice('No tienes semillas suficientes. Compra semillas en el menú principal.', 'explain', 'Sin semillas');
  }
  if(target.classList.contains('barley-warehouse-drop') && data.drag==='crop'){ storeCropInWarehouse(data.source); return; }
  if(target.classList.contains('malt-tile') && data.drag==='barley-store'){ addWarehouseToMaltTile(+target.dataset.i); return; }
  if(target.classList.contains('malt-tile') && data.drag==='crop'){
    const dst=state.malt[+target.dataset.i], src=state.field[+data.source];
    if(dst && src?.growth>=FIELD_HARVEST_START && (dst.amount||0)<maltTileCapacityKg()){
      const stage=normalizeMaltStage(dst);
      if(stage==='germinating' || stage==='kilned' || dst.heated){ notice('Cuando la cebada ya está germinando o secada, no puedes añadir más cosecha a ese montón.', 'explain', 'Ese montón ya va por otro paso'); return; }
      const add=Math.min(MALT_KG_PER_PLOT, maltTileCapacityKg()-(dst.amount||0)), old=dst.amount||0;
      const baseQ=weightedQuality(old, dst.baseQuality ?? dst.quality ?? 100, add, cropQuality(src));
      Object.assign(dst,{status:'filled', amount:old+add, germ:0, moisture:0, baseQuality:baseQ, quality:baseQ, lineage:mergeLineage(dst.lineage||[], [{stage:'cultivo', q:cropQuality(src), barleyKg:FIELD_BARLEY_KG_PER_PLOT, maltKg:add, areaHa:FIELD_PLOT_AREA_HA}]), heated:false, peat:dst.peat||false, dry:0, stable:0, warned:false, maltStage:'raw'});
      Object.assign(src,{status:'empty', growth:0, moisture:0, dry:0, overdue:0, quality:100});
      playFx('fxDropGrain');
    }
  }
  if(target.classList.contains('mill-prop') && data.drag==='malt') dropMaltOnMill(data.source);
  if(target.classList.contains('still-drop') && target.dataset.zone==='in' && data.drag==='wash') transferWashToStill(+data.vat, +target.dataset.still);
  if(target.classList.contains('still-drop') && target.dataset.zone==='in' && data.drag==='spirit') redistill(+data.still, +target.dataset.still);
  if(target.classList.contains('barrel-card') && data.drag==='spirit') addSpiritToBarrel(+data.still, target.dataset.id);
  if(target.closest('#bottling') && data.drag==='box') moveBox(data.id, e, data);
}
function dropMaltOnMill(source){
  const mill=$('.mill-prop');
  const malt=takeMaltForMill(source);
  if(!malt) return;
  mill?.classList.add('milling');
  playFx('fxMillBubblesWater', .78);
  markDirty(); render(); saveGame();
  setTimeout(()=>{
    addMaltToVat(0, malt);
    mill?.classList.remove('milling');
    markDirty(); render(); saveGame();
  }, 1120);
}
function takeMaltForMill(source){
  const t=state.malt[+source];
  if(!t || t.status!=='filled' || !t.heated || t.germ<MALT_HARVEST_START) return null;
  const v=state.vats[0];
  if(!v || v.rotten) return null;
  const maltKg=Number(t.amount)||0;
  const oldLitres=vatLitres(v), capacityL=vatCapacityLitres(v);
  const washLitres=Math.min((maltKg/MALT_KG_PER_FULL_VAT)*VAT_WASH_LITRES, Math.max(0, capacityL-oldLitres));
  if(washLitres<=0){ notice('La tina de fermentación no tiene espacio para más mosto.', 'explain', 'Tina llena'); return null; }
  const malt={...t, lineage:Array.isArray(t.lineage)?t.lineage.map(x=>({...x})):[]};
  resetMaltTile(t);
  return malt;
}
function addMaltToVat(vatIndex, source){
  const fromTile=typeof source!=='object';
  const t=fromTile ? state.malt[+source] : source, v=state.vats[vatIndex];
  if(!t || !v || t.status!=='filled' || !t.heated || t.germ<MALT_HARVEST_START || v.rotten) return;
  const maltKg=Number(t.amount)||0;
  const oldLitres=vatLitres(v), capacityL=vatCapacityLitres(v);
  const washLitres=Math.min((maltKg/MALT_KG_PER_FULL_VAT)*VAT_WASH_LITRES, Math.max(0, capacityL-oldLitres)); if(washLitres<=0) return;
  const add=vatPctFromL(washLitres, v);
  v.unlocked = true;
  v.baseQuality=weightedQuality(oldLitres, qualityOrDefault(v.baseQuality, qualityOrDefault(v.quality)), washLitres, qualityOrDefault(t.quality));
  v.quality=v.baseQuality;
  v.peatPpm=weightedValue(oldLitres, v.peatPpm, washLitres, t.peatPpm || 0);
  v.lineage=mergeLineage(v.lineage||[], t.lineage||[], [{stage:'malteado', q:t.quality||100, peat:t.peatPpm||0, maltKg, washLitres}]);
  v.maltAdds = (Number(v.maltAdds)||0) + 1;
  if(v.yeast){ v.soleraAddsAfterYeast = (Number(v.soleraAddsAfterYeast)||0) + 1; if(v.soleraAddsAfterYeast >= 5) awardAchievement('solera'); }
  v.ferment = oldLitres ? v.ferment*(oldLitres/(oldLitres+washLitres)) : 0;
  v.volume = vatPctFromL(oldLitres + washLitres, v); v.rotten=false; v.warned=false; v.idle=0; v.overferment=0;
  if(fromTile) resetMaltTile(t);
}
function transferWashToStill(vatIndex, stillIndex){
  const v=state.vats[vatIndex], s=state.stills[stillIndex];
  if(!v || !s || v.volume<=0 || v.ferment<FERMENT_OPTIMAL_START || v.rotten) return;
  const sourceL=vatLitres(v), oldInputL=stillInLitres(s), availableL=STILL_INPUT_LITRES-oldInputL;
  const moveL=Math.min(sourceL, availableL); if(moveL<=0) return;
  const moveVatPct=vatPctFromL(moveL, v);
  const addStillPct=moveL/STILL_INPUT_LITRES*100;
  const q=vatDisplayQuality(v);
  s.inputLineage=mergeLineage(s.inputLineage||[], v.lineage||[], [{stage:'fermentacion', q, ferment:v.ferment, litres:moveL}]);
  s.input += addStillPct;
  addStillInputComponent(s, {id:uuid(), label:`Tina ${vatIndex+1}`, litres:moveL, quality:q, abv:vatAbv(v), peatPpm:v.peatPpm||0});
  s.runs=0;
  v.volume -= moveVatPct;
  playFx('fxBubblesDrop');
  if(v.volume<1) clearVat(v);
}
function redistill(fromIndex, toIndex){
  const from=state.stills[fromIndex], to=state.stills[toIndex];
  if(!from || !to || from.output<=0) return;
  from.unlocked = true; to.unlocked = true;
  if((from.outputRuns || 0) >= 3){ notice('Ya está en tercera destilación. Puedes embotellar/envejecer ese destilado; no hace falta una cuarta pasada.'); return; }
  const fromL=stillOutLitres(from);
  const availableInputL=(100-to.input)/100*STILL_INPUT_LITRES;
  const moveL=Math.min(fromL, availableInputL); if(moveL<=0) return;
  const toOldL=to.input/100*STILL_INPUT_LITRES;
  const toAddPct=moveL/STILL_INPUT_LITRES*100;
  const fromSubPct=moveL/STILL_OUTPUT_LITRES*100;
  to.inputLineage=mergeLineage(to.inputLineage||[], from.outputLineage||[], [{stage:'redestilacion_entrada', from:fromIndex, litres:moveL}]);
  to.input += toAddPct;
  addStillInputComponent(to, {id:uuid(), label:`Alambique ${fromIndex+1}`, litres:moveL, quality:qualityOrDefault(from.outputQuality), abv:from.outputAbv||0, peatPpm:from.outputPeatPpm||0});
  to.runs=from.outputRuns;
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
function ageMixDiff(a,b){
  const na = Number(a)||0, nb = Number(b)||0;
  return Math.abs(na-nb);
}
async function confirmAgeMix(existingAge, incomingAge, context='líquidos'){
  const diff = ageMixDiff(existingAge, incomingAge);
  if(diff <= 3) return true;
  return gamePopup({
    title:'Mezclar líquidos de edades distintas',
    mood:'warn',
    confirm:true,
    ok:'Aceptar',
    cancel:'Cancelar',
    msg:`Vas a mezclar ${context} con más de 3 años de diferencia (${existingAge.toFixed(1)}a y ${incomingAge.toFixed(1)}a). El lote resultante contará como la edad menor y puede perder valor. ¿Seguro que quieres hacerlo?`
  });
}
async function addSpiritToBarrel(stillIndex, id){
  const s=state.stills[stillIndex], b=state.barrels.find(x=>x.id===id);
  if(!s || !b || s.output<=0) return;
  s.unlocked = true;
  if(s.outputAbv<40){ notice('El destilado tiene menos de 40° ABV. Mínimo debe tener 40°; haz una nueva destilación antes de meterlo en barrica.', 'angry', 'No se puede embarricar'); return; }
  if(s.outputRuns<2){ notice('Este destilado necesita una nueva destilación antes de pasar a barrica.', 'explain', 'Falta una pasada'); return; }
  const oldLitres=barrelLiquidL(b), availableL=barrelCapacityL(b)-oldLitres;
  if(availableL<=0) return;
  if(oldLitres>0 && !(await confirmAgeMix(Number(b.age)||0, 0, 'un destilado nuevo y whisky envejecido'))) return;
  const sourceL=stillOutLitres(s);
  const targetAbv=Math.min(s.outputAbv,CASK_FILL_ABV);
  const dilutedL=s.outputAbv>CASK_FILL_ABV ? sourceL * s.outputAbv / targetAbv : sourceL;
  const addL=Math.min(dilutedL, availableL);
  if(addL<=0) return;
  const oldVol=b.volume||0;
  const incomingQ=qualityOrDefault(s.outputQuality);
  const batchId=uuid();
  const bType=barrelTypeKey(b.type);
  const batchComponent={id:batchId, label:liquidLabel(`${s.outputRuns || 1}º dest.`, s.outputLineage), color:liquidColor(batchId), litres:addL, abv:targetAbv, quality:incomingQ, peatPpm:s.outputPeatPpm || 0, age:0, runs:s.outputRuns||0, startedAtAge:0, barrelTrail:[bType]};
  b.age = oldLitres>0 ? Math.min(b.age || 0, 0) : 0;
  b.quality = weightedQuality(oldLitres, b.quality, addL, incomingQ);
  b.peatPpm = weightedValue(oldLitres, b.peatPpm, addL, s.outputPeatPpm || 0);
  b.abv = weightedValue(oldLitres, b.abv, addL, targetAbv);
  b.components = mergeComponents(normalizeComponents(b, oldLitres), [batchComponent]);
  b.lineage = mergeLineage(b.lineage||[], s.outputLineage||[], [{stage:'barrica', batchId, barrelType:bType, barrelQ:b.barrelQuality||100, sourceL, dilutedL, addedL:addL, discardedL:Math.max(0,dilutedL-addL), abv:targetAbv, peat:s.outputPeatPpm||0}]);
  clearBottlingRegionRoll(b);
  b.volume = barrelPctFromL(b, oldLitres + addL);
  playFx('fxBubblesDrop', .62);
  playFx('fxWoodRelease', .52);
  clearStillOutput(s);
  markDirty(); render(); saveGame();
}
function askBarrelTransferAmount(from, to, maxL){
  return new Promise(resolve=>{
    const old=$('#barrelTransferModal'); old?.remove();
    const max=Math.max(1, Math.floor(maxL));
    const modal=document.createElement('div'); modal.id='barrelTransferModal'; modal.className='barrel-transfer-modal';
    const fromDef=barrelDef(from.type), toDef=barrelDef(to.type);
    modal.innerHTML=`<div class="barrel-transfer-card"><h3>Trasiego entre barricas</h3><p>Elige cuántos litros mover al destino.</p><div class="transfer-visual"><figure><img src="${barrelImage(from)}" alt="${escapeHtml(fromDef.label)}"><figcaption>Origen<br><b>${Math.round(barrelLiquidL(from))}l</b></figcaption></figure><span>→</span><figure><img src="${barrelImage(to)}" alt="${escapeHtml(toDef.label)}"><figcaption>Destino<br><b>${Math.round(barrelCapacityL(to)-barrelLiquidL(to))}l libres</b></figcaption></figure></div><input id="barrelTransferRange" type="range" min="1" max="${max}" step="1" value="${max}"><strong id="barrelTransferLabel">${max.toLocaleString('es-ES')}l</strong><div class="bottle-actions"><button id="barrelTransferOk" class="pixel-btn small" type="button">Transferir</button><button id="barrelTransferCancel" class="pixel-btn small danger" type="button">Cancelar</button></div></div>`;
    document.body.appendChild(modal);
    const range=$('#barrelTransferRange'), label=$('#barrelTransferLabel');
    const update=()=>{ label.textContent=`${Number(range.value).toLocaleString('es-ES')}l`; };
    range.oninput=update; update();
    const close=v=>{ document.removeEventListener('keydown', onKey); modal.remove(); resolve(v); };
    const onKey=e=>{ if(e.key==='Enter'){ e.preventDefault(); close(Number(range.value)||0); } if(e.key==='Escape'){ e.preventDefault(); close(null); } };
    document.addEventListener('keydown', onKey);
    setTimeout(()=>range?.focus?.(),0);
    $('#barrelTransferCancel').onclick=()=>close(null);
    $('#barrelTransferOk').onclick=()=>close(Number(range.value)||0);
  });
}
async function transferBarrelToBarrel(fromId,toId){
  const from=state.barrels.find(x=>x.id===fromId), to=state.barrels.find(x=>x.id===toId);
  if(!from || !to || from===to || (from.volume||0)<=0) return;
  const fromL=barrelLiquidL(from), toL=barrelLiquidL(to), availableL=barrelCapacityL(to)-toL;
  const maxMoveL=Math.min(fromL, availableL); if(maxMoveL<=0) return;
  const chosenL=await askBarrelTransferAmount(from,to,maxMoveL);
  if(chosenL===null) return;
  const moveL=clamp(chosenL, 0, maxMoveL); if(moveL<=0) return;
  if(toL>0 && !(await confirmAgeMix(Number(to.age)||0, Number(from.age)||0, 'dos barriles'))) return;
  const toType=barrelTypeKey(to.type);
  const movedComponents=splitComponents(from, fromL, moveL).map(c=>({...c, quality:qualityOrDefault(c.quality), barrelTrail:[...(c.barrelTrail||[]), toType]}));
  to.quality=weightedQuality(toL, to.quality, moveL, from.quality||100);
  to.peatPpm=weightedValue(toL, to.peatPpm, moveL, from.peatPpm||0);
  to.abv=weightedValue(toL, to.abv, moveL, from.abv||0);
  to.age=toL>0 ? Math.min(to.age||0, from.age||0) : (from.age||0);
  to.components=mergeComponents(normalizeComponents(to, toL), movedComponents);
  to.lineage=mergeLineage(to.lineage||[], from.lineage||[], [{stage:'trasiego_barril', from:barrelTypeKey(from.type), to:toType, litres:moveL}]);
  clearBottlingRegionRoll(to);
  clearBottlingRegionRoll(from);
  to.volume=barrelPctFromL(to, toL+moveL);
  from.volume=barrelPctFromL(from, fromL-moveL);
  degradeBarrel(from);
  playFx('fxBubblesDrop', .62);
  if(from.volume<.1) Object.assign(from,{volume:0,age:0,abv:0,quality:100,peatPpm:0,components:[],lineage:[],bottlingRegionRoll:null}); clearBottlingRegionRoll(from);
  markDirty(); render(); saveGame();
}
function moveBarrel(id,e,data){
  const b=state.barrels.find(x=>x.id===id); if(!b || !e) return;
  Object.assign(b, localDropPoint($('#aging'), e, data));
}
async function discardBarrel(id){
  const i=state.barrels.findIndex(b=>b.id===id); if(i<0) return;
  if(await gamePopup({title:'Descartar barriles', msg:'¿Descartar este pack de barriles? Se perderá también cualquier líquido que contenga.', mood:'warn', confirm:true, ok:'Descartar'})){ state.barrels.splice(i,1); markDirty(); render(); saveGame(); }
}
function bottleOptions(abv){
  const max=Math.floor(abv||0);
  const base=[40,43,45,46,48,50].filter(x=>x<=max);
  for(let x=51;x<=max;x++) base.push(x);
  return [...new Set(base)];
}
function bottleOptionLabel(abv){
  if(abv===43 || abv===45) return 'Export strength';
  if(abv===46 || abv===48 || abv===50) return 'Premium / Non-chill strength';
  if(abv>=55) return 'Cask Strength';
  if(abv>=51) return 'High Proof';
  return '';
}
function bottleScotMood(abv){
  if(abv===40) return 'sad';
  if(abv===43 || abv===45) return 'explain';
  return 'happy';
}
function bottleStrengthQualityBonus(targetAbv){
  return targetAbv>46 ? Math.floor((targetAbv-46)/4) : 0;
}
function chillFilterEffective(targetAbv){ return [40,43,45].includes(Math.round(Number(targetAbv)||0)); }
function bottleLineageBarrelTypes(b){
  const set=new Set();
  for(const c of normalizeComponents(b, barrelLiquidL(b), 'Líquido')) for(const t of (c.barrelTrail||[])) if(t) set.add(barrelTypeKey(t));
  for(const x of (b?.lineage||[])){ const t=x.barrelType||x.to||x.from; if(t) set.add(barrelTypeKey(t)); }
  if(b?.type) set.add(barrelTypeKey(b.type));
  return [...set];
}
const isSherryType = type => ['sherry_butt','sherry_hogshead'].includes(barrelTypeKey(type));
const isBourbonType = type => ['ex_bourbon_barrel','ex_bourbon_hogshead'].includes(barrelTypeKey(type));
function normalizeHighlandsRoll(roll={}){ return {q:clamp(Math.floor(Number(roll.q)||0),0,3), rep:clamp(Math.round(Number(roll.rep)||0),0,1)}; }
function regionBonusSeed(){ return normalizeHighlandsRoll({q:Math.floor(Math.random()*4), rep:Math.random()<.5?1:0}); }
function lockedBottlingRegionRoll(b){
  if(state.scotlandLocation?.region !== 'highlands') return regionBonusSeed();
  const old=b?.bottlingRegionRoll;
  const roll=old ? normalizeHighlandsRoll(old) : regionBonusSeed();
  if(b && (!old || old.q!==roll.q || old.rep!==roll.rep)){ b.bottlingRegionRoll=roll; saveGame(); }
  return roll;
}
function clearBottlingRegionRoll(b){ if(b?.bottlingRegionRoll) delete b.bottlingRegionRoll; }
function regionBonusPreviewText(regionId){
  if(regionId==='highlands') return '🎲 ⭐⭐⭐ · 🎲 🏆';
  return SCOTLAND_REGIONS[regionId]?.bonus || '';
}
function regionalBottleBonus(b, targetAbv, opts={}, currentQ=qualityOrDefault(b?.quality)){
  const loc=state.scotlandLocation, region=loc?.region;
  if(!region || !SCOTLAND_REGIONS[region]) return null;
  const types=bottleLineageBarrelTypes(b), peat=weightedPeatFromComponents(b);
  const hasSherry=types.some(isSherryType), hasBourbon=types.some(isBourbonType), hasPort=types.includes('port_pipe');
  const triple=allComponentsTripleDistilled({...b, bottles:Math.max(1, Math.floor(barrelLiquidL(b)/BOTTLE_LITRES)), components:normalizeComponents(b, barrelLiquidL(b), 'Líquido')});
  const mk=(qDelta=0, repDelta=0, label=SCOTLAND_REGIONS[region].name, icon='🗺️')=>({region, label, icon, qDelta, repDelta});
  if(region==='islay'){
    if(peat>=30 && peat<=35) return mk(3,2,'Islay: turba perfecta','🌫️');
    if((peat>=25 && peat<=29) || (peat>=36 && peat<=40)) return mk(0,1,'Islay: perfil ahumado','🌫️');
  }
  if(region==='speyside' && peat<10 && (hasSherry || hasPort)) return mk(3,1,'Speyside: Jerez limpio','🍷');
  if(region==='highlands'){
    const roll=normalizeHighlandsRoll(opts.regionRoll || regionBonusSeed());
    const bonus=mk(roll.q, roll.rep, 'Highlands: carácter imprevisible','🎲');
    return (bonus.qDelta || bonus.repDelta) ? bonus : null;
  }
  if(region==='lowlands' && triple && peat===0) return mk(3,1,'Lowlands: triple destilación limpia','🌾');
  if(region==='campbeltown' && hasBourbon && hasSherry && currentQ>98) return mk(0,2,'Campbeltown: blend con carácter','⚓');
  return null;
}
function barrelRepBonusSteps(b){
  return bottleLineageBarrelTypes(b).map(type=>({type, def:barrelDef(type), rep:Number(barrelDef(type).repBonus)||0})).filter(x=>x.rep);
}
function bottleReputationDelta(targetAbv, barrelAbv, opts={}){
  const repSteps=Array.isArray(opts.repSteps) ? opts.repSteps : [];
  let rep=0;
  if(targetAbv===40) rep -= 1;
  else if(targetAbv>=46){
    const caskStrength = targetAbv>60 && targetAbv>=Math.floor(Number(barrelAbv)||0);
    rep += 1 + (caskStrength ? 1 : 0);
  }
  rep += repSteps.reduce((sum,x)=>sum + (Number(x.rep)||0), 0);
  rep += Number(opts.regionRepDelta)||0;
  if(opts.chillFilter && chillFilterEffective(targetAbv)) rep -= 1;
  if(opts.caramelColor) rep -= 1;
  return rep;
}
function applyBottleQualityStep(q, label, nextQ, icon='⭐'){
  const before=Number(q)||0, after=clamp(Number(nextQ)||0,0,100);
  return {q:after, step:{label, icon, delta:after-before}};
}
function bottleQualityResult(sourceQ, b, targetAbv, opts={}){
  const steps=[];
  const lineageTypes=bottleLineageBarrelTypes(b);
  let q=qualityOrDefault(sourceQ);
  let r=applyBottleQualityStep(q, 'Barrica usada', q*((b?.barrelQuality ?? 100)/100), '🛢️'); q=r.q; steps.push(r.step);
  for(const type of lineageTypes){
    const def=barrelDef(type);
    if(Number(def.qBonus||0)){ r=applyBottleQualityStep(q, def.label, q + Number(def.qBonus), '⭐'); q=r.q; steps.push(r.step); }
    else if(Number(def.qualityFactor||1)!==1){ r=applyBottleQualityStep(q, def.label, q*Number(def.qualityFactor), '⭐'); q=r.q; steps.push(r.step); }
    if(def.virginBonus && type===barrelTypeKey(b?.type)){ r=applyBottleQualityStep(q, 'Virgin Oak aleatorio', q + Number(b?.virginBonus||0), '⭐'); q=r.q; steps.push(r.step); }
  }
  const strengthBonus=bottleStrengthQualityBonus(targetAbv);
  if(strengthBonus){ r=applyBottleQualityStep(q, 'Gradación', q + strengthBonus, '🔥'); q=r.q; steps.push(r.step); }
  if(opts.chillFilter && chillFilterEffective(targetAbv)){ r=applyBottleQualityStep(q, 'Chill Filter', q*1.03, '❄️'); q=r.q; steps.push(r.step); }
  else if(opts.chillFilter){ steps.push({label:'Chill Filter (sin efecto >45°)', icon:'❄️', delta:0}); }
  if(opts.caramelColor){ r=applyBottleQualityStep(q, 'E150a natural', q*1.03, '🍯'); q=r.q; steps.push(r.step); }
  const regionBonus=regionalBottleBonus(b, targetAbv, opts, q);
  if(regionBonus?.qDelta){ r=applyBottleQualityStep(q, `Región: ${regionBonus.label}`, q + regionBonus.qDelta, regionBonus.icon || '🗺️'); q=r.q; steps.push(r.step); }
  return {finalQ:q, steps, strengthBonus, regionBonus, typeQualityFactor:lineageTypes.reduce((prod,type)=>prod*Number(barrelDef(type).qualityFactor||1),1), virginBonus:barrelDef(b?.type).virginBonus?Number(b?.virginBonus||0):0};
}
function formatQDelta(delta){ const rounded=Math.round(delta); return `${rounded>=0?'+':''}${rounded} ⭐`; }
function formatRepDelta(delta){ const rounded=Math.round(delta); return `${rounded>=0?'+':''}${rounded} Reputación de la Destilería`; }
function bonusDeltaClass(delta){ return Number(delta)<0 ? 'delta-negative' : (Number(delta)>0 ? 'delta-positive' : 'delta-neutral'); }
function bonusGlyphs(icon, delta){ const n=Math.min(8, Math.max(1, Math.abs(Math.round(delta)||1))); return icon.repeat(n); }
function bonusMetricHtml(delta, icon, label){
  const n=Math.round(Number(delta)||0); if(!n) return '';
  return `<b class="bonus-delta ${bonusDeltaClass(n)}">${n>0?'+':''}${n} ${bonusGlyphs(icon,n)}</b> <em>(${escapeHtml(label)})</em>`;
}
function bonusItemHtml(label, qDelta=0, repDelta=0){
  const bits=[bonusMetricHtml(qDelta,'⭐','Calidad'), bonusMetricHtml(repDelta,'🏆','Reputación')].filter(Boolean).join(' ');
  return bits ? `<i><span class="bonus-source">${escapeHtml(label)}:</span> ${bits}</i>` : '';
}
function weightedPeatFromComponents(b){
  const comps=normalizeComponents(b, barrelLiquidL(b), 'Líquido');
  const total=comps.reduce((sum,c)=>sum+(Number(c.litres)||0),0);
  if(total>0) return comps.reduce((sum,c)=>sum+(Number(c.litres)||0)*(Number(c.peatPpm)||0),0)/total;
  return Number(b?.peatPpm)||0;
}
function bottlePreview(b, targetAbv, opts={}){
  const liquidL = barrelLiquidL(b);
  const finalLitres = liquidL * (b.abv || targetAbv) / targetAbv;
  const bottles=Math.floor(finalLitres / BOTTLE_LITRES);
  const quality=bottleQualityResult(b.quality, b, targetAbv, opts);
  const repSteps=barrelRepBonusSteps(b);
  return {liquidL, finalLitres, bottles, ...quality, repSteps, repDelta:bottleReputationDelta(targetAbv, b.abv, {...opts, repSteps, regionRepDelta:quality.regionBonus?.repDelta||0})};
}
function bottlePreviewHtml(b, targetAbv, opts={}){
  const p=bottlePreview(b,targetAbv,opts), rep=p.repDelta>0?`+${p.repDelta}`:`${p.repDelta}`;
  const bonusRows=new Map();
  const addBonus=(label, q=0, r=0)=>{ const key=String(label||'Bonus'); const cur=bonusRows.get(key)||{q:0,r:0}; cur.q+=Number(q)||0; cur.r+=Number(r)||0; bonusRows.set(key,cur); };
  p.steps.filter(s=>Math.round(s.delta)!==0).forEach(s=>addBonus(s.label, s.delta, 0));
  p.repSteps.forEach(x=>addBonus(x.def.label, 0, x.rep));
  if(targetAbv===40) addBonus('Gradación', 0, -1);
  else if(targetAbv>=46) addBonus('Gradación', 0, 1 + (targetAbv>60 && targetAbv>=Math.floor(Number(b.abv)||0) ? 1 : 0));
  if(opts.chillFilter && chillFilterEffective(targetAbv)) addBonus('Chill Filter', 0, -1);
  if(opts.caramelColor) addBonus('E150a natural', 0, -1);
  if(p.regionBonus?.qDelta || p.regionBonus?.repDelta) addBonus(`Región ${regionName(p.regionBonus.region)}`, p.regionBonus.qDelta||0, p.regionBonus.repDelta||0);
  const bonuses=[...bonusRows.entries()].map(([label,v])=>bonusItemHtml(label,v.q,v.r)).filter(Boolean).join('');
  return `<div class="bottle-preview">
    <div class="bottle-preview-totals"><b class="bottle-total bottles">🍾 ${p.bottles}</b><b class="bottle-total reputation ${bonusDeltaClass(p.repDelta)}">🏆 Rep ${rep}</b><b class="bottle-total quality">⭐ Q ${Math.round(p.finalQ)}</b><b class="bottle-total abv">🧪 ${targetAbv}°</b></div>
    ${bonuses ? `<span class="bottle-bonuses">${bonuses}</span>` : ''}
  </div>`;
}
function bottleBarrel(id,e,data){
  const b=state.barrels.find(x=>x.id===id); if(!b || (b.volume||0)<=0) return;
  if(b.abv < 40){ notice('Para embotellar whisky legalmente debe tener al menos 40° ABV.', 'angry', 'Demasiado flojo'); return; }
  if(b.age < 3){ notice('Aún no puede embotellarse como whisky escocés auténtico: necesita al menos 3 años de envejecimiento.', 'angry', 'Demasiado joven'); return; }
  const p=e ? localDropPoint($('#bottling'), e, data) : {x:18+state.boxes.length*95,y:20};
  openBottleDialog(b,p);
}
function openBottleDialog(b,p){
  const opts=bottleOptions(b.abv); if(!opts.length) return;
  const old=$('#bottleModal'); old?.remove();
  playFx('fxCork', .72);
  const modal=document.createElement('div'); modal.id='bottleModal'; modal.className='bottle-modal';
  const previewLot={...b, bottles:1, image:chooseBottleArt({...b,bottles:1})};
  modal.innerHTML=`<div class="bottle-card-modal"><img id="bottleScot" class="bottle-scot" src="${scotImg('happy')}" alt="" onerror="this.hidden=true"><div class="bottle-copy"><h3>Embotellar</h3><p>Elige grado ABV final</p><div class="bottle-flow"><img class="bottle-source-barrel" src="${barrelImage(b)}" alt="barrica" draggable="false"><div class="bottle-slider-wrap"><input id="bottleAbvRange" type="range" min="0" max="${opts.length-1}" step="1" value="${opts.length-1}"><strong id="bottleAbvLabel"></strong></div><div class="bottle-target-box">${boxStackHtml(previewLot)}</div></div><div class="bottle-options"><label class="chill-option"><input id="chillFilter" type="checkbox"><span><i class="option-icon">❄️</i> Chill Filter</span><em><b>⭐ +3 Calidad aprox</b><br><b class="bad">🏆 -1 Reputación</b></em></label><label class="caramel-option"><input id="caramelColor" type="checkbox"><span><i class="option-icon">🍯</i> Colorante E150a</span><em><b>⭐ +3 Calidad aprox</b><br><b class="bad">🏆 -1 Reputación</b></em></label></div><div id="bottlePreview"></div><div class="bottle-actions"><button id="bottleOk" class="pixel-btn small" type="button">Embotellar</button><button id="bottleCancel" class="pixel-btn small danger" type="button">Cancelar</button></div></div></div>`;
  document.body.appendChild(modal);
  const input=$('#bottleAbvRange'), label=$('#bottleAbvLabel'), scot=$('#bottleScot'), preview=$('#bottlePreview'), chill=$('#chillFilter'), caramel=$('#caramelColor');
  const regionRoll=lockedBottlingRegionRoll(b);
  const selectedOpts=()=>({chillFilter:!!chill?.checked && !chill.disabled, caramelColor:!!caramel?.checked, regionRoll});
  const update=()=>{ const abv=opts[+input.value], txt=bottleOptionLabel(abv), chillAllowed=chillFilterEffective(abv); label.innerHTML=`${abv}°${txt ? ` <span>${txt}</span>` : ''}`; if(chill){ if(!chillAllowed) chill.checked=false; chill.disabled=!chillAllowed; const row=chill.closest('label'); row?.classList.toggle('disabled-option', !chillAllowed); row?.classList.toggle('muted-option', !chillAllowed); row?.classList.toggle('selected', !!chill.checked && chillAllowed); } if(caramel) caramel.closest('label')?.classList.toggle('selected', !!caramel.checked); if(preview) preview.innerHTML=bottlePreviewHtml(b,abv,selectedOpts()); if(scot) scot.src=scotImg(bottleScotMood(abv)); };
  input.oninput=update; update();
  chill.onchange=update; caramel.onchange=update;
  const close=()=>{ document.removeEventListener('keydown', onKey); modal.remove(); };
  const accept=()=>{ finishBottleBarrel(b.id, opts[+input.value], p, selectedOpts()); close(); playFx('fxAhhh', .58); markDirty(); render(); saveGame(); };
  const onKey=e=>{ if(e.key==='Enter'){ e.preventDefault(); accept(); } if(e.key==='Escape'){ e.preventDefault(); close(); playFx('fxAhhh', .68); } };
  document.addEventListener('keydown', onKey);
  $('#bottleCancel').onclick=()=>{ close(); playFx('fxAhhh', .68); };
  $('#bottleOk').onclick=accept;
}
function finishBottleBarrel(id,targetAbv,p={x:18+state.boxes.length*95,y:20}, opts={}){
  const b=state.barrels.find(x=>x.id===id); if(!b || (b.volume||0)<=0 || b.age<3 || targetAbv<40 || targetAbv>b.abv) return;
  const preview=bottlePreview(b,targetAbv,opts);
  const {liquidL, finalLitres, bottles, strengthBonus, typeQualityFactor, virginBonus, finalQ, regionBonus}=preview;
  if(bottles<=0) return;
  const age=Math.floor((Number(b.age)||0) + 0.05);
  const bottleComponents=normalizeComponents(b, liquidL).map(c=>({...c, litres:c.litres * (finalLitres/liquidL), abv:targetAbv, quality:bottleQualityResult(c.quality, b, targetAbv, opts).finalQ, age:Math.floor((Number(c.age ?? age)||0) + 0.05)}));
  const boxId=uuid();
  const lineage=mergeLineage(b.lineage||[], [{stage:'embotellado', abv:targetAbv, liquidL, finalLitres, bottles, barrelType:barrelTypeKey(b.type), barrelQ:b.barrelQuality??100, typeQualityFactor, virginBonus, strengthQualityBonus:strengthBonus, regionBonus:regionBonus?{...regionBonus}:null, chillFilter:!!opts.chillFilter, caramelColor:!!opts.caramelColor, reputationDelta:preview.repDelta, peat:b.peatPpm||0}]);
  const seq=++state.bottleHistorySeq;
  const lotDraft={id:boxId, seq, bottledAt:Date.now(), bottles, age, abv:targetAbv, quality:finalQ, peatPpm:b.peatPpm||0, regionBonus:regionBonus?{...regionBonus}:null, components:bottleComponents.map(c=>({...c})), lineage, sold:false, salePricePerBottle:0, saleTotal:0};
  const image=chooseBottleArt(lotDraft);
  const lot={...lotDraft, image};
  state.boxes.push({...lot, x:p.x, y:p.y});
  state.bottleHistory.unshift(lot);
  noteLotCreated(lot);
  playFx('fxNewBottles', .82);
  state.bottles += bottles;
  if(preview.repDelta) addReputation(preview.repDelta);
  markPublicProfileDirty('bottled');
  degradeBarrel(b);
  Object.assign(b,{volume:0,age:0,abv:0,quality:100,peatPpm:0,components:[],lineage:[],bottlingRegionRoll:null}); clearBottlingRegionRoll(b);
}
function moveBox(id,e,data){
  const b=state.boxes.find(x=>x.id===id); if(!b || !e) return;
  Object.assign(b, localDropPoint($('#bottling'), e, data));
}
const TRUCK_IMAGES = ['img/truck1.png','img/truck2.png','img/truck3.png','img/truck4.png'];
function pickTruckImage(except=currentTruck){
  const pool = TRUCK_IMAGES.filter(x=>x!==except);
  return (pool.length ? pool : TRUCK_IMAGES)[Math.floor(Math.random()*(pool.length ? pool.length : TRUCK_IMAGES.length))];
}
function ensureTruckSprite(){
  const dock=$('#truckDock'); if(!dock) return null;
  let img=$('#truckSprite');
  if(!img){
    img=document.createElement('img'); img.id='truckSprite'; img.className='truck-sprite'; img.alt='camión'; img.draggable=false;
    dock.appendChild(img);
  }
  if(!currentTruck) currentTruck=pickTruckImage(null);
  img.src=currentTruck;
  return img;
}
function clearTruckTimers(){ truckTimerIds.forEach(clearTimeout); truckTimerIds=[]; }
function animateTruckSale(){
  const img=ensureTruckSprite(); if(!img) return;
  clearTruckTimers();
  truckBusy = true;
  img.classList.remove('returning','away');
  void img.offsetWidth;
  playFx('fxTruckStart', .82);
  img.classList.add('leaving');
  truckTimerIds.push(setTimeout(()=>{
    img.classList.remove('leaving'); img.classList.add('away');
    const prev=currentTruck; currentTruck=pickTruckImage(prev);
    const next=new Image(); next.onload=()=>{ img.src=currentTruck; }; next.src=currentTruck;
    truckTimerIds.push(setTimeout(()=>{
      img.src=currentTruck;
      img.classList.remove('away'); img.classList.add('returning');
      playFx('fxTruckReverse', .78);
      truckTimerIds.push(setTimeout(()=>{ img.classList.remove('returning'); truckBusy=false; }, 4400));
    }, 9000));
  }, 3600));
}
function sellBox(id){
  if(truckBusy){ notice('El camión está fuera repartiendo. Espera a que vuelva al muelle para vender otra caja.', 'explain', 'Camión fuera'); return; }
  const i=state.boxes.findIndex(b=>b.id===id); if(i<0) return;
  const b=state.boxes.splice(i,1)[0];
  const euros=b.bottles * Math.max(.1,b.age) * state.market * ((b.quality || 100)/100);
  const hist=(state.bottleHistory||[]).find(x=>x.id===b.id);
  const soldLot=hist || b;
  soldLot.sold=true;
  soldLot.salePricePerBottle=euros/Math.max(1,b.bottles);
  soldLot.saleTotal=euros;
  soldLot.soldAt=Date.now();
  if(!hist) state.bottleHistory.unshift({...soldLot});
  updateSoldStats(soldLot, euros);
  state.coins += euros/1000;
  state.bottles = Math.max(0, (Number(state.bottles)||0) - (Number(b.bottles)||0));
  markPublicProfileDirty('box-sold');
  playFx('fxCashRegister', .78);
  animateTruckSale();
  markDirty(); render(); saveGame();
}


function render(opts={}){
  const force=!!opts.force;
  normalizeEquipmentUnlocks();
  if((dragging || pointerActive) && !force){ updateMarketHud(); updateDragMarketChart(); renderPending = true; return; }
  renderPending = false;
  checkFactoryAchievement();
  $('.name-field').classList.toggle('editing', nameEditing);
  $('#distilleryNameView').textContent = state.distilleryName;
  $('#distilleryName').value = state.distilleryName;
  $('#reputation').textContent = `${Math.round(distillery().reputation||0)}`;
  $('#coins').textContent = `${state.coins.toFixed(0)} k€`;
  $('#seeds').textContent = `${availableSeedKg().toFixed(0)} Kg`;
  $('#bottles').textContent = `${state.bottles}`;
  $('#seedInventory').dataset.tip = warehouseBuilt()
    ? `🌾 Cebada disponible en el almacén.\nArrastra este icono a una parcela vacía para plantar ${SEED_KG_PER_PLOT} Kg desde el almacén.`
    : `🌾 Semillas disponibles.\nArrastra este icono a una parcela vacía para plantar ${SEED_KG_PER_PLOT} Kg.`;
  $('#bottleStat')?.setAttribute('data-tip', '🍾 Botellas en tienda. Click para abrir el histórico completo de lotes embotellados.');
  updateMarketHud();
  const warehouseText = warehouseBuilt() ? ` · 🏚️ Almacén ${Math.round(warehouseKg()).toLocaleString('es-ES')}/${Math.round(warehouseCapacity()).toLocaleString('es-ES')} Kg Q${Math.round(fieldUpgrades().warehouseQuality)}` : '';
  $('#resources').dataset.tip = `Recursos:\n🏆 Reputación ${Math.round(distillery().reputation||0)} · 🪙 Monedas ${state.coins.toFixed(0)} k€ · 🌾 ${warehouseBuilt() ? 'Almacén/siembra' : 'Semillas'} ${availableSeedKg().toFixed(0)} Kg (${SEED_KG_PER_PLOT} Kg/parcela)${warehouseText} · 🍾 Botellas ${state.bottles} · 📈 Mercado ${state.market.toFixed(2)} € x botella x años`;
  $('#scotlandMapButton')?.classList.toggle('hidden', !state.scotlandLocation);
  $('#scotlandMapButton')?.setAttribute('data-tip', state.scotlandLocation ? `Mapa de Escocia. Localización: ${regionName(state.scotlandLocation.region)}. Abre el modo social/multijugador para ver ranking y otras destilerías.` : 'Mapa de Escocia: modo social/multijugador.');
  if(localStorage.getItem(HELP_HINT_KEY) === '1') showScotlandMapHintIfNeeded();
  $('#game').classList.toggle('debug-tools-visible', debugToolsVisible);
  updateDragMarketChart();
  $('#speedSlider').value = state.speedStep;
  $('#speedSlider')?.style.setProperty('--speed-unlock', `${((achievementMaxSpeedStep()+4)/13*100).toFixed(1)}%`);
  $('#speedLabel').textContent = speedLabel();
  $('#seedInventory').classList.toggle('disabled', availableSeedKg() < SEED_KG_PER_PLOT);
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
  const min=marketLowerBound(), max=marketUpperBound();
  const damp = Math.pow(.91, Math.min(sp, 30));
  const target = clamp(Number(state.marketTarget) || MARKET_MID, min, max);
  const drift = (target - state.market) * .015 * sp + (Number(state.marketTrend)||0) * sp;
  const noise = (Math.random() + Math.random() - 1) * (Number(state.marketVolatility)||.016) * Math.sqrt(Math.max(.2, sp));
  state.marketVelocity = clamp((Number(state.marketVelocity)||0) * damp + drift + noise, -.080, .080);
  state.market = Number(state.market) + state.marketVelocity;
  if(state.market < min || state.market > max){
    state.market = clamp(state.market, min, max);
    state.marketVelocity *= -.62;
    state.marketTarget = rnd(min + .08, max - .08);
  }
  recordMarketSample(Date.now());
  for(const [i,t] of state.field.entries()){
    if(t.status==='planted'){
      if(fieldTileDisabledReason(i)){ resetFieldTile(t); continue; }
      const regionalGrowth = state.scotlandLocation?.region === 'speyside' ? 1.5 : 1;
      if(fieldUpgrades().autoWater){ t.moisture=FIELD_WATER_CAP; t.dry=0; }
      else t.moisture=clamp(t.moisture-.06*sp,0,FIELD_WATER_CAP);
      if(t.moisture>8 && t.growth < FIELD_FULL_GROWTH) t.growth = clamp(t.growth + 0.0375*regionalGrowth*sp*(0.55+t.moisture/FIELD_WATER_CAP), 0, FIELD_FULL_GROWTH);
      if(autoHarvestCrop(i)) continue;
      t.dry = t.moisture<=4 ? (t.dry || 0) + sp : 0;
      t.overdue = t.growth>=FIELD_FULL_GROWTH ? (t.overdue || 0) + sp : 0;
      if(t.dry>FIELD_DRY_SECONDS*10 || t.overdue>FIELD_OVERDUE_SECONDS*10) t.status='dry';
    }
  }
  for(const t of state.malt){
    if(t.status==='filled'){
      if(t.heated){
        t.moisture=0; t.stable=(t.stable || 0)+sp;
        if(shouldWarnMalted(t)){ t.warned=true; playFx('fxWarning', .68); }
        if(t.stable>MALT_KILNED_GRACE) t.status='rotten';
      } else if(normalizeMaltStage(t)==='germinating'){
        t.moisture=clamp(t.moisture-.06*sp,0,100);
        if(t.moisture>8) t.germ += 0.22*sp*(t.moisture/62);
        t.dry = (t.germ>0 && t.moisture<=4) ? (t.dry || 0) + sp : 0;
        if(t.germ>0) t.quality = maltFinalQuality(t);
        if(autoMaltingActive() && t.germ>=MALT_OPTIMAL_MID && t.germ<100) autoHeatMalt(t);
        if(t.germ>100 || t.dry>MALT_DRY_SECONDS*14) t.status='rotten';
      }
    }
  }
  for(const v of state.vats){
    if(v.volume>0 && !v.rotten){
      v.idle += sp;
      if(v.yeast){
        const before=Number(v.ferment)||0;
        v.ferment=clamp(before+FERMENT_RATE_PER_TICK*sp,0,FERMENT_ROTTEN_AT);
        v.overferment = v.ferment>=FERMENT_ROTTEN_AT && before>=FERMENT_ROTTEN_AT ? (Number(v.overferment)||0)+sp : 0;
        v.abv=vatAbv(v); v.quality=vatDisplayQuality(v);
      }
      if(!v.yeast && !v.warned && v.idle>FERMENT_IDLE_ROT/2){ v.warned=true; playFx('fxWarning', .68); }
      if(!v.yeast && v.idle>FERMENT_IDLE_ROT) v.rotten=true;
      if(v.yeast && (Number(v.overferment)||0)>FERMENT_ROTTEN_GRACE) v.rotten=true;
    }
  }
  const thermostatAuto=thermostatAutomationActive();
  const thermostatHeatCap=stillTempCap();
  for(const s of state.stills){
    const maxTemp=s.fire ? thermostatHeatCap : TEMP_MAX;
    s.temp = clamp(s.temp + (s.fire ? .66*sp : -.38*sp), TEMP_MIN, maxTemp);
    s.tempDisplay = Number.isFinite(Number(s.tempDisplay)) ? s.tempDisplay + (s.temp - s.tempDisplay) * Math.min(1, .18*sp) : s.temp;
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
      if(s.input>0 && inputL>0) scaleStillInputComponents(s, Math.max(0, inputL-actualTakeL)/inputL);
      s.outputRuns=Math.max(s.outputRuns,run);
      s.outputAbv=prevOut>0 ? ((s.outputAbv*prevOut)+(outAbv*outVolume))/(prevOut+outVolume) : outAbv;
      const baseOutQuality=thermostatAuto ? clamp(inputQuality * THERMOSTAT_AUTOMATION_QUALITY_FACTOR, 0, 100) : inputQuality;
      const outQuality=baseOutQuality*(1-waterFactor*.45);
      s.outputQuality=prevOut>0 ? (((s.outputQuality||100)*prevOut)+(outQuality*outVolume))/(prevOut+outVolume) : outQuality;
      s.outputPeatPpm=prevOut>0 ? weightedValue(prevOut, s.outputPeatPpm, outVolume, s.inputPeatPpm) : (s.inputPeatPpm || 0);
      s.outputLineage=mergeLineage(s.outputLineage, s.inputLineage, [{stage:'destilado', run, kind:target.label, abv:outAbv, inputLitres:actualTakeL, litres:outLitres, lpa:recoveredLpa, recovery, q:outQuality, thermostatAutomation:thermostatAuto}]);
      s.inputAbv=s.input>0?s.inputAbv:0;
      if(s.input<=0){ clearStillInput(s); }
    }
  }
  for(const b of state.barrels){ if((b.volume||0)>0){ const beforeAge=Number(b.age)||0, old=Math.floor(beforeAge), ageFactor=Number(barrelDef(b.type).agingFactor||1); b.age = beforeAge + (sp/1800)*ageFactor; const delta=b.age-beforeAge; if(delta>0 && Array.isArray(b.components)) b.components=b.components.map(c=>({...c, age:(Number(c.age)||0)+delta})); if(Math.floor(b.age)>old){ b.volume*=.95; scaleComponents(b,.95); } } }
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
    if(missing>0) simulate(missing/TICK_MS);
  }
  const capped = backgroundSince!==null && (now-backgroundSince)>=BACKGROUND_SIM_CAP_MS;
  backgroundSince=null; backgroundSimulatedMs=0; lastTickAt=now; if(capped) setSpeedStep(0);
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
  simulate(simMs/TICK_MS);
}

function waterField(tile){
  const i=+tile.dataset.i, t=state.field[i];
  if(fieldTileDisabledReason(i) || fieldUpgrades().autoWater) return;
  if(t?.status==='planted'){
    t.moisture=FIELD_WATER_CAP; t.dry=0;
    playFx('fxWater', .62);
    markDirty(); render();
  }
}
function waterMalt(tile, amount=100){
  const t=state.malt[+tile.dataset.i];
  if(t?.status==='filled' && t.status!=='rotten' && !t.heated){
    t.moisture=100; t.dry=0; t.maltStage='germinating';
    playFx('fxWater', .62);
    markDirty(); render();
  }
}
function advanceMaltTile(tile){
  const t=state.malt[+tile.dataset.i];
  if(!t || t.status!=='filled' || t.heated || t.status==='rotten') return false;
  const stage=normalizeMaltStage(t);
  if(stage==='raw'){
    t.maltStage='tilled';
    playFx('fxDropGrain', .55);
    markDirty(); render(); saveGame();
    return true;
  }
  if(stage==='tilled'){
    waterMalt(tile, 100); saveGame();
    return true;
  }
  if(stage==='germinating' && t.germ>=MALT_HARVEST_START){
    heatMalt(tile.dataset.i);
    return true;
  }
  return false;
}
function applyMaltKiln(t, {automated=false}={}){
  if(!t || t.status!=='filled' || t.heated || t.status==='rotten' || t.germ<MALT_HARVEST_START) return;
  t.peat = !!t.peat;
  t.peatPpm = t.peat ? TURBA_MAX_PPM : 0;
  t.baseQuality = maltBaseQuality(t);
  t.heated = true; t.moisture = 0; t.stable = 0; t.warned = false; t.maltStage='kilned';
  const finalQ=maltFinalQuality(t);
  t.quality = automated ? clamp(finalQ - AUTOMATION_QUALITY_PENALTY, 0, 100) : finalQ;
  t.lineage = mergeLineage(t.lineage||[], [{stage:'secado_malta', q:t.quality, peat:t.peatPpm||0, germ:t.germ, automated}]);
  return true;
}
function heatMalt(i){
  const t=state.malt[+i];
  if(!applyMaltKiln(t)) return;
  playFx('fxFlameShort', .72);
  markDirty(); render(); saveGame();
}
function autoHeatMalt(t){
  if(!applyMaltKiln(t, {automated:true})) return false;
  playFx('fxFlameShort', .46);
  markDirty();
  return true;
}

function isStagePanSurfaceTarget(target){
  if(!target?.closest?.('#game')) return false;
  if(target.closest('button,input,label,select,textarea,a,[data-drag],.drop-target,.field-tile,.malt-tile,.machine-unit,.card,.clean,.bar,.quality-pill,.warning-overlay,.field-upgrade-panel,.field-upgrade-overlay,.equipment-shop,.barrel-shop,.barrel-discard,#hud,#hudIcon,#tooltip,.game-popup,.bottle-modal,.market-sim-modal,.advertising-shop-modal,.scotland-map-overlay')) return false;
  return !!target.closest('#game,#finca,#fincaRoofs');
}
function startStagePan(e){
  const middlePan=e.button===1 && e.target.closest('#game');
  const surfacePan=e.button===0 && isStagePanSurfaceTarget(e.target);
  if(!middlePan && !surfacePan) return false;
  e.preventDefault(); e.stopPropagation();
  stagePan = { pointerId:e.pointerId, x:e.clientX, y:e.clientY, startX:stageOffsetX, startY:stageOffsetY };
  e.target.setPointerCapture?.(e.pointerId);
  document.body.classList.add('stage-panning');
  return true;
}
function moveStagePan(e){
  if(!stagePan || e.pointerId !== stagePan.pointerId) return false;
  e.preventDefault();
  stageOffsetX = stagePan.startX + (e.clientX - stagePan.x);
  stageOffsetY = stagePan.startY + (e.clientY - stagePan.y);
  applyStageTransform();
  return true;
}
function endStagePan(e){
  if(!stagePan || (e?.pointerId !== undefined && e.pointerId !== stagePan.pointerId)) return false;
  stagePan = null;
  document.body.classList.remove('stage-panning');
  return true;
}
function dragDataFrom(el){
  const type = el.dataset.drag;
  if(type==='seed' && availableSeedKg() < SEED_KG_PER_PLOT) return null;
  if(type==='barley-store' && warehouseKg()<=0) return null;
  return {...el.dataset, label: el.dataset.label || el.textContent.trim() || type};
}
function makeGhost(data, source){
  const ghost = document.createElement('div');
  ghost.className = `drag-ghost token ${data.drag}-token`;
  if(data.drag==='crop') ghost.innerHTML = `<img class="plant-img" src="${MALT_IMAGES.wet}" alt="grano para maltear">`;
  else if(data.drag==='malt') ghost.innerHTML = `<img class="plant-img" src="img/mill.png" alt="molino">`;
  else if(data.drag==='barley-store') ghost.innerHTML = `<img class="plant-img" src="img/cebada_germinando.png" alt="cebada del almacén">`;
  else if(data.drag==='wash') ghost.textContent = 'mosto';
  else if(data.drag==='spirit') ghost.textContent = 'dest.';
  else {
    const clone=source.cloneNode(true); clone.classList.add('drag-ghost');
    const sc=scaleNow(), rect=source.getBoundingClientRect();
    clone.style.setProperty('width', `${rect.width / sc}px`, 'important');
    clone.style.setProperty('height', `${rect.height / sc}px`, 'important');
    clone.style.transformOrigin='top left';
    clone.style.transform=`scale(${sc})`;
    return clone;
  }
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
  data.offsetScreenX = e.clientX - rect.left;
  data.offsetScreenY = e.clientY - rect.top;
  if(data.drag==='barrel' || data.drag==='box') playFx('fxWoodGrab', .58);
  if(data.drag==='box') data.bottleFxGrab = playRandomFx(BOTTLE_BOX_FX, .62);
  markDropHints(data);
  const ghost = makeGhost(data, source);
  if(source.classList.contains('card')){ ghost.style.width=`${rect.width}px`; ghost.style.height=`${rect.height}px`; }
  document.body.appendChild(ghost);
  dragging = {data, ghost, pointerId:e.pointerId, source, lastTarget:null, x:e.clientX, y:e.clientY, moved:false, card:source.classList.contains('card')};
  moveGhost(e.clientX, e.clientY);
}
function moveGhost(x,y){ if(!dragging) return; if(dragging.card){ dragging.ghost.style.left=`${x - (Number(dragging.data.offsetScreenX)||0)}px`; dragging.ghost.style.top=`${y - (Number(dragging.data.offsetScreenY)||0)}px`; } else { dragging.ghost.style.left=`${x}px`; dragging.ghost.style.top=`${y}px`; } }
function clearHover(){ dragging?.lastTarget?.classList.remove('hover'); if(dragging) dragging.lastTarget=null; }
function dropTargetFromPoint(x, y, data=null){
  const stack=document.elementsFromPoint(x,y);
  if(data?.drag==='malt'){
    const mill=stack.map(el=>el.closest?.('.mill-prop')).find(Boolean);
    if(mill) return mill;
  }
  if(data?.drag==='crop'){
    const warehouse=stack.map(el=>el.closest?.('.barley-warehouse-drop')).find(Boolean);
    if(warehouse) return warehouse;
  }
  return stack.map(el=>el.closest?.('.drop-target')).find(Boolean) || null;
}
function updateDropHover(e){
  if(!dragging) return;
  dragging.ghost.style.display='none';
  const target=dropTargetFromPoint(e.clientX,e.clientY,dragging.data);
  dragging.ghost.style.display='';
  if(target!==dragging.lastTarget){ clearHover(); if(target){ target.classList.add('hover'); dragging.lastTarget=target; } }
}
function endDrag(e){
  if(!dragging) return;
  dragging.ghost.style.display='none';
  const target=dropTargetFromPoint(e.clientX,e.clientY,dragging.data);
  dragging.ghost.style.display='';
  const {data, source, moved} = dragging;
  clearHover(); clearHints(); dragging.ghost.remove(); dragging=null; updateDragMarketChart();
  if(moved && (data.drag==='barrel' || data.drag==='box')) playFx('fxWoodRelease', .58);
  if(data.drag==='box') playRandomFx(BOTTLE_BOX_FX, .62, data.bottleFxGrab);
  if(!moved && source?.closest?.('.field-tile')){ waterField(source.closest('.field-tile')); return; }
  if(moved){ suppressNextClick = true; clearTimeout(suppressClickTimer); suppressClickTimer = setTimeout(()=>{ suppressNextClick=false; }, 350); }
  if(target){ handleDrop(target, data, e); markDirty(); render(); }
}

document.addEventListener('pointerdown', e=>{ pointerActive = true; }, true);
document.addEventListener('pointerup', () => setTimeout(()=>{ pointerActive = false; if(renderPending) render(); }, 0), true);
document.addEventListener('pointercancel', () => setTimeout(()=>{ pointerActive = false; if(renderPending) render(); }, 0), true);

document.addEventListener('pointerdown', e=>{
  if(startStagePan(e)) return;
  if(e.target.closest('button, input, label')) return;
  const dragSource = e.target.closest('[data-drag]');
  if(dragSource) return startDrag(e, dragSource);
});
document.addEventListener('pointermove', e=>{
  if(moveStagePan(e)) return;
  if(!dragging) return;
  if(Math.hypot(e.clientX-dragging.x, e.clientY-dragging.y)>10) dragging.moved=true;
  moveGhost(e.clientX,e.clientY); updateDropHover(e);
});
document.addEventListener('pointerup', e=>{ if(endStagePan(e)) return; endDrag(e); });
document.addEventListener('pointercancel', e=>{ if(endStagePan(e)) return; endDrag(e); });
document.addEventListener('auxclick', e=>{ if(e.button===1 && e.target.closest('#game')) e.preventDefault(); });
document.addEventListener('click', e=>{
  if(suppressNextClick){ suppressNextClick=false; clearTimeout(suppressClickTimer); e.preventDefault(); e.stopPropagation(); return; }
  if(e.target.closest('.clean, button, input')) return;
  const fieldTile=e.target.closest('.field-tile');
  if(fieldTile){
    const i=+fieldTile.dataset.i, t=state.field[i];
    if(fieldTileDisabledReason(i)) return;
    if(t?.status==='dry' || t?.status==='rotten'){ Object.assign(t,{status:'empty',growth:0,moisture:0,dry:0,overdue:0,quality:100}); playFx('fxDropGrain'); markDirty(); render(); saveGame(); return; }
    if(t?.status==='empty' && warehouseBuilt()){ plantFieldFromWarehouse(i); markDirty(); render(); saveGame(); }
    else if(t?.status==='empty' && state.seeds>=SEED_KG_PER_PLOT){ state.seeds-=SEED_KG_PER_PLOT; Object.assign(t,{status:'planted', growth:0, moisture:fieldPlantMoisture(), dry:0, overdue:0, quality:100}); playFx('fxDropGrain'); markDirty(); render(); }
    else waterField(fieldTile);
  }
  const maltTile=e.target.closest('.malt-tile');
  if(maltTile){ const t=state.malt[+maltTile.dataset.i]; if(t?.status==='rotten'){ resetMaltTile(t); playFx('fxDropGrain'); markDirty(); render(); saveGame(); return; } if(advanceMaltTile(maltTile)) return; }
  const vat=e.target.closest('.vat-unit');
  if(vat){
    const i=+vat.dataset.i, v=state.vats[i];
    if(v?.rotten){ clearVat(v); markDirty(); render(); }
    else if(e.target.closest('.vat-sprite')) addYeastToVat(i);
  }
});
document.addEventListener('click', e=>{
  const cleanVat=e.target.closest('.clean-vat-btn'); if(cleanVat){ e.preventDefault(); e.stopPropagation(); const v=state.vats[+cleanVat.dataset.i]; if(v?.rotten){ clearVat(v); markDirty(); render(); saveGame(); } return; }
  const peatIcon=e.target.closest('.peat-icon'); if(peatIcon){ e.preventDefault(); e.stopPropagation(); const t=state.malt[+peatIcon.dataset.i]; if(t && t.status==='filled' && !t.heated){ t.peat=!t.peat; markDirty(); render(); } return; }
  const heat=e.target.closest('.heat-tile'); if(heat) heatMalt(heat.dataset.i);
  const yeast=e.target.closest('.yeast-btn'); if(yeast){ addYeastToVat(+yeast.dataset.i); }
  const upgradeToggle=e.target.closest('.field-upgrade-toggle');
  if(upgradeToggle){
    e.preventDefault(); e.stopPropagation();
    toggleUpgrade(upgradeToggle.dataset.upgradeToggle);
    return;
  }
  const thermostat=e.target.closest('.thermostat-overlay'); if(thermostat){ const upgrades=fieldUpgrades(); if(upgrades.thermostatAutomation){ upgrades.thermostatAutomationEnabled = upgrades.thermostatAutomationEnabled === false; upgrades.thermostatOn=true; } else if(upgrades.thermostatBuilt){ upgrades.thermostatOn = upgrades.thermostatOn === false; } markDirty(); render(); saveGame(); return; }
  const fire=e.target.closest('.fire-btn'); if(fire){ toggleStillFire(+fire.dataset.i); return; }
  const empty=e.target.closest('.empty-still-btn'); if(empty){ emptyStillZone(+empty.dataset.i, empty.dataset.zone); }
});

function toggleUpgrade(kind){
  const upgrades=fieldUpgrades();
  if(kind==='auto-harvester' && upgrades.autoHarvester){
    upgrades.autoHarvesterEnabled = upgrades.autoHarvesterEnabled === false;
  } else if(kind==='auto-malting' && upgrades.autoMalting){
    upgrades.autoMaltingEnabled = upgrades.autoMaltingEnabled === false;
  } else if(kind==='thermostat-auto' && upgrades.thermostatAutomation){
    upgrades.thermostatAutomationEnabled = upgrades.thermostatAutomationEnabled === false;
    upgrades.thermostatOn=true;
  } else return;
  markDirty(); render(); saveGame();
}

function addYeastToVat(i){
  const v=state.vats[+i];
  if(!v || v.volume<=0 || v.rotten || v.yeast) return false;
  v.yeast=true; v.warned=false; v.idle=0; v.soleraAddsAfterYeast=0; v.maltAdds=Number(v.maltAdds)||0;
  markDirty(); render(); saveGame();
  return true;
}

async function emptyStillZone(i, zone='input'){
  const s=state.stills[i]; if(!s) return;
  s.unlocked = true;
  const target = zone === 'output' ? 'output' : 'input';
  const hasLiquid = target === 'output' ? (s.output||0)>0 : (s.input||0)>0;
  if(!hasLiquid) return;
  const what = target === 'output' ? 'la salida del alambique' : 'la entrada del alambique';
  if(await gamePopup({title:'Vaciar alambique', msg:`¿Vaciar ${what}?`, mood:'warn', confirm:true, ok:'Vaciar'})){
    s.unlocked = true;
    if(target === 'output') clearStillOutput(s);
    else clearStillInput(s);
    s.unlocked = true;
    markDirty(); render(); saveGame();
  }
}
function toggleStillFire(i){
  const s=state.stills[i];
  if(thermostatFireSyncActive()){
    const active=state.stills.map((still,idx)=>({s:still,i:idx})).filter(({s:still,i:idx})=>isStillActive(still,idx));
    if(!active.length) return;
    const targetActive=s && isStillActive(s,i);
    const next=targetActive ? !s.fire : !active.every(({s:still})=>still.fire);
    active.forEach(({s:still})=>{ still.fire=next; });
    markDirty(); render(); saveGame();
    return;
  }
  if(!s || !isStillActive(s,i)) return;
  s.fire=!s.fire; markDirty(); render(); saveGame();
}
function toggleAllStillFires(){
  const active=state.stills.map((s,i)=>({s,i})).filter(({s,i})=>isStillActive(s,i));
  if(!active.length) return;
  const next=!active.every(({s})=>s.fire);
  active.forEach(({s})=>{ s.fire=next; });
  markDirty(); render(); saveGame();
}

function debugFill(){
  state.coins = rnd(400,900); state.seeds = Math.floor(rnd(20,80));
  state.field.forEach(t=>Object.assign(t,{status:'empty', growth:0, moisture:0, dry:0, overdue:0, quality:100, watered:false, wateredAt:0, plantedAt:0}));
  const cropPresets=[
    {status:'planted', growth:8, moisture:FIELD_WATER_CAP*.85, dry:0, overdue:0, quality:100},
    {status:'planted', growth:38, moisture:FIELD_WATER_CAP*.55, dry:0, overdue:0, quality:98},
    {status:'planted', growth:FIELD_HARVEST_START+6, moisture:FIELD_WATER_CAP*.42, dry:0, overdue:0, quality:96},
    {status:'dry', growth:100, moisture:0, dry:80, overdue:80, quality:90}
  ];
  cropPresets.forEach((preset,i)=>{ if(state.field[i]) Object.assign(state.field[i], preset); });
  for(const t of state.malt){
    const heated=Math.random()<.5;
    const germ=heated ? rnd(MALT_HARVEST_START,96) : rnd(0,96);
    const peat=heated && Math.random()<.5;
    const baseQ=rnd(78,100), q=heated?maltFinalQuality({germ, baseQuality:baseQ}):(germ>=MALT_HARVEST_START?maltFinalQuality({germ, baseQuality:baseQ}):baseQ);
    Object.assign(t,{status:'filled', amount:rnd(maltTileCapacityKg()*.35,maltTileCapacityKg()), germ, moisture:heated?0:rnd(12,78), baseQuality:baseQ, quality:q, heated, peat, peatPpm:peat?TURBA_MAX_PPM:0, lineage:[{stage:'debug_malta', baseQ, q, germ}], dry:0, stable:0, warned:false, maltStage:heated?'kilned':(germ>0?'germinating':'raw')});
  }
  state.vats = [newVat(true)];
  state.vats[0] = {unlocked:true, capacityPct:ROOM_CAPACITY.vatPct, volume:rnd(35,92), ferment:rnd(FERMENT_OPTIMAL_START,FERMENT_OPTIMAL_END), yeast:true, idle:0, rotten:false, baseQuality:95, quality:95, peatPpm:Math.random()<.4?rnd(0,60):0, lineage:[{stage:'debug_vat'}], abv:0};
  state.vats[0].abv = vatAbv(state.vats[0]);
  state.stills = Array.from({length:STILL_COUNT}, (_,i)=>newStill(i===0));
  state.stills[0] = {unlocked:true, input:rnd(10,75), inputAbv:WASH_ABV_TARGET, inputQuality:95, inputPeatPpm:Math.random()<.4?rnd(0,60):0, inputLineage:[{stage:'debug_input'}], runs:0, output:rnd(42,88), outputAbv:rnd(45,68), outputQuality:94, outputPeatPpm:Math.random()<.4?rnd(0,60):0, outputLineage:[{stage:'debug_output'}], outputRuns:2, temp:rnd(78,104), fire:false};
  if(Math.random()<.55){
    state.stills[1] = {unlocked:true, input:rnd(8,64), inputAbv:rnd(6,25), inputQuality:rnd(78,96), inputPeatPpm:Math.random()<.4?rnd(0,60):0, inputLineage:[{stage:'debug_input_extra'}], runs:Math.random()<.5?0:1, output:rnd(0,55), outputAbv:rnd(35,72), outputQuality:rnd(78,96), outputPeatPpm:Math.random()<.4?rnd(0,60):0, outputLineage:[{stage:'debug_output_extra'}], outputRuns:Math.random()<.5?1:2, temp:rnd(50,106), fire:false};
  }
  state.barrels = [newBarrel('ex_bourbon_barrel',24,56), newBarrel('sherry_butt',210,56)];
  Object.assign(state.barrels[0], {volume:rnd(35,88), age:rnd(3.2,8), abv:rnd(45,68), quality:rnd(82,100), peatPpm:Math.random()<.4?rnd(0,60):0, lineage:[{stage:'debug_barrel'}]});
  state.barrels[0].components=normalizeComponents(state.barrels[0], barrelLiquidL(state.barrels[0]), 'Debug Bourbon');
  const bottles=Math.floor(rnd(300,900));
  state.boxes = [{id:uuid(), bottles, age:rnd(3,31), abv:rnd(40,55), quality:rnd(82,100), peatPpm:Math.random()<.4?rnd(0,60):0, lineage:[{stage:'debug_box'}], x:rnd(18,160), y:rnd(20,80)}]; state.boxes[0].image=chooseBottleArt(state.boxes[0]);
  const debugLots=[
    makeDebugLot(1,{quality:92,age:12.5,peatPpm:0,sold:true}),
    makeDebugLot(2,{quality:63,age:4.2,peatPpm:0,sold:true}),
    makeDebugLot(3,{quality:98,age:18.5,peatPpm:48,triple:true,sold:true}),
    makeDebugLot(4,{quality:87,age:7.5,peatPpm:22,compCount:5,sold:false}),
    makeDebugLot(5,{quality:91,age:31,peatPpm:12,compCount:3,triple:true,sold:false})
  ];
  state.bottleHistory.unshift(...debugLots);
  suppressAchievements = true;
  for(const lot of debugLots.filter(x=>x.sold)) updateSoldStats(lot, lot.saleTotal||0);
  suppressAchievements = false;
  const b3=newBarrel('ex_bourbon_hogshead',360,72); Object.assign(b3,{volume:75, age:6.4, abv:54, quality:91, peatPpm:18, lineage:[{stage:'debug_triple_liquid', barrelType:'ex_bourbon_hogshead'}]});
  b3.components=[0,1,2].map(i=>({id:uuid(), label:['Bourbon base','Jerez seco','3º dest. ahumado'][i], color:liquidColor(`debug3-${i}`), litres:barrelCapacityL(b3)*.25, age:6+i, abv:50+i*3, quality:88+i*3, peatPpm:i===2?45:10+i*6, runs:i===2?3:2, barrelTrail:[['ex_bourbon_barrel'],['sherry_butt'],['ex_bourbon_barrel','sherry_hogshead','port_pipe']][i]}));
  state.barrels.push(b3);
  state.bottles = state.boxes.reduce((a,x)=>a+(Number(x.bottles)||0),0);
  const d=distillery(); d.debugStats=true; d.stats.maxBottlePrice=Math.max(d.stats.maxBottlePrice||0, 123.45); d.stats.maxBottlesLot=Math.max(d.stats.maxBottlesLot||0, 1200);
  markDirty(); render(); saveGame();
}


document.addEventListener('click', e=>{
  const ach=e.target.closest('.force-achievement'); if(ach){ e.preventDefault(); e.stopPropagation(); forceAchievement(ach.dataset.ach); showDistilleryStats(); return; }
  const toggle=e.target.closest('#barrelShopToggle'); if(toggle){ e.preventDefault(); e.stopPropagation(); barrelShopOpen=!barrelShopOpen; playFx(barrelShopOpen?'fxCork':'fxAhhh', barrelShopOpen ? .72 : .68); render(); return; }
  const adToggle=e.target.closest('#advertisingShopToggle'); if(adToggle){ e.preventDefault(); e.stopPropagation(); advertisingShopOpen=!advertisingShopOpen; playFx(advertisingShopOpen?'fxCork':'fxAhhh', advertisingShopOpen ? .72 : .58); render(); return; }
  const closeShop=e.target.closest('.barrel-shop-close'); if(closeShop){ e.preventDefault(); e.stopPropagation(); closeBarrelShop(true); return; }
  const shopModal=e.target.closest('#barrelShopModal'); if(shopModal && e.target===shopModal){ e.preventDefault(); e.stopPropagation(); closeBarrelShop(true); return; }
  const buy=e.target.closest('.barrel-shop-option'); if(buy){ e.preventDefault(); e.stopPropagation(); if(buy.classList.contains('locked')) return; buyBarrel(buy.dataset.type); return; }
  const closeAd=e.target.closest('.advertising-shop-close'); if(closeAd){ e.preventDefault(); e.stopPropagation(); closeAdvertisingShop(true); return; }
  const adModal=e.target.closest('#advertisingShopModal'); if(adModal && e.target===adModal){ e.preventDefault(); e.stopPropagation(); closeAdvertisingShop(true); return; }
  const adPrev=e.target.closest('.ad-carousel-arrow.prev'); if(adPrev){ e.preventDefault(); e.stopPropagation(); const bought=advertisingBought(); if(bought>1){ advertisingCarouselIndex=(advertisingCarouselIndex+bought-1)%bought; renderAdvertisingShopModal(); } return; }
  const adNext=e.target.closest('.ad-carousel-arrow.next'); if(adNext){ e.preventDefault(); e.stopPropagation(); const bought=advertisingBought(); if(bought>1){ advertisingCarouselIndex=(advertisingCarouselIndex+1)%bought; renderAdvertisingShopModal(); } return; }
  const adBuy=e.target.closest('.advertising-buy'); if(adBuy){ e.preventDefault(); e.stopPropagation(); if(!adBuy.disabled) buyAdvertisingCampaign(); return; }
  const fieldUpgrade=e.target.closest('.field-upgrade-buy'); if(fieldUpgrade){ e.preventDefault(); e.stopPropagation(); buyFieldUpgrade(fieldUpgrade.dataset.upgrade); return; }
  const eq=e.target.closest('.equipment-buy'); if(eq){ e.preventDefault(); buyEquipment(eq.dataset.equipment); }
  const hist=e.target.closest('#bottleHistorySide, #bottleStat'); if(hist){ e.preventDefault(); e.stopPropagation(); showBottleHistory(); }
  const dist=e.target.closest('#distilleryStat'); if(dist){ e.preventDefault(); e.stopPropagation(); showDistilleryStats(); }
  const market=e.target.closest('#marketStat'); if(market){ e.preventDefault(); e.stopPropagation(); openMarketSimulator({toggle:true}); }
});
$('#buySeeds').onclick=()=>{
  if(state.coins + 1e-6 < SEED_PACK_COST){ notice(`Necesitas ${SEED_PACK_COST} k€ para comprar semillas.`, 'explain', 'No hay dinero'); return; }
  if(warehouseBuilt() && warehouseFreeKg() < SEED_PACK_KG){ notice('El almacén está lleno; no cabe más cebada para plantar.', 'explain', 'Almacén lleno'); return; }
  state.coins=Math.max(0, state.coins-SEED_PACK_COST);
  if(warehouseBuilt()) addBarleyToWarehouse(SEED_PACK_KG, 100);
  else state.seeds+=SEED_PACK_KG;
  playFx('fxCashRegister', .72); markDirty(); render();
};
$('#distilleryName').addEventListener('input', e=>{ state.distilleryName=e.target.value || 'Mi destilería'; markDirty(); });
$('#editName').onclick=()=>{ nameEditing=true; render(); $('#distilleryName').focus(); $('#distilleryName').select(); };
function acceptName(){ nameEditing=false; state.distilleryName=$('#distilleryName').value.trim() || 'Mi destilería'; markPublicProfileDirty('name-changed'); markDirty(); render(); saveGame(); }
$('#acceptName').onclick=acceptName;
$('#distilleryName').addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); acceptName(); }});
document.addEventListener('keydown', e=>{
  const editing = e.target?.closest?.('input, textarea, select') || nameEditing;
  if(e.key==='-' && $('#scotlandMapOverlay.visible.view-mode')){ e.preventDefault(); closeScotlandMapToDistillery(); return; }
  if(e.key==='Escape' && $('#scotlandMapOverlay.visible.view-mode')){ e.preventDefault(); closeScotlandMapToDistillery(); return; }
  if(e.key==='Escape'){ e.preventDefault(); if(closeTopPopupByEsc()) return; if(editing) return; $('#hud').classList.contains('collapsed') ? showHud() : hideHud(); return; }
  if(editing || e.ctrlKey || e.metaKey || e.altKey) return;
  if(handleKonamiKey(e)){ e.preventDefault(); return; }
  if(e.key==='º'){ e.preventDefault(); setSpeedStep((state.speedStep||0)-1); render(); return; }
  if(e.key==='1'){ e.preventDefault(); setSpeedStep(0); render(); return; }
  if(e.key==='2'){ e.preventDefault(); setSpeedStep((state.speedStep||0)+1); render(); return; }
  if(e.key==='3'){ e.preventDefault(); setSpeedStep(4); render(); return; }
  if(e.key==='4'){ e.preventDefault(); setSpeedStep(9); render(); return; }
  const fireKey={f:0,g:1,h:2,j:3}[e.key.toLowerCase()];
  if(fireKey!==undefined){ e.preventDefault(); toggleStillFire(fireKey); return; }
  if(e.key.toLowerCase()==='m'){ e.preventDefault(); setMusicEnabled(state.musicEnabled === false); saveGame(); return; }
  if(e.key.toLowerCase()==='b'){
    e.preventDefault();
    const modal=$('#bottleHistoryModal:not(.hidden)');
    if(modal) modal.querySelector('.game-popup-close')?.click();
    else showBottleHistory();
    return;
  }
  if(e.key.toLowerCase()==='p'){
    e.preventDefault();
    if($('#advertisingShopModal:not(.hidden)')) closeAdvertisingShop(true);
    else { advertisingShopOpen=true; playFx('fxCork', .72); render(); }
    return;
  }
  if(e.key==='+'){ e.preventDefault(); openMarketSimulator({toggle:true}); return; }
  if(e.key.toLowerCase()==='l'){ e.preventDefault(); const modal=$('#distilleryModal:not(.hidden)'); if(modal) modal.querySelector('.game-popup-close')?.click(); else showDistilleryStats(); return; }
  if(e.key==='-' && state.scotlandLocation){ e.preventDefault(); openScotlandMap('view'); return; }
  if(e.key.toLowerCase()==='x'){ e.preventDefault(); state.fxEnabled = state.fxEnabled === false; refreshAudioToggles(); markDirty(); saveGame(); }
});
$('#speedSlider').addEventListener('input', e=>{ setSpeedStep(Number(e.target.value)); });
$('#speedReset').onclick=()=>{ setSpeedStep(0); render(); };
$('#speedSlider').addEventListener('wheel', e=>{ e.preventDefault(); setSpeedStep(Number(state.speedStep||0)+(e.deltaY<0?1:-1)); }, {passive:false});
document.addEventListener('wheel', e=>{
  if(e.target.closest?.('#speedSlider, #bottleAbvRange, .market-sim-modal:not(.hidden), .advertising-shop-modal:not(.hidden), .scotland-map-overlay.visible, .reference-modal:not(.hidden), .help-modal:not(.hidden), .game-popup:not(.hidden), .bottle-modal, .bottle-history-modal:not(.hidden), .distillery-modal:not(.hidden)')) return;
  e.preventDefault();
  const dir = e.deltaY < 0 ? 1 : -1;
  setGameZoom(gameZoom + dir * .22, e.clientX, e.clientY);
}, {passive:false});
$('#debugFill').onclick=debugFill;
$('#toggleDebugView').onclick=()=>{ state.debugQuality=!state.debugQuality; $('#toggleDebugView').classList.toggle('on', state.debugQuality); markDirty(); render(); };
$('#toggleMusic').onclick=()=>{ setMusicEnabled(state.musicEnabled === false); saveGame(); };
$('#toggleFx').onclick=()=>{ state.fxEnabled = state.fxEnabled === false; refreshAudioToggles(); markDirty(); saveGame(); };
function setRoofsVisible(visible){
  const roof=$('#fincaRoofs');
  if(!roof) return;
  clearTimeout(roofFadeTimer);
  roof.style.setProperty('pointer-events', 'none', 'important');
  if(visible){
    roof.style.display = 'block';
    roof.classList.remove('hidden-roofs','roof-hidden');
    roof.classList.add('roof-visible');
    roofFadeTimer = setTimeout(()=>roof.classList.remove('roof-visible'), 220);
    return;
  }
  roof.classList.remove('roof-visible');
  roof.classList.add('hidden-roofs','roof-hidden');
  roofFadeTimer = setTimeout(()=>{ if(roof.classList.contains('roof-hidden')) roof.style.display = 'none'; }, 220);
}
function showHud(){ $('#hud').classList.remove('collapsed'); $('#game')?.classList.remove('roofs-active'); setRoofsVisible(false); playFx('fxCork', .72); }
function hideHud(){ $('#hud').classList.add('collapsed'); $('#game')?.classList.add('roofs-active'); setRoofsVisible(true); playFx('fxAhhh', .68); }
function showHelpHintIfNeeded(){
  if(localStorage.getItem(HELP_HINT_KEY) !== '1') $('#helpButton')?.classList.add('menu-hint');
}
function clearHamburgerHint(){
  const wasFirst = localStorage.getItem(HAMBURGER_HINT_KEY) !== '1';
  try { localStorage.setItem(HAMBURGER_HINT_KEY, '1'); } catch(_){}
  $('#hudIcon')?.classList.remove('menu-hint');
  if(wasFirst) setTimeout(showHelpHintIfNeeded, 80);
}
function clearHelpHint(){
  try { localStorage.setItem(HELP_HINT_KEY, '1'); } catch(_){}
  $('#helpButton')?.classList.remove('menu-hint');
}
function showScotlandMapHintIfNeeded(){
  const btn=$('#scotlandMapButton');
  if(btn && state.scotlandLocation && localStorage.getItem(SCOTLAND_HINT_KEY) !== '1') btn.classList.add('menu-hint');
}
function clearScotlandMapHint(){
  try { localStorage.setItem(SCOTLAND_HINT_KEY, '1'); } catch(_){}
  $('#scotlandMapButton')?.classList.remove('menu-hint');
}
async function closeHelpAndShowNextHint(){
  if(!closeOverlay('#helpModal', {silent:true})) return;
  await showKeybindingsPopup();
  setTimeout(showScotlandMapHintIfNeeded, 120);
}
if(localStorage.getItem(HAMBURGER_HINT_KEY) !== '1') $('#hudIcon')?.classList.add('menu-hint');
if(localStorage.getItem(HAMBURGER_HINT_KEY) === '1' && localStorage.getItem(HELP_HINT_KEY) !== '1') $('#helpButton')?.classList.add('menu-hint');
if(localStorage.getItem(HELP_HINT_KEY) === '1') showScotlandMapHintIfNeeded();
$('#hudIcon').onclick=()=>{ clearHamburgerHint(); $('#hud').classList.contains('collapsed') ? showHud() : hideHud(); };
$('#scotlandMapButton').onclick=()=>{ clearScotlandMapHint(); if(state.scotlandLocation) openScotlandMap('view'); };
$('#office').onclick=()=>{ clearHamburgerHint(); showHud(); };
function openOverlay(sel){ const el=$(sel); if(!el) return; el.classList.remove('hidden'); playFx('fxCork', .72); }
function closeOverlay(sel, {silent=false, fx='fxAhhh'}={}){ const el=$(sel); if(!el || el.classList.contains('hidden')) return false; el.classList.add('hidden'); if(!silent) playFx(fx, .68); return true; }
$('#helpButton').onclick=()=>{ clearHelpHint(); openOverlay('#helpModal'); };
$('#helpModal').onclick=()=>{ closeHelpAndShowNextHint(); };
$('#magnitudesButton').onclick=()=>openOverlay('#magnitudesModal');
$$('#magnitudesModal a').forEach(a=>{ a.target='_blank'; a.rel='noopener noreferrer'; });
$('#magnitudesModal').onclick=e=>{ if(e.target.closest('a')) return; closeOverlay('#magnitudesModal'); };
$('#magnitudesClose').onclick=e=>{ e.preventDefault(); e.stopPropagation(); closeOverlay('#magnitudesModal'); };
addEventListener('message', e=>{ if(e.data==='close-magnitudes') closeOverlay('#magnitudesModal'); });
$('#resetGame').onclick=async()=>{
  if(await gamePopup({title:'Reset', msg:'¿Reiniciar la partida y borrar el guardado local?', mood:'warn', confirm:true, ok:'Reset'})){
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(HAMBURGER_HINT_KEY);
    localStorage.removeItem(HELP_HINT_KEY);
    state=defaultState(); markDirty(); render(); saveGame();
    hideHud();
    $('#hudIcon')?.classList.add('menu-hint');
    $('#helpButton')?.classList.remove('menu-hint');
    showSplash();
  }
};

let pixelZoomSource=null;
let pixelZoomOverlay=null;
const pixelZoomAlphaCache=new Map();
function ensurePixelZoomOverlay(){
  if(pixelZoomOverlay) return pixelZoomOverlay;
  pixelZoomOverlay=document.createElement('img');
  pixelZoomOverlay.id='pixelZoomOverlay';
  pixelZoomOverlay.className='pixel-zoom-overlay hidden';
  pixelZoomOverlay.alt='';
  pixelZoomOverlay.draggable=false;
  document.body.appendChild(pixelZoomOverlay);
  return pixelZoomOverlay;
}
function imageDrawBox(img){
  const r=img.getBoundingClientRect();
  const nw=img.naturalWidth||r.width||1, nh=img.naturalHeight||r.height||1;
  const fit=(getComputedStyle(img).objectFit||'fill').trim();
  if(fit==='contain' || fit==='scale-down'){
    const s=Math.min(r.width/nw, r.height/nh, fit==='scale-down'?1:Infinity);
    const w=nw*s, h=nh*s;
    return {left:r.left+(r.width-w)/2, top:r.top+(r.height-h)/2, width:w, height:h, nw, nh, rect:r};
  }
  return {left:r.left, top:r.top, width:r.width, height:r.height, nw, nh, rect:r};
}
function alphaBoundsForImage(img){
  const key=img.currentSrc||img.src||'';
  if(pixelZoomAlphaCache.has(key)) return pixelZoomAlphaCache.get(key);
  const nw=img.naturalWidth||0, nh=img.naturalHeight||0;
  const fallback={x:0,y:0,w:Math.max(1,nw),h:Math.max(1,nh),nw:Math.max(1,nw),nh:Math.max(1,nh)};
  if(!nw || !nh || !img.complete) return fallback;
  try{
    const c=document.createElement('canvas'); c.width=nw; c.height=nh;
    const ctx=c.getContext('2d', {willReadFrequently:true});
    ctx.drawImage(img,0,0,nw,nh);
    const data=ctx.getImageData(0,0,nw,nh).data;
    let minX=nw, minY=nh, maxX=-1, maxY=-1;
    for(let y=0;y<nh;y++) for(let x=0;x<nw;x++){
      if(data[(y*nw+x)*4+3] > 10){
        if(x<minX) minX=x; if(x>maxX) maxX=x;
        if(y<minY) minY=y; if(y>maxY) maxY=y;
      }
    }
    const bounds=maxX>=0 ? {x:minX,y:minY,w:maxX-minX+1,h:maxY-minY+1,nw,nh} : fallback;
    pixelZoomAlphaCache.set(key, bounds);
    return bounds;
  }catch(_){ pixelZoomAlphaCache.set(key, fallback); return fallback; }
}
function clampZoomRect(left, top, w, h){
  return {
    left:Math.min(innerWidth-w-16, Math.max(16, left)),
    top:Math.min(innerHeight-h-16, Math.max(16, top))
  };
}
function clampOpaqueZoomRect(left, top, w, h, bounds){
  const bx0=bounds.x/bounds.nw, bx1=(bounds.x+bounds.w)/bounds.nw;
  const by0=bounds.y/bounds.nh, by1=(bounds.y+bounds.h)/bounds.nh;
  const min=16, maxX=innerWidth-16, maxY=innerHeight-16;
  let x=left, y=top;
  const contentLeft=()=>x+w*bx0, contentRight=()=>x+w*bx1;
  const contentTop=()=>y+h*by0, contentBottom=()=>y+h*by1;
  if(contentLeft()<min) x+=min-contentLeft();
  if(contentRight()>maxX) x-=contentRight()-maxX;
  if(contentTop()<min) y+=min-contentTop();
  if(contentBottom()>maxY) y-=contentBottom()-maxY;
  return {left:x, top:y};
}
function clearRealPixelZoom(){
  pixelZoomSource?.classList.remove('pixel-zoom-active','pixel-zoom-bottle','pixel-zoom-sticker');
  pixelZoomSource=null;
  if(pixelZoomOverlay){
    pixelZoomOverlay.className='pixel-zoom-overlay hidden';
    pixelZoomOverlay.removeAttribute('src');
    pixelZoomOverlay.removeAttribute('style');
  }
}
function activateRealPixelZoom(img,e,kind='bottle'){
  if(!img){ clearRealPixelZoom(); return; }
  if(pixelZoomSource && pixelZoomSource!==img) pixelZoomSource.classList.remove('pixel-zoom-active','pixel-zoom-bottle','pixel-zoom-sticker');
  const box=imageDrawBox(img), bounds=alphaBoundsForImage(img);
  const scale=kind==='sticker'
    ? Math.max(2.18, 172/Math.max(1, Math.min(box.width, box.height)))
    : Math.max(2.18, 468/Math.max(1, box.height));
  const w=box.width*scale, h=box.height*scale;
  const bx=(bounds.x+bounds.w/2)/bounds.nw, by=(bounds.y+bounds.h/2)/bounds.nh;
  const srcCx=box.left+box.width*bx, srcCy=box.top+box.height*by;
  const pos=kind==='bottle'
    ? clampOpaqueZoomRect(srcCx-w*bx, srcCy-h*by, w, h, bounds)
    : clampZoomRect(box.left+box.width/2-w/2, box.top+box.height/2-h/2, w, h);
  const overlay=ensurePixelZoomOverlay();
  pixelZoomSource=img;
  img.classList.add('pixel-zoom-active', kind==='sticker'?'pixel-zoom-sticker':'pixel-zoom-bottle');
  overlay.src=img.currentSrc || img.src;
  overlay.className=`pixel-zoom-overlay pixel-zoom-visible ${kind==='sticker'?'sticker':'bottle'}`;
  overlay.style.setProperty('display','block','important');
  overlay.style.setProperty('left',`${pos.left}px`,'important');
  overlay.style.setProperty('top',`${pos.top}px`,'important');
  overlay.style.setProperty('width',`${w}px`,'important');
  overlay.style.setProperty('height',`${h}px`,'important');
  overlay.style.setProperty('z-index', kind==='sticker'?'50080':'50070', 'important');
}
function installPixelZoom(){
  const handleHoverZoom=e=>{
    const x=e.clientX ?? 0, y=e.clientY ?? 0;
    const pointed=document.elementFromPoint(x, y);
    const source=pointed?.closest?.('.bottle-history-cover img, .achievement-card.unlocked .zoomable-sticker, .lot-achievement-stickers .zoomable-sticker')
      || e.target.closest?.('.bottle-history-cover img, .achievement-card.unlocked .zoomable-sticker, .lot-achievement-stickers .zoomable-sticker');
    if(!source){
      if(pixelZoomSource){
        const r=pixelZoomSource.getBoundingClientRect(), pad=18;
        if(x>=r.left-pad && x<=r.right+pad && y>=r.top-pad && y<=r.bottom+pad){
          activateRealPixelZoom(pixelZoomSource,e,pixelZoomSource.closest?.('.bottle-history-cover')?'bottle':'sticker');
          return;
        }
      }
      clearRealPixelZoom(); return;
    }
    const kind=source.closest?.('.bottle-history-cover')?'bottle':'sticker';
    activateRealPixelZoom(source,e,kind);
  };
  ['pointermove','mousemove','pointerover','mouseover'].forEach(type=>document.addEventListener(type, handleHoverZoom, true));
  document.addEventListener('pointerleave', clearRealPixelZoom, true);
  document.addEventListener('mouseout', e=>{ if(!e.relatedTarget) clearRealPixelZoom(); }, true);
  document.addEventListener('scroll', clearRealPixelZoom, true);
}
const tip=$('#tooltip');
['#helpModal','#magnitudesModal','#gamePopup'].forEach(sel=>{ const el=$(sel); if(el && el.parentElement !== document.body) document.body.appendChild(el); });
document.body.appendChild(tip);
let activeTipEl=null;
let activeTipRaw='';
let lastTipX=innerWidth/2, lastTipY=innerHeight/2;
function isMarketTipEl(el){ return !!(el && (el.id==='market' || el.querySelector?.('#market'))); }
function refreshTooltip(force=false){
  if(!activeTipEl || !tip.classList.contains('show')) return;
  const raw = activeTipEl.dataset.tip || '';
  if(force || raw !== activeTipRaw || isMarketTipEl(activeTipEl)){
    activeTipRaw = raw;
    tip.innerHTML = tipHtml(raw);
    tip.classList.toggle('wide-tip', raw.includes('tip-wide'));
  }
}
function positionTooltip(x,y){
  const padX=20, padY=20;
  const w=tip.offsetWidth || 260, h=tip.offsetHeight || 50;
  let left = x + padX, top = y + padY;
  let tx = '0', ty = '0';
  if(left + w > innerWidth){ left = x - padX; tx = '-100%'; }
  if(top + h > innerHeight){ top = y - padY; ty = '-100%'; }
  tip.style.left=`${left}px`; tip.style.top=`${top}px`; tip.style.transform=`translate(${tx}, ${ty})`;
}
function pieTooltipForPoint(el,x,y){
  if(!el?.classList?.contains('lot-liquid-pie')) return '';
  let segments=[];
  try{ segments=JSON.parse(el.dataset.pieSegments || '[]'); }catch(_){ segments=[]; }
  if(!segments.length) return el.dataset.pieSummary || el.dataset.tip || '';
  const r=el.getBoundingClientRect();
  const cx=r.left+r.width/2, cy=r.top+r.height/2;
  const dx=x-cx, dy=y-cy;
  const percent=((Math.atan2(dy, dx) * 180 / Math.PI + 90 + 360) % 360) / 3.6;
  const seg=segments.find(s=>percent>=Number(s.from) && percent<Number(s.to)) || segments[segments.length-1];
  return seg?.tip || el.dataset.pieSummary || el.dataset.tip || '';
}
function updatePieTooltipAt(el,x,y){
  if(!el?.classList?.contains('lot-liquid-pie')) return;
  const raw=pieTooltipForPoint(el,x,y);
  if(raw) el.dataset.tip=raw;
}
function syncTooltipAt(x,y){
  const el = document.elementFromPoint(x,y)?.closest?.('[data-tip]') || null;
  if(el !== activeTipEl){ activeTipEl = el; activeTipRaw = ''; }
  if(activeTipEl){ updatePieTooltipAt(activeTipEl,x,y); tip.classList.add('show'); refreshTooltip(true); }
  else { tip.classList.remove('show'); tip.classList.remove('wide-tip'); }
}
function refreshLiveTooltip(){
  if(!tip.classList.contains('show')) return;
  if(!activeTipEl || !activeTipEl.isConnected) syncTooltipAt(lastTipX,lastTipY);
  else { updatePieTooltipAt(activeTipEl,lastTipX,lastTipY); positionTooltip(lastTipX,lastTipY); refreshTooltip(true); }
}
document.addEventListener('pointermove', e=>{ lastTipX=e.clientX; lastTipY=e.clientY; positionTooltip(e.clientX, e.clientY); syncTooltipAt(e.clientX, e.clientY); });
document.addEventListener('pointerover', e=>{ lastTipX=e.clientX; lastTipY=e.clientY; const el=e.target.closest('[data-tip]'); if(!el) return; activeTipEl=el; activeTipRaw=''; updatePieTooltipAt(activeTipEl,e.clientX,e.clientY); positionTooltip(e.clientX,e.clientY); refreshTooltip(true); tip.classList.add('show'); });
document.addEventListener('pointerout', e=>{ if(e.target.closest('[data-tip]')){ activeTipEl=null; activeTipRaw=''; tip.classList.remove('show'); tip.classList.remove('wide-tip'); } });
addEventListener('blur', () => startBackgroundSim());
addEventListener('focus', () => finishBackgroundSim());
document.addEventListener('visibilitychange', () => document.hidden ? startBackgroundSim() : finishBackgroundSim());

setupSplash();
loadGame();
recordMarketSample(Date.now(), true);
initTiles();
ensureTruckSprite();
render();
reevaluateExistingBottleAchievements();
if($('#hud')?.classList.contains('collapsed')) $('#game')?.classList.add('roofs-active');
setInterval(tick, TICK_MS);
setInterval(refreshLiveTooltip, 350);
setInterval(()=>{ if(saveDirty) saveGame(); }, 20000);
function smokeRepaintPump(now=0){
  if(document.querySelector('.malt-smoke')) document.documentElement.style.setProperty('--smoke-ms', `${Math.round(now)}`);
  requestAnimationFrame(smokeRepaintPump);
}
requestAnimationFrame(smokeRepaintPump);
installPixelZoom();
addEventListener('beforeunload', saveGame);
