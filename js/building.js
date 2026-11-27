/* =====================================================================
   building.js : l'IMMEUBLE du niveau 1 (coordonnées du plan : x 3..12, z 22..30, porte au nord sur la cour).
   Rez-de-chaussée (hall) + 3 étages de voisins (portes seulement) + l'appartement tout en haut (y = 12) = la chambre de Neo (Matrix).
   Escalier carré à volées droites, paliers distincts, garde-corps de fer. Tout en boîtes ; les petits objets sont fusionnés (G.beginBatch).
   ===================================================================== */
(function () {
  'use strict';
  const G = window.G, T = G.T, M = () => G.mat, rnd = () => G.rnd();
  const X0 = 3, X1 = 12, Z0 = 22, Z1 = 30, WT = 0.3, PX0 = 6.9, PX1 = 7.2, ROOF = 15, AY = 12;
  const RISE = 0.1875, RUN = 0.275;
  const ph = (c, s, sp) => new T.MeshPhongMaterial({ color: c, shininess: s === undefined ? 4 : s, specular: sp === undefined ? 0x111111 : sp });
  const box = (x0, x1, y0, y1, z0, z1, mat, o) => G.B(x0, x1, y0, y1, z0, z1, mat, Object.assign({ grime: false }, o || {}));
  const mesh = (geo, mat, x, y, z, ry) => { const q = new T.Mesh(geo, mat); q.position.set(x, y, z); if (ry) q.rotation.y = ry; G.scene.add(q); return q; };

  G.buildBuilding = function () {
    const C = M().concrete, CD = M().concreteDark, IRON = M().iron;
    // ---------- Coque ----------
    box(X0, X0 + WT, 0, ROOF + 0.3, Z0, Z1, C, { grime: true }); box(X1 - WT, X1, 0, ROOF + 0.3, Z0, Z1, C, { grime: true }); box(X0, X1, 0, ROOF + 0.3, Z1 - WT, Z1, C, { grime: true });
    box(X0, X1, ROOF, ROOF + 0.3, Z0, Z1, CD);                                                       // toit
    // Façade nord (sur la cour) : porte du hall, fenêtre de l'appartement, fenêtres de paliers et de voisins
    const north = [[7.45, 8.55, 0, 2.4], [8.0, 9.6, AY + 1.3, AY + 2.6]];
    for (const yf of [3, 6, 9, 12]) north.push([4.2, 5.4, yf + 1.0, yf + 2.3]);
    for (const yf of [3, 6, 9]) { north.push([8.7, 9.9, yf + 1.2, yf + 2.4]); north.push([10.4, 11.4, yf + 1.2, yf + 2.4]); }
    G.wall('z', Z0, Z0 + WT, X0, X1, 0, ROOF + 0.3, north, C, { grime: true, collide: true });
    const glass = ph(0x07100f, 12, 0x1a2424);
    for (const o of north.slice(1)) { box(o[0], o[1], o[2], o[3], Z0 + 0.12, Z0 + 0.16, glass, { collide: false }); for (let a = o[0] + 0.3; a < o[1] - 0.1; a += 0.3) box(a, a + 0.03, o[2], o[3], Z0 + 0.05, Z0 + 0.08, IRON, { collide: false }); }   // vitres + barreaux
    for (const o of north.slice(1)) { box(o[0] - 0.05, o[1] + 0.05, o[2] - 0.05, o[2], Z0 - 0.04, Z0 + 0.1, CD, { collide: false }); }                                          // appui de fenêtre
    // Porte du hall : encadrement et vantail ouvert vers l'intérieur (on voit le noir derrière)
    box(7.4, 7.45, 0, 2.45, Z0 - 0.03, Z0 + 0.3, IRON, { collide: false }); box(8.55, 8.6, 0, 2.45, Z0 - 0.03, Z0 + 0.3, IRON, { collide: false }); box(7.4, 8.6, 2.4, 2.45, Z0 - 0.03, Z0 + 0.3, IRON, { collide: false });
    // ---------- Cloison entre l'escalier (x < 6.9) et le reste ----------
    const part = [[23.2, 25.0, 0, 2.3], [23.0, 24.1, AY, AY + 2.2]];                                 // hall -> escalier ; appartement -> palier
    for (const yf of [3, 6, 9]) { part.push([22.8, 23.8, yf, yf + 2.15]); part.push([24.4, 25.4, yf, yf + 2.15]); }   // portes de voisins
    G.wall('x', PX0, PX1, Z0 + WT, Z1 - WT, 0, ROOF, part, M().wall, { grime: true });
    // portes de voisins : vantail en retrait + plaque de numéro côté escalier
    const doorMat = ph(0x2a2c2b, 12), frame = ph(0x151716, 6);
    const nums = { 3: ['11', '12'], 6: ['21', '22'], 9: ['31', '32'] };
    for (const yf of [3, 6, 9]) [[22.8, 23.8, 0], [24.4, 25.4, 1]].forEach(([a, b, k]) => {
      box(PX0 + 0.08, PX0 + 0.16, yf, yf + 2.1, a + 0.05, b - 0.05, doorMat, { collide: false });
      box(PX0 - 0.02, PX0 + 0.1, yf, yf + 2.17, a - 0.06, a, frame, { collide: false }); box(PX0 - 0.02, PX0 + 0.1, yf, yf + 2.17, b, b + 0.06, frame, { collide: false }); box(PX0 - 0.02, PX0 + 0.1, yf + 2.15, yf + 2.2, a - 0.06, b + 0.06, frame, { collide: false });
      box(PX0 + 0.04, PX0 + 0.09, yf + 1.55, yf + 1.7, (a + b) / 2 - 0.1, (a + b) / 2 + 0.1, ph(0x8a8d86, 30), { collide: false });                 // plaque
      box(PX0 + 0.04, PX0 + 0.09, yf + 1.05, yf + 1.12, b - 0.25, b - 0.12, ph(0x6a6d70, 60), { collide: false });                                  // poignée
      const t = new T.Mesh(new T.PlaneGeometry(0.17, 0.11), new T.MeshBasicMaterial({ map: G.dress.signTex(nums[yf][k], '#4a4d48') })); t.position.set(PX0 + 0.035, yf + 1.625, (a + b) / 2); t.rotation.y = -Math.PI / 2; G.scene.add(t);   // PX0 < joueur : la plaque regarde -x
      if (yf === 6 && k === 1) box(PX0 + 0.05, PX0 + 0.08, yf + 1.75, yf + 2.0, a + 0.1, b - 0.1, ph(0x1a1410, 2), { collide: false });         // un papier collé sur la porte condamnée
    });
    // porte de l'appartement : cadre + vantail ouvert à 80°
    box(PX0 - 0.02, PX1 + 0.02, AY, AY + 2.25, 22.94, 23.0, frame, { collide: false }); box(PX0 - 0.02, PX1 + 0.02, AY, AY + 2.25, 24.1, 24.16, frame, { collide: false }); box(PX0 - 0.02, PX1 + 0.02, AY + 2.2, AY + 2.27, 22.94, 24.16, frame, { collide: false });
    // ---------- Masse pleine des voisins (de y=3 à l'appartement) ; sol parqué de l'appartement ----------
    box(PX1, X1 - WT, 3, AY - 0.1, Z0 + WT, Z1 - WT, CD);
    box(PX1, X1 - WT, AY - 0.1, AY, Z0 + WT, Z1 - WT, M().floor, { tile: 2 });
    // ---------- Escalier : 4 volées de 2x8 marches ----------
    box(3.3, PX0, -0.3, 0, Z0 + WT, Z1 - WT, CD);                                                      // sol du rez (escalier)
    box(PX1, X1 - WT, -0.3, 0, Z0 + WT, Z1 - WT, M().floor, { tile: 2 });                              // sol du hall
    for (const yf of [AY, 9, 6, 3]) {
      box(3.3, PX0, yf - 0.3, yf, Z0 + WT, 25.9, CD);                                                  // palier d'étage (carré, côté cour)
      box(3.3, PX0, yf - 1.8, yf - 1.5, 28.1, Z1 - WT, CD);                                            // demi-palier (côté fond)
      for (let i = 1; i <= 8; i++) { const top = yf - RISE * i, z0 = 25.9 + (i - 1) * RUN; box(5.2, PX0, top - 0.3, top, z0, z0 + RUN, CD); }   // volée est : on descend vers le sud
      for (let j = 1; j <= 8; j++) { const top = yf - 1.5 - RISE * j, z1 = 28.1 - (j - 1) * RUN; box(3.3, 5.0, top - 0.3, top, z1 - RUN, z1, CD); }   // volée ouest : on remonte vers le nord
      // Garde-corps : seulement au dernier étage, devant le vide de la cage (collision) ; ailleurs la volée du haut arrive sur le palier
      if (yf === AY) {
        box(3.3, 5.2, yf, yf + 1.05, 25.84, 25.9, IRON, { collide: true });
        for (let a = 3.4; a < 5.2; a += 0.45) box(a, a + 0.04, yf, yf + 1.05, 25.8, 25.94, IRON, { collide: false });
        box(3.3, 5.2, yf + 0.98, yf + 1.04, 25.8, 25.94, IRON, { collide: false });
      }
      for (const [xr, sgn] of [[5.2, 1], [5.0, -1]]) {                                                  // mains courantes inclinées le long de la cage ouverte (visuelles)
        const y0 = sgn === 1 ? yf : yf - 1.5, y1 = sgn === 1 ? yf - 1.5 : yf - 3, zA = sgn === 1 ? 25.9 : 28.1, zB = sgn === 1 ? 28.1 : 25.9;
        const len = Math.hypot(2.2, y1 - y0), xx = xr + (sgn === 1 ? 0.03 : -0.03), rail = mesh(new T.BoxGeometry(0.05, 0.05, len), IRON, xx, (y0 + y1) / 2 + 0.95, (zA + zB) / 2);
        rail.rotation.x = Math.atan2(-(y1 - y0), (zB - zA));
        for (let k = 0; k <= 4; k++) { const t = k / 4; mesh(new T.BoxGeometry(0.04, 0.95, 0.04), IRON, xx, y0 + (y1 - y0) * t + 0.47, zA + (zB - zA) * t); }
      }
    }
    // ---------- Lumières : une ambiance différente à chaque étage ----------
    G.addLamp({ x: 9.4, y: 2.7, z: 25.5, color: 0xb9c8a0, I: 1.0, dist: 8, flicker: 0.3, halo: 0.9 });                         // hall
    G.addLamp({ x: 4.9, y: 0 + 2.7, z: 24.0, color: 0xcfd8a0, I: 0.8, dist: 7, flicker: 0.25, halo: 0.8 });                    // palier rez
    G.addLamp({ x: 4.9, y: 3 + 2.7, z: 24.0, color: 0xffc080, I: 1.0, dist: 8, flicker: 0.1, halo: 1.0 });                      // étage 1 : ampoule nue chaude
    G.addLamp({ x: 4.9, y: 6 + 2.7, z: 24.0, color: 0xcfd8a0, I: 0.0, dist: 8, flicker: 0, halo: 0 });                          // étage 2 : lampe morte (noir)
    G.addLamp({ x: 4.9, y: 9 + 2.7, z: 24.0, color: 0x9fffd0, I: 1.0, dist: 8, flicker: 0.9, halo: 1.1 });                      // étage 3 : néon vert qui grésille
    G.addLamp({ x: 4.9, y: AY + 2.7, z: 24.0, color: 0xcfd8a0, I: 0.5, dist: 7, flicker: 0.4, halo: 0.6 });                     // palier de l'appartement
    // Hall : boîtes aux lettres, vélo cassé, sacs
    for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) box(X1 - WT - 0.14, X1 - WT, 1.0 + j * 0.3, 1.0 + j * 0.3 + 0.26, 24.2 + i * 0.4, 24.2 + i * 0.4 + 0.34, ph(0x2b3033, 20), { collide: false });
    for (const [x, z, s] of [[8.5, 27.6, 0.5], [9.2, 28.2, 0.4], [10.4, 28.8, 0.45]]) { const q = mesh(new T.SphereGeometry(s, 8, 6), ph(0x0c0e0c, 2), x, s * 0.5, z); q.scale.y = 0.65; }
    G.buildApartment();
  };

  /* ---------- LA CHAMBRE DE NEO ---------- */
  G.buildApartment = function () {
    const X = 7.2, XE = 11.7, ZN = 22.3, ZS = 29.7, F = AY, CEIL = ROOF, IRON = M().iron;
    const green = ph(0x4a5c47, 3, 0x0a0f0a); green.map = null;
    // Revêtement vert sale des murs de la pièce (fines dalles contre la coque) ; fenêtre et porte laissées ouvertes
    G.wall('z', ZN, ZN + 0.03, X, XE, F, CEIL, [[8.0, 9.6, F + 1.3, F + 2.6]], green, { collide: false });
    G.wall('z', ZS - 0.03, ZS, X, XE, F, CEIL, [], green, { collide: false });
    G.wall('x', XE - 0.03, XE, ZN, ZS, F, CEIL, [], green, { collide: false });
    G.wall('x', X, X + 0.03, ZN, ZS, F, CEIL, [[23.0, 24.1, F, F + 2.2]], green, { collide: false });
    box(X, XE, CEIL - 0.04, CEIL, ZN, ZS, ph(0x2c342c, 2), { collide: false });                          // plafond
    const beige = ph(0x9a9684, 14, 0x222222), beigeD = ph(0x7d7a6b, 10), plastic = ph(0x2a2c2a, 20), wood = ph(0x3a3025, 6), metalG = ph(0x3f5240, 14), cloth = M().cloth, cloth2 = M().cloth2;
    // --- Lit défait sous la fenêtre (à 1,3 m de la porte : on entre sans le heurter) ---
    box(8.45, 9.6, F, F + 0.3, 22.45, 24.8, ph(0x241d16, 4));                                             // cadre
    box(8.5, 9.55, F + 0.3, F + 0.46, 22.5, 24.75, cloth, { tile: 1 });                                   // matelas
    box(8.55, 9.05, F + 0.46, F + 0.6, 22.55, 23.15, cloth2, { collide: false, tile: 1 }); box(9.05, 9.55, F + 0.46, F + 0.58, 22.6, 23.2, cloth2, { collide: false, tile: 1 });   // oreillers
    for (const [x, z, sx, sz, rot] of [[9.0, 23.9, 0.9, 0.8, 0.25], [8.95, 24.4, 0.7, 0.6, -0.3]]) { const q = mesh(new T.BoxGeometry(sx, 0.14, sz), cloth, x, F + 0.53, z, rot); q.rotation.z = 0.08; }   // draps en tas
    // --- Table de nuit (la clé USB est dessus) ---
    box(9.7, 10.25, F, F + 0.55, 22.45, 23.0, wood);
    // --- Étagère de livres (contre la cloison) ---
    box(X + 0.02, X + 0.4, F, F + 2.1, 26.4, 29.4, ph(0x2b2218, 4));
    for (let k = 0; k < 4; k++) for (let b = 0; b < 12; b++) { const h = 0.2 + rnd() * 0.12; box(X + 0.1, X + 0.38, F + 0.2 + k * 0.5, F + 0.2 + k * 0.5 + h, 26.5 + b * 0.24, 26.5 + b * 0.24 + 0.16, ph([0x4a3a2a, 0x2c3a46, 0x3a2c2c, 0x44463a][Math.floor(rnd() * 4)], 2), { collide: false }); }
    // --- Placard vert + micro-ondes (coin nord-est) ---
    box(10.85, XE - 0.03, F, F + 1.05, ZN + 0.03, 24.0, metalG); box(10.95, XE - 0.1, F + 1.05, F + 1.4, ZN + 0.1, 23.6, ph(0x1a1d1a, 20, 0x334433), { collide: false }); box(10.97, 11.15, F + 1.12, F + 1.34, 23.2, 23.55, ph(0x0a0c0a, 40, 0x445544), { collide: false });
    // --- Bureau en L (jambe est + jambe sud), plateau à 0,74 m ---
    const TOP = F + 0.74, topM = ph(0x3d352a, 6);
    box(10.75, XE - 0.03, TOP - 0.05, TOP, 24.4, ZS - 0.03, topM, { collide: true }); box(8.1, 10.75, TOP - 0.05, TOP, 28.75, ZS - 0.03, topM, { collide: true });
    for (const [x, z] of [[10.8, 24.45], [11.6, 24.45], [10.8, 28.7], [8.15, 28.8], [8.15, 29.6], [11.6, 29.6]]) box(x - 0.025, x + 0.025, F, TOP - 0.05, z - 0.025, z + 0.025, IRON, { collide: false });
    box(10.9, XE - 0.1, F + 0.1, F + 0.7, 26.0, 28.4, ph(0x232522, 6), { collide: false });             // caisson sous le bureau
    // Moniteurs CRT : un allumé (neige verte), deux éteints empilés ; claviers ; imprimante ; tours d'ordinateur
    const crt = (x, z, ry, y, on) => { const g = new T.Group(); g.position.set(x, y, z); g.rotation.y = ry;
      const b1 = new T.Mesh(new T.BoxGeometry(0.46, 0.42, 0.44), beige); b1.position.set(0, 0.21, 0); g.add(b1); const b2 = new T.Mesh(new T.BoxGeometry(0.36, 0.3, 0.2), beigeD); b2.position.set(0, 0.21, -0.3); g.add(b2);
      const sc = new T.Mesh(new T.PlaneGeometry(0.33, 0.26), on ? new T.MeshBasicMaterial({ map: G.crtStat.texture }) : ph(0x0a100c, 90, 0x8aa0a0)); sc.position.set(0, 0.23, 0.221); g.add(sc); G.scene.add(g); return g; };
    G.crtStat = G.makeStatic();
    crt(11.05, 27.2, -Math.PI / 2, TOP, true); crt(9.2, 29.05, Math.PI, TOP, false); crt(9.2, 29.05, Math.PI + 0.2, TOP + 0.42, false); crt(8.7, 29.1, Math.PI - 0.1, TOP, false);
    G.animated.push({ t: 0, update(dt) { this.t += dt; if (this.t > 0.07) { this.t = 0; G.crtStat.update(performance.now() / 1000); } } });
    G.addLamp({ x: 10.5, y: TOP + 0.4, z: 27.2, color: 0x7dffb0, I: 1.1, dist: 7, flicker: 0.25, halo: 0.8, bulb: false });          // lueur verte de l'écran
    for (const [x, z, sx, sz] of [[10.95, 25.5, 0.2, 0.45], [10.95, 26.1, 0.2, 0.45]]) box(x - sx / 2, x + sx / 2, TOP, TOP + 0.04, z - sz / 2, z + sz / 2, ph(0x8a8776, 8), { collide: false });   // claviers
    box(10.9, 11.5, TOP, TOP + 0.2, 24.5, 25.0, beigeD, { collide: false });                                                                                                                      // imprimante
    for (const [x, z, h] of [[10.2, 29.1, 0.5], [9.75, 28.95, 0.45], [11.3, 29.3, 0.45]]) box(x - 0.1, x + 0.1, F, F + h, z - 0.22, z + 0.22, beige, { collide: false });                          // tours posées au sol
    for (const [x, z] of [[8.9, 28.1], [9.3, 28.45], [8.6, 27.6]]) box(x - 0.2, x + 0.2, F, F + 0.4, z - 0.17, z + 0.17, beigeD, { collide: false });                                              // boîtiers ouverts
    // Lampe d'architecte rouge (coin du bureau) : tige, tête, lueur rouge
    const lampRed = ph(0x6a1a14, 20), head = mesh(new T.CylinderGeometry(0.03, 0.08, 0.14, 10), lampRed, 11.3, TOP + 0.55, 25.3); head.rotation.z = 0.5;
    mesh(new T.CylinderGeometry(0.008, 0.008, 0.5, 5), IRON, 11.4, TOP + 0.28, 25.2); G.addLamp({ x: 11.2, y: TOP + 0.5, z: 25.3, color: 0xff4030, I: 0.45, dist: 3.5, halo: 0.4, bulb: false });
    // Chaise de bureau (légèrement tournée), tasses, CD, papiers, téléphone
    const ch = new T.Group(); ch.position.set(9.9, F, 27.3); ch.rotation.y = 0.7; G.scene.add(ch);
    const seat = new T.Mesh(new T.BoxGeometry(0.46, 0.07, 0.46), ph(0x24282a, 4)); seat.position.y = 0.5; ch.add(seat); const back = new T.Mesh(new T.BoxGeometry(0.44, 0.5, 0.06), ph(0x24282a, 4)); back.position.set(0, 0.78, -0.22); back.rotation.x = -0.12; ch.add(back);
    const post = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 0.45, 6), IRON); post.position.y = 0.25; ch.add(post); for (let k = 0; k < 5; k++) { const a = k * 1.2566; const leg = new T.Mesh(new T.BoxGeometry(0.05, 0.03, 0.3), IRON); leg.position.set(Math.sin(a) * 0.15, 0.03, Math.cos(a) * 0.15); leg.rotation.y = a; ch.add(leg); }
    const cup = (x, z) => mesh(new T.CylinderGeometry(0.04, 0.032, 0.09, 8), ph(0x9a9a92, 20), x, TOP + 0.045, z);
    cup(11.0, 28.2); cup(10.5, 28.95); cup(9.9, 29.4);
    for (const [x, z] of [[10.4, 29.0], [9.0, 29.3], [11.3, 25.9], [11.4, 26.7]]) { const cd = mesh(new T.CylinderGeometry(0.06, 0.06, 0.004, 14), ph(0xb8bcc0, 90, 0xffffff), x, TOP + 0.01, z); }
    for (const [x, z, r] of [[10.2, 28.9, 0.3], [11.35, 27.9, 0.1], [8.5, 29.3, 0.5], [11.4, 24.9, 0]]) { box(x - 0.14, x + 0.14, TOP, TOP + 0.03 + rnd() * 0.04, z - 0.1, z + 0.1, ph(0x908c80, 2), { collide: false }); }
    box(8.9, 9.2, TOP, TOP + 0.08, 28.85, 29.05, ph(0x1a1c1a, 30), { collide: false });                    // téléphone
    // Sol : quelques papiers et boîtes seulement (le passage reste libre)
    for (let k = 0; k < 12; k++) { const x = 8.6 + rnd() * 2.0, z = 26.0 + rnd() * 2.4, s = 0.08 + rnd() * 0.12; box(x - s, x + s, F, F + 0.05 + rnd() * 0.14, z - s * 0.8, z + s * 0.8, ph([0x6a5f48, 0x4a4234, 0x8d8a78, 0x2a2c2a][k % 4], 2), { collide: false }); }
    // Lumière d'ambiance : une ampoule nue très faible ; la lune par la fenêtre (verdâtre)
    G.addLamp({ x: 9.5, y: CEIL - 0.25, z: 26.0, color: 0x9fd0a0, I: 0.32, dist: 7, halo: 0.5 });
    G.addLamp({ x: 8.8, y: F + 2.1, z: 22.8, color: 0x7fa090, I: 0.35, dist: 5, halo: 0, bulb: false });
    // --- Briquet Bic (objet) : sur le bureau ---
    const lighter = new T.Group(); const bm = new T.Mesh(new T.BoxGeometry(0.024, 0.075, 0.013), ph(0x82868a, 40, 0x555555)); const cp = new T.Mesh(new T.BoxGeometry(0.022, 0.014, 0.012), ph(0xb9bcbe, 90, 0xffffff)); cp.position.y = 0.043; lighter.add(bm, cp);
    lighter.position.set(11.1, TOP + 0.0125, 26.8); lighter.rotation.set(Math.PI / 2, 0, 0.7); G.scene.add(lighter);
    const lit = { id: 'lighter', pos: new T.Vector3(11.1, TOP + 0.1, 26.8), radius: 1.9, prompt: 'Ramasser le briquet', use() { lighter.visible = false; G.interactables = G.interactables.filter(i => i.id !== 'lighter'); G.have = G.have || []; G.have.push('bic-gris'); G.say('Un Bic gris. Un classique. Le premier de la collection.'); if (G.audio.flick) G.audio.flick(); } };
    G.interactables.push(lit); G.onReset.push(() => { lighter.visible = true; if (!G.interactables.includes(lit)) G.interactables.push(lit); });
    // ---------- L'ÉMOTION : Mila dort dans le lit, sa veilleuse reste allumée, ses dessins sont aux murs, le mot de Roman sur le bureau ----------
    const skin = ph(0x8a6f5f, 4), hair = ph(0x1a1410, 4), blanket = ph(0x3a4540, 3);
    const milaHead = new T.Mesh(new T.SphereGeometry(0.085, 12, 10), skin); milaHead.position.set(9.0, F + 0.68, 22.95); milaHead.scale.set(1, 0.95, 1.05); G.scene.add(milaHead);                    // tête sur l'oreiller
    const hairM = new T.Mesh(new T.SphereGeometry(0.092, 12, 10), hair); hairM.position.set(9.0, F + 0.7, 22.92); hairM.scale.set(1.02, 0.9, 1.05); G.scene.add(hairM);
    const lump = new T.Mesh(new T.BoxGeometry(0.62, 0.2, 1.05), blanket); lump.position.set(9.02, F + 0.56, 23.78); lump.rotation.y = 0.05; G.scene.add(lump);                  // son corps sous la couverture
    const shoulder = new T.Mesh(new T.SphereGeometry(0.17, 10, 8), blanket); shoulder.position.set(9.0, F + 0.6, 23.25); shoulder.scale.set(1.6, 0.8, 1); G.scene.add(shoulder);
    const hand = new T.Mesh(new T.SphereGeometry(0.03, 8, 6), skin); hand.position.set(8.82, F + 0.62, 23.12); G.scene.add(hand);
    G.animated.push({ update() { const t = performance.now() / 1000; lump.scale.y = 1 + Math.sin(t * 1.7) * 0.05; shoulder.scale.y = 0.8 + Math.sin(t * 1.7) * 0.04; } });   // elle respire (un peu court)
    G.interactables.push({ id: 'mila', pos: new T.Vector3(9.0, F + 0.9, 23.3), radius: 2.4, prompt: 'Regarder Mila',
      use() { if (G.flag('mila_seen')) G.say('Mila dort. Son souffle siffle un peu. Les filtres sont presque vides.', 5000); else { G.flag('mila_seen', true); G.collect('mila_sleeping', 'MILA', 'Elle dort sur le côté, un poing sous le menton.\nSon souffle siffle. Le filtre de sa chambre est presque vide.\nTu lui remontes la couverture. Elle ne se réveille pas.'); } } });
    // Veilleuse (« je garde la lumière allumée ») : petite lumière chaude, seule source douce de la pièce
    const nl = new T.Mesh(new T.CylinderGeometry(0.035, 0.05, 0.09, 10), ph(0xf0c890, 30)); nl.position.set(9.88, F + 0.6, 22.62); G.scene.add(nl);
    G.addLamp({ x: 9.88, y: F + 0.72, z: 22.62, color: 0xffc080, I: 0.55, dist: 4.2, halo: 0.9 });
    // Le mot de Mila (sur la table de nuit) et la clé USB à côté
    const paper = (x, y, z, ry, w, h, tex, rx) => { const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: tex, color: 0x9a9a92 })); m.position.set(x, y, z); m.rotation.set(rx === undefined ? -Math.PI / 2 : rx, ry, 0, 'YXZ'); G.scene.add(m); return m; };
    const crayon = (kind) => {
      const c = document.createElement('canvas'); c.width = 128; c.height = 96; const g = c.getContext('2d'); g.fillStyle = '#d8d2c0'; g.fillRect(0, 0, 128, 96);
      const line = (col, w) => { g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; };
      if (kind === 0) { line('#b8352a', 3); g.beginPath(); g.arc(40, 30, 7, 0, 6.3); g.moveTo(40, 37); g.lineTo(40, 66); g.moveTo(40, 45); g.lineTo(26, 58); g.moveTo(40, 66); g.lineTo(32, 86); g.moveTo(40, 66); g.lineTo(48, 86); g.stroke();
        line('#2a5aa8', 3); g.beginPath(); g.arc(78, 52, 5, 0, 6.3); g.moveTo(78, 57); g.lineTo(78, 74); g.moveTo(78, 62); g.lineTo(58, 56); g.moveTo(78, 74); g.lineTo(72, 88); g.moveTo(78, 74); g.lineTo(84, 88); g.stroke();
        line('#d8a820', 3); g.beginPath(); g.arc(104, 18, 9, 0, 6.3); g.stroke(); for (let a = 0; a < 6.3; a += 0.8) { g.beginPath(); g.moveTo(104 + Math.cos(a) * 12, 18 + Math.sin(a) * 12); g.lineTo(104 + Math.cos(a) * 17, 18 + Math.sin(a) * 17); g.stroke(); } }
      else if (kind === 1) { line('#6a4a2a', 3); g.beginPath(); g.ellipse(70, 62, 22, 11, 0, 0, 6.3); g.moveTo(90, 54); g.lineTo(100, 44); g.moveTo(52, 70); g.lineTo(50, 86); g.moveTo(62, 72); g.lineTo(62, 86); g.moveTo(80, 72); g.lineTo(80, 86); g.moveTo(88, 70); g.lineTo(92, 86); g.moveTo(48, 58); g.lineTo(38, 50); g.stroke(); g.beginPath(); g.arc(104, 40, 8, 0, 6.3); g.stroke(); line('#2a5aa8', 3); g.beginPath(); g.arc(18, 34, 6, 0, 6.3); g.moveTo(18, 40); g.lineTo(18, 66); g.moveTo(18, 48); g.lineTo(34, 56); g.moveTo(18, 66); g.lineTo(12, 84); g.moveTo(18, 66); g.lineTo(26, 84); g.stroke(); }
      else { g.fillStyle = '#1c2438'; g.fillRect(0, 0, 128, 96); g.fillStyle = '#e0c060'; g.fillRect(52, 40, 22, 22); line('#e0c060', 2); g.strokeRect(46, 34, 34, 40); g.fillStyle = '#c8c8c0'; for (let i = 0; i < 14; i++) g.fillRect((i * 37) % 120 + 4, (i * 23) % 30 + 4, 2, 2); g.fillStyle = '#10141c'; g.fillRect(0, 74, 128, 22); line('#d8d2c0', 2); g.beginPath(); g.arc(100, 66, 5, 0, 6.3); g.moveTo(100, 71); g.lineTo(100, 86); g.stroke(); }
      const t = new T.CanvasTexture(c); t.magFilter = T.NearestFilter; return t; };
    const noteTex = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 48; const g = c.getContext('2d'); g.fillStyle = '#d8d2c0'; g.fillRect(0, 0, 64, 48); g.fillStyle = '#4a4a50'; for (let i = 0; i < 5; i++) g.fillRect(6, 8 + i * 7, 30 + (i * 11) % 22, 2); const t = new T.CanvasTexture(c); t.magFilter = T.NearestFilter; return t; })();
    paper(9.78, F + 0.556, 22.86, 0.3, 0.14, 0.1, noteTex);
    G.interactables.push({ id: 'mila_note', pos: new T.Vector3(9.78, F + 0.6, 22.86), radius: 1.6, prompt: 'Lire le mot',
      use() { G.collect('mila_note', 'MOT DE MILA', '« Reviens avant la nuit.\n  Je garde la lumière allumée.\n  M. »\n\n(Elle a dessiné un petit soleil dans le coin.)'); } });
    // Dessins de Mila, collés sur la cloison (face est), entre la porte et l'étagère
    [[24.55, 0, 'draw_1', '« DIMA ET MOI »', 'Deux bonshommes qui se tiennent la main, sous un soleil jaune.\nIl n\'y a pas eu de soleil depuis six ans. Elle l\'a dessiné quand même.'],
     [25.25, 1, 'draw_2', '« PIRATE »', 'Un chien à quatre pattes, et toi, tout petit, à côté.\nPirate. Le chien qu\'on a perdu l\'hiver dernier. Elle ne dit plus son nom.'],
     [25.95, 2, 'draw_3', '« LA FENÊTRE ALLUMÉE »', 'La nuit, une seule fenêtre éclairée. En dessous, d\'une écriture d\'enfant :\n« pour que Dima retrouve la maison ».']].forEach(([z, kind, id, title, text]) => {
      paper(7.245, F + 1.45, z, Math.PI / 2, 0.42, 0.32, crayon(kind), 0);
      G.interactables.push({ id, pos: new T.Vector3(7.5, F + 1.45, z), radius: 1.8, prompt: 'Regarder le dessin', use() { G.collect(id, title, text); } });
    });
    // Le mot de Roman sur le bureau
    paper(11.2, TOP + 0.012, 25.5, -0.4, 0.2, 0.14, noteTex);
    G.interactables.push({ id: 'roman_note', pos: new T.Vector3(11.2, TOP + 0.1, 25.5), radius: 1.6, prompt: 'Lire le mot',
      use() { G.collect('roman_note', 'UN MOT DE ROMAN', '« Dima.\n  Une clé, un contact, avant la nuit.\n  Fais pas le malin.\n  Tu sais ce que ça coûte, le dispensaire.\n                                   — R. »'); } });
    G.usbSpot = [10.1, F + 0.56, 22.8];
  };
  G.loaded.push('building');
})();
