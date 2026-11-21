/* =====================================================================
   textures.js : matières dessinées par code (128x128), volontairement un peu floues.
   Brutalisme : béton gris coulé dans des coffrages (joints + trous de tirants), taches, coulures.
   Les textures sont adoucies (filtrage linéaire) : pas de gros pixels carrés, une matière brute et molle.
   ===================================================================== */
(function () {
  'use strict';
  const G = window.G, T = G.T;

  // Fabrique une texture à partir d'une fonction (x, y) -> [r, g, b]
  G.makeTexture = function (S, fn) {
    const data = new Uint8ClampedArray(S * S * 4);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const p = fn(x, y), i = (y * S + x) * 4;
      data[i] = p[0]; data[i + 1] = p[1]; data[i + 2] = p[2]; data[i + 3] = 255;
    }
    const c = document.createElement('canvas'); c.width = c.height = S;
    c.getContext('2d').putImageData(new ImageData(data, S, S), 0, 0);
    const t = new T.CanvasTexture(c);
    t.magFilter = T.LinearFilter; t.minFilter = T.LinearMipmapLinearFilter;
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.anisotropy = G.renderer ? G.renderer.capabilities.getMaxAnisotropy() : 1;
    return t;
  };

  // Béton coffré : un panneau de 2,5 m avec joints sur les bords et 4 trous de tirants, grain fin, taches, coulures.
  function concreteFn(S, tint, stain) {
    const f = G.fbm(S), f2 = G.makeNoise(S, 32, 5), f3 = G.makeNoise(S, 64, 9), cr = G.crackSet(S, 3, 40);
    const holes = [[S * 0.25, S * 0.25], [S * 0.75, S * 0.25], [S * 0.25, S * 0.75], [S * 0.75, S * 0.75]];
    return (x, y) => {
      let m = (0.5 + f(x, y) * 0.8) * (0.9 + (f3(x, y) - 0.5) * 0.4 + (G.rnd() - 0.5) * 0.12) * stain;
      if (G.hash2(Math.floor(x / 2), 7) > 0.8) m *= 0.75 + 0.25 * f2(x * 0.3, y);      // coulures d'eau
      if (x < 2 || y < 2) m *= 0.55;                                                    // joints du coffrage
      for (const h of holes) { const d = Math.hypot(x - h[0], y - h[1]); if (d < 3.4) m *= d < 2 ? 0.3 : 0.65; }   // trous de tirants
      if (cr.has(y * S + x)) m *= 0.45;
      return [104 * m * tint[0], 106 * m * tint[1], 104 * m * tint[2]];
    };
  }
  // Asphalte : très sombre, gravillons, fissures, taches
  function asphaltFn(S) {
    const f = G.fbm(S), cr = G.crackSet(S, 7, 70);
    return (x, y) => {
      let m = (0.55 + f(x, y) * 0.7) * (0.85 + G.rnd() * 0.3);
      if (G.rnd() < 0.03) m *= 1.8;
      if (cr.has(y * S + x)) m *= 0.4;
      return [50 * m, 52 * m, 54 * m];
    };
  }
  // Métal rouillé gris (tonneaux, rambardes)
  function metalFn(S) {
    const f = G.fbm(S), f2 = G.makeNoise(S, 32, 3);
    return (x, y) => {
      const g = f(x, y), q = 0.6 + f2(x, y) * 0.7;
      let r = 78 * q, gg = 80 * q, b = 80 * q;
      if (g > 0.55) { const k = 0.7 + f2(x, y) * 0.8; r = 105 * k; gg = 66 * k; b = 44 * k; }   // rouille
      if (G.hash2(Math.floor(x / 2), 9) > 0.86) { r *= 0.6; gg *= 0.6; b *= 0.6; }               // coulures
      return [r, gg, b];
    };
  }
  // Peinture d'appartement : vert-gris sale qui s'écaille, laisse voir le béton dessous
  function paintFn(S) {
    const f = G.fbm(S), f2 = G.makeNoise(S, 16, 14), con = concreteFn(S, [1, 1, 1], 1);
    return (x, y) => {
      if (f(x + 20, y + 7) + (f2(x, y) - 0.5) * 0.25 < 0.36) return con(x, y);                  // peinture écaillée -> béton
      const m = (0.55 + f(x, y) * 0.8) * (0.92 + G.rnd() * 0.12);
      return [96 * m, 108 * m, 92 * m];
    };
  }
  // Sol usé : béton sombre verdâtre
  function floorFn(S) {
    const f = G.fbm(S), f2 = G.makeNoise(S, 32, 21);
    return (x, y) => {
      const m = (0.5 + f(x, y) * 0.7) * (0.9 + G.rnd() * 0.15) * (x % 64 < 1 || y % 64 < 1 ? 0.55 : 1);
      return [66 * m, 72 * m, 66 * m * (0.95 + f2(x, y) * 0.1)];
    };
  }

  // Neige d'écran cathodique : une petite image dont on redessine le bruit plusieurs fois par seconde
  G.makeStatic = function () {
    const c = document.createElement('canvas'); c.width = 64; c.height = 48;
    const g = c.getContext('2d'), img = g.createImageData(64, 48);
    const t = new T.CanvasTexture(c); t.magFilter = T.LinearFilter; t.minFilter = T.LinearFilter;
    let band = 0;
    return {
      texture: t,
      update(time) {
        band = (band + 1.7) % 48;
        for (let y = 0; y < 48; y++) for (let x = 0; x < 64; x++) {
          const i = (y * 64 + x) * 4, v = Math.random() * 150 + (Math.abs(y - band) < 3 ? 70 : 0);
          img.data[i] = v * 0.45; img.data[i + 1] = v; img.data[i + 2] = v * 0.78; img.data[i + 3] = 255;   // lueur verte
        }
        g.putImageData(img, 0, 0); t.needsUpdate = true;
      }
    };
  };

  // --- Matériaux (une seule fois). vertexColors = la "saleté cuite" dans la géométrie (voir world.js) ---
  G.buildMaterials = function () {
    const mk = (fn, o) => new T.MeshPhongMaterial(Object.assign({ map: G.makeTexture(128, fn), vertexColors: true, shininess: 3, specular: 0x111111 }, o || {}));
    G.mat = {
      concrete: mk(concreteFn(128, [1, 1, 1], 1)),
      concreteDark: mk(concreteFn(128, [0.8, 0.82, 0.82], 0.8)),
      wall: mk(paintFn(128)),                                                   // murs intérieurs de l'appartement
      floor: mk(floorFn(128)),
      asphalt: mk(asphaltFn(128), { shininess: 38, specular: 0x3a444c }),      // mouillé : accroche un peu la lumière
      metal: mk(metalFn(128), { shininess: 12, specular: 0x222222 }),
      dark: new T.MeshPhongMaterial({ color: 0x08090a, shininess: 2 }),
      iron: new T.MeshPhongMaterial({ color: 0x15171a, shininess: 20, specular: 0x333333 }),
      cloth: new T.MeshPhongMaterial({ color: 0x4b524a, shininess: 2 }),
      cloth2: new T.MeshPhongMaterial({ color: 0x6d7168, shininess: 2 }),
      plastic: new T.MeshPhongMaterial({ color: 0x3b3d3b, shininess: 14, specular: 0x222222 }),
      glass: new T.MeshPhongMaterial({ color: 0x1a2426, shininess: 90, specular: 0x8fa5ad, transparent: true, opacity: 0.35 })
    };
  };

  G.loaded.push('textures');
})();
