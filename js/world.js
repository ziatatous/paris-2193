/* =====================================================================
   world.js : le décor. Tout est fait de boîtes (brutalisme = gros blocs) dont la matière est brute.
   Axes : X largeur, Y hauteur, Z profondeur. Le joueur démarre dans l'appartement (y = 9),
   descend 3 étages par l'escalier, sort du hall (z = -2.65) dans une rue où il avance vers -z.
   Fonction d'entrée : G.buildWorld()
   ===================================================================== */
(function () {
  'use strict';
  const G = window.G, T = G.T;
  G.lamps = []; G.interactables = []; G.animated = []; G.onReset = [];

  /* ---------------------------------------------------------------
     BRIQUES DE BASE
     --------------------------------------------------------------- */
  // Géométrie de boîte : UV calculées dans le MONDE (la matière se prolonge d'une boîte à l'autre, sans raccord)
  // + "saleté cuite" en couleurs de sommets : sombre près du sol, plus clair en haut. Aucune lumière dynamique nécessaire.
  function boxGeo(w, h, d, cx, cy, cz, tile, grime, base) {
    const g = new T.BoxGeometry(w, h, d, 1, G.clamp(Math.ceil(h / 0.8), 1, 18), 1);
    const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv, col = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const wx = p.getX(i) + cx, wy = p.getY(i) + cy, wz = p.getZ(i) + cz;
      const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
      if (ax >= ay && ax >= az) uv.setXY(i, wz / tile, wy / tile); else if (ay >= az) uv.setXY(i, wx / tile, wz / tile); else uv.setXY(i, wx / tile, wy / tile);
      let k = 1;
      if (grime) k = (0.5 + 0.5 * G.smooth(G.clamp((wy - base) / 1.8, 0, 1))) * (0.93 + 0.07 * G.hash2(wx * 3.1 + wz * 1.7, wy * 2.3));
      col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = k;
    }
    g.setAttribute('color', new T.BufferAttribute(col, 3));
    return g;
  }
  // B(x0,x1, y0,y1, z0,z1, matériau, options) : une boîte définie par ses limites. Collision par défaut.
  G.B = function (x0, x1, y0, y1, z0, z1, mat, o) {
    o = o || {};
    if (x0 > x1) { const t = x0; x0 = x1; x1 = t; } if (y0 > y1) { const t = y0; y0 = y1; y1 = t; } if (z0 > z1) { const t = z0; z0 = z1; z1 = t; }   // limites dans le désordre : on les remet dans l'ordre
    const w = x1 - x0, h = y1 - y0, d = z1 - z0, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, cz = (z0 + z1) / 2;
    let mesh = null;
    if (!o.nomesh) {
      const geo = boxGeo(w, h, d, cx, cy, cz, o.tile || 2.5, o.grime !== false, o.grimeBase !== undefined ? o.grimeBase : y0);
      if (G.batch) { geo.translate(cx, cy, cz); (G.batch[mat.uuid] = G.batch[mat.uuid] || { mat, geos: [] }).geos.push(geo); }   // mode "lot" : on fusionne les boîtes d'une même matière (peu d'appels de dessin)
      else { mesh = new T.Mesh(geo, mat); mesh.position.set(cx, cy, cz); G.scene.add(mesh); }
    }
    if (o.collide !== false) G.addBoxCollider(x0, x1, y0, y1, z0, z1);
    return mesh;
  };
  // Lot : entre G.beginBatch() et G.endBatch(), toutes les boîtes (G.B) d'une même matière sont fusionnées en UN seul maillage.
  G.beginBatch = function () { G.batch = {}; };
  G.endBatch = function () {
    const B = G.batch; G.batch = null;
    for (const k in B) {
      const { mat, geos } = B[k]; let nv = 0, ni = 0; for (const g of geos) { nv += g.attributes.position.count; ni += g.index.count; }
      const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), col = new Float32Array(nv * 3), idx = nv > 65000 ? new Uint32Array(ni) : new Uint16Array(ni);
      let vo = 0, io = 0;
      for (const g of geos) {
        pos.set(g.attributes.position.array, vo * 3); nor.set(g.attributes.normal.array, vo * 3); uv.set(g.attributes.uv.array, vo * 2); col.set(g.attributes.color.array, vo * 3);
        const ix = g.index.array; for (let i = 0; i < ix.length; i++) idx[io + i] = ix[i] + vo;
        vo += g.attributes.position.count; io += ix.length; g.dispose();
      }
      const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.BufferAttribute(nor, 3));
      geo.setAttribute('uv', new T.BufferAttribute(uv, 2)); geo.setAttribute('color', new T.BufferAttribute(col, 3)); geo.setIndex(new T.BufferAttribute(idx, 1));
      const m = new T.Mesh(geo, mat); m.frustumCulled = false; G.scene.add(m);
    }
  };
  // Mur avec ouvertures (portes, fenêtres). axis 'z' : épaisseur en z [c0,c1], longueur en x [a0,a1].
  // axis 'x' : épaisseur en x, longueur en z. openings : [a0, a1, y0, y1].
  G.wall = function (axis, c0, c1, a0, a1, y0, y1, openings, mat, o) {
    o = Object.assign({}, o || {}); o.grimeBase = y0; openings = openings || [];
    const br = new Set([a0, a1]); for (const op of openings) { br.add(op[0]); br.add(op[1]); }
    const bs = [...br].sort((a, b) => a - b);
    for (let i = 0; i < bs.length - 1; i++) {
      const p = bs[i], q = bs[i + 1]; if (q - p < 1e-6) continue;
      let spans = [[y0, y1]];
      for (const op of openings) if (op[0] <= p + 1e-6 && op[1] >= q - 1e-6) {
        const next = [];
        for (const s of spans) {
          if (op[3] <= s[0] || op[2] >= s[1]) next.push(s);
          else { if (op[2] > s[0]) next.push([s[0], op[2]]); if (op[3] < s[1]) next.push([op[3], s[1]]); }
        }
        spans = next;
      }
      for (const s of spans) { if (axis === 'z') G.B(p, q, s[0], s[1], c0, c1, mat, o); else G.B(c0, c1, s[0], s[1], p, q, mat, o); }
    }
  };
  G.glassPane = function (x0, x1, y0, y1, z0, z1) {   // vitre : transparente mais solide
    const m = new T.Mesh(new T.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), G.mat.glass);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); G.scene.add(m);
    G.addBoxCollider(x0, x1, y0, y1, z0, z1);
  };

  /* ---------------------------------------------------------------
     LUMIÈRES : beaucoup de lampes "émissives" (ampoule + halo), mais seules les 3 plus proches
     éclairent vraiment (3 vraies lumières déplacées). C'est ce qui garde le jeu fluide.
     --------------------------------------------------------------- */
  let glowTex = null;
  G.addLamp = function (o) {
    const L = { pos: new T.Vector3(o.x, o.y, o.z), color: new T.Color(o.color || 0xffc880), I: o.I || 1, dist: o.dist || 10,
      flicker: o.flicker || 0, level: 1, cur: 1, burst: 0, blink: 0, phase: Math.random() * 10, base: o.halo === undefined ? 1.6 : o.halo };
    if (o.bulb !== false) {
      L.bulb = new T.Mesh(new T.SphereGeometry(0.06, 8, 6), new T.MeshBasicMaterial({ color: L.color }));
      L.bulb.position.copy(L.pos); G.scene.add(L.bulb);
    }
    if (L.base > 0) {
      L.halo = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: L.color, blending: T.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.5, fog: o.fogHalo !== true }));
      L.halo.position.copy(L.pos); L.halo.scale.set(L.base, L.base, 1); G.scene.add(L.halo);
    }
    G.lamps.push(L); return L;
  };
  G.updateLamps = function (dt, time) {
    const cam = G.camera.position;
    for (const L of G.lamps) {
      L.d2 = L.pos.distanceToSquared(cam);
      if (L.flicker > 0) {                                   // panne par à-coups
        if (L.burst > 0) {
          L.burst -= dt; L.blink -= dt;
          if (L.blink <= 0) { L.blink = 0.03 + Math.random() * 0.07; L.cur = Math.random() < 0.55 ? 0.05 + Math.random() * 0.25 : 0.6 + Math.random() * 0.4; }
          if (L.burst <= 0) L.cur = 1;
        } else if (Math.random() < L.flicker * dt) { L.burst = 0.08 + Math.random() * 0.5; L.blink = 0; }
        L.level = L.cur * (0.94 + 0.06 * Math.sin(time * 50 + L.phase));
      }
      if (L.bulb) L.bulb.material.color.copy(L.color).multiplyScalar(0.25 + 0.75 * L.level);
      if (L.halo) L.halo.material.opacity = 0.5 * L.level * (L.base > 2 ? G.smooth(G.clamp((Math.sqrt(L.d2) - 2) / 7, 0, 1)) : 1);   // grands halos : on ne s'aveugle pas dessous
    }
    const near = G.lamps.slice().sort((a, b) => a.d2 - b.d2);
    for (let i = 0; i < G.pool.length; i++) {
      const pl = G.pool[i], L = near[i];
      if (!L) { pl.intensity = 0; continue; }
      pl.position.copy(L.pos); pl.color.copy(L.color); pl.intensity = L.I * L.level; pl.distance = L.dist;
    }
  };
  function radialTexture(stops) {
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); for (const s of stops) gr.addColorStop(s[0], s[1]);
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new T.CanvasTexture(c);
  }

  /* ---------------------------------------------------------------
     OÙ SUIS-JE ? (sert à ajuster brouillard et son)
     --------------------------------------------------------------- */
  G.zoneAt = function (p) { return (p.x > -2.1 && p.x < 2.1 && p.z > -2.65 && p.z < 8.3) ? 'in' : (G.isField && G.isField(p.x, p.z) ? 'field' : 'out'); };

  /* ---------------------------------------------------------------
     LA TOUR : appartement (y=9) + escalier + hall
     --------------------------------------------------------------- */
  function buildTower() {
    const M = G.mat;
    // Coque en béton
    G.B(-2.1, -1.8, 0, 11.9, -2.65, 8.3, M.concrete);                        // mur ouest
    G.B(1.8, 2.1, 0, 11.9, -2.65, 8.3, M.concrete);                          // mur est
    G.B(-2.1, 2.1, 0, 11.9, 8.0, 8.3, M.concrete);                           // mur du fond
    G.B(-2.1, 2.1, 11.6, 11.9, -2.65, 8.3, M.concreteDark, { grime: false }); // toit / plafond
    // Façade : porte du hall (en bas) et fenêtre de l'appartement (en haut, sur la rue)
    G.wall('z', -2.65, -2.35, -2.1, 2.1, 0, 11.9, [[-1.6, -0.4, 0, 2.3], [-0.5, 1.3, 10.0, 11.2]], M.concrete);
    G.glassPane(-0.5, 1.3, 10.0, 11.2, -2.52, -2.48);
    // Cloison entre l'appartement/hall et la cage d'escalier, avec deux portes (hall en bas, appartement en haut)
    G.wall('z', 3.0, 3.3, -2.1, 2.1, 0, 11.9, [[-1.3, -0.3, 0, 2.2], [-1.3, -0.3, 9, 11.1]], M.wall);
    // Masse pleine sous l'appartement (étages des voisins) : sa face du haut est le sol de l'appartement
    G.B(-1.8, 1.8, 3.0, 9.0, -2.35, 3.0, M.floor, { tile: 2, grime: false });
    G.B(-1.8, 1.8, -0.3, 0, -2.35, 8.0, M.floor, { tile: 2, grime: false });   // sol du hall et de l'escalier

    // --- Escalier : 3 étages, chacun = 2 volées de 8 marches (0,1875 m de haut) autour d'un palier ---
    const RISE = 0.1875, RUN = 0.275;
    for (const yf of [9, 6, 3]) {
      G.B(-1.8, 1.8, yf - 0.3, yf, 3.3, 4.7, M.concreteDark, { grime: false });                // palier d'étage (nord)
      G.B(-1.8, 1.8, yf - 1.8, yf - 1.5, 6.9, 8.0, M.concreteDark, { grime: false });          // palier intermédiaire (sud)
      for (let i = 1; i <= 8; i++) {                                                            // volée est : on descend vers le sud
        const top = yf - RISE * i, z0 = 4.7 + (i - 1) * RUN;
        G.B(0.1, 1.8, top - 0.3, top, z0, z0 + RUN, M.concreteDark, { grime: false });
      }
      for (let j = 1; j <= 8; j++) {                                                            // volée ouest : on redescend vers le nord
        const top = yf - 1.5 - RISE * j, z1 = 6.9 - (j - 1) * RUN;
        G.B(-1.8, -0.1, top - 0.3, top, z1 - RUN, z1, M.concreteDark, { grime: false });
      }
    }
    // Lampes de palier : fatiguées, vert-jaune, certaines grésillent
    [[9, 0.05], [6, 0.35], [3, 0.5], [0, 0.15]].forEach(([yf, fl]) => G.addLamp({ x: 0, y: yf + 2.25, z: 3.9, color: 0xcfd8a0, I: 1.7, dist: 9, flicker: fl, halo: 1.0 }));
    G.addLamp({ x: 0, y: 2.6, z: 0.4, color: 0xb9c8a8, I: 1.2, dist: 8, flicker: 0.3, halo: 0.9 });   // hall

    buildApartment();
  }

  function buildApartment() {
    const M = G.mat;
    // Lit : un matelas à même un cadre bas, un oreiller. Rien d'autre sur les murs : espace vide, pour l'instant.
    G.B(-1.75, -0.75, 9.0, 9.32, -2.3, -0.3, M.cloth, { grime: false, tile: 1 });
    G.B(-1.7, -0.85, 9.32, 9.42, -2.25, -1.75, M.cloth2, { grime: false, collide: false });
    // Bureau + vieil écran cathodique (ses pixels de neige sont la lumière principale de la pièce)
    G.B(0.9, 1.75, 9.68, 9.74, -2.3, -0.8, M.plastic, { grime: false, tile: 1 });
    for (const [x, z] of [[0.95, -2.25], [1.7, -2.25], [0.95, -0.85], [1.7, -0.85]]) G.B(x - 0.03, x + 0.03, 9.0, 9.68, z - 0.03, z + 0.03, M.iron, { grime: false, collide: false });
    G.B(1.12, 1.56, 9.74, 10.12, -1.8, -1.38, M.plastic, { grime: false, collide: false });           // boîtier du moniteur
    G.B(1.3, 1.58, 9.74, 9.8, -1.7, -1.46, M.plastic, { grime: false, collide: false });
    const stat = G.makeStatic();
    const screen = new T.Mesh(new T.PlaneGeometry(0.3, 0.24), new T.MeshBasicMaterial({ map: stat.texture }));
    screen.position.set(1.108, 9.94, -1.59); screen.rotation.y = -Math.PI / 2; G.scene.add(screen);
    G.animated.push({ t: 0, update(dt) { this.t += dt; if (this.t > 0.07) { this.t = 0; stat.update(performance.now() / 1000); } } });
    G.crtPos = new T.Vector3(1.2, 9.95, -1.59);
    G.addLamp({ x: 1.0, y: 9.95, z: -1.59, color: 0x7dffd0, I: 0.9, dist: 5.5, flicker: 0.25, halo: 0.7, bulb: false });   // lueur verdâtre de l'écran
    G.addLamp({ x: 0, y: 11.25, z: 0.2, color: 0xe6c690, I: 0.35, dist: 6, halo: 0.8 });                                   // ampoule nue, très faible

    // Le briquet : un Bic classique gris, posé sur le bureau. Premier objet de la partie.
    const lighter = new T.Group();
    const bodyMesh = new T.Mesh(new T.BoxGeometry(0.024, 0.075, 0.013), new T.MeshPhongMaterial({ color: 0x82868a, shininess: 40, specular: 0x555555 }));
    const cap = new T.Mesh(new T.BoxGeometry(0.022, 0.014, 0.012), new T.MeshPhongMaterial({ color: 0xb9bcbe, shininess: 90, specular: 0xffffff }));
    cap.position.y = 0.043; lighter.add(bodyMesh, cap);
    lighter.position.set(1.35, 9.74 + 0.0125, -1.05); lighter.rotation.set(Math.PI / 2, 0, 0.7); G.scene.add(lighter);
    const glint = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: 0xdfe8ff, blending: T.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.0 }));
    glint.position.set(1.35, 9.8, -1.05); glint.scale.set(0.16, 0.16, 1); G.scene.add(glint);
    G.animated.push({ update(dt) { if (lighter.visible) glint.material.opacity = 0.18 + 0.12 * Math.sin(performance.now() / 700); else glint.material.opacity = 0; } });
    const lighterItem = {
      id: 'lighter', pos: new T.Vector3(1.35, 9.78, -1.05), radius: 1.9, prompt: 'Ramasser le briquet',
      use() { lighter.visible = false; G.interactables = G.interactables.filter(i => i.id !== 'lighter'); G.have = G.have || []; G.have.push('bic-gris');
        G.say('Un Bic gris. Un classique. Le premier de la collection.'); if (G.audio.flick) G.audio.flick(); }
    };
    G.interactables.push(lighterItem);
    G.onReset.push(() => { lighter.visible = true; if (!G.interactables.includes(lighterItem)) G.interactables.push(lighterItem); });
  }

  /* ---------------------------------------------------------------
     LE CORPS dans la rue (même retenue qu'avant, sans scène scriptée pour l'instant)
     --------------------------------------------------------------- */
  function limb(group, mat, p0, p1, r0, r1, seg) {
    const a = new T.Vector3(...p0), b = new T.Vector3(...p1), len = a.distanceTo(b);
    const m = new T.Mesh(new T.CylinderGeometry(r1, r0, len, seg || 10), mat);
    m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    group.add(m); return m;
  }
  function ball(group, mat, p, r, sx, sy, sz, seg) {
    const m = new T.Mesh(new T.SphereGeometry(r, seg || 12, (seg || 12) - 2), mat); m.position.set(...p); m.scale.set(sx || 1, sy || 1, sz || 1); group.add(m); return m;
  }
  G.limb = limb; G.ball = ball;
  G.buildBody = function (px, pz, ry) {
    const g = new T.Group(); g.position.set(px, 0, pz); g.rotation.y = ry || 0;
    const ph = c => new T.MeshPhongMaterial({ color: c, shininess: 6 });
    const jacket = ph(0x1b1e21), pants = ph(0x14161a), skin = new T.MeshPhongMaterial({ color: 0x7d7068, shininess: 10 }), dark = ph(0x0c0c0e), boot = ph(0x0b0b0d);
    const blood = new T.MeshPhongMaterial({ color: 0x2a0707, shininess: 70, specular: 0x552222, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const shape = new T.Shape();
    for (let i = 0; i <= 28; i++) { const a = i / 28 * 6.2832, r = 0.55 + 0.25 * Math.sin(a * 3 + 1) + 0.12 * Math.sin(a * 5); i ? shape.lineTo(Math.cos(a) * r * 1.2, Math.sin(a) * r) : shape.moveTo(Math.cos(a) * r * 1.2, Math.sin(a) * r); }
    const pool = new T.Mesh(new T.ShapeGeometry(shape), blood); pool.rotation.x = -Math.PI / 2; pool.position.set(-0.1, 0.014, -0.05); g.add(pool);
    ball(g, jacket, [0, 0.14, -0.14], 0.27, 1.0, 0.5, 0.95); ball(g, jacket, [0, 0.12, 0.2], 0.23, 1.0, 0.5, 1.0); ball(g, pants, [0, 0.11, 0.42], 0.17, 1.15, 0.7, 0.8);
    ball(g, jacket, [0.3, 0.13, -0.3], 0.1); ball(g, jacket, [-0.3, 0.13, -0.3], 0.1);
    const head = new T.Group(); head.position.set(0.05, 0.13, -0.64); head.rotation.z = 0.35; head.rotation.y = 0.2; g.add(head);
    limb(g, skin, [0, 0.12, -0.42], [0.04, 0.13, -0.55], 0.06, 0.055);
    ball(head, skin, [0, 0, 0], 0.115, 0.92, 1.0, 1.1); ball(head, dark, [0, -0.025, -0.022], 0.12, 0.98, 1.0, 1.08);
    ball(head, skin, [0, 0, 0.1], 0.04, 0.9, 0.8, 0.9, 8); ball(head, skin, [0, 0.098, -0.02], 0.022, 0.8, 1.0, 1.2, 8);
    for (const s of [-1, 1]) ball(head, dark, [s * 0.045, 0.1, -0.05], 0.022, 1.3, 0.35, 0.8, 8);
    limb(g, jacket, [0.3, 0.13, -0.3], [0.56, 0.1, -0.4], 0.085, 0.07); limb(g, jacket, [0.56, 0.1, -0.4], [0.86, 0.06, -0.62], 0.07, 0.055);
    ball(g, skin, [0.9, 0.045, -0.65], 0.05, 1.1, 0.5, 1.3, 8);
    for (let f = 0; f < 4; f++) limb(g, skin, [0.92 + f * 0.012, 0.04, -0.68 - f * 0.018], [1.0 + f * 0.015, 0.025, -0.74 - f * 0.05], 0.011, 0.008, 5);
    limb(g, jacket, [-0.3, 0.13, -0.3], [-0.52, 0.1, -0.08], 0.085, 0.07); limb(g, jacket, [-0.52, 0.1, -0.08], [-0.24, 0.17, 0.08], 0.07, 0.055);
    limb(g, pants, [0.12, 0.11, 0.45], [0.32, 0.3, 0.88], 0.11, 0.085); limb(g, pants, [0.32, 0.3, 0.88], [0.22, 0.08, 1.22], 0.085, 0.06); ball(g, boot, [0.22, 0.07, 1.3], 0.085, 0.95, 0.75, 1.7);
    limb(g, pants, [-0.12, 0.11, 0.47], [-0.2, 0.1, 0.95], 0.11, 0.085); limb(g, pants, [-0.2, 0.1, 0.95], [-0.3, 0.07, 1.42], 0.085, 0.06); ball(g, boot, [-0.32, 0.07, 1.5], 0.085, 0.95, 0.75, 1.7);
    const usb = new T.Mesh(new T.BoxGeometry(0.05, 0.02, 0.15), new T.MeshPhongMaterial({ color: 0x8c98a4, shininess: 90, specular: 0xffffff }));
    usb.position.set(1.12, 0.012, -0.78); usb.rotation.y = 0.5; g.add(usb);
    G.scene.add(g);
  };

  /* ---------------------------------------------------------------
     POINT D'ENTRÉE : construit tout (appelé une fois par G.boot)
     --------------------------------------------------------------- */
  // Socle commun (ciel, brouillard, lumières) ; la tour (appartement + escalier + hall) ; puis, selon le mode, la grande carte ou un niveau
  G.buildBase = function () {
    glowTex = G.glowTex = radialTexture([[0, 'rgba(255,255,255,0.9)'], [0.25, 'rgba(255,255,255,0.32)'], [1, 'rgba(255,255,255,0)']]);
    G.scene.background = new T.Color(0x161b1e);
    G.scene.fog = new T.FogExp2(0x161b1e, 0.105);
    G.scene.add(new T.HemisphereLight(0x5d6a73, 0x252a2c, 1.35));
    G.pool = [0, 1, 2].map(() => { const l = new T.PointLight(0xffffff, 0, 10, 2); G.scene.add(l); return l; });
  };
  G.buildTower = function () { buildTower(); };
  G.buildWorld = function () { G.buildBase(); buildTower(); G.buildCity(); };          // grande carte (ancienne)
  // Niveau de lumière en un point : sert à la furtivité (dans le noir, on est moins visible)
  G.lightAt = function (x, y, z, except) {
    let s = 0.12;
    for (const L of G.lamps) { if (L === except || !(L.I > 0)) continue; const d = Math.hypot(L.pos.x - x, L.pos.y - y, L.pos.z - z); if (d < L.dist) { const k = 1 - d / L.dist; s += L.I * L.level * k * k; } }
    return s;
  };

  G.loaded.push('world');
})();
