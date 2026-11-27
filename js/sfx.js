/* =====================================================================
   sfx.js : les FX SONORES fabriqués par code (échantillons calculés une fois au démarrage, comme des fichiers).
   Si tu déposes tes propres fichiers dans audio/fx/<dossier>/, ils REMPLACENT ceux-ci (voir audio.js).
   La musique, elle, vient toujours de audio/music/.
   Chaque générateur renvoie une liste de variantes (AudioBuffer) ; audio.js en joue une au hasard.
   ===================================================================== */
(function () {
  'use strict';
  const G = window.G;
  let sr = 44100, seed = 1;
  const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return ((seed >>> 0) % 100000) / 100000; };   // aléatoire local (ne touche pas à celui du monde)
  const N = () => rnd() * 2 - 1;
  const TAU = Math.PI * 2;
  // Filtres simples (un pôle) : renvoient un traitement échantillon par échantillon
  const lp = (fc) => { const a = 1 - Math.exp(-TAU * fc / sr); let y = 0; return x => (y += a * (x - y)); };
  const hp = (fc) => { const l = lp(fc); return x => x - l(x); };
  const bp = (lo, hi) => { const h = hp(lo), l = lp(hi); return x => l(h(x)); };
  const env = (t, atk, dec) => t < atk ? t / atk : Math.exp(-(t - atk) / dec);        // montée linéaire puis décroissance exponentielle
  const mk = (ac, dur, fn) => { sr = ac.sampleRate; const n = Math.floor(dur * sr), b = ac.createBuffer(1, n, sr), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = fn(i / sr, i, n); return b; };
  const norm = (b, peak) => { const d = b.getChannelData(0); let m = 0; for (let i = 0; i < d.length; i++) m = Math.max(m, Math.abs(d[i])); const k = peak / (m || 1); for (let i = 0; i < d.length; i++) d[i] *= k; return b; };
  const loopFix = (b, xf) => { const d = b.getChannelData(0), n = Math.floor(xf * sr); for (let i = 0; i < n; i++) { const k = i / n; d[i] = d[i] * k + d[d.length - n + i] * (1 - k); } const out = new Float32Array(d.length - n); out.set(d.subarray(0, d.length - n)); const nb = new AudioBuffer({ length: out.length, sampleRate: sr }); nb.copyToChannel(out, 0); return nb; };   // boucle sans clic
  const many = (k, f) => Array.from({ length: k }, (_, i) => f(i));

  const GEN = {
    footsteps: ac => many(5, () => { const f0 = 80 + rnd() * 30, g = lp(700 + rnd() * 500), h = bp(1800, 5000); return norm(mk(ac, 0.28, t => (Math.sin(TAU * (f0 * 0.6 + f0 * 0.4 * Math.exp(-t * 30)) * t) * env(t, 0.002, 0.045) * 0.9 + g(N()) * env(t, 0.001, 0.05) * 0.7 + h(N()) * env(t, 0.001, 0.02) * 0.25)), 0.55); }),
    footsteps_run: ac => many(5, () => { const f0 = 95 + rnd() * 30, g = lp(900 + rnd() * 600), h = bp(1500, 6000); return norm(mk(ac, 0.22, t => (Math.sin(TAU * (f0 * 0.6 + f0 * 0.5 * Math.exp(-t * 35)) * t) * env(t, 0.001, 0.04) + g(N()) * env(t, 0.001, 0.04) * 0.8 + h(N()) * env(t, 0.001, 0.025) * 0.5)), 0.7); }),
    jump: ac => many(3, () => { const b = bp(350, 2200); return norm(mk(ac, 0.3, t => b(N()) * Math.sin(Math.PI * Math.min(1, t / 0.3)) ** 1.5 * 0.8 + Math.sin(TAU * 70 * t) * env(t, 0.001, 0.05) * 0.3), 0.45); }),
    land: ac => many(3, () => { const g = lp(500 + rnd() * 300); return norm(mk(ac, 0.5, t => Math.sin(TAU * (45 + 40 * Math.exp(-t * 18)) * t) * env(t, 0.002, 0.12) + g(N()) * env(t, 0.001, 0.09) * 0.6), 0.8); }),
    lighter: ac => [(() => { const h = bp(2500, 9000), l = bp(300, 1800); return norm(mk(ac, 0.7, t => h(N()) * env(t, 0.001, 0.012) * 0.9 + (t > 0.09 ? l(N()) * Math.min(1, (t - 0.09) / 0.05) * Math.exp(-(t - 0.09) / 0.25) * 0.5 : 0) + (t > 0.12 ? Math.sin(TAU * 2200 * t) * env(t - 0.12, 0.001, 0.02) * 0.1 : 0)), 0.5); })()],
    breath_idle: ac => [(() => { const b = bp(280, 1400), c = lp(2200); return norm(loopFix(mk(ac, 5.2, t => { const ph = (t % 4.7) / 4.7, inh = ph < 0.42 ? Math.sin(Math.PI * ph / 0.42) ** 2 : 0, exh = ph > 0.5 && ph < 0.95 ? Math.sin(Math.PI * (ph - 0.5) / 0.45) ** 2 : 0; return c(b(N())) * (inh * 0.7 + exh); }), 0.5), 0.35); })()],
    breath_run: ac => [(() => { const b = bp(350, 2800); return norm(loopFix(mk(ac, 2.1, t => { const ph = (t % 1.6) / 1.6, inh = Math.sin(Math.PI * Math.min(1, ph / 0.4)) ** 2 * (ph < 0.4 ? 1 : 0), exh = ph > 0.45 && ph < 0.95 ? Math.sin(Math.PI * (ph - 0.45) / 0.5) ** 2 : 0; return b(N()) * (inh * 0.9 + exh * 1.0) + Math.sin(TAU * 140 * t) * 0.02 * exh; }), 0.5), 0.6); })()],
    heartbeat: ac => [(() => { const g = lp(180); return norm(loopFix(mk(ac, 1.4, t => { const one = (tt) => tt < 0 ? 0 : Math.sin(TAU * (48 + 30 * Math.exp(-tt * 25)) * tt) * env(tt, 0.004, 0.07); return one(t % 1.0) + one((t % 1.0) - 0.27) * 0.7 + g(N()) * (env(t % 1.0, 0.002, 0.04) + env((t % 1.0) - 0.27, 0.002, 0.04) * 0.6) * 0.15; }), 0.4), 0.85); })()],
    ambience_inside: ac => [(() => { const g = lp(260), h = lp(90); return norm(loopFix(mk(ac, 10, t => Math.sin(TAU * 50 * t) * 0.35 + Math.sin(TAU * 100 * t) * 0.15 + Math.sin(TAU * 150 * t) * 0.05 + g(N()) * (0.28 + 0.12 * Math.sin(TAU * t / 5)) + h(N()) * 0.3), 1.2), 0.3); })()],
    ambience_outside: ac => [(() => { const w = bp(120, 900), r = lp(70); return norm(loopFix(mk(ac, 16, t => w(N()) * (0.35 + 0.3 * Math.sin(TAU * t / 8 + 1) * Math.sin(TAU * t / 5.3)) + r(N()) * 0.9 + Math.sin(TAU * 38 * t) * 0.12), 2), 0.35); })()],
    crt: ac => [(() => { const h = bp(2500, 8000); return norm(mk(ac, 2, t => Math.sin(TAU * 100 * t) * 0.5 + Math.sin(TAU * 200 * t) * 0.18 + h(N()) * 0.12), 0.25); })()],
    siren: ac => [(() => { const l = lp(900); let dl = new Float32Array(Math.floor(0.34 * sr)), di = 0; return norm(mk(ac, 7, t => { const f = Math.floor(t / 1.1) % 2 ? 470 : 640, e = Math.sin(Math.PI * t / 7) ** 2, x = l(Math.sin(TAU * f * t) + 0.3 * Math.sin(TAU * f * 2 * t)) * e, y = x + dl[di] * 0.45; dl[di] = y; di = (di + 1) % dl.length; return y; }), 0.3); })()],
    cop_alert: ac => [(() => { const b = bp(900, 3500); return norm(mk(ac, 0.9, t => b(N()) * (t < 0.3 ? 0.9 : 0) * env(t, 0.005, 0.5) + (t > 0.32 && t < 0.38 ? Math.sin(TAU * 1250 * t) * 0.7 : 0) + (t > 0.42 && t < 0.5 ? Math.sin(TAU * 950 * t) * 0.7 : 0) + b(N()) * (t > 0.52 ? 0.35 * Math.exp(-(t - 0.52) / 0.12) : 0)), 0.6); })()],
    arrest: ac => [(() => { const m = bp(2800, 6500), g = lp(300); const click = (tt) => tt < 0 ? 0 : (m(N()) * env(tt, 0.0005, 0.012) + Math.sin(TAU * 3600 * tt) * env(tt, 0.0005, 0.03) * 0.4); return norm(mk(ac, 1.6, t => click(t - 0.15) + click(t - 0.32) * 0.8 + click(t - 0.55) * 0.9 + Math.sin(TAU * 60 * t) * env(t, 0.002, 0.15) * 0.8 + g(N()) * env(t, 0.001, 0.12) * 0.5), 0.85); })()],
    hide: ac => many(2, () => { const g = lp(500); return norm(mk(ac, 0.9, t => Math.sin(TAU * (260 + 240 * t + 20 * Math.sin(TAU * 9 * t)) * t) * Math.sin(Math.PI * Math.min(1, t / 0.7)) * 0.35 + g(N()) * env(t - 0.62, 0.002, 0.08) * (t > 0.62 ? 1 : 0) * 0.7 + Math.sin(TAU * 55 * t) * (t > 0.62 ? env(t - 0.62, 0.002, 0.1) : 0) * 0.6), 0.5); }),
    deliver: ac => [(() => { const g = lp(900); const knock = (tt) => tt < 0 ? 0 : (Math.sin(TAU * 190 * tt) * env(tt, 0.001, 0.05) + g(N()) * env(tt, 0.001, 0.025) * 0.6); return norm(mk(ac, 1.5, t => knock(t - 0.05) + knock(t - 0.32) * 0.9 + knock(t - 0.6) * 0.95 + (t > 1.0 ? bp(2000, 6000)(N()) * env(t - 1.0, 0.0005, 0.01) * 0.6 : 0)), 0.7); })()],
    door: ac => many(2, () => { const g = lp(600); return norm(mk(ac, 1.2, t => Math.sin(TAU * (180 + 90 * Math.sin(TAU * 0.9 * t)) * t) * Math.sin(Math.PI * Math.min(1, t / 1.0)) * 0.3 + g(N()) * env(t - 0.95, 0.002, 0.07) * (t > 0.95 ? 1 : 0) * 0.8), 0.5); }),
    creak: ac => many(3, () => { const f0 = 120 + rnd() * 160, v = 4 + rnd() * 8; return norm(mk(ac, 1.6, t => Math.sin(TAU * (f0 + 60 * t + 12 * Math.sin(TAU * v * t)) * t) * Math.sin(Math.PI * Math.min(1, t / 1.5)) ** 2 * 0.4 + bp(400, 1800)(N()) * Math.sin(Math.PI * Math.min(1, t / 1.5)) ** 3 * 0.08), 0.35); }),
    stinger: ac => [(() => { const g = lp(300); return norm(mk(ac, 2.4, t => (Math.sin(TAU * 61 * t) + Math.sin(TAU * 64.6 * t) + Math.sin(TAU * 92 * t) * 0.6) * env(t, 0.01, 0.9) * 0.5 + g(N()) * env(t, 0.001, 0.4) * 0.5 + bp(1500, 5000)(N()) * env(t, 0.001, 0.06) * 0.6), 0.9); })()],
    drone: ac => [(() => { const g = lp(180); return norm(loopFix(mk(ac, 12, t => (Math.sin(TAU * 41 * t) * 0.5 + Math.sin(TAU * 41.7 * t) * 0.5 + Math.sin(TAU * 82.3 * t) * 0.2 * (0.6 + 0.4 * Math.sin(TAU * t / 6))) * 0.5 + g(N()) * 0.12), 1.5), 0.3); })()],
    thud: ac => many(3, () => { const g = lp(400); return norm(mk(ac, 0.5, t => Math.sin(TAU * (50 + 30 * Math.exp(-t * 20)) * t) * env(t, 0.002, 0.14) + g(N()) * env(t, 0.001, 0.07) * 0.7), 0.9); }),
    hit: ac => many(3, () => { const g = lp(900), h = bp(1200, 4000); return norm(mk(ac, 0.5, t => Math.sin(TAU * (70 + 80 * Math.exp(-t * 30)) * t) * env(t, 0.001, 0.1) + g(N()) * env(t, 0.001, 0.09) * 0.9 + h(N()) * env(t, 0.0005, 0.03) * 0.5), 0.95); }),
    shot: ac => [(() => { const g = lp(2500), l = lp(260), h = bp(900, 6000); let dl = new Float32Array(Math.floor(0.11 * sr)), di = 0; return norm(mk(ac, 1.6, t => { const x = (g(N()) * env(t, 0.0005, 0.04) * 0.9 + h(N()) * env(t, 0.0003, 0.02) * 0.5 + Math.sin(TAU * (60 + 140 * Math.exp(-t * 40)) * t) * env(t, 0.001, 0.12) * 0.9 + l(N()) * env(t, 0.001, 0.35) * 0.4), y = x + dl[di] * 0.5; dl[di] = y; di = (di + 1) % dl.length; return y; }), 0.95); })()],
    whistle: ac => [(() => { return norm(mk(ac, 0.9, t => Math.sin(TAU * (2300 + 120 * Math.sin(TAU * 38 * t)) * t) * Math.sin(Math.PI * Math.min(1, t / 0.8)) ** 0.5 * 0.4), 0.45); })()],
    pain: ac => [(() => { const b = bp(250, 1600); return norm(mk(ac, 1.3, t => (Math.sin(TAU * (150 + 70 * Math.exp(-t * 3) + 8 * Math.sin(TAU * 7 * t)) * t) * 0.5 + b(N()) * 0.4) * Math.sin(Math.PI * Math.min(1, t / 1.1)) ** 0.7), 0.6); })()]
  };
  // Fabrique tous les dossiers qui n'ont pas de fichier fourni. `have(folder)` dit si l'utilisateur a déposé des fichiers.
  G.sfx = { names: Object.keys(GEN), make(ac, folder) { const f = GEN[folder]; if (!f) return null; seed = 1234567 + folder.length * 977; try { return f(ac); } catch (e) { console.warn('[sfx] échec', folder, e); return null; } } };
  G.loaded.push('sfx');
})();
