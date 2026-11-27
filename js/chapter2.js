/* =====================================================================
   chapter2.js : CHAPITRE 2 « LE MARCHÉ » (furtivité). Plan 1 caractère = 1 m (x = colonne, z = ligne) ; murs générés par G.genWalls.
   Scénario : Samuel (le contact) lit la clé sur un terminal, comprend, la rend à Dima, est abattu ; il faut traverser le marché sous 3 patrouilles ;
   une grille ferme la rue : détour par la boucle nord, où Roman apparaît au loin ; sortie par l'escalier de l'est.
   ===================================================================== */
(function () {
  'use strict';
  const G = window.G, T = G.T, L = () => G.L, M = () => G.mat;
  const MAP = [
    '################################################################',
    '################################################################',
    '################################################################',
    '################################################################',
    '#########################################..#####################',
    '#########################################..#####################',
    '#########################################..#####################',
    '###################################.............################',
    '###################################.............################',
    '####################..#############..#########..################',
    '####################..#############..#########..################',
    '####################..#############..#########..################',
    '####################..#############..#########..################',
    '####################..#############..#########..################',
    '####################..#############..#########..################',
    '####################..#############..#########..################',
    '##############..........................G..........#############',
    '####.......###..........................G...............########',
    '####....................................G...............########',
    '####....................................G...............########',
    '####.......###..........................G...............########',
    '####.......###..........................G..........#############',
    '############################..##################################',
    '############################..##################################',
    '############################..##################################',
    '############################..##################################',
    '############################..##################################',
    '############################..##################################',
    '################################################################',
    '################################################################',
    '################################################################',
    '################################################################',
    '################################################################',
    '################################################################',
    '################################################################',
    '################################################################'
  ];
  const START = [5.5, 0, 19.5, -Math.PI / 2];
  const say = (t, d) => G.say(t, d || 3500);
  const fx = (n, v) => { const f = G.audio && G.audio.fx; if (f) f(n, v == null ? 1 : v); };

  // Étal du marché : table, deux poteaux, bâche penchée, quelques marchandises. Seule la table est solide (couverture basse).
  function stall(x, z, ry, tarpHex) {
    const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = ry; G.scene.add(g);
    const wood = L().ph(0x2e271d, 3), tarp = L().ph(tarpHex || 0x3a4038, 2), iron = M().iron;
    const t = new T.Mesh(new T.BoxGeometry(2.0, 0.8, 0.8), wood); t.position.set(0, 0.4, 0); g.add(t);
    for (const px of [-0.95, 0.95]) { const p = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 2.3, 6), iron); p.position.set(px, 1.15, -0.35); g.add(p); }
    const roof = new T.Mesh(new T.BoxGeometry(2.3, 0.04, 1.3), tarp); roof.position.set(0, 2.25, -0.1); roof.rotation.x = 0.18; g.add(roof);
    const flap = new T.Mesh(new T.BoxGeometry(2.3, 0.4, 0.03), tarp); flap.position.set(0, 2.05, 0.5); g.add(flap);
    for (let i = 0; i < 6; i++) { const s = 0.1 + G.rnd() * 0.12, b = new T.Mesh(new T.BoxGeometry(s, s * 0.8, s), L().ph([0x4a4034, 0x2c3a3a, 0x403028][i % 3], 3)); b.position.set(-0.8 + i * 0.32, 0.8 + s * 0.4, 0.05); b.rotation.y = G.rnd() * 3; g.add(b); }
    G.addOBBCollider(x, z, 2.0, 0.8, ry, 0, 0.8);
  }
  function roman() {                                                       // silhouette de Roman : grand, voûté, masque de corbeau (bec), cagoule, batte
    const g = G.makeCop(); g.scale.setScalar(1.12);
    const rig = g.userData.rig, black = L().ph(0x050606, 6), beak = new T.Mesh(new T.ConeGeometry(0.05, 0.22, 8), black); beak.rotation.x = Math.PI / 2; beak.position.set(0, -0.02, 0.2); rig.head.add(beak);
    const hood = new T.Mesh(new T.SphereGeometry(0.125, 10, 8), black); hood.position.set(0, 0.03, -0.01); hood.scale.set(1, 1.05, 1.05); rig.head.add(hood);
    const bat = new T.Mesh(new T.CylinderGeometry(0.035, 0.05, 0.9, 7), L().ph(0x1c1410, 4)); bat.position.set(0, -0.45, 0.1); bat.rotation.x = 0.4; rig.el1.add(bat);
    rig.beam.visible = false; g.traverse(o => { if (o.isSprite) o.visible = false; }); g.userData.roman = true; return g;
  }
  G.makeRoman = roman;

  G.buildChapter2 = function () {
    G.have = ['usb-chez-nous']; G.objective = G.chapterObjective = 'Reprends la clé sur le terminal. Puis traverse le marché sans te faire voir.';
    G.isPlayable = null; G.zoneAt = () => 'out'; G.startPos = START;
    G.beginBatch();
    G.B(-4, 72, -1, 0, -4, 44, M().asphalt, { tile: 3, grime: false });
    G.genWalls(MAP, { free: '.=', skip: () => false, dirt: 0.55,
      special: (axis, c, a0, a1) => (axis === 'x' && c === 56 && a0 <= 17 && a1 >= 20) ? [{ type: 'door', a: 19 - a0, w: 1.3, h: 2.5 }] : null });   // porte de l'escalier est
    // Grille fermée en travers de la rue (colonne 40) : barreaux
    for (let z = 16.05; z < 22; z += 0.22) G.B(40.0, 40.06, 0, 3.0, z, z + 0.05, M().iron, { collide: false, grime: false });
    G.B(40.0, 40.08, 2.9, 3.0, 16, 22, M().iron, { collide: false, grime: false }); G.B(40.0, 40.08, 0.9, 0.98, 16, 22, M().iron, { collide: false, grime: false });
    // ---- Étals (alternés : le passage serpente, 2 à 3 m utiles) ----
    for (const [x, z, ry, col] of [[17, 16.7, 0, 0x3a4038], [23, 16.7, 0, 0x4a3a30], [29, 16.7, 0, 0x2e3a42], [32.4, 16.7, 0, 0x3a4038], [20, 20.3, Math.PI, 0x4a3a30], [26, 20.3, Math.PI, 0x3a4038], [32, 20.3, Math.PI, 0x2e3a42], [37.5, 20.3, Math.PI, 0x4a3a30],
      [44, 16.7, 0, 0x3a4038], [47.5, 20.3, Math.PI, 0x4a3a30]]) stall(x, z, ry, col);
    G.L.crate(24.5, 18.4, 1.0, 0.9, 0.3); G.L.crate(25.6, 18.6, 0.9, 0.9, 0.1); G.L.crate(33, 18.5, 1.0, 0.9, 0.2); G.L.crate(15.5, 18.5, 1.0, 0.9, 0); G.L.crate(43, 18.6, 1.0, 0.9, 0.3); G.L.crate(36.5, 12, 1.0, 0.9, 0.1);
    G.L.barrel(14.5, 16.5); G.L.barrel(14.5, 20.6); G.L.barrel(49.5, 16.6);
    // ---- Cachettes (E) ----
    G.L.makeHide({ type: 'dumpster', x: 21.0, z: 9.55, front: [0, 1] });                 // cul-de-sac nord
    G.L.makeHide({ type: 'locker', x: 28.9, z: 27.6, front: [0, -1] });                 // cul-de-sac sud
    G.L.makeHide({ type: 'tarp', x: 30.0, z: 20.3, front: [0, -1] });                    // sous une bâche (entre deux étals)
    G.L.makeHide({ type: 'locker', x: 42.0, z: 4.55, front: [0, 1] });                   // alcôve de la boucle nord
    // ---- Lumières ----
    G.L.lamp(18, 3.0, 18.5, { flicker: 0.5, I: 0.8 }); G.L.lamp(26, 3.0, 18.5, { I: 0.7 }); G.L.lamp(34, 3.0, 18.5, { broken: true }); G.L.lamp(44, 3.0, 18.5, { flicker: 0.3, I: 0.8 });
    G.L.lamp(36, 3.2, 11, { flicker: 0.7, I: 0.7 }); G.L.lamp(46.5, 3.2, 12, { broken: true }); G.L.lamp(53.5, 3.0, 17.1, { color: 0xffc070, I: 0.8, dist: 9, halo: 2 }); G.L.lamp(7, 3.0, 17.1, { color: 0xb8e0c0, I: 0.7 });
    G.L.fireBarrel(23.5, 20.4); G.L.fireBarrel(45, 17.4);
    G.L.clutter([{ x0: 14.2, x1: 39.8, z0: 16.2, z1: 21.8, n: 55 }, { x0: 41.2, x1: 50.8, z0: 16.2, z1: 21.8, n: 25 }, { x0: 35.2, x1: 47, z0: 7.2, z1: 8.8, n: 14 }, { x0: 4.4, x1: 10.6, z0: 17.2, z1: 21.8, n: 14 }]);
    G.L.flushDecals();
    G.endBatch();

    // ---- Scène d'ouverture : Samuel lit la clé sur un terminal ; la clé est reprise -> coup de feu ----
    const term = new T.Group(); term.position.set(9.4, 0, 17.9); G.scene.add(term);
    const tb = new T.Mesh(new T.BoxGeometry(0.9, 0.75, 0.6), L().ph(0x2a2c2a, 3)); tb.position.y = 0.38; term.add(tb);
    const mon = new T.Mesh(new T.BoxGeometry(0.5, 0.42, 0.45), L().ph(0x9a9684, 12)); mon.position.set(0, 0.97, 0); term.add(mon);
    const stat = G.makeStatic(); const scr = new T.Mesh(new T.PlaneGeometry(0.34, 0.27), new T.MeshBasicMaterial({ map: stat.texture })); scr.position.set(-0.01, 0.99, 0.231); term.add(scr);
    G.animated.push({ t: 0, update(dt) { this.t += dt; if (this.t > 0.07) { this.t = 0; stat.update(performance.now() / 1000); } } });
    G.addLamp({ x: 9.4, y: 1.3, z: 18.5, color: 0x7dffb0, I: 0.9, dist: 6, flicker: 0.2, halo: 0.6, bulb: false });
    const sam = G.L.civilian(); sam.position.set(9.4, 0, 19.0); sam.rotation.y = Math.PI; G.scene.add(sam);           // au sud du terminal, tourné vers lui
    const state = { phase: 0 };
    const lines = [[1500, 'SAMUEL : « Dima… C\'est quoi, ça ? Où t\'as eu cette clé ? »'], [5200, 'SAMUEL : « Ce n\'est pas une dette. Ce sont des noms. Des gamins. »'], [9200, 'SAMUEL : « Reprends-la. Va au garage de la rue du Pont. Cherche Léna. Passe par le marché, pas par la rue. »']];
    const opening = () => { for (const [t, txt] of lines) G.later(() => { if (G.currentChapter === 2 && state.phase === 0 && !G.completed) say(txt, 3800); }, t); };
    opening(); G.onReset.push(opening);
    const keyItem = { id: 'key_terminal', pos: new T.Vector3(9.4, 0.95, 17.9), radius: 2.2, prompt: 'Reprendre la clé',
      use() {
        G.interactables = G.interactables.filter(i => i !== keyItem); state.phase = 1; G.say('', 1);
        fx('whistle', 0.8); G.later(() => { fx('shot', 1); sam.rotation.x = -Math.PI / 2; sam.position.set(9.0, 0.22, 18.6); fx('pain', 0.6); state.phase = 2; G.L.trail([[9.0, 18.4], [9.4, 18.9], [9.1, 19.4]], 0.25); }, 900);
        G.later(() => say('Samuel s\'effondre. Quelqu\'un a tiré de la rue. Cours.', 4500), 1500); G.later(() => fx('whistle', 0.6), 2400); G.objective = 'Traverse le marché. Sors par l\'escalier, à l\'est.';
      } };
    G.interactables.push(keyItem);
    G.onReset.push(() => { state.phase = 0; sam.rotation.x = 0; sam.position.set(9.4, 0, 19.0); if (!G.interactables.includes(keyItem)) G.interactables.push(keyItem); G.have = ['usb-chez-nous']; });

    // ---- Roman : première apparition au fond de la boucle nord (silhouette immobile, qui disparaît) ----
    const rm = roman(); rm.position.set(46.2, 0, 7.5); rm.rotation.y = -Math.PI / 2; rm.visible = false; G.scene.add(rm);
    const tr = G.addTrigger(p => p.pos.z < 11.5 && p.pos.x > 34.5 && p.pos.x < 37 && p.pos.y < 2, () => {
      rm.visible = true; fx('creak', 0.9); fx('stinger', 0.6); say('Au bout du couloir, quelqu\'un te regarde.', 3000);
      G.later(() => { rm.visible = false; fx('door', 0.6); }, 4200);
    });
    tr.reset = () => { rm.visible = false; };
    // ---- Sortie : la porte de l'escalier (ch. 3 : les toits) ----
    G.interactables.push({ id: 'sortie', pos: new T.Vector3(55.2, 1.3, 18.5), radius: 2.4, prompt: 'Monter l\'escalier',
      use() { if (state.phase < 2) { say('Pas sans la clé.', 2000); return; } G.completeChapter(2); } });

    // ---- Police : 3 patrouilles. A : la rue ouest ; B : la boucle nord ; C : garde de la sortie ----
    G.addCop(G.makeCop(), [16, 18.5], 0, [[16, 18.5], [22, 18.5], [30, 18.5], [37, 18.5], [30, 18.5], [22, 18.5]]);
    G.addCop(G.makeCop(), [37, 7.5], 0, [[37, 7.5], [45, 7.5]]);
    G.addCop(G.makeCop(), [47.5, 18.5], -Math.PI / 2, null);
    G.buildNavGrid(0, 64, 0, 36, 0.5);
    G.addFogSheets();
  };
  G.chapters[2] = { name: 'Le marché', build() { G.buildChapter2(); } };
  G.loaded.push('chapter2');
})();
