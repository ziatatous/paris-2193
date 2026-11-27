// Bot du chapitre 1 : prend la clé, descend les 4 étages, traverse cour et ruelles, livre la clé. Vérifie scènes, collectibles, fin de chapitre, retour au début.
const { launch } = require('./harness');
(async () => {
  const g = await launch({});
  const r = await g.eval(() => {
    const P = G.P, out = { steps: 0 }; G.cops.length = 0; G.frozen = false; G.keys = { KeyW: true, ShiftLeft: true };
    const use = id => { const it = G.interactables.find(i => i.id === id); if (!it) return false; it.use(); if (G.docOpen) G.closeDoc(); return true; };
    out.usb = use('usb'); out.mila = use('mila'); out.note = use('mila_note');
    const W = [[8.4, 25.4], [7.9, 23.5], [6.0, 23.5], [6.0, 26.2], [6.0, 28.5], [4.1, 28.5], [4.1, 25.5], [5.0, 24.0], [6.0, 26.2], [6.0, 28.5], [4.1, 28.5], [4.1, 25.5], [5.0, 24.0], [6.0, 26.2], [6.0, 28.5], [4.1, 28.5], [4.1, 25.5], [5.0, 24.0], [6.0, 26.2], [6.0, 28.5], [4.1, 28.5], [4.1, 25.5], [5.5, 24.0], [8.0, 24.0], [8.0, 21.0],
      [11, 18.5], [13, 18.5], [21, 18.5], [21.5, 15], [21.5, 9.2], [24, 8.7], [28, 8.6], [33, 8.8], [36, 9.2], [38.5, 12], [39, 17], [40, 19.8], [52, 19.8], [60, 19.6]];
    let wi = 1; P.pos.set(W[0][0], 12, W[0][1]);
    for (let t = 0; t < 14000 && wi < W.length; t++) {
      const [tx, tz] = W[wi], dx = tx - P.pos.x, dz = tz - P.pos.z; P.yaw = Math.atan2(-dx, -dz); G.keys.Space = (t % 40 === 0);
      G.updatePlayer(0.03); G.updateTriggers(); out.steps = t; if (Math.hypot(dx, dz) < 0.6) wi++;
    }
    out.reachedAll = wi >= W.length; out.pos = [P.pos.x, P.pos.y, P.pos.z].map(v => +v.toFixed(1));
    out.neighbor = G.triggers.length && G.triggers[0].done; out.collected = G.save.collect.slice();
    out.hasKey = G.have.includes('usb-chez-nous');
    use('corps'); out.corps = G.save.collect.includes('corps_cour');
    G.interactables.find(i => i.id === 'contact').use(); out.completed = G.completed;
    G.completed = false; const d0 = G.save.deaths; G.resetLevel(); out.afterReset = { pos: [P.pos.x, P.pos.y, P.pos.z], deaths: G.save.deaths - d0, hasKey: G.have.length, triggerRearmed: !G.triggers[0].done };
    return out;
  });
  console.log(JSON.stringify(r)); console.log('erreurs:', g.errors.length ? g.errors : 'aucune');
  const ok = r.reachedAll && r.neighbor && r.hasKey && r.completed && r.corps && r.afterReset.deaths === 1 && r.afterReset.triggerRearmed && !g.errors.length;
  console.log(ok ? 'CHAPITRE 1 : OK' : 'CHAPITRE 1 : ÉCHEC'); await g.close(); process.exit(ok ? 0 : 1);
})();
