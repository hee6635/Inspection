// Tree: { n: name, c: children }. Depth 1 큰 탭, 2 소분류, 3 점검항목, 4 문제.
// Backup text: one name per line, 2 spaces per level.
const Tree = (() => {
  const MAX = 4;
  function parse(text) {
    const root = { n: '', c: [] };
    const st = [root]; // st[d] = last node at depth d
    for (const raw of String(text).split(/\r?\n/)) {
      const name = raw.trim();
      if (!name) continue;
      const ind = raw.match(/^[ \t　]*/)[0].replace(/[\t　]/g, '  ').length;
      const d = Math.min(Math.floor(ind / 2) + 1, st.length, MAX);
      st.length = d;
      const n = { n: name, c: [] };
      st[d - 1].c.push(n);
      st.push(n);
    }
    return root;
  }
  function toText(root) {
    const out = [];
    (function w(n, d) { for (const c of n.c) { out.push('  '.repeat(d) + c.n); w(c, d + 1); } })(root, 0);
    return out.join('\n');
  }
  // number of 문제 under node n sitting at depth d
  const count = (n, d) => d >= MAX ? 1 : n.c.reduce((a, c) => a + count(c, d + 1), 0);
  const desc = n => n.c.reduce((a, c) => a + 1 + desc(c), 0);
  return { parse, toText, count, desc };
})();
if (typeof module !== 'undefined') module.exports = Tree;
