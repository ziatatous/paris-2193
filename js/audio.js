/* =====================================================================
   audio.js : tous les sons sont générés par code (Web Audio), aucun fichier.
   Le son change selon le lieu : étouffé et plein d'écho dans l'escalier, ouvert et venteux dehors.
   ===================================================================== */
(function () {
  'use strict';
  const G = window.G;
  let ac = null, master, musicBus, ambBus, sfxBus, outFilter, windGain, windFilter, revSend, reverb, noiseBuf, breathGain, crtGain;
  let musicOn = true, breathPhase = 0;

  const A = G.audio = {
    // Ces fonctions ne font rien tant que l'audio n'est pas démarré (il faut un clic du joueur d'abord)
    footstep() {}, thud() {}, flick() {}, update() {}
  };

  A.init = function () {
    if (ac) return;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ac = new AC(); A.ctx = ac;
    master = ac.createGain(); master.gain.value = G.settings.volume; master.connect(ac.destination);
    musicBus = ac.createGain(); musicBus.gain.value = 0.45; musicBus.connect(master);
    ambBus = ac.createGain(); ambBus.connect(master);
    sfxBus = ac.createGain(); sfxBus.connect(master);
    // "Dehors" : tout ce qui vient de la rue passe par ce filtre, qui s'étouffe quand on est dans l'immeuble
    outFilter = ac.createBiquadFilter(); outFilter.type = 'lowpass'; outFilter.frequency.value = 400; outFilter.connect(ambBus);

    noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // Écho : bruit qui s'éteint = grande cage d'escalier en béton
    const len = ac.sampleRate * 2.8, ir = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++) { const ch = ir.getChannelData(c); for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
    reverb = ac.createConvolver(); reverb.buffer = ir;
    const rg = ac.createGain(); rg.gain.value = 0.6; reverb.connect(rg); rg.connect(master);
    revSend = ac.createGain(); revSend.gain.value = 0.5; revSend.connect(reverb);

    startWind(); startDrone(); startBreath(); startCrt();
    scheduleMusic(); scheduleSiren(18000); scheduleClang(35000);
    A.footstep = footstep; A.thud = thud; A.flick = flick; A.update = update;
  };
  A.suspend = () => { if (ac && ac.state === 'running') ac.suspend(); };
  A.resume = () => { if (ac && ac.state === 'suspended') ac.resume(); };
  A.toggleMusic = () => { musicOn = !musicOn; if (ac) musicBus.gain.setTargetAtTime(musicOn ? 0.45 : 0, ac.currentTime, 0.2); };
  A.setVolume = v => { if (ac) master.gain.setTargetAtTime(v, ac.currentTime, 0.1); };

  const noiseSrc = loop => { const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = loop; return s; };

  function startWind() {                                   // vent : bruit filtré qui ondule lentement
    const s = noiseSrc(true); s.start();
    windFilter = ac.createBiquadFilter(); windFilter.type = 'bandpass'; windFilter.frequency.value = 300; windFilter.Q.value = 0.6;
    windGain = ac.createGain(); windGain.gain.value = 0.05;
    const lfo = ac.createOscillator(); lfo.frequency.value = 0.06; const lg = ac.createGain(); lg.gain.value = 0.025; lfo.connect(lg); lg.connect(windGain.gain); lfo.start();
    s.connect(windFilter); windFilter.connect(windGain); windGain.connect(outFilter);
  }
  function startDrone() {                                  // grondement grave permanent (l'immeuble, la ville)
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 150;
    const g = ac.createGain(); g.gain.value = 0.13;
    for (const hz of [41, 41.7, 82.2]) { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz; o.connect(f); o.start(); }
    f.connect(g); g.connect(ambBus);
  }
  function startBreath() {                                 // respiration : plus rapide et plus forte après un sprint
    const s = noiseSrc(true); s.start();
    const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 850; f.Q.value = 0.9;
    breathGain = ac.createGain(); breathGain.gain.value = 0; s.connect(f); f.connect(breathGain); breathGain.connect(sfxBus);
  }
  function startCrt() {                                    // bourdonnement du vieil écran, positionné dans l'espace
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 600;
    crtGain = ac.createGain(); crtGain.gain.value = 0;
    const p = ac.createPanner(); p.panningModel = 'HRTF'; p.refDistance = 1; p.rolloffFactor = 1.6;
    if (G.crtPos) { p.positionX.value = G.crtPos.x; p.positionY.value = G.crtPos.y; p.positionZ.value = G.crtPos.z; }
    for (const hz of [100, 200.5]) { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz; o.connect(f); o.start(); }
    const n = noiseSrc(true); n.start(); const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 5000; const ng = ac.createGain(); ng.gain.value = 0.05;
    n.connect(hp); hp.connect(ng); ng.connect(crtGain);
    f.connect(crtGain); crtGain.connect(p); p.connect(ambBus);
  }
  const SCALE = [110, 130.8, 146.8, 164.8, 196, 220];
  function scheduleMusic() {                               // musique générative : notes lentes, graves, dans l'écho
    if (musicOn) { const hz = SCALE[Math.floor(Math.random() * SCALE.length)] / (Math.random() < 0.4 ? 2 : 1); pad(hz, 0.045, 4, 7); if (Math.random() < 0.3) pad(hz * 3, 0.01, 2, 6); }
    setTimeout(scheduleMusic, 5000 + Math.random() * 5000);
  }
  function pad(hz, vol, attack, release) {
    const t = ac.currentTime, g = ac.createGain(); g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.linearRampToValueAtTime(0, t + attack + release);
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 650;
    for (const det of [-4, 4]) { const o = ac.createOscillator(); o.type = 'triangle'; o.frequency.value = hz; o.detune.value = det; o.connect(f); o.start(t); o.stop(t + attack + release + 0.2); }
    f.connect(g); g.connect(musicBus); g.connect(revSend);
  }
  function scheduleSiren(delay) {                          // sirène très lointaine (étouffée quand on est à l'intérieur)
    setTimeout(() => {
      const t = ac.currentTime, o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = 620;
      const l = ac.createOscillator(); l.frequency.value = 0.4; const lg = ac.createGain(); lg.gain.value = 130; l.connect(lg); lg.connect(o.frequency);
      const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 800;
      const g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.03, t + 3); g.gain.setValueAtTime(0.03, t + 10); g.gain.linearRampToValueAtTime(0, t + 15);
      const pan = ac.createStereoPanner(); pan.pan.value = Math.random() * 1.6 - 0.8;
      o.connect(f); f.connect(g); g.connect(pan); pan.connect(outFilter); pan.connect(revSend);
      o.start(t); l.start(t); o.stop(t + 15.5); l.stop(t + 15.5);
      scheduleSiren(30000 + Math.random() * 30000);
    }, delay);
  }
  function scheduleClang(delay) {                          // un bruit métallique, quelque part dans l'immeuble ou dehors
    setTimeout(() => {
      const t = ac.currentTime, s = noiseSrc(false), f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900 + Math.random() * 1500; f.Q.value = 7;
      const g = ac.createGain(); g.gain.setValueAtTime(0.18, t); g.gain.exponentialRampToValueAtTime(0.001, t + 1.4);
      s.connect(f); f.connect(g); g.connect(revSend); g.connect(outFilter); s.start(t, Math.random() * 1.5, 1.4);
      scheduleClang(45000 + Math.random() * 60000);
    }, delay);
  }

  // --- Sons ponctuels ---
  function footstep(sprint, zone) {                        // un souffle grave très court + écho
    const t = ac.currentTime, s = noiseSrc(false), f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 240 + Math.random() * 240;
    const g = ac.createGain(), v = sprint ? 0.6 : 0.28;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.008); g.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
    s.connect(f); f.connect(g); g.connect(sfxBus); g.connect(revSend); s.start(t, Math.random() * 1.5, 0.15);
  }
  function thud(vol, hz, dur) {
    const t = ac.currentTime, o = ac.createOscillator(); o.frequency.setValueAtTime(hz * 2, t); o.frequency.exponentialRampToValueAtTime(hz, t + 0.12);
    const g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(sfxBus); g.connect(revSend); o.start(t); o.stop(t + dur + 0.05);
  }
  function flick() {                                       // la molette d'un briquet : deux petits claquements secs
    for (const dt of [0, 0.11]) {
      const t = ac.currentTime + dt, s = noiseSrc(false), f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 2800;
      const g = ac.createGain(); g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      s.connect(f); f.connect(g); g.connect(sfxBus); s.start(t, Math.random(), 0.06);
    }
  }

  // Appelé à chaque image : ajuste le son selon le lieu et l'effort, place "l'oreille" sur la caméra
  function update(dt, cam, dir, zone, exert) {
    const t = ac.currentTime, inside = zone === 'in';
    outFilter.frequency.setTargetAtTime(inside ? 380 : 7000, t, 0.4);
    windGain.gain.setTargetAtTime(inside ? 0.025 : 0.06, t, 0.5);
    revSend.gain.setTargetAtTime(inside ? 0.95 : 0.4, t, 0.5);
    crtGain.gain.setTargetAtTime(0.045, t, 0.2);
    breathPhase += dt * (0.28 + exert * 1.1) * 6.2832;
    breathGain.gain.setTargetAtTime((0.004 + exert * 0.09) * Math.pow(Math.sin(breathPhase) * 0.5 + 0.5, 2), t, 0.05);
    const L = ac.listener;
    if (L.positionX) {
      L.positionX.value = cam.x; L.positionY.value = cam.y; L.positionZ.value = cam.z;
      L.forwardX.value = dir.x; L.forwardY.value = dir.y; L.forwardZ.value = dir.z; L.upX.value = 0; L.upY.value = 1; L.upZ.value = 0;
    }
  }

  G.loaded.push('audio');
})();
