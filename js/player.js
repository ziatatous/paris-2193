/* =====================================================================
   player.js : le joueur et SON MOUVEMENT. Tout part de la vitesse (vx, vz, vy) et d'un "mode" :
     move    : marche / course / saut (le mode normal)
     slide   : glissade (course + C) : on file au ras du sol
     dash    : poussée brève dans la direction voulue (F), une fois en l'air
     vault   : passement d'un obstacle bas (course ou Espace contre lui) : la caméra roule sur le côté
     mantle  : on s'agrippe au rebord d'un obstacle haut et on se hisse
     wallrun : course courte le long d'un mur en l'air ; si on insiste, on glisse ; Espace = saut de mur
     roll    : roulade à l'atterrissage (C juste avant de toucher le sol) : pas de dégât, on garde l'élan
     stun    : chute mal réceptionnée : on est ralenti un instant
   Touches : Z Q S D déplacer · Maj courir · Espace sauter/franchir · C s'accroupir/glisser/rouler · F dash · E interagir
   ===================================================================== */
(function () {
  'use strict';
  const G = window.G, T = G.T;
  const R = 0.35, H_STAND = 1.75, H_CROUCH = 1.05, H_SLIDE = 0.95, EYE = 1.62, STEP = 0.42, GRAV = 20;
  const WALK = 2.5, RUN = 6.4, CROUCH_SPEED = 1.4, JUMP = 7.2;
  const keys = G.keys = {}, prev = {};
  G.P = null;
  const snd = (n, a, b, c) => { const f = G.audio && G.audio[n]; if (f) f(a, b, c); };
  const ease = u => u * u * (3 - 2 * u);
  // "Brouillon" (0 = propre et précis, 1 = chaotique, façon Straftat) : réglage du menu. Inertie, secousses de caméra, passements imparfaits.
  const CH = () => (G.settings && G.settings.chaos !== undefined ? G.settings.chaos : 0.6);
  const noise = (t, s) => Math.sin(t * 7.3 + s) * 0.5 + Math.sin(t * 13.1 + s * 2) * 0.3 + Math.sin(t * 3.7 + s * 3) * 0.2;
  const rr = () => Math.random() - 0.5;

  G.initPlayer = function () {
    // Départ : dans l'appartement, entre le lit et le bureau, face à la fenêtre (vers -z)
    G.P = { pos: new T.Vector3(0.1, 9.0, 0.9), vx: 0, vy: 0, vz: 0, yaw: 0, pitch: 0, onGround: true, mode: 'move', h: H_STAND,
      eye: 9.0 + EYE, coyote: 0, jumpBuf: 0, rollBuf: 0, dashT: 0, dashCD: 0, dashAir: false, dashX: 0, dashZ: -1, slideT: 0, stunT: 0, wallT: 0, wallCD: 0, wallLost: 0,
      wallN: null, wallSide: 1, wallUsed: false, anim: null, rollT: 0, cutDone: false, stepDist: 0, lastStep: 0, bobAmp: 0, exert: 0, dip: 0, fovKick: 0,
      camRoll: 0, animRoll: 0, animPitch: 0, animDip: 0, spin: 0, sprint: false, speed: 0, lean: 0,
      kickP: 0, kickR: 0, kickY: 0, skidCD: 0, safe: new T.Vector3(0.1, 9.0, 0.9), safeT: 0 };
    G.updateCamera(0, 0);
  };

  /* ---------- Franchissements : repérer un rebord devant soi ---------- */
  // Renvoie { T: hauteur du sommet, x, z } du plus haut obstacle franchissable juste devant, ou null
  function findLedge(P, dx, dz) {
    const d0 = R + 0.25; let top = -1;
    for (const off of [-0.25, 0, 0.25]) {
      const t = G.topAhead(P.pos.x + dx * d0 - dz * off, P.pos.z + dz * d0 + dx * off, P.pos.y, 0.13, 0.9, 2.4);
      if (t > top) top = t;
    }
    return top > P.pos.y + STEP + 0.02 ? top : null;
  }
  const onTop = (x, z, topY) => Math.abs(G.groundAt(x, z, topY, 0.2, 0.06) - topY) < 0.06;
  // Prépare une animation de passement (vault) ou de grimpette (mantle). Renvoie true si c'est possible.
  function startLedgeMove(P, dx, dz, topY, allowVault, allowMantle) {
    const h = topY - P.pos.y, d0 = R + 0.25, x = P.pos.x, z = P.pos.z, y = P.pos.y;
    let flags = [], depth = 0;
    for (let s = 0.1; s <= 2.0; s += 0.15) { flags.push(onTop(x + dx * (d0 + s), z + dz * (d0 + s), topY)); }
    if (allowVault && h <= 1.3) {                                 // passement : on cherche où on retombe de l'autre côté
      let i = flags.indexOf(true), edge = -1; if (i >= 0) for (; i < flags.length; i++) if (!flags[i]) { edge = i; break; }
      if (edge >= 0) {
        const s = 0.1 + edge * 0.15 + 0.5, lx = x + dx * (d0 + s), lz = z + dz * (d0 + s), gy = G.groundAt(lx, lz, topY - 0.1, R * 0.9, 0.1);
        if (topY - gy >= 0.25 && !G.blocked(lx, lz, gy, H_STAND, R)) {
          P.anim = { type: 'vault', t: 0, dur: (P.sprint ? 0.5 : 0.62) * (1 + rr() * 0.5 * CH()), x0: x, z0: z, y0: y, x1: lx, z1: lz, y1: gy, top: topY, side: Math.random() < 0.5 ? -1 : 1, amp: 0.3 * (1 + rr() * 0.8 * CH()), keep: Math.max(Math.hypot(P.vx, P.vz), 3.5) * (1 + rr() * 0.3 * CH()), dx, dz };
          return true;
        }
      }
    }
    if (allowMantle && h <= 2.35) {                               // grimpette : on se hisse dessus
      for (let s = 0.35; s <= 1.0; s += 0.15) {
        const lx = x + dx * (d0 + s), lz = z + dz * (d0 + s);
        if (onTop(lx, lz, topY) && !G.blocked(lx, lz, topY, H_STAND - 0.1, R)) {
          P.anim = { type: 'mantle', t: 0, dur: (0.38 + 0.2 * h) * (1 + rr() * 0.5 * CH()), amp: 0, x0: x, z0: z, y0: y, x1: lx, z1: lz, y1: topY, top: topY, side: 0, keep: 1.5, dx, dz };
          return true;
        }
      }
    }
    return false;
  }
  function stepAnim(P, dt) {
    const a = P.anim; a.t += dt; const u = Math.min(1, a.t / a.dur), e = ease(u);
    if (a.type === 'vault') {
      P.pos.x = a.x0 + (a.x1 - a.x0) * e; P.pos.z = a.z0 + (a.z1 - a.z0) * e;
      P.pos.y = a.y0 + (a.y1 - a.y0) * e + Math.max(0, a.top + 0.18 - (a.y0 + a.y1) / 2) * Math.sin(Math.PI * u);
      P.animRoll = a.side * a.amp * Math.sin(Math.PI * u); P.animPitch = -0.1 * Math.sin(Math.PI * u); P.animDip = 0.18 * Math.sin(Math.PI * u);
    } else {
      P.pos.y = a.y0 + (a.y1 - a.y0) * ease(Math.min(1, u / 0.65));
      const f = ease(Math.max(0, (u - 0.35) / 0.65)); P.pos.x = a.x0 + (a.x1 - a.x0) * f; P.pos.z = a.z0 + (a.z1 - a.z0) * f;
      P.animPitch = 0.32 * Math.sin(Math.PI * u); P.animDip = 0.1 * Math.sin(Math.PI * u); P.animRoll = 0;
    }
    if (u >= 1) {
      P.pos.set(a.x1, a.y1, a.z1); P.vx = a.dx * a.keep; P.vz = a.dz * a.keep; P.vy = 0; P.onGround = true; P.mode = 'move'; P.anim = null;
      P.animRoll = P.animPitch = P.animDip = 0; P.coyote = 0.05;
      if (a.type === 'vault' && Math.random() < 0.12 * CH()) { P.stunT = 0.22; P.kickP -= 0.06; P.kickR += rr() * 0.12; }      // parfois on s'accroche et on trébuche à la sortie
    }
  }

  /* ---------- Mise à jour principale ---------- */
  G.updatePlayer = function (dt) {
    if (!(dt > 0)) return 0;
    const P = G.P, k = G.keys, p = P.pos, edge = c => k[c] && !prev[c];
    const jumpPressed = edge('Space'), crouchPressed = edge('KeyC'), dashPressed = edge('KeyF');
    P.coyote -= dt; P.jumpBuf -= dt; P.rollBuf -= dt; P.dashCD -= dt; P.wallCD -= dt; P.stunT -= dt;
    if (jumpPressed) P.jumpBuf = 0.14;
    if (crouchPressed) P.rollBuf = 0.35;

    // --- Animations (passement / grimpette) : on ne contrôle plus rien pendant ---
    if (P.anim) { stepAnim(P, dt); snapPrev(); return 0; }

    // --- Direction voulue (touches PHYSIQUES : ZQSD sur AZERTY = WASD) ---
    let fx = 0, fz = 0;
    if (k.KeyW || k.ArrowUp) fz -= 1; if (k.KeyS || k.ArrowDown) fz += 1;
    if (k.KeyA || k.ArrowLeft) fx -= 1; if (k.KeyD || k.ArrowRight) fx += 1;
    const ln = Math.hypot(fx, fz) || 1; fx /= ln; fz /= ln;
    const sn = Math.sin(P.yaw), cs = Math.cos(P.yaw);
    const wx = fx * cs + fz * sn, wz = -fx * sn + fz * cs, wants = (fx || fz) !== 0;
    const stunned = P.stunT > 0, hv = Math.hypot(P.vx, P.vz);
    P.skidCD -= dt;
    if (P.onGround && P.mode === 'move' && hv > 4.2 && wants && P.skidCD <= 0 && (P.vx * wx + P.vz * wz) / hv < -0.2) {   // demi-tour en courant : on dérape, la caméra part de travers
      P.skidCD = 0.5; P.kickR += (Math.random() < 0.5 ? -1 : 1) * 0.07 * CH(); P.kickP -= 0.03 * CH(); snd('thud', 0.1, 100, 0.12);
    }
    P.sprint = wants && (k.ShiftLeft || k.ShiftRight) && fz <= 0.1 && !stunned && P.mode !== 'slide' && !k.KeyC;

    // --- Accroupi / debout ---
    const wantCrouch = (k.KeyC && P.mode === 'move' && P.onGround) || P.mode === 'slide' || P.mode === 'roll';
    let targetH = P.mode === 'slide' || P.mode === 'roll' ? H_SLIDE : wantCrouch ? H_CROUCH : H_STAND;
    if (targetH > P.h && G.ceilingAt(p.x, p.z, p.y, targetH, R * 0.9) < p.y + targetH + 0.01) targetH = P.h;   // plafond bas : on reste baissé
    P.h = targetH;

    // --- Glissade : course + C ---
    if (crouchPressed && P.mode === 'move' && P.onGround && hv > 4.6 && !stunned) { P.mode = 'slide'; P.slideT = 0.95; const b = Math.min(hv * 1.12, 8.2); P.vx *= b / hv; P.vz *= b / hv; snd('thud', 0.12, 90, 0.2); }

    // --- Dash (F) ---
    if (dashPressed && P.dashCD <= 0 && !stunned && P.mode !== 'wallrun' && (P.onGround || !P.dashAir)) {
      let dx = wants ? wx : -Math.sin(P.yaw), dz = wants ? wz : -Math.cos(P.yaw);
      { const ang = rr() * 0.25 * CH(), ca = Math.cos(ang), sa = Math.sin(ang), ndx = dx * ca - dz * sa; dz = dx * sa + dz * ca; dx = ndx; P.kickP -= 0.05 * CH(); P.kickR += rr() * 0.1 * CH(); }   // un dash n'est jamais parfaitement droit
      P.dashX = dx; P.dashZ = dz; P.dashT = 0.22; P.dashCD = 0.85; P.fovKick = 12; if (!P.onGround) P.dashAir = true; if (P.mode === 'slide') P.mode = 'move';
      P.vx = dx * 16; P.vz = dz * 16; if (!P.onGround) P.vy = Math.max(P.vy * 0.3, 0.6); snd('dash');
    }

    // --- Franchissements : Espace (ou course) contre un obstacle ---
    if (P.mode === 'move' || P.mode === 'slide') {
      const spd = Math.hypot(P.vx, P.vz), dx = spd > 1.2 ? P.vx / spd : wants ? wx : 0, dz = spd > 1.2 ? P.vz / spd : wants ? wz : 0;
      if ((dx || dz) && !stunned) {
        const jb = P.jumpBuf > 0, auto = P.sprint && P.onGround && spd > 4.2;
        if (jb || auto || (!P.onGround && wants && P.vy < 3)) {
          const top = findLedge(P, dx, dz);
          if (top !== null) {
            const h = top - p.y, grabAir = !P.onGround && h > 1.0 && h < 2.2;
            if (startLedgeMove(P, dx, dz, top, (jb || auto) && P.onGround, (jb && P.onGround) || grabAir)) { P.jumpBuf = 0; P.mode = 'move'; P.slideT = 0; snd(P.anim.type === 'vault' ? 'jump' : 'thud', P.anim.type === 'vault' ? 0.7 : 0.15, 80, 0.2); snapPrev(); return 0; }
          }
        }
      }
    }

    // --- Saut (avec temps de grâce au bord et saut "mémorisé") ---
    if (P.jumpBuf > 0 && (P.onGround || P.coyote > 0) && !stunned && P.mode !== 'wallrun') {
      P.vy = JUMP; P.onGround = false; P.coyote = 0; P.jumpBuf = 0; P.cutDone = false;
      if (P.mode === 'slide') { P.mode = 'move'; P.vx *= 1.05; P.vz *= 1.05; }
      snd('jump');
    }
    if (!k.Space && P.vy > 3 && !P.cutDone && P.mode === 'move') { P.vy *= 0.55; P.cutDone = true; }     // relâcher = saut plus court
    // Saut de mur
    if (P.mode === 'wallrun' && P.jumpBuf > 0) {
      const n = P.wallN, spd = Math.max(hv, 5.5);
      P.vy = 6.8; P.vx = n.x * 4.6 + (-n.z * P.wallSide) * spd * 0.55; P.vz = n.z * 4.6 + (n.x * P.wallSide) * spd * 0.55;
      P.mode = 'move'; P.wallCD = 0.35; P.wallUsed = false; P.jumpBuf = 0; P.cutDone = true; P.fovKick = 6; snd('jump');   // le saut de mur redonne le droit d'enchaîner sur un autre mur
    }

    // --- Vitesse voulue et accélération ---
    let speed = P.sprint ? RUN : (wantCrouch && P.mode === 'move') ? CROUCH_SPEED : WALK;
    if (stunned) speed *= 0.35;
    if (P.dashT > 0) { P.dashT -= dt; const f = Math.max(0, P.dashT / 0.22); P.vx = P.dashX * (9 + 7 * f); P.vz = P.dashZ * (9 + 7 * f); }
    else if (P.mode === 'slide') {                                              // glissade : on freine doucement, on dévie un peu
      P.slideT -= dt; const s = Math.hypot(P.vx, P.vz), ns = Math.max(0, s - 5 * dt);
      if (s > 0.01) { P.vx *= ns / s; P.vz *= ns / s; }
      P.vx += wx * 2.5 * dt; P.vz += wz * 2.5 * dt;
      if (P.slideT <= 0 || ns < 2.4 || !P.onGround) P.mode = 'move';
    } else if (P.mode === 'roll') {
      P.rollT -= dt; if (P.rollT <= 0) { P.mode = 'move'; P.spin = 0; }
    } else if (P.mode !== 'wallrun') {
      const tx = wx * speed, tz = wz * speed, ddx = tx - P.vx, ddz = tz - P.vz, dl = Math.hypot(ddx, ddz);
      const rate = (P.onGround ? (wants ? (P.sprint ? 17 : 20) : 24) : (wants ? 5 : 0.4)) * (P.onGround ? 1 - 0.5 * CH() : 1);      // m/s gagnés par seconde
      const md = rate * dt;
      if (dl <= md) { P.vx = tx; P.vz = tz; } else { P.vx += ddx / dl * md; P.vz += ddz / dl * md; }
    }

    // --- Déplacement horizontal + murs ---
    let contact = null, impact = 0; const nSub = Math.max(1, Math.ceil(Math.hypot(P.vx, P.vz) * dt / 0.2));     // petits pas : impossible de traverser un mur, même en dash
    for (let s = 0; s < nSub; s++) {
      p.x += P.vx * dt / nSub; p.z += P.vz * dt / nSub;
      const c = G.pushOut(p, p.y, P.h, R, STEP);
      if (c) { contact = c; const vn = P.vx * c.x + P.vz * c.z; if (vn < 0) { impact = Math.min(impact, vn); P.vx -= vn * c.x; P.vz -= vn * c.z; } }
    }
    if (impact < -3 && P.mode === 'move') {                                        // on rentre dans un mur : choc d'épaule, secousse, petit ralentissement
      const f = Math.min(1, -impact / 7) * CH(); P.kickP -= 0.04 * f; P.kickR += rr() * 0.12 * f; if (impact < -5.5) P.stunT = Math.max(P.stunT, 0.14 * f); snd('thud', 0.15 * f + 0.05, 90, 0.15);
    }

    // --- Course sur mur (en l'air, vite, contre un grand mur) puis glissade si on insiste ---
    if (P.mode === 'move' && !P.onGround && !P.wallUsed && contact && P.wallCD <= 0 && wants && fz < 0.1 && contact.c.maxY > p.y + 2.2 && p.y > G.groundAt(p.x, p.z, p.y, R, 0.02) + 0.7) {
      const tangent = [-contact.z, contact.x], along = P.vx * tangent[0] + P.vz * tangent[1], tspd = Math.abs(along);
      if (tspd > 3.4) { P.mode = 'wallrun'; P.wallUsed = true; P.wallN = contact; P.wallSide = along >= 0 ? 1 : -1; P.wallT = 0; P.wallLost = 0; P.vy = Math.max(P.vy, 1.4); P.fovKick = 5; snd('thud', 0.15, 120, 0.2); }
    }
    let gScale = 1;
    if (P.mode === 'wallrun') {
      P.wallT += dt;
      if (contact) { P.wallN = contact; P.wallLost = 0; } else P.wallLost += dt;
      const n = P.wallN, ts = Math.max(Math.hypot(P.vx, P.vz), 5.0) * (P.wallT < 0.9 ? 1 : Math.max(0.35, 1 - (P.wallT - 0.9) * 0.9));
      P.vx = -n.z * P.wallSide * ts - n.x * 1.4; P.vz = n.x * P.wallSide * ts - n.z * 1.4;     // le long du mur, collé
      gScale = P.wallT < 0.9 ? 0.12 : 0.85;                                                      // après 0,9 s : on glisse vers le bas
      if (P.onGround || P.wallLost > 0.14 || P.wallT > 1.9 || k.KeyC) { P.mode = 'move'; P.wallCD = 0.5; }
    }

    // --- Vertical : marches, sol, gravité, plafond ---
    const yPrev = p.y; let landedFall = 0;
    if (P.onGround) {
      const sup = G.groundAt(p.x, p.z, p.y, R * 0.9, STEP);
      if (sup >= p.y - 0.001) { p.y = sup; P.vy = 0; }                                           // marche vers le haut / sol plat
      else if (p.y - sup <= 0.35 && P.vy <= 0) { p.y = sup; P.vy = 0; }                            // escalier vers le bas : on colle
      else { P.onGround = false; P.coyote = 0.1; }                                                // bord : on tombe
    }
    if (!P.onGround) {
      P.vy -= GRAV * gScale * (P.dashT > 0 ? 0.35 : 1) * dt;
      let ny = p.y + P.vy * dt;
      if (P.vy > 0) { const ce = G.ceilingAt(p.x, p.z, p.y, P.h, R * 0.9); if (ny + P.h > ce) { ny = ce - P.h; P.vy = 0; } }
      else {
        const sup = G.groundAt(p.x, p.z, yPrev, R * 0.9, 0.02);
        if (ny <= sup + 1e-4) { landedFall = -P.vy; ny = sup; P.vy = 0; P.onGround = true; P.dashAir = false; P.wallUsed = false; if (P.mode === 'wallrun') P.mode = 'move'; }
      }
      p.y = ny;
    }
    if (P.onGround) P.dashAir = false;
    // Filet de sécurité : si on se retrouve hors de l'espace libre (dans la masse des immeubles, hors carte, dans le vide), retour au dernier endroit sûr
    if (P.onGround && p.y < 3 && G.isPlayable && !G.isPlayable(p.x, p.z)) { p.copy(P.safe); P.vx = P.vy = P.vz = 0; P.eye = p.y + EYE; P.mode = 'move'; }
    else if (P.onGround && P.mode === 'move' && (P.safeT -= dt) <= 0 && (!G.isPlayable || G.isPlayable(p.x, p.z))) { P.safe.copy(p); P.safeT = 0.4; }
    if (p.y < -12) { p.copy(P.safe); P.vx = P.vy = P.vz = 0; P.eye = p.y + EYE; P.onGround = true; P.mode = 'move'; }

    // --- Atterrissage : roulade, chute mal réceptionnée, simple creux ---
    if (landedFall > 3) {
      if (P.rollBuf > 0 && landedFall > 5.2 && P.mode === 'move') {
        const s = Math.hypot(P.vx, P.vz), dx = s > 0.5 ? P.vx / s : -Math.sin(P.yaw), dz = s > 0.5 ? P.vz / s : -Math.cos(P.yaw), keep = Math.max(s, 5.2);
        P.vx = dx * keep; P.vz = dz * keep; P.mode = 'roll'; P.rollT = 0.62; P.dip = 0.05; snd('thud', 0.25, 70, 0.3);
      } else if (landedFall > 18) { P.stunT = 1.2; P.vx *= 0.15; P.vz *= 0.15; P.dip = 0.4; snd('thud', 0.6, 50, 0.5); }
      else if (landedFall > 13.5) { P.stunT = 0.45; P.vx *= 0.5; P.vz *= 0.5; P.dip = 0.26; snd('thud', 0.4, 60, 0.4); }
      else { P.dip = G.clamp(landedFall / 60, 0.03, 0.2); snd('thud', G.clamp(landedFall / 14, 0.1, 0.5), 70, 0.25); }
    }

    if (landedFall > 3) { const f = CH(); P.kickP -= G.clamp(landedFall / 40, 0, 0.3) * f; P.kickR += rr() * 0.06 * f; const lat = rr() * 1.6 * f; P.vx += cs * lat; P.vz += -sn * lat; }   // réception approximative
    // --- Pas, essoufflement ---
    const horiz = Math.hypot(P.vx, P.vz); P.speed = horiz;
    if (P.onGround && horiz > 0.4 && P.mode !== 'slide' && P.mode !== 'roll') {
      P.stepDist += horiz * dt;
      const stride = P.sprint ? 1.55 : 0.8, n = Math.floor(P.stepDist / stride);
      if (n > P.lastStep) { snd('footstep', P.sprint, G.zoneAt(p)); const k2 = (P.sprint ? 2 : 1) * CH(); P.kickP += rr() * 0.025 * k2; P.kickR += rr() * 0.035 * k2; }
      P.lastStep = n;
    }
    P.exert = G.clamp(P.exert + (P.sprint && horiz > 3 ? 0.2 : P.mode === 'slide' ? 0.05 : -0.07) * dt, 0, 1);
    P.lean = G.lerp(P.lean, fx * G.clamp(horiz / RUN, 0, 1), Math.min(1, dt * 8));
    snapPrev();
    return horiz;
  };
  function snapPrev() { for (const c of ['Space', 'KeyC', 'KeyF']) prev[c] = !!G.keys[c]; }

  /* ---------- Caméra : yeux, balancement, inclinaison, roulade, creux, champ de vision ---------- */
  G.updateCamera = function (dt, time) {
    const P = G.P, cam = G.camera, horiz = Math.hypot(P.vx, P.vz);
    const eyeH = EYE * (P.h / H_STAND) * 0.97 + 0.03;
    const rate = P.onGround ? 15 : 70;                                              // lisse les marches d'escalier
    P.eye += (P.pos.y + eyeH - P.eye) * Math.min(1, rate * dt);
    P.dip = Math.max(0, P.dip - dt * 0.55);
    const grounded = P.onGround && P.mode !== 'slide' && P.mode !== 'roll' && !P.anim;
    P.bobAmp = G.lerp(P.bobAmp, grounded ? G.clamp(horiz / RUN, 0, 1) : 0, Math.min(1, dt * 6));
    const stride = P.sprint ? 1.55 : 0.8, phase = P.stepDist / stride * Math.PI, run = P.sprint ? 1 : 0.4;
    const bobY = Math.abs(Math.sin(phase)) * (0.035 + run * 0.05) * P.bobAmp;
    const ch = CH(), sp = G.clamp(horiz / RUN, 0, 1.2);
    const bobX = Math.sin(phase) * (0.02 + run * 0.025) * P.bobAmp + Math.sin(phase * 0.5) * 0.012 * ch * P.bobAmp;
    P.kickP *= Math.exp(-9 * dt); P.kickR *= Math.exp(-9 * dt);
    const shP = noise(time, 1) * 0.014 * ch * sp + P.kickP, shY = noise(time, 2) * 0.010 * ch * sp, shR = noise(time, 3) * 0.022 * ch * sp + P.kickR;
    let rollT = Math.sin(phase) * (0.006 + run * 0.012) * P.bobAmp - P.lean * 0.035 + P.animRoll;      // inclinaison cible
    if (P.mode === 'wallrun') rollT += P.wallSide * 0.26 * (P.wallT < 0.9 ? 1 : 0.5 + 0.5 * Math.sin(time * 40)) ;
    if (P.mode === 'slide') rollT += 0.06; if (P.stunT > 0) rollT += Math.sin(time * 30) * 0.03;
    P.camRoll = G.lerp(P.camRoll, rollT, Math.min(1, dt * 12));
    let spin = 0; if (P.mode === 'roll') { const u = 1 - G.clamp(P.rollT / 0.62, 0, 1); spin = -Math.PI * 2 * ease(u); }   // la roulade
    const breath = Math.sin(time * 1.1) * 0.004 * (1 + P.exert * 2.5);
    const dip = P.dip + P.animDip + (P.mode === 'slide' ? 0.0 : 0);
    cam.position.set(P.pos.x + Math.cos(P.yaw) * bobX, P.eye + bobY + breath - dip, P.pos.z - Math.sin(P.yaw) * bobX);
    cam.rotation.set(P.pitch + P.animPitch + spin - bobY * 0.12 + shP, P.yaw + shY, P.camRoll + shR);
    P.fovKick = Math.max(0, P.fovKick - dt * 28);
    const fovT = 70 + (P.sprint ? 6 : 0) * P.bobAmp + P.fovKick + (P.mode === 'slide' ? 5 : 0) + (P.mode === 'wallrun' ? 4 : 0);
    if (Math.abs(cam.fov - fovT) > 0.05) { cam.fov += (fovT - cam.fov) * Math.min(1, dt * 9); cam.updateProjectionMatrix(); }
  };

  G.loaded.push('player');
})();
