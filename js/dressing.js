/* =====================================================================
   dressing.js : la CRASSE et les DÉTAILS qui rendent la ville vivante et malsaine (esprit Outlast).
   Tout est posé automatiquement le long des murs et des ruelles (graine fixe : toujours pareil) :
   - décalcomanies : traînées de sang, mains, écritures, taches d'humidité, griffures, fissures ;
   - devantures : rideaux de fer (fermés ou à moitié), enseignes délavées, auvents ;
   - fenêtres : silhouettes qui regardent, planches clouées ;
   - câbles, linge, tuyaux, climatiseurs, balcons ;
   - au sol : sacs, cartons, planches, bouteilles, gravats, papiers, flaques, sang, huile.
   Presque tout est "instancié" (un seul dessin pour des centaines d'objets) : très léger.
   ===================================================================== */
(function () {
  'use strict';
  const G = window.G, T = G.T;
  const C = () => G.city, M = () => G.mat, rnd = () => G.rnd(), hash = G.hash2;

  // --- Texture dessinée sur un canvas (avec transparence), filtrée en douceur ---
  function ctex(w, h, draw) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h);
    const t = new T.CanvasTexture(c); t.magFilter = T.LinearFilter; t.minFilter = T.LinearMipmapLinearFilter; t.anisotropy = 4; return t;
  }
  const decalMat = (tex, o) => new T.MeshPhongMaterial(Object.assign({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, shininess: 2, specular: 0x111111 }, o || {}));
  const blood = (a) => `rgba(${60 + Math.floor(rnd() * 30)},${6 + Math.floor(rnd() * 8)},${6},${a})`;

  const TEX = {
    smear: () => ctex(128, 256, (g, w, h) => {                                      // coulée de sang : on a glissé le long du mur
      for (let i = 0; i < 9; i++) { const x = 20 + rnd() * 88, len = 60 + rnd() * 190, wd = 3 + rnd() * 9; const gr = g.createLinearGradient(0, 0, 0, len); gr.addColorStop(0, blood(0.0)); gr.addColorStop(0.15, blood(0.85)); gr.addColorStop(1, blood(0.95)); g.fillStyle = gr; g.fillRect(x, h - len - 6, wd, len); g.beginPath(); g.arc(x + wd / 2, h - 6, wd * 0.75, 0, 6.28); g.fill(); }
      g.fillStyle = blood(0.8); for (let i = 0; i < 30; i++) { g.beginPath(); g.arc(20 + rnd() * 90, 20 + rnd() * 110, 1 + rnd() * 4, 0, 6.28); g.fill(); }
    }),
    hand: () => ctex(64, 80, (g, w, h) => {                                         // main ensanglantée, étalée
      g.fillStyle = blood(0.85); g.beginPath(); g.ellipse(32, 52, 17, 20, 0, 0, 6.28); g.fill();
      for (let i = 0; i < 4; i++) { g.save(); g.translate(18 + i * 9, 36); g.rotate((i - 1.5) * 0.18); g.fillRect(-3.5, -26 - (i % 3 === 1 ? 5 : 0), 7, 30); g.restore(); }
      g.save(); g.translate(50, 58); g.rotate(0.9); g.fillRect(-4, -20, 8, 22); g.restore();
      g.fillStyle = blood(0.7); g.fillRect(24, 68, 7, 12);
    }),
    stain: () => ctex(128, 128, (g) => { for (let i = 0; i < 14; i++) { const gr = g.createRadialGradient(0, 0, 0, 0, 0, 40); gr.addColorStop(0, 'rgba(10,12,8,0.5)'); gr.addColorStop(1, 'rgba(10,12,8,0)'); g.save(); g.translate(30 + rnd() * 68, 30 + rnd() * 68); g.scale(0.6 + rnd(), 0.6 + rnd() * 1.4, 1); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 40, 0, 6.28); g.fill(); g.restore(); } }),
    mold: () => ctex(128, 128, (g) => { for (let i = 0; i < 60; i++) { const gr = g.createRadialGradient(0, 0, 0, 0, 0, 14); gr.addColorStop(0, 'rgba(34,46,30,0.6)'); gr.addColorStop(1, 'rgba(34,46,30,0)'); g.save(); g.translate(10 + rnd() * 108, 40 + rnd() * 80); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 4 + rnd() * 12, 0, 6.28); g.fill(); g.restore(); } }),
    scratch: () => ctex(128, 128, (g) => { g.strokeStyle = 'rgba(190,190,180,0.55)'; g.lineWidth = 2; const x0 = 25 + rnd() * 20; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(x0 + i * 16, 6 + rnd() * 10); g.bezierCurveTo(x0 + i * 16 + 6, 40, x0 + i * 16 - 4, 80, x0 + i * 16 + 2, 118 - rnd() * 14); g.stroke(); } }),
    crack: () => ctex(128, 256, (g) => { g.strokeStyle = 'rgba(8,8,8,0.8)'; g.lineWidth = 2; let x = 64, y = 0; for (let b = 0; b < 4; b++) { x = 64; y = 0; g.beginPath(); g.moveTo(x, y); while (y < 250) { y += 8 + rnd() * 14; x += (rnd() - 0.5) * (b ? 36 : 22); g.lineTo(x, y); if (rnd() < 0.12 && b < 2) { g.stroke(); g.beginPath(); g.moveTo(x, y); } } g.stroke(); g.lineWidth = 1; } }),
    window: () => ctex(64, 96, (g) => { g.fillStyle = 'rgb(70,56,34)'; g.fillRect(0, 0, 64, 96); const gr = g.createRadialGradient(32, 40, 4, 32, 40, 50); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.7)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 96); g.fillStyle = '#050505'; g.beginPath(); g.arc(32, 32, 9, 0, 6.28); g.fill(); g.fillRect(20, 42, 24, 54); }),   // une silhouette immobile derrière la vitre
    shutter: () => ctex(64, 128, (g, w, h) => { g.fillStyle = '#3a3c3a'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 6) { g.fillStyle = y % 12 ? '#2c2e2c' : '#444644'; g.fillRect(0, y, w, 3); } for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(80,50,30,${0.15 + rnd() * 0.25})`; g.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 6, 8 + rnd() * 30); } }),
    bloodpool: () => ctex(128, 128, (g) => { for (let i = 0; i < 12; i++) { const gr = g.createRadialGradient(0, 0, 0, 0, 0, 30); gr.addColorStop(0, 'rgba(70,8,8,0.9)'); gr.addColorStop(1, 'rgba(70,8,8,0)'); g.save(); g.translate(64 + (rnd() - 0.5) * 40, 64 + (rnd() - 0.5) * 40); g.scale(0.6 + rnd() * 0.8, 0.6 + rnd() * 0.8, 1); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 30, 0, 6.28); g.fill(); g.restore(); } }),
    drop: () => ctex(32, 32, (g) => { const gr = g.createRadialGradient(16, 16, 1, 16, 16, 14); gr.addColorStop(0, 'rgba(80,10,10,0.95)'); gr.addColorStop(1, 'rgba(80,10,10,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(16, 16, 12, 9, 0.5, 0, 6.28); g.fill(); }),
    paper: () => ctex(32, 32, (g) => { g.fillStyle = 'rgb(138,135,124)'; g.fillRect(2, 2, 28, 28); g.fillStyle = 'rgba(40,40,40,0.5)'; for (let y = 7; y < 28; y += 5) g.fillRect(5, y, 20 + Math.random() * 4, 1); }),
    oil: () => ctex(128, 128, (g) => { for (let i = 0; i < 8; i++) { const gr = g.createRadialGradient(0, 0, 0, 0, 0, 36); gr.addColorStop(0, 'rgba(4,5,6,0.85)'); gr.addColorStop(1, 'rgba(4,5,6,0)'); g.save(); g.translate(64 + (rnd() - 0.5) * 40, 64 + (rnd() - 0.5) * 40); g.scale(0.7 + rnd(), 0.5 + rnd() * 0.7, 1); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 36, 0, 6.28); g.fill(); g.restore(); } }),
  };
  const PHRASES = ['ILS SONT LÀ', 'NE REGARDE PAS', 'ОНИ ВНУТРИ', 'НЕ ВЫХОДИ', 'ТИШЕ', 'ILS ÉCOUTENT', '13', 'PERSONNE NE SORT'];
  function chalk(text) {                                                         // inscription à la craie, tremblante
    return ctex(256, 64, (g, w, h) => { g.fillStyle = 'rgba(200,200,190,0.78)'; g.font = 'bold 30px "Courier New", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.save(); g.translate(w / 2, h / 2); g.rotate((rnd() - 0.5) * 0.12); g.fillText(text, 0, 0); g.restore(); for (let i = 0; i < 160; i++) { g.clearRect(rnd() * w, rnd() * h, 1 + rnd() * 3, 1 + rnd() * 3); } });
  }
  const SIGNS = [['PHARMACIE', '#4d6a4f'], ['TABAC', '#6b3a32'], ['БАР', '#3f5a68'], ['БОУЧЕРИ', '#5a4a3a'], ['HÔTEL', '#55504a'], ['РЕМОНТ', '#4a4a52'], ['FRITES', '#6a5a30'], ['24H', '#3a5048'], ['АПТЕКА', '#455c45'], ['COIFFEUR', '#5a4552']];
  function signTex(text, bg) {
    return ctex(256, 64, (g, w, h) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, 0, w, 6); g.fillRect(0, h - 6, w, 6);
      g.fillStyle = 'rgba(225,220,200,0.82)'; g.font = 'bold 34px "Arial Black", Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + 1);
      for (let i = 0; i < 200; i++) { g.fillStyle = `rgba(0,0,0,${0.1 + rnd() * 0.3})`; g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 5, 1 + rnd() * 3); } g.fillStyle = 'rgba(70,40,25,0.4)'; for (let i = 0; i < 6; i++) g.fillRect(rnd() * w, 0, 3, 20 + rnd() * 40); });
  }

  // Une liste de plans collés (mur ou sol) en un seul objet instancié
  const dummy = new T.Object3D(), PLANE = new T.PlaneGeometry(1, 1);
  function decals(tex, list, o) {                // list : [x,y,z,yaw,sx,sy,(roll)]
    if (!list.length) return;
    const im = new T.InstancedMesh(PLANE, decalMat(tex, o), list.length);
    list.forEach((s, i) => { dummy.position.set(s[0], s[1], s[2]); dummy.rotation.set(s.ground ? -Math.PI / 2 : 0, s.ground ? 0 : s[3], s.ground ? s[3] : (s[6] || 0)); dummy.scale.set(s[4], s[5], 1); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); });
    G.scene.add(im);
  }
  const ground = (x, z, ang, sx, sy) => { const a = [x, 0.025 + rnd() * 0.01, z, ang, sx, sy]; a.ground = true; return a; };

  /* ---------- 1. Murs : sang, mains, écritures, humidité, griffures, fissures ---------- */
  function wallDecals(walls) {
    const L = { smear: [], hand: [], stain: [], mold: [], scratch: [], crack: [] }, writing = [];
    for (const w of walls) {
      if (Math.abs(w.mx) < 6 && w.mz > -9) continue;                                // la sortie de la tour reste propre : début calme
      const r = hash(w.mx * 0.91, w.mz * 1.3), yaw = Math.atan2(w.nx, w.nz), p = (o) => [w.mx + w.nx * 0.035, 0, w.mz + w.nz * 0.035, yaw];
      const at = (y, sx, sy) => { const q = p(); q[1] = y; q.push(sx * (rnd() < 0.5 ? -1 : 1), sy); return q; };
      if (r < 0.016) L.smear.push(at(0.9 + rnd() * 0.3, 0.9, 1.8));
      else if (r < 0.030) { for (let i = 0; i < 2 + Math.floor(rnd() * 3); i++) { const q = at(1.0 + rnd() * 0.7 + i * 0.08, 0.34, 0.42); q[0] += -w.nz * (i - 1) * 0.3; q[2] += w.nx * (i - 1) * 0.3; L.hand.push(q); } }
      else if (r < 0.075) L.stain.push(at(0.6 + rnd() * 2.2, 1.6 + rnd() * 1.4, 1.6 + rnd() * 1.8));
      else if (r < 0.105) L.mold.push(at(0.5 + rnd() * 0.8, 1.4 + rnd(), 1.4 + rnd()));
      else if (r < 0.118) L.scratch.push(at(1.3 + rnd() * 0.5, 0.8, 0.8));
      else if (r < 0.128) { const q = at(1.3 + rnd() * 0.5, 1.8, 0.45); writing.push([q, pick(PHRASES)]); }
      else if (r < 0.145) L.crack.push(at(2.2 + rnd() * 1.5, 1.1, 2.2));
    }
    decals(TEX.smear(), L.smear, { shininess: 25, specular: 0x331111 }); decals(TEX.hand(), L.hand, { shininess: 25, specular: 0x331111 }); decals(TEX.stain(), L.stain);
    decals(TEX.mold(), L.mold); decals(TEX.scratch(), L.scratch); decals(TEX.crack(), L.crack);
    for (const [q, text] of writing) { const m = new T.Mesh(PLANE, decalMat(chalk(text))); m.position.set(q[0], q[1], q[2]); m.rotation.y = q[3]; m.scale.set(Math.abs(q[4]), q[5], 1); G.scene.add(m); }
  }
  function pick(a) { return a[Math.floor(rnd() * a.length)]; }

  /* ---------- 2. Devantures : rideaux de fer, enseignes, auvents ---------- */
  function shopfronts(walls) {
    const used = new Set(), shutC = [], shutH = [], doorD = [], awn = [], signs = [];
    for (const w of walls) {
      if (w.len < 0.5 || (Math.abs(w.mx) < 6 && w.mz > -9)) continue;
      const key = Math.floor(w.mx / 3.6) * 4096 + Math.floor(w.mz / 3.6); if (used.has(key) || hash(w.mx * 2.1, w.mz * 1.7) < 0.80) continue; used.add(key);
      const yaw = Math.atan2(w.nx, w.nz), ox = w.mx + w.nx * 0.07, oz = w.mz + w.nz * 0.07, half = rnd() < 0.3;
      (half ? shutH : shutC).push([ox, half ? 1.75 : 1.15, oz, yaw]); if (half) doorD.push([ox + w.nx * 0.01, 0.7, oz + w.nz * 0.01, yaw]);
      signs.push([w.mx + w.nx * 0.08, 2.85, w.mz + w.nz * 0.08, yaw]);
      if (rnd() < 0.4) awn.push([w.mx + w.nx * 0.65, 2.55, w.mz + w.nz * 0.65, yaw]);
    }
    const inst = (geo, mat, list, sc, tilt, colors) => { if (!list.length) return; const im = new T.InstancedMesh(geo, mat, list.length), col = new T.Color();
      list.forEach((s, i) => { dummy.position.set(s[0], s[1], s[2]); dummy.rotation.order = 'YXZ'; dummy.rotation.set(tilt || 0, s[3], 0); dummy.scale.set(sc[0], sc[1], sc[2]); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); if (colors) im.setColorAt(i, col.set(colors[Math.floor(rnd() * colors.length)])); }); G.scene.add(im); dummy.rotation.order = 'XYZ'; };
    const box = new T.BoxGeometry(1, 1, 1), shutMat = new T.MeshPhongMaterial({ map: TEX.shutter(), shininess: 8, specular: 0x222222 });
    inst(box, shutMat, shutC, [2.8, 2.3, 0.08]); inst(box, shutMat, shutH, [2.8, 1.0, 0.08]); inst(box, M().dark, doorD, [2.7, 1.4, 0.05]);
    inst(box, new T.MeshPhongMaterial({ color: 0xffffff, shininess: 2, side: T.DoubleSide }), awn, [3.0, 0.05, 1.3], 0.38, [0x3b4038, 0x4a4540, 0x2f3a3c, 0x4b3f38, 0x55453a]);
    signs.forEach(s => { const [t, bg] = SIGNS[Math.floor(rnd() * SIGNS.length)], m = new T.Mesh(new T.BoxGeometry(2.8, 0.6, 0.1), new T.MeshPhongMaterial({ map: signTex(t, bg), shininess: 4 })); m.position.set(s[0], s[1], s[2]); m.rotation.y = s[3]; G.scene.add(m); });
  }

  /* ---------- 3. Fenêtres : silhouettes qui regardent, planches ---------- */
  function windows(walls) {
    const sil = [], boards = [];
    for (const w of walls) {
      if (hash(w.mx * 0.37, w.mz * 0.53) <= 0.80) continue;                       // mêmes emplacements que les fentes de city.js
      for (const y of [3.2, 6.4, 9.6]) {
        if (y + 1 >= w.h) continue; const q = hash(w.mx + y, w.mz), yaw = Math.atan2(w.nx, w.nz);
        if (q > 0.93 && q < 0.96) sil.push([w.mx + w.nx * 0.1, y, w.mz + w.nz * 0.1, yaw, 0.9, 1.35]);
        else if (q > 0.80 && q < 0.86) boards.push([w.mx + w.nx * 0.12, y, w.mz + w.nz * 0.12, yaw]);
      }
    }
    decals(TEX.window(), sil, { polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
    if (boards.length) { const im = new T.InstancedMesh(new T.BoxGeometry(1.4, 0.12, 0.04), M().wood, boards.length * 2); let k = 0;
      for (const s of boards) for (const a of [0.45, -0.38]) { dummy.position.set(s[0], s[1], s[2]); dummy.rotation.set(0, s[3], a + (rnd() - 0.5) * 0.15); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); im.setMatrixAt(k++, dummy.matrix); } G.scene.add(im); }
  }

  /* ---------- 4. En hauteur : tuyaux, climatiseurs, balcons ---------- */
  function wallStuff(walls) {
    const ac = [], pipe = [], balc = [];
    for (const w of walls) {
      const r = hash(w.mx * 0.57, w.mz * 0.43), yaw = Math.atan2(w.nx, w.nz);
      if (r > 0.5 && r < 0.525) ac.push([w.mx + w.nx * 0.2, 4 + rnd() * 5, w.mz + w.nz * 0.2, yaw]);
      else if (r > 0.7 && r < 0.714) balc.push([w.mx + w.nx * 0.5, 5.5 + Math.floor(rnd() * 2) * 3, w.mz + w.nz * 0.5, yaw]);
      if (hash(Math.floor(w.mx / 9), Math.floor(w.mz / 9)) > 0.62 && w.len > 0.4) pipe.push([w.mx + w.nx * 0.08, 2.1 + 0.5 * hash(Math.floor(w.mx / 9), 1), w.mz + w.nz * 0.08, w.nx, w.nz, w.len]);
    }
    const inst = (geo, mat, list, sc) => { if (!list.length) return; const im = new T.InstancedMesh(geo, mat, list.length); list.forEach((s, i) => { dummy.position.set(s[0], s[1], s[2]); dummy.rotation.set(0, s[3], 0); dummy.scale.set(sc[0], sc[1], sc[2]); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); }); G.scene.add(im); };
    inst(new T.BoxGeometry(1, 1, 1), M().plastic, ac, [0.75, 0.5, 0.4]);
    inst(new T.BoxGeometry(1, 1, 1), M().concreteDark, balc, [2.0, 0.12, 1.0]);
    if (pipe.length) { const im = new T.InstancedMesh(new T.CylinderGeometry(0.045, 0.045, 1, 6), M().metal, pipe.length), up = new T.Vector3(0, 1, 0), q = new T.Quaternion();
      pipe.forEach((s, i) => { dummy.position.set(s[0], s[1], s[2]); q.setFromUnitVectors(up, new T.Vector3(-s[4], 0, s[3])); dummy.quaternion.copy(q); dummy.scale.set(1, s[5] * 1.05, 1); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); dummy.quaternion.identity(); }); G.scene.add(im); }
  }

  /* ---------- 5. Câbles qui pendent, linge, fils coupés ---------- */
  function cables() {
    const rags = [];
    C().ALLEYS.forEach((a, k) => {
      if (k === 8) return; const L = C().alleyLen(a);
      for (let d = 4; d < L - 2; d += 5.5 + rnd() * 3) {
        const p = C().alleyPoint(a, d), w = a.w + 0.5, y = 4.5 + rnd() * 4.5, dy = (rnd() - 0.5) * 1.5, sag = 0.4 + rnd() * 0.7;
        const A0 = [p.x + p.dz * w, y, p.z - p.dx * w], B0 = [p.x - p.dz * w, y + dy, p.z + p.dx * w], Mi = [(A0[0] + B0[0]) / 2 + p.dx * (rnd() - 0.5) * 2, (A0[1] + B0[1]) / 2 - sag, (A0[2] + B0[2]) / 2 + p.dz * (rnd() - 0.5) * 2];
        const cut = rnd() < 0.12;                                                // fil coupé : il pend au milieu
        const pts = cut ? [A0, [A0[0] * 0.8 + Mi[0] * 0.2, A0[1] - 0.6, A0[2] * 0.8 + Mi[2] * 0.2], [A0[0] * 0.6 + Mi[0] * 0.4, A0[1] - 2.2, A0[2] * 0.6 + Mi[2] * 0.4]] : [A0, [(A0[0] + Mi[0]) / 2, (A0[1] + Mi[1]) / 2 - 0.1, (A0[2] + Mi[2]) / 2], Mi, [(B0[0] + Mi[0]) / 2, (B0[1] + Mi[1]) / 2 - 0.1, (B0[2] + Mi[2]) / 2], B0];
        const tube = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(q => new T.Vector3(...q))), 10, rnd() < 0.2 ? 0.03 : 0.016, 3, false), M().iron); G.scene.add(tube);
        if (!cut && rnd() < 0.28) for (let i = 0; i < 3; i++) rags.push([Mi[0] + p.dx * (i - 1) * 0.5 + (rnd() - 0.5) * 0.3, Mi[1] - 0.45, Mi[2] + p.dz * (i - 1) * 0.5 + (rnd() - 0.5) * 0.3, Math.atan2(p.dx, p.dz) + (rnd() - 0.5) * 0.8]);
      }
    });
    if (rags.length) { const im = new T.InstancedMesh(PLANE, new T.MeshPhongMaterial({ color: 0xffffff, side: T.DoubleSide, shininess: 1 }), rags.length), col = new T.Color();
      rags.forEach((s, i) => { dummy.position.set(s[0], s[1], s[2]); dummy.rotation.set(0, s[3], 0); dummy.scale.set(0.45 + rnd() * 0.3, 0.7 + rnd() * 0.4, 1); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); im.setColorAt(i, col.setHex([0x3d3f3c, 0x4a4540, 0x35393b, 0x544c42][Math.floor(rnd() * 4)])); }); G.scene.add(im); }
  }

  /* ---------- 6. Au sol : débris, flaques, sang, huile ---------- */
  function clutter() {
    const bag = [], card = [], plank = [], bottle = [], rubble = [], gnd = { pool: [], drop: [], oil: [], paper: [] }, push = (list, x, z, y, sc) => list.push([x, y, z, rnd() * 6.28, sc]);
    const scatter = (cx, cz, rx, rz, n, ellipse) => { for (let i = 0; i < n; i++) { let x, z; do { x = (rnd() * 2 - 1) * rx; z = (rnd() * 2 - 1) * rz; } while (ellipse && x * x / (rx * rx) + z * z / (rz * rz) > 1); drop(cx + x, cz + z); } };
    const drop = (x, z) => { const r = rnd();
      if (r < 0.2) push(bag, x, z, 0.18, 0.7 + rnd() * 0.7); else if (r < 0.32) push(card, x, z, 0.15, 0.6 + rnd() * 0.7); else if (r < 0.42) push(plank, x, z, 0.04, 0.6 + rnd() * 0.8);
      else if (r < 0.52) push(bottle, x, z, 0.04, 1); else if (r < 0.66) { for (let i = 0; i < 4; i++) push(rubble, x + (rnd() - 0.5) * 0.6, z + (rnd() - 0.5) * 0.6, 0.1, 0.5 + rnd() * 1.1); }
      else if (r < 0.8) gnd.paper.push(ground(x, z, rnd() * 6.28, 0.2 + rnd() * 0.1, 0.28 + rnd() * 0.1)); else if (r < 0.9) gnd.pool.push(ground(x, z, rnd() * 6.28, 0.9 + rnd() * 1.4, 0.7 + rnd() * 0.9)); else if (r < 0.95) gnd.oil.push(ground(x, z, rnd() * 6.28, 1 + rnd(), 1 + rnd())); else gnd.drop.push(ground(x, z, rnd() * 6.28, 0.25 + rnd() * 0.3, 0.2 + rnd() * 0.25)); };
    C().ALLEYS.forEach((a, k) => { const L = C().alleyLen(a); for (let d = 3; d < L; d += 0.9) { const p = C().alleyPoint(a, d), off = (rnd() * 2 - 1) * (a.w - 0.4), x = p.x - p.dz * off, z = p.z + p.dx * off; if (Math.abs(x) < 7 && z > -9) continue; if (rnd() < (k === 0 ? 0.55 : 0.8)) drop(x, z); } });
    const pl = C().PLACE; scatter(pl.c[0], pl.c[1], pl.rx, pl.rz, 130, true); const t = C().TERRACE; scatter(t.c[0], t.c[1], t.hx, t.hz, 50, false);
    // Traînées de sang : des gouttes qui mènent quelque part
    const trail = (k, d0, d1, off) => { const a = C().ALLEYS[k]; for (let d = d0; d < d1; d += 0.5 + rnd() * 0.4) { const p = C().alleyPoint(a, d), o = off + (rnd() - 0.5) * 0.5; gnd.drop.push(ground(p.x - p.dz * o, p.z + p.dx * o, rnd() * 6.28, 0.22 + rnd() * 0.3, 0.18 + rnd() * 0.2)); } const e = C().alleyPoint(a, d1), s = ground(e.x - e.dz * off, e.z + e.dx * off, rnd() * 6.28, 1.8, 1.4); gnd.pool.push(s); };
    trail(1, 2, 18, 0.3); trail(0, 22, 40, -1.2); trail(4, 8, 28, 0.5); trail(5, 4, 20, -0.4);
    // Instanciation
    const inst = (geo, mat, list, colors, scaleFn) => { if (!list.length) return; const im = new T.InstancedMesh(geo, mat, list.length), c = new T.Color();
      list.forEach((s, i) => { dummy.position.set(s[0], s[1], s[2]); dummy.rotation.set(0, s[3], 0); const sc = scaleFn(s); dummy.scale.set(sc[0], sc[1], sc[2]); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); if (colors) im.setColorAt(i, c.setHex(colors[Math.floor(rnd() * colors.length)])); }); G.scene.add(im); };
    const mat = (s) => new T.MeshPhongMaterial({ color: 0xffffff, shininess: s || 4 });
    inst(new T.SphereGeometry(0.28, 8, 6), mat(30), bag, [0x0b0d0b, 0x151815, 0x1c1c1a], s => [s[4], s[4] * 0.7, s[4]]);
    inst(new T.BoxGeometry(0.5, 0.32, 0.4), mat(1), card, [0x5a4a35, 0x4a3f30, 0x3b342b], s => [s[4], s[4], s[4]]);
    inst(new T.BoxGeometry(1.2, 0.05, 0.12), mat(1), plank, [0x4a3f30, 0x3a3328], s => [s[4], 1, 1]);
    const bt = new T.CylinderGeometry(0.04, 0.04, 0.25, 6); bt.rotateZ(Math.PI / 2); inst(bt, mat(60), bottle, [0x2a3a2a, 0x3a3a2a], () => [1, 1, 1]);
    inst(new T.BoxGeometry(0.3, 0.2, 0.25), mat(1), rubble, [0x555855, 0x484b49, 0x3c403e], s => [s[4], s[4], s[4]]);
    decals(TEX.paper(), gnd.paper, { polygonOffsetFactor: -3 });
    decals(TEX.bloodpool(), gnd.pool, { shininess: 40, specular: 0x441111, polygonOffsetFactor: -3 }); decals(TEX.drop(), gnd.drop, { shininess: 40, specular: 0x441111, polygonOffsetFactor: -3 }); decals(TEX.oil(), gnd.oil, { shininess: 90, specular: 0x667788, polygonOffsetFactor: -3 });
  }

  /* ---------- 7. Quelques enseignes à néon, très faibles (vert malade, rose éteint, ambre) ---------- */
  function neons(walls) {
    const a = C().ALLEYS[0], L = C().alleyLen(a), pts = []; for (let d = 8; d < L; d += 3) { const p = C().alleyPoint(a, d); pts.push([p.x, p.z]); }
    const list = [['ТАБАК', 0x3dff7a], ['HÔTEL', 0xff2a6d], ['БАР', 0x05d9e8], ['24H', 0xffb347], ['ЧАЙ', 0x3dff7a], ['РЕМОНТ', 0xffb347], ['BAR', 0xff2a6d]];
    let n = 0;
    for (const w of walls) { if (n >= list.length) break; if (hash(w.mx * 1.3, w.mz * 0.7) < 0.97 || w.len < 0.5) continue;
      if (!pts.some(q => Math.hypot(q[0] - w.mx, q[1] - w.mz) < 7)) continue;
      const [t, col] = list[n++], yaw = Math.atan2(w.nx, w.nz), c = document.createElement('canvas'); c.width = 128; c.height = 40; const g = c.getContext('2d');
      g.fillStyle = '#0a0a0c'; g.fillRect(0, 0, 128, 40); g.strokeStyle = '#' + col.toString(16).padStart(6, '0'); g.lineWidth = 2; g.strokeRect(2, 2, 124, 36); g.fillStyle = g.strokeStyle; g.font = 'bold 22px "DejaVu Sans", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, 64, 21);
      const tx = new T.CanvasTexture(c), m = new T.Mesh(new T.PlaneGeometry(1.5, 0.47), new T.MeshBasicMaterial({ map: tx, color: 0x777777 })); m.position.set(w.mx + w.nx * 0.12, 3.8 + rnd(), w.mz + w.nz * 0.12); m.rotation.y = yaw; G.scene.add(m);
      G.addLamp({ x: w.mx + w.nx * 0.8, y: m.position.y, z: w.mz + w.nz * 0.8, color: col, I: 0.5, dist: 7, halo: 1.6, flicker: 0.8 }); }
  }

  G.buildDressing = function (walls) {
    wallDecals(walls); shopfronts(walls); windows(walls); wallStuff(walls); cables(); clutter(); neons(walls);
  };

  G.loaded.push('dressing');
})();
