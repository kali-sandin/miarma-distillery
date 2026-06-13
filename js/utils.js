// Small shared helpers. Kept as a classic script so the legacy game can use them without a build step.
const $ = (q, root=document) => root.querySelector(q);
const $$ = (q, root=document) => [...root.querySelectorAll(q)];
const clamp = (n,a,b)=>Math.max(a,Math.min(b,n));
const pct = n => `${clamp(n,0,100).toFixed(0)}%`;
const rnd = (a,b) => a + Math.random()*(b-a);
const uuid = () => crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
const scaleNow = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--scale')) || 1;
const localPoint = (el, x, y) => {
  const r=el.getBoundingClientRect(), sc=scaleNow();
  return {x: clamp((x-r.left)/sc, 6, Math.max(6, el.offsetWidth-120)), y: clamp((y-r.top)/sc, 6, Math.max(6, el.offsetHeight-90))};
};
const localDropPoint = (el, e, data) => {
  const r=el.getBoundingClientRect(), sc=scaleNow();
  return {x: clamp((e.clientX-r.left)/sc - (Number(data?.offsetX)||0), 6, Math.max(6, el.offsetWidth-120)), y: clamp((e.clientY-r.top)/sc - (Number(data?.offsetY)||0), 6, Math.max(6, el.offsetHeight-90))};
};
const pointIn = (el, x, y) => {
  const r=el.getBoundingClientRect();
  return x>=r.left && x<=r.right && y>=r.top && y<=r.bottom;
};
