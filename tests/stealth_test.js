// Furtivité du chapitre 2 : un bot suit le parcours (accroupi, puis en courant) avec les policiers ACTIFS ; on mesure alerte maximale, arrestations, temps.
const { launch } = require('./harness');
(async () => {
  const g = await launch({});
  const r = await g.eval(async () => {
    const out = {}; const W = [[9.5, 20.5], [12, 18.5], [15, 18.5], [20, 18.5], [28, 18.5], [34, 18.5], [35.5, 15], [35.5, 9], [37, 7.6], [46, 7.6], [46.5, 12], [46.5, 15.5], [48, 18.5], [52, 18.5], [54.5, 18.5]];
    const trial = (mode, startDelay) => {
      G.clearZone(); G.buildChapter(2); G.placeStart(); G.completed = false; G.frozen = false; G.arrest = null; G.dead = false; const P = G.P;
      G.interactables.find(i => i.id === 'key_terminal').use(); for (const a of G.animated) a.update(0.05);
      for (let i = 0; i < startDelay / 0.05; i++) { for (const a of G.animated) a.update(0.05); G.updateCops(0.05); }
      let wi = 0, t = 0, maxAlert = 0, arrested = false, chase = 0, waited = 0, hideT = 0, hideCD = 0, hides = 0, goingHide = null;
      for (; t < 900 && wi < W.length; t += 0.05) {
        const [tx, tz] = W[wi], dx = tx - P.pos.x, dz = tz - P.pos.z; P.yaw = Math.atan2(-dx, -dz); G.keys = { KeyW: true }; if (mode === 'sprint') G.keys.ShiftLeft = true; if (mode === 'crouch') G.keys.KeyC = true;
        if (mode === 'careful') { G.keys.KeyC = true; if (G.alert > 0.2) { G.keys.KeyW = false; waited += 0.05; } }
        if (mode === 'hider') {
          if (G.hidden) {                                                       // caché : on attend que les policiers s'éloignent (ou 10 s), puis on sort
            hideT += 0.05; const far = G.cops.every(c => Math.hypot(c.x - P.pos.x, c.z - P.pos.z) > 13 || c.state === 'idle' && Math.hypot(c.x - P.pos.x, c.z - P.pos.z) > 9);
            G.keys = {}; if (hideT > 10 || (hideT > 3 && far)) { G.hidden.exit(); hideT = 0; hideCD = 6; hides++; } 
          } else {
            hideCD -= 0.05; let near = null, nd = 1e9; for (const c of G.cops) { const d = Math.hypot(c.x - P.pos.x, c.z - P.pos.z); if (d < nd) { nd = d; near = c; } }
            const danger = near && nd < 13 && hideCD <= 0 && (G.alert > 0.05 || G.los(near.x, 1.7, near.z, P.pos.x, 1.0, P.pos.z));
            if (danger || goingHide) {
              if (!goingHide) { let best = null, bd = 1e9; for (const h of G.hides) { const d = Math.hypot(h.outPos[0] - P.pos.x, h.outPos[1] - P.pos.z); if (d < bd && d < 14) { bd = d; best = h; } } goingHide = best; }
              if (goingHide) { const h = goingHide, hx = h.outPos[0] - P.pos.x, hz = h.outPos[1] - P.pos.z; P.yaw = Math.atan2(-hx, -hz); G.keys.ShiftLeft = true; G.keys.KeyC = false; if (Math.hypot(hx, hz) < 1.0) { P.pos.set(h.outPos[0], P.pos.y, h.outPos[1]); h.item.use(); goingHide = null; hideT = 0; } }
            } else G.keys.KeyC = true;
          }
        }
        if (mode === 'evasive') {                                  // s'écarte de tout policier proche, avance sinon
          G.keys.KeyC = true; let near = null, nd = 1e9; for (const c of G.cops) { const d = Math.hypot(c.x - P.pos.x, c.z - P.pos.z); if (d < nd) { nd = d; near = c; } }
          if (near && nd < 8) { const ax = P.pos.x - near.x, az = P.pos.z - near.z, w = Math.min(1, nd / 8), rx = dx / (Math.hypot(dx, dz) || 1), rz = dz / (Math.hypot(dx, dz) || 1), vx = rx * w + ax / nd * (1 - w) * 1.6, vz = rz * w + az / nd * (1 - w) * 1.6; P.yaw = Math.atan2(-vx, -vz); waited += 0.05; }
        } G.keys.Space = (Math.floor(t / 0.05) % 60 === 0);
        if (!G.hidden) G.updatePlayer(0.05); for (const a of G.animated) a.update(0.05); G.updateCops(0.05); G.updateTriggers(); maxAlert = Math.max(maxAlert, G.alert); if (G.cops.some(c => c.state === 'chase')) chase += 0.05;
        if (G.arrest) { arrested = true; break; } if (Math.hypot(dx, dz) < 0.7) wi++;
      }
      return { mode, delay: startDelay, done: wi >= W.length, arrested, time: +t.toFixed(0), maxAlert: +maxAlert.toFixed(2), chaseSecs: +chase.toFixed(1), wi, waited: +waited.toFixed(0), hides };
    };
    out.runs = []; for (const d of [0, 4, 8, 12, 16, 20]) { out.runs.push(trial('hider', d)); }
    return out;
  });
  for (const x of r.runs) console.log(JSON.stringify(x));
  console.log('erreurs:', g.errors.length ? g.errors : 'aucune'); await g.close();
})();
