// Simulation des policiers sans joueur visible : 5 min de patrouille, puis une poursuite. Cherche : téléportations, coincements, murs traversés.
const { launch } = require('./harness');
(async () => {
  const g = await launch({});
  const r = await g.eval(() => {
    const P = G.P, out = { patrol: [], chase: null }; G.frozen = true;
    P.pos.set(8.4, 12, 25.4);                                    // joueur hors de vue (appartement)
    const st = G.cops.map(c => ({ c, lx: c.x, lz: c.z, max: 0, idle: 0, maxIdle: 0, inWall: 0, jumps: 0 }));
    const dt = 0.05;
    for (let t = 0; t < 300 / dt; t++) {
      G.updateCops(dt);
      for (const s of st) {
        const step = Math.hypot(s.c.x - s.lx, s.c.z - s.lz); s.max = Math.max(s.max, step); if (step > 0.6) s.jumps++;
        s.idle = step < 0.001 ? s.idle + dt : 0; s.maxIdle = Math.max(s.maxIdle, s.idle);
        if (G.blocked(s.c.x, s.c.z, 0.1, 1.7, 0.2)) s.inWall++;
        s.lx = s.c.x; s.lz = s.c.z;
      }
    }
    out.patrol = st.map(s => ({ max: +s.max.toFixed(2), jumps: s.jumps, maxIdle: +s.maxIdle.toFixed(1), inWall: s.inWall, at: [+s.c.x.toFixed(1), +s.c.z.toFixed(1)] }));
    // poursuite : le joueur apparaît dans la cour, visible
    G.resetCops(); const c = G.cops[0]; P.pos.set(c.x + 6, 0, c.z); P.safe.copy(P.pos); G.frozen = false; G.keys = {};
    let s2 = { lx: c.x, lz: c.z, max: 0, inWall: 0, arrested: false, t: 0 };
    for (let t = 0; t < 40 / dt && !G.arrest; t++) { G.updatePlayer(dt); G.updateCops(dt); const step = Math.hypot(c.x - s2.lx, c.z - s2.lz); s2.max = Math.max(s2.max, step); if (G.blocked(c.x, c.z, 0.1, 1.7, 0.2)) s2.inWall++; s2.lx = c.x; s2.lz = c.z; s2.t = t * dt; }
    s2.arrested = !!G.arrest; s2.state = c.state; out.chase = s2; return out;
  });
  console.log(JSON.stringify(r, null, 1)); console.log('erreurs:', g.errors.length ? g.errors : 'aucune');
  await g.close();
})();
