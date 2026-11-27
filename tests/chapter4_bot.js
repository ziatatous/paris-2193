// Chapitre 4 : volant -> Roman apparaît -> vanne (grille ouverte) -> passage -> refermer la grille -> Roman revient par le conduit -> garage (porte) -> Léna -> fin.
const { launch } = require('./harness');
(async () => {
  const g = await launch({});
  const r = await g.eval(async () => {
    G.clearZone(); G.buildChapter(4); G.placeStart(); G.completed = false; G.frozen = false; G.ended = false;
    const P = G.P, out = {}, sleep = ms => new Promise(r => setTimeout(r, ms));
    const step = (n) => { for (let i = 0; i < n; i++) { G.updatePlayer(0.03); G.updateCops(0.03); for (const a of G.animated) a.update(0.03); G.updateTriggers(); } };
    const walk = (W, label) => { let wi = 0; G.keys = { KeyW: true, ShiftLeft: true }; for (let t = 0; t < 6000 && wi < W.length; t++) { const [tx, tz] = W[wi], dx = tx - P.pos.x, dz = tz - P.pos.z; P.yaw = Math.atan2(-dx, -dz); step(1); if (Math.hypot(dx, dz) < 0.6) wi++; } G.keys = {}; step(2); return wi >= W.length; };
    const snap = l => out.snaps = (out.snaps || []).concat([[l, +P.pos.x.toFixed(1), +P.pos.z.toFixed(1), +G.roman.x.toFixed(1), +G.roman.z.toFixed(1), G.roman.state, !!G.dead]]);
    const use = id => { const it = G.interactables.find(i => i.id === id); if (!it) return false; it.use(); if (G.docOpen) G.closeDoc(); return true; };
    out.start = [P.pos.x, P.pos.y, P.pos.z]; out.romanHidden = !G.roman.g.visible;
    out.toWheelRoom = walk([[8, 18.5], [15, 18.5], [18.5, 18.5], [18, 14], [18, 9], [18, 6]]);
    out.vanneBefore = (() => { use('vanne'); return !G.interactables.find(i => i.id === 'vanne').open; })();
    use('volant'); out.haveWheel = G.have.includes('volant'); await sleep(8600); step(10);
    snap('apresVolant'); out.romanActive = G.roman.g.visible && G.roman.state !== 'idle';
    out.toGate = walk([[18, 12], [18.5, 18.5], [26, 18.5], [33.5, 18.5]]);
    snap('auPortail'); use('vanne'); step(60); snap('ouvert'); out.gateOpened = !G.colliders.some(c => c.minX === 35 && c.maxX === 35.3 && c.maxY < 50 && c.minY < 50);
    out.pastGate = walk([[36, 18.6], [37.4, 18.6]]); out.pastGateX = +P.pos.x.toFixed(1); snap('passe');
    { const v = G.interactables.find(i => i.id === 'vanne'); out.vanneReachEast = Math.hypot(P.pos.x - v.pos.x, P.pos.z - v.pos.z) < v.radius; }          // la vanne doit être utilisable depuis l'est (vraie portée d'interaction)
    G.roman.x = 25; G.roman.z = 18.5;                                          // Roman est loin derrière : on peut refermer
    use('vanne'); step(100); out.gateClosed = G.colliders.some(c => c.minX === 35 && c.maxX === 35.3 && c.minY === 0);
    out.dbgBefore = { rx: +G.roman.x.toFixed(1), rz: +G.roman.z.toFixed(1), st: G.roman.state, px: +P.pos.x.toFixed(1), pz: +P.pos.z.toFixed(1), dead: G.dead, frozen: G.frozen, ep: G.epoch };
    await sleep(12600); step(10); out.dbgAfter = { rx: +G.roman.x.toFixed(1), rz: +G.roman.z.toFixed(1), st: G.roman.state, px: +P.pos.x.toFixed(1), pz: +P.pos.z.toFixed(1), dead: G.dead, ep: G.epoch }; out.romanAtVent = Math.hypot(G.roman.x - 36.5, G.roman.z - 9.6) < 8;
    G.roman.frozenLab = true;                                                   // le bot ne teste pas ici la poursuite
    out.toGarage = walk([[40, 18.5], [45, 18.5], [50, 18.5], [54, 18.5], [57.5, 18.5], [59, 20]]); step(30);
    out.safe = G.triggers.some(t => t.done); out.garageDoorShut = G.colliders.some(c => c.minX === 55 && c.maxX === 55.3 && c.minY === 0);
    use('fin_a'); out.blockedBeforeTalk = !G.ended; use('lena'); out.talk = true; use('fin_b'); out.endingB = G.ended;
    return out;
  });
  console.log(JSON.stringify(r)); console.log('erreurs:', g.errors.length ? g.errors : 'aucune');
  const ok = r.romanHidden && r.toWheelRoom && r.haveWheel && r.romanActive && r.toGate && r.gateOpened && r.pastGate && r.pastGateX > 36.5 && r.gateClosed && r.vanneReachEast && r.romanAtVent && r.toGarage && r.safe && r.garageDoorShut && r.blockedBeforeTalk && r.endingB && !g.errors.length;
  console.log(ok ? 'CHAPITRE 4 : OK' : 'CHAPITRE 4 : ÉCHEC'); await g.close(); process.exit(ok ? 0 : 1);
})();
