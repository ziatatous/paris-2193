let pw; try { pw = require('playwright'); } catch (e) { pw = require('/usr/lib/node_modules/playwright'); }
const path = require('path');
(async () => {
  const b = await pw.chromium.launch({ args: ['--use-gl=swiftshader'] }); const pg = await b.newPage({ viewport: { width: 1100, height: 620 } }); const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.addInitScript(() => { localStorage.setItem('paris2193.save', JSON.stringify({ chapter: 3, collect: ['mila_note'], flags: {}, deaths: 2 })); });
  await pg.goto('file://' + path.resolve(__dirname, '../dist/paris2193.html')); await pg.waitForTimeout(1500);
  console.log(JSON.stringify(await pg.evaluate(() => ({ play: document.getElementById('b-play').textContent, newHidden: document.getElementById('b-new').hidden, devHidden: document.getElementById('b-lab').hidden }))));
  await pg.screenshot({ path: process.env.SHOTDIR + '/menu.png' }); console.log('erreurs:', errs.length ? errs : 'aucune'); await b.close();
})();
