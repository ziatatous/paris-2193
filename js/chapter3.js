/* =====================================================================
   chapter3.js : CHAPITRE 3 « LES TOITS » (parkour + peur). Cinq toits : R0 (départ) -> saut 4 m -> R1 -> barre de balancement (6 m) -> R2 (flic armé)
   -> échelle (6 m) -> R3 -> saut avec dash (6,5 m) -> R4 (flic armé, terminal : le REGISTRE, le nom de Mila) -> échelle de service vers les égouts.
   Un drone-projecteur patrouille au-dessus de R1/R2 : s'il te voit, les policiers armés sont alertés. Tomber dans la rue = mort.
   Aucune arme pour Dima : fuite, esquive, parcours.
   ===================================================================== */
(function () {
  'use strict';
  const G = window.G, T = G.T, L = () => G.L, M = () => G.mat;
  // x0, x1, z0, z1, hauteur du toit
  const ROOFS = { R0: [-6, 6, -5, 5, 9], R1: [9.6, 20, -5, 5, 9], R2: [26, 36, -5, 5, 9], R3: [36, 46, -5, 5, 15], R4: [52, 62.5, -5, 5, 15] };
  const START = [-3.5, 9, 0, -Math.PI / 2];
  const say = (t, d) => G.say(t, d || 3500);
  const fx = (n, v) => { const f = G.audio && G.audio.fx; if (f) f(n, v == null ? 1 : v); };

  G.buildChapter3 = function () {
    G.have = ['usb-chez-nous']; G.objective = G.chapterObjective = 'Les toits. Va vers l\'est, jusqu\'à l\'émetteur. Ne tombe pas.';
    G.isPlayable = null; G.zoneAt = () => 'out'; G.startPos = START; G.killY = 4;
    G.beginBatch();
    const conc = M().concreteDark, par = M().concrete;
    for (const k in ROOFS) {
      const [x0, x1, z0, z1, y] = ROOFS[k];
      G.B(x0, x1, 0, y, z0, z1, conc, { tile: 3 });                                          // le bâtiment (plein, du sol au toit)
      G.B(x0, x1, y, y + 0.06, z0, z1, M().asphalt, { tile: 3, collide: false, grime: false });  // revêtement du toit
      // acrotère bas (1 m) sur les côtés nord/sud (et sur les côtés est/ouest qui ne donnent pas sur un saut)
      G.B(x0, x1, y, y + 1.0, z0 - 0.25, z0, par, { tile: 3 }); G.B(x0, x1, y, y + 1.0, z1, z1 + 0.25, par, { tile: 3 });
    }
    // côtés fermés (sans saut) : ouest de R0, est de R4, ouest/est en contact R2|R3 (mur de 6 m, échelle)
    G.B(-6.25, -6, 9, 10.0, -5, 5, par, { tile: 3 }); G.B(62.5, 62.75, 15, 16.0, -5, 5, par, { tile: 3 });
    // petite cabane de l'escalier (départ) à l'ouest de R0, ouverte vers l'est
    G.B(-9.5, -6, 9, 12.2, -2.5, 2.5, M().wall, { grime: true }); G.B(-9.5, -6, 12.2, 12.5, -2.8, 2.8, conc, {});
    G.B(-6.0, -5.8, 9, 12.2, -2.5, -1.2, M().wall, { grime: true }); G.B(-6.0, -5.8, 9, 12.2, 1.2, 2.5, M().wall, { grime: true });      // façade avec la porte (ouverture au centre)
    // quelques volumes de toit : couverture, ombre, atmosphère (caissons de ventilation, cheminées, antennes)
    for (const [x, z, w, d, h] of [[13, -3, 1.6, 1.6, 1.4], [16.5, 2.8, 2.2, 1.4, 1.1], [29.5, 3, 1.8, 1.8, 1.5], [33, -3.2, 2.4, 1.2, 1.2], [40, 3.2, 1.6, 1.6, 1.8], [3, 3, 1.4, 1.4, 1.2], [57, -3, 2.0, 1.4, 1.3], [59, 3, 1.5, 1.5, 1.6]]) {
      const y = x < 36 ? 9 : 15; G.B(x - w / 2, x + w / 2, y, y + h, z - d / 2, z + d / 2, M().concrete, { tile: 2 });
    }
    // Skyline lointaine (silhouettes sombres, sans collision) : pas un décor de plus, juste la ville qui dort sous la brume
    for (let i = 0; i < 30; i++) { const x = -20 + i * 3.1 + (G.rnd() - 0.5) * 2, z = (i % 2 ? 1 : -1) * (14 + G.rnd() * 22), w = 3 + G.rnd() * 5, h = 14 + G.rnd() * 22; G.B(x - w / 2, x + w / 2, 0, h, z - w / 2, z + w / 2, conc, { collide: false, tile: 4 }); }
    G.endBatch();
    G.fogOverride = 0.058;                                                                   // sur les toits on doit pouvoir lire le vide : brouillard plus léger
    // Liserés lumineux (peinture phosphorescente) sur les bords qui donnent sur un saut : on voit où ça s'arrête
    const edgeMat = new T.MeshBasicMaterial({ color: 0xc9b25a });
    for (const [x, z0, z1, y] of [[6, -5, 5, 9], [9.6, -5, 5, 9], [20, -5, 5, 9], [26, -5, 5, 9], [46, -5, 5, 15], [52, -5, 5, 15]]) { const m = new T.Mesh(new T.BoxGeometry(0.12, 0.03, z1 - z0), edgeMat); m.position.set(x + (x === 6 || x === 20 || x === 46 ? -0.06 : 0.06), y + 0.07, (z0 + z1) / 2); G.scene.add(m); }
    // Balises de profondeur : petites lumières rouges au loin, pour ne pas flotter dans le noir
    for (const [x, z, y] of [[8, -14, 22], [30, 16, 28], [50, -18, 31], [66, 14, 24], [-14, 10, 20]]) { const s = new T.Sprite(new T.SpriteMaterial({ map: G.glowTex, color: 0xff3a2a, blending: T.AdditiveBlending, transparent: true, depthWrite: false, fog: false, opacity: 0.8 })); s.position.set(x, y, z); s.scale.set(1.4, 1.4, 1); G.scene.add(s); }

    // ---- Parcours : barre, échelles ----
    G.addBar('z', 22.0, 0, 8.4, 12.2);                                                      // entre R1 (x<20) et R2 (x>26) : pour se balancer
    for (const z of [-4.2, 4.2]) { const post = new T.Mesh(new T.BoxGeometry(0.22, 12.4, 0.22), M().iron); post.position.set(22.0, 6.2, z); G.scene.add(post); }   // deux pylônes montent de la rue
    G.addLadder(36, 0, 9, 15, -1, 0);                                                      // R2 -> R3 : le long du mur de 6 m
    G.addLadder(57, 5.2, 0, 15, 0, 1); G.ladders.pop();                                    // échelle de service (décor) au bord sud de R4 : on la « descend » via l'interaction `sortie`
    // Lumières : lueur du ciel, balise rouge sur R3, lampe de la cabane, lueur du terminal
    G.L.lamp(-4.8, 11.6, 0, { I: 0.9, dist: 11, halo: 2.4, color: 0xffc070 });
    G.L.lamp(40.2, 17.4, 3.2, { color: 0xff3020, I: 0.9, dist: 12, halo: 2.8, flicker: 0.7 });                 // balise de l'antenne
    G.L.lamp(22.3, 12.4, 4.2, { color: 0xb8c8d8, I: 0.5, dist: 8, halo: 0.9, flicker: 0.4 });          // sur un pylône (hors du trajet du balancement)
    // ---- Terminal du registre (R4) ----
    const term = new T.Group(); term.position.set(61.4, 15, 0); term.rotation.y = -Math.PI / 2; G.scene.add(term);
    const tb = new T.Mesh(new T.BoxGeometry(1.2, 0.8, 0.7), L().ph(0x1c1e1c, 3)); tb.position.y = 0.4; term.add(tb);
    const mon = new T.Mesh(new T.BoxGeometry(0.6, 0.5, 0.5), L().ph(0x9a9684, 12)); mon.position.set(0, 1.05, 0); term.add(mon);
    const stat = G.makeStatic(); const scr = new T.Mesh(new T.PlaneGeometry(0.4, 0.32), new T.MeshBasicMaterial({ map: stat.texture })); scr.position.set(0, 1.07, 0.261); term.add(scr);
    G.animated.push({ t: 0, update(dt) { this.t += dt; if (this.t > 0.07) { this.t = 0; stat.update(performance.now() / 1000); } } });
    G.addLamp({ x: 60.6, y: 16.2, z: 0, color: 0x7dffb0, I: 1.0, dist: 7, flicker: 0.2, halo: 0.7, bulb: false });
    const st = { read: false };
    G.interactables.push({ id: 'terminal', pos: new T.Vector3(61.2, 16.0, 0), radius: 2.3, prompt: 'Brancher la clé',
      use() {
        if (!G.have.includes('usb-chez-nous')) { say('Il me faut la clé.', 2000); return; }
        st.read = true; G.flag('registre', true); G.objective = 'Descends par l\'échelle de service (sud). Il faut trouver Léna, au garage.';
        G.collect('registre', 'REGISTRE — LOT 14', 'FILTRATION PULMONAIRE · SUJETS PRÉLEVÉS · PÉRIODE 2193-Q4\n\n 0412  A. Petrova, 8 ans .......... affecté\n 0413  T. Idris, 10 ans ........... affecté\n 0414  M. OKAFOR-LENOIR, 9 ans .... ASSIGNÉE · asthme : sujet idéal\n\nPrélèvement prévu : cette nuit.\n\nTu relis la ligne trois. Tu la relis encore.');
        setTimeout(() => say('Cette nuit. Mila.', 4500), 400);
      } });
    // Sortie : échelle de service au bord sud de R4 ; ici on la montre comme une trappe qui descend
    G.interactables.push({ id: 'sortie', pos: new T.Vector3(57, 15.6, 4.3), radius: 2.3, prompt: 'Descendre l\'échelle de service',
      use() { if (!st.read) { say('Je ne partirai pas sans savoir ce qu\'il y a sur cette clé.', 3200); return; } G.completeChapter(3); } });
    G.onReset.push(() => { st.read = false; G.have = ['usb-chez-nous']; });

    // ---- Policiers ARMÉS (restent sur leur toit : « leash ») + drone ----
    const armed = (home, facing, patrol, roof) => { const c = G.addCop(G.makeCop(), home, facing, patrol); c.armed = true; c.y = roof[4]; const r = roof; c.leash = { x0: r[0] + 0.6, x1: r[1] - 0.6, z0: r[2] + 0.6, z1: r[3] - 0.6 }; return c; };
    armed([33, 0], Math.PI, [[33, -2.5], [29, -2.5], [29, 2.5], [33, 2.5]], ROOFS.R2);
    armed([59.5, -3], Math.PI, [[56, -3], [59.5, -3], [59.5, 3.5], [56, 3.5]], ROOFS.R4);
    // grille de navigation faite à la main : seules les cases SUR un toit sont libres
    { const x0 = -12, z0 = -8, cell = 0.5, nx = Math.ceil((66 - x0) / cell), nz = Math.ceil(16 / cell), free = new Uint8Array(nx * nz);
      for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const x = x0 + (i + 0.5) * cell, z = z0 + (j + 0.5) * cell; let ok = false; for (const k in ROOFS) { const r = ROOFS[k]; if (x > r[0] + 0.5 && x < r[1] - 0.5 && z > r[2] + 0.5 && z < r[3] - 0.5) ok = !G.blocked(x, z, r[4] + 1.15, 0.6, 0.45); } free[j * nx + i] = ok ? 1 : 0; }
      G.navGrid = { x0, z0, cell, nx, nz, free }; }
    buildDrone();
    G.addFogSheets();
  };

  function buildDrone() {
    const g = new T.Group(); G.scene.add(g);
    const body = new T.Mesh(new T.BoxGeometry(0.55, 0.16, 0.55), L().ph(0x0c0e10, 40, 0x334455)); g.add(body);
    const rotors = []; for (const [x, z] of [[0.3, 0.3], [-0.3, 0.3], [0.3, -0.3], [-0.3, -0.3]]) { const r = new T.Mesh(new T.CylinderGeometry(0.17, 0.17, 0.01, 12), L().ph(0x222628, 4)); r.position.set(x, 0.1, z); g.add(r); rotors.push(r); }
    const led = new T.Sprite(new T.SpriteMaterial({ map: G.glowTex, color: 0xff3a2a, blending: T.AdditiveBlending, transparent: true, depthWrite: false, fog: false, opacity: 0.9 })); led.position.set(0, -0.08, 0.28); led.scale.set(0.5, 0.5, 1); g.add(led);
    const cone = new T.Mesh(new T.CylinderGeometry(3.2, 0.12, 6.4, 16, 1, true), new T.MeshBasicMaterial({ color: 0xd8ecff, transparent: true, opacity: 0.07, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false })); cone.position.y = -3.3; g.add(cone);
    const pool = new T.Mesh(new T.CircleGeometry(3.2, 20), new T.MeshBasicMaterial({ color: 0xd8ecff, transparent: true, opacity: 0.12, blending: T.AdditiveBlending, depthWrite: false })); pool.rotation.x = -Math.PI / 2; G.scene.add(pool);
    const lamp = G.addLamp({ x: 10, y: 14.5, z: 0, color: 0xd8ecff, I: 0.8, dist: 9, halo: 0, bulb: false });
    const D = { x: 8, z: 0, y: 15.6, t: 0, track: 0, cd: 0 }; G.drone = D;
    G.animated.push({ update(dt) {
      const P = G.P; D.t += dt; D.cd -= dt; rotors.forEach(r => { r.rotation.y += dt * 40; });
      if (D.track > 0) { D.track -= dt; const dx = P.pos.x - D.x, dz = P.pos.z - D.z, d = Math.hypot(dx, dz) || 1, sp = Math.min(d, 4.2 * dt); D.x += dx / d * sp; D.z += dz / d * sp; }
      else { const tx = 8 + 26 * (0.5 + 0.5 * Math.sin(D.t * 0.22)), tz = 3.2 * Math.sin(D.t * 0.7); D.x += (tx - D.x) * Math.min(1, dt * 1.5); D.z += (tz - D.z) * Math.min(1, dt * 1.5); }
      g.position.set(D.x, D.y + Math.sin(D.t * 2) * 0.05, D.z); pool.position.set(D.x, 9.07, D.z); lamp.pos.set(D.x, 11.5, D.z);
      // détection : dans le disque lumineux, à hauteur de toit, ligne de vue dégagée vers le haut, pas caché
      const dxp = P.pos.x - D.x, dzp = P.pos.z - D.z, inDisk = Math.hypot(dxp, dzp) < 3.0 && Math.abs(P.pos.y - 9) < 2.2 && !G.hidden;
      if (inDisk && G.los(D.x, D.y - 0.2, D.z, P.pos.x, P.pos.y + (P.h < 1.5 ? 0.7 : 1.3), P.pos.z)) {
        D.track = 6; if (D.cd <= 0) { D.cd = 4; fx('whistle', 0.9); fx('stinger', 0.5); say('Le drone t\'a vu. Les flics sont prévenus.', 2800);
          for (const c of G.cops) if (c.armed && Math.abs(c.y - 9) < 1) { c.state = 'chase'; c.alert = 1; c.last = [P.pos.x, P.pos.z]; c.lostT = 0; } }
      }
    } });
    G.onReset.push(() => { D.track = 0; D.t = 0; });
  }
  G.chapters[3] = { name: 'Les toits', build() { G.buildChapter3(); } };
  G.loaded.push('chapter3');
})();
