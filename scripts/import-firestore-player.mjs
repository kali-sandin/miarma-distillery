#!/usr/bin/env node
import {readFile} from 'node:fs/promises';
import {createSign} from 'node:crypto';
import {basename} from 'node:path';

function die(msg){ console.error(msg); process.exit(1); }
function b64url(input){ return Buffer.from(input).toString('base64url'); }
function usage(){
  const name=basename(process.argv[1] || 'import-firestore-player.mjs');
  return `Uso:\n  node scripts/${name} <service-account.json> <doc-id> <player.json> [project-id]\n\nEjemplo:\n  node scripts/${name} ~/keys/sim-distillery-admin.json test-smoke-hill docs/sample-player-smoke-hill.json\n\nNo metas la service account en el repo. Este script usa Admin REST y se salta las rules, igual que Firebase Console.`;
}

const [, , servicePath, docId, playerPath, projectArg] = process.argv;
if(!servicePath || !docId || !playerPath) die(usage());
if(!/^[A-Za-z0-9_-]{3,80}$/.test(docId)) die('ID de documento inválido. Usa letras, números, _ o -, 3-80 chars.');

const service = JSON.parse(await readFile(servicePath, 'utf8'));
const projectId = projectArg || service.project_id;
if(!service.client_email || !service.private_key || !projectId) die('Service account incompleta: faltan client_email/private_key/project_id.');
const player = JSON.parse(await readFile(playerPath, 'utf8'));

const now = Math.floor(Date.now()/1000);
const jwtHeader = {alg:'RS256', typ:'JWT'};
const jwtPayload = {
  iss: service.client_email,
  scope: 'https://www.googleapis.com/auth/datastore',
  aud: 'https://oauth2.googleapis.com/token',
  iat: now,
  exp: now + 3600
};
const unsigned = `${b64url(JSON.stringify(jwtHeader))}.${b64url(JSON.stringify(jwtPayload))}`;
const signer = createSign('RSA-SHA256');
signer.update(unsigned);
signer.end();
const assertion = `${unsigned}.${signer.sign(service.private_key, 'base64url')}`;

const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
  method:'POST',
  headers:{'content-type':'application/x-www-form-urlencoded'},
  body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion})
});
if(!tokenRes.ok) die(`OAuth error ${tokenRes.status}: ${await tokenRes.text()}`);
const {access_token} = await tokenRes.json();

function toFirestoreValue(value, key=''){
  if(value === null) return {nullValue:null};
  if(value instanceof Date) return {timestampValue:value.toISOString()};
  if(typeof value === 'string'){
    if(key === 'updatedAt' && (/^\d{4}-\d{2}-\d{2}T/.test(value) || value === '__now__')) return {timestampValue:value === '__now__' ? new Date().toISOString() : value};
    return {stringValue:value};
  }
  if(typeof value === 'boolean') return {booleanValue:value};
  if(typeof value === 'number') return Number.isInteger(value) ? {integerValue:String(value)} : {doubleValue:value};
  if(Array.isArray(value)) return {arrayValue:{values:value.map(v=>toFirestoreValue(v))}};
  if(typeof value === 'object') return {mapValue:{fields:Object.fromEntries(Object.entries(value).map(([k,v])=>[k,toFirestoreValue(v,k)]))}};
  return {stringValue:String(value)};
}

const normalized = {...player};
if(!normalized.updatedAt || String(normalized.updatedAt).includes('usar Timestamp')) normalized.updatedAt='__now__';
if(!normalized.updatedAtClient) normalized.updatedAtClient=Date.now();
const fields = Object.fromEntries(Object.entries(normalized).map(([k,v])=>[k,toFirestoreValue(v,k)]));

const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/players/${encodeURIComponent(docId)}`;
const res = await fetch(url, {
  method:'PATCH',
  headers:{authorization:`Bearer ${access_token}`, 'content-type':'application/json'},
  body:JSON.stringify({fields})
});
if(!res.ok) die(`Firestore error ${res.status}: ${await res.text()}`);
console.log(`OK players/${docId} importado en ${projectId}`);
