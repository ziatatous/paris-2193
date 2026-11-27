/* =====================================================================
   cops.js : les POLICIERS. Version 1 : vision, alerte progressive, poursuite, arrestation.
   - Ils VOIENT dans un cône (≈ 110°) jusqu'à ~20 m, si rien ne bouche la vue. Accroupi : on est moins visible ; en courant : plus.
   - Ils ENTENDENT : course, glissade et dash font du bruit ; marcher à peine ; accroupi presque rien.
   - L'ALERTE monte progressivement tant qu'ils te voient (plus vite de près), redescend sinon :
       idle (garde/patrouille) -> suspicious (ils s'approchent de ce qu'ils ont vu/entendu) -> chase (ils courent) -> search (ils fouillent) -> idle
   - Ils suivent les ruelles (A* sur un graphe de points le long des ruelles) et enjambent les obstacles bas (<= 1,1 m).
     Ils NE savent PAS grimper plus haut : passerelles, toits, terrasse et sauts de mur sont des échappatoires.
   - Au contact pendant une poursuite : arrestation (fondu au noir) et retour devant la tour.
   Deux gardes à chaque barrage, deux patrouilleurs (rue du marché, place). Vitesses : patrouille 1,4 · enquête 2,4 · poursuite 6,0 m/s.
   ===================================================================== */
(function () {
  'use strict';
  const G = window.G, T = G.T;
  const R = 0.4, STEP = 1.1, SPEED = G.COP_SPEED = { patrol: 0.8, investigate: 1.3, chase: 3.6, search: 1.2 };   // lents et traînants (réglables dans le labo)
  const cops = G.cops = []; G.alert = 0; G.frozen = false; G.arrest = null;
  let nodes = [], adj = [];
  const snd = (n, a, b) => { const f = G.audio && G.audio[n]; if (f) f(a, b); };

  // Ligne de vue : on avance par petits pas entre deux points ; un obstacle à hauteur des yeux la coupe
  G.los = function (x0, y0, z0, x1, y1, z1) {
    const d = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.ceil(d / 0.6));
    for (let i = 1; i < n; i++) { const t = i / n; if (G.blocked(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t, y0 + (y1 - y0) * t - 0.15, 0.3, 0.05)) return false; }
    return true;
  };

  /* ---------- Graphe de navigation le long des ruelles ---------- */
  function buildNav() {
    nodes = []; const own = [];
    G.city.ALLEYS.forEach((a, k) => {
      const L = G.city.alleyLen(a), ids = [];
      for (let d = 0; d <= L + 0.01; d += 5) { const p = G.city.alleyPoint(a, Math.min(d, L)); nodes.push({ x: p.x, z: p.z, k }); ids.push(nodes.length - 1); }
      own.push(ids);
    });
    adj = nodes.map(() => []);
    const link = (i, j) => { if (!adj[i].includes(j)) { adj[i].push(j); adj[j].push(i); } };
    own.forEach(ids => { for (let i = 0; i < ids.length - 1; i++) link(ids[i], ids[i + 1]); });
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) if (nodes[i].k !== nodes[j].k && Math.hypot(nodes[i].x - nodes[j].x, nodes[i].z - nodes[j].z) < 9) link(i, j);
  }
  function nearestNode(x, z) {
    let best = -1, bd = 1e9;
    for (let i = 0; i < nodes.length; i++) { const d = Math.hypot(nodes[i].x - x, nodes[i].z - z); if (d < bd && (d < 3 || G.los(x, 1, z, nodes[i].x, 1, nodes[i].z))) { bd = d; best = i; } }
    if (best < 0) for (let i = 0; i < nodes.length; i++) { const d = Math.hypot(nodes[i].x - x, nodes[i].z - z); if (d < bd) { bd = d; best = i; } }
    return best;
  }
  function astar(a, b) {                                               // chemin le plus court entre deux nœuds
    const g = new Map([[a, 0]]), prev = new Map(), open = [a], h = i => Math.hypot(nodes[i].x - nodes[b].x, nodes[i].z - nodes[b].z), done = new Set();
    while (open.length) {
      let bi = 0; for (let i = 1; i < open.length; i++) if (g.get(open[i]) + h(open[i]) < g.get(open[bi]) + h(open[bi])) bi = i;
      const cur = open.splice(bi, 1)[0]; if (cur === b) break; done.add(cur);
      for (const nx of adj[cur]) { if (done.has(nx)) continue; const ng = g.get(cur) + Math.hypot(nodes[cur].x - nodes[nx].x, nodes[cur].z - nodes[nx].z); if (!g.has(nx) || ng < g.get(nx)) { g.set(nx, ng); prev.set(nx, cur); if (!open.includes(nx)) open.push(nx); } }
    }
    const path = []; let n = b; if (!prev.has(b) && a !== b) return path; while (n !== undefined) { path.unshift([nodes[n].x, nodes[n].z]); n = prev.get(n); } return path;
  }

  /* ---------- Navigation sur grille (niveaux) : A* sur des cases de 1 m, puis chemin "tiré" en lignes droites ---------- */
  G.buildNavGrid = function (x0, x1, z0, z1, cell) {
    const nx = Math.ceil((x1 - x0) / cell), nz = Math.ceil((z1 - z0) / cell), free = new Uint8Array(nx * nz);
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) free[j * nx + i] = G.blocked(x0 + (i + 0.5) * cell, z0 + (j + 0.5) * cell, 1.15, 0.6, 0.45) ? 0 : 1;   // les obstacles <= 1,1 m ne bloquent pas : ils les enjambent
    G.navGrid = { x0, z0, cell, nx, nz, free };
  };
  function gridPath(sx, sz, gx, gz) {
    const N = G.navGrid, cl = (v, n) => Math.max(0, Math.min(n - 1, v));
    const cellOf = (x, z) => [cl(Math.floor((x - N.x0) / N.cell), N.nx), cl(Math.floor((z - N.z0) / N.cell), N.nz)];
    const nearestFree = (i, j) => { if (N.free[j * N.nx + i]) return [i, j]; for (let r = 1; r < 8; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) { const a = i + di, b = j + dj; if (a >= 0 && b >= 0 && a < N.nx && b < N.nz && N.free[b * N.nx + a]) return [a, b]; } return [i, j]; };
    const [si, sj] = nearestFree(...cellOf(sx, sz)), [gi, gj] = nearestFree(...cellOf(gx, gz));
    const idx = (i, j) => j * N.nx + i, g = new Float32Array(N.nx * N.nz).fill(1e9), prev = new Int32Array(N.nx * N.nz).fill(-1), open = [[0, idx(si, sj)]];
    g[idx(si, sj)] = 0; const h = (i, j) => Math.hypot(i - gi, j - gj), push = (e) => { open.push(e); let k = open.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (open[p][0] <= open[k][0]) break; [open[p], open[k]] = [open[k], open[p]]; k = p; } };
    const pop = () => { const top = open[0], last = open.pop(); if (open.length) { open[0] = last; let k = 0; for (;;) { let l = 2 * k + 1, r = l + 1, m = k; if (l < open.length && open[l][0] < open[m][0]) m = l; if (r < open.length && open[r][0] < open[m][0]) m = r; if (m === k) break; [open[m], open[k]] = [open[k], open[m]]; k = m; } } return top; };
    let found = false;
    while (open.length) {
      const cur = pop()[1], ci = cur % N.nx, cj = (cur - ci) / N.nx; if (ci === gi && cj === gj) { found = true; break; }
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue; const a = ci + di, b = cj + dj; if (a < 0 || b < 0 || a >= N.nx || b >= N.nz || !N.free[idx(a, b)]) continue;
        if (di && dj && (!N.free[idx(ci + di, cj)] || !N.free[idx(ci, cj + dj)])) continue;           // pas de coupe-angle à travers un coin
        const ng = g[cur] + (di && dj ? 1.414 : 1); if (ng < g[idx(a, b)]) { g[idx(a, b)] = ng; prev[idx(a, b)] = cur; push([ng + h(a, b), idx(a, b)]); }
      }
    }
    if (!found) return [];
    const raw = []; for (let n = idx(gi, gj); n >= 0; n = prev[n]) { const i = n % N.nx, j = (n - i) / N.nx; raw.unshift([N.x0 + (i + 0.5) * N.cell, N.z0 + (j + 0.5) * N.cell]); }
    const out = []; let a = 0;                                                                         // "tirer" le chemin : on saute les points inutiles quand la vue est libre
    while (a < raw.length - 1) { let b = raw.length - 1; while (b > a + 1 && !G.los(raw[a][0], 1, raw[a][1], raw[b][0], 1, raw[b][1])) b--; out.push(raw[b]); a = b; }
    return out;
  }
  function computePath(x, z, tx, tz) {
    if (G.navGrid) return gridPath(x, z, tx, tz);
    const a = nearestNode(x, z), b = nearestNode(tx, tz); return a >= 0 && b >= 0 ? astar(a, b) : [];
  }

  /* ---------- Un policier ---------- */
  function addCop(group, home, facing, patrol) {
    const c = { g: group, x: home[0], z: home[1], y: 0, homeY: 0, facing, home: home.slice(), homeFacing: facing, patrol: patrol || null, pi: 0, state: 'idle', alert: 0, last: null, lostT: 0, searchT: 0,
      path: [], pathT: 0, speed: 0, phase: 0, v: new T.Vector3(), stuckT: 0, lx: home[0], lz: home[1], wait: 0, seed: Math.random() * 20, shoutT: 0 };
    c.lamp = G.addLamp({ x: home[0], y: 1.7, z: home[1], color: 0xcfe0ff, I: 0.75, dist: 9, halo: 0, bulb: false });
    G.scene.add(group); cops.push(c); return c;
  }
  function eyePos() { const P = G.P; return [P.pos.x, P.pos.y + 1.2, P.pos.z]; }

  // Accroupi derrière un obstacle bas du côté du policier : la ligne de vue est cassée (couverture basse)
  function coverBetween(c) {
    const P = G.P, dx = c.x - P.pos.x, dz = c.z - P.pos.z, d = Math.hypot(dx, dz) || 1, ux = dx / d, uz = dz / d;
    for (const t of [0.55, 1.0, 1.5]) if (G.blocked(P.pos.x + ux * t, P.pos.z + uz * t, 0.45, 0.2, 0.14)) return true;
    return false;
  }
  function perceive(c, dt) {
    const P = G.P, dx = P.pos.x - c.x, dz = P.pos.z - c.z, dist = Math.hypot(dx, dz);
    const crouched = P.h < 1.5, hidden = !!G.hidden;
    const lf = G.clamp(0.45 + G.lightAt(P.pos.x, P.pos.y + 1, P.pos.z, c.lamp) * 0.85, 0.45, 1.25);        // dans le noir on est moins visible, près d'une flamme on l'est plus
    const assist = (G.settings && G.settings.assist) || 0, range = 17 * (1 - 0.25 * assist) * (c.keen || 1) * (crouched && P.mode !== 'slide' ? 0.6 : 1) * (P.sprint ? 1.25 : 1) * lf;
    const dot = dist > 0.01 ? (dx * Math.sin(c.facing) + dz * Math.cos(c.facing)) / dist : 1;
    const e = [P.pos.x, P.pos.y + (crouched ? 0.7 : 1.2), P.pos.z];
    const sees = !G.arrest && !hidden && dist < range && (dist < (crouched ? 1.8 : 3) || dot > 0.55) && Math.abs(P.pos.y - c.y) < 2.6 && G.los(c.x, c.y + 1.7, c.z, e[0], e[1], e[2]) && !(crouched && coverBetween(c));
    const noise = P.mode === 'slide' || P.dashT > 0 ? 12 : P.sprint ? 8 : P.mode === 'wallrun' ? 9 : (P.speed > 1 && P.h > 1.5) ? 3 : 1;
    const hears = !G.arrest && !hidden && !sees && dist < noise * (c.keen || 1) * (1 - 0.3 * assist) && Math.abs(P.pos.y - c.y) < 3;
    if (sees) { c.alert = Math.min(1.5, c.alert + dt * (0.35 + (1 - dist / range) * 1.15) * (1 - 0.5 * assist)); c.last = [P.pos.x, P.pos.z]; c.lostT = 0; }
    else if (hears) { c.alert = Math.min(1.5, c.alert + dt * 0.4); c.last = [P.pos.x + (Math.random() - 0.5) * 3, P.pos.z + (Math.random() - 0.5) * 3]; }
    else if (c.state !== 'chase') c.alert = Math.max(0, c.alert - dt * 0.3);
    return { sees, dist };
  }

  // Avance vers (tx, tz) : en ligne droite si la voie est libre, sinon le long du graphe des ruelles
  function steer(c, tx, tz, speed, dt, force) {
    if (c.leash) { const l = c.leash; tx = Math.max(l.x0, Math.min(l.x1, tx)); tz = Math.max(l.z0, Math.min(l.z1, tz)); }   // policiers de toit : ils ne quittent pas leur toit
    const dist = Math.hypot(tx - c.x, tz - c.z); let gx = tx, gz = tz;
    const direct = dist < 14 && G.los(c.x, c.y + 1, c.z, tx, c.y + 1, tz);
    if (!direct) {
      c.pathT -= dt;
      if (c.pathT <= 0 || force) { c.pathT = 0.7; c.path = computePath(c.x, c.z, tx, tz); c.path.push([tx, tz]); }
      while (c.path.length > 1 && Math.hypot(c.path[0][0] - c.x, c.path[0][1] - c.z) < 1.6) c.path.shift();
      if (c.path.length) { gx = c.path[0][0]; gz = c.path[0][1]; }
    }
    const d = Math.hypot(gx - c.x, gz - c.z) || 1, ux = (gx - c.x) / d, uz = (gz - c.z) / d;
    c.speed += (speed - c.speed) * Math.min(1, dt * 5);
    const target = Math.atan2(ux, uz); let da = target - c.facing; while (da > Math.PI) da -= 6.283; while (da < -Math.PI) da += 6.283; c.facing += da * Math.min(1, dt * 8);
    const stepLen = c.speed * dt, n = Math.max(1, Math.ceil(stepLen / 0.2));
    c.v.set(c.x, c.y, c.z);
    for (let i = 0; i < n; i++) { c.v.x += ux * stepLen / n; c.v.z += uz * stepLen / n; G.pushOut(c.v, c.y, 1.8, R, STEP); c.y = G.groundAt(c.v.x, c.v.z, c.y, R * 0.9, STEP); }
    // Bloqué ? (coincé contre un obstacle) : on change de chemin
    c.x = c.v.x; c.z = c.v.z; c.stuckT += dt; if (c.stuckT > 1) { if (Math.hypot(c.x - c.lx, c.z - c.lz) < 0.3 && speed > 1) { c.pathT = 0; c.path = []; c.x += (Math.random() - 0.5) * 0.6; c.z += (Math.random() - 0.5) * 0.6; } c.lx = c.x; c.lz = c.z; c.stuckT = 0; }
    return dist;
  }
  function face(c, tx, tz, dt, rate) { const target = Math.atan2(tx - c.x, tz - c.z); let da = target - c.facing; while (da > Math.PI) da -= 6.283; while (da < -Math.PI) da += 6.283; c.facing += da * Math.min(1, dt * (rate || 4)); c.speed += (0 - c.speed) * Math.min(1, dt * 6); }

  // Roman ne t'arrête pas : il te tue (pas de lutte possible). Fondu au noir, cris, retour au début du chapitre.
  function romanKill(c) {
    if (G.dead || G.arrest) return; const P = G.P; G.frozen = true; P.vx = P.vz = 0; snd('fx', 'hit', 1); setTimeout(() => snd('fx', 'pain', 1), 180); setTimeout(() => snd('fx', 'hit', 1), 420);
    G.say && G.say('— Tu m\'as laissé, Dima.', 1400); if (G.die) G.die();
  }
  // Tir : touche selon la distance, bien moins si on court / glisse / dash ; une trace lumineuse brève montre la balle
  function shoot(c, dist) {
    const P = G.P; snd('fx', 'shot', 1);
    const moving = P.sprint || P.mode === 'slide' || P.dashT > 0 || P.mode === 'wallrun' || P.mode === 'roll';
    let p = 0.8 - Math.min(0.5, dist / 40); if (moving) p *= 0.45; if (P.h < 1.5) p *= 0.7; p *= G.shotLuck ? G.shotLuck : 1;
    const hit = Math.random() < p, tx = P.pos.x + (hit ? 0 : (Math.random() - 0.5) * 1.6), tz = P.pos.z + (hit ? 0 : (Math.random() - 0.5) * 1.6), ty = P.pos.y + 1.1;
    const sx = c.x + Math.sin(c.facing) * 0.5, sz = c.z + Math.cos(c.facing) * 0.5, g = new T.BufferGeometry().setFromPoints([new T.Vector3(sx, c.y + 1.45, sz), new T.Vector3(tx, ty, tz)]);
    const ln = new T.Line(g, new T.LineBasicMaterial({ color: 0xfff0c0, transparent: true, opacity: 0.9, blending: T.AdditiveBlending, fog: false })); G.scene.add(ln); setTimeout(() => { G.scene.remove(ln); g.dispose(); }, 70);
    if (hit && G.hurt) G.hurt(c);
  }
  function think(c, dt) {
    if (c.state !== 'chase') c.aimT = 0;                                  // la visée repart de zéro à chaque nouvelle poursuite
    if (G.arrest) { if (G.arrest.cop !== c) c.speed *= 0.9; return; }
    if (c.staggerT > 0) { c.staggerT -= dt; c.speed *= 0.85; return; }
    const pc = perceive(c, dt);
    if (G.hidden && c.state !== 'idle') {                                   // le joueur est caché : le policier vient voir
      const h = G.hidden, d = Math.hypot(h.x - c.x, h.z - c.z);
      if (d < 3) { c.hideT = (c.hideT || 0) + dt; c.last = [h.x, h.z]; c.speed *= 0.8;
        if (h.compromised && c.hideT > 1.3) { arrest(c); return; }                                      // il t'a vu entrer : il t'en sort
        if (!h.compromised && c.hideT > 3.5) { c.state = 'search'; c.searchT = 1.5; c.alert = 0.2; c.last = [c.home[0], c.home[1]]; c.hideT = 0; }   // rien trouvé : il s'en va
      } else c.hideT = 0;
    }
    switch (c.state) {
      case 'idle':
        if (c.alert >= 0.35) { c.state = 'suspicious'; break; }
        if (c.patrol) {                                                      // patrouille : de point en point, avec une petite pause
          if (c.wait > 0) { c.wait -= dt; face(c, c.x + Math.sin(c.facing), c.z + Math.cos(c.facing), dt); }
          else { const p = c.patrol[c.pi]; if (steer(c, p[0], p[1], (SPEED.patrol * (c.speedMul || 1)), dt) < 1.5) { c.pi = (c.pi + 1) % c.patrol.length; c.wait = 1 + Math.random() * 2.5; } }
        } else {                                                              // garde : immobile, regarde de gauche à droite
          const d = Math.hypot(c.home[0] - c.x, c.home[1] - c.z);
          if (d > 1) steer(c, c.home[0], c.home[1], (SPEED.investigate * (c.speedMul || 1)), dt); else { c.speed *= 0.9; c.facing += (c.homeFacing + Math.sin(performance.now() / 2200 + c.home[1]) * 0.7 - c.facing) * Math.min(1, dt * 2); }
        }
        break;
      case 'suspicious':
        if (c.alert >= 1) { c.state = 'chase'; c.shoutT = 1.0; snd('fx', 'cop_alert', 1); G.say && G.say('« Hé ! Toi ! Ne bouge pas ! »', 2500); break; }
        if (c.alert < 0.12) { c.state = 'idle'; break; }
        if (c.last) { if (Math.hypot(c.last[0] - c.x, c.last[1] - c.z) > 2.5) steer(c, c.last[0], c.last[1], (SPEED.investigate * (c.speedMul || 1)), dt); else face(c, c.last[0], c.last[1], dt, 3); }
        break;
      case 'chase': {
        const P = G.P; if (pc.sees) c.lostT = 0; else c.lostT += dt;
        const tx = pc.sees ? P.pos.x : (c.last ? c.last[0] : P.pos.x), tz = pc.sees ? P.pos.z : (c.last ? c.last[1] : P.pos.z);
        // Policier ARMÉ : s'arrête pour viser (0,9 s, ta chance de casser la ligne de vue), tire, 3 balles puis rechargement de 3,5 s
        if (c.armed && c.ammo === undefined) { c.ammo = 3; c.aimT = 0; c.reloadT = 0; c.fireCD = 0; }
        let shooting = false;
        if (c.armed && c.reloadT > 0) { c.reloadT -= dt; if (c.reloadT <= 0) c.ammo = 3; }
        else if (c.armed && pc.sees && pc.dist > 2.2 && pc.dist < 22 && c.ammo > 0) {
          shooting = true; c.aimT += dt; face(c, P.pos.x, P.pos.z, dt, 10); c.fireCD -= dt;
          if (c.aimT > 0.9 && c.fireCD <= 0) { shoot(c, pc.dist); c.ammo--; c.fireCD = 0.7; c.aimT = 0.55; if (c.ammo <= 0) { c.reloadT = 3.5; c.aimT = 0; } }
        } else if (c.armed) c.aimT = Math.max(0, c.aimT - dt * 2);
        const d = shooting ? (c.speed *= 0.8, 9) : steer(c, tx, tz, (SPEED.chase * (c.speedMul || 1)) * (c.reloadT > 0 ? 0.7 : 1), dt);
        if (pc.dist < 1.1 && Math.abs(P.pos.y - c.y) < 1.7 && pc.sees) arrest(c);
        if (c.lostT > 20 || (d < 2.5 && !pc.sees)) { c.state = 'search'; c.searchT = 6; }                  // il court jusqu'à l'endroit où il t'a vu, puis il fouille
        break; }
      case 'search':
        c.searchT -= dt; if (c.last && Math.hypot(c.last[0] - c.x, c.last[1] - c.z) > 2) steer(c, c.last[0], c.last[1], (SPEED.search * (c.speedMul || 1)), dt); else { c.facing += dt * 1.4; c.speed *= 0.9; }
        if (c.alert >= 1) c.state = 'chase';
        if (c.searchT <= 0) { c.state = 'idle'; c.alert = 0; }
        break;
    }
  }
  // Animation : le squelette (places.js, G.makeCop) est animé à la main. Rotation x positive = le haut part vers l'avant, un pied part vers l'arrière.
  function animate(c, dt) {
    const r = c.g.userData.rig, t = performance.now() / 1000 + c.seed, run = c.state === 'chase', sus = c.state === 'suspicious' || c.state === 'search';
    const f = G.clamp(c.speed / (run ? (SPEED.chase * (c.speedMul || 1)) : (SPEED.investigate * (c.speedMul || 1))), 0, 1);           // 0 = immobile, 1 = pleine allure
    c.phase += c.speed * dt * (run ? 1.25 : 1.7); c.shoutT = Math.max(0, (c.shoutT || 0) - dt);
    const s = Math.sin(c.phase), s2 = Math.sin(c.phase * 2), idle = f < 0.1, amp = (run ? 0.7 : 0.38) * f;
    // Tics nerveux : de temps en temps le corps a un spasme (tête, épaule), plus souvent quand il se méfie
    c.tw = (c.tw || 0) * Math.max(0, 1 - dt * 5); c.twT = (c.twT === undefined ? 1 + Math.random() * 3 : c.twT) - dt;
    if (c.twT <= 0) { c.tw = 1; c.twT = (sus ? 0.6 : 1.8) + Math.random() * (run ? 1.5 : 3.5); c.twDir = Math.random() < 0.5 ? -1 : 1; }
    const tw = c.tw, jit = Math.sin(t * 43) * tw;
    // Jambes : démarche traînante et boiteuse (la jambe droite traîne, le pied racle)
    for (const side of [1, -1]) {
      const ph = side === 1 ? s : -s, limp = side === 1 ? 0.6 : 1.0;
      r['hip' + side].rotation.x = ph * amp * limp + (side === 1 ? -0.05 * f : 0);
      r['kn' + side].rotation.x = Math.max(0, -ph) * amp * 1.1 * limp + 0.06 * f;
      r['hip' + side].rotation.z = side * 0.04 * f;
    }
    // Bassin : balance de côté, tombe lourdement sur la jambe valide, s'affaisse à l'arrêt
    r.hips.position.y = 0.98 - Math.abs(Math.sin(c.phase)) * 0.05 * f - (sus ? 0.09 : 0) - (run ? 0.06 : 0);
    r.hips.position.x = s * 0.05 * f + Math.sin(t * 0.37) * 0.035 * (idle ? 1 : 0);
    r.hips.rotation.z = s * 0.07 * f + Math.sin(t * 0.37) * 0.03 * (idle ? 1 : 0);
    // Torse : voûté en permanence (penché vers l'avant), tordu par la marche, respiration lourde
    const lean = 0.28 + (run ? 0.3 : 0) + (sus ? 0.08 : 0);
    r.torso.rotation.x = lean + Math.sin(t * 1.3) * 0.025 + tw * 0.06; r.torso.rotation.y = -s * 0.18 * f + tw * 0.12 * c.twDir; r.torso.rotation.z = -s * 0.06 * f;
    r.torso.scale.y = 1 + Math.sin(t * 1.3) * 0.015;
    // Bras : pendants, lourds, qui balancent en retard ; en poursuite ils se tendent devant lui comme pour t'attraper
    const sw = s * amp * 0.55;
    if (run) { r['sh1'].rotation.x = -0.85 + s2 * 0.12 + sw * 0.4; r['sh-1'].rotation.x = -0.7 - s2 * 0.12 - sw * 0.4; r['el1'].rotation.x = -0.35; r['el-1'].rotation.x = -0.5; r['sh1'].rotation.z = -0.1; r['sh-1'].rotation.z = 0.1; }
    else if (sus) { r['sh1'].rotation.x = -0.25 + sw; r['sh-1'].rotation.x = -0.15 - sw; r['el1'].rotation.x = -0.5; r['el-1'].rotation.x = -0.35; r['sh1'].rotation.z = -0.08; r['sh-1'].rotation.z = 0.08; }
    else { r['sh1'].rotation.x = 0.05 + sw + Math.sin(t * 0.8) * 0.03; r['sh-1'].rotation.x = 0.1 - sw; r['el1'].rotation.x = -0.12 - 0.1 * f; r['el-1'].rotation.x = -0.1 - 0.1 * f; r['sh1'].rotation.z = -0.05; r['sh-1'].rotation.z = 0.05; }
    r['sh1'].rotation.z += jit * 0.08; r['sh-1'].rotation.z -= jit * 0.05;
    if (c.shoutT > 0) { r['sh1'].rotation.x = -1.5; r['el1'].rotation.x = -0.1; }                 // il te désigne du bras
    if (c.armed && c.aimT > 0.05) { r['sh1'].rotation.x = -1.45; r['el1'].rotation.x = -0.1; r['sh1'].rotation.z = -0.05; }                // il vise
    if (G.arrest && G.arrest.cop === c) { const st = G.arrest.stage; r['sh1'].rotation.x = r['sh-1'].rotation.x = -1.3 + Math.sin(performance.now() / 70) * 0.12 * (st === 'down' ? 1 : 0.2); r['el1'].rotation.x = r['el-1'].rotation.x = -0.3; r.torso.rotation.x = 0.9; r.head.rotation.x = 0.1; }
    // Tête : lourde, en retard sur le corps, penchée ; balayage lent, saccadé quand il se méfie ; rejetée en arrière quand il crie
    const ty = run ? Math.sin(t * 3) * 0.12 : sus ? Math.sin(t * 1.6) * 0.8 + Math.sign(Math.sin(t * 0.9)) * 0.25 : Math.sin(t * 0.45) * 0.5;
    c.hy = (c.hy || 0) + (ty - (c.hy || 0)) * Math.min(1, dt * (sus ? 5 : 2));
    r.head.rotation.y = c.hy + tw * 0.25 * c.twDir; r.head.rotation.z = (run ? 0.22 : 0.12) * Math.sin(t * 0.7 + 1) + 0.12 + jit * 0.1;
    r.head.rotation.x = (c.shoutT > 0 ? -0.5 : 0.18 + (run ? 0.1 : 0)) + Math.sin(t * 1.1) * 0.03;
    r.neck.rotation.x = 0.25;
    if (r.skirt) { r.skirt.rotation.x = -(r['hip1'].rotation.x + r['hip-1'].rotation.x) * 0.25 - 0.08 * f; r.skirt.rotation.z = s * 0.05 * f; r.skirt.position.y = 0.0; }   // le manteau balance derrière la marche
    r.beam.material.opacity = 0.03 + Math.min(1, c.alert) * 0.05;
    c.g.position.set(c.x, c.y, c.z); c.g.rotation.y = c.facing;
    if (r.sync) r.sync();                                                                   // modèle 3D riggé : on copie les poses des pivots sur ses os
    if (c.lamp) { const fx = Math.sin(c.facing + r.head.rotation.y), fz = Math.cos(c.facing + r.head.rotation.y); c.lamp.pos.set(c.x + fx * 0.9, c.y + 1.7, c.z + fz * 0.9); }   // la lampe frontale éclaire là où il regarde
  }

  /* ---------- ARRESTATION EN 3 TEMPS (tout en première personne) ----------
     1. 'shove' : il te percute, tu es bousculé et tu tombes (caméra qui bascule, vers le sol).
     2. 'down'  : à terre, il est sur toi. ESPACE répété = te débattre : si la jauge se remplit tu te dégages et tu repars.
     3. 'cuff'  : bras tordus dans le dos, menottes, noir, retour au début. */
  function arrest(c) {
    if (G.arrest || G.dead || G.completed) return;
    if (c.roman) { romanKill(c); return; }
    const P = G.P; if (G.hidden) G.hidden.exit();
    const dx = P.pos.x - c.x, dz = P.pos.z - c.z, d = Math.hypot(dx, dz) || 1;
    G.arrest = { stage: 'shove', t: 0, cop: c, dir: [dx / d, dz / d], prog: 0, prevSp: !!G.keys.Space, said: 0, clicked: false };
    G.frozen = true; P.vx = P.vz = 0; P.mode = 'move'; P.anim = null; snd('fx', 'cop_alert', 1); snd('fx', 'hit', 1); setTimeout(() => snd('fx', 'pain', 0.8), 250);
  }
  function endArrest(escaped) {
    const A = G.arrest, P = G.P, c = A.cop;
    P.animRoll = P.animPitch = P.animDip = 0;
    if (escaped) {                                                              // tu t'es dégagé : il est sonné, tu repars
      G.arrest = null; G.frozen = false; P.stunT = 0.6; P.vx = A.dir[0] * 4.5; P.vz = A.dir[1] * 4.5; P.yaw += 0.0; c.state = 'search'; c.alert = 0.7; c.searchT = 6; c.staggerT = 2.0; c.last = [P.pos.x, P.pos.z]; c.speed = 0;
      G.say && G.say('', 1); const f = document.getElementById('fade'); if (f) { f.style.transition = 'opacity 0.2s'; f.style.opacity = 0; }
      return;
    }
    if (G.mode === 'lab') { P.pos.set(0, 0, 4); P.safe.set(0, 0, 4); P.h = 1.75; P.eye = 1.62; P.pitch = 0; P.yaw = 0; G.resetCops(); G.alert = 0; G.arrest = null; G.frozen = false; }
    else (G.resetLevel || respawn)();
    const f = document.getElementById('fade'); if (f) { f.style.transition = 'opacity 0.45s'; f.style.opacity = 0; }
  }
  function updateArrest(dt) {
    const A = G.arrest, P = G.P, c = A.cop, f = document.getElementById('fade'); A.t += dt;
    const sp = !!G.keys.Space, edge = sp && !A.prevSp; A.prevSp = sp;
    const k = (a, b) => G.clamp((A.t - a) / (b - a), 0, 1);
    // le policier se plaque contre toi, penché sur toi
    const tx = P.pos.x - A.dir[0] * 0.8, tz = P.pos.z - A.dir[1] * 0.8, r = Math.min(1, dt * 9);
    c.x += (tx - c.x) * r; c.z += (tz - c.z) * r; c.facing = Math.atan2(A.dir[0], A.dir[1]); c.speed *= 0.8; c.state = 'chase'; c.alert = 1;
    // caméra : on regarde le policier, on tombe en arrière, on finit au sol
    const yawT = Math.atan2(-(c.x - P.pos.x), -(c.z - P.pos.z)); let dy = yawT - P.yaw; while (dy > Math.PI) dy -= 6.283; while (dy < -Math.PI) dy += 6.283; P.yaw += dy * Math.min(1, dt * 6);
    const down = k(0, 0.55);
    P.h += (1.75 - 1.3 * down - P.h) * Math.min(1, dt * 10);
    P.animRoll += ((A.stage === 'cuff' ? -0.25 : 0.5) * down - P.animRoll) * Math.min(1, dt * 8);
    P.animPitch += ((A.stage === 'cuff' ? 0.75 : -0.2 + 0.45 * (1 - down)) - P.animPitch) * Math.min(1, dt * 5);
    if (A.t < 0.1) P.kickP = -0.12;
    if (A.stage === 'shove' && A.t > 0.55) { A.stage = 'down'; A.tDown = A.t; }
    if (A.stage === 'down') {
      const others = cops.some(o => o !== c && Math.hypot(o.x - P.pos.x, o.z - P.pos.z) < 3.5);
      if (edge) { A.prog += 0.2; P.kickR = (Math.random() - 0.5) * 0.25; P.kickP = -0.05; }
      A.prog = Math.max(0, A.prog - dt * (others ? 0.5 : 0.28));
      P.animRoll += Math.sin(A.t * 22) * 0.02 * A.prog;                                                     // tu te tords
      if (A.t - A.said > 0.7) { A.said = A.t; G.say && G.say('ESPACE ! ' + '#'.repeat(Math.round(A.prog * 10)) + '-'.repeat(10 - Math.round(A.prog * 10)), 800); }
      if (A.prog >= 1) { endArrest(true); return; }
      if (A.t - A.tDown > 2.4) { A.stage = 'cuff'; A.tCuff = A.t; snd('fx', 'arrest', 1); G.say && G.say('', 1); }
    }
    if (A.stage === 'cuff') {
      const u = A.t - A.tCuff;
      if (u > 0.55 && !A.clicked) { A.clicked = true; P.kickP = 0.1; P.kickR = 0.08; }
      if (u > 1.1 && f) { f.style.transition = 'opacity 0.3s'; f.style.opacity = 1; }
      if (u > 1.6) endArrest(false);
    }
  }
  // Sans niveau (grande carte) : retour devant la tour
  function respawn() {
    const P = G.P; P.pos.set(0, 0, -6); P.yaw = 0; P.pitch = 0; P.vx = P.vy = P.vz = 0; P.mode = 'move'; P.anim = null; P.onGround = true; P.h = 1.75; P.stunT = 0; P.eye = 1.62; P.safe.set(0, 0, -6);
    G.resetCops(); G.alert = 0; G.arrest = null; G.frozen = false;
  }
  G.resetCops = function () { for (const c of cops) { c.x = c.home[0]; c.z = c.home[1]; c.y = c.homeY || 0; c.ammo = undefined; c.aimT = 0; c.reloadT = 0; c.fireCD = 0; c.staggerT = 0; c.lostT = 0; c.shoutT = 0; c.state = 'idle'; c.alert = 0; c.last = null; c.path = []; c.facing = c.homeFacing; c.speed = 0; c.pi = 0; c.wait = 0; c.hideT = 0; } };
  G.addCop = addCop;

  G.updateCops = function (dt) {
    if (G.arrest) updateArrest(dt);
    let top = 0;
    for (const c of cops) { if (!c.frozenLab) think(c, dt); animate(c, dt); if (c.state !== 'idle') top = Math.max(top, Math.min(1, c.alert)); }
    const prevAlert = G.alert; G.alert += (top - G.alert) * Math.min(1, dt * 3);
    if (prevAlert < 0.6 && G.alert >= 0.6 && (!G.stingCD || performance.now() > G.stingCD)) { G.stingCD = performance.now() + 25000; snd('fx', 'stinger', 0.5); }   // coup sourd : on t'a repéré
  };

  G.initCops = function () {
    buildNav();
    for (const k of G.checkpoints) addCop(k.cop, k.home, -Math.PI / 2 + 0.0, null);                    // les gardes des barrages regardent vers la ville
    const a0 = G.city.ALLEYS[0], L = G.city.alleyLen(a0), line = [];
    for (const d of [L * 0.3, L * 0.55, L * 0.8, L * 0.55]) { const p = G.city.alleyPoint(a0, d); line.push([p.x, p.z]); }
    { const g = G.makeCop(); addCop(g, line[2], 0, line); }                                                // patrouilleur de la rue du marché
    const pl = G.city.PLACE, ring = []; for (let i = 0; i < 8; i++) { const t = i / 8 * 6.283; ring.push([pl.c[0] + Math.cos(t) * pl.rx * 0.45, pl.c[1] + Math.sin(t) * pl.rz * 0.45]); }
    { const g = G.makeCop(); addCop(g, ring[0], 0, ring); }                                                // patrouilleur de la place
  };

  G.loaded.push('cops');
})();
