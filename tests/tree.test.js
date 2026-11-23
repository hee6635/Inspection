const assert = require('assert');
const T = require('../app/src/main/assets/js/tree.js');

const txt = 'K1\n  정정 유압\n    Pump 점검\n      #3PUMP 미세누유중\n      #1PUMP 미세누유중\n  Grinder 유압\nK2';
const r = T.parse(txt);
assert.strictEqual(T.toText(r), txt, 'round trip');
assert.strictEqual(T.count(r.c[0], 1), 2, 'issue count');
assert.strictEqual(T.desc(r.c[0]), 5, 'descendants');

// messy input: tabs, full-width spaces, blank lines, too-deep jumps, >4 levels
const m = T.parse('K1\r\n\t정정\n\t\t\t\t\t너무깊음\n\n  B\n            E\n              F\n                  G\n　　X');
assert.strictEqual(T.toText(m), 'K1\n  정정\n    너무깊음\n  B\n    E\n      F\n      G\n    X');
assert.strictEqual(T.parse('  \n\n').c.length, 0, 'empty');
// backup with 메모 section; old backups (no marker) give m = null
const pk = T.pack(T.parse('K1\n  정정 유압'), T.parse('K1\n  작업방법\n    A강종은 이렇게'));
assert.strictEqual(pk, 'K1\n  정정 유압\n=== 메모 ===\nK1\n  작업방법\n    A강종은 이렇게');
const up = T.unpack(pk);
assert.strictEqual(T.toText(up.t), 'K1\n  정정 유압');
assert.strictEqual(T.toText(up.m), 'K1\n  작업방법\n    A강종은 이렇게');
assert.strictEqual(T.unpack('K1\n  B').m, null);
assert.strictEqual(T.unpack('K1\r\n===메모===\r\nM').m.c[0].n, 'M');
// a multi-line 메모 survives the one-line-per-item backup
const ml = T.parse('K1\n  작업방법\n    첫줄\\n둘째줄');
assert.strictEqual(ml.c[0].c[0].c[0].n, '첫줄\n둘째줄');
assert.strictEqual(T.toText(ml), 'K1\n  작업방법\n    첫줄\\n둘째줄');
console.log('tree tests ok');
