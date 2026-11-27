// Budget de dessin par chapitre : appels de dessin, triangles, géométries et textures en mémoire, temps de construction.
const { launch } = require('./harness');
(async () => {
  const g = await launch({});
  const r = await g.eval(async () => {
    const out = {}; G.cops.length = 0; G.renderer.info.autoReset = false;
    for (const n of [1, 2, 3, 4]) {
      const t0 = performance.now(); G.clearZone(); G.buildChapter(n); G.placeStart(); const build = performance.now() - t0;
      G.frozen = true; G.renderer.info.reset(); for (let i = 0; i < 1; i++) { G.updateCamera(0.016, i * 0.016); G.updateLamps(0.016, i * 0.016); G.render(i * 0.016); }
      const i = G.renderer.info; out['ch' + n] = { buildMs: Math.round(build), calls: i.render.calls, tris: i.render.triangles, geos: i.memory.geometries, tex: i.memory.textures, colliders: G.colliders.length, lamps: G.lamps.length, objects: G.scene.children.length };
    }
    return out;
  });
  let fails = 0;
  for (const k in r) { const v = r[k]; const ok = v.calls <= 600 && v.tris <= 900000; if (!ok) fails++; console.log(ok ? 'ok ' : 'LOURD', k, JSON.stringify(v)); }
  console.log('erreurs:', g.errors.length ? g.errors : 'aucune'); await g.close(); process.exit(fails || g.errors.length ? 1 : 0);
})();
