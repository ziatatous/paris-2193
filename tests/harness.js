// Petit banc d'essai : lance le jeu (dist/paris2193.html, tout-en-un, aucun réseau) dans Chromium sans carte graphique.
// Usage : const { launch } = require('./harness'); const g = await launch({ mode: 'play' }); await g.eval(() => G.P.pos.x); await g.close();
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/usr/lib/node_modules/playwright'); }
const path = require('path');
exports.launch = async function (o) {
  o = o || {};
  const browser = await pw.chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: o.w || 640, height: o.h || 360 } });
  const errors = [];
  page.on('pageerror', e => errors.push('page: ' + e.message.slice(0, 300)));
  page.on('console', m => { if (m.type() === 'error' && !/favicon|cop\.glb/.test(m.text())) errors.push('console: ' + m.text().slice(0, 300)); });
  await page.goto('file://' + path.resolve(__dirname, '..', o.file || 'dist/paris2193.html'));
  const btn = { play: '#b-play', lab: '#b-lab', sandbox: '#b-sandbox' }[o.mode || 'play'];
  await page.click(btn);
  await page.waitForSelector('#enter:not([hidden])', { timeout: o.timeout || 240000 });
  await page.click('#enter');
  if (o.quiet !== false) await page.evaluate(() => { const f = document.getElementById('fade'); f.style.transition = 'none'; f.style.opacity = 0; for (const id of ['title', 'hint']) { const e = document.getElementById(id); if (e) e.style.opacity = 0; } });
  return { page, errors, eval: (fn, arg) => page.evaluate(fn, arg), shot: (f) => page.screenshot({ path: f }), close: () => browser.close() };
};
