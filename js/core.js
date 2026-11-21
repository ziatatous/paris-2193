/* =====================================================================
   core.js : outils partagés (réglages, aléatoire, bruit).
   Tous les fichiers du jeu partagent un seul objet global : G.
   Chaque fichier ajoute ses fonctions à G, rien ne s'exécute avant G.boot().
   ===================================================================== */
(function () {
  'use strict';
  const G = window.G = window.G || { loaded: [] };
  G.T = window.THREE;

  // --- Réglages du joueur (sauvegardés dans le navigateur si possible) ---
  G.settings = { quality: 'medium', sens: 1, volume: 0.9, music: 0.6, fx: 0.9 };
  G.loadSettings = function () {
    try { Object.assign(G.settings, JSON.parse(localStorage.getItem('paris2193') || '{}')); } catch (e) { /* pas grave */ }
  };
  G.saveSettings = function () {
    try { localStorage.setItem('paris2193', JSON.stringify(G.settings)); } catch (e) { /* pas grave */ }
  };

  // --- Aléatoire à graine : le monde est toujours identique d'une partie à l'autre ---
  let _s = 1337;
  G.rnd = function () {
    _s |= 0; _s = _s + 0x6D2B79F5 | 0;
    let t = Math.imul(_s ^ _s >>> 15, 1 | _s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  G.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  G.lerp = (a, b, t) => a + (b - a) * t;
  G.smooth = t => t * t * (3 - 2 * t);
  G.hash2 = (a, b) => { const h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); };

  // --- Bruit "doux" qui se répète sans couture : base de toutes les saletés des textures ---
  G.makeNoise = function (S, cells, seed) {
    let s = seed; const g = [];
    for (let i = 0; i < cells * cells; i++) { s = (s * 16807) % 2147483647; g.push(s / 2147483647); }
    return (x, y) => {
      const fx = x / S * cells, fy = y / S * cells, x0 = Math.floor(fx), y0 = Math.floor(fy);
      const tx = G.smooth(fx - x0), ty = G.smooth(fy - y0);
      const X0 = ((x0 % cells) + cells) % cells, X1 = (X0 + 1) % cells, Y0 = ((y0 % cells) + cells) % cells, Y1 = (Y0 + 1) % cells;
      const a = g[Y0 * cells + X0], b = g[Y0 * cells + X1], c = g[Y1 * cells + X0], d = g[Y1 * cells + X1];
      return (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
    };
  };
  // Plusieurs bruits de tailles différentes superposés = taches naturelles
  G.fbm = function (S) {
    const a = G.makeNoise(S, 4, 11), b = G.makeNoise(S, 8, 23), c = G.makeNoise(S, 16, 37);
    return (x, y) => a(x, y) * 0.5 + b(x, y) * 0.3 + c(x, y) * 0.2;
  };
  // Fissures : marches aléatoires. Renvoie l'ensemble des pixels fissurés.
  G.crackSet = function (S, count, len) {
    const set = new Set();
    for (let n = 0; n < count; n++) {
      let x = Math.floor(G.rnd() * S), y = Math.floor(G.rnd() * S), a = G.rnd() * 6.28;
      for (let i = 0; i < len; i++) {
        a += (G.rnd() - 0.5) * 0.9;
        x = (x + Math.round(Math.cos(a)) + S) % S; y = (y + Math.round(Math.sin(a)) + S) % S;
        set.add(y * S + x);
      }
    }
    return set;
  };

  G.loaded.push('core');
})();
