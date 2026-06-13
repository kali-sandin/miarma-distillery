const FIREBASE_VERSION = '10.12.5';
const PROFILE_KEY = 'miarma-social-public-name-v1';
const LAST_PROFILE_KEY = 'miarma-social-last-profile-v1';
const AUTO_PUBLISH_REASONS = new Set(['box-sold','achievement','region-selected','name-changed','bottled','manual']);

const state = {
  app: null,
  auth: null,
  db: null,
  user: null,
  firebase: null,
  modal: null,
  status: 'offline',
  statusText: 'Multijugador no iniciado',
  lastTop: [],
  dirtyReasons: new Set(),
  publishTimer: null,
  initPromise: null,
  configured: !!window.MIARMA_FIREBASE_CONFIG,
  publicName: localStorage.getItem(PROFILE_KEY) || ''
};

const $ = (q, root=document)=>root.querySelector(q);
const esc = value => String(value ?? '').replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const profileComparable = profile => JSON.stringify({...profile, updatedAtClient:0});
const setStatus = (status, text) => { state.status=status; state.statusText=text; renderStatus(); };

async function loadOptionalConfig(){
  if(window.MIARMA_FIREBASE_CONFIG !== undefined){ state.configured=!!window.MIARMA_FIREBASE_CONFIG; return state.configured; }
  try{ await import('./firebase-config.js'); }catch(_){ }
  state.configured=!!window.MIARMA_FIREBASE_CONFIG;
  return state.configured;
}

async function loadFirebase(){
  if(state.firebase) return state.firebase;
  await loadOptionalConfig();
  if(!window.MIARMA_FIREBASE_CONFIG) throw new Error('Firebase no configurado');
  const [app, auth, firestore] = await Promise.all([
    import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
    import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`),
    import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`)
  ]);
  state.firebase = {app, auth, firestore};
  state.app = app.initializeApp(window.MIARMA_FIREBASE_CONFIG);
  state.auth = auth.getAuth(state.app);
  state.db = firestore.getFirestore(state.app);
  auth.onAuthStateChanged(state.auth, user=>{
    state.user=user;
    if(user && !state.publicName){ state.publicName=user.displayName || 'Jugador'; localStorage.setItem(PROFILE_KEY, state.publicName); }
    setStatus(user ? 'connected' : 'offline', user ? `Conectado como ${state.publicName || user.displayName || 'Jugador'}` : 'Desconectado');
    renderModal();
    if(user) markDirty('auth');
  });
  return state.firebase;
}

async function ensureFirebase(){
  if(!state.initPromise) state.initPromise = loadFirebase().catch(err=>{ state.initPromise=null; throw err; });
  return state.initPromise;
}

function currentProfile(){
  const builder=window.MiarmaGame?.buildPublicProfile;
  if(typeof builder !== 'function') return null;
  return builder(state.publicName || state.user?.displayName || 'Jugador');
}

function profileChanged(profile){
  const comparable=profileComparable(profile);
  return comparable !== localStorage.getItem(LAST_PROFILE_KEY);
}

async function login(){
  try{
    await loadOptionalConfig();
    setStatus('pending','Abriendo Google…');
    const {auth}=await ensureFirebase();
    const provider=new auth.GoogleAuthProvider();
    await auth.signInWithPopup(state.auth, provider);
  }catch(err){ setStatus('error', `Error login: ${err.message}`); }
}

async function logout(){
  try{ const {auth}=await ensureFirebase(); await auth.signOut(state.auth); }
  catch(err){ setStatus('error', `Error logout: ${err.message}`); }
}

async function publishProfile(reason='manual', {force=false}={}){
  try{
    await loadOptionalConfig();
    const profile=currentProfile();
    if(!profile){ setStatus('error','No hay región elegida todavía; no se puede publicar ficha.'); return false; }
    if(!window.MIARMA_FIREBASE_CONFIG){ setStatus('error','Firebase no está configurado.'); renderModal(); return false; }
    const {firestore}=await ensureFirebase();
    if(!state.user){ setStatus('error','Conecta con Google antes de publicar.'); return false; }
    if(!force && !profileChanged(profile)){ setStatus('connected','Sin cambios públicos que publicar.'); return false; }
    setStatus('pending','Publicando ficha pública…');
    const docRef=firestore.doc(state.db, 'players', state.user.uid);
    await firestore.setDoc(docRef, {...profile, updatedAt:firestore.serverTimestamp()}, {merge:false});
    localStorage.setItem(LAST_PROFILE_KEY, profileComparable(profile));
    state.dirtyReasons.clear();
    setStatus('published', `Publicado (${reason})`);
    renderModal();
    return true;
  }catch(err){ setStatus('error', `Error publicando: ${err.message}`); return false; }
}

function markDirty(reason='change'){
  state.dirtyReasons.add(reason);
  renderStatus();
  if(!AUTO_PUBLISH_REASONS.has(reason) || !state.user) return;
  clearTimeout(state.publishTimer);
  state.publishTimer=setTimeout(()=>publishProfile([...state.dirtyReasons].join(',')), 2200);
}

async function fetchTop10(){
  try{
    await loadOptionalConfig();
    if(!window.MIARMA_FIREBASE_CONFIG){ setStatus('error','Firebase no está configurado.'); renderModal(); return []; }
    const {firestore}=await ensureFirebase();
    if(!state.user){ setStatus('error','Conecta con Google para leer el ranking.'); return []; }
    setStatus('pending','Cargando top 10…');
    const q=firestore.query(firestore.collection(state.db,'players'), firestore.orderBy('reputation','desc'), firestore.limit(10));
    const snap=await firestore.getDocs(q);
    state.lastTop=snap.docs.map(doc=>({uid:doc.id, ...doc.data()}));
    window.MiarmaGame?.renderPublicPlayers?.(state.lastTop);
    setStatus('connected',`Top 10 actualizado (${state.lastTop.length})`);
    renderModal();
    return state.lastTop;
  }catch(err){ setStatus('error', `Error ranking: ${err.message}`); return []; }
}

function getCachedTopPlayers(){ return state.lastTop.slice(); }

function savePublicName(value){
  state.publicName=String(value||'').trim().slice(0,48) || state.user?.displayName || 'Jugador';
  localStorage.setItem(PROFILE_KEY, state.publicName);
  markDirty('name-changed');
  renderStatus();
}

function configHelpHtml(){
  return `<div class="multiplayer-help"><p>Firebase aún no está configurado en esta copia.</p><ol><li>Crea proyecto Firebase.</li><li>Activa Authentication → Google.</li><li>Crea Firestore en modo production.</li><li>Copia <code>js/firebase-config.example.js</code> a <code>js/firebase-config.js</code>.</li><li>Pega el objeto de config de tu app web Firebase.</li><li>Publica reglas Firestore de <code>docs/firestore.rules</code>.</li></ol></div>`;
}

function topHtml(){
  if(!state.lastTop.length) return '<div class="multiplayer-empty">Sin ranking cargado todavía.</div>';
  return state.lastTop.map((p,i)=>`<article class="multiplayer-rank-card"><b>#${i+1}</b><span>${esc(p.publicName || 'Jugador')}</span><strong>🏆 ${Math.round(Number(p.reputation)||0)}</strong><em>${esc(p.distilleryName || 'Destilería')} · ${esc(p.region || 'Escocia')}</em></article>`).join('');
}

function renderStatus(){
  const root=$('#multiplayerStatus');
  if(root){ root.dataset.status=state.status; root.textContent=state.statusText + (state.dirtyReasons.size ? ` · pendiente: ${[...state.dirtyReasons].join(', ')}` : ''); }
}

function ensureModal(){
  let root=$('#multiplayerModal');
  if(root) return root;
  root=document.createElement('div');
  root.id='multiplayerModal';
  root.className='multiplayer-modal hidden';
  document.body.appendChild(root);
  root.addEventListener('click', e=>{ if(e.target===root) closeModal(); });
  return root;
}

function renderModal(){
  const root=ensureModal();
  if(root.classList.contains('hidden')) return;
  const user=state.user;
  root.innerHTML=`<section class="multiplayer-window"><button class="game-popup-close multiplayer-close" type="button" aria-label="Cerrar">×</button><header><h3>🌐 Multijugador social</h3><p>Ranking y mapa público opcional. Tu partida completa sigue local.</p></header><div id="multiplayerStatus" class="multiplayer-status" data-status="${esc(state.status)}">${esc(state.statusText)}</div>${state.configured?'':configHelpHtml()}<div class="multiplayer-controls"><button id="mpLogin" class="pixel-btn" type="button">${user?'Reconectar Google':'Conectar Google'}</button><button id="mpLogout" class="pixel-btn danger" type="button" ${user?'':'disabled'}>Desconectar</button><label>Nombre público<input id="mpPublicName" maxlength="48" value="${esc(state.publicName || user?.displayName || '')}" placeholder="Jugador"></label><button id="mpPublish" class="pixel-btn" type="button">Publicar ahora</button><button id="mpTop" class="pixel-btn" type="button">Actualizar top 10</button></div><section class="multiplayer-ranking"><h4>Top 10 reputación</h4>${topHtml()}</section></section>`;
  $('#mpLogin',root).onclick=login;
  $('#mpLogout',root).onclick=logout;
  $('#mpPublish',root).onclick=()=>publishProfile('manual',{force:true});
  $('#mpTop',root).onclick=fetchTop10;
  $('#mpPublicName',root).onchange=e=>savePublicName(e.target.value);
  $('.multiplayer-close',root).onclick=closeModal;
}

function openModal(){
  loadOptionalConfig().then(()=>{ renderModal(); if(state.configured) ensureFirebase().catch(err=>setStatus('error', `Firebase: ${err.message}`)); });
  const root=ensureModal();
  root.classList.remove('hidden');
  renderModal();
}
function closeModal(){ ensureModal().classList.add('hidden'); }

function init(){
  document.addEventListener('click', e=>{ if(e.target.closest('#multiplayerButton')){ e.preventDefault(); openModal(); } });
  loadOptionalConfig().then(configured=>{ if(configured) ensureFirebase().catch(err=>setStatus('error', `Firebase: ${err.message}`)); });
}

window.MiarmaMultiplayer = {init, openModal, closeModal, login, logout, publishProfile, fetchTop10, markDirty, getCachedTopPlayers, currentProfile};
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
