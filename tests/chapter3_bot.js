// Chapitre 3 : chaque passage du parcours est joué par un bot (saut de 4 m, barre + balancement de 6 m, échelle, saut avec dash de 6,5 m), puis terminal + sortie.
const { launch } = require('./harness');
(async () => {
  const g = await launch({});
  const r = await g.eval(async () => {
    G.clearZone(); G.buildChapter(3); G.placeStart(); G.completed = false; G.frozen = false;
    const P = G.P, out = {}; G.cops.length = 0; if (G.drone) G.drone.track = 0;
    const step = (n) => { for (let i = 0; i < n; i++) { G.updatePlayer(0.02); G.updateTriggers(); } };
    const tp = (x, y, z, yaw) => { P.pos.set(x, y, z); P.safe.copy(P.pos); P.yaw = yaw; P.pitch = 0; P.vx = P.vy = P.vz = 0; P.mode = 'move'; P.onGround = true; P.h = 1.75; G.keys = { KeyW: true, ShiftLeft: true }; step(2); };
    const E = -Math.PI / 2;                                                // yaw qui regarde vers +x
    const roofOf = () => (P.pos.x > -6 && P.pos.x < 6) ? 'R0' : (P.pos.x > 9.6 && P.pos.x < 20) ? 'R1' : (P.pos.x > 26 && P.pos.x < 36) ? 'R2' : (P.pos.x >= 36 && P.pos.x < 46) ? 'R3' : (P.pos.x > 52 && P.pos.x < 62.5) ? 'R4' : '-';
    const land = (maxSteps) => { for (let i = 0; i < (maxSteps || 200); i++) { step(1); if (P.onGround && i > 5) break; } step(5); };
    // 1) saut de 4 m : R0 -> R1
    tp(1.5, 9, 0, E); let jumped = false; for (let i = 0; i < 300; i++) { step(1); if (!jumped && P.pos.x >= 5.5) { jumped = true; G.keys.Space = true; step(13); G.keys.Space = false; } if (jumped && P.onGround && i > 40) break; } step(3);
    out.jump1 = { roof: roofOf(), y: +P.pos.y.toFixed(2), x: +P.pos.x.toFixed(2) };
    // 2) barre : R1 -> R2
    tp(16.5, 9, 0, E); jumped = false; let swung = false;
    for (let i = 0; i < 400; i++) {
      step(1);
      if (!jumped && P.pos.x >= 19.2) { jumped = true; G.keys.Space = true; step(11); G.keys.Space = false; step(1); continue; }
      if (jumped && !swung && P.mode !== 'swing' && !P.onGround && P.pos.y > 9.4) { G.keys.Space = true; step(1); G.keys.Space = false; }
      if (P.mode === 'swing') { swung = true; const S = P.swing; G.keys.KeyW = true; if (S.th > 0.55 && S.av > 1.0) { G.keys.Space = true; step(1); G.keys.Space = false; } }
      if (swung && P.mode !== 'swing' && P.onGround) break;
      if (P.pos.y < 5) break;
    }
    step(3); out.bar = { swung, roof: roofOf(), y: +P.pos.y.toFixed(2), x: +P.pos.x.toFixed(2) };
    // 3) échelle : R2 -> R3
    tp(35.3, 9, 0, E); G.keys = {}; step(2); G.keys.KeyE = true; step(1); G.keys.KeyE = false; out.onLadder = P.mode === 'ladder'; G.keys.KeyW = true;
    for (let i = 0; i < 400 && P.mode === 'ladder'; i++) step(1); G.keys.KeyW = false; step(10); out.ladder = { roof: roofOf(), y: +P.pos.y.toFixed(2), x: +P.pos.x.toFixed(2) };
    // 4) grand saut avec dash : R3 -> R4 (6,5 m)
    tp(42.0, 15, 0, E); jumped = false; let dashed = false;
    for (let i = 0; i < 400; i++) {
      step(1);
      if (!jumped && P.pos.x >= 45.3) { jumped = true; G.keys.Space = true; step(13); G.keys.Space = false; }
      if (jumped && !dashed && !P.onGround && P.vy < 0.5) { dashed = true; G.keys.KeyF = true; step(1); G.keys.KeyF = false; }
      if (jumped && P.onGround && i > 40) break; if (P.pos.y < 8) break;
    }
    step(3); out.dashJump = { dashed, roof: roofOf(), y: +P.pos.y.toFixed(2), x: +P.pos.x.toFixed(2) };
    // 5) terminal puis sortie
    G.keys = {}; const use = id => { const it = G.interactables.find(i => i.id === id); it.use(); if (G.docOpen) G.closeDoc(); };
    use('sortie'); out.blockedBeforeRead = !G.completed; use('terminal'); out.read = G.save.collect.includes('registre'); use('sortie'); out.completed = G.completed;
    return out;
  });
  console.log(JSON.stringify(r)); console.log('erreurs:', g.errors.length ? g.errors : 'aucune');
  const ok = r.jump1.roof === 'R1' && Math.abs(r.jump1.y - 9) < 0.2 && r.bar.swung && r.bar.roof === 'R2' && Math.abs(r.bar.y - 9) < 0.2 && r.onLadder && r.ladder.roof === 'R3' && r.ladder.y > 14.8 && r.dashJump.roof === 'R4' && Math.abs(r.dashJump.y - 15) < 0.2 && r.blockedBeforeRead && r.read && r.completed && !g.errors.length;
  console.log(ok ? 'CHAPITRE 3 : OK' : 'CHAPITRE 3 : ÉCHEC'); await g.close(); process.exit(ok ? 0 : 1);
})();
