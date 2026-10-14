// Temporary orphan-file scan: lists src files never imported by another src file.
const fs = require('fs');
const path = require('path');

const walk = (dir) =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));

const files = walk('src').filter((f) => /\.(js|jsx)$/.test(f) && !f.endsWith('.test.js'));
const contents = new Map(files.map((f) => [f, fs.readFileSync(f, 'utf8')]));

// Entry points that are legitimately never imported.
const ENTRYPOINTS = new Set(['index.jsx', 'index.js', 'reportWebVitals.js', 'setupTests.js']);

const orphans = [];
for (const f of files) {
  const base = path.basename(f).replace(/\.(js|jsx)$/, '');
  if (ENTRYPOINTS.has(base + path.extname(f)) || ENTRYPOINTS.has(base)) continue;
  const needle = new RegExp(`from\\s+['"][^'"]*${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`);
  const imported = [...contents].some(([other, src]) => other !== f && needle.test(src));
  const reExported = [...contents].some(
    ([other, src]) => other !== f && new RegExp(`['"][^'"]*${base}['"]`).test(src)
  );
  if (!imported && !reExported) orphans.push(f);
}
console.log(orphans.length ? orphans.join('\n') : 'none');
console.log('checked:', files.length);
