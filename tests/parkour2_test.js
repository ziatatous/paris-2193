// Barres (balancement, lâcher avec élan) et échelles (monter, arriver sur le toit) dans le labo (sol plat).
const { launch } = require('./harness');
(async () => {
  const g = await launch({ mode: 'lab' });
  const r = await g.eval(async () => {
    const out = {}, P = G.P; G.cops.length = 0; G.frozen = false;
    const step = (n, dt) => { for (let i = 0; i < n; i++) G.updatePlayer(dt || 0.02); };
    // --- barre : axe x à y=3.0, en z=0 ---
    G.addBar('x', 0, 0, 4, 3.0);
    P.pos.set(0, 0, 0.9); P.safe.copy(P.pos); P.yaw = 0; P.vx = P.vy = P.vz = 0; G.keys = {};
    G.keys.KeyW = true; G.keys.Space = true; step(12); G.keys.Space = false; step(2);      // saut tenu (saut variable) puis relâché
    let grabbed = false;
    for (let i = 0; i < 40 && !grabbed; i++) { if (P.pos.y > 0.7 && !P.onGround) { G.keys.Space = true; step(1); G.keys.Space = false; } else step(1); grabbed = P.mode === 'swing'; }
    out.grabbed = grabbed; if (!grabbed) { out.pos = [P.pos.x, P.pos.y, P.pos.z]; return out; }
    let maxZ = -9, minZ = 9; for (let i = 0; i < 150; i++) { G.keys.KeyW = (i % 100) < 50; G.keys.KeyS = !G.keys.KeyW; step(1); maxZ = Math.max(maxZ, P.pos.z); minZ = Math.min(minZ, P.pos.z); } out.swingRange = +(maxZ - minZ).toFixed(2); out.stillSwinging = P.mode === 'swing';
    // lâcher quand on part vers -z
    for (let i = 0; i < 200 && !(P.swing && P.swing.av < -1.2); i++) step(1);
    const z0 = P.pos.z; G.keys.Space = true; step(1); G.keys.Space = false; G.keys.KeyW = G.keys.KeyS = false;
    let land = false; for (let i = 0; i < 400 && !land; i++) { step(1); land = P.onGround && P.pos.y < 0.05; } out.released = P.mode !== 'swing'; out.flew = +(z0 - P.pos.z).toFixed(2); out.landed = land;
    // --- échelle ---
    G.B(3.4, 5.0, 2.7, 3.0, -3.5, -0.5, G.mat.concreteDark, { grime: false }); G.addLadder(5.0, -2, 0, 3, 1, 0);
    P.pos.set(5.7, 0, -2); P.safe.copy(P.pos); P.mode = 'move'; P.vx = P.vy = P.vz = 0; G.keys = {}; step(2);
    out.prompt = G.ladderPrompt(P); G.keys.KeyE = true; step(1); G.keys.KeyE = false; out.onLadder = P.mode === 'ladder';
    G.keys.KeyW = true; for (let i = 0; i < 300 && P.mode === 'ladder'; i++) step(1); G.keys.KeyW = false; step(10);
    out.top = { y: +P.pos.y.toFixed(2), x: +P.pos.x.toFixed(2), mode: P.mode, onGround: P.onGround };
    return out;
  });
  console.log(JSON.stringify(r)); console.log('erreurs:', g.errors.length ? g.errors : 'aucune');
  const ok = r.grabbed && r.swingRange > 1.2 && r.released && r.flew > 1.2 && r.landed && r.prompt && r.onLadder && r.top.y > 2.9 && r.top.mode === 'move' && !g.errors.length;
  console.log(ok ? 'PARKOUR 2 : OK' : 'PARKOUR 2 : ÉCHEC'); await g.close(); process.exit(ok ? 0 : 1);
})();
