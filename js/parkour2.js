/* =====================================================================
   parkour2.js : mouvements d'EXPLORATION ajoutés : BARRES où se balancer (Espace en l'air près d'une barre, W/S pour pomper, Espace pour lâcher)
   et ÉCHELLES (E devant le bas, W/S pour monter/descendre, Espace pour sauter de l'échelle). Branché dans player.js via G.extraMovement.
   ===================================================================== */
(function () {
  'use strict';
  const G = window.G, T = G.T;
  G.bars = []; G.ladders = [];
  const HANG = 1.95, GRAV = 9.8, L = 1.9;           // distance mains -> pieds, gravité, longueur du pendule
  let prevSpace = false, prevE = false;

  // Barre horizontale : axis 'x' (le long de x) ou 'z', centre (x,z), longueur len, hauteur y. Visible : tube de fer + deux consoles.
  G.addBar = function (axis, cx, cz, len, y) {
    const iron = new T.MeshPhongMaterial({ color: 0x8a8a7c, shininess: 30, emissive: 0x2a2a22 }), m = new T.Mesh(new T.CylinderGeometry(0.045, 0.045, len, 8), iron); m.position.set(cx, y, cz); if (axis === 'x') m.rotation.z = Math.PI / 2; else m.rotation.x = Math.PI / 2; G.scene.add(m);
    for (const s of [-1, 1]) { const b = new T.Mesh(new T.BoxGeometry(0.12, 0.12, 0.12), iron); b.position.set(axis === 'x' ? cx + s * len / 2 : cx, y, axis === 'z' ? cz + s * len / 2 : cz); G.scene.add(b); }
    const bar = { axis, cx, cz, len, y }; G.bars.push(bar); return bar;
  };
  // Échelle : base (x,z), de y0 à y1, `out` = direction (unitaire) du mur vers le joueur
  G.addLadder = function (x, z, y0, y1, outx, outz) {
    const iron = new T.MeshPhongMaterial({ color: 0x7a7a6c, shininess: 20, emissive: 0x222218 }), h = y1 - y0, g = new T.Group(); g.position.set(x, y0, z); G.scene.add(g);
    const px = -outz, pz = outx;                                                     // perpendiculaire (largeur de l'échelle)
    for (const s of [-0.22, 0.22]) { const r = new T.Mesh(new T.BoxGeometry(0.05, h, 0.05), iron); r.position.set(px * s, h / 2, pz * s); g.add(r); }
    for (let k = 0.3; k < h; k += 0.32) { const r = new T.Mesh(new T.CylinderGeometry(0.02, 0.02, 0.44, 5), iron); r.position.set(0, k, 0); r.rotation.z = Math.PI / 2; r.rotation.y = Math.atan2(pz, px) * -1 + 0; g.add(r); }
    const l = { x, z, y0, y1, outx, outz }; G.ladders.push(l); return l;
  };
  G.clearParkour = () => { G.bars.length = 0; G.ladders.length = 0; };

  function nearBar(P) {
    const p = P.pos; let best = null, bd = 0.85;
    for (const b of G.bars) {
      const dy = b.y - p.y; if (dy < 1.35 || dy > 2.45) continue;
      let d; if (b.axis === 'x') { if (Math.abs(p.x - b.cx) > b.len / 2) continue; d = Math.abs(p.z - b.cz); } else { if (Math.abs(p.z - b.cz) > b.len / 2) continue; d = Math.abs(p.x - b.cx); }
      if (d < bd) { bd = d; best = b; }
    }
    return best;
  }

  G.extraMovement = function (P, dt, k, jumpPressed) {
    const p = P.pos, ePressed = !!k.KeyE && !prevE, space = !!k.Space; prevE = !!k.KeyE;
    const sp = jumpPressed;
    P.grabCD = (P.grabCD || 0) - dt;
    // ----- BALANCEMENT -----
    if (P.mode === 'swing') {
      const S = P.swing, b = S.bar, fwd = (k.KeyW ? 1 : 0) - (k.KeyS ? 1 : 0);
      // l'axe de balancement est perpendiculaire à la barre ; `sgn` = sens positif
      const perpX = b.axis === 'x' ? 0 : 1, perpZ = b.axis === 'x' ? 1 : 0;
      const look = -Math.sin(P.yaw) * perpX - Math.cos(P.yaw) * perpZ;               // vers où regarde le joueur sur l'axe
      S.av += (-(GRAV / L) * Math.sin(S.th) - 0.12 * S.av + fwd * Math.sign(look || 1) * 2.4 * Math.cos(S.th) * (Math.sign(S.av) === Math.sign(fwd * look || 1) ? 1 : 0.2)) * dt;   // pendule + amortissement + « pompage »
      S.th = Math.max(-1.45, Math.min(1.45, S.th + S.av * dt));
      const nx = b.axis === 'x' ? p.x : b.cx + Math.sin(S.th) * L, nz = b.axis === 'x' ? b.cz + Math.sin(S.th) * L : p.z, ny = b.y - Math.cos(S.th) * L - 0.05;
      if (G.blocked(nx, nz, ny + 0.2, 1.4, 0.35)) { S.av *= -0.4; } else { p.set(nx, ny, nz); }
      P.h = 1.75; P.vx = P.vz = P.vy = 0; P.onGround = false; P.kickR = Math.sin(S.th) * 0.05 * (b.axis === 'x' ? 1 : -1);
      if (sp) {                                                                     // lâcher : on part dans le sens du mouvement, avec élan
        const v = S.av * L, dirX = b.axis === 'x' ? 0 : Math.sign(S.av) , dirZ = b.axis === 'x' ? Math.sign(S.av) : 0;
        P.vx = dirX * Math.abs(v) * Math.cos(S.th) * 1.1; P.vz = dirZ * Math.abs(v) * Math.cos(S.th) * 1.1; P.vy = Math.max(2.5, Math.abs(v) * Math.sin(Math.abs(S.th)) * 1.4 + 2.5);
        P.mode = 'move'; P.swing = null; P.grabCD = 0.4; P.jumpBuf = 0; return false;
      }
      if (G.keys.KeyC) { P.mode = 'move'; P.swing = null; P.grabCD = 0.4; P.vy = -1; return false; }       // se laisser tomber
      return true;
    }
    if (!P.onGround && P.grabCD <= 0 && sp && P.mode === 'move') {
      const b = nearBar(P);
      if (b) {
        const perp = b.axis === 'x' ? 'z' : 'x', v = perp === 'z' ? P.vz : P.vx, off = (perp === 'z' ? p.z - b.cz : p.x - b.cx);
        P.dashT = 0; P.mode = 'swing'; P.swing = { bar: b, th: Math.max(-0.5, Math.min(0.5, Math.asin(Math.max(-1, Math.min(1, off / L))))), av: Math.max(-4, Math.min(4, v / L)) };
        const f = G.audio && G.audio.fx; if (f) f('thud', 0.5); G.say('', 1); return true;
      }
    }
    // ----- ÉCHELLE -----
    if (P.mode === 'ladder') {
      const Ld = P.ladder, up = (k.KeyW ? 1 : 0) - (k.KeyS ? 1 : 0);
      p.y += up * 2.3 * dt; P.vx = P.vz = P.vy = 0; P.onGround = false; P.h = 1.75;
      P.stepDist = (P.stepDist || 0) + Math.abs(up) * dt * 2;
      if (p.y >= Ld.y1 - 0.05) { p.set(Ld.x - Ld.outx * 0.85, Ld.y1, Ld.z - Ld.outz * 0.85); P.mode = 'move'; P.ladder = null; P.vy = 0; P.onGround = true; P.grabCD = 0.4; return false; }
      if (p.y <= Ld.y0 && up < 0) { P.mode = 'move'; P.ladder = null; P.grabCD = 0.3; return false; }
      if (sp) { P.mode = 'move'; P.ladder = null; P.vx = Ld.outx * 4; P.vz = Ld.outz * 4; P.vy = 3.5; P.grabCD = 0.4; return false; }   // saut de l'échelle (dos au mur)
      return true;
    }
    if (ePressed && P.mode === 'move' && P.grabCD <= 0) {
      for (const Ld of G.ladders) {
        const bx = Ld.x + Ld.outx * 0.5, bz = Ld.z + Ld.outz * 0.5;
        if (Math.hypot(p.x - bx, p.z - bz) < 1.3 && p.y > Ld.y0 - 0.4 && p.y < Ld.y0 + 1.2) {
          P.dashT = 0; P.mode = 'ladder'; P.ladder = Ld; p.set(bx, Math.max(p.y, Ld.y0), bz); P.yaw = Math.atan2(Ld.outx, Ld.outz); P.pitch = 0.3; return true;     // face au mur
        }
      }
    }
    return false;
  };
  // Prompt : « [E] Monter » devant une échelle (utilisé par game.js via G.ladderPrompt)
  G.ladderPrompt = function (P) { if (P.mode !== 'move') return null; for (const Ld of G.ladders) { const bx = Ld.x + Ld.outx * 0.5, bz = Ld.z + Ld.outz * 0.5; if (Math.hypot(P.pos.x - bx, P.pos.z - bz) < 1.3 && P.pos.y > Ld.y0 - 0.4 && P.pos.y < Ld.y0 + 1.2) return 'Monter à l\'échelle'; } return null; };
  G.loaded.push('parkour2');
})();
