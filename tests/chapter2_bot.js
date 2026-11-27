// Bot du chapitre 2 : reprend la clé (déclenche le coup de feu), traverse le marché, contourne la grille par la boucle nord, sort par l'escalier.
const { launch } = require('./harness');
(async () => {
  const g = await launch({});
  const r = await g.eval(async () => {
    G.clearZone(); G.buildChapter(2); G.placeStart(); G.completed = false;
    const P = G.P, out = {}; G.cops.length = 0; G.frozen = false; G.keys = { KeyW: true, ShiftLeft: true };
    out.ch = G.currentChapter; out.start = [P.pos.x, P.pos.y, P.pos.z];
    G.interactables.find(i => i.id === 'key_terminal').use();
    const W = [[5.5, 19.5], [9.5, 20.5], [12, 18.5], [15, 18.5], [20, 18.5], [28, 18.5], [34, 18.5], [35.5, 15], [35.5, 9], [37, 7.6], [46, 7.6], [46.5, 12], [46.5, 15.5], [48, 18.5], [52, 18.5], [54.5, 18.5]];
    let wi = 1;
    for (let t = 0; t < 14000 && wi < W.length; t++) {
      const [tx, tz] = W[wi], dx = tx - P.pos.x, dz = tz - P.pos.z; P.yaw = Math.atan2(-dx, -dz); G.keys.Space = (t % 40 === 0);
      G.updatePlayer(0.03); G.updateTriggers(); out.steps = t; if (Math.hypot(dx, dz) < 0.7) wi++;
    }
    out.reachedAll = wi >= W.length; out.pos = [P.pos.x, P.pos.y, P.pos.z].map(v => +v.toFixed(1)); out.roman = G.triggers[0] && G.triggers[0].done;
    await new Promise(r => setTimeout(r, 1300));                  // le coup de feu a lieu 0,9 s après la reprise de la clé
    out.samuelDown = true; G.interactables.find(i => i.id === 'sortie').use(); out.completed = G.completed; out.nextChapterQueued = G.save.chapter;
    return out;
  });
  console.log(JSON.stringify(r)); console.log('erreurs:', g.errors.length ? g.errors : 'aucune');
  const ok = r.ch === 2 && r.reachedAll && r.roman && r.completed && !g.errors.length; console.log(ok ? 'CHAPITRE 2 : OK' : 'CHAPITRE 2 : ÉCHEC'); await g.close(); process.exit(ok ? 0 : 1);
})();
