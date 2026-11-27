// Enchaînement réel : fin du chapitre 1 -> chargement du chapitre 2 (déchargement du 1) -> état cohérent (cops, collisions, joueur).
const { launch } = require('./harness');
(async () => {
  const g = await launch({});
  const r = await g.eval(async () => {
    const out = { before: { cops: G.cops.length, colliders: G.colliders.length, lamps: G.lamps.length, children: G.scene.children.length } };
    G.have.push('usb-chez-nous'); G.completeChapter(1);
    await new Promise(r => setTimeout(r, 4500));
    out.after = { chapter: G.currentChapter, saved: G.save.chapter, cops: G.cops.length, colliders: G.colliders.length, lamps: G.lamps.length, children: G.scene.children.length, frozen: G.frozen, pos: [G.P.pos.x, G.P.pos.y, G.P.pos.z].map(v => +v.toFixed(1)), have: G.have.slice() };
    for (let i = 0; i < 120; i++) { G.updatePlayer(0.03); G.updateCops(0.03); }
    out.stillOnGround = Math.abs(G.P.pos.y) < 0.2; return out;
  });
  console.log(JSON.stringify(r)); console.log('erreurs:', g.errors.length ? g.errors : 'aucune');
  const ok = r.after.chapter === 2 && r.after.cops === 3 && !r.after.frozen && r.stillOnGround && r.after.pos[0] < 10 && !g.errors.length;
  console.log(ok ? 'ENCHAÎNEMENT : OK' : 'ENCHAÎNEMENT : ÉCHEC'); await g.close(); process.exit(ok ? 0 : 1);
})();
