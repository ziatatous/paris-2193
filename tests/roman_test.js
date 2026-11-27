// Équité de Roman : plus rapide que la marche (on doit se méfier), plus lent que la course (on peut lui échapper).
const { launch } = require('./harness');
(async () => {
  const g = await launch({});
  const r = await g.eval(() => {
    G.clearZone(); G.buildChapter(4); G.placeStart(); G.frozen = false; const P = G.P, rc = G.roman, out = {};
    // ouvre la grille pour avoir un long couloir
    G.interactables.find(i => i.id === 'volant').use(); G.interactables.find(i => i.id === 'vanne').use(); for (const a of G.animated) a.update(2); 
    const run = (sprint, seconds) => {
      G.resetCops(); rc.frozenLab = false; rc.g.visible = true; rc.x = 22; rc.z = 18.5; rc.state = 'chase'; rc.alert = 1; rc.lostT = 0; P.pos.set(32, 0, 18.5); P.safe.copy(P.pos); P.yaw = -Math.PI / 2; P.vx = P.vz = 0; P.mode = 'move';
      const d0 = Math.hypot(P.pos.x - rc.x, P.pos.z - rc.z); let dmin = d0, caught = false;
      for (let t = 0; t < seconds / 0.03; t++) { G.keys = { KeyW: true, ShiftLeft: sprint }; G.updatePlayer(0.03); rc.last = [P.pos.x, P.pos.z]; rc.state = 'chase'; G.updateCops(0.03); const d = Math.hypot(P.pos.x - rc.x, P.pos.z - rc.z); dmin = Math.min(dmin, d); if (G.dead || G.arrest) { caught = true; break; } if (P.pos.x > 45) break; }
      return { d0: +d0.toFixed(1), end: +Math.hypot(P.pos.x - rc.x, P.pos.z - rc.z).toFixed(1), dmin: +dmin.toFixed(1), caught, px: +P.pos.x.toFixed(1) };
    };
    out.walk = (() => { G.dead = false; return run(false, 14); })(); out.sprint = (() => { G.dead = false; G.frozen = false; return run(true, 8); })();
    return out;
  });
  console.log(JSON.stringify(r)); console.log('erreurs:', g.errors.length ? g.errors : 'aucune');
  const ok = r.sprint.end > r.sprint.d0 && !r.sprint.caught && r.walk.end < r.walk.d0 && !g.errors.length;
  console.log(ok ? 'ROMAN : OK' : 'ROMAN : ÉCHEC'); await g.close(); process.exit(ok ? 0 : 1);
})();
