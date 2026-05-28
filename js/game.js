const fitStage = () => document.documentElement.style.setProperty('--scale', Math.min(innerWidth / 1920, innerHeight / 1080, 1).toString());
addEventListener('resize', fitStage);
fitStage();

const $ = (q, root=document) => root.querySelector(q);
const $$ = (q, root=document) => [...root.querySelectorAll(q)];
const clamp = (n,a,b)=>Math.max(a,Math.min(b,n));
const pct = n => `${clamp(n,0,100).toFixed(0)}%`;

const state = {
  coins: 50,
  seeds: 0,
  bottles: 0,
  market: 2.4,
  marketPhase: Math.random()*10,
  field: [],
  malt: [],
  vat: { volume: 0, ferment: 0, yeast: false, idle: 0, rotten: false },
  still: { input: 0, inputAbv: 0, runs: 0, output: 0, outputAbv: 0, outputRuns: 0, temp: 22, fire: false },
  barrels: [],
  boxes: []
};

function initTiles(){
  const field = $('#field'); const malt = $('#malting');
  for(let i=0;i<18;i++){
    state.field.push({status:'empty', growth:0, moisture:35, mature:false});
    const el = document.createElement('div'); el.className='tile field-tile'; el.dataset.i=i; el.dataset.accept='seed';
    field.appendChild(el);
  }
  for(let i=0;i<8;i++){
    state.malt.push({status:'empty', germ:0, moisture:0});
    const el = document.createElement('div'); el.className='tile malt-tile'; el.dataset.i=i; el.dataset.accept='crop';
    malt.appendChild(el);
  }
}

function render(){
  $('#coins').textContent = `${state.coins.toFixed(0)} k€`;
  $('#seeds').textContent = `${state.seeds.toFixed(0)} Kg`;
  $('#bottles').textContent = `${state.bottles}`;
  $('#market').textContent = `${state.market.toFixed(2)} €/bot/año`;
  $('#seedBag').style.opacity = state.seeds > 0 ? '1' : '.38';

  $$('.field-tile').forEach(el=>{
    const t = state.field[+el.dataset.i];
    el.innerHTML = bars(t.moisture, t.growth, 75, 20, t.status==='rotten');
    const tip = fieldTip(t);
    el.dataset.tip = tip;
    if(t.status==='planted'){
      const plant = document.createElement('div'); plant.className='plant'; plant.textContent = t.status==='rotten'?'☠️': t.growth<35?'🌱':t.growth<75?'🌾':'🌾'; el.appendChild(plant);
      if(t.growth>=75 && t.growth<=95){ plant.draggable=true; plant.className+=' token crop-token'; plant.dataset.type='crop'; plant.dataset.source=el.dataset.i; plant.dataset.tip='Cebada madura: arrástrala a malteado/germinación.'; plant.textContent='🌾'; wireDraggable(plant); }
    }
    if(t.status==='rotten') addClean(el, () => Object.assign(t,{status:'empty',growth:0,moisture:25}));
  });

  $$('.malt-tile').forEach(el=>{
    const t = state.malt[+el.dataset.i];
    el.innerHTML = bars(t.moisture, t.germ, 68, 22, t.status==='rotten');
    el.dataset.tip = maltTip(t);
    if(t.status==='filled'){
      const plant = document.createElement('div'); plant.className='plant'; plant.textContent = t.status==='rotten'?'☠️':'🌿'; el.appendChild(plant);
      if(t.germ>=68 && t.germ<=90){ plant.draggable=true; plant.className+=' token malt-token'; plant.dataset.type='malt'; plant.dataset.source=el.dataset.i; plant.dataset.tip='Malta germinada en óptimo: arrástrala a la cuba.'; plant.textContent='🌿'; wireDraggable(plant); }
    }
    if(t.status==='rotten') addClean(el, () => Object.assign(t,{status:'empty',germ:0,moisture:0}));
  });

  $('#vatCapacity').style.width = pct(state.vat.volume);
  $('#vatFerment').style.width = pct(state.vat.ferment);
  $('#fermentDrag').classList.toggle('hidden', !(state.vat.volume>0 && state.vat.ferment>=65 && state.vat.ferment<=90 && !state.vat.rotten));
  $('#fermentDrag').dataset.tip = `Mosto: ${state.vat.volume.toFixed(0)}% de cuba · fermentación ${state.vat.ferment.toFixed(0)}%${state.vat.yeast?' · con levadura':''}.`;
  $('#fermentation').dataset.tip = state.vat.rotten ? 'La cuba se ha podrido: pulsa para limpiar.' : `Cuba ${state.vat.volume.toFixed(0)}% · fermentación ${state.vat.ferment.toFixed(0)}% · rango óptimo 65-90%.`;

  $('#stillIn').textContent = `${state.still.input.toFixed(0)}% · ${state.still.inputAbv.toFixed(0)}º`;
  $('#stillOut').textContent = `${state.still.output.toFixed(1)}% · ${state.still.outputAbv.toFixed(0)}º · ${state.still.outputRuns}x`;
  $('#tempBar').style.width = pct(state.still.temp);
  $('#fire').textContent = state.still.fire ? 'Apagar fuego' : 'Encender fuego';
  $('#spiritDrag').classList.toggle('hidden', state.still.output <= 0);
  $('#spiritDrag').dataset.tip = `Destilado ${state.still.output.toFixed(1)}% · ${state.still.outputAbv.toFixed(0)}º · pasadas ${state.still.outputRuns}. ${state.still.outputRuns<2?'Necesita segunda destilación.':'Listo para barrica.'}`;

  renderCards();
  wireAll();
}

function bars(a,b,start,width,bad=false){
  return `<div class="mini-bars"><div class="bar moist"><i style="width:${pct(a)}"></i></div><div class="bar ranged ${bad?'bad':''}"><em style="left:${start}%;width:${width}%"></em><i style="width:${pct(b)}"></i></div></div>`;
}
function addClean(el, fn){ const b=document.createElement('button'); b.className='clean'; b.textContent='Limpiar'; b.onclick=e=>{e.stopPropagation(); fn(); render();}; el.appendChild(b); }
function fieldTip(t){ if(t.status==='empty') return 'Tile vacío. Arrastra 1 Kg de semillas aquí.'; if(t.status==='rotten') return 'Cultivo estropeado por pasarse de madurez. Click para limpiar.'; return `Cultivo: humedad ${t.moisture.toFixed(0)}% · crecimiento ${t.growth.toFixed(0)}% · cosecha entre 75-95%. Click para regar.`; }
function maltTip(t){ if(t.status==='empty') return 'Tile de malteado vacío. Suelta cebada madura aquí.'; if(t.status==='rotten') return 'Malta podrida por exceso de humedad/tiempo. Click para limpiar.'; return `Malteado: humedad ${t.moisture.toFixed(0)}% · germinación ${t.germ.toFixed(0)}% · óptimo 68-90%. Click/drag para regar.`; }

function renderCards(){
  const aging=$('#aging'), bottling=$('#bottling');
  aging.innerHTML=''; bottling.innerHTML='';
  state.barrels.forEach(b=>{
    const el=document.createElement('div'); el.className='card barrel-card'; el.draggable=true; el.dataset.type='barrel'; el.dataset.id=b.id;
    el.dataset.tip=`Barrica: ${b.volume.toFixed(1)}% volumen · ${b.age.toFixed(1)} años · ${b.abv.toFixed(0)}º. Arrastra a embotellado.`;
    el.innerHTML=`<img src="img/placeholder_barrel.png" alt="barrica"><strong>Barrica</strong><br>${b.age.toFixed(1)} años<br>${b.volume.toFixed(1)}% vol.<div class="bar"><i style="width:${pct((b.age%10)*10)}"></i></div>`;
    aging.appendChild(el);
  });
  state.boxes.forEach(b=>{
    const el=document.createElement('div'); el.className='card box-card'; el.draggable=true; el.dataset.type='box'; el.dataset.id=b.id;
    el.dataset.tip=`Caja: ${b.bottles} botellas · whisky de ${b.age.toFixed(1)} años. Arrastra al camión para vender.`;
    el.innerHTML=`<img src="img/placeholder_box.png" alt="caja"><strong>Caja</strong><br>${b.bottles} bot.<br>${b.age.toFixed(1)} años<div class="bar"><i style="width:${pct(b.bottles)}"></i></div>`;
    bottling.appendChild(el);
  });
}

function tick(){
  state.marketPhase += 0.018;
  state.market = 3 + Math.sin(state.marketPhase)*1.15 + Math.sin(state.marketPhase*2.7)*0.55 + (Math.random()-.5)*0.035;
  state.market = clamp(state.market,1,5);
  for(const t of state.field){ if(t.status==='planted'){ t.moisture=clamp(t.moisture-.12,0,100); if(t.moisture>8) t.growth += 0.075*(0.55+t.moisture/100); if(t.growth>102) t.status='rotten'; }}
  for(const t of state.malt){ if(t.status==='filled'){ t.moisture=clamp(t.moisture-.06,0,100); if(t.moisture>88) t.status='rotten'; if(t.moisture>8) t.germ += 0.095*(t.moisture/62); if(t.germ>104) t.status='rotten'; }}
  const v=state.vat; if(v.volume>0 && !v.rotten){ v.idle++; if(v.yeast) v.ferment=clamp(v.ferment+0.09,0,100); if(!v.yeast && v.idle>420) v.rotten=true; if(v.ferment>98) v.rotten=true; }
  const s=state.still; s.temp = clamp(s.temp + (s.fire ? .42 : -.22), 18, 115); if(s.input>0 && s.temp>=78 && s.temp<100){ const take=Math.min(s.input,.08); s.input-=take; s.output+=take*.10; s.outputRuns=Math.max(s.outputRuns, s.runs+1); s.outputAbv=s.outputRuns===1?25:65; s.inputAbv=s.input>0?s.inputAbv:0; if(s.input<=0) s.runs=0; }
  for(const b of state.barrels){ const old=Math.floor(b.age); b.age += 1/1800; if(Math.floor(b.age)>old) b.volume*=.95; }
  render();
}

function wireAll(){
  $$('[draggable=true]').forEach(wireDraggable);
  $$('.field-tile,.malt-tile,#fermentation,#stillInput,#aging,#bottling,#truckDock').forEach(wireDrop);
  $$('.field-tile').forEach(el=> el.onclick=()=>{ const t=state.field[+el.dataset.i]; if(t.status==='planted'){ t.moisture=clamp(t.moisture+28,0,100); render(); }});
  $$('.malt-tile').forEach(el=> {
    el.onpointerdown=()=>{ const t=state.malt[+el.dataset.i]; if(t.status==='filled'){ t.moisture=clamp(t.moisture+22,0,100); render(); }};
    el.onpointerenter=(e)=>{ if(e.buttons){ const t=state.malt[+el.dataset.i]; if(t.status==='filled'){ t.moisture=clamp(t.moisture+8,0,100); render(); } } };
  });
}
function wireDraggable(el){ if(el._dragged) return; el._dragged=true; el.addEventListener('dragstart', e=>{ e.dataTransfer.setData('text/plain', JSON.stringify({...el.dataset})); }); }
function wireDrop(el){ if(el._drop) return; el._drop=true; el.addEventListener('dragover', e=>{ e.preventDefault(); el.classList.add('hover'); }); el.addEventListener('dragleave',()=>el.classList.remove('hover')); el.addEventListener('drop', e=>{ e.preventDefault(); el.classList.remove('hover'); const data=JSON.parse(e.dataTransfer.getData('text/plain')||'{}'); handleDrop(el,data); render(); }); }
function handleDrop(target,data){
  if(target.classList.contains('field-tile') && data.type==='seed'){
    const t=state.field[+target.dataset.i]; if(t.status==='empty' && state.seeds>=1){ state.seeds--; Object.assign(t,{status:'planted', growth:0, moisture:55}); }
  }
  if(target.classList.contains('malt-tile') && data.type==='crop'){
    const dst=state.malt[+target.dataset.i], src=state.field[+data.source];
    if(dst.status==='empty' && src?.growth>=75 && src.growth<=95){ Object.assign(dst,{status:'filled', germ:0, moisture:12}); Object.assign(src,{status:'empty', growth:0, moisture:25}); }
  }
  if(target.id==='fermentation' && data.type==='malt') addMaltToVat(data.source);
  if(target.id==='stillInput' && data.type==='wash') transferWashToStill();
  if(target.id==='stillInput' && data.type==='spirit') redistill();
  if(target.id==='aging' && data.type==='spirit') makeBarrel();
  if(target.id==='bottling' && data.type==='barrel') bottleBarrel(data.id);
  if(target.id==='truckDock' && data.type==='box') sellBox(data.id);
}
function addMaltToVat(source){ const t=state.malt[+source]; if(!t || t.status!=='filled' || t.germ<68 || t.germ>90) return; const add=Math.min(20, 100-state.vat.volume); if(add<=0) return; t.status='empty'; t.germ=0; t.moisture=0; state.vat.ferment = state.vat.volume ? state.vat.ferment*(state.vat.volume/(state.vat.volume+add)) : 0; state.vat.volume += add; state.vat.rotten=false; state.vat.idle=0; }
function transferWashToStill(){ const v=state.vat, s=state.still; if(v.volume<=0 || v.ferment<65 || v.ferment>90 || v.rotten) return; const move=Math.min(v.volume*.20, 100-s.input); if(move<=0) return; v.volume-=move; if(v.volume<1){ v.volume=0; v.ferment=0; v.yeast=false; } s.input+=move; s.inputAbv=8; s.runs=0; }
function redistill(){ const s=state.still; if(s.output<=0) return; s.input += s.output; s.inputAbv=s.outputAbv; s.runs=s.outputRuns; s.output=0; s.outputAbv=0; s.outputRuns=0; }
function makeBarrel(){ const s=state.still; if(s.output<=0 || s.outputRuns<2) return; state.barrels.push({id:crypto.randomUUID(), volume:clamp(s.output*10,5,100), age:0.1, abv:s.outputAbv}); s.output=0; s.outputAbv=0; s.outputRuns=0; }
function bottleBarrel(id){ const i=state.barrels.findIndex(b=>b.id===id); if(i<0) return; const b=state.barrels.splice(i,1)[0]; const bottles=Math.max(1,Math.round(clamp(b.volume,0,100))); state.boxes.push({id:crypto.randomUUID(), bottles, age:b.age}); state.bottles += bottles; }
function sellBox(id){ const i=state.boxes.findIndex(b=>b.id===id); if(i<0) return; const b=state.boxes.splice(i,1)[0]; const euros=b.bottles * Math.max(.1,b.age) * state.market; state.coins += euros/1000; state.bottles -= b.bottles; }

$('#buySeeds').onclick=()=>{ if(state.coins>=10){ state.coins-=10; state.seeds+=1; render(); }};
$('#yeast').onclick=()=>{ if(state.vat.volume>0 && !state.vat.rotten){ state.vat.yeast=true; state.vat.idle=0; render(); }};
$('#fire').onclick=()=>{ state.still.fire=!state.still.fire; render(); };
$('#fermentation').onclick=e=>{ if(e.target.id==='fermentation' && state.vat.rotten){ Object.assign(state.vat,{volume:0,ferment:0,yeast:false,idle:0,rotten:false}); render(); }};
$('#office').onclick=()=>$('#officePanel').classList.toggle('hidden');
$('#grantMoney').onclick=()=>{ state.coins+=25; render(); };
$('#resetGame').onclick=()=>location.reload();

const tip=$('#tooltip');
document.addEventListener('pointermove', e=>{ tip.style.left=e.clientX+'px'; tip.style.top=e.clientY+'px'; });
document.addEventListener('pointerover', e=>{ const el=e.target.closest('[data-tip]'); if(!el) return; tip.textContent=el.dataset.tip; tip.classList.add('show'); });
document.addEventListener('pointerout', e=>{ if(e.target.closest('[data-tip]')) tip.classList.remove('show'); });

initTiles(); render(); setInterval(tick, 120);
