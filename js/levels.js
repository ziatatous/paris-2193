/* =====================================================================
   levels.js : les NIVEAUX. Petits, parfaitement linéaires, PUNITIFS : quand on est arrêté, retour immédiat au début.
   Architecture CUBIQUE : tous les murs sont droits, à angles droits. Un mur = deux couches (0,3 m + 0,3 m) :
   la couche avant est percée de NICHES (fenêtres, portes, rideaux de fer, passages), et tout le décor est posé À
   L'INTÉRIEUR de ces niches. Rien ne peut donc dépasser du mur, ni d'un côté ni de l'autre.
   Niveau 1 « Chez nous » : appartement -> escalier -> hall -> cour (1 policier qui patrouille) -> ruelle -> place du contact.
   ===================================================================== */
(function () {
  'use strict';
  const G = window.G, T = G.T, M = () => G.mat, rnd = () => G.rnd();
  const H = 14, FR = 0.3, TH = 0.6;
  const ph = (c, s) => new T.MeshPhongMaterial({ color: c, shininess: s === undefined ? 4 : s });
  let MATS = null;
  function mats() {
    if (MATS) return MATS;
    MATS = { door: ph(0x2d3031, 16), frame: ph(0x181a1a, 6), dark: ph(0x040506, 1), handle: ph(0x6a6d70, 60), plank: M().wood,
      glass: new T.MeshPhongMaterial({ color: 0x0b1012, shininess: 90, specular: 0x8aa0c0 }), warm: new T.MeshBasicMaterial({ color: 0x7a5f34 }),
      shutter: new T.MeshPhongMaterial({ map: G.dress.TEX.shutter(), shininess: 8, specular: 0x222222 }) };
    return MATS;
  }

  /* ---------------------------------------------------------------
     FAÇADES À NICHES
     axis 'z' : mur le long de x, face en z = c ; axis 'x' : mur le long de z, face en x = c.
     open = +1 si l'espace libre est du côté des coordonnées croissantes, -1 sinon. [a0,a1] = étendue le long du mur.
     --------------------------------------------------------------- */
  function boxer(axis, c, open) {
    const b = -open;                                        // b : sens du corps du mur (vers l'intérieur de la masse)
    return {
      box(a, y, d, sa, sy, sd, mat) {                      // d = profondeur depuis la face (d > 0 : dans le mur, d < 0 : devant)
        const dc = c + b * d;
        return axis === 'z' ? G.B(a - sa / 2, a + sa / 2, y - sy / 2, y + sy / 2, dc - sd / 2, dc + sd / 2, mat, { grime: false, collide: false, tile: 1 })
                            : G.B(dc - sd / 2, dc + sd / 2, y - sy / 2, y + sy / 2, a - sa / 2, a + sa / 2, mat, { grime: false, collide: false, tile: 1 });
      },
      plank(a, y, d, len, ang) {                           // planche clouée de travers dans une niche
        const m = new T.Mesh(new T.BoxGeometry(axis === 'z' ? len : 0.05, axis === 'z' ? 0.12 : 0.12, axis === 'z' ? 0.05 : len), mats().plank), dc = c + b * d;
        if (axis === 'z') { m.position.set(a, y, dc); m.rotation.z = ang; } else { m.position.set(dc, y, a); m.rotation.x = ang; m.geometry = new T.BoxGeometry(0.05, 0.12, len); }
        G.scene.add(m); return m;
      }
    };
  }
  function decor(X, f) {
    const y0 = f.y0 || 0, w = f.w, h = f.h, a = f.a, yc = y0 + h / 2, m = mats();
    if (f.type === 'window') {
      X.box(a, yc, 0.27, w - 0.04, h - 0.04, 0.02, f.lit ? m.warm : m.glass);                                                    // la vitre, au fond de la niche
      X.box(a, y0 + 0.03, 0.12, w, 0.06, 0.07, m.frame); X.box(a, y0 + h - 0.03, 0.12, w, 0.06, 0.07, m.frame);                // cadre
      X.box(a - w / 2 + 0.03, yc, 0.12, 0.06, h, 0.07, m.frame); X.box(a + w / 2 - 0.03, yc, 0.12, 0.06, h, 0.07, m.frame);
      if (f.boards) { X.plank(a, yc, 0.05, w * 1.05, 0.5); X.plank(a, yc, 0.07, w * 1.05, -0.4); }                              // fenêtre condamnée
    } else if (f.type === 'garage') {                                                                                           // rideau de fer
      const hh = f.closed === false ? h * 0.42 : h * 0.97;
      X.box(a, y0 + h - hh / 2 - 0.05, 0.12, w - 0.12, hh, 0.05, m.shutter);
      X.box(a - w / 2 + 0.04, yc, 0.1, 0.08, h, 0.08, m.frame); X.box(a + w / 2 - 0.04, yc, 0.1, 0.08, h, 0.08, m.frame);     // glissières
      X.box(a, y0 + h - 0.06, 0.1, w, 0.12, 0.1, m.frame);                                                                       // caisson
      if (hh < h * 0.9) X.box(a, y0 + (h - hh) / 2 - 0.02, 0.27, w - 0.04, h - hh, 0.02, m.dark);                                // l'intérieur, noir
    } else if (f.type === 'door') {
      X.box(a, yc, 0.14, w - 0.08, h - 0.05, 0.06, m.door);
      X.box(a, y0 + h - 0.03, 0.1, w, 0.06, 0.08, m.frame); X.box(a - w / 2 + 0.03, yc, 0.1, 0.06, h, 0.08, m.frame); X.box(a + w / 2 - 0.03, yc, 0.1, 0.06, h, 0.08, m.frame);
      X.box(a + w / 2 - 0.2, y0 + h * 0.45, 0.08, 0.05, 0.14, 0.06, m.handle);
    }
    if (f.sign) {                                                                                                               // enseigne posée À PLAT sur la façade, pas plus large que l'ouverture
      const mm = new T.MeshPhongMaterial({ map: G.dress.signTex(f.sign[0], f.sign[1]), shininess: 4 });
      X.box(a, y0 + h + 0.45, -0.05, Math.min(w + 0.2, 3.4), 0.6, 0.1, mm);
    }
  }
  const DEC = { smear: [], hand: [], stain: [], mold: [], scratch: [], crack: [] }, CHALK = [];
  function facade(axis, c, open, a0, a1, feats, o) {
    o = o || {}; const b = -open, f0 = c, f1 = c + b * FR, f2 = c + b * TH, ops = [], gaps = [];
    for (const f of feats) { const y0 = f.y0 || 0, r = [f.a - f.w / 2, f.a + f.w / 2, y0, y0 + f.h]; ops.push(r); if (f.type === 'gap') gaps.push(r); }
    G.wall(axis, Math.min(f0, f1), Math.max(f0, f1), a0, a1, 0, H, ops, M().facade, { tile: 5 });                  // couche avant (percée de niches)
    G.wall(axis, Math.min(f1, f2), Math.max(f1, f2), a0, a1, 0, H, gaps, M().concreteDark, { tile: 3 });           // couche arrière (pleine, sauf passages)
    const X = boxer(axis, c, open); for (const f of feats) decor(X, f);
    // Crasse : sang, mains, taches, humidité, griffures, fissures, craie (décalcomanies plates sur la face)
    const len = a1 - a0, n = Math.floor(len * (o.dirt === undefined ? 0.55 : o.dirt)), yaw = axis === 'z' ? (open > 0 ? 0 : Math.PI) : (open > 0 ? Math.PI / 2 : -Math.PI / 2);
    for (let i = 0; i < n; i++) {
      const a = a0 + 0.8 + rnd() * (len - 1.6), r = rnd(); let type, y, sx, sy;
      if (r < 0.10) { type = 'smear'; y = 0.95; sx = 0.9; sy = 1.8; } else if (r < 0.18) { type = 'hand'; y = 1.0 + rnd() * 0.7; sx = 0.34; sy = 0.42; }
      else if (r < 0.50) { type = 'stain'; y = 0.6 + rnd() * 2.4; sx = 1.6 + rnd() * 1.4; sy = 1.6 + rnd() * 1.8; } else if (r < 0.66) { type = 'mold'; y = 0.6 + rnd() * 0.8; sx = 1.5 + rnd(); sy = 1.5 + rnd(); }
      else if (r < 0.76) { type = 'scratch'; y = 1.4 + rnd() * 0.4; sx = 0.8; sy = 0.8; } else if (r < 0.90) { type = 'crack'; y = 2.4 + rnd() * 1.4; sx = 1.1; sy = 2.2; } else { type = 'chalk'; y = 1.5 + rnd() * 0.4; sx = 1.8; sy = 0.45; }
      if (o.clear && o.clear.some(k => Math.abs(a - k) < 1.2) && type !== 'stain' && type !== 'mold') continue;   // pas de sang SUR les portes
      const p = axis === 'z' ? [a, y, c + open * 0.035, yaw, sx * (rnd() < 0.5 ? -1 : 1), sy] : [c + open * 0.035, y, a, yaw, sx * (rnd() < 0.5 ? -1 : 1), sy];
      if (type === 'chalk') CHALK.push([p, G.dress.PHRASES[Math.floor(rnd() * G.dress.PHRASES.length)]]); else DEC[type].push(p);
    }
  }
  function flushDecals() {
    const D = G.dress, spec = { smear: { shininess: 25, specular: 0x331111 }, hand: { shininess: 25, specular: 0x331111 } };
    for (const k in DEC) { D.decals(D.TEX[k](), DEC[k], spec[k]); DEC[k] = []; }
    for (const [p, text] of CHALK) { const m = new T.Mesh(new T.PlaneGeometry(1, 1), D.decalMat(D.chalk(text))); m.position.set(p[0], p[1], p[2]); m.rotation.y = p[3]; m.scale.set(Math.abs(p[4]), p[5], 1); G.scene.add(m); }
    CHALK.length = 0;
  }

  /* ---------------------------------------------------------------
     OBJETS : lumières, fûts, caisses, débris, cachettes
     --------------------------------------------------------------- */
  const block = (x0, x1, y0, y1, z0, z1, mat) => G.B(x0, x1, y0, y1, z0, z1, mat || M().concreteDark, { grime: false });
  const mesh = (geo, mat, x, y, z, parent) => { const q = new T.Mesh(geo, mat); q.position.set(x, y, z); (parent || G.scene).add(q); return q; };
  function lamp(x, y, z, o) {                                                       // lampe de façade : console + ampoule + halo ; certaines sont mortes
    o = o || {};
    block(x - 0.05, x + 0.05, y - 0.05, y + 0.05, z - 0.05, z + 0.05, M().iron);
    G.addLamp({ x, y, z, color: o.color || 0xffa44a, I: o.broken ? 0 : (o.I || 0.9), dist: o.dist || 12, halo: o.broken ? 0 : (o.halo || 3.5), flicker: o.flicker || 0, fogHalo: true });
  }
  function barrel(x, z) {
    mesh(new T.CylinderGeometry(0.3, 0.3, 0.9, 14), M().metal, x, 0.45, z);
    for (const y of [0.08, 0.45, 0.82]) mesh(new T.CylinderGeometry(0.315, 0.315, 0.04, 14), M().iron, x, y, z);
    G.addBoxCollider(x - 0.3, x + 0.3, 0, 0.9, z - 0.3, z + 0.3);
  }
  function fireBarrel(x, z) {                                                       // fût qui brûle : lumière chaude qui vacille (et qui te rend plus visible)
    barrel(x, z);
    const f = new T.Sprite(new T.SpriteMaterial({ map: G.glowTex, color: 0xff8a3a, blending: T.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.7 }));
    f.position.set(x, 1.05, z); f.scale.set(0.9, 1.1, 1); G.scene.add(f);
    G.animated.push({ update() { f.scale.set(0.8 + 0.25 * Math.random(), 1.0 + 0.4 * Math.random(), 1); } });
    G.addLamp({ x, y: 1.3, z, color: 0xff8a3a, I: 1.25, dist: 11, halo: 2.4, flicker: 6, bulb: false });
  }
  const CRATE = new T.MeshPhongMaterial({ color: 0x241e17, shininess: 1, specular: 0x000000 });
  function crate(x, z, s, h, ry) { const q = mesh(new T.BoxGeometry(s, h, s), CRATE, x, h / 2, z); q.rotation.y = ry || 0; G.addBoxCollider(x - s / 2, x + s / 2, 0, h, z - s / 2, z + s / 2); }
  function lowWall(x0, x1, z0, z1) { block(x0, x1, 0, 0.85, z0, z1, new T.MeshPhongMaterial({ color: 0x2c2e2d, shininess: 1, specular: 0x000000 })); }

  // Cachettes à ENTRER (E) : benne, casier, tas de caisses sous une bâche. front = direction vers l'extérieur.
  G.hides = [];
  function slit(on) { const s = document.getElementById('slit'); if (s) s.style.display = on ? 'block' : 'none'; }
  function makeHide(o) {
    const [fx, fz] = o.front, along = Math.abs(fx) > 0.5 ? 'z' : 'x';
    const w = o.type === 'locker' ? 0.9 : 1.9, d = o.type === 'locker' ? 0.75 : 1.1;
    const sx = along === 'z' ? d : w, sz = along === 'z' ? w : d;                                    // taille en x et en z
    const h = { x: o.x, z: o.z, front: o.front, outPos: [o.x + fx * 1.35, o.z + fz * 1.35], facing: Math.atan2(-fx, -fz), compromised: false };
    let anim = null;
    if (o.type === 'dumpster') {
      mesh(new T.BoxGeometry(sx, 0.95, sz), M().dumpster, o.x, 0.52, o.z);
      const lid = new T.Group(); lid.position.set(o.x - fx * d / 2, 1.0, o.z - fz * d / 2); G.scene.add(lid);                      // couvercle articulé du côté du mur
      const lm = new T.Mesh(new T.BoxGeometry(sx * (along === 'z' ? 1.02 : 1.03), 0.06, sz * (along === 'z' ? 1.03 : 1.02)), M().dumpster); lm.position.set(fx * d / 2, 0, fz * d / 2); lid.add(lm);
      const axisRot = along === 'z' ? 'z' : 'x'; anim = open => { lid.rotation[axisRot] = open ? (along === 'z' ? -fx * -0.9 : fz * 0.9) : 0; };
      G.addBoxCollider(o.x - sx / 2, o.x + sx / 2, 0, 1.0, o.z - sz / 2, o.z + sz / 2);
    } else if (o.type === 'locker') {
      mesh(new T.BoxGeometry(sx, 2.0, sz), M().metal, o.x, 1.0, o.z);
      const door = new T.Group(); door.position.set(o.x + fx * d / 2 + (along === 'x' ? 0.4 : 0), 1.0, o.z + fz * d / 2 + (along === 'z' ? 0.4 : 0)); G.scene.add(door);
      const dm = new T.Mesh(new T.BoxGeometry(along === 'z' ? 0.04 : 0.8, 1.9, along === 'z' ? 0.8 : 0.04), M().iron); dm.position.set(along === 'z' ? 0 : -0.4, 0, along === 'z' ? -0.4 : 0); door.add(dm);
      anim = open => { door.rotation.y = open ? 1.5 * (along === 'z' ? fx : -fz) : 0; };
      G.addBoxCollider(o.x - sx / 2, o.x + sx / 2, 0, 2.0, o.z - sz / 2, o.z + sz / 2);
    } else {                                                                                       // tas de caisses recouvert d'une bâche
      for (const k of [-0.5, 0.5]) mesh(new T.BoxGeometry(along === 'z' ? 1.0 : 1.0, 0.9, 1.0), M().wood, o.x + (along === 'x' ? k : 0) - fx * 0.2, 0.45, o.z + (along === 'z' ? k : 0) - fz * 0.2);
      const t = mesh(new T.BoxGeometry(sx * 1.05, 0.05, sz * 1.05), ph(0x3b4038, 2), o.x, 1.0, o.z); t.rotation.x = along === 'x' ? 0 : 0.18 * -fz; t.rotation.z = along === 'x' ? 0.18 * fx : 0;
      G.addBoxCollider(o.x - sx / 2, o.x + sx / 2, 0, 1.0, o.z - sz / 2, o.z + sz / 2);
    }
    if (anim) anim(true);
    const item = { id: 'hide', pos: new T.Vector3(o.x + fx * 1.0, 1.0, o.z + fz * 1.0), radius: 2.0, prompt: 'Se cacher',
      use() { enter(h); } };
    h.item = item; h.anim = anim; G.interactables.push(item); G.hides.push(h);
    h.exit = function () {
      const P = G.P; P.pos.set(h.outPos[0], 0, h.outPos[1]); P.h = 1.75; P.eye = 1.62; P.vx = P.vz = 0; P.safe.copy(P.pos);
      G.frozen = false; G.hidden = null; slit(false); if (h.anim) h.anim(true);
    };
    return h;
  }
  function enter(h) {
    const P = G.P;
    h.compromised = G.cops.some(c => (c.state === 'suspicious' || c.state === 'chase') && c.alert > 0.5 && Math.hypot(c.x - P.pos.x, c.z - P.pos.z) < 24 && G.los(c.x, c.y + 1.7, c.z, h.x, 1, h.z));   // un policier t'a vu entrer
    G.hidden = h; G.frozen = true; P.pos.set(h.x, 0, h.z); P.h = 1.0; P.eye = 0.95; P.vx = P.vz = P.vy = 0; P.yaw = h.facing; P.pitch = 0; P.mode = 'move';
    slit(true); if (h.anim) h.anim(false);
    const f = G.audio && G.audio.fx; if (f) f('hide', 1);
  }

  // Débris au sol (sacs, cartons, planches, gravats, papiers, flaques, sang) sur des rectangles
  function clutter(rects) {
    const D = G.dress, bag = [], card = [], plank = [], rub = [], gnd = { pool: [], drop: [], oil: [], paper: [] };
    for (const r of rects) for (let i = 0; i < r.n; i++) {
      const x = r.x0 + rnd() * (r.x1 - r.x0), z = r.z0 + rnd() * (r.z1 - r.z0), p = rnd();
      if (p < 0.22) bag.push([x, 0.18, z, rnd() * 6.28, 0.7 + rnd() * 0.7]); else if (p < 0.34) card.push([x, 0.15, z, rnd() * 6.28, 0.6 + rnd() * 0.7]);
      else if (p < 0.44) plank.push([x, 0.04, z, rnd() * 6.28, 0.6 + rnd() * 0.8]); else if (p < 0.62) { for (let k = 0; k < 4; k++) rub.push([x + (rnd() - 0.5) * 0.6, 0.1, z + (rnd() - 0.5) * 0.6, rnd() * 6.28, 0.5 + rnd() * 1.1]); }
      else if (p < 0.76) gnd.paper.push(D.ground(x, z, rnd() * 6.28, 0.2 + rnd() * 0.1, 0.28 + rnd() * 0.1)); else if (p < 0.88) gnd.pool.push(D.ground(x, z, rnd() * 6.28, 0.9 + rnd() * 1.4, 0.7 + rnd() * 0.9));
      else if (p < 0.94) gnd.oil.push(D.ground(x, z, rnd() * 6.28, 1 + rnd(), 1 + rnd())); else gnd.drop.push(D.ground(x, z, rnd() * 6.28, 0.25 + rnd() * 0.3, 0.2 + rnd() * 0.25));
    }
    const dummy = new T.Object3D(), inst = (geo, mat, list, colors, sc) => { if (!list.length) return; const im = new T.InstancedMesh(geo, mat, list.length), col = new T.Color();
      list.forEach((s, i) => { dummy.position.set(s[0], s[1], s[2]); dummy.rotation.set(0, s[3], 0); const k = sc(s); dummy.scale.set(k[0], k[1], k[2]); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); im.setColorAt(i, col.setHex(colors[Math.floor(rnd() * colors.length)])); }); G.scene.add(im); };
    const mt = s => new T.MeshPhongMaterial({ color: 0xffffff, shininess: 1, specular: 0x000000 });
    inst(new T.SphereGeometry(0.28, 8, 6), mt(30), bag, [0x070807, 0x0c0e0c, 0x101110], s => [s[4], s[4] * 0.7, s[4]]);
    inst(new T.BoxGeometry(0.5, 0.32, 0.4), mt(1), card, [0x2a2319, 0x231e17, 0x1d1a15], s => [s[4], s[4], s[4]]);
    inst(new T.BoxGeometry(1.2, 0.05, 0.12), mt(1), plank, [0x241e17, 0x1c1812], s => [s[4], 1, 1]);
    inst(new T.BoxGeometry(0.3, 0.2, 0.25), mt(1), rub, [0x2a2c2a, 0x242624, 0x1e201f], s => [s[4], s[4], s[4]]);
    D.decals(D.TEX.paper(), gnd.paper, { polygonOffsetFactor: -3 }); D.decals(D.TEX.bloodpool(), gnd.pool, { shininess: 40, specular: 0x441111, polygonOffsetFactor: -3 });
    D.decals(D.TEX.drop(), gnd.drop, { shininess: 40, specular: 0x441111, polygonOffsetFactor: -3 }); D.decals(D.TEX.oil(), gnd.oil, { shininess: 90, specular: 0x667788, polygonOffsetFactor: -3 });
  }
  function cable(a, b, sag, r) {
    const mid = [(a[0] + b[0]) / 2, Math.min(a[1], b[1]) - sag, (a[2] + b[2]) / 2];
    G.scene.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3([a, [(a[0] + mid[0]) / 2, (a[1] + mid[1]) / 2 - 0.1, (a[2] + mid[2]) / 2], mid, [(b[0] + mid[0]) / 2, (b[1] + mid[1]) / 2 - 0.1, (b[2] + mid[2]) / 2], b].map(q => new T.Vector3(...q))), 10, r || 0.016, 3, false), M().iron));
  }
  function civilian() {                                                              // le contact : même squelette que la police, mais en civil, sans lampe
    const g = G.makeCop(); g.traverse(o => { if (o.material && o.material.color) { o.material = o.material.clone(); o.material.color.multiplyScalar(0.75).lerp(new T.Color(0x4a4036), 0.45); } });
    g.userData.rig.beam.visible = false; return g;
  }

  /* ---------------------------------------------------------------
     NIVEAU 1
     --------------------------------------------------------------- */
  const START = [0.1, 9, 0.9];
  G.buildLevel1 = function () {
    const m = mats();
    G.have = []; G.objective = 'La clé USB est près du lit. Prends-la, puis descends.';
    G.isPlayable = null;                                                                  // filet de la grande carte : inutile ici (il te renvoyait dans la tour)
    G.B(-24, 72, -1, 0, -44, 14, M().asphalt, { tile: 3, grime: false });                                    // sol
    const sign = (i) => G.dress.SIGNS[i];

    // ---- Façades : tout est droit, à angles droits ----
    // Côté tour (sud de la cour)
    facade('z', -2.65, -1, -12, -2.1, [
      { type: 'garage', a: -8.6, w: 3.4, h: 2.7, closed: false, sign: sign(5) }, { type: 'window', a: -4.4, w: 1.0, h: 1.0, y0: 1.5, boards: true },
      ...[-10.8, -8.4, -6, -3.6].map(a => ({ type: 'window', a, w: 1.0, h: 1.4, y0: 4.2, lit: rnd() < 0.15 })), ...[-10.8, -6, -3.6].map(a => ({ type: 'window', a, w: 1.0, h: 1.4, y0: 7.4 }))], { clear: [-8.6, -4.4] });
    facade('z', -2.65, -1, 2.1, 12, [
      { type: 'door', a: 6.2, w: 1.3, h: 2.4, sign: sign(9) }, { type: 'garage', a: 10.3, w: 2.2, h: 2.5, closed: true },
      ...[3.6, 6, 8.4, 10.8].map(a => ({ type: 'window', a, w: 1.0, h: 1.4, y0: 4.2, lit: rnd() < 0.2 })), ...[3.6, 8.4, 10.8].map(a => ({ type: 'window', a, w: 1.0, h: 1.4, y0: 7.4, boards: rnd() < 0.4 }))], { clear: [6.2, 10.3] });
    // Cour : ouest, nord, est (avec le passage vers la ruelle)
    facade('x', -12, 1, -26.6, -2.05, [
      { type: 'garage', a: -9.5, w: 3.6, h: 2.8, closed: true, sign: sign(2) }, { type: 'door', a: -17, w: 1.3, h: 2.4 }, { type: 'window', a: -21.5, w: 1.0, h: 1.0, y0: 1.5, boards: true },
      ...[-5, -9.5, -13.5, -17, -21, -24].map(a => ({ type: 'window', a, w: 1.0, h: 1.4, y0: 4.2 })), ...[-5, -13.5, -21].map(a => ({ type: 'window', a, w: 1.0, h: 1.4, y0: 7.4, lit: rnd() < 0.3 }))], { clear: [-9.5, -17] });
    facade('z', -26, 1, -12, 12, [
      { type: 'garage', a: -6.5, w: 4.0, h: 2.6, closed: true, sign: sign(6) }, { type: 'door', a: 1, w: 1.3, h: 2.4 }, { type: 'garage', a: 7.5, w: 3.0, h: 2.6, closed: false },
      ...[-10, -3.5, 4, 10].map(a => ({ type: 'window', a, w: 1.0, h: 1.4, y0: 4.2 })), ...[-10, -6.5, -3.5, 4, 10].map(a => ({ type: 'window', a, w: 1.0, h: 1.4, y0: 7.4, lit: rnd() < 0.2 }))], { clear: [-6.5, 1, 7.5] });
    facade('x', 12, -1, -26.6, -2.05, [
      { type: 'gap', a: -13, w: 6, h: 4 }, { type: 'door', a: -22, w: 1.3, h: 2.4 }, { type: 'window', a: -5, w: 1.0, h: 1.0, y0: 1.5 },
      ...[-5, -9, -17, -21, -24].map(a => ({ type: 'window', a, w: 1.0, h: 1.4, y0: 4.2 })), ...[-5, -9, -17, -24].map(a => ({ type: 'window', a, w: 1.0, h: 1.4, y0: 7.4 }))]);
    // Ruelle
    facade('z', -17, 1, 12, 50, [
      { type: 'garage', a: 18.5, w: 3.4, h: 2.7, closed: false, sign: sign(0) }, { type: 'door', a: 29, w: 1.3, h: 2.4, sign: sign(7) }, { type: 'garage', a: 40, w: 3.6, h: 2.7, closed: true, sign: sign(1) }, { type: 'window', a: 46, w: 1.0, h: 1.0, y0: 1.5, boards: true },
      ...[15, 22, 25, 33, 36, 43].map(a => ({ type: 'window', a, w: 1.0, h: 1.4, y0: 4.2 })), ...[15, 22, 25, 33, 36, 43, 47].map(a => ({ type: 'window', a, w: 1.0, h: 1.4, y0: 7.4, lit: rnd() < 0.2 }))], { clear: [18.5, 29, 40] });
    facade('z', -9, -1, 12, 50, [
      { type: 'garage', a: 25, w: 4.4, h: 3.0, closed: false, sign: sign(4) }, { type: 'door', a: 36, w: 1.3, h: 2.4 }, { type: 'window', a: 16, w: 1.0, h: 1.0, y0: 1.5 },
      ...[15, 20, 30, 33, 40, 44, 47].map(a => ({ type: 'window', a, w: 1.0, h: 1.4, y0: 4.2 })), ...[15, 20, 30, 40, 47].map(a => ({ type: 'window', a, w: 1.0, h: 1.4, y0: 7.4, boards: rnd() < 0.3 }))], { clear: [25, 36] });
    // Place du contact
    facade('x', 50, 1, -19.6, -17, []); facade('x', 50, 1, -9, -6.4, []);
    facade('z', -19, 1, 49.4, 60, [{ type: 'garage', a: 55, w: 3.4, h: 2.6, closed: true }, ...[52, 56.5, 58.8].map(a => ({ type: 'window', a, w: 1.0, h: 1.4, y0: 4.2 })), ...[52, 56.5].map(a => ({ type: 'window', a, w: 1.0, h: 1.4, y0: 7.4 }))], { clear: [55] });
    facade('z', -7, -1, 49.4, 60, [{ type: 'door', a: 52.5, w: 1.3, h: 2.4 }, ...[52.5, 55.5, 58.4].map(a => ({ type: 'window', a, w: 1.0, h: 1.4, y0: 4.2 })), { type: 'window', a: 56.5, w: 1.0, h: 1.0, y0: 1.5, boards: true }], { clear: [52.5] });
    facade('x', 60, -1, -19.6, -6.4, [{ type: 'door', a: -13, w: 1.6, h: 2.5, sign: sign(8) }, ...[-17, -9.5].map(a => ({ type: 'window', a, w: 1.0, h: 1.4, y0: 4.2 })), ...[-17, -13, -9.5].map(a => ({ type: 'window', a, w: 1.0, h: 1.4, y0: 7.4, lit: a === -13 }))], { clear: [-13] });

    // ---- Lumières : peu de lampes, certaines mortes (le noir sert à se cacher) ----
    lamp(-3.5, 3.2, -3.1, { I: 0.9 });                                                  // près de la porte de la tour
    lamp(11.3, 3.4, -7.9, { flicker: 0.6, I: 0.8 }); lamp(11.3, 3.4, -18.2, { broken: true });
    lamp(22, 3.6, -16.6, { broken: true }); lamp(38, 3.6, -9.6, { flicker: 0.4, I: 0.85 }); lamp(59.4, 3.1, -13, { color: 0xffc070, I: 0.8, dist: 9, halo: 2.4 });
    fireBarrel(5, -23.4); fireBarrel(28.5, -10.3);                                      // deux îlots de lumière : à éviter ou à contourner

    // ---- Cour : cachettes, couvertures basses, désordre ----
    makeHide({ type: 'dumpster', x: -11.35, z: -6, front: [1, 0] }); makeHide({ type: 'dumpster', x: 11.35, z: -5, front: [-1, 0] });
    crate(0, -15, 1.0, 0.9); crate(1.05, -15.5, 1.0, 0.9, 0.3); crate(-1.0, -14.6, 0.9, 0.7, 0.5); lowWall(-7, -5, -19.6, -19); crate(-6, -18.2, 1.0, 0.9); crate(7.5, -20, 1.0, 0.9); crate(8.6, -20.3, 0.9, 0.9, 0.2);
    // ---- Ruelle ----
    crate(24, -16.35, 1.0, 0.9); crate(25.05, -16.35, 1.0, 0.9, 0.2); crate(36.5, -16.35, 1.0, 0.9); lowWall(30, 32, -11.6, -11); crate(42.5, -9.6, 1.0, 0.9);
    makeHide({ type: 'locker', x: 33.5, z: -9.45, front: [0, -1] });
    // ---- Place ----
    makeHide({ type: 'tarp', x: 52.6, z: -18.3, front: [0, 1] }); crate(54, -14.5, 1.0, 0.9); crate(55.15, -14.9, 0.9, 0.9, 0.3); lowWall(51, 53, -10.4, -9.8);
    // ---- Câbles et désordre ----
    for (const [y, z] of [[6.4, -12], [7.8, -20], [5.8, -5]]) cable([-12, y, z], [12, y + 0.3, z + 0.5], 0.9);
    for (const x of [18, 30, 44]) cable([x, 6, -17], [x + 1, 6.4, -9], 0.7);
    clutter([{ x0: -11, x1: 11, z0: -25, z1: -5, n: 90 }, { x0: 13, x1: 49, z0: -16.5, z1: -9.5, n: 70 }, { x0: 51, x1: 59, z0: -18.5, z1: -7.5, n: 30 }]);
    flushDecals();

    // ---- Objets : la clé USB (chez nous) ----
    const usb = new T.Mesh(new T.BoxGeometry(0.05, 0.02, 0.16), new T.MeshPhongMaterial({ color: 0x8c98a4, shininess: 90, specular: 0xffffff })); usb.position.set(-1.0, 9.02, 0.35); usb.rotation.y = 0.6; G.scene.add(usb);
    const glint = new T.Sprite(new T.SpriteMaterial({ map: G.glowTex, color: 0xdfe8ff, blending: T.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 })); glint.position.set(-1.0, 9.1, 0.35); glint.scale.set(0.25, 0.25, 1); G.scene.add(glint);
    G.animated.push({ update() { glint.material.opacity = usb.visible ? 0.14 + 0.1 * Math.sin(performance.now() / 650) : 0; } });
    const usbItem = { id: 'usb', pos: new T.Vector3(-1.0, 9.1, 0.35), radius: 2.0, prompt: 'Prendre la clé USB',
      use() { usb.visible = false; G.interactables = G.interactables.filter(i => i !== usbItem); G.have.push('usb-chez-nous'); G.objective = 'Livre la clé au contact, au fond de la ruelle.'; G.say('La clé. Il faut la livrer au contact, au bout de la ruelle. Discret.', 6000); } };
    G.interactables.push(usbItem);
    G.onReset.push(() => { usb.visible = true; if (!G.interactables.includes(usbItem)) G.interactables.push(usbItem); });

    // ---- Le contact : devant la porte du fond ----
    const contact = civilian(); contact.position.set(58.7, 0, -13); contact.rotation.y = -Math.PI / 2; G.scene.add(contact);
    const rig = contact.userData.rig; G.animated.push({ update() { const t = performance.now() / 1000; rig.torso.scale.y = 1 + Math.sin(t * 1.5) * 0.012; rig.head.rotation.y = Math.sin(t * 0.5) * 0.4; rig['sh1'].rotation.x = -0.2; rig['sh-1'].rotation.x = 0.1; rig['el1'].rotation.x = -0.4; rig['el-1'].rotation.x = -0.3; } });
    G.interactables.push({ id: 'contact', pos: new T.Vector3(58.3, 1.3, -13), radius: 2.4, prompt: 'Livrer la clé USB',
      use() { if (!G.have.includes('usb-chez-nous')) { G.say('« T\'as rien pour moi. Reviens avec la clé. »', 3500); return; } G.levelComplete(); } });

    // ---- Police : un patrouilleur dans la cour, un garde sur la place ----
    G.addCop(G.makeCop(), [-8, -14], 0, [[-8, -14], [8, -14]]);
    G.addCop(G.makeCop(), [55.5, -11.5], -Math.PI / 2 - 0.3, null);
    G.buildNavGrid(-16, 64, -30, -1, 1);
    G.addFogSheets();
  };



  // NAPPES DE BRUME : quelques grands plans transparents près du sol, qui dérivent. Ils suivent le joueur mais la texture est
  // calée sur le monde, donc on voit la brume « épaisse » sans réduire la distance de vue (la densité du brouillard ne change pas).
  G.addFogSheets = function () {
    const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d'), im = g.createImageData(128, 128);
    const n = (x, y, k) => { let v = 0, a = 1, f = 4 * k, tot = 0; for (let o = 0; o < 4; o++) { const X = x * f, Y = y * f, ix = Math.floor(X), iy = Math.floor(Y), fx = X - ix, fy = Y - iy, h = (i, j) => { const q = Math.sin(((i % (4 * k * (1 << o))) * 127.1 + (j % (4 * k * (1 << o))) * 311.7 + o * 17) * 43758.5453); return q - Math.floor(q); };
      const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy); v += a * ((h(ix, iy) * (1 - sx) + h(ix + 1, iy) * sx) * (1 - sy) + (h(ix, iy + 1) * (1 - sx) + h(ix + 1, iy + 1) * sx) * sy); tot += a; a *= 0.5; f *= 2; } return v / tot; };
    for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) { const v = Math.max(0, n(x / 128, y / 128, 1) - 0.38) * 2.4, i = (y * 128 + x) * 4; im.data[i] = 150; im.data[i + 1] = 165; im.data[i + 2] = 170; im.data[i + 3] = Math.min(255, v * 255); }
    g.putImageData(im, 0, 0);
    const tex = new T.CanvasTexture(cv); tex.wrapS = tex.wrapT = T.RepeatWrapping;
    const sheets = [];
    [[0.25, 0.20, 1], [0.7, 0.16, 0.8], [1.2, 0.13, 1.3], [1.8, 0.10, 0.9]].forEach(([y, op, sc], i) => {
      const m = new T.Mesh(new T.PlaneGeometry(90, 90), new T.MeshBasicMaterial({ map: tex.clone(), transparent: true, opacity: op, depthWrite: false, fog: true }));
      m.material.map.needsUpdate = true; m.material.map.wrapS = m.material.map.wrapT = T.RepeatWrapping; m.material.map.repeat.set(3 * sc, 3 * sc);
      m.rotation.x = -Math.PI / 2; m.renderOrder = 2; G.scene.add(m); sheets.push({ m, y, sc, i });
    });
    G.animated.push({ update(dt) {
      const P = G.P, t = performance.now() / 1000; if (!P) return;
      for (const s of sheets) {
        const baseY = (P.pos.y > 5 ? 9 : 0);
        s.m.position.set(P.pos.x, baseY + s.y, P.pos.z);
        const rep = 3 * s.sc, k = rep / 90, dr = (s.i % 2 ? 1 : -1) * t * 0.012;
        s.m.material.map.offset.set(P.pos.x * k + dr, -P.pos.z * k + t * 0.007 * (s.i + 1));
      }
    } });
  };

  /* ---------------------------------------------------------------
     LABO POLICIER : un grand sol plat dans la brume, un policier, des raccourcis clavier. Sert à régler le corps,
     la démarche et la vitesse SANS jouer le niveau. (Aucune arrestation.)
     --------------------------------------------------------------- */
  G.buildLab = function () {
    G.isPlayable = null; G.have = []; G.objective = '';
    G.B(-40, 40, -1, 0, -40, 40, M().asphalt, { tile: 3, grime: false });
    crate(-4, -4, 1.0, 0.9); crate(4, -9, 1.0, 0.9); lowWall(-2, 2, -14, -13.4); fireBarrel(8, -3);
    lamp(0, 3.6, -20, { I: 0.9, dist: 14 });
    const c = G.addCop(G.makeCop(), [0, -12], 0, [[-8, -12], [8, -12]]);
    G.buildNavGrid(-30, 30, -30, 30, 1);
    const box = document.createElement('div');
    box.style.cssText = 'position:fixed;left:12px;top:12px;z-index:5;font:12px/1.5 monospace;color:#9aa;background:rgba(0,0,0,.55);padding:8px 10px;pointer-events:none;white-space:pre';
    document.body.appendChild(box);
    const sp = G.COP_SPEED, base = Object.assign({}, sp); let mult = 1, paused = false, n = 1;
    G.animated.push({ update() { box.textContent = 'LABO POLICIER\n1 calme  2 méfiant  3 poursuite  4 fouille  5 crie\n6/7 vitesse -/+ (x' + mult.toFixed(2) + ')  8 +1 flic  9 -1 flic  0 pause\nétat: ' + (G.cops[0] ? G.cops[0].state : '-') + '  flics: ' + G.cops.length; } });
    addEventListener('keydown', e => {
      const k = e.code.replace('Digit', '').replace('Numpad', ''), P = G.P, cs = G.cops;
      if (k === '6' || k === '7') { mult = G.clamp(mult * (k === '7' ? 1.25 : 0.8), 0.25, 3); for (const q in base) sp[q] = base[q] * mult; }
      else if (k === '0') { paused = !paused; for (const q of cs) q.frozenLab = paused; }
      else if (k === '8') { const q = G.addCop(G.makeCop(), [(Math.random() - 0.5) * 16, -14 - Math.random() * 6], 0, null); q.state = 'idle'; n++; }
      else if (k === '9' && cs.length > 1) { const q = cs.pop(); G.scene.remove(q.g); if (q.lamp) q.lamp.I = 0; }
      else if (/^[1-5]$/.test(k)) for (const q of cs) {
        q.last = [P.pos.x, P.pos.z]; q.path = []; q.pathT = 0;
        if (k === '1') { q.state = 'idle'; q.alert = 0; } else if (k === '2') { q.state = 'suspicious'; q.alert = 0.6; } else if (k === '3') { q.state = 'chase'; q.alert = 1; q.lostT = 0; }
        else if (k === '4') { q.state = 'search'; q.alert = 0.8; q.searchT = 10; } else if (k === '5') { q.shoutT = 1.6; }
      }
    });
    const P = G.P; if (P) { P.pos.set(0, 0, 4); P.safe.set(0, 0, 4); P.yaw = 0; }
    G.labStart = [0, 0, 4]; G.addFogSheets();
  };

  /* ---------------------------------------------------------------
     REMISE À ZÉRO INSTANTANÉE (arrestation) et FIN DE NIVEAU
     --------------------------------------------------------------- */
  G.resetLevel = function () {
    const P = G.P; P.pos.set(START[0], START[1], START[2]); P.yaw = 0; P.pitch = 0; P.vx = P.vy = P.vz = 0; P.mode = 'move'; P.anim = null; P.onGround = true; P.h = 1.75; P.stunT = 0; P.eye = START[1] + 1.62;
    P.safe.set(START[0], START[1], START[2]); P.wallUsed = false; P.dashT = 0; P.dashAir = false; P.slideT = 0; P.coyote = 0;
    G.have = []; G.hidden = null; slit(false); G.arrest = null; G.frozen = false; G.alert = 0; G.completed = false; G.resetCops();
    for (const h of G.hides) if (h.anim) h.anim(true);
    for (const fn of G.onReset) fn();
    G.objective = 'La clé USB est près du lit. Prends-la, puis descends.';
    const f = document.getElementById('fade'); if (f) { f.style.transition = 'opacity 0.45s'; f.style.opacity = 0; }
  };
  G.levelComplete = function () {
    if (G.completed) return; G.completed = true; G.frozen = true;
    const f = document.getElementById('fade'); if (f) { f.style.transition = 'opacity 1.2s'; f.style.opacity = 1; }
    G.say('Livré.', 1500); const fx = G.audio && G.audio.fx; if (fx) fx('deliver', 1);
    setTimeout(() => { if (G.endLevelScreen) G.endLevelScreen('NIVEAU 1 TERMINÉ', 'la suite arrive · cliquer pour rejouer'); }, 1500);
  };

  G.loaded.push('levels');
})();
