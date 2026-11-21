/* =====================================================================
   city.js : la ville, construite à partir du schéma ASCII (voir G.MAP_ASCII ci-dessous et docs/carte-v1.txt).
   Idée : on décrit l'ESPACE LIBRE (ruelles = lignes brisées épaissies, place = ellipse, alcôves, garage, zone plate)
   avec une "distance signée" ; tout le reste est de la masse de bâtiments. On trace le CONTOUR de l'espace libre
   (algorithme "marching squares") et on élève des murs le long de ce contour : ruelles en biais, irrégulières,
   sans angles droits obligatoires. 1 case ASCII = 4 m ; la tour du joueur est à l'origine (0, 0).
   ===================================================================== */
(function () {
  'use strict';
  const G = window.G, T = G.T;

  // Le schéma d'origine, conservé ici comme référence (nord en haut). A=tour, F=place, E=égout, G=garage,
  // B=corps, !=clé USB, X=grille, +=cachettes, r=parcours en hauteur, C=épaves, L=lampadaires, t=arbres, s=abribus.
  G.MAP_ASCII = `CARTE v1 (schéma). 1 caractère = 4 m. Nord en haut.

     0         1         2         3         4         5         6   
     0123456789012345678901234567890123456789012345678901234567890123
  0  ########################################~~~~~~~~~~~~~~~~~~~~~~~~
  1  ###########################X##############~~~~~~~~~~~~~~~~~~~~~~
  2  #######################....################~~~~~~~~~~~~~~~~~~~~~
  3  #####################..#####################~~~~L~~~~~~~~~~~~~~~
  4  ###################..######################~~~~~~~~~~~~~~~~~DD~~
  5  ##################.######################~~~~~~~~~~~~~~~~~~~DD~~
  6  ##################.#####################~~~~~~~~~~C~~~~~~~~~~~~~
  7  ###E###############.####################~~~~~~~~~~~~~~~~~~~~~~~~
  8  ###.###############.:####################~s~~~~~~~~~~~~~~~~~~~~~
  9  ###.############:::::::::###########......~~~~~~~~~~~t~~~~~~~~~~
 10  ###.###########:::::::::::#######...#####~~~L~~~~~~~~~~~~~~~~~~~
 11  ###.##########:::::::::::::####..#######~~~~~~~~~~~~~~~~~~~~~~x~
 12  ###.+#########::::::F::::::....+######~~~~~~~~C~~~~~~~~~~~~~~~x~
 13  ####.#########:::::::::::::#########~~~~~~~~~~~~~~~~~~~~~~~~~~x~
 14  ####.#######..#:::::::::::#.##r####~~~~~~~~~~~~~~~~~~~~~~~t~~~x~
 15  ####.####B..####:::::::::##.###r###~~~~~~~~~~~~~~~L~~~~~~~~~~~x~
 16  #####.###.##.##r####:#.#####.###r####~~~~~~~~~~~~~~~~~~~~~~~~~x~
 17  #####.#..###.#r######.#.#####.###r#####~~~~~~~~t~~~~~~~~~~~~~~x~
 18  ######.######.######.##.#####.###r#######~~~~~~~~~~~~~~~~~~~~~x~
 19  ######.#####.######.####.###+############~~~~~~~~~~~~~~~~~~~~~~~
 20  ######.####r.!####.######....############~~~~~~~~~~~C~~~~~~~~~~~
 21  ######.###r.#####.##########.############~~t~~~~~~~~~~~~~~~~~~~~
 22  ######.....#+###.############..#########~~~~~~~~~~~~~~~~L~~~~~~~
 23  ######.#r#####..###############.#########~~~~~~~~~~~~~~~~~~~~~~~
 24  ######.######.##################...#######~~~~~~~~~t~~~~~~~~~~~~
 25  ######A############################.G######~~~~~~~~~~~~~~~~~~~~~
 26  #######################################s###~~C~~~~~~~~~~~~~~~~~~
 27  ###########################################~~~~~~~~~~~~t~~~~~~~~
 28  #########################################~~~~~~~~~~~~~~~~~~~~~~~
 29  ######################################~~~~~~~~~~~~~~~~~~~~~~~~~~`;

  // Case ASCII (colonne, ligne) -> monde (x, z). La tour (colonne 6, ligne 25) est à l'origine, sa façade à z = -2,65.
  const A = (c, r) => [(c - 6) * 4, (r - 25) * 4 - 0.65];
  G.mapWorld = A;

  /* ---------------------------------------------------------------
     1. L'ESPACE LIBRE
     --------------------------------------------------------------- */
  const ALLEYS = [   // w = demi-largeur en mètres
    { w: 2.1, pts: [[0, -2.65], A(6, 18)] },                                                      // sortie de la tour (aussi large que la tour)
    { w: 1.6, pts: [A(6, 18), A(4, 15), A(3, 11), A(3, 8)] },                                     // branche nord-ouest -> égout
    { w: 2.0, pts: [A(6, 18), A(9, 16), A(12, 14), A(15, 13), A(18, 12)] },                       // branche nord-est -> place
    { w: 1.5, pts: [A(6, 22), A(10, 22), A(12, 20), A(13, 18), A(12, 16)] },                      // boucle avec cour
    { w: 2.2, pts: [A(20, 12), A(26, 12), A(30, 12), A(33, 10), A(37, 9), A(41, 9)] },            // vers la zone plate
    { w: 2.0, pts: [A(21, 14), A(24, 19), A(28, 21), A(31, 23), A(35, 25)] },                     // vers le garage
    { w: 1.8, pts: [A(19, 10), A(18, 5), A(21, 3), A(25, 2), A(27, 1)] },                         // vers le nord (grille)
    { w: 1.7, pts: [A(26, 12), A(27, 15), A(29, 17), A(28, 21)] },                                // raccord central
    { w: 1.6, pts: [A(6, 23), A(10, 24), A(13, 24), A(16, 22), A(19, 19), A(21, 17), A(23, 18)] }  // ruelle du sud
  ];
  const PLACE = { c: A(20, 12), rx: 22, rz: 13 };
  const ALCOVES = [A(4, 12), A(12, 22), A(28, 19), A(31, 12)];     // cachettes (porche, cour)
  const GARAGE = { c: [126, -0.65], hx: 9, hz: 5.5 };
  const TOWER = { x0: -2.1, x1: 2.1, z0: -2.65, z1: 8.3 };         // la tour est pleine (elle a sa propre géométrie)
  const X0 = -30, X1 = 234, Z0 = -106, Z1 = 20;                    // limites de la carte (mètres)

  const xlim = z => { const row = (z + 0.65) / 4 + 25; return ((40 + 3 * Math.sin(row / 3) + 2 * Math.sin(row / 1.3)) - 6) * 4 - 2; };   // bord est de la ville
  G.isField = (x, z) => x > xlim(z) + 1;

  function distSeg(x, z, p, q) {
    const dx = q[0] - p[0], dz = q[1] - p[1]; let t = ((x - p[0]) * dx + (z - p[1]) * dz) / (dx * dx + dz * dz || 1); t = t < 0 ? 0 : t > 1 ? 1 : t;
    return Math.hypot(x - p[0] - dx * t, z - p[1] - dz * t);
  }
  const vn = (x, z) => {    // bruit de valeur : irrégularité des murs
    const xi = Math.floor(x), zi = Math.floor(z), tx = G.smooth(x - xi), tz = G.smooth(z - zi), h = G.hash2;
    return (h(xi, zi) * (1 - tx) + h(xi + 1, zi) * tx) * (1 - tz) + (h(xi, zi + 1) * (1 - tx) + h(xi + 1, zi + 1) * tx) * tz;
  };
  function sdf(x, z) {      // < 0 : espace libre ; > 0 : bâtiment
    let d = xlim(z) - x;                                                       // zone plate à l'est
    for (const a of ALLEYS) for (let i = 0; i < a.pts.length - 1; i++) d = Math.min(d, distSeg(x, z, a.pts[i], a.pts[i + 1]) - a.w);
    d = Math.min(d, (Math.sqrt(((x - PLACE.c[0]) / PLACE.rx) ** 2 + ((z - PLACE.c[1]) / PLACE.rz) ** 2) - 1) * PLACE.rz);
    for (const c of ALCOVES) d = Math.min(d, Math.hypot(x - c[0], z - c[1]) - 2.4);
    d = Math.min(d, Math.max(Math.abs(x - GARAGE.c[0]) - GARAGE.hx, Math.abs(z - GARAGE.c[1]) - GARAGE.hz));
    d += (vn(x / 7, z / 7) - 0.5) * 0.6 + (vn(x / 2.3, z / 2.3) - 0.5) * 0.3;
    const tx = Math.max(TOWER.x0 - x, x - TOWER.x1, TOWER.z0 - z, z - TOWER.z1);   // distance au rectangle de la tour (négatif dedans)
    return Math.max(d, -tx);
  }

  /* ---------------------------------------------------------------
     2. LES MURS : contour de l'espace libre, puis extrusion
     --------------------------------------------------------------- */
  function buildWalls() {
    const NX = X1 - X0 + 1, NZ = Z1 - Z0 + 1, D = new Float32Array(NX * NZ);
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) D[j * NX + i] = sdf(X0 + i, Z0 + j);
    const segs = [], TABLE = [null, [[3, 0]], [[0, 1]], [[3, 1]], [[1, 2]], [[3, 0], [1, 2]], [[0, 2]], [[3, 2]], [[2, 3]], [[0, 2]], [[0, 1], [2, 3]], [[1, 2]], [[1, 3]], [[0, 1]], [[3, 0]], null];
    for (let j = 0; j < NZ - 1; j++) for (let i = 0; i < NX - 1; i++) {
      const v0 = D[j * NX + i], v1 = D[j * NX + i + 1], v2 = D[(j + 1) * NX + i + 1], v3 = D[(j + 1) * NX + i];
      const idx = (v0 < 0 ? 1 : 0) | (v1 < 0 ? 2 : 0) | (v2 < 0 ? 4 : 0) | (v3 < 0 ? 8 : 0), cases = TABLE[idx]; if (!cases) continue;
      const x = X0 + i, z = Z0 + j;
      const E = [[x + v0 / (v0 - v1), z], [x + 1, z + v1 / (v1 - v2)], [x + v3 / (v3 - v2), z + 1], [x, z + v0 / (v0 - v3)]];
      for (const c of cases) segs.push([E[c[0]][0], E[c[0]][1], E[c[1]][0], E[c[1]][1]]);
    }
    // Géométrie : chaque segment devient un mur à plusieurs niveaux (pour la saleté "cuite" : sombre en bas)
    const LV = [0, 0.5, 1.6, 3.2, 6]; const pos = [], nor = [], uv = [], col = [], idxs = []; const walls = [];
    const tile = 5;
    for (const s of segs) {
      let [ax, az, bx, bz] = s; const len = Math.hypot(bx - ax, bz - az); if (len < 0.05) continue;
      const mx = (ax + bx) / 2, mz = (az + bz) / 2;
      if (Math.abs(mx) < 2.6 && mz > -3.2 && mz < -2.1) continue;                  // pas de mur devant la porte de la tour
      let nx = -(bz - az) / len, nz = (bx - ax) / len;
      if (sdf(mx + nx * 0.3, mz + nz * 0.3) > sdf(mx - nx * 0.3, mz - nz * 0.3)) { nx = -nx; nz = -nz; }   // normale vers l'espace libre
      if (-(bz - az) * nx + (bx - ax) * nz < 0) { const tx = ax, tz = az; ax = bx; az = bz; bx = tx; bz = tz; }     // sens des triangles
      const h = 9 + 6 * G.hash2(Math.floor(mx / 15), Math.floor(mz / 15));
      G.addSegCollider(ax, az, bx, bz, 0, h);
      walls.push({ mx, mz, nx, nz, h, len });
      const levels = LV.filter(y => y < h - 0.5).concat([h]), base = pos.length / 3;
      const useX = Math.abs(nx) > Math.abs(nz);
      for (const y of levels) {
        const k = [0.6, 0.74, 0.89, 0.97, 1.0][Math.min(levels.indexOf(y), 4)] * (0.9 + 0.1 * G.hash2(mx * 1.7, y));
        for (const P of [[ax, az], [bx, bz]]) {
          pos.push(P[0], y, P[1]); nor.push(nx, 0, nz); uv.push((useX ? P[1] : P[0]) / tile, y / tile); col.push(k, k, k);
        }
      }
      for (let r = 0; r < levels.length - 1; r++) { const a = base + r * 2; idxs.push(a, a + 1, a + 3, a, a + 3, a + 2); }
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setAttribute('color', new T.Float32BufferAttribute(col, 3)); g.setIndex(idxs);
    G.scene.add(new T.Mesh(g, G.mat.facade));
    return walls;
  }
  // Détails de façade : fentes de fenêtres, portes, descentes d'eau (objets "instanciés" = un seul dessin chacun)
  function buildFacadeDetails(walls) {
    const M = G.mat, slit = [], lit = [], doors = [], drains = [];
    for (const w of walls) {
      const r = G.hash2(w.mx * 0.37, w.mz * 0.53);
      if (r > 0.80) for (const y of [3.2, 6.4, 9.6, 12.8]) if (y + 1 < w.h) (G.hash2(w.mx + y, w.mz) > 0.92 ? lit : slit).push([w.mx + w.nx * 0.05, y, w.mz + w.nz * 0.05, w.nx, w.nz]);
      else if (r < 0.04) doors.push([w.mx + w.nx * 0.06, 1.05, w.mz + w.nz * 0.06, w.nx, w.nz]);
      else if (r > 0.45 && r < 0.47) drains.push([w.mx + w.nx * 0.1, w.h / 2, w.mz + w.nz * 0.1, w.h]);
    }
    const d = new T.Object3D();
    const inst = (list, geo, mat, scale) => {
      if (!list.length) return; const im = new T.InstancedMesh(geo, mat, list.length);
      list.forEach((s, i) => { d.position.set(s[0], s[1], s[2]); d.rotation.set(0, Math.atan2(s[3], s[4]), 0); const sc = scale(s); d.scale.set(sc[0], sc[1], sc[2]); d.updateMatrix(); im.setMatrixAt(i, d.matrix); });
      G.scene.add(im);
    };
    const box = new T.BoxGeometry(1, 1, 1);
    inst(slit, box, M.dark, () => [0.9, 1.4, 0.14]);
    inst(lit, box, new T.MeshBasicMaterial({ color: 0x5b4c32 }), () => [0.9, 1.4, 0.14]);
    inst(doors, box, new T.MeshPhongMaterial({ color: 0x1c1d1c, shininess: 6 }), () => [1.1, 2.1, 0.16]);
    const dr = new T.InstancedMesh(new T.CylinderGeometry(0.07, 0.07, 1, 8), M.metal, drains.length), dd = new T.Object3D();
    drains.forEach((s, i) => { dd.position.set(s[0], s[1], s[2]); dd.rotation.set(0, 0, 0); dd.scale.set(1, s[3], 1); dd.updateMatrix(); dr.setMatrixAt(i, dd.matrix); }); if (drains.length) G.scene.add(dr);
  }
  // Sol : un grand plan. Ville = asphalte sombre ; zone plate = plus clair, terreux. Taches de bruit.
  function buildGround() {
    const W = X1 - X0 + 140, H = Z1 - Z0 + 140, cx = (X0 + X1) / 2, cz = (Z0 + Z1) / 2, sx = Math.round(W / 2.5), sz = Math.round(H / 2.5);
    const g = new T.PlaneGeometry(W, H, sx, sz); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position, uv = g.attributes.uv, col = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i) + cx, z = p.getZ(i) + cz; p.setX(i, x); p.setZ(i, z); uv.setXY(i, x / 3, z / 3);
      const field = G.smooth(G.clamp((x - xlim(z)) / 8, 0, 1)), m = 0.75 + 0.5 * vn(x / 9, z / 9);
      const k = G.lerp(1.0, 1.35, field) * m; col[i * 3] = k * G.lerp(1, 1.0, field); col[i * 3 + 1] = k * G.lerp(1, 1.05, field); col[i * 3 + 2] = k * G.lerp(1, 0.9, field);
    }
    p.needsUpdate = true; g.setAttribute('color', new T.BufferAttribute(col, 3));
    G.scene.add(new T.Mesh(g, G.mat.asphalt));
    // Murs invisibles aux limites de la zone plate (le brouillard cache le reste)
    G.addBoxCollider(X1, X1 + 5, -5, 40, Z0 - 5, Z1 + 5); G.addBoxCollider(X0 - 5, X1 + 5, -5, 40, Z0 - 5, Z0); G.addBoxCollider(X0 - 5, X1 + 5, -5, 40, Z1, Z1 + 5);
  }

  /* ---------------------------------------------------------------
     3. PROPS : lampadaires, tonneaux, caisses, barrières, épaves, arbres...
     --------------------------------------------------------------- */
  const M = () => G.mat;
  function alleyPoint(a, dist) {     // point et direction à une distance donnée le long d'une ruelle
    let d = dist;
    for (let i = 0; i < a.pts.length - 1; i++) {
      const p = a.pts[i], q = a.pts[i + 1], L = Math.hypot(q[0] - p[0], q[1] - p[1]);
      if (d <= L || i === a.pts.length - 2) { const t = G.clamp(d / L, 0, 1); return { x: p[0] + (q[0] - p[0]) * t, z: p[1] + (q[1] - p[1]) * t, dx: (q[0] - p[0]) / L, dz: (q[1] - p[1]) / L }; }
      d -= L;
    }
  }
  const alleyLen = a => a.pts.slice(1).reduce((s, q, i) => s + Math.hypot(q[0] - a.pts[i][0], q[1] - a.pts[i][1]), 0);
  function side(a, dist, off) { const p = alleyPoint(a, dist); return [p.x - p.dz * off, p.z + p.dx * off, Math.atan2(p.dx, p.dz)]; }   // décalé sur le côté (off > 0 = gauche)

  function lamp(x, z, ax, az, color, I, halo, flick) {              // lampadaire sodium : pied en (x,z), bras vers (ax,az)
    const pole = new T.Mesh(new T.CylinderGeometry(0.05, 0.07, 5.4, 8), M().iron); pole.position.set(x, 2.7, z); G.scene.add(pole);
    const ang = Math.atan2(ax - x, az - z), arm = new T.Mesh(new T.BoxGeometry(0.07, 0.07, 1.0), M().iron);
    arm.position.set(x + Math.sin(ang) * 0.5, 5.4, z + Math.cos(ang) * 0.5); arm.rotation.y = ang; G.scene.add(arm);
    G.addBoxCollider(x - 0.08, x + 0.08, 0, 5.4, z - 0.08, z + 0.08);
    G.addLamp({ x: x + Math.sin(ang) * 1.0, y: 5.3, z: z + Math.cos(ang) * 1.0, color: color || 0xffa44a, I: I || 0.95, dist: 14, halo: halo || 5.5, flicker: flick || 0, fogHalo: true });
  }
  function barrel(x, z) {
    const b = new T.Mesh(new T.CylinderGeometry(0.3, 0.3, 0.9, 14), M().metal); b.position.set(x, 0.45, z); G.scene.add(b);
    for (const y of [0.08, 0.45, 0.82]) { const r = new T.Mesh(new T.CylinderGeometry(0.315, 0.315, 0.04, 14), M().iron); r.position.set(x, y, z); G.scene.add(r); }
    G.addBoxCollider(x - 0.3, x + 0.3, 0, 0.9, z - 0.3, z + 0.3);
  }
  const block = (x0, x1, y0, y1, z0, z1, mat) => G.B(x0, x1, y0, y1, z0, z1, mat || M().concreteDark, { grime: false });
  function barrier(x, z, ry) {                                       // plot de béton bas, à enjamber (aligné sur un axe pour pouvoir être franchi)
    const alongX = Math.abs(Math.sin(ry)) < 0.7, w = alongX ? 2.2 : 0.6, d = alongX ? 0.6 : 2.2;
    block(x - w / 2, x + w / 2, 0, 0.85, z - d / 2, z + d / 2, M().concreteDark);
  }
  function wreck(x, z, ry) {                                          // épave de voiture rouillée (carrosserie, habitacle, roues)
    const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = ry;
    const add = (geo, mat, px, py, pz, rz) => { const m = new T.Mesh(geo, mat); m.position.set(px, py, pz); if (rz) m.rotation.z = rz; g.add(m); return m; };
    add(new T.BoxGeometry(4.2, 0.75, 1.8), M().metal, 0, 0.62, 0); add(new T.BoxGeometry(2.1, 0.7, 1.6), M().metal, -0.3, 1.3, 0);
    add(new T.BoxGeometry(1.9, 0.5, 1.62), M().glass, -0.3, 1.34, 0);
    for (const [px, pz] of [[1.4, 0.9], [1.4, -0.9], [-1.4, 0.9], [-1.4, -0.9]]) { const w = add(new T.CylinderGeometry(0.34, 0.34, 0.25, 12), M().iron, px, 0.34, pz); w.rotation.x = Math.PI / 2; }
    G.scene.add(g); G.addOBBCollider(x, z, 4.2, 1.8, ry, 0, 1.05);
  }
  function tree(x, z) {                                               // arbre mort : tronc effilé + branches
    const g = new T.Group(); g.position.set(x, 0, z); const mat = M().iron;
    const trunk = new T.Mesh(new T.CylinderGeometry(0.1, 0.22, 4.5, 7), mat); trunk.position.y = 2.25; g.add(trunk);
    for (let i = 0; i < 6; i++) {
      const a = i * 1.05 + G.rnd(), L = 1.4 + G.rnd() * 1.4, br = new T.Mesh(new T.CylinderGeometry(0.02, 0.07, L, 5), mat);
      br.position.set(Math.cos(a) * L * 0.3, 3.2 + G.rnd() * 1.3, Math.sin(a) * L * 0.3); br.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9); g.add(br);
    }
    G.scene.add(g); G.addBoxCollider(x - 0.2, x + 0.2, 0, 4.5, z - 0.2, z + 0.2);
  }
  function fountain(x, z) {                                           // fontaine à sec : bassin bas, pilier, lampe
    const ring = new T.Mesh(new T.CylinderGeometry(2.7, 2.9, 0.7, 16, 1, true), M().concreteDark); ring.material = M().concreteDark.clone(); ring.material.side = T.DoubleSide; ring.position.set(x, 0.35, z); G.scene.add(ring);
    const lip = new T.Mesh(new T.TorusGeometry(2.8, 0.14, 6, 20), M().concrete); lip.rotation.x = Math.PI / 2; lip.position.set(x, 0.72, z); G.scene.add(lip);
    const water = new T.Mesh(new T.CircleGeometry(2.7, 16), M().puddle); water.rotation.x = -Math.PI / 2; water.position.set(x, 0.3, z); G.scene.add(water);
    const col = new T.Mesh(new T.CylinderGeometry(0.28, 0.4, 2.2, 10), M().concreteDark); col.position.set(x, 1.1, z); G.scene.add(col);
    for (let i = 0; i < 14; i++) { const a = i / 14 * 6.283, b = (i + 1) / 14 * 6.283; G.addSegCollider(x + Math.cos(a) * 2.9, z + Math.sin(a) * 2.9, x + Math.cos(b) * 2.9, z + Math.sin(b) * 2.9, 0, 0.75); }
    G.addBoxCollider(x - 0.4, x + 0.4, 0, 2.2, z - 0.4, z + 0.4);
    G.addLamp({ x, y: 2.5, z, color: 0xffa44a, I: 0.9, dist: 14, halo: 5, fogHalo: true, flicker: 0.12 });
  }
  function gate(cx, cz, dirx, dirz, hw) {                              // grille fermée en travers d'une ruelle
    const px = -dirz, pz = dirx, ang = Math.atan2(px, pz), bars = [];
    G.addSegCollider(cx - px * hw, cz - pz * hw, cx + px * hw, cz + pz * hw, 0, 3.2);
    const cyl = new T.CylinderGeometry(0.02, 0.02, 3.0, 5), im = new T.InstancedMesh(cyl, M().iron, Math.round(hw * 2 / 0.14)), d = new T.Object3D();
    for (let i = 0; i < im.count; i++) { const s = -hw + i * 0.14; d.position.set(cx + px * s, 1.5, cz + pz * s); d.updateMatrix(); im.setMatrixAt(i, d.matrix); }
    G.scene.add(im);
    for (const y of [0.1, 1.5, 2.95]) { const r = new T.Mesh(new T.BoxGeometry(hw * 2, 0.06, 0.06), M().iron); r.position.set(cx, y, cz); r.rotation.y = Math.atan2(-pz, px); G.scene.add(r); }
  }
  function crate(x, z, s, h) { const m = new T.Mesh(new T.BoxGeometry(s, h, s), M().wood); m.position.set(x, h / 2, z); G.scene.add(m); G.addBoxCollider(x - s / 2, x + s / 2, 0, h, z - s / 2, z + s / 2); }

  function buildProps() {
    // Lampadaires le long des ruelles (un côté puis l'autre)
    ALLEYS.forEach((a, k) => {
      const L = alleyLen(a);
      for (let d = 7 + (k % 3) * 2, n = 0; d < L - 3; d += 14, n++) {
        const p = alleyPoint(a, d), s = (n % 2 ? 1 : -1), off = a.w - 0.55;
        lamp(p.x - p.dz * off * s, p.z + p.dx * off * s, p.x, p.z, 0xffa44a, 0.95, 5.5, (k + n) % 7 === 3 ? 0.5 : 0);
      }
    });
    // Zone plate : lampadaires isolés, épaves, arbres morts, abribus, clôture
    for (const [c, r] of [[44, 10], [50, 15], [56, 22], [48, 3], [52, 8]]) { const q = A(c, r); lamp(q[0], q[1], q[0] - 1, q[1], 0xffb060, 0.85, 6, (c + r) % 3 === 0 ? 0.35 : 0); }
    for (const [c, r, ry] of [[46, 12, 0.5], [52, 20, 2.2], [45, 26, 1.1], [50, 6, 0.2]]) { const q = A(c, r); wreck(q[0], q[1], ry); }
    for (const [c, r] of [[47, 17], [53, 9], [58, 14], [43, 21], [55, 27], [51, 24], [49, 12], [56, 5], [45, 5], [57, 19]]) { const q = A(c, r); tree(q[0], q[1]); }
    { const q = A(42, 8); block(q[0] - 1.6, q[0] + 1.6, 2.4, 2.55, q[1] - 0.6, q[1] + 0.6, M().iron); for (const dx of [-1.5, 1.5]) block(q[0] + dx - 0.05, q[0] + dx + 0.05, 0, 2.4, q[1] - 0.5, q[1] - 0.4, M().iron); block(q[0] - 1.2, q[0] + 1.2, 0.4, 0.5, q[1] + 0.3, q[1] + 0.55, M().iron); }   // abribus
    { const a = A(62, 11), b = A(62, 18), im = new T.InstancedMesh(new T.CylinderGeometry(0.03, 0.03, 2.4, 5), M().iron, 60), d = new T.Object3D();   // clôture au loin
      for (let i = 0; i < 60; i++) { d.position.set(a[0], 1.2, a[1] + (b[1] - a[1]) * i / 59); d.updateMatrix(); im.setMatrixAt(i, d.matrix); } G.scene.add(im);
      G.addSegCollider(a[0], a[1], b[0], b[1], 0, 2.4); block(a[0] - 0.05, a[0] + 0.05, 2.3, 2.4, a[1], b[1], M().iron); }

    // Place : fontaine, corps du premier choc
    { const q = A(20, 12); fountain(q[0], q[1]); }
    { const a = ALLEYS[2], s = side(a, alleyLen(a) * 0.36, 1.1); G.buildBody(s[0], s[1], s[2] + 1.4); }

    // Ruelle de la tour : barrière à enjamber, tonneaux, caisses
    { const a = ALLEYS[0]; barrier(0.7, -11, 0.15); barrier(-0.8, -17.5, -0.2); let s = side(a, 18, 1.4); barrel(s[0], s[1]); barrel(s[0] + 0.55, s[1] + 0.5); s = side(a, 8, -1.3); crate(s[0], s[1], 0.9, 0.9); crate(s[0] + 0.95, s[1], 0.9, 0.9); crate(s[0] + 0.4, s[1] + 0.1, 0.8, 1.8); }
    // La boucle avec cour : la clé USB sur une caisse
    { const q = A(13, 20); crate(q[0], q[1], 0.9, 0.9); crate(q[0] - 1.1, q[1] + 0.4, 0.7, 0.6); barrel(q[0] + 1.4, q[1] - 0.8);
      const usb = new T.Mesh(new T.BoxGeometry(0.05, 0.02, 0.16), new T.MeshPhongMaterial({ color: 0x8c98a4, shininess: 90, specular: 0xffffff })); usb.position.set(q[0], 0.92, q[1]); usb.rotation.y = 0.8; G.scene.add(usb);
      const glint = new T.Sprite(new T.SpriteMaterial({ map: G.glowTex, color: 0xdfe8ff, blending: T.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 })); glint.position.set(q[0], 1.0, q[1]); glint.scale.set(0.25, 0.25, 1); G.scene.add(glint);
      G.animated.push({ update() { glint.material.opacity = usb.visible ? 0.14 + 0.1 * Math.sin(performance.now() / 650) : 0; } });
      G.interactables.push({ id: 'usb', pos: new T.Vector3(q[0], 0.95, q[1]), radius: 2.0, prompt: 'Prendre la clé USB',
        use() { usb.visible = false; G.interactables = G.interactables.filter(i => i.id !== 'usb'); G.have = G.have || []; G.have.push('usb-colis'); G.say('Une clé USB. Plus lourde qu\'elle n\'en a l\'air. Il faut la ramener au garage.'); } }); }
    // Égout (bout de la branche nord-ouest) : plaque et cadre rouillés
    { const q = A(3, 8), m = new T.Mesh(new T.CylinderGeometry(0.5, 0.5, 0.04, 16), M().iron); m.position.set(q[0], 0.02, q[1] + 1.2); G.scene.add(m); const r = new T.Mesh(new T.TorusGeometry(0.5, 0.04, 6, 16), M().metal); r.rotation.x = Math.PI / 2; r.position.set(q[0], 0.04, q[1] + 1.2); G.scene.add(r); }
    // Grille fermée au bout de l'allée nord
    { const a = ALLEYS[6], e = a.pts[a.pts.length - 1], p = a.pts[a.pts.length - 2], L = Math.hypot(e[0] - p[0], e[1] - p[1]), dx = (e[0] - p[0]) / L, dz = (e[1] - p[1]) / L; gate(e[0] - dx * 1.2, e[1] - dz * 1.2, dx, dz, a.w + 0.5); }
    // Ruelle est : parcours de parkour. Escalier de blocs côté sud, puis passerelle suspendue en travers.
    { const a = A(30, 12), z = a[1]; const hs = [1.1, 2.3, 3.5, 4.7];
      hs.forEach((h, i) => block(a[0] - 8 + i * 1.7, a[0] - 8 + (i + 1) * 1.7, 0, h, z - 0.85, z + 0.85, i % 2 ? M().concrete : M().concreteDark));
      block(a[0] - 1.1, a[0] + 1.9, 5.4, 5.7, z - 6.5, z + 6.5, M().iron);                                    // passerelle
      for (const s of [-1, 1]) block(a[0] - 1.1, a[0] + 1.9, 5.7, 6.6, z + s * 6.5 - 0.04, z + s * 6.5 + 0.04, M().iron); }
    // Place : plots de béton et caisses à enjamber
    { const q = A(20, 12); barrier(q[0] + 10, q[1] + 5, 0.4); barrier(q[0] - 9, q[1] - 6, -0.3); barrier(q[0] + 4, q[1] - 9, 1.2); crate(q[0] - 6, q[1] + 8, 1.0, 1.1); crate(q[0] - 7.1, q[1] + 8.2, 1.0, 2.1); }
    // Garage (hub futur) : épave de voiture au biodiesel, bidons, atelier
    { const g = GARAGE.c; wreck(g[0] + 1, g[1] - 1.5, 0.35); barrel(g[0] - 6, g[1] + 3.5); barrel(g[0] - 5.4, g[1] + 3.8); barrel(g[0] - 6.1, g[1] + 4.4);
      block(g[0] + 2, g[0] + 7.5, 0, 0.95, g[1] + 3.5, g[1] + 4.7, M().iron);                                  // établi
      G.addLamp({ x: g[0], y: 4.2, z: g[1], color: 0xd9d09a, I: 1.0, dist: 11, halo: 1.6, flicker: 0.3 }); }
    // Divers dans les ruelles : barrières à enjamber, sacs, tonneaux
    ALLEYS.slice(1).forEach((a, k) => { const L = alleyLen(a); const s = side(a, L * 0.55, 0); barrier(s[0], s[1], s[2] + (k % 2 ? 1.57 : 0.3)); if (k % 2 === 0) { const t = side(a, L * 0.3, a.w - 0.7); barrel(t[0], t[1]); } });
  }

  /* ---------------------------------------------------------------
     POINT D'ENTRÉE
     --------------------------------------------------------------- */
  G.buildCity = function () {
    buildGround();
    const walls = buildWalls();
    buildFacadeDetails(walls);
    buildProps();
  };

  G.loaded.push('city');
})();
