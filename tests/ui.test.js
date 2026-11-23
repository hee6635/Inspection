// UI check in a phone-sized Chromium with real touch events: node tests/ui.test.js [screenshot-dir]
const { chromium } = require('playwright');
const assert = require('assert');
const path = require('path');
const shots = process.argv[2];

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 360, height: 760 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => {
    window.__copied = []; window.__shared = '';
    window.Android = {
      load: () => localStorage.getItem('d') || '', save: s => localStorage.setItem('d', s),
      copy: (t, a, c, f) => window.__copied.push([t, a, c, f]), canFloat: () => true, askFloat: () => {}, hideFloat: () => { window.__hidden = 1; },
      share: t => { window.__shared = t; }, paste: () => '',
    };
  });
  await p.goto('file://' + path.resolve(__dirname, '../app/src/main/assets/index.html'));
  const cdp = await ctx.newCDPSession(p);
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type == 'touchEnd' ? [] : [{ x, y }] });
  const ctr = async sel => { const r = await p.locator(sel).first().boundingBox(); return [r.x + r.width / 2, r.y + r.height / 2]; };
  const wait = ms => p.waitForTimeout(ms);
  async function tap(sel) { const [x, y] = await ctr(sel); await touch('touchStart', x, y); await wait(60); await touch('touchEnd'); await wait(450); }
  async function hold(sel, dx = 0, dy = 0) {
    const [x, y] = await ctr(sel); await touch('touchStart', x, y); await wait(600);
    for (let k = 1; k <= 12; k++) { await touch('touchMove', x + dx * k / 12, y + dy * k / 12); await wait(16); }
    await touch('touchEnd'); await wait(500);
  }
  const saved = () => p.evaluate(() => Tree.toText(JSON.parse(localStorage.getItem('d') || '{"t":{"c":[]}}').t));
  const shot = async n => shots && p.screenshot({ path: `${shots}/${n}.png` });

  await shot('1-start');
  // open 소분류 and copy an issue
  await tap('.card .row');
  assert.ok(await p.locator('.card.open').count() == 1, 'card opens');
  await tap('.iss');
  assert.deepStrictEqual(await p.evaluate(() => window.__copied[0]), ['#3PUMP 미세누유중', '정정 유압', '정정 유압 Pump 작동 상태 점검', true]);
  assert.ok((await p.textContent('#toast')).includes('#3PUMP'), 'toast');

  // add a second issue through the input window
  await tap('.item [data-add]');
  await p.fill('#in', '#1PUMP 미세누유중');
  await p.click('[data-ok]'); await wait(500);
  assert.strictEqual(await p.locator('.iss').count(), 2, 'issue added');
  assert.strictEqual(await p.textContent('.badge'), '2', 'badge count');
  await shot('2-added');

  // long-press drag #1 above #3
  await hold('.iss >> nth=1', 0, -40);
  assert.deepStrictEqual(await p.$$eval('.iss', e => e.map(x => x.textContent)), ['#1PUMP 미세누유중', '#3PUMP 미세누유중'], 'issue reorder');
  // each issue copies only itself
  // any 문제 copies every 문제 of its 점검항목, one per line
  await tap('.iss >> nth=1');
  assert.strictEqual(await p.evaluate(() => window.__copied.at(-1)[0]), '#1PUMP 미세누유중\n#3PUMP 미세누유중');
  assert.ok((await p.textContent('#toast')).includes('문제 2개'), 'toast shows count');

  // drag the Grease System card above Grinder 유압
  await hold('.card >> nth=2', 0, -70);
  assert.deepStrictEqual(await p.$$eval('.card .nm', e => e.slice(1, 3).map(x => x.textContent)), ['Grease System', 'Grinder 유압'], 'card reorder');

  // add tabs, then drag K2 to the front
  await tap('.plus'); await p.fill('#in', 'K2'); await p.click('[data-ok]'); await wait(500);
  assert.strictEqual(await p.textContent('.tab.on'), 'K2', 'new tab selected');
  assert.ok((await p.textContent('.empty, .addcat')).includes('소분류'), 'empty tab shows add');
  await hold('.tab >> nth=1', -80, 0);
  assert.deepStrictEqual(await p.$$eval('.tab', e => e.map(x => x.firstChild.textContent)), ['K2', 'K1'], 'tab reorder');
  assert.strictEqual(await p.textContent('.tab.on'), 'K2', 'selection follows the tab');
  // tabs are a 3-column grid: drag a 2nd-row tab up onto the first cell
  for (const n of ['K3', 'K4']) { await tap('.plus'); await p.fill('#in', n); await p.click('[data-ok]'); await wait(500); }
  await hold('.tab >> nth=3', 0, -46);
  assert.deepStrictEqual(await p.$$eval('.tab', e => e.map(x => x.firstChild.textContent)), ['K4', 'K2', 'K1', 'K3'], 'grid tab reorder');
  await shot('6-grid');
  await tap('.tab >> nth=2'); // back to K1

  // long-press release on a card -> menu -> rename
  await hold('.card >> nth=3');
  assert.ok(await p.locator('#pop.menu').isVisible(), 'menu opens');
  await shot('3-menu');
  await p.click('[data-m="e"]'); await wait(400);
  await p.fill('#in', '유압실 Hoist 2'); await p.click('[data-ok]'); await wait(400);
  assert.ok((await saved()).includes('  유압실 Hoist 2'), 'renamed');

  // delete a card with children asks first; cancel keeps it
  await hold('.card >> nth=0 >> .row'); await p.click('[data-m="d"]'); await wait(400);
  assert.ok((await p.textContent('#pop')).includes('3개 항목'), 'delete confirm counts children');
  await p.click('[data-x]'); await wait(400);
  assert.strictEqual(await p.locator('.card').count(), 5);
  // resolve (delete) an issue
  await hold('.iss >> nth=0'); await p.click('[data-m="d"]'); await wait(600);
  assert.strictEqual(await p.locator('.iss').count(), 1, 'issue resolved');

  // 말풍선 toggle in the ⋯ menu: off -> copy only, bubble closed
  await tap('#more'); await p.click('[data-m="f"]'); await wait(300);
  assert.ok(await p.locator('#pop.menu .sw:not(.on)').isVisible(), 'switch off, menu stays open');
  assert.strictEqual(await p.evaluate(() => window.__hidden), 1, 'bubble closed');
  await p.evaluate(() => back()); await wait(300);
  await tap('.iss'); assert.strictEqual(await p.evaluate(() => window.__copied.at(-1)[3]), false, 'copy without bubble');
  await tap('#more'); await p.click('[data-m="f"]'); await wait(300); await shot('5-toggle'); await p.evaluate(() => back()); await wait(300);
  await tap('.iss'); assert.strictEqual(await p.evaluate(() => window.__copied.at(-1)[3]), true, 'bubble back on');

  // backup then restore round trip
  await tap('#more'); await p.click('[data-m="b"]'); await wait(300);
  const backup = await p.evaluate(() => window.__shared);
  assert.strictEqual(backup, await saved(), 'backup = saved tree');
  await tap('#more'); await p.click('[data-m="r"]'); await wait(400);
  await p.fill('#ta', 'A\n  B\n    C\n      D'); await p.click('[data-ok]'); await wait(500);
  assert.strictEqual(await saved(), 'A\n  B\n    C\n      D', 'restore');
  await p.reload(); await wait(300);
  assert.strictEqual(await p.$eval('.tab.on', e => e.firstChild.textContent), 'A', 'data survives reload');
  // Android back closes windows first
  await tap('#more'); assert.strictEqual(await p.evaluate(() => back()), true); await wait(300);
  assert.strictEqual(await p.evaluate(() => back()), false);

  await p.emulateMedia({ colorScheme: 'dark' }); await tap('.card .row'); await shot('4-dark');
  assert.deepStrictEqual(errs, [], 'no page errors');
  console.log('ui tests ok');
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
