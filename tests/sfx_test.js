// Les FX générés : tous présents, finis (pas de NaN), ni silencieux ni saturés, durée plausible.
const { launch } = require('./harness');
(async () => {
  const g = await launch({});
  const r = await g.eval(() => { const out = {}, B = G.audio.buffers || {}; for (const n of G.sfx.names) { const list = B[n]; if (!list || !list.length) { out[n] = 'ABSENT'; continue; } let bad = 0, peak = 0, dur = 0; for (const b of list) { const d = b.getChannelData(0); dur = Math.max(dur, b.duration); for (let i = 0; i < d.length; i++) { if (!isFinite(d[i])) bad++; peak = Math.max(peak, Math.abs(d[i])); } } out[n] = { variantes: list.length, dur: +dur.toFixed(2), peak: +peak.toFixed(2), nan: bad }; } return out; });
  let fails = 0; for (const n in r) { const v = r[n]; const ok = v !== 'ABSENT' && v.nan === 0 && v.peak > 0.05 && v.peak <= 1.0001; if (!ok) fails++; console.log(ok ? 'ok ' : 'ÉCHEC', n, JSON.stringify(v)); }
  console.log('erreurs page:', g.errors.length ? g.errors : 'aucune'); await g.close(); process.exit(fails || g.errors.length ? 1 : 0);
})();
