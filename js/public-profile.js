const PUBLIC_SCHEMA_VERSION = 1;
const PUBLIC_BUILD = '2026-06-14-social-mvp';
const REGION_IDS = new Set(['speyside','highlands','campbeltown','islay','lowlands']);
const clamp = (n,min,max)=>Math.min(max, Math.max(min, Number(n)||0));
const cleanText = (value, fallback='', max=80)=>String(value ?? fallback).trim().replace(/\s+/g,' ').slice(0,max) || fallback;
const cleanImage = value => /^img\/mapa\/dest\d{2}\.png$/.test(String(value||'')) ? String(value) : 'img/mapa/dest01.png';

function buildPublicProfile({state, distillery, publicName=''}={}){
  if(!state || !distillery || !state.scotlandLocation) return null;
  const loc=state.scotlandLocation || {};
  const stats=distillery.stats || {};
  const achievements=Object.keys(distillery.achievements || {}).sort().slice(0,80);
  const region=REGION_IDS.has(loc.region) ? loc.region : 'speyside';
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
    litresSold: Math.round(Number(stats.litresSold)||0),
    lotsSold: Math.round(Number(stats.lotsSold)||0),
    bottlesSold: Math.round(Number(stats.bottlesSold)||0),
    maxBottlePrice: Number((Number(stats.maxBottlePrice)||0).toFixed(2)),
    maxBottlesLot: Math.round(Number(stats.maxBottlesLot)||0),
    oldestSoldAge: Number((Number(stats.oldestSoldAge)||0).toFixed(1)),
    achievements,
    achievementsCount: achievements.length,
    updatedAtClient: Date.now()
  };
}

window.MiarmaPublicProfile = {PUBLIC_SCHEMA_VERSION, PUBLIC_BUILD, buildPublicProfile};
