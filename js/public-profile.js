const PUBLIC_SCHEMA_VERSION = 1;
const PUBLIC_BUILD = '2026-06-14-social-map-v2';
const REGION_IDS = new Set(['speyside','highlands','campbeltown','islay','lowlands']);
const clamp = (n,min,max)=>Math.min(max, Math.max(min, Number(n)||0));
const cleanText = (value, fallback='', max=80)=>String(value ?? fallback).trim().replace(/\s+/g,' ').slice(0,max) || fallback;
const cleanImage = value => /^img\/mapa\/dest\d{2}\.png$/.test(String(value||'')) ? String(value) : 'img/mapa/dest01.png';
const quality = value => Math.min(100, Math.max(0, Number(value)||0));

function publicQualityFromState(state, stats={}){
  const lots=Array.isArray(state?.bottleHistory) ? state.bottleHistory : [];
  const boxes=Array.isArray(state?.boxes) ? state.boxes : [];
  const byId=new Map();
  for(const lot of [...lots, ...boxes]) if(lot) byId.set(lot.id || `${lot.seq || ''}-${byId.size}`, lot);
  const vals=[...byId.values()].map(x=>quality(x.quality)).filter(x=>Number.isFinite(x));
  if(vals.length) return Math.round(vals.reduce((a,b)=>a+b,0)/vals.length);
  return Math.round(Math.max(0, Number(stats.bestQuality)||0));
}
function averageSoldAgeFromState(state, stats={}){
  const lots=Array.isArray(state?.bottleHistory) ? state.bottleHistory : [];
  const sold=lots.filter(x=>x?.sold);
  const total=sold.reduce((a,x)=>a+(Number(x.bottles)||0),0);
  if(total>0) return Number((sold.reduce((a,x)=>a+(Number(x.age)||0)*(Number(x.bottles)||0),0)/total).toFixed(1));
  return Number(Math.max(0, Number(stats.oldestSoldAge)||0).toFixed(1));
}

function buildPublicProfile({state, distillery, publicName=''}={}){
  if(!state || !distillery || !state.scotlandLocation) return null;
  const loc=state.scotlandLocation || {};
  const stats=distillery.stats || {};
  const achievements=Object.keys(distillery.achievements || {}).sort().slice(0,80);
  const region=REGION_IDS.has(loc.region) ? loc.region : 'speyside';
  // Field kept as bestQuality for current Firestore rules/backward compatibility;
  // the radar now interprets it as average lot quality.
  const bestQuality=publicQualityFromState(state, stats);
  // Field name kept as oldestSoldAge for current Firestore rules/backward compatibility;
  // the radar now interprets it as average sold age.
  const oldestSoldAge=averageSoldAgeFromState(state, stats);
  return {
    schemaVersion: PUBLIC_SCHEMA_VERSION,
    build: PUBLIC_BUILD,
    publicName: cleanText(publicName, 'Jugador', 48),
    distilleryName: cleanText(state.distilleryName, 'Mi destilería', 48),
    region,
    x: Number(clamp(loc.x,0,1).toFixed(5)),
    y: Number(clamp(loc.y,0,1).toFixed(5)),
    distilleryImage: cleanImage(loc.dest),
    reputation: Math.round(Number(distillery.reputation)||0),
    bestQuality,
    litresSold: Math.round(Number(stats.litresSold)||0),
    lotsSold: Math.round(Number(stats.lotsSold)||0),
    bottlesSold: Math.round(Number(stats.bottlesSold)||0),
    maxBottlePrice: Number((Number(stats.maxBottlePrice)||0).toFixed(2)),
    maxBottlesLot: Math.round(Number(stats.maxBottlesLot)||0),
    oldestSoldAge,
    achievements,
    achievementsCount: achievements.length,
    updatedAtClient: Date.now()
  };
}

window.MiarmaPublicProfile = {PUBLIC_SCHEMA_VERSION, PUBLIC_BUILD, buildPublicProfile};
