/* =====================================================================
   audio.js : lit TES fichiers sons ; pour chaque dossier SANS fichier, utilise les FX fabriqués par code (js/sfx.js).
   - audio/music/*            : musique du jeu, jouée en boucle aléatoire avec fondu.
   - audio/fx/<element>/*     : un dossier par élément (pas, saut, ambiance...). S'il y a plusieurs
                                fichiers dans un dossier, le jeu en choisit un au hasard à chaque fois.
   La liste des fichiers vient de audio/manifest.json, créé par serve.py / build.py (voir audio/README.md).
   Dossier vide ou absent = silence, sans erreur.
   ===================================================================== */
(function () {
  'use strict';
  const G = window.G;
  let ac = null, master, musicBus, fxBus, manifest = { music: [], fx: {} };
  const buf = {};                 // dossier -> liste de sons décodés
  const loops = {};               // sons qui bouclent (ambiances, respiration, écran)
  let musicOn = true, curMusic = null, lastZone = 'in';

  // Ces fonctions ne font rien tant que l'audio n'est pas démarré (il faut d'abord un clic du joueur)
  const A = G.audio = { footstep() {}, thud() {}, jump() {}, flick() {}, fx() {}, update() {} };

  A.init = async function () {
    if (ac) return;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ac = new AC(); A.ctx = ac;
    master = ac.createGain(); master.gain.value = G.settings.volume; master.connect(ac.destination);
    musicBus = ac.createGain(); musicBus.gain.value = G.settings.music; musicBus.connect(master);
    fxBus = ac.createGain(); fxBus.gain.value = G.settings.fx; fxBus.connect(master);
    A.footstep = footstep; A.thud = land; A.jump = jump; A.flick = pickup; A.update = update; A.fx = (folder, vol) => play(folder, vol);
    if (location.protocol === 'file:') console.info('[audio] page ouverte en double-clic : le navigateur bloque les fichiers sons. Lance jouer.bat (ou python3 serve.py), voir audio/README.md.');
    else { try { const r = await fetch('audio/manifest.json', { cache: 'no-store' }); if (r.ok) manifest = await r.json(); } catch (e) { /* pas de sons : silence */ } }
    for (const folder in manifest.fx || {}) {            // charge et décode chaque fichier de chaque dossier
      buf[folder] = [];
      for (const url of manifest.fx[folder]) {
        try { buf[folder].push(await ac.decodeAudioData(await (await fetch(url)).arrayBuffer())); }
        catch (e) { console.warn('[audio] fichier illisible :', url); }
      }
    }
    if (G.sfx) for (const name of G.sfx.names) if (!buf[name] || !buf[name].length) { const made = G.sfx.make(ac, name); if (made) buf[name] = made; }   // FX par défaut
    A.buffers = buf; startLoops(); startMusic(); scheduleSiren(40000);
  };
  A.suspend = () => { if (ac && ac.state === 'running') { ac.suspend(); if (curMusic) curMusic.pause(); } };
  A.resume = () => { if (ac && ac.state === 'suspended') { ac.resume(); if (curMusic) curMusic.play().catch(() => {}); } };
  A.toggleMusic = () => { musicOn = !musicOn; if (ac) musicBus.gain.setTargetAtTime(musicOn ? G.settings.music : 0, ac.currentTime, 0.2); };
  A.setVolume = v => { if (ac) master.gain.setTargetAtTime(v, ac.currentTime, 0.1); };

  // Joue un fichier au hasard du dossier (légère variation de hauteur pour éviter la répétition)
  function play(folder, vol) {
    const list = buf[folder]; if (!list || !list.length) return null;
    const s = ac.createBufferSource(); s.buffer = list[Math.floor(Math.random() * list.length)];
    s.playbackRate.value = 1 + (Math.random() - 0.5) * 0.1;
    const g = ac.createGain(); g.gain.value = vol == null ? 1 : vol; s.connect(g); g.connect(fxBus); s.start(); return s;
  }
  // Son qui boucle, dont on règle ensuite le volume (gain.g)
  function makeLoop(folder, dest) {
    const list = buf[folder]; if (!list || !list.length) return null;
    const s = ac.createBufferSource(); s.buffer = list[0]; s.loop = true;
    const g = ac.createGain(); g.gain.value = 0; s.connect(g); g.connect(dest || fxBus); s.start(); return { g };
  }
  function startLoops() {
    loops.inside = makeLoop('ambience_inside'); loops.outside = makeLoop('ambience_outside');
    loops.breathIdle = makeLoop('breath_idle'); loops.breathRun = makeLoop('breath_run'); loops.heartbeat = makeLoop('heartbeat'); loops.drone = makeLoop('drone');
    const p = ac.createPanner(); p.panningModel = 'HRTF'; p.refDistance = 1; p.rolloffFactor = 1.6;   // l'écran : son placé dans la pièce
    if (G.crtPos) { p.positionX.value = G.crtPos.x; p.positionY.value = G.crtPos.y; p.positionZ.value = G.crtPos.z; }
    p.connect(fxBus); loops.crt = makeLoop('crt', p);
  }
  // Musique : lecture en flux (fichiers longs OK), ordre aléatoire, fondu à l'entrée
  function startMusic() {
    const tracks = (manifest.music || []).slice().sort(() => Math.random() - 0.5); if (!tracks.length) return;
    let i = 0;
    (function next() {
      const el = new Audio(); el.crossOrigin = 'anonymous'; el.src = tracks[i++ % tracks.length]; curMusic = el;
      const g = ac.createGain(); g.gain.value = 0; ac.createMediaElementSource(el).connect(g); g.connect(musicBus);
      g.gain.linearRampToValueAtTime(1, ac.currentTime + 4);
      el.addEventListener('ended', () => { g.disconnect(); next(); });
      el.play().catch(() => {});
    })();
  }
  function scheduleSiren(delay) {
    setTimeout(() => { if (buf.siren && buf.siren.length) play('siren', lastZone === 'in' ? 0.3 : 0.7); scheduleSiren(40000 + Math.random() * 50000); }, delay);
  }

  // --- Événements du jeu -> dossiers de sons ---
  function footstep(sprint, zone) { play(sprint && buf.footsteps_run && buf.footsteps_run.length ? 'footsteps_run' : 'footsteps', sprint ? 1 : 0.8); }
  function land(vol) { play('land', Math.min(1, vol * 2)); }
  function jump() { play('jump', 0.9); }
  function pickup() { play('lighter', 1); }

  // À chaque image : ambiance selon le lieu, respiration selon l'effort, "oreille" placée sur la caméra
  function update(dt, cam, dir, zone, exert) {
    const t = ac.currentTime; lastZone = zone;
    if (loops.inside) loops.inside.g.gain.setTargetAtTime(zone === 'in' ? 1 : 0, t, 0.6);
    if (loops.outside) loops.outside.g.gain.setTargetAtTime(zone === 'in' ? 0 : 1, t, 0.6);
    if (loops.crt) loops.crt.g.gain.setTargetAtTime(1, t, 0.2);
    if (loops.breathIdle) loops.breathIdle.g.gain.setTargetAtTime(0.6 * (1 - exert), t, 0.4);
    if (loops.breathRun) loops.breathRun.g.gain.setTargetAtTime(exert, t, 0.4);
    if (loops.drone) loops.drone.g.gain.setTargetAtTime(0.35 + 0.5 * (G.alert || 0), t, 1.2);       // grondement de fond, qui monte avec la menace
    if (loops.heartbeat) loops.heartbeat.g.gain.setTargetAtTime(G.clamp(((G.alert || 0) - 0.4) * 1.7, 0, 1), t, 0.3);   // le coeur bat quand la police approche
    const L = ac.listener;
    if (L.positionX) {
      L.positionX.value = cam.x; L.positionY.value = cam.y; L.positionZ.value = cam.z;
      L.forwardX.value = dir.x; L.forwardY.value = dir.y; L.forwardZ.value = dir.z; L.upX.value = 0; L.upY.value = 1; L.upZ.value = 0;
    }
  }

  G.loaded.push('audio');
})();
