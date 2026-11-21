/* =====================================================================
   player.js : déplacement en première personne, collisions, mouvements de caméra.
   Marche LENTE (2,5 m/s), course nettement plus rapide (6,4 m/s) : la caméra balance, penche, tremble.
   ===================================================================== */
(function () {
  'use strict';
  const G = window.G, T = G.T;
  const R = 0.35, HEIGHT = 1.75, GRAVITY = 20, JUMP = 7.2, WALK = 2.5, RUN = 6.4, EYE = 1.62;
  G.keys = {};
  G.P = null;

  G.initPlayer = function () {
    // Départ : dans l'appartement, entre le lit et le bureau, face à la fenêtre (vers -z)
    G.P = { pos: new T.Vector3(0.1, 9.0, 0.9), vx: 0, vz: 0, vy: 0, yaw: 0, pitch: 0, onGround: true,
            stepDist: 0, lastStep: 0, bobAmp: 0, eye: 9.0 + EYE, exert: 0, dip: 0, fov: 70, moving: 0, sprint: false };
    G.updateCamera(0, 0);
  };

  // Renvoie la boîte touchée à cette position (cylindre du joueur approché par un carré), ou null
  function hit(x, y, z) {
    const c = G.colliders;
    for (let i = 0; i < c.length; i++) {
      const b = c[i];
      if (x + R > b.minX && x - R < b.maxX && z + R > b.minZ && z - R < b.maxZ && y + HEIGHT > b.minY + 0.001 && y < b.maxY - 0.001) return b;
    }
    return null;
  }

  G.updatePlayer = function (dt) {
    const P = G.P, k = G.keys, p = P.pos;
    // 1) Direction voulue (touches PHYSIQUES : ZQSD sur AZERTY = WASD)
    let fx = 0, fz = 0;
    if (k.KeyW || k.ArrowUp) fz -= 1; if (k.KeyS || k.ArrowDown) fz += 1;
    if (k.KeyA || k.ArrowLeft) fx -= 1; if (k.KeyD || k.ArrowRight) fx += 1;
    const len = Math.hypot(fx, fz) || 1; fx /= len; fz /= len;
    const sin = Math.sin(P.yaw), cos = Math.cos(P.yaw);
    const wishX = fx * cos + fz * sin, wishZ = -fx * sin + fz * cos;
    const wants = (fx || fz) !== 0;
    P.sprint = wants && (k.ShiftLeft || k.ShiftRight) && fz <= 0;
    const speed = P.sprint ? RUN : WALK;
    const acc = Math.min(1, (P.onGround ? (P.sprint ? 7 : 9) : 1.5) * dt);       // on démarre un peu mollement
    P.vx += (wishX * speed - P.vx) * acc; P.vz += (wishZ * speed - P.vz) * acc;

    // 2) Saut
    let jumped = false;
    if (k.Space && P.onGround) { P.vy = JUMP; P.onGround = false; jumped = true; G.audio.jump(); }

    // 3) Déplacement axe par axe (on glisse le long des murs) ; petites marches franchies automatiquement
    for (const axis of ['x', 'z']) {
      const nx = axis === 'x' ? p.x + P.vx * dt : p.x, nz = axis === 'z' ? p.z + P.vz * dt : p.z;
      const b = hit(nx, p.y, nz);
      if (!b) { p.x = nx; p.z = nz; }
      else if (b.maxY - p.y <= 0.45 && !hit(nx, b.maxY, nz)) { p.x = nx; p.z = nz; p.y = b.maxY; }
      else if (axis === 'x') P.vx = 0; else P.vz = 0;
    }
    // 4) En descendant un escalier, on "colle" au sol (sinon on rebondirait de marche en marche)
    if (P.onGround && !jumped) {
      let best = -1e9;
      for (const b of G.colliders) if (p.x + R > b.minX && p.x - R < b.maxX && p.z + R > b.minZ && p.z - R < b.maxZ && b.maxY <= p.y + 0.001 && b.maxY >= p.y - 0.32) best = Math.max(best, b.maxY);
      if (best > -1e8 && best < p.y) p.y = best;
    }
    // 5) Gravité et sol
    const wasAir = !P.onGround, fall = P.vy;
    P.vy -= GRAVITY * dt;
    let ny = p.y + P.vy * dt; P.onGround = false;
    const hb = hit(p.x, ny, p.z);
    if (hb) { if (P.vy <= 0) { ny = hb.maxY; P.onGround = true; } else ny = p.y; P.vy = 0; }
    p.y = ny;
    if (p.y < -8) { p.set(0.1, 9.0, 0.9); P.vy = 0; P.eye = 9 + EYE; }      // sécurité : tombé dans le vide
    if (wasAir && P.onGround && fall < -3) { P.dip = G.clamp(-fall / 55, 0.03, 0.2); G.audio.thud(G.clamp(-fall / 14, 0.1, 0.5), 70, 0.25); }

    // 6) Pas : un bruit à chaque foulée, plus espacés en marchant, plus rapprochés en courant
    const horiz = Math.hypot(P.vx, P.vz);
    P.moving = G.lerp(P.moving, P.onGround && horiz > 0.4 ? 1 : 0, Math.min(1, dt * 8));
    if (P.onGround && horiz > 0.4) {
      P.stepDist += horiz * dt;
      const stride = P.sprint ? 1.55 : 0.8, n = Math.floor(P.stepDist / stride);
      if (n > P.lastStep) { G.audio.footstep(P.sprint, G.zoneAt(p)); }
      P.lastStep = n;
    }
    P.exert = G.clamp(P.exert + (P.sprint && horiz > 3 ? 0.2 : -0.07) * dt, 0, 1);
    return horiz;
  };

  // Caméra : yeux à 1,62 m, balancement de marche, inclinaison en course, respiration, léger "creux" à l'atterrissage
  G.updateCamera = function (dt, time) {
    const P = G.P, cam = G.camera, horiz = Math.hypot(P.vx, P.vz);
    const rate = P.onGround ? 15 : 70;                                   // lisse les marches d'escalier
    P.eye += (P.pos.y + EYE - P.eye) * Math.min(1, rate * dt);
    P.dip = Math.max(0, P.dip - dt * 0.5);
    const targetAmp = P.onGround ? G.clamp(horiz / RUN, 0, 1) : 0;
    P.bobAmp = G.lerp(P.bobAmp, targetAmp, Math.min(1, dt * 6));
    const stride = P.sprint ? 1.55 : 0.8, phase = P.stepDist / stride * Math.PI;
    const run = P.sprint ? 1 : 0.4;
    const bobY = Math.abs(Math.sin(phase)) * (0.035 + run * 0.05) * P.bobAmp;
    const bobX = Math.sin(phase) * (0.02 + run * 0.025) * P.bobAmp;
    const roll = Math.sin(phase) * (0.006 + run * 0.012) * P.bobAmp;
    const breath = Math.sin(time * 1.1) * 0.004 * (1 + P.exert * 2.5);
    cam.position.set(P.pos.x + Math.cos(P.yaw) * bobX, P.eye + bobY + breath - P.dip, P.pos.z - Math.sin(P.yaw) * bobX);
    cam.rotation.set(P.pitch - bobY * 0.12, P.yaw, roll);
    const fovT = 70 + (P.sprint ? 7 : 0) * P.bobAmp;
    if (Math.abs(cam.fov - fovT) > 0.05) { cam.fov += (fovT - cam.fov) * Math.min(1, dt * 5); cam.updateProjectionMatrix(); }
  };

  G.loaded.push('player');
})();
