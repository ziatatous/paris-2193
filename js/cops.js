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
  const R = 0.4, STEP = 1.1, SPEED = { patrol: 1.4, investigate: 2.4, chase: 6.0, search: 2.2 };
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

  /* ---------- Un policier ---------- */
  function addCop(group, home, facing, patrol) {
    const c = { g: group, x: home[0], z: home[1], y: 0, facing, home: home.slice(), homeFacing: facing, patrol: patrol || null, pi: 0, state: 'idle', alert: 0, last: null, lostT: 0, searchT: 0,
      path: [], pathT: 0, speed: 0, phase: 0, v: new T.Vector3(), stuckT: 0, lx: home[0], lz: home[1], wait: 0, seed: Math.random() * 20, shoutT: 0 };
    c.lamp = G.addLamp({ x: home[0], y: 1.7, z: home[1], color: 0xcfe0ff, I: 0.75, dist: 9, halo: 0, bulb: false });
    G.scene.add(group); cops.push(c); return c;
  }
  function eyePos() { const P = G.P; return [P.pos.x, P.pos.y + 1.2, P.pos.z]; }

  function perceive(c, dt) {
    const P = G.P, dx = P.pos.x - c.x, dz = P.pos.z - c.z, dist = Math.hypot(dx, dz);
    let range = 20 * (P.h < 1.5 && P.mode !== 'slide' ? 0.6 : 1) * (P.sprint ? 1.25 : 1);
    const dot = dist > 0.01 ? (dx * Math.sin(c.facing) + dz * Math.cos(c.facing)) / dist : 1;
    const e = eyePos();
    const sees = !G.arrest && dist < range && (dist < 3 || dot > 0.55) && Math.abs(P.pos.y - c.y) < 2.6 && G.los(c.x, c.y + 1.7, c.z, e[0], e[1], e[2]);
    const noise = P.mode === 'slide' || P.dashT > 0 ? 12 : P.sprint ? 8 : P.mode === 'wallrun' ? 9 : (P.speed > 1 && P.h > 1.5) ? 3 : 1;
    const hears = !G.arrest && !sees && dist < noise && Math.abs(P.pos.y - c.y) < 3;
    if (sees) { c.alert = Math.min(1.5, c.alert + dt * (0.9 + (1 - dist / range) * 1.6)); c.last = [P.pos.x, P.pos.z]; c.lostT = 0; }
    else if (hears) { c.alert = Math.min(1.5, c.alert + dt * 0.55); c.last = [P.pos.x + (Math.random() - 0.5) * 3, P.pos.z + (Math.random() - 0.5) * 3]; }
    else if (c.state !== 'chase') c.alert = Math.max(0, c.alert - dt * 0.18);
    return { sees, dist };
  }

  // Avance vers (tx, tz) : en ligne droite si la voie est libre, sinon le long du graphe des ruelles
  function steer(c, tx, tz, speed, dt, force) {
    const dist = Math.hypot(tx - c.x, tz - c.z); let gx = tx, gz = tz;
    const direct = dist < 14 && G.los(c.x, c.y + 1, c.z, tx, c.y + 1, tz);
    if (!direct) {
      c.pathT -= dt;
      if (c.pathT <= 0 || force) { c.pathT = 0.7; const a = nearestNode(c.x, c.z), b = nearestNode(tx, tz); c.path = a >= 0 && b >= 0 ? astar(a, b) : []; c.path.push([tx, tz]); }
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

  function think(c, dt) {
    const pc = perceive(c, dt);
    switch (c.state) {
      case 'idle':
        if (c.alert >= 0.35) { c.state = 'suspicious'; break; }
        if (c.patrol) {                                                      // patrouille : de point en point, avec une petite pause
          if (c.wait > 0) { c.wait -= dt; face(c, c.x + Math.sin(c.facing), c.z + Math.cos(c.facing), dt); }
          else { const p = c.patrol[c.pi]; if (steer(c, p[0], p[1], SPEED.patrol, dt) < 1.5) { c.pi = (c.pi + 1) % c.patrol.length; c.wait = 1 + Math.random() * 2.5; } }
        } else {                                                              // garde : immobile, regarde de gauche à droite
          const d = Math.hypot(c.home[0] - c.x, c.home[1] - c.z);
          if (d > 1) steer(c, c.home[0], c.home[1], SPEED.investigate, dt); else { c.speed *= 0.9; c.facing += (c.homeFacing + Math.sin(performance.now() / 2200 + c.home[1]) * 0.7 - c.facing) * Math.min(1, dt * 2); }
        }
        break;
      case 'suspicious':
        if (c.alert >= 1) { c.state = 'chase'; c.shoutT = 1.0; snd('fx', 'cop_alert', 1); G.say && G.say('« Hé ! Toi ! Ne bouge pas ! »', 2500); break; }
        if (c.alert < 0.12) { c.state = 'idle'; break; }
        if (c.last) { if (Math.hypot(c.last[0] - c.x, c.last[1] - c.z) > 2.5) steer(c, c.last[0], c.last[1], SPEED.investigate, dt); else face(c, c.last[0], c.last[1], dt, 3); }
        break;
      case 'chase': {
        const P = G.P; if (pc.sees) c.lostT = 0; else c.lostT += dt;
        const tx = pc.sees ? P.pos.x : (c.last ? c.last[0] : P.pos.x), tz = pc.sees ? P.pos.z : (c.last ? c.last[1] : P.pos.z);
        const d = steer(c, tx, tz, SPEED.chase * (G.P.stunT > 0 ? 1 : 1), dt);
        if (pc.dist < 1.3 && Math.abs(P.pos.y - c.y) < 1.7 && pc.sees) arrest(c);
        if (c.lostT > 20 || (d < 2.5 && !pc.sees)) { c.state = 'search'; c.searchT = 6; }                  // il court jusqu'à l'endroit où il t'a vu, puis il fouille
        break; }
      case 'search':
        c.searchT -= dt; if (c.last && Math.hypot(c.last[0] - c.x, c.last[1] - c.z) > 2) steer(c, c.last[0], c.last[1], SPEED.search, dt); else { c.facing += dt * 1.4; c.speed *= 0.9; }
        if (c.alert >= 1) c.state = 'chase';
        if (c.searchT <= 0) { c.state = 'idle'; c.alert = 0; }
        break;
    }
  }
  // Animation : le squelette (places.js, G.makeCop) est animé à la main. Rotation x positive = le haut part vers l'avant, un pied part vers l'arrière.
  function animate(c, dt) {
    const r = c.g.userData.rig, t = performance.now() / 1000 + c.seed, run = c.state === 'chase', sus = c.state === 'suspicious' || c.state === 'search';
    const f = G.clamp(c.speed / (run ? 6 : 2.4), 0, 1);                                    // 0 = immobile, 1 = pleine allure
    c.phase += c.speed * dt * (run ? 1.35 : 1.9); c.shoutT = Math.max(0, (c.shoutT || 0) - dt);
    const s = Math.sin(c.phase), amp = (run ? 0.95 : 0.5) * f, idle = f < 0.1;
    // Jambes : la cuisse balance, le genou se plie quand la jambe passe vers l'avant
    for (const side of [1, -1]) {
      const ph = side === 1 ? s : -s;
      r['hip' + side].rotation.x = ph * amp - (sus && !run ? 0.08 : 0);
      r['kn' + side].rotation.x = Math.max(0, -ph) * amp * 1.5 + (run ? 0.2 : 0.05 * f) + (idle ? 0 : 0);
    }
    // Bassin : monte et descend à chaque pas, se balance ; accroupi quand il se méfie
    r.hips.position.y = 0.98 + Math.abs(Math.cos(c.phase)) * 0.045 * f * (run ? 1.8 : 1) - (sus ? 0.07 : 0) - (run ? 0.04 : 0);
    r.hips.position.x = Math.sin(c.phase) * 0.025 * f + Math.sin(t * 0.4) * 0.03 * (idle ? 1 : 0);                       // à l'arrêt : il se déhanche, change d'appui
    // Torse : se tord avec la marche, se penche en courant, respire
    r.torso.rotation.y = -s * 0.15 * f + (c.shoutT > 0 ? 0.25 : 0); r.torso.rotation.x = (run ? 0.3 : sus ? 0.1 : 0) + Math.sin(t * 1.6) * 0.012; r.torso.scale.y = 1 + Math.sin(t * 1.6) * 0.012;
    // Bras : en opposition aux jambes ; coudes pliés (très pliés en courant)
    let armR = -r.hip1.rotation.x * 0.0 + (-1) * (-s) * amp * 0.9, armL = -s * amp * 0.9; armR = s * amp * 0.9;
    r['sh1'].rotation.x = armR; r['sh-1'].rotation.x = -armR;
    r['el1'].rotation.x = -(run ? 1.25 : 0.25 + 0.15 * f); r['el-1'].rotation.x = -(run ? 1.25 : 0.25 + 0.15 * f);
    // Attitudes à l'arrêt : radio à l'épaule de temps en temps ; main près de l'étui quand il se méfie ; geste vers le joueur quand il crie
    const radio = idle && c.state === 'idle' && ((t * 0.5 + c.seed) % 6) < 1.4;
    if (radio) { r['sh1'].rotation.x = -2.1; r['el1'].rotation.x = -1.7; r.head.rotation.z = 0.12; } else r.head.rotation.z = 0;
    if (sus && !run) { r['sh1'].rotation.x = -0.35; r['el1'].rotation.x = -0.5; r['sh-1'].rotation.x = -0.6; r['el-1'].rotation.x = -0.9; }
    if (c.shoutT > 0) { r['sh1'].rotation.x = -1.55; r['el1'].rotation.x = -0.15; r.head.rotation.x = -0.15; } else r.head.rotation.x = run ? 0.05 : 0;
    if (G.arrest && run) { r['sh1'].rotation.x = -1.2; r['sh-1'].rotation.x = -1.2; r['el1'].rotation.x = -0.4; r['el-1'].rotation.x = -0.4; }
    // Tête : balayage lent à l'arrêt, plus nerveux quand il se méfie, fixe en courant
    r.head.rotation.y = run ? 0 : sus ? Math.sin(t * 2.2) * 0.9 : Math.sin(t * 0.6) * 0.55;
    r.beam.material.opacity = 0.03 + Math.min(1, c.alert) * 0.05;
    c.g.position.set(c.x, c.y, c.z); c.g.rotation.y = c.facing;
    if (c.lamp) { const fx = Math.sin(c.facing + r.head.rotation.y), fz = Math.cos(c.facing + r.head.rotation.y); c.lamp.pos.set(c.x + fx * 0.9, c.y + 1.7, c.z + fz * 0.9); }   // la lampe frontale éclaire là où il regarde
  }

  function arrest(c) {
    if (G.arrest) return;
    G.arrest = { t: 0 }; G.frozen = true; const P = G.P; P.vx = P.vz = 0;
    snd('fx', 'arrest', 1); G.say && G.say('Arrêté.', 3000);
    const f = document.getElementById('fade'); if (f) { f.style.transition = 'opacity 0.9s'; f.style.opacity = 1; }
  }
  function respawn() {
    const P = G.P; P.pos.set(0, 0, -6); P.yaw = 0; P.pitch = 0; P.vx = P.vy = P.vz = 0; P.mode = 'move'; P.anim = null; P.onGround = true; P.h = 1.75; P.stunT = 0; P.eye = 1.62; P.safe.set(0, 0, -6);
    for (const c of cops) { c.x = c.home[0]; c.z = c.home[1]; c.y = 0; c.state = 'idle'; c.alert = 0; c.last = null; c.path = []; c.facing = c.homeFacing; c.speed = 0; }
    G.alert = 0; G.arrest = null; G.frozen = false;
    const f = document.getElementById('fade'); if (f) { f.style.transition = 'opacity 2.5s'; f.style.opacity = 0; }
    G.say && G.say('Ils t\'ont relâché. Pour cette fois.', 4500);
  }

  G.updateCops = function (dt) {
    if (G.arrest) { G.arrest.t += dt; if (G.arrest.t > 2.3) respawn(); }
    let top = 0;
    for (const c of cops) { think(c, dt); animate(c, dt); if (c.state !== 'idle') top = Math.max(top, Math.min(1, c.alert)); }
    G.alert += (top - G.alert) * Math.min(1, dt * 3);
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
