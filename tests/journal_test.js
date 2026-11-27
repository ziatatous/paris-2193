const { launch } = require('./harness');
(async () => {
  const g = await launch({});
  await g.page.keyboard.press('Tab'); await g.page.waitForTimeout(200);
  const open = await g.eval(() => ({ open: G.docOpen, text: document.getElementById('doc-b').textContent.slice(0, 80), title: document.getElementById('doc-t').textContent }));
  await g.page.keyboard.press('Tab'); await g.page.waitForTimeout(200); const closed = await g.eval(() => !G.docOpen);
  await g.page.keyboard.press('Tab'); await g.page.waitForTimeout(100); await g.page.keyboard.press('KeyE'); await g.page.waitForTimeout(100); const closedByE = await g.eval(() => !G.docOpen && !G.hidden);
  console.log(JSON.stringify({ open, closed, closedByE })); console.log('erreurs:', g.errors.length ? g.errors : 'aucune');
  const ok = open.open && /JOURNAL/.test(open.title) && closed && closedByE && !g.errors.length; console.log(ok ? 'JOURNAL : OK' : 'JOURNAL : ÉCHEC'); await g.close(); process.exit(ok ? 0 : 1);
})();
