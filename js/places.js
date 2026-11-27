/* =====================================================================
   places.js : les LIEUX et les gros éléments de décor, placés sur le tracé de city.js.
   Marché, place, escalier + terrasse haute, passerelles, viaduc en ruine + garage, barrages de police,
   pylônes, bouche de métro, épaves, scooters, bennes, fûts qui brûlent...
   Les petits détails (saleté, câbles, devantures, débris) sont dans dressing.js.
   ===================================================================== */
(function () {
  'use strict';
  const G = window.G, T = G.T;
  const C = () => G.city, M = () => G.mat, A = (c, r) => G.mapWorld(c, r);
  const rnd = () => G.rnd();
  const ph = (c, s) => new T.MeshPhongMaterial({ color: c, shininess: s === undefined ? 4 : s, side: T.DoubleSide });
  const PAL = [0x3b4038, 0x4a4540, 0x2f3a3c, 0x4b3f38, 0x37393f, 0x44453c].map(c => ph(c, 2));       // bâches, tissus : tons ternes
  const pick = arr => arr[Math.floor(rnd() * arr.length)];
  const block = (x0, x1, y0, y1, z0, z1, mat) => G.B(x0, x1, y0, y1, z0, z1, mat || M().concreteDark, { grime: false });
  const toWorld = (x, z, ry, lx, lz) => [x + lx * Math.cos(ry) + lz * Math.sin(ry), z - lx * Math.sin(ry) + lz * Math.cos(ry)];
  const mesh = (geo, mat, x, y, z, parent) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); (parent || G.scene).add(m); return m; };

  /* ---------- Éléments de base ---------- */
  function lamp(x, z, ax, az, o) {                                  // lampadaire sodium : pied en (x,z), bras vers (ax,az)
    o = o || {};
    const pole = mesh(new T.CylinderGeometry(0.05, 0.07, 5.4, 8), M().iron, x, 2.7, z), ang = Math.atan2(ax - x, az - z);
    const arm = mesh(new T.BoxGeometry(0.07, 0.07, 1.0), M().iron, x + Math.sin(ang) * 0.5, 5.4, z + Math.cos(ang) * 0.5); arm.rotation.y = ang;
    G.addBoxCollider(x - 0.08, x + 0.08, 0, 5.4, z - 0.08, z + 0.08);
    const broken = o.broken !== undefined ? o.broken : rnd() < 0.12;                   // certains sont morts : plus noir, plus Outlast
    G.addLamp({ x: x + Math.sin(ang) * 1.0, y: 5.3, z: z + Math.cos(ang) * 1.0, color: o.color || 0xffa44a, I: broken ? 0 : (o.I || 0.95), dist: 14, halo: broken ? 0 : (o.halo || 5.5), flicker: o.flicker !== undefined ? o.flicker : (rnd() < 0.3 ? 0.45 : 0), fogHalo: true });
  }
  function barrel(x, z) {
    mesh(new T.CylinderGeometry(0.3, 0.3, 0.9, 14), M().metal, x, 0.45, z);
    for (const y of [0.08, 0.45, 0.82]) mesh(new T.CylinderGeometry(0.315, 0.315, 0.04, 14), M().iron, x, y, z);
    G.addBoxCollider(x - 0.3, x + 0.3, 0, 0.9, z - 0.3, z + 0.3);
  }
  function fireBarrel(x, z) {                                       // fût qui brûle : vraie lumière chaude qui vacille
    barrel(x, z);
    const f = new T.Sprite(new T.SpriteMaterial({ map: G.glowTex, color: 0xff8a3a, blending: T.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.7 }));
    f.position.set(x, 1.05, z); f.scale.set(0.9, 1.1, 1); G.scene.add(f);
    G.animated.push({ update() { f.scale.set(0.8 + 0.25 * Math.random(), 1.0 + 0.4 * Math.random(), 1); } });
    G.addLamp({ x, y: 1.3, z, color: 0xff8a3a, I: 1.2, dist: 10, halo: 2.4, flicker: 6, bulb: false });
  }
  function crate(x, z, s, h) { mesh(new T.BoxGeometry(s, h, s), M().wood, x, h / 2, z).rotation.y = (rnd() - 0.5) * 0.4; G.addBoxCollider(x - s / 2, x + s / 2, 0, h, z - s / 2, z + s / 2); }
  function barrier(x, z, ry, len) {                                  // plot de béton bas, à enjamber (aligné sur un axe)
    len = len || 1.6; const alongX = Math.abs(Math.sin(ry)) < 0.7, w = alongX ? len : 0.6, d = alongX ? 0.6 : len;
    block(x - w / 2, x + w / 2, 0, 0.85, z - d / 2, z + d / 2);
  }
  function dumpster(x, z, ry) {
    const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = ry; G.scene.add(g);
    mesh(new T.BoxGeometry(1.8, 1.0, 1.0), M().dumpster, 0, 0.55, 0, g);
    const lid = mesh(new T.BoxGeometry(1.86, 0.06, 1.05), M().dumpster, 0, 1.12, -0.35, g); lid.rotation.x = 0.4;       // couvercle entrouvert
    for (const sx of [-0.7, 0.7]) for (const sz of [-0.4, 0.4]) mesh(new T.CylinderGeometry(0.08, 0.08, 0.06, 8), M().iron, sx, 0.08, sz, g).rotation.z = Math.PI / 2;
    G.addOBBCollider(x, z, 1.8, 1.0, ry, 0, 1.1);
  }
  function wreck(x, z, ry, o) {                                       // épave : carrosserie, habitacle, roues ; o.van = fourgon
    o = o || {}; const L = o.van ? 5.0 : 4.2, Hh = o.van ? 1.7 : 0.75;
    const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = ry;
    const add = (geo, mat, px, py, pz) => { const m = new T.Mesh(geo, mat); m.position.set(px, py, pz); g.add(m); return m; };
    add(new T.BoxGeometry(L, Hh, 1.9), o.mat || M().metal, 0, 0.55 + Hh / 2 - 0.15, 0);
    if (!o.van) { add(new T.BoxGeometry(2.1, 0.7, 1.6), o.mat || M().metal, -0.3, 1.3, 0); add(new T.BoxGeometry(1.9, 0.5, 1.62), M().glass, -0.3, 1.34, 0); }
    else add(new T.BoxGeometry(1.4, 0.7, 1.92), M().glass, L / 2 - 1.0, 1.7, 0);
    for (const [px, pz] of [[L / 2 - 0.8, 0.95], [L / 2 - 0.8, -0.95], [-L / 2 + 0.8, 0.95], [-L / 2 + 0.8, -0.95]]) add(new T.CylinderGeometry(0.34, 0.34, 0.25, 12), M().iron, px, 0.34, pz).rotation.x = Math.PI / 2;
    G.scene.add(g); G.addOBBCollider(x, z, L, 1.9, ry, 0, o.van ? 2.0 : 1.05); return g;
  }
  function scooter(x, z, ry) {                                       // scooter / triporteur abandonné
    const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = ry; G.scene.add(g);
    mesh(new T.BoxGeometry(1.5, 0.35, 0.5), M().plastic, 0, 0.5, 0, g); mesh(new T.BoxGeometry(0.5, 0.3, 0.45), M().cloth, -0.3, 0.8, 0, g);
    mesh(new T.CylinderGeometry(0.28, 0.28, 0.12, 10), M().iron, 0.6, 0.28, 0, g).rotation.x = Math.PI / 2; mesh(new T.CylinderGeometry(0.28, 0.28, 0.12, 10), M().iron, -0.6, 0.28, 0, g).rotation.x = Math.PI / 2;
    mesh(new T.BoxGeometry(0.06, 0.06, 0.8), M().iron, 0.7, 1.0, 0, g); G.addOBBCollider(x, z, 1.6, 0.6, ry, 0, 0.9);
  }
  function tree(x, z, y0) {                                           // arbre mort : tronc effilé + branches (y0 = hauteur du sol)
    y0 = y0 || 0; const g = new T.Group(); g.position.set(x, y0, z); const mat = M().iron;
    mesh(new T.CylinderGeometry(0.1, 0.22, 4.5, 7), mat, 0, 2.25, 0, g);
    for (let i = 0; i < 6; i++) { const a = i * 1.05 + rnd(), L = 1.4 + rnd() * 1.4, br = mesh(new T.CylinderGeometry(0.02, 0.07, L, 5), mat, Math.cos(a) * L * 0.3, 3.2 + rnd() * 1.3, Math.sin(a) * L * 0.3, g); br.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9); }
    G.scene.add(g); G.addBoxCollider(x - 0.2, x + 0.2, y0, y0 + 4.5, z - 0.2, z + 0.2);
  }
  function gate(cx, cz, dirx, dirz, hw) {                              // grille fermée en travers d'une ruelle
    const px = -dirz, pz = dirx;
    G.addSegCollider(cx - px * hw, cz - pz * hw, cx + px * hw, cz + pz * hw, 0, 3.2);
    const im = new T.InstancedMesh(new T.CylinderGeometry(0.02, 0.02, 3.0, 5), M().iron, Math.round(hw * 2 / 0.14)), d = new T.Object3D();
    for (let i = 0; i < im.count; i++) { const s = -hw + i * 0.14; d.position.set(cx + px * s, 1.5, cz + pz * s); d.updateMatrix(); im.setMatrixAt(i, d.matrix); }
    G.scene.add(im);
    for (const y of [0.1, 1.5, 2.95]) mesh(new T.BoxGeometry(hw * 2, 0.06, 0.06), M().iron, cx, y, cz).rotation.y = Math.atan2(-pz, px);
  }
  // Un policier (utilisé par cops.js) : squelette articulé (bassin > torse > épaules > coudes ; hanches > genoux), casque + lampe frontale.
  // Chaque articulation est un "pivot" (Group) qu'on tourne pour animer ; le dessin est dans cops.js (animate).
  G.COP_STYLE = 'stick';   // 'stick' = stickman provisoire ; 'detail' = corps détaillé (manteau, masque) / modèle 3D
  // STICKMAN (provisoire, en attendant un vrai modèle) : mêmes pivots que le corps détaillé, donc mêmes animations (cops.js).
  function makeStickCop() {
    const g = new T.Group(), rig = {}, m = new T.MeshPhongMaterial({ color: 0x4a5056, shininess: 2, specular: 0x000000 });
    const pivot = (parent, x, y, z) => { const q = new T.Group(); q.position.set(x, y, z); parent.add(q); return q; };
    const rod = (parent, y0, y1, r) => { const q = new T.Mesh(new T.CylinderGeometry(r, r, y0 - y1, 6), m); q.position.set(0, (y0 + y1) / 2, 0); parent.add(q); };
    const dot = (parent, x, y, z, r) => { const q = new T.Mesh(new T.SphereGeometry(r, 8, 6), m); q.position.set(x, y, z); parent.add(q); };
    rig.hips = pivot(g, 0, 0.98, 0); rig.torso = pivot(rig.hips, 0, 0.05, 0); rod(rig.torso, 0, 0.62, 0.03);
    rig.neck = pivot(rig.torso, 0, 0.62, 0); rig.head = pivot(rig.neck, 0, 0.1, 0); dot(rig.head, 0, 0.02, 0, 0.1);
    const lampBody = new T.Mesh(new T.CylinderGeometry(0.022, 0.028, 0.05, 8), m); lampBody.rotation.x = Math.PI / 2; lampBody.position.set(0, 0.06, 0.1); rig.head.add(lampBody);
    const beam = new T.Mesh(new T.CylinderGeometry(1.1, 0.03, 8, 14, 1, true), new T.MeshBasicMaterial({ color: 0xcfe0ff, transparent: true, opacity: 0.035, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
    beam.rotation.x = Math.PI / 2 - 0.5; beam.position.set(0, 0.06, 4.2); rig.head.add(beam); rig.beam = beam;
    // Halo de la lampe frontale : visible de loin à travers la brume (non atténué par le brouillard) -> on repère un policier AVANT d'être sur lui
    if (G.glowTex) { const halo = new T.Sprite(new T.SpriteMaterial({ map: G.glowTex, color: 0xdfeaff, blending: T.AdditiveBlending, transparent: true, depthWrite: false, fog: false, opacity: 0.65 })); halo.position.set(0, 0.07, 0.14); halo.scale.set(1.6, 1.6, 1); rig.head.add(halo); }
    for (const sd of [-1, 1]) {
      const sh = pivot(rig.torso, sd * 0.2, 0.55, 0); rod(sh, 0, -0.36, 0.022); dot(sh, 0, 0, 0, 0.03);
      const el = pivot(sh, 0, -0.36, 0); rod(el, 0, -0.34, 0.02); dot(el, 0, -0.35, 0, 0.03);
      rig['sh' + sd] = sh; rig['el' + sd] = el;
      const hip = pivot(rig.hips, sd * 0.08, -0.04, 0); rod(hip, 0, -0.46, 0.026);
      const kn = pivot(hip, 0, -0.46, 0); rod(kn, 0, -0.46, 0.024); dot(kn, 0, 0, 0, 0.03);
      rig['hip' + sd] = hip; rig['kn' + sd] = kn;
    }
    rod(rig.hips, 0.02, -0.04, 0.03);
    g.userData.rig = rig; g.userData.parts = rig; return g;
  }
  G.makeCop = function () {
    if (G.COP_STYLE === 'stick') return makeStickCop();
    const g = new T.Group(), rig = {};
    const mat = (c, sh, sp) => new T.MeshPhongMaterial({ color: c, shininess: sh, specular: sp === undefined ? 0x222222 : sp });
    const leather = mat(0x16191c, 18, 0x14181b), leather2 = mat(0x1d2124, 14, 0x12161a), black = mat(0x0a0b0c, 30, 0x1a1e22), mask = mat(0x1b1e20, 14, 0x15191c),
      glass = mat(0x070b0c, 110, 0x8aa0b0), strap = mat(0x1d1812, 12, 0x201a14), metal = mat(0x23282c, 40, 0x4a5258);
    const pivot = (parent, x, y, z) => { const q = new T.Group(); q.position.set(x, y, z); parent.add(q); return q; };
    const lathe = (pts, seg, m, parent, x, y, z, sx, sy, sz, open) => { const q = new T.Mesh(new T.LatheGeometry(pts.map(p => new T.Vector2(p[0], p[1])), seg), m); q.position.set(x || 0, y || 0, z || 0); q.scale.set(sx || 1, sy || 1, sz || 1); if (open) q.material = m.clone(), q.material.side = T.DoubleSide; parent.add(q); return q; };
    const ell = (parent, m, x, y, z, rx, ry, rz) => { const q = new T.Mesh(new T.SphereGeometry(1, 14, 10), m); q.position.set(x, y, z); q.scale.set(rx, ry, rz); parent.add(q); return q; };
    const tube = (parent, m, y0, y1, r0, r1, seg) => { const h = y0 - y1, q = new T.Mesh(new T.CylinderGeometry(r0, r1, h, seg || 12, 1), m); q.position.set(0, (y0 + y1) / 2, 0); parent.add(q); return q; };

    const MODEL = !!(G.copModelReady && G.copModelReady());                                          // un modèle 3D riggé fournit le corps : on ne dessine alors que l'habillement
    rig.hips = pivot(g, 0, 0.98, 0);
    if (!MODEL) ell(rig.hips, leather, 0, 0.0, 0, 0.2, 0.14, 0.15);                                            // bassin
    // Long manteau de cuir : un jupon évasé qui tombe jusqu'aux mollets (porté par le bassin, il balance avec la marche)
    rig.skirt = lathe([[0.19, 0.12], [0.22, 0.0], [0.25, -0.3], [0.29, -0.55], [0.3, -0.6]], 16, leather, rig.hips, 0, 0, 0, 1, 1, 0.82, true);
    rig.torso = pivot(rig.hips, 0, 0.05, 0);
    // Torse : profil lissé (taille -> poitrine -> épaules), aplati d'avant en arrière
    if (!MODEL) lathe([[0.15, -0.04], [0.17, 0.12], [0.22, 0.32], [0.25, 0.46], [0.2, 0.56], [0.09, 0.61]], 16, leather, rig.torso, 0, 0, 0, 1.18, 1, 0.78);
    // Grand col relevé + revers
    const col = new T.Mesh(new T.CylinderGeometry(0.15, 0.1, 0.12, 14, 1, true), leather2); col.material.side = T.DoubleSide; col.position.set(0, 0.62, -0.01); col.rotation.x = -0.12; rig.torso.add(col);
    for (const sd of [-1, 1]) { const rev = new T.Mesh(new T.BoxGeometry(0.1, 0.34, 0.025), leather2); rev.position.set(sd * 0.1, 0.42, 0.185); rev.rotation.z = sd * 0.28; rev.rotation.y = -sd * 0.25; rig.torso.add(rev); }
    // Sangle en travers de la poitrine, ceinture, étui et matraque
    const sb = new T.Mesh(new T.BoxGeometry(0.045, 0.62, 0.02), strap); sb.position.set(-0.02, 0.33, 0.2); sb.rotation.z = 0.62; rig.torso.add(sb);
    const belt = new T.Mesh(new T.CylinderGeometry(0.205, 0.215, 0.07, 16, 1, true), strap); belt.material.side = T.DoubleSide; belt.position.set(0, 0.04, 0); belt.scale.z = 0.82; rig.torso.add(belt);
    const buckle = new T.Mesh(new T.BoxGeometry(0.06, 0.05, 0.02), metal); buckle.position.set(0, 0.04, 0.18); rig.torso.add(buckle);
    const holster = new T.Mesh(new T.BoxGeometry(0.07, 0.2, 0.08), black); holster.position.set(0.2, -0.06, 0.04); rig.torso.add(holster);
    const baton = new T.Mesh(new T.CylinderGeometry(0.02, 0.026, 0.5, 8), black); baton.position.set(-0.21, -0.2, 0.03); baton.rotation.z = 0.08; rig.torso.add(baton);
    rig.neck = pivot(rig.torso, 0, 0.62, 0);
    if (!MODEL) tube(rig.neck, mask, 0.07, -0.02, 0.055, 0.06, 10);
    rig.head = pivot(rig.neck, 0, 0.1, 0);
    // Tête : cagoule de cuir, masque à gaz (deux gros verres ronds, museau-filtre), casquette à visière
    ell(rig.head, mask, 0, 0, 0, 0.098, 0.12, 0.105);
    for (const sd of [-1, 1]) {
      const rim = new T.Mesh(new T.TorusGeometry(0.036, 0.008, 6, 14), black); rim.position.set(sd * 0.045, 0.01, 0.095); rim.rotation.y = sd * -0.15; rig.head.add(rim);
      const lens = new T.Mesh(new T.CircleGeometry(0.034, 14), glass); lens.position.set(sd * 0.045, 0.01, 0.097); lens.rotation.y = sd * -0.15; rig.head.add(lens);
    }
    const snout = new T.Mesh(new T.CylinderGeometry(0.04, 0.05, 0.11, 10), mask); snout.rotation.x = Math.PI / 2; snout.position.set(0, -0.05, 0.12); rig.head.add(snout);
    const filt = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 0.03, 10), metal); filt.rotation.x = Math.PI / 2; filt.position.set(0, -0.05, 0.19); rig.head.add(filt);
    const band = new T.Mesh(new T.CylinderGeometry(0.108, 0.112, 0.05, 16, 1, true), black); band.material.side = T.DoubleSide; band.position.set(0, 0.095, 0); rig.head.add(band);
    const cap = lathe([[0.0, 0.0], [0.15, 0.0], [0.14, 0.035], [0.105, 0.06]], 16, black, rig.head, 0, 0.115, 0.005, 1, 1, 1.05, true); cap.rotation.x = 0.1;
    const visor = new T.Mesh(new T.CylinderGeometry(0.1, 0.1, 0.012, 14, 1, false, -1.0, 2.0), black); visor.position.set(0, 0.1, 0.11); visor.rotation.x = 0.28; visor.rotation.y = Math.PI * 0.5 - 0.0; visor.scale.set(1.0, 1, 1); rig.head.add(visor);
    const lampBody = new T.Mesh(new T.CylinderGeometry(0.022, 0.028, 0.05, 8), metal); lampBody.rotation.x = Math.PI / 2; lampBody.position.set(0, 0.13, 0.16); rig.head.add(lampBody);   // lampe frontale sur la casquette
    const beam = new T.Mesh(new T.CylinderGeometry(1.1, 0.03, 8, 14, 1, true), new T.MeshBasicMaterial({ color: 0xcfe0ff, transparent: true, opacity: 0.035, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
    beam.rotation.x = Math.PI / 2 - 0.5; beam.position.set(0, 0.1, 4.2); rig.head.add(beam); rig.beam = beam;
    for (const sd of [-1, 1]) {
      const sh = pivot(rig.torso, sd * 0.29, 0.5, 0);                                           // épaule
      if (!MODEL) ell(sh, leather, 0, 0, 0, 0.085, 0.08, 0.085);
      if (!MODEL) { const up = new T.Mesh(new T.CylinderGeometry(0.075, 0.058, 0.36, 12), leather); up.position.set(0, -0.18, 0); sh.add(up); }                     // bras de manteau (manche large)
      const el = pivot(sh, 0, -0.36, 0);
      if (!MODEL) { ell(el, leather, 0, 0, 0, 0.062, 0.06, 0.062); const lo = new T.Mesh(new T.CylinderGeometry(0.06, 0.05, 0.34, 12), leather); lo.position.set(0, -0.17, 0); el.add(lo); ell(el, black, 0, -0.38, 0.01, 0.05, 0.075, 0.04); }                                         // main gantée
      rig['sh' + sd] = sh; rig['el' + sd] = el;
      const hip = pivot(rig.hips, sd * 0.1, -0.04, 0);                                           // hanche : cuisse sous le manteau
      const kn = pivot(hip, 0, -0.46, 0);
      if (!MODEL) { const th = new T.Mesh(new T.CylinderGeometry(0.095, 0.07, 0.46, 12), leather2); th.position.set(0, -0.23, 0); hip.add(th); ell(kn, leather2, 0, 0, 0, 0.07, 0.065, 0.07); const sn = new T.Mesh(new T.CylinderGeometry(0.068, 0.05, 0.44, 12), black); sn.position.set(0, -0.22, 0); kn.add(sn); }                     // haute botte de cuir
      if (!MODEL) ell(kn, black, 0, -0.47, 0.06, 0.06, 0.045, 0.13);                                         // pied
      rig['hip' + sd] = hip; rig['kn' + sd] = kn;
    }
    if (MODEL) G.attachCopModel(g, rig);
    g.userData.rig = rig; g.userData.parts = rig; return g;
  };

  /* ---------- Marché : étals bâchés, lampes nues ---------- */
  function stall(x, z, ry) {                                          // le devant de l'étal regarde +z local (vers la rue)
    const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = ry; G.scene.add(g);
    const tarp = pick(PAL);
    mesh(new T.BoxGeometry(2.4, 0.9, 0.7), M().wood, 0, 0.45, 0.5, g);
    for (const px of [-1.3, 1.3]) for (const [pz, h] of [[-0.6, 2.6], [0.95, 2.1]]) mesh(new T.CylinderGeometry(0.035, 0.035, h, 5), M().iron, px, h / 2, pz, g);
    mesh(new T.BoxGeometry(3.0, 0.04, 1.9), tarp, 0, 2.4, 0.2, g).rotation.x = 0.2;                                    // bâche penchée vers la rue
    mesh(new T.BoxGeometry(3.0, 0.5, 0.03), tarp, 0, 2.1, 1.12, g);                                                    // bavolet
    for (let i = 0; i < 9; i++) { const s = 0.1 + rnd() * 0.2; const it = mesh(rnd() < 0.5 ? new T.BoxGeometry(s, s * 0.8, s) : new T.CylinderGeometry(s * 0.45, s * 0.45, s, 7), pick(PAL), -1 + rnd() * 2, 0.9 + s * 0.4, 0.3 + rnd() * 0.4, g); it.rotation.y = rnd() * 3; }
    const c1 = toWorld(x, z, ry, 1.7, -0.2); if (rnd() < 0.7) crate(c1[0], c1[1], 0.7, 0.7 + rnd() * 0.5);
    const cw = toWorld(x, z, ry, 0, 0.5); G.addOBBCollider(cw[0], cw[1], 2.4, 0.7, ry, 0, 0.95);
    const lw = toWorld(x, z, ry, 0, 0.9); G.addLamp({ x: lw[0], y: 2.1, z: lw[1], color: 0xe6c488, I: 0.55, dist: 7, halo: 1.3, flicker: rnd() < 0.35 ? 0.5 : 0 });
  }
  function market() {
    const a = C().ALLEYS[0], L = C().alleyLen(a);
    for (let d = 13; d < L - 7; d += 8) for (const s of [-1, 1]) {
      if (rnd() < 0.15) continue;
      const off = s * (a.w - 1.5), p = C().alleyPoint(a, d + (s > 0 ? 3 : 0)), x = p.x - p.dz * off, z = p.z + p.dx * off;
      stall(x, z, Math.atan2(p.x - x, p.z - z));
    }
    const pl = C().PLACE;                                              // la place : quelques étals en anneau, désordre
    for (let i = 0; i < 7; i++) { const t = i / 7 * 6.283 + 0.4, x = pl.c[0] + Math.cos(t) * pl.rx * 0.62, z = pl.c[1] + Math.sin(t) * pl.rz * 0.62; if (i % 3 !== 1) stall(x, z, Math.atan2(pl.c[0] - x, pl.c[1] - z)); }
    // Fontaine à sec au centre de la place
    const f = pl.c;
    const ring = mesh(new T.CylinderGeometry(2.7, 2.9, 0.7, 16, 1, true), ph(0x3a3d3a, 3), f[0], 0.35, f[1]);
    const lip = mesh(new T.TorusGeometry(2.8, 0.14, 6, 20), M().concrete, f[0], 0.72, f[1]); lip.rotation.x = Math.PI / 2;
    const water = mesh(new T.CircleGeometry(2.7, 16), M().puddle, f[0], 0.3, f[1]); water.rotation.x = -Math.PI / 2;
    mesh(new T.CylinderGeometry(0.28, 0.4, 2.2, 10), M().concreteDark, f[0], 1.1, f[1]);
    for (let i = 0; i < 14; i++) { const t0 = i / 14 * 6.283, t1 = (i + 1) / 14 * 6.283; G.addSegCollider(f[0] + Math.cos(t0) * 2.9, f[1] + Math.sin(t0) * 2.9, f[0] + Math.cos(t1) * 2.9, f[1] + Math.sin(t1) * 2.9, 0, 0.75); }
    G.addBoxCollider(f[0] - 0.4, f[0] + 0.4, 0, 2.2, f[1] - 0.4, f[1] + 0.4);
    G.addLamp({ x: f[0], y: 2.5, z: f[1], color: 0xffa44a, I: 0.9, dist: 14, halo: 5, fogHalo: true, flicker: 0.12 });
    // Fûts qui brûlent : points chauds dans le froid
    const s0 = C().side(a, 24, 2.6); fireBarrel(s0[0], s0[1]); fireBarrel(f[0] + 8, f[1] + 5);
  }

  /* ---------- Terrasse haute (+3,2 m), escalier ---------- */
  function terrace() {
    const t = C().TERRACE, Y = 3.2;
    for (let i = 0; i < 16; i++) block(29.4, 34.6, 0, 0.2 * (i + 1), -58 - i * 0.75, -58 - (i + 1) * 0.75, i % 2 ? M().concrete : M().concreteDark);     // escalier : 16 marches
    block(t.c[0] - t.hx, t.c[0] + t.hx, Y - 0.6, Y, t.c[1] - t.hz, t.c[1] + t.hz, M().concrete);                       // le sol de la terrasse
    block(29.4, 34.6, Y - 0.6, Y, -70.7, -69.9, M().concrete);
    for (const [dx, dz] of [[-11, -6], [-3, -7.5], [6, -6.5], [12, -3], [-9, 4], [4, 6]]) { const x = t.c[0] + dx, z = t.c[1] + dz; block(x - 1.1, x + 1.1, Y, Y + 0.7, z - 0.5, z + 0.5, M().concreteDark); if (rnd() < 0.6) tree(x, z, Y + 0.7); }   // jardinières, arbres morts
    for (const [dx, dz] of [[-6, 6], [8, 7]]) { const x = t.c[0] + dx, z = t.c[1] + dz; block(x - 0.9, x + 0.9, Y + 0.38, Y + 0.45, z - 0.25, z + 0.25, M().wood); block(x - 0.8, x - 0.7, Y, Y + 0.38, z - 0.2, z + 0.2, M().iron); block(x + 0.7, x + 0.8, Y, Y + 0.38, z - 0.2, z + 0.2, M().iron); }   // bancs
    const wx = t.c[0] + 13, wz = t.c[1] - 7;                                                                              // citerne d'eau rouillée
    mesh(new T.CylinderGeometry(1.2, 1.2, 2.6, 14), M().metal, wx, Y + 1.3, wz); G.addBoxCollider(wx - 1.1, wx + 1.1, Y, Y + 2.6, wz - 1.1, wz + 1.1);
    for (const [dx, dz] of [[-13, 5], [0, 8], [11, 8]]) G.addLamp({ x: t.c[0] + dx, y: Y + 3.6, z: t.c[1] + dz, color: 0xd9d09a, I: 0.9, dist: 11, halo: 1.5, flicker: rnd() < 0.5 ? 0.4 : 0 });
    G.terraceY = Y;
  }
  /* ---------- Passerelles au-dessus des ruelles, avec leur petit escalier de caisses ---------- */
  function bridge(c, r, axis, len) {
    const p = A(c, r), Y = 4.4, hw = 0.8;
    if (axis === 'x') { block(p[0] - len, p[0] + len, Y - 0.25, Y, p[1] - hw, p[1] + hw, M().iron); for (const s of [-1, 1]) block(p[0] - len, p[0] + len, Y, Y + 0.9, p[1] + s * hw - 0.03, p[1] + s * hw + 0.03, M().iron); }
    else { block(p[0] - hw, p[0] + hw, Y - 0.25, Y, p[1] - len, p[1] + len, M().iron); for (const s of [-1, 1]) block(p[0] + s * hw - 0.03, p[0] + s * hw + 0.03, Y, Y + 0.9, p[1] - len, p[1] + len, M().iron); }
    // Les caisses : 3 blocs de plus en plus hauts, collés à UN mur de la ruelle, en s'approchant de la passerelle
    const nearest = C().ALLEYS.reduce((best, al) => { for (let d = 0; d < C().alleyLen(al); d += 1) { const q = C().alleyPoint(al, d), dd = Math.hypot(q.x - p[0], q.z - p[1]); if (dd < best.dd) best = { dd, al, d, q }; } return best; }, { dd: 1e9 });
    const al = nearest.al, dir = nearest.q, lat = al.w - 0.85;
    [1.1, 2.2, 3.3].forEach((h, i) => {
      const along = -(1.55 * (3 - i)) + 0.4, x = p[0] + dir.dx * along - dir.dz * lat, z = p[1] + dir.dz * along + dir.dx * lat;
      block(x - 0.7, x + 0.7, 0, h, z - 0.7, z + 0.7, i % 2 ? M().concrete : M().concreteDark);
    });
    G.addLamp({ x: p[0], y: Y - 0.7, z: p[1], color: 0xd9d09a, I: 0.6, dist: 8, halo: 1.2, flicker: 0.5 });
  }
  /* ---------- Viaduc en ruine, garage dessous ---------- */
  function viaduct() {
    const x0 = A(46, 0)[0], x1 = x0 + 9, zA = C().Z0 + 2, zB = C().Z1 - 2;
    for (const [a, b] of [[zA, -64], [-46, zB]]) block(x0, x1, 8, 9, a, b, M().concreteDark);                              // le tablier, coupé au milieu
    for (const z of [-96, -78, -64, -46, -26, 4, 14]) block(x0 + 3, x0 + 6, 0, 8, z - 1.2, z + 1.2, M().concrete);        // piliers
    for (const z of [-64, -46]) block(x0 + 1, x0 + 8, 6.2, 8, z - 0.2, z + 0.2, M().concreteDark);                         // bouts cassés qui pendent
  }
  function garage() {                                                  // hangar sous le viaduc : le futur hub
    const gx = A(46, 24)[0] - 8, gz = A(46, 24)[1], x0 = gx - 6, x1 = gx + 12, z0 = gz - 5, z1 = gz + 5;
    G.wall('z', z0 - 0.3, z0, x0, x1, 0, 4, [], M().metal); G.wall('z', z1, z1 + 0.3, x0, x1, 0, 4, [], M().metal);
    G.wall('x', x1, x1 + 0.3, z0, z1, 0, 4, [], M().metal); G.wall('x', x0 - 0.3, x0, z0, z1, 0, 4, [[gz - 2.5, gz + 2.5, 0, 3.4]], M().metal);            // la porte : grande ouverture côté ville
    G.B(x0 - 0.3, x1 + 0.3, 4, 4.3, z0 - 0.3, z1 + 0.3, M().metal, { grime: false });                                                                        // toit
    wreck(gx + 4, gz - 1.5, 0.3, { van: true }); barrel(x1 - 1, z0 + 1); barrel(x1 - 1.6, z0 + 1.3); barrel(x1 - 1, z0 + 2.2);
    block(x0 + 3, x0 + 8.5, 0, 0.95, z1 - 1.3, z1 - 0.2, M().iron);                                                                                      // établi
    G.addLamp({ x: gx, y: 3.6, z: gz, color: 0xd9d09a, I: 1.1, dist: 12, halo: 1.8, flicker: 0.3 });
  }
  /* ---------- Barrages de police : herses, fourgon, projecteur, deux policiers qui attendent ---------- */
  G.checkpoints = [];
  function checkpoint(c, r) {
    const p = A(c, r), bx = p[0] - 2.5;
    for (const dz of [-3.2, -1.3 + 0.0, 2.2]) block(bx - 0.3, bx + 0.3, 0, 0.85, p[1] + dz - 1.1, p[1] + dz + 1.1);              // chicane : un passage de 1,5 m au milieu
    wreck(p[0] + 2.5, p[1] + 3.5, 0.2, { van: true, mat: M().plastic });
    G.addLamp({ x: p[0] + 2.5, y: 2.3, z: p[1] + 3.5, color: 0x4a78ff, I: 0.9, dist: 9, halo: 2.2, flicker: 4 });             // gyrophare
    mesh(new T.CylinderGeometry(0.04, 0.05, 2.6, 6), M().iron, p[0] + 1.0, 1.3, p[1] - 3.5);
    G.addLamp({ x: p[0] + 1.0, y: 2.7, z: p[1] - 3.5, color: 0xdfe8ff, I: 1.7, dist: 18, halo: 4, fogHalo: true });                      // projecteur froid
    for (const dz of [-0.9, 0.9]) { const cop = G.makeCop(); cop.position.set(bx + 1.2, 0, p[1] + dz); cop.rotation.y = -Math.PI / 2; G.scene.add(cop); G.checkpoints.push({ cop, home: [bx + 1.2, p[1] + dz] }); }
  }
  function pylon(x, z) {                                               // pylône électrique en treillis
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const l = mesh(new T.CylinderGeometry(0.1, 0.18, 26, 5), M().iron, x + sx * 1.3, 13, z + sz * 1.3); l.rotation.set(sz * 0.06, 0, -sx * 0.06); }
    for (const y of [4, 10, 16, 22]) for (const s of [0, 1]) mesh(new T.BoxGeometry(s ? 0.08 : 2.6, 0.08, s ? 2.6 : 0.08), M().iron, x, y, z + (s ? 0 : 1.3 * (y % 8 ? 1 : -1)));
    G.addBoxCollider(x - 1.5, x + 1.5, 0, 3, z - 1.5, z + 1.5);
  }
  function metro() {                                                   // entrée de métro condamnée
    const p = A(24, 9);
    block(p[0] - 2.2, p[0] + 2.2, 0, 3.2, p[1] - 0.2, p[1] + 0.2, M().concrete); block(p[0] - 2.2, p[0] - 1.9, 0, 3.2, p[1] - 3, p[1], M().concrete); block(p[0] + 1.9, p[0] + 2.2, 0, 3.2, p[1] - 3, p[1], M().concrete);
    block(p[0] - 2.4, p[0] + 2.4, 3.2, 3.5, p[1] - 3.2, p[1] + 0.4, M().concreteDark);
    gate(p[0], p[1] + 0.35, 0, -1, 1.8);
  }

  function scatterBig() {                                              // épaves, bennes, scooters, barrières : posés le long des murs, dans le sens de la ruelle
    const sets = [[1, 20, 'dumpster'], [1, 35, 'scooter'], [3, 14, 'scooter'], [4, 22, 'wreck'], [4, 40, 'dumpster'], [5, 18, 'dumpster'], [6, 8, 'scooter'], [7, 16, 'wreck'], [7, 30, 'scooter'], [2, 10, 'dumpster'], [3, 32, 'barrier'], [5, 9, 'barrier'], [6, 14, 'barrier'], [4, 10, 'barrier'], [1, 8, 'barrier']];
    for (const [k, d, type] of sets) {
      const a = C().ALLEYS[k], L = C().alleyLen(a); if (d > L - 3) continue;
      if (type === 'wreck' && a.w < 1.9) continue;                                   // pas d'épave dans les ruelles trop étroites
      const lat = (rnd() < 0.5 ? 1 : -1) * (a.w - (type === 'wreck' ? 1.15 : type === 'barrier' ? 0.9 : 0.95)), s = C().side(a, d, lat), ry = s[2] + Math.PI / 2;
      if (type === 'dumpster') dumpster(s[0], s[1], ry); else if (type === 'scooter') scooter(s[0], s[1], ry); else if (type === 'wreck') wreck(s[0], s[1], ry, {}); else barrier(s[0], s[1], s[2], Math.min(2.2, 2 * a.w - 1.7));
    }
    const a0 = C().ALLEYS[0]; const m = C().side(a0, 15, -2.6); barrier(m[0], m[1], 0.3); const m2 = C().side(a0, 30, 3.0); wreck(m2[0], m2[1], m2[2] + Math.PI / 2, {});
  }

  G.buildPlaces = function () {
    const a = C().ALLEYS;
    // Lampadaires le long des ruelles (un côté, puis l'autre ; certains morts ou qui clignotent)
    a.forEach((al, k) => { if (k === 8) return; const L = C().alleyLen(al); for (let d = 7 + (k % 3) * 2, n = 0; d < L - 3; d += 14, n++) { const p = C().alleyPoint(al, d), s = n % 2 ? 1 : -1, off = al.w - 0.6; lamp(p.x - p.dz * off * s, p.z + p.dx * off * s, p.x, p.z); } });
    // Zone plate : lampadaires isolés, épaves, arbres morts, abribus, clôture, pylônes
    for (const [c, r] of [[44, 10], [50, 15], [57, 22], [53, 3], [50, 9]]) { const q = A(c, r); lamp(q[0], q[1], q[0] - 1, q[1], { color: 0xffb060, I: 0.85, halo: 6 }); }
    for (const [c, r, ry] of [[44, 12, 0.5], [52, 20, 2.2], [51, 26, 1.1], [54, 6, 0.2], [45, 18, 1.9]]) { const q = A(c, r); wreck(q[0], q[1], ry); }
    for (const [c, r] of [[53, 17], [58, 9], [55, 14], [43, 21], [56, 27], [51, 23], [60, 16]]) { const q = A(c, r); tree(q[0], q[1]); }
    { const q = A(42, 8); block(q[0] - 1.6, q[0] + 1.6, 2.4, 2.55, q[1] - 0.6, q[1] + 0.6, M().iron); for (const dx of [-1.5, 1.5]) block(q[0] + dx - 0.05, q[0] + dx + 0.05, 0, 2.4, q[1] - 0.5, q[1] - 0.4, M().iron); block(q[0] - 1.2, q[0] + 1.2, 0.4, 0.5, q[1] + 0.3, q[1] + 0.55, M().iron); }
    { const p = A(62, 11), q = A(62, 18), im = new T.InstancedMesh(new T.CylinderGeometry(0.03, 0.03, 2.4, 5), M().iron, 60), d = new T.Object3D();
      for (let i = 0; i < 60; i++) { d.position.set(p[0], 1.2, p[1] + (q[1] - p[1]) * i / 59); d.updateMatrix(); im.setMatrixAt(i, d.matrix); } G.scene.add(im); G.addSegCollider(p[0], p[1], q[0], q[1], 0, 2.4); }
    for (const [c, r] of [[55, 10], [58, 20], [61, 5]]) { const q = A(c, r); pylon(q[0], q[1]); }
    // Lieux
    market(); terrace(); metro(); viaduct(); garage(); checkpoint(41, 9); checkpoint(42, 25);
    bridge(4, 14, 'x', 5); bridge(28, 15, 'x', 4.5); bridge(32, 10, 'z', 5); bridge(11, 18, 'x', 6);
    // Le corps, dans la rue du marché, côté mur
    { const al = a[0], s = C().side(al, C().alleyLen(al) * 0.5, -3.3); G.buildBody(s[0], s[1], s[2] + 1.4); }
    // Grille fermée au bout de l'allée nord
    { const al = a[5], e = al.pts[al.pts.length - 1], p = al.pts[al.pts.length - 2], L = Math.hypot(e[0] - p[0], e[1] - p[1]), dx = (e[0] - p[0]) / L, dz = (e[1] - p[1]) / L; gate(e[0] - dx * 1.2, e[1] - dz * 1.2, dx, dz, al.w + 0.5); }
    // Égout (bout de la branche nord-ouest) : plaque et cadre rouillés
    { const q = A(3, 8); mesh(new T.CylinderGeometry(0.5, 0.5, 0.04, 16), M().iron, q[0], 0.02, q[1] + 1.2); mesh(new T.TorusGeometry(0.5, 0.04, 6, 16), M().metal, q[0], 0.04, q[1] + 1.2).rotation.x = Math.PI / 2; }
    // La clé USB, sur une caisse dans la cour (boucle)
    { const al2 = C().ALLEYS[2], q = C().side(al2, C().alleyLen(al2) * 0.62, al2.w - 0.75); crate(q[0], q[1], 0.9, 0.9); crate(q[0] - 1.1, q[1] + 0.4, 0.7, 0.6); barrel(q[0] + 1.4, q[1] - 0.8);
      const usb = mesh(new T.BoxGeometry(0.05, 0.02, 0.16), new T.MeshPhongMaterial({ color: 0x8c98a4, shininess: 90, specular: 0xffffff }), q[0], 0.92, q[1]); usb.rotation.y = 0.8;
      const glint = new T.Sprite(new T.SpriteMaterial({ map: G.glowTex, color: 0xdfe8ff, blending: T.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 })); glint.position.set(q[0], 1.0, q[1]); glint.scale.set(0.25, 0.25, 1); G.scene.add(glint);
      G.animated.push({ update() { glint.material.opacity = usb.visible ? 0.14 + 0.1 * Math.sin(performance.now() / 650) : 0; } });
      G.interactables.push({ id: 'usb', pos: new T.Vector3(q[0], 0.95, q[1]), radius: 2.0, prompt: 'Prendre la clé USB',
        use() { usb.visible = false; G.interactables = G.interactables.filter(i => i.id !== 'usb'); G.have = G.have || []; G.have.push('usb-colis'); G.say('Une clé USB. Plus lourde qu\'elle n\'en a l\'air. Il faut la ramener au garage.'); } }); }
    scatterBig();
  };
  G.helpers = { lamp, barrel, crate, barrier, block, mesh, ph, PAL, pick, toWorld };

  G.loaded.push('places');
})();
