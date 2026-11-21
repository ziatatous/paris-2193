/* =====================================================================
   game.js : le chef d'orchestre. Démarrage, boucle principale, souris/clavier, interactions, intro.
   L'ordre à chaque image : joueur -> caméra -> animations -> lumières -> son -> dessin.
   ===================================================================== */
(function () {
  'use strict';
  const G = window.G, T = G.T;
  const el = id => document.getElementById(id);
  let playing = false, started = false, locked = false, dragging = false, everLocked = false, last = 0, time = 0, canvasEl = null;
  const fwd = new T.Vector3();

  // Texte discret en bas de l'écran (pas d'interface lourde)
  G.say = function (text, ms) {
    const c = el('caption'); c.textContent = text; c.style.opacity = 1;
    clearTimeout(G._sayT); G._sayT = setTimeout(() => { c.style.opacity = 0; }, ms || 5000);
  };

  // Construit le monde pas à pas (progress sert à la barre de chargement du menu)
  G.boot = async function (canvas, progress) {
    const tick = () => new Promise(r => setTimeout(r, 20));
    canvasEl = canvas;
    G.loadSettings();
    progress(0.05, 'Rendu'); G.initRender(canvas); await tick();
    progress(0.2, 'Matières : béton, rouille, asphalte'); G.buildMaterials(); await tick();
    progress(0.5, 'Immeuble, escalier, rue'); G.buildWorld(); await tick();
    progress(0.9, 'Joueur'); G.initPlayer(); G.updateLamps(0, 0); G.render(0);
    progress(1, 'Prêt');
    last = performance.now(); requestAnimationFrame(loop);
    bindInput();
  };

  // Appelé quand le joueur clique pour entrer (ou reprendre après une pause)
  G.start = function () {
    G.audio.init(); G.audio.resume(); G.audio.setVolume(G.settings.volume);
    playing = true; last = performance.now();
    try { const r = canvasEl.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) { /* tant pis : clic maintenu pour tourner */ }
    if (!started) { started = true; intro(); }
  };

  // Début calme : écran noir, le titre, puis on ouvre les yeux dans le studio
  function intro() {
    const f = el('fade'), t = el('title');
    f.style.transition = 'none'; f.style.opacity = 1; t.style.opacity = 0;
    setTimeout(() => { t.style.transition = 'opacity 2s'; t.style.opacity = 1; }, 300);
    setTimeout(() => { t.style.opacity = 0; }, 3400);
    setTimeout(() => { f.style.transition = 'opacity 5s ease-out'; f.style.opacity = 0; }, 4200);
    setTimeout(() => { const h = el('hint'); h.style.opacity = 1; setTimeout(() => { h.style.opacity = 0; }, 9000); }, 9500);
  }

  function pause() {
    playing = false; G.audio.suspend();
    el('enter-text').textContent = 'PAUSE'; el('enter-sub').textContent = 'cliquer pour reprendre'; el('enter').hidden = false;
  }

  function bindInput() {
    addEventListener('keydown', e => {
      G.keys[e.code] = true;
      if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
      if (e.code === 'KeyM') G.audio.toggleMusic();
      if (e.code === 'KeyE' && playing && G.focus) G.focus.use();
    });
    addEventListener('keyup', e => { G.keys[e.code] = false; });
    addEventListener('blur', () => { for (const k in G.keys) G.keys[k] = false; });
    addEventListener('mousemove', e => {
      if (!playing || !(locked || dragging)) return;
      const s = 0.0022 * G.settings.sens;
      G.P.yaw -= e.movementX * s; G.P.pitch = G.clamp(G.P.pitch - e.movementY * s, -1.5, 1.5);
    });
    canvasEl.addEventListener('mousedown', () => { dragging = true; });
    addEventListener('mouseup', () => { dragging = false; });
    document.addEventListener('pointerlockchange', () => {
      locked = document.pointerLockElement === canvasEl;
      if (locked) everLocked = true; else if (everLocked && playing) pause();     // Échap = pause
    });
  }

  // Quel objet le joueur regarde-t-il, de près ? (une seule indication discrète à l'écran)
  function updateInteract() {
    const cam = G.camera; cam.getWorldDirection(fwd);
    let best = null, bd = 1e9;
    for (const it of G.interactables) {
      const to = it.pos.clone().sub(cam.position), d = to.length();
      if (d < it.radius && to.normalize().dot(fwd) > 0.82 && d < bd) { best = it; bd = d; }
    }
    G.focus = best;
    const pr = el('prompt'); pr.textContent = best ? '[E]  ' + best.prompt : ''; pr.style.opacity = best ? 1 : 0;
  }

  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000); last = now; time += dt;
    if (playing) { G.updatePlayer(dt); updateInteract(); }
    G.updateCamera(dt, time);
    for (const a of G.animated) a.update(dt);
    G.updateLamps(dt, time);
    const zone = G.zoneAt(G.P.pos);
    G.scene.fog.density += ((zone === 'in' ? 0.032 : 0.06) - G.scene.fog.density) * Math.min(1, dt * 1.5);   // plus clair dans l'immeuble
    if (playing) { G.camera.getWorldDirection(fwd); G.audio.update(dt, G.camera.position, fwd, zone, G.P.exert); }
    G.render(time);
  }

  G.loaded.push('game');
})();
