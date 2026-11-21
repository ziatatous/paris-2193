/* =====================================================================
   physics.js : les obstacles solides et les questions qu'on leur pose.
   Deux sortes d'obstacles :
     - BOÎTES alignées (sols, marches, caisses, murs droits) : on peut marcher dessus.
     - SEGMENTS de mur (murs en biais des ruelles) : un trait vu du dessus, avec une hauteur.
   Pour aller vite, tout est rangé dans une grille de cases de 8 m : on ne regarde que les voisins.
   Le joueur est un CYLINDRE (rayon R, hauteur H) ; le sol de base est y = 0.
   ===================================================================== */
(function () {
  'use strict';
  const G = window.G;
  const CELL = 8, OFF = 4096;
  G.colliders = [];
  const grid = new Map();
  let stamp = 0;
  const key = (i, j) => (i + OFF) * 8192 + (j + OFF);

  function insert(c) {
    G.colliders.push(c);
    for (let i = Math.floor(c.minX / CELL); i <= Math.floor(c.maxX / CELL); i++)
      for (let j = Math.floor(c.minZ / CELL); j <= Math.floor(c.maxZ / CELL); j++) {
        const k = key(i, j); let a = grid.get(k); if (!a) grid.set(k, a = []); a.push(c);
      }
    return c;
  }
  G.addBoxCollider = (x0, x1, y0, y1, z0, z1) => insert({ t: 0, minX: Math.min(x0, x1), maxX: Math.max(x0, x1), minY: Math.min(y0, y1), maxY: Math.max(y0, y1), minZ: Math.min(z0, z1), maxZ: Math.max(z0, z1), q: 0 });
  G.addSegCollider = (ax, az, bx, bz, y0, y1) => insert({ t: 1, ax, az, bx, bz, l2: (bx - ax) * (bx - ax) + (bz - az) * (bz - az) || 1e-6,
    minX: Math.min(ax, bx), maxX: Math.max(ax, bx), minZ: Math.min(az, bz), maxZ: Math.max(az, bz), minY: y0, maxY: y1, q: 0 });
  // Un rectangle tourné (voiture, caisse en biais) = 4 segments
  G.addOBBCollider = function (cx, cz, w, d, ry, y0, y1) {
    const c = Math.cos(ry), s = Math.sin(ry), hw = w / 2, hd = d / 2;
    const P = [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]].map(p => [cx + p[0] * c + p[1] * s, cz - p[0] * s + p[1] * c]);
    for (let i = 0; i < 4; i++) G.addSegCollider(P[i][0], P[i][1], P[(i + 1) % 4][0], P[(i + 1) % 4][1], y0, y1);
  };

  // Obstacles proches d'un point (dans un rayon r)
  const tmp = [];
  function near(x, z, r) {
    tmp.length = 0; stamp++;
    for (let i = Math.floor((x - r) / CELL); i <= Math.floor((x + r) / CELL); i++)
      for (let j = Math.floor((z - r) / CELL); j <= Math.floor((z + r) / CELL); j++) {
        const a = grid.get(key(i, j)); if (!a) continue;
        for (let k = 0; k < a.length; k++) {
          const c = a[k]; if (c.q === stamp) continue; c.q = stamp;
          if (x + r > c.minX && x - r < c.maxX && z + r > c.minZ && z - r < c.maxZ) tmp.push(c);
        }
      }
    return tmp;
  }
  // Point le plus proche de (x,z) sur l'obstacle, rangé dans cp[0], cp[1]
  const cp = [0, 0];
  function closest(c, x, z) {
    if (c.t === 0) { cp[0] = x < c.minX ? c.minX : x > c.maxX ? c.maxX : x; cp[1] = z < c.minZ ? c.minZ : z > c.maxZ ? c.maxZ : z; }
    else { const dx = c.bx - c.ax, dz = c.bz - c.az; let t = ((x - c.ax) * dx + (z - c.az) * dz) / c.l2; t = t < 0 ? 0 : t > 1 ? 1 : t; cp[0] = c.ax + dx * t; cp[1] = c.az + dz * t; }
  }

  // Repousse le joueur hors des murs. Les obstacles bas (<= step) sont "franchissables" : on monte dessus à la place.
  // Renvoie la normale du mur le plus enfoncé (utile pour le wallrun), ou null.
  G.pushOut = function (p, y, H, R, step) {
    let best = null, bestPen = 0;
    for (let iter = 0; iter < 3; iter++) {
      let moved = false;
      const list = near(p.x, p.z, R);
      for (let k = 0; k < list.length; k++) {
        const c = list[k];
        if (c.maxY <= y + step + 1e-6 || c.minY >= y + H - 0.02) continue;
        closest(c, p.x, p.z);
        const dx = p.x - cp[0], dz = p.z - cp[1], d2 = dx * dx + dz * dz;
        if (d2 >= R * R) continue;
        let nx, nz, pen;
        if (d2 > 1e-8) { const d = Math.sqrt(d2); nx = dx / d; nz = dz / d; pen = R - d; }
        else if (c.t === 0) {                                     // centre dans une boîte : on sort par la face la plus proche
          const a = p.x - c.minX, b = c.maxX - p.x, e = p.z - c.minZ, f = c.maxZ - p.z, m = Math.min(a, b, e, f);
          nx = m === a ? -1 : m === b ? 1 : 0; nz = m === e ? -1 : m === f ? 1 : 0; pen = m + R;
        } else continue;
        p.x += nx * pen; p.z += nz * pen; moved = true;
        if (pen > bestPen) { bestPen = pen; best = { x: nx, z: nz, c }; }
      }
      if (!moved) break;
    }
    return best;
  };
  // Hauteur du sol sous les pieds : le plus haut dessus (<= y + marche) sous le cercle des pieds
  G.groundAt = function (x, z, y, r, maxStep) {
    let best = 0; const list = near(x, z, r);
    for (let k = 0; k < list.length; k++) {
      const c = list[k]; if (c.t !== 0 || c.maxY > y + maxStep + 1e-6 || c.maxY <= best) continue;
      closest(c, x, z); const dx = x - cp[0], dz = z - cp[1]; if (dx * dx + dz * dz < r * r) best = c.maxY;
    }
    return best;
  };
  // Plafond au-dessus de la tête (la plus basse face inférieure proche au-dessus)
  G.ceilingAt = function (x, z, y, H, r) {
    let best = Infinity; const list = near(x, z, r);
    for (let k = 0; k < list.length; k++) {
      const c = list[k]; if (c.t !== 0 || c.minY < y + H - 0.35 || c.minY >= best) continue;
      closest(c, x, z); const dx = x - cp[0], dz = z - cp[1]; if (dx * dx + dz * dz < r * r) best = c.minY;
    }
    return best;
  };
  // Y a-t-il quelque chose qui gêne un corps (H de haut, rayon R) debout en (x, y, z) ?
  G.blocked = function (x, z, y, H, R) {
    const list = near(x, z, R);
    for (let k = 0; k < list.length; k++) {
      const c = list[k]; if (c.maxY <= y + 0.05 || c.minY >= y + H - 0.05) continue;
      closest(c, x, z); const dx = x - cp[0], dz = z - cp[1]; if (dx * dx + dz * dz < R * R) return true;
    }
    return false;
  };
  // Plus haut sommet d'obstacle devant (pour les franchissements) : parmi les obstacles qui touchent la zone,
  // à hauteur des jambes (leur base est sous y + legs), renvoie le sommet le plus haut <= y + maxH ; 0 si aucun.
  G.topAhead = function (x, z, y, r, legs, maxH) {
    let best = -1; const list = near(x, z, r);
    for (let k = 0; k < list.length; k++) {
      const c = list[k]; if (c.t !== 0 || c.minY > y + legs || c.maxY > y + maxH || c.maxY <= y + 0.05 || c.maxY <= best) continue;
      closest(c, x, z); const dx = x - cp[0], dz = z - cp[1]; if (dx * dx + dz * dz < r * r) best = c.maxY;
    }
    return best;
  };

  G.loaded.push('physics');
})();
