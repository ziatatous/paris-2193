/* =====================================================================
   chapter4.js : CHAPITRE 4 « LES ÉGOUTS » (poursuite) -> le garage (pièce sûre) -> DEUX FINS.
   Plan : x = colonne, z = ligne (1 m par caractère). Enchaînement : puits d'entrée -> couloir -> carrefour -> salle de la vanne (volant + corps) -> grille fermée (vanne)
   -> citerne (piliers) -> couloir -> porte du garage. Roman te traque depuis que tu as pris le volant ; refermer la grille derrière toi le retarde ; il revient par un conduit.
   ===================================================================== */
(function () {
  'use strict';
  const G = window.G, T = G.T, L = () => G.L, M = () => G.mat;
  const MAP = [
    '################################################################',
    '################################################################',
    '################################################################',
    '################################################################',
    '##############.......###########################################',
    '##############.......###########################################',
    '##############.......###########################################',
    '##############.......###########################################',
    '#################..#############################################',
    '#################..#################..##########################',
    '#################..#################..##########################',
    '#################..#################..##########################',
    '#################..#################..##########################',
    '#################..#################..##########################',
    '#################..#################...........#########.......#',
    '#################....###############...........#########.......#',
    '#################....###############...........#########.......#',
    '###...###########....###############...........#########.......#',
    '###............................................................#',
    '###............................................................#',
    '#################....###############...........#########.......#',
    '#################....###############...........#########.......#',
    '#################....###############...........#########.......#',
    '#################..#################...........#########.......#',
    '#################..#############################################',
    '#################..#############################################',
    '#################..#############################################',
    '#################..#############################################',
    '#################..#############################################',
    '#################..#############################################',
    '###############........#########################################',
    '###############........#########################################',
    '###############........#########################################',
    '###############........#########################################',
    '################################################################',
    '################################################################',
    '################################################################',
    '################################################################',
    '################################################################',
    '################################################################'
  ];
  const START = [4.5, 0, 18.5, -Math.PI / 2];
  const say = (t, d) => G.say(t, d || 3500);
  const fx = (n, v) => { const f = G.audio && G.audio.fx; if (f) f(n, v == null ? 1 : v); };
  const pipe = (x0, z0, x1, z1, y, r) => { const len = Math.hypot(x1 - x0, z1 - z0), m = new T.Mesh(new T.CylinderGeometry(r || 0.12, r || 0.12, len, 8), L().ph(0x2a2d2b, 8)); m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); m.rotation.z = Math.PI / 2; m.rotation.y = -Math.atan2(z1 - z0, x1 - x0); G.scene.add(m); return m; };

  G.buildChapter4 = function () {
    G.have = ['usb-chez-nous']; G.objective = G.chapterObjective = 'Les égouts. Trouve un moyen de passer la grille, puis rejoins le garage.';
    G.isPlayable = null; G.zoneAt = () => 'out'; G.startPos = START;
    const R = { cop: null, active: false, phase: 0, gateOpen: false, gateClosed: false, wheel: false, safe: false, ventDone: false };
    G.beginBatch();
    G.B(-4, 72, -1, 0, -4, 44, M().concreteDark, { tile: 3, grime: false });
    G.genWalls(MAP, { free: '.=', skip: () => false, dirt: 0.85, special: () => [] });                   // aucun décor de façade : des murs d'égout nus
    for (const [x, z] of [[39.5, 16.5], [43.5, 16.5], [39.5, 21.5], [43.5, 21.5]]) G.B(x - 0.5, x + 0.5, 0, 3.6, z - 0.5, z + 0.5, M().concrete, { tile: 3 });     // piliers de la citerne
    // garage : plafond bas + établi
    G.B(55, 63, 3.4, 14, 14, 24, M().concreteDark, { grime: false, tile: 3 });
    G.B(56.2, 62.6, 0, 0.95, 14.2, 15.3, M().wood, { tile: 1, grime: false });                              // établi (couverture basse)
    G.L.clutter([{ x0: 6.3, x1: 16.7, z0: 18.2, z1: 19.8, n: 18 }, { x0: 17.2, x1: 20.8, z0: 15.2, z1: 22.8, n: 26 }, { x0: 14.3, x1: 20.7, z0: 4.3, z1: 7.7, n: 34 }, { x0: 21.3, x1: 34.7, z0: 18.2, z1: 19.8, n: 16 }, { x0: 36.3, x1: 46.7, z0: 14.3, z1: 23.7, n: 30 }, { x0: 47.3, x1: 54.7, z0: 18.2, z1: 19.8, n: 10 }]);
    G.L.flushDecals();
    G.endBatch();
    // ---- Tuyaux le long des couloirs, rien de plus (pas de câbles) ----
    pipe(6, 18.25, 16.5, 18.25, 2.4, 0.13); pipe(21, 19.75, 34.5, 19.75, 2.2, 0.16); pipe(47, 18.25, 54.5, 18.25, 2.5, 0.11); pipe(36.5, 14.15, 46.5, 14.15, 3.1, 0.2); pipe(36.5, 23.85, 46.5, 23.85, 3.0, 0.15);
    // ---- Lumières : presque rien ; une lueur froide au puits, des rouges mourantes, un peu de chaleur au garage ----
    G.L.lamp(4.5, 3.0, 17.2, { color: 0xb8d0e8, I: 0.9, dist: 9, halo: 1.6 });
    G.L.lamp(18, 3.0, 18.2, { color: 0xff3a24, I: 0.55, dist: 8, halo: 1.8, flicker: 0.9 });
    G.L.lamp(17.5, 2.8, 5.0, { color: 0xffd080, I: 0.5, dist: 6, halo: 0.9, flicker: 0.5 });
    G.L.lamp(28, 2.6, 19.8, { broken: true }); G.L.lamp(41, 3.4, 18.5, { color: 0x9fb8ff, I: 0.45, dist: 11, halo: 1.3, flicker: 0.4 });
    G.L.lamp(50, 2.8, 18.3, { color: 0xff3a24, I: 0.4, dist: 7, halo: 1.2, flicker: 0.8 });
    G.L.lamp(58, 3.1, 18.5, { color: 0xffc880, I: 1.2, dist: 14, halo: 2.4 }); G.L.lamp(60.5, 3.1, 22.5, { color: 0xffc880, I: 0.9, dist: 10, halo: 1.8 });
    // ---- Cachettes ----
    G.L.makeHide({ type: 'locker', x: 18.0, z: 4.45, front: [0, 1] });                          // salle de la vanne
    G.L.makeHide({ type: 'locker', x: 18.0, z: 33.55, front: [0, -1] });                       // salle des pompes (cul-de-sac sud)
    G.L.makeHide({ type: 'locker', x: 36.45, z: 22.2, front: [1, 0] });                         // citerne, côté ouest
    G.L.makeHide({ type: 'tarp', x: 45.4, z: 15.0, front: [-1, 0] });                           // citerne, côté nord-est
    G.L.crate(24, 19.0, 1.0, 0.9, 0.2); G.L.crate(30.5, 18.9, 1.0, 0.9, 0.4); G.L.crate(41.5, 19.0, 1.0, 0.9, 0.1); G.L.crate(15, 19.0, 0.9, 0.9, 0);

    // ---- Salle de la vanne : le volant à prendre, un corps (un technicien), du sang ----
    G.buildBody(16.2, 5.9, 0.4); G.L.trail([[17.6, 17.0], [17.7, 14.0], [17.4, 11.0], [17.5, 8.5], [16.6, 6.4]], 0.4); G.L.trail([[19.0, 5.2], [19.4, 5.7]], 0.2);          // traîné depuis le carrefour
    G.interactables.push({ id: 'corps4', pos: new T.Vector3(16.2, 0.4, 5.9), radius: 2.0, prompt: 'Examiner le corps',
      use() { G.collect('technicien', 'LE TECHNICIEN', 'Une combinaison de la voirie. Sur le badge : « LOT 14 — ENTRETIEN ».\nLe volant de la vanne est resté dans sa main, serré si fort qu\'il a fallu le lui arracher.\nQuelqu\'un l\'a traîné jusqu\'ici. Quelqu\'un qui n\'avait pas peur de salir.'); } });
    const wheel = new T.Mesh(new T.TorusGeometry(0.22, 0.03, 6, 16), L().ph(0x4a2a1c, 20)); wheel.position.set(19.3, 0.36, 5.6); wheel.rotation.x = Math.PI / 2; G.scene.add(wheel);
    const wheelItem = { id: 'volant', pos: new T.Vector3(19.3, 0.4, 5.6), radius: 2.0, prompt: 'Prendre le volant de la vanne',
      use() {
        wheel.visible = false; G.interactables = G.interactables.filter(i => i !== wheelItem); R.wheel = true; R.phase = 1; G.have.push('volant');
        G.objective = 'Retourne à la grille et ouvre la vanne. Quelque chose te suit.'; say('Un volant de vanne. Derrière toi, quelque chose heurte un tuyau.', 4500); fx('stinger', 0.8); fx('creak', 0.6);
        G.later(() => { if (R.phase === 1 && G.currentChapter === 4) spawnRoman(); }, 5000);
      } };
    G.interactables.push(wheelItem);

    // ---- La grille et sa vanne ----
    const gate = new T.Group(); gate.position.set(35.15, 0, 19); G.scene.add(gate);
    for (let z = -0.95; z <= 0.95; z += 0.25) { const b = new T.Mesh(new T.BoxGeometry(0.07, 2.7, 0.07), M().iron); b.position.set(0, 1.35, z); gate.add(b); }
    for (const y of [0.3, 1.35, 2.6]) { const b = new T.Mesh(new T.BoxGeometry(0.08, 0.08, 2.0), M().iron); b.position.set(0, y, 0); gate.add(b); }
    const gateCol = G.addBoxCollider(35.0, 35.3, 0, 2.7, 18, 20), gst = { y: 0, target: 0 };
    const rebuildNav = () => G.buildNavGrid(0, 64, 0, 36, 0.5);
    G.animated.push({ update(dt) { if (gst.y !== gst.target) { gst.y += Math.sign(gst.target - gst.y) * Math.min(Math.abs(gst.target - gst.y), dt * 1.1); gate.position.y = gst.y * 2.6; } } });
    const valveBase = new T.Mesh(new T.CylinderGeometry(0.06, 0.06, 0.9, 8), M().iron); valveBase.position.set(34.2, 1.0, 17.5); valveBase.rotation.x = Math.PI / 2; valveBase.position.z = 17.4; G.scene.add(valveBase);
    const valveWheel = new T.Mesh(new T.TorusGeometry(0.22, 0.03, 6, 16), L().ph(0x4a2a1c, 20)); valveWheel.position.set(34.2, 1.0, 17.9); valveWheel.visible = false; G.scene.add(valveWheel);
    const valve = { id: 'vanne', pos: new T.Vector3(34.2, 1.0, 17.9), radius: 2.2, prompt: 'Vanne',
      use() {
        if (!R.wheel) { say('Une vanne sans volant. Il en faut un.', 2500); return; }
        valveWheel.visible = true;
        if (!R.gateOpen) { R.gateOpen = true; gst.target = 1; gateCol.minY = 99; gateCol.maxY = 100; fx('door', 0.9); fx('creak', 0.8); G.later(rebuildNav, 1200); G.objective = 'La grille s\'ouvre. Passe. Tu peux la refermer derrière toi.'; say('La grille remonte en grinçant.', 3000); valve.prompt = 'Refermer la grille'; }
        else if (!R.gateClosed) {
          const rc = R.cop; if (rc && R.active && Math.hypot(rc.x - 35.2, rc.z - 19) < 2.2) { say('Il est trop près. Impossible de la refermer.', 2500); return; }
          if (P().pos.x < 36.5) { say('Il faut être de l\'autre côté.', 2200); return; }
          R.gateClosed = true; gst.target = 0; gateCol.minY = 0; gateCol.maxY = 2.7; fx('door', 1); G.later(rebuildNav, 3000); valve.prompt = '…'; say('La grille se referme. Tiens bon.', 3000); G.objective = 'Il va chercher un autre chemin. Rejoins le garage.';
          G.later(() => ventScare(), 12000);
        }
      } };
    G.interactables.push(valve);
    const P = () => G.P;

    // ---- Roman : créé masqué, apparaît à l'échelle d'entrée quand on prend le volant ----
    const rm = G.makeRoman(); rm.visible = false; const rc = G.addCop(rm, [4.5, 18.5], 0, null); rc.roman = true; rc.speedMul = 1.15; rc.keen = 1.35; rc.frozenLab = true; if (rc.lamp) { rc.lamp.I = 0; rc.lamp.halo = 0; }
    rm.traverse(o => { if (o.isSprite) o.visible = false; });
    R.cop = rc; G.roman = rc;
    function spawnRoman() {
      R.active = true; rc.x = 4.5; rc.z = 18.5; rc.state = 'search'; rc.alert = 0.8; rc.searchT = 60; rc.last = [P().pos.x, P().pos.z]; rc.frozenLab = false; rm.visible = true; fx('door', 0.8); fx('stinger', 0.7);
      say('Des pas lourds, sur l\'échelle. Il descend.', 3500);
    }
    function ventScare() {                                                    // il revient par le conduit nord de la citerne
      if (R.ventDone || G.currentChapter !== 4 || !R.active) return; R.ventDone = true; fx('thud', 1); fx('creak', 0.9);
      rc.x = 36.5; rc.z = 9.6; rc.state = 'search'; rc.alert = 0.9; rc.last = [P().pos.x, P().pos.z]; rc.searchT = 60; say('Un fracas dans le conduit, au nord. Il a contourné la grille.', 3500);
    }
    G.animated.push({ t: 0, update(dt) {                                       // il sait toujours à peu près où tu es (le bruit des pas dans les tuyaux), sauf si tu es caché
      if (!R.active || G.dead) return; this.t += dt; if (this.t < 2.5) return; this.t = 0;
      if (!G.hidden && rc.state !== 'chase') { rc.last = [P().pos.x + (G.rnd() - 0.5) * 3, P().pos.z + (G.rnd() - 0.5) * 3]; if (rc.state === 'idle' || rc.state === 'suspicious') { rc.state = 'search'; rc.searchT = 60; } rc.alert = Math.max(rc.alert, 0.7); }
    } });

    // ---- Garage : pièce sûre ----
    const door = new T.Mesh(new T.BoxGeometry(0.2, 3.0, 2.0), L().ph(0x2a2c2a, 12)); door.position.set(55.1, 4.5, 19); G.scene.add(door);        // porte relevée (au plafond) : elle retombe quand on entre
    const dst = { y: 4.5, target: 4.5 }; let doorCol = null;
    G.animated.push({ update(dt) { if (Math.abs(dst.y - dst.target) > 0.001) { dst.y += Math.sign(dst.target - dst.y) * Math.min(Math.abs(dst.target - dst.y), dt * 2.4); door.position.y = dst.y; } } });
    const trSafe = G.addTrigger(p => p.pos.x > 56.2 && p.pos.x < 62.5 && p.pos.z > 15.5 && p.pos.z < 22.5, () => {
      R.safe = true; dst.target = 1.5; doorCol = G.addBoxCollider(55.0, 55.3, 0, 3.0, 18, 20); fx('door', 1); G.later(() => fx('thud', 1), 500); G.later(() => fx('thud', 0.9), 1300); G.later(() => fx('thud', 0.7), 2400);
      if (R.cop) R.cop.frozenLab = true; G.objective = 'La porte s\'est refermée. Léna est là.'; say('Derrière la porte, quelqu\'un cogne. Puis plus rien. Tu es en sécurité.', 5000);
      G.later(() => say('LÉNA : « Dima. On t\'attendait. Elle va bien. Elle est dans la voiture. »', 5500), 5500);
    });
    trSafe.reset = () => { R.safe = false; dst.target = dst.y = 4.5; door.position.y = 4.5; if (doorCol) { doorCol.minY = 99; doorCol.maxY = 100; } };
    // voiture au biodiesel : carcasse sombre, phares
    const car = new T.Group(); car.position.set(59.5, 0, 17.5); G.scene.add(car);
    const cb = L().ph(0x1f2420, 14, 0x222a2a); const body = new T.Mesh(new T.BoxGeometry(4.0, 0.7, 1.8), cb); body.position.y = 0.6; car.add(body);
    const cab = new T.Mesh(new T.BoxGeometry(2.1, 0.62, 1.6), cb); cab.position.set(-0.2, 1.25, 0); car.add(cab);
    const gl = L().ph(0x0a1210, 60, 0x6a8080); const win = new T.Mesh(new T.BoxGeometry(1.9, 0.38, 1.64), gl); win.position.set(-0.2, 1.3, 0); car.add(win);
    for (const [x, z] of [[1.3, 0.9], [1.3, -0.9], [-1.3, 0.9], [-1.3, -0.9]]) { const w = new T.Mesh(new T.CylinderGeometry(0.33, 0.33, 0.26, 12), L().ph(0x08090a, 2)); w.position.set(x, 0.33, z); w.rotation.x = Math.PI / 2; car.add(w); }
    for (const z of [-0.65, 0.65]) { const hl = new T.Sprite(new T.SpriteMaterial({ map: G.glowTex, color: 0xffd8a0, blending: T.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.55 })); hl.position.set(2.05, 0.7, z); hl.scale.set(0.8, 0.8, 1); car.add(hl); }
    const tank = new T.Mesh(new T.CylinderGeometry(0.28, 0.28, 0.9, 10), L().ph(0x3a3024, 8)); tank.position.set(-1.0, 1.0, -1.05); tank.rotation.x = Math.PI / 2; car.add(tank);   // le réservoir à biodiesel, boulonné sur le côté
    G.addOBBCollider(59.5, 17.5, 4.0, 1.8, 0, 0, 1.4);
    // Mila sur la banquette arrière, la veilleuse dans les mains
    const mh = new T.Mesh(new T.SphereGeometry(0.085, 10, 8), L().ph(0x8a6f5f, 4)); mh.position.set(-0.9, 1.42, 0.35); car.add(mh); const mhair = new T.Mesh(new T.SphereGeometry(0.092, 10, 8), L().ph(0x1a1410, 4)); mhair.position.set(-0.9, 1.45, 0.33); mhair.scale.set(1, 0.9, 1); car.add(mhair);
    const nl = new T.Mesh(new T.CylinderGeometry(0.035, 0.05, 0.09, 10), L().ph(0xf0c890, 30)); nl.position.set(-0.75, 1.2, 0.2); car.add(nl);
    G.addLamp({ x: 58.8, y: 1.5, z: 17.7, color: 0xffc080, I: 0.6, dist: 4.5, halo: 1.0 });                         // la veilleuse
    G.interactables.push({ id: 'mila_voiture', pos: new T.Vector3(58.6, 1.3, 17.9), radius: 2.6, prompt: 'Parler à Mila',
      use() { if (!R.safe) return; say('MILA : « Dima ? Tu as ramené la lumière ? … J\'ai gardé la mienne allumée. »', 5500); } });
    // Léna
    const lena = L().civilian(); lena.position.set(60.5, 0, 20.4); lena.rotation.y = Math.PI * 0.9; G.scene.add(lena);
    const rg = lena.userData.rig; G.animated.push({ update() { const t = performance.now() / 1000; rg.head.rotation.y = Math.sin(t * 0.5) * 0.3; rg.torso.scale.y = 1 + Math.sin(t * 1.4) * 0.012; } });
    G.interactables.push({ id: 'lena', pos: new T.Vector3(60.2, 1.3, 20.3), radius: 2.6, prompt: 'Parler à Léna',
      use() { if (!R.safe) { say('Une femme, dans l\'ombre. Elle lève la main : attends.', 2500); return; } say('LÉNA : « La clé, Dima. C\'est à toi de décider ce qu\'on en fait. »', 5500); R.talked = true; G.objective = 'Choisis : donner la clé à Léna, ou la garder.'; } });
    // le choix : deux objets-interactions sur l'établi
    G.interactables.push({ id: 'fin_a', pos: new T.Vector3(58.0, 1.0, 14.8), radius: 2.3, prompt: 'Donner la clé à Léna (la liste sera publiée)',
      use() { if (!R.safe || !R.talked) { say('Parle d\'abord à Léna.', 2000); return; } G.showEnding('a'); } });
    G.interactables.push({ id: 'fin_b', pos: new T.Vector3(61.6, 1.0, 14.8), radius: 2.3, prompt: 'Garder la clé et partir avec Mila',
      use() { if (!R.safe || !R.talked) { say('Parle d\'abord à Léna.', 2000); return; } G.showEnding('b'); } });
    G.onReset.push(() => { R.active = false; R.phase = 0; R.wheel = false; R.gateOpen = false; R.gateClosed = false; R.ventDone = false; R.safe = false; R.talked = false; G.have = ['usb-chez-nous']; wheel.visible = true; if (!G.interactables.includes(wheelItem)) G.interactables.push(wheelItem);
      gst.target = gst.y = 0; gate.position.y = 0; gateCol.minY = 0; gateCol.maxY = 2.7; valve.prompt = 'Vanne'; valveWheel.visible = false; rc.frozenLab = true; rm.visible = false; rc.x = 4.5; rc.z = 18.5; rc.state = 'idle'; rebuildNav(); });

    // ---- Les enfants de la liste : rien d'autre. Nav + brume ----
    rebuildNav();
    G.addFogSheets();
  };
  G.chapters[4] = { name: 'Les égouts', build() { G.buildChapter4(); } };
  G.loaded.push('chapter4');
})();
