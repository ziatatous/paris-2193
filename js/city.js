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
  G.MAP_ASCII = `CARTE v2 (proposition, façon Sleeping Dogs). 1 caractère = 4 m. Nord en haut.

     0         1         2         3         4         5         6   
     0123456789012345678901234567890123456789012345678901234567890123
  0  ########################################~~~~~~~VV~~~~~~~~~~~~~~~
  1  ###########################X##############~~~~~VV~~~~~~~~~~~~~~~
  2  #######################....################~~~~VV~~~~~~~~~~~~~~~
  3  ########TTTTTTTT#####..#####################~~~VV~~~~L~~~~~~~~~~
  4  ########TTTTTTTT###..######################~~~~VV~~~~~~~~~~~~~~~
  5  ########TTTTTTTT##.######################~~~L~~VV~~~~~~~~~~~~H~~
  6  ########TTTTTTTT##.#####################~~~~~~~VV~~~~~C~~~~~~~~~
  7  ###E####TTTTTTTT###.####################~~~~~~~VV~~~~~~~~~~~~~~~
  8  ###.#########S#####.#####################~s~~~~VV~~~~~~~~~~~~~~~
  9  ###.##########S####:::::Y:##########.....K~~~~~VV~L~~~~~~~t~~~~~
 10  ###.##########S###:::n:::::#####=...#####~~~~~~VV~~~~~~H~~~~~~~~
 11  ###.#############:::::::::::###..#######~~~~~~~VV~~~~~~~~~~~~~x~
 12  ###.+###########M:n:::F:::::...+######~~~~~~C~~VV~~~~~~~~~~~~~x~
 13  ####.########MeMe:::::::::::########~~~~~~~~~~~VV~~~~~~~~~~~~~x~
 14  ####=#####MMMeM##R:::::n:::.#######~~~~~~~~~~~~VV~~~~~~t~~~~~~x~
 15  ####.###MBMM####R##:::::::#.=######~~~~~~~~~~~~VV~~~L~~~~~~~~~x~
 16  #####.#MMM##.##R######.#####.########~~~~~~~~~~VV~~~~~~~~~~~t~x~
 17  #####.MnM#e#.#R######.#.#####.#########~~~~~~~~VV~~~~t~~~~~~~~x~
 18  #####MMM#e#=#.######.##.#####.###########~~~~C~VV~~~~~~~~~~~~~x~
 19  #####MMMe###.######.####.###+############~~~~~~VV~~~~~~~~~~~~~~~
 20  #####MMe###R.!####.######....############~~~~~~VV~~~C~~~~~H~~~~~
 21  #####MMM##R.#####.##########.############~~t~~~VV~~~~~~~~~~~~~~~
 22  #####nMM...#+###.############..#########~~~~~~~VV~~~~~~~~L~~~~~~
 23  #####MMMR#####..###############.#########~~~~~~VV~~t~~~~~~~~~~~~
 24  #####MMM......##################...#######~~~~~GV~~~~~~~~~~~~~~~
 25  ######A############################.......K~~~~VV~~~~~~~~~~~~~~~
 26  ###########################################~~~~VV~~C~~~~~~~~DD~~
 27  ###########################################~~~~VV~~~~~~~t~~~D~~~
 28  #########################################~~~~~~VV~~~~~~~~~~~~~~~
 29  ######################################~~~~~~~~~VV~~~~~~~~~~~~~~~

Légende : # immeubles · . ruelle étroite · M rue du marché (large, étals) · : place des lanternes · ~ zone plate (brouillard, sans mur)
A tour (départ) · F fontaine · E égout · G garage sous le viaduc · V viaduc d'autoroute en ruine · K contrôle de police · Y bouche de métro
B corps · ! clé USB · X grille fermée · + cachettes · e étals du marché · n enseignes (néon très faible) · T terrasse haute (+3 m) · S escalier
= passerelle entre immeubles · R chemin sur les toits · C épaves · L lampadaires · t arbres morts · H pylône électrique · s abribus · x clôture · D silhouette lointaine`;

  // Case ASCII (colonne, ligne) -> monde (x, z). La tour (colonne 6, ligne 25) est à l'origine, sa façade à z = -2,65.
  const A = (c, r) => [(c - 6) * 4, (r - 25) * 4 - 0.65];
  G.mapWorld = A;

  /* ---------------------------------------------------------------
     1. L'ESPACE LIBRE
     --------------------------------------------------------------- */
  const ALLEYS = [   // w = demi-largeur en mètres
    { w: 4.4, pts: [[0, -2.65], A(6, 19), A(8, 16), A(11, 14), A(15, 13), A(19, 12), A(22, 12)] },    // 0 : RUE DU MARCHÉ, large, de la tour à la place
    { w: 1.6, pts: [A(6, 18), A(4, 15), A(3, 11), A(3, 8)] },                                          // 1 : branche nord-ouest -> égout
    { w: 1.5, pts: [A(6, 22), A(10, 22), A(12, 20), A(13, 18), A(12, 16)] },                           // 2 : boucle avec cour (la clé USB)
    { w: 2.2, pts: [A(22, 12), A(26, 12), A(30, 12), A(33, 10), A(37, 9), A(41, 9)] },                 // 3 : vers la zone plate (barrage de police)
    { w: 2.0, pts: [A(22, 14), A(24, 19), A(28, 21), A(31, 23), A(35, 25), A(42, 25)] },               // 4 : vers le garage sous le viaduc
    { w: 1.8, pts: [A(21, 10), A(18, 5), A(21, 3), A(25, 2), A(27, 1)] },                              // 5 : vers le nord (grille fermée)
    { w: 1.7, pts: [A(26, 12), A(27, 15), A(29, 17), A(28, 21)] },                                     // 6 : raccord central
    { w: 1.6, pts: [A(6, 23), A(10, 24), A(13, 24), A(16, 22), A(19, 19), A(21, 17), A(23, 16)] },     // 7 : ruelle du sud
    { w: 1.8, pts: [[34, -50], [32, -58], [32, -71]] }                                                 // 8 : couloir de l'escalier vers la terrasse
  ];
  const PLACE = { c: A(22, 12), rx: 22, rz: 15 };                  // place des lanternes
  const TERRACE = { c: [22, -80.65], hx: 16, hz: 10 };             // terrasse haute (sol à +3,2 m)
  const ALCOVES = [A(4, 12), A(12, 22), A(28, 19), A(31, 12)];     // cachettes (porche, cour)
  const TOWER = { x0: -2.1, x1: 2.1, z0: -2.65, z1: 8.3 };         // la tour est pleine (elle a sa propre géométrie)
  const X0 = -30, X1 = 234, Z0 = -106, Z1 = 20;                    // limites de la carte (mètres)

  const xlim = z => { const row = (z + 0.65) / 4 + 25; return ((40 + 3 * Math.sin(row / 3) + 2 * Math.sin(row / 1.3)) - 6) * 4 - 2; };   // bord est de la ville
  G.isField = (x, z) => x > xlim(z) + 1;
  // Filet de sécurité : un point au sol hors de l'espace libre (dans la masse des bâtiments) ou hors de la carte n'est pas jouable
  G.isPlayable = (x, z) => (x > TOWER.x0 && x < TOWER.x1 && z > TOWER.z0 && z < TOWER.z1) || (x > X0 && x < X1 + 4 && z > Z0 && z < Z1 && sdf(x, z) < 0.8);

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
    d = Math.min(d, Math.max(Math.abs(x - TERRACE.c[0]) - TERRACE.hx, Math.abs(z - TERRACE.c[1]) - TERRACE.hz));
    d += (vn(x / 7, z / 7) - 0.5) * 0.6 + (vn(x / 2.3, z / 2.3) - 0.5) * 0.3;
    const tx = Math.max(TOWER.x0 - x, x - TOWER.x1, TOWER.z0 - z, z - TOWER.z1);   // distance au rectangle de la tour (négatif dedans)
    if (z > TOWER.z0 && x > -12 && x < 12) d = Math.max(d, 1);                     // les immeubles alignés avec la tour ferment la rue au sud
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
      const h = 12 + 6 * G.hash2(Math.floor(mx / 15), Math.floor(mz / 15));   // toujours >= 12 m : plus haut que ce qu'on peut grimper
      G.addSegCollider(ax, az, bx, bz, 0, h);
      walls.push({ mx, mz, nx, nz, h, len });
      const levels = LV.filter(y => y < h - 0.5).concat([h]), base = pos.length / 3;
      const useX = Math.abs(nx) > Math.abs(nz);
      for (const y of levels) {
        const k = [0.6, 0.74, 0.89, 0.97, 1.0][Math.min(levels.indexOf(y), 4)] * (0.9 + 0.1 * G.hash2(mx * 1.7, y));
        for (const P of [[ax, az], [bx, bz]]) {
          const m = k * (0.8 + 0.5 * vn(P[0] / 5 + y * 0.11, P[1] / 5 + y * 0.17));          // grandes taches de crasse sur la façade
          pos.push(P[0], y, P[1]); nor.push(nx, 0, nz); uv.push((useX ? P[1] : P[0]) / tile, y / tile); col.push(m, m * 0.98, m * 0.94);
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
    G.addBoxCollider(X0 - 10, X1 + 10, 12.4, 13.0, Z0 - 10, Z1 + 10);       // plafond invisible : impossible de monter au-dessus des murs (jamais de pied plus haut que ~10,6 m)
    G.addBoxCollider(X1, X1 + 5, -5, 40, Z0 - 5, Z1 + 5); G.addBoxCollider(X0 - 5, X1 + 5, -5, 40, Z0 - 5, Z0); G.addBoxCollider(X0 - 5, X1 + 5, -5, 40, Z1, Z1 + 5);
  }

  // Outils partagés avec places.js et dressing.js
  const alleyLen = a => a.pts.slice(1).reduce((s, q, i) => s + Math.hypot(q[0] - a.pts[i][0], q[1] - a.pts[i][1]), 0);
  function alleyPoint(a, dist) {     // point et direction à une distance donnée le long d'une ruelle
    let d = dist;
    for (let i = 0; i < a.pts.length - 1; i++) {
      const p = a.pts[i], q = a.pts[i + 1], L = Math.hypot(q[0] - p[0], q[1] - p[1]);
      if (d <= L || i === a.pts.length - 2) { const t = G.clamp(d / L, 0, 1); return { x: p[0] + (q[0] - p[0]) * t, z: p[1] + (q[1] - p[1]) * t, dx: (q[0] - p[0]) / L, dz: (q[1] - p[1]) / L }; }
      d -= L;
    }
  }
  function side(a, dist, off) { const p = alleyPoint(a, dist); return [p.x - p.dz * off, p.z + p.dx * off, Math.atan2(p.dx, p.dz)]; }   // décalé sur le côté
  G.city = { ALLEYS, PLACE, TERRACE, ALCOVES, TOWER, X0, X1, Z0, Z1, A, sdf, xlim, vn, alleyLen, alleyPoint, side };

  /* ---------------------------------------------------------------
     POINT D'ENTRÉE
     --------------------------------------------------------------- */
  G.buildCity = function () {
    buildGround();
    const walls = buildWalls();
    buildFacadeDetails(walls);
    G.city.walls = walls;
    G.buildPlaces();           // marché, terrasse, ponts, viaduc, garage, barrages (places.js)
    G.buildDressing(walls);    // saleté, devantures, câbles, débris (dressing.js)
  };

    G.loaded.push('city');
})();
