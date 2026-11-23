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
console.log('tree tests ok');
