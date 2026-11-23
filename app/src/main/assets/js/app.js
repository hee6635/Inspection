'use strict';
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
// Android bridge (MainActivity.Bridge); fallback lets the page run in a desktop browser for testing
const A = window.Android || {
  load: () => localStorage.getItem('d') || '', save: s => localStorage.setItem('d', s),
  copy: t => navigator.clipboard && navigator.clipboard.writeText(t).catch(() => {}),
  canFloat: () => true, askFloat: () => {}, share: t => console.log(t), paste: () => '',
};
const EASE = 'cubic-bezier(.2,.9,.25,1)';
const LABEL = ['큰 탭', '소분류', '점검항목', '문제 내용'];
const ICON = '<svg viewBox="0 0 24 24"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.2L4 16.8V20h3.2l5.3-5.3a4 4 0 0 0 5.2-5.4l-2.5 2.5-2.3-.6-.6-2.3z"/></svg>';
const DEF = 'K1\n  정정 유압\n    정정 유압 Pump 작동 상태 점검\n      #3PUMP 미세누유중\n  Grinder 유압\n  Grease System\n  유압실 Hoist\n  #1,2,3 G/M 집진기, S/B 집진기';

let S = null;
try { S = JSON.parse(A.load()); } catch (e) { S = null; }
if (!S || !S.t || !Array.isArray(S.t.c)) S = { t: Tree.parse(DEF), cur: 0 };
let seq = 0;
function ids(n) { n.id = ++seq; n.c = Array.isArray(n.c) ? n.c : []; n.n = String(n.n || ''); n.c.forEach(ids); }
ids(S.t);
const save = () => A.save(JSON.stringify(S, (k, v) => k === 'id' ? undefined : v));
function find(id, n = S.t, p = null, d = 0) {
  if (n.id == id) return { n, p, d };
  for (const c of n.c) { const r = find(id, c, n, d + 1); if (r) return r; }
  return null;
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pop = el => el && el.animate([{ transform: 'scale(.6)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 380, easing: EASE });

/* ---------- 그리기 ---------- */
function renderTabs() {
  $('#tabs').innerHTML = '<div id="thumb"></div>' + S.t.c.map((t, i) => {
    const c = Tree.count(t, 1);
    return `<b class="tab${i == S.cur ? ' on' : ''}" data-id="${t.id}">${esc(t.n)}${c ? `<i class="tb">${c}</i>` : ''}</b>`;
  }).join('') + '<b class="plus" data-add="root">⊕</b>';
  thumb(false);
}
function thumb(anim) {
  const on = $('.tab.on'), th = $('#thumb');
  if (!on) { th.style.display = 'none'; return; }
  th.style.transition = anim ? '' : 'none';
  th.style.width = on.offsetWidth + 'px';
  th.style.transform = `translateX(${on.offsetLeft}px)`;
  if (anim) on.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' });
}
function renderList() {
  const tab = S.t.c[S.cur];
  if (!tab) { $('#list').innerHTML = '<div class="empty">⊕ 를 눌러 큰 탭을 추가하세요</div>'; return; }
  $('#list').innerHTML = tab.c.map(cat => {
    const c = Tree.count(cat, 2);
    return `<div class="card${c ? ' hot' : ''}${cat.o ? ' open' : ''}" data-id="${cat.id}">
      <div class="row" data-tog="${cat.id}"><div class="ico">${ICON}</div><div class="nm">${esc(cat.n)}</div>${c ? `<div class="badge">${c}</div>` : ''}<div class="chev">⌄</div></div>
      <div class="body"><div><div class="items">${cat.c.map(it => `<div class="item" data-id="${it.id}"><div class="chk">${esc(it.n)}</div><div class="issl">${it.c.map(is => `<div class="iss" data-id="${is.id}">${esc(is.n)}</div>`).join('')}</div><div class="add" data-add="${it.id}"><i>+</i>문제 추가</div></div>`).join('')}</div>
      <div class="add sub" data-add="${cat.id}"><i>+</i>점검항목 추가</div><div class="gap"></div></div></div></div>`;
  }).join('') + `<div class="addcat" data-add="${tab.id}"><i>+</i>소분류 추가</div>`;
}
function render() { if (S.cur >= S.t.c.length) S.cur = Math.max(0, S.t.c.length - 1); renderTabs(); renderList(); }

/* ---------- 알림 · 창 ---------- */
let toastT;
function toast(h) {
  const t = $('#toast'); t.innerHTML = h; t.classList.remove('on'); void t.offsetWidth; t.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 1600);
}
let popTok = 0, popClose = null;
// opens #pop growing out of the touched element `from`
function openPop(html, from, kind) {
  const p = $('#pop'); popTok++;
  p.getAnimations().forEach(a => a.cancel());
  p.className = kind; p.innerHTML = html; p.onclick = null; p.style.left = p.style.top = '';
  $('#dim').className = kind == 'menu' ? 'on clear' : 'on';
  const r = from && from.getBoundingClientRect();
  if (kind == 'menu') {
    const w = p.offsetWidth;
    p.style.left = Math.min(Math.max(12, r.right - w - 8), innerWidth - w - 12) + 'px';
    let top = r.bottom - 4;
    if (top + p.offsetHeight > innerHeight - 12) top = r.top - p.offsetHeight + 4;
    p.style.top = Math.max(12, top) + 'px';
  }
  const pr = p.getBoundingClientRect();
  p.style.transformOrigin = r ? `${r.left + r.width / 2 - pr.left}px ${r.top + r.height / 2 - pr.top}px` : '50% 100%';
  p.animate([{ transform: 'scale(.3)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 300, easing: EASE });
  return p;
}
function closePop() {
  const p = $('#pop'); if (!p.className) return false;
  const tok = popTok;
  $('#dim').className = '';
  p.animate([{ transform: 'none', opacity: 1 }, { transform: 'scale(.3)', opacity: 0 }], { duration: 180, easing: 'ease-in' })
    .onfinish = () => { if (tok == popTok) { p.className = ''; p.innerHTML = ''; } };
  if (popClose) { const f = popClose; popClose = null; f(null); }
  return true;
}
$('#dim').onclick = closePop;

function ask(head, label, val, from) {
  return new Promise(res => {
    const p = openPop(`<div class="mt">${head}</div><label class="fl"><input id="in" value="${esc(val)}" placeholder=" " autocomplete="off"><span>${label}</span></label>
      <div class="btns"><button class="b2" data-x>취소</button><button class="b1" data-ok>저장</button></div>`, from, 'modal');
    popClose = res;
    const inp = $('#in'); inp.focus();
    const done = v => { popClose = null; closePop(); res(v); };
    p.querySelector('[data-x]').onclick = () => done(null);
    p.querySelector('[data-ok]').onclick = () => { const v = inp.value.trim(); if (v) done(v); else inp.focus(); };
    inp.onkeydown = e => { if (e.key == 'Enter') p.querySelector('[data-ok]').click(); };
  });
}
function confirmBox(msg, ok, from, danger) {
  return new Promise(res => {
    const p = openPop(`<div class="msg">${msg}</div><div class="btns"><button class="b2" data-x>취소</button><button class="b1${danger ? ' del' : ''}" data-ok>${ok}</button></div>`, from, 'modal');
    popClose = res;
    const done = v => { popClose = null; closePop(); res(v); };
    p.querySelector('[data-x]').onclick = () => done(false);
    p.querySelector('[data-ok]').onclick = () => done(true);
  });
}

/* ---------- 동작 ---------- */
function selTab(el) {
  const i = $$('.tab').indexOf(el); if (i < 0 || i == S.cur) return;
  const dir = i > S.cur ? 1 : -1;
  S.cur = i; save();
  $$('.tab').forEach((t, j) => t.classList.toggle('on', j == i));
  thumb(true); renderList();
  $('#list').animate([{ transform: `translateX(${dir * 40}px)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 320, easing: EASE });
}
function toggle(id) {
  const f = find(id); f.n.o = !f.n.o; save();
  $(`.card[data-id="${id}"]`).classList.toggle('open', f.n.o);
}
let askedFloat = false;
function copy(el) {
  const f = find(el.dataset.id), item = f.p, cat = find(item.id).p;
  el.animate([{ transform: 'scale(.96)' }, { transform: 'none' }], { duration: 220, easing: EASE });
  A.copy(f.n.n, cat.n, item.n);
  toast('복사됨 · <b>' + esc(f.n.n) + '</b>');
  if (!askedFloat && !A.canFloat()) {
    askedFloat = true;
    setTimeout(() => confirmBox('말풍선을 다른 앱 위에 띄우려면<br><b>다른 앱 위에 표시</b>를 허용해 주세요', '허용하기', el)
      .then(ok => ok && A.askFloat()), 500);
  }
}
async function add(pid, el) {
  const f = pid == 'root' ? { n: S.t, d: 0 } : find(pid);
  const L = LABEL[f.d];
  const v = await ask(L + ' 추가', L, '', el); if (!v) return;
  const n = { n: v, c: [], id: ++seq };
  f.n.c.push(n);
  if (f.d == 0) S.cur = S.t.c.length - 1;
  save(); render();
  pop($(`[data-id="${n.id}"]`));
  if (f.d == 0) thumb(true);
}
function menu(el) {
  const f = find(el.dataset.id);
  const p = openPop(`<div data-m="e">이름 수정</div><div data-m="d" class="red">${f.d == 4 ? '해결 (삭제)' : '삭제'}</div>`, el, 'menu');
  p.onclick = async e => {
    const m = e.target.closest('[data-m]'); if (!m) return;
    closePop();
    if (m.dataset.m == 'e') {
      const v = await ask('이름 수정', LABEL[f.d - 1], f.n.n, el);
      if (v) { f.n.n = v; save(); render(); }
    } else remove(f, el);
  };
}
async function remove(f, el) {
  const k = Tree.desc(f.n);
  if (k && !await confirmBox(`<b>${esc(f.n.n)}</b> 아래 ${k}개 항목도 같이 지워져요`, '삭제', el, true)) return;
  const curTab = S.t.c[S.cur];
  const done = () => {
    f.p.c.splice(f.p.c.indexOf(f.n), 1);
    const i = S.t.c.indexOf(curTab);
    S.cur = Math.max(0, i >= 0 ? i : Math.min(S.cur, S.t.c.length - 1));
    save(); render();
  };
  if (f.d == 1) { done(); return; }
  el.style.overflow = 'hidden';
  el.animate([{ height: el.offsetHeight + 'px', opacity: 1, transform: 'none' },
    { height: '0px', opacity: 0, transform: 'scale(.9)', marginTop: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }],
  { duration: 300, easing: EASE }).onfinish = done;
}
function more(el) {
  const p = openPop('<div data-m="b">백업 내보내기</div><div data-m="r">복원 (붙여넣기)</div>', el, 'menu');
  p.onclick = e => {
    const m = e.target.closest('[data-m]'); if (!m) return;
    closePop();
    if (m.dataset.m == 'b') A.share(Tree.toText(S.t)); else restore(el);
  };
}
function restore(el) {
  const p = openPop(`<div class="mt">복원</div><div class="msg">지금 내용이 모두 바뀌어요</div><textarea id="ta" placeholder="백업 텍스트를 붙여넣으세요"></textarea>
    <div class="btns"><button class="b2" data-p>붙여넣기</button><button class="b1" data-ok>복원</button></div>`, el, 'modal');
  p.querySelector('[data-p]').onclick = () => { const t = A.paste(); if (t) $('#ta').value = t; };
  p.querySelector('[data-ok]').onclick = () => {
    const t = Tree.parse($('#ta').value);
    if (!t.c.length) { toast('내용이 없어요'); return; }
    closePop(); S = { t, cur: 0 }; ids(S.t); save(); render(); toast('복원했어요');
  };
}

/* ---------- 터치: 톡 · 길게 눌러 메뉴 · 길게 눌러 끌기 ---------- */
let G = null;
document.addEventListener('touchstart', e => {
  if (G || e.touches.length > 1 || $('#pop').className) return;
  const t = e.touches[0], tg = e.target;
  const el = tg.closest('[data-add]') ? null : tg.closest('[data-id]');
  G = { x: t.clientX, y: t.clientY, tg, el, lp: false, moved: false };
  if (el) G.timer = setTimeout(() => { G.lp = true; lift(G); }, 450);
}, { passive: true });
document.addEventListener('touchmove', e => {
  if (!G) return;
  const t = e.touches[0], dx = t.clientX - G.x, dy = t.clientY - G.y;
  if (!G.lp) { if (Math.abs(dx) + Math.abs(dy) > 10) { clearTimeout(G.timer); G = null; } return; }
  e.preventDefault(); // without this the WebView eats the next tap after a drag
  if (Math.abs(dx) + Math.abs(dy) > 6) G.moved = true;
  dragMove(G, G.ax == 'x' ? dx : dy);
}, { passive: false });
document.addEventListener('touchend', e => {
  if (!G) return;
  clearTimeout(G.timer); const g = G; G = null;
  e.preventDefault(); // stop the synthetic click landing on a window we just opened
  if (g.lp) { if (g.moved) drop(g); else { unlift(g); menu(g.el); } }
  else tap(g.tg);
}, { passive: false });
document.addEventListener('touchcancel', () => { if (!G) return; clearTimeout(G.timer); if (G.lp) unlift(G); G = null; });
document.addEventListener('contextmenu', e => { if (!e.target.closest('input,textarea')) e.preventDefault(); });

function tap(tg) {
  const a = tg.closest('[data-add]'); if (a) return add(a.dataset.add, a);
  const tog = tg.closest('[data-tog]'); if (tog) return toggle(tog.dataset.tog);
  const tab = tg.closest('.tab'); if (tab) return selTab(tab);
  const is = tg.closest('.iss'); if (is) return copy(is);
  const m = tg.closest('#more'); if (m) return more(m);
}
function lift(g) {
  const el = g.el, kind = el.classList[0];
  g.sib = [...el.parentNode.children].filter(x => x.dataset.id && x.classList[0] == kind);
  g.from = g.to = g.sib.indexOf(el);
  g.ax = kind == 'tab' ? 'x' : 'y';
  g.rects = g.sib.map(s => s.getBoundingClientRect());
  const r0 = g.rects[0], r1 = g.rects[1];
  const gap = r1 ? (g.ax == 'x' ? r1.left - r0.right : r1.top - r0.bottom) : 0;
  g.sz = g.rects.map(r => (g.ax == 'x' ? r.width : r.height) + gap);
  el.classList.add('lift');
  el.style.transition = 'transform .2s ' + EASE; el.style.transform = 'scale(1.03)';
  g.sib.forEach(s => s != el && s.classList.add('mv'));
}
const mid = (r, ax) => ax == 'x' ? r.left + r.width / 2 : r.top + r.height / 2;
function dragMove(g, d) {
  const T = g.ax == 'x' ? 'X' : 'Y', r = g.rects[g.from];
  // swap once the dragged edge crosses a neighbour's middle
  const lo = (g.ax == 'x' ? r.left : r.top) + d, hi = (g.ax == 'x' ? r.right : r.bottom) + d;
  g.el.style.transition = 'none'; g.el.style.transform = `translate${T}(${d}px) scale(1.03)`;
  let to = g.from;
  g.sib.forEach((s, i) => {
    if (i == g.from) return;
    const m = mid(g.rects[i], g.ax); let sh = 0;
    if (i > g.from && m < hi) { sh = -g.sz[g.from]; to++; } else if (i < g.from && m > lo) { sh = g.sz[g.from]; to--; }
    s.style.transform = sh ? `translate${T}(${sh}px)` : '';
  });
  g.to = to;
  // shortcut: no auto-scroll while dragging near the screen edge; add if lists outgrow one screen
}
function unlift(g) {
  g.el.style.transition = 'transform .2s ' + EASE; g.el.style.transform = '';
  g.sib.forEach(s => { s.style.transform = ''; });
  setTimeout(() => { g.el.classList.remove('lift'); g.sib.forEach(s => s.classList.remove('mv')); }, 200);
}
function drop(g) {
  const T = g.ax == 'x' ? 'X' : 'Y';
  let off = 0;
  if (g.to > g.from) for (let i = g.from + 1; i <= g.to; i++) off += g.sz[i];
  else for (let i = g.to; i < g.from; i++) off -= g.sz[i];
  g.el.style.transition = 'transform .22s ' + EASE; g.el.style.transform = `translate${T}(${off}px)`;
  setTimeout(() => {
    if (g.to != g.from) {
      const f = find(g.el.dataset.id), arr = f.p.c, curTab = S.t.c[S.cur];
      arr.splice(g.to, 0, arr.splice(g.from, 1)[0]);
      S.cur = Math.max(0, S.t.c.indexOf(curTab));
      save();
    }
    const y = scrollY; render(); scrollTo(0, y);
  }, 230);
}

// Android back: close the top-most window first
window.back = () => closePop();

render();
