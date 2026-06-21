const FIREBASE_VERSION = '10.12.5';
const PROFILE_KEY = 'miarma-social-public-name-v1';
const LAST_PROFILE_KEY = 'miarma-social-last-profile-v1';
const TOP10_CACHE_MS = 10 * 60 * 1000;
const AUTO_PUBLISH_REASONS = new Set(['box-sold','achievement','region-selected','name-changed','bottled','manual','auth','map-open','reputation']);

const state = {
  app: null,
  auth: null,
  db: null,
  user: null,
  firebase: null,
  status: 'offline',
  statusText: 'Social no iniciado',
  lastTop: [],
  lastTopFetchedAt: 0,
  dirtyReasons: new Set(),
  publishTimer: null,
  initPromise: null,
  configured: !!window.MIARMA_FIREBASE_CONFIG,
  publicName: localStorage.getItem(PROFILE_KEY) || '',
  mapLoginAttempted: false,
  editingName: false
};

const $ = (q, root=document)=>root.querySelector(q);
const esc = value => String(value ?? '').replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const profileComparable = profile => JSON.stringify({...profile, updatedAtClient:0});
const topFresh = () => Date.now() - Number(state.lastTopFetchedAt||0) < TOP10_CACHE_MS;
const syncLog = (...args) => console.debug('[SimDistillery:sync]', ...args);
const visibleStatusText = () => {
  if(state.status === 'error') return state.statusText || 'Error social';
  if(state.status === 'pending') return state.statusText || 'Cargando…';
  if(!state.configured) return 'Firebase no configurado.';
  if(!state.user) return 'Conecta Google para ver el top 10.';
  if(!currentProfile()) return 'Conectado. Elige región para publicar tu destilería.';
  return `Conectado como ${state.publicName || state.user.displayName || 'Jugador'}`;
};
const setStatus = (status, text) => { state.status=status; state.statusText=text; renderMapControls(); };
function cleanPublicName(value){ return String(value || '').trim().replace(/\s+/g,' ').slice(0,48) || 'Jugador'; }
function savePublicName(value){
  state.publicName=cleanPublicName(value);
  localStorage.setItem(PROFILE_KEY, state.publicName);
  state.editingName=false;
  setStatus(state.user ? 'connected' : 'offline', state.user ? `Conectado como ${state.publicName}` : 'Conecta Google para ver el top 10.');
  markDirty('name-changed');
}

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
    if(!user){
      state.dirtyReasons.delete('auth');
      setStatus('offline', 'Desconectado');
      renderMapControls();
      return;
    }
    renderMapControls();
    const profile=currentProfile();
    if(profile){
      markDirty('auth');
      setStatus('connected', `Conectado: ${state.publicName || user.displayName || 'Jugador'}`);
    } else {
      state.dirtyReasons.delete('auth');
      setStatus('connected', `Conectado: ${state.publicName || user.displayName || 'Jugador'} · elige región para publicar ficha`);
    }
    fetchTop10IfStale({force:true});
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
    if(!window.MIARMA_FIREBASE_CONFIG){ setStatus('error','Firebase no configurado.'); return false; }
    setStatus('pending','Abriendo Google…');
    const {auth}=await ensureFirebase();
    const provider=new auth.GoogleAuthProvider();
    try{
      await auth.signInWithPopup(state.auth, provider);
    }catch(err){
      const code=String(err?.code || '');
      if(code.includes('popup-closed-by-user') || code.includes('cancelled-popup-request')){
        setStatus('offline','Login cancelado.');
        return false;
      } else if(code.includes('popup-blocked')){
        setStatus('error','Popup bloqueado: permite ventanas emergentes para conectar Google.');
        return false;
      } else {
        throw err;
      }
    }
    return true;
  }catch(err){ setStatus('error', `Error login: ${err.message}`); return false; }
}

async function logout(){
  try{ const {auth}=await ensureFirebase(); await auth.signOut(state.auth); state.mapLoginAttempted=true; renderMapControls(); return true; }
  catch(err){ setStatus('error', `Error logout: ${err.message}`); return false; }
}

async function publishProfile(reason='manual', {force=false}={}){
  try{
    await loadOptionalConfig();
    const profile=currentProfile();
    if(!profile){
      state.dirtyReasons.delete(reason);
      state.dirtyReasons.delete('auth');
      renderMapControls();
      setStatus(state.user ? 'connected' : 'offline', state.user ? 'Conectado. Elige región para publicar tu destilería.' : 'Conecta Google para ver el top 10.');
      return false;
    }
    if(!window.MIARMA_FIREBASE_CONFIG){ setStatus('error','Firebase no configurado.'); return false; }
    const {firestore}=await ensureFirebase();
    if(!state.user){ setStatus('offline','Conecta Google para ver el top 10.'); return false; }
    if(!force && !profileChanged(profile)){ setStatus('connected','Ficha pública sin cambios.'); return false; }
    syncLog('publishing profile', reason, [...state.dirtyReasons]);
    const docRef=firestore.doc(state.db, 'players', state.user.uid);
    await firestore.setDoc(docRef, {...profile, updatedAt:firestore.serverTimestamp()}, {merge:false});
    localStorage.setItem(LAST_PROFILE_KEY, profileComparable(profile));
    state.dirtyReasons.clear();
    syncLog('profile published', reason);
    setStatus('connected', 'Conectado');
    return true;
  }catch(err){ console.warn('[SimDistillery:sync] Error publicando ficha', err); setStatus(state.user ? 'connected' : 'offline', state.user ? 'Conectado' : 'Conecta Google para ver el top 10.'); return false; }
}

function markDirty(reason='change'){
  if(reason==='auth' && !currentProfile()){ renderMapControls(); return; }
  state.dirtyReasons.add(reason);
  syncLog('dirty', reason, [...state.dirtyReasons]);
  renderMapControls();
  if(!AUTO_PUBLISH_REASONS.has(reason) || !state.user || !currentProfile()) return;
  clearTimeout(state.publishTimer);
  state.publishTimer=setTimeout(()=>publishProfile([...state.dirtyReasons].join(',')), 2200);
}

function normalizeTopPlayer(doc, idx){
  const p={uid:doc.id, ...doc.data(), rank:idx+1};
  p.reputation=Math.round(Number(p.reputation)||0);
  p.bestQuality=Math.round(Number(p.bestQuality)||0);
  p.bottlesSold=Math.round(Number(p.bottlesSold)||0);
  p.litresSold=Math.round(Number(p.litresSold)||0);
  p.maxBottlesLot=Math.round(Number(p.maxBottlesLot)||0);
  p.oldestSoldAge=Number(p.oldestSoldAge)||0;
  p.maxBottlePrice=Number(p.maxBottlePrice)||0;
  p.achievementsCount=Math.round(Number(p.achievementsCount)||0);
  return p;
}

async function fetchTop10({force=false}={}){
  try{
    await loadOptionalConfig();
    if(!window.MIARMA_FIREBASE_CONFIG){ setStatus('error','Firebase no configurado.'); return []; }
    const {firestore}=await ensureFirebase();
    if(!state.user){ setStatus('offline','Conecta Google para cargar top 10.'); return []; }
    if(!force && topFresh()){ window.MiarmaGame?.renderPublicPlayers?.(state.lastTop); renderMapControls(); return state.lastTop; }
    setStatus('pending','Cargando top 10…');
    const q=firestore.query(firestore.collection(state.db,'players'), firestore.orderBy('reputation','desc'), firestore.limit(10));
    const snap=await firestore.getDocs(q);
    state.lastTop=snap.docs.map(normalizeTopPlayer);
    state.lastTopFetchedAt=Date.now();
    window.MiarmaGame?.renderPublicPlayers?.(state.lastTop);
    setStatus('connected',`Top 10 actualizado (${state.lastTop.length})`);
    return state.lastTop;
  }catch(err){ setStatus('error', `Error ranking: ${err.message}`); return []; }
}
function fetchTop10IfStale({force=false}={}){ return fetchTop10({force}); }
function getCachedTopPlayers(){ return state.lastTop.slice(); }
function currentUserId(){ return state.user?.uid || null; }

function renderMapControls(){
  const root=$('#scotlandSocialPanel');
  if(!root) return;
  const user=state.user;
  const staleTxt=state.lastTopFetchedAt ? `Top10 hace ${Math.max(0, Math.round((Date.now()-state.lastTopFetchedAt)/60000))}m` : (user ? 'Top10 pendiente' : '');
  const statusText=visibleStatusText();
  const nameValue=esc(state.publicName || user?.displayName || 'Jugador');
  const nameEditor=user && state.editingName ? `<label class="social-public-name"><span>Nombre visible</span><input id="mpPublicName" maxlength="48" value="${nameValue}" autocomplete="off"><button id="mpSaveName" class="pixel-btn small" type="button">Guardar</button></label>` : '';
  root.innerHTML=`<div class="social-map-title">🌐 Sim Distillery</div><div id="multiplayerStatus" class="multiplayer-status compact" data-status="${esc(state.status)}">${esc(statusText)}${staleTxt?`<br><small>${esc(staleTxt)}</small>`:''}</div>${nameEditor}<div class="social-map-actions">${user?'<button id="mpEditName" class="pixel-btn small" type="button">Cambiar nombre</button><button id="mpLogout" class="pixel-btn small danger" type="button">Desconectar cuenta</button>':'<button id="mpLogin" class="pixel-btn small" type="button">Login Google</button>'}</div>`;
  root.querySelectorAll('button,input').forEach(el=>el.addEventListener('pointerdown', e=>e.stopPropagation()));
  $('#mpLogin',root)?.addEventListener('click', e=>{ e.preventDefault(); e.stopPropagation(); state.mapLoginAttempted=true; login(); });
  $('#mpLogout',root)?.addEventListener('click', e=>{ e.preventDefault(); e.stopPropagation(); logout(); });
  $('#mpEditName',root)?.addEventListener('click', e=>{ e.preventDefault(); e.stopPropagation(); state.editingName=true; renderMapControls(); setTimeout(()=>$('#mpPublicName',root)?.focus(),0); });
  $('#mpSaveName',root)?.addEventListener('click', e=>{ e.preventDefault(); e.stopPropagation(); savePublicName($('#mpPublicName',root)?.value); });
  $('#mpPublicName',root)?.addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); savePublicName(e.currentTarget.value); } });
}

async function onScotlandMapOpen({autoLogin=false}={}){
  await loadOptionalConfig();
  renderMapControls();
  if(!state.configured){ setStatus('error','Firebase no configurado.'); return; }
  try{ await ensureFirebase(); }catch(err){ setStatus('error', `Firebase: ${err.message}`); return; }
  if(state.user){
    markDirty('map-open');
    await fetchTop10IfStale();
    return;
  }
  setStatus('offline','Conecta Google para ver el top 10.');
  if(autoLogin && !state.mapLoginAttempted){ state.mapLoginAttempted=true; login(); }
}

function init(){
  loadOptionalConfig().then(configured=>{ if(configured) ensureFirebase().catch(err=>setStatus('error', `Firebase: ${err.message}`)); });
}

window.MiarmaMultiplayer = {init, login, logout, publishProfile, fetchTop10, fetchTop10IfStale, markDirty, getCachedTopPlayers, currentProfile, currentUserId, renderMapControls, onScotlandMapOpen, savePublicName};
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
