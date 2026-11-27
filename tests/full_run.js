// PARTIE COMPLÈTE : du menu à la fin, chapitres enchaînés par les vraies transitions (fin de chapitre -> chargement du suivant), puis une fin.
const { launch } = require('./harness');
(async () => {
  const g = await launch({});
  const STOP = process.env.STOP_AFTER_2 === '1';
  const r = await g.eval(async (process_stop) => {
    const P = G.P, out = { chapters: [] }, sleep = ms => new Promise(r => setTimeout(r, ms));
    const step = n => { for (let i = 0; i < n; i++) { G.updatePlayer(0.03); G.updateCops(0.03); for (const a of G.animated) a.update(0.03); G.updateTriggers(); } };
    const walk = W => { let wi = 0; G.keys = { KeyW: true, ShiftLeft: true }; for (let t = 0; t < 9000 && wi < W.length; t++) { const [tx, tz] = W[wi], dx = tx - P.pos.x, dz = tz - P.pos.z; P.yaw = Math.atan2(-dx, -dz); if (G.currentChapter !== 4) G.keys.Space = (t % 50 === 0); step(1); if (Math.hypot(dx, dz) < 0.65) wi++; } G.keys = {}; step(2); walk.last = { wi, of: W.length, x: +P.pos.x.toFixed(1), z: +P.pos.z.toFixed(1), mode: P.mode, hidden: !!G.hidden, stun: +(P.stunT || 0).toFixed(2) }; return wi >= W.length; };
    const use = id => { const it = G.interactables.find(i => i.id === id); if (!it) return false; it.use(); if (G.docOpen) G.closeDoc(); return true; };
    const waitChapter = async n => { for (let i = 0; i < 80 && G.currentChapter !== n; i++) await sleep(100); await sleep(1500); G.cops.length = 0; return G.currentChapter === n && !G.frozen; };
    const E = -Math.PI / 2;
    // ---- chapitre 1
    G.cops.length = 0; use('usb'); use('mila');
    out.c1 = walk([[7.9, 23.5], [6.0, 23.5], [6.0, 26.2], [6.0, 28.5], [4.1, 28.5], [4.1, 25.5], [5.0, 24.0], [6.0, 26.2], [6.0, 28.5], [4.1, 28.5], [4.1, 25.5], [5.0, 24.0], [6.0, 26.2], [6.0, 28.5], [4.1, 28.5], [4.1, 25.5], [5.0, 24.0], [6.0, 26.2], [6.0, 28.5], [4.1, 28.5], [4.1, 25.5], [5.5, 24.0], [8.0, 24.0], [8.0, 21.0], [11, 18.5], [13, 18.5], [21, 18.5], [21.5, 15], [21.5, 9.2], [24, 8.7], [28, 8.6], [33, 8.8], [36, 9.2], [38.5, 12], [39, 17], [40, 19.8], [52, 19.8], [60, 19.6]]);
    use('contact'); out.chapters.push(await waitChapter(2));
    // ---- chapitre 2
    use('key_terminal'); await sleep(1300);
    out.c2 = walk([[9.5, 20.5], [12, 18.5], [15, 18.5], [20, 18.5], [28, 18.5], [34, 18.5], [35.5, 15], [35.5, 9], [37, 7.6], [46, 7.6], [46.5, 12], [46.5, 15.5], [48, 18.5], [52, 18.5], [54.5, 18.5]]);
    out.c2info = walk.last; if (process_stop) return out;
    use('sortie'); out.chapters.push(await waitChapter(3));
    // ---- chapitre 3
    const tp = (x, y, z) => { P.pos.set(x, y, z); P.safe.copy(P.pos); P.yaw = E; P.pitch = 0; P.vx = P.vy = P.vz = 0; P.mode = 'move'; P.onGround = true; G.keys = { KeyW: true, ShiftLeft: true }; step(2); };
    let jumped = false; tp(1.5, 9, 0); for (let i = 0; i < 300; i++) { step(1); if (!jumped && P.pos.x >= 5.5) { jumped = true; G.keys.Space = true; step(13); G.keys.Space = false; } if (jumped && P.onGround && i > 40) break; } out.c3a = P.pos.x > 9.6 && Math.abs(P.pos.y - 9) < 0.2;
    tp(16.5, 9, 0); jumped = false; let swung = false; for (let i = 0; i < 400; i++) { step(1); if (!jumped && P.pos.x >= 19.2) { jumped = true; G.keys.Space = true; step(11); G.keys.Space = false; step(1); continue; } if (jumped && !swung && P.mode !== 'swing' && !P.onGround && P.pos.y > 9.4) { G.keys.Space = true; step(1); G.keys.Space = false; } if (P.mode === 'swing') { swung = true; const S = P.swing; G.keys.KeyW = true; if (S.th > 0.55 && S.av > 1.0) { G.keys.Space = true; step(1); G.keys.Space = false; } } if (swung && P.mode !== 'swing' && P.onGround) break; if (P.pos.y < 5) break; } step(3); out.c3b = swung && P.pos.x > 26 && Math.abs(P.pos.y - 9) < 0.2;
    tp(35.3, 9, 0); G.keys = {}; step(2); G.keys.KeyE = true; step(1); G.keys.KeyE = false; G.keys.KeyW = true; for (let i = 0; i < 400 && P.mode === 'ladder'; i++) step(1); G.keys.KeyW = false; step(10); out.c3c = P.pos.x >= 36 && P.pos.y > 14.8;
    tp(42.0, 15, 0); jumped = false; let dashed = false; for (let i = 0; i < 400; i++) { step(1); if (!jumped && P.pos.x >= 45.3) { jumped = true; G.keys.Space = true; step(13); G.keys.Space = false; } if (jumped && !dashed && !P.onGround && P.vy < 0.5) { dashed = true; G.keys.KeyF = true; step(1); G.keys.KeyF = false; } if (jumped && P.onGround && i > 40) break; if (P.pos.y < 8) break; } step(3); out.c3d = P.pos.x > 52 && Math.abs(P.pos.y - 15) < 0.2;
    G.keys = {}; use('terminal'); use('sortie'); out.chapters.push(await waitChapter(4));
    // ---- chapitre 4
    out.c4a = walk([[8, 18.5], [15, 18.5], [18.5, 18.5], [18, 14], [18, 9], [18, 6]]); use('volant'); await sleep(8600); step(10);
    out.c4b = walk([[18, 12], [18.5, 18.5], [26, 18.5], [33.5, 18.5]]); use('vanne'); step(60); out.c4c = walk([[36, 18.6], [37.4, 18.6]]); G.roman.x = 25; G.roman.z = 18.5; use('vanne'); step(100);
    await sleep(12600); step(10); G.roman.frozenLab = true;
    out.c4d = walk([[40, 18.5], [45, 18.5], [50, 18.5], [54, 18.5], [57.5, 18.5], [59, 20]]); step(30); use('lena'); use('fin_a'); out.ended = G.ended; out.deaths = G.save.deaths; out.collected = G.save.collect.length;
    return out;
  }, STOP);
  console.log(JSON.stringify(r)); console.log('erreurs:', g.errors.length ? g.errors : 'aucune');
  const ok = r.c1 && r.chapters.every(Boolean) && r.chapters.length === 3 && r.c2 && r.c3a && r.c3b && r.c3c && r.c3d && r.c4a && r.c4b && r.c4c && r.c4d && r.ended && !g.errors.length;
  console.log(ok ? 'PARTIE COMPLÈTE : OK' : 'PARTIE COMPLÈTE : ÉCHEC'); await g.close(); process.exit(ok ? 0 : 1);
})();
