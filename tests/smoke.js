// Test de fumée : le jeu se charge, le joueur existe, aucune erreur, pas de réseau.
const { launch } = require('./harness');
(async () => {
  const g = await launch({ mode: process.argv[2] || 'play' });
  const r = await g.eval(() => ({ pos: [G.P.pos.x, G.P.pos.y, G.P.pos.z].map(v => +v.toFixed(2)), cops: G.cops.length, colliders: G.colliders ? G.colliders.length : -1, draw: G.renderer ? G.renderer.info.render.calls : -1, tris: G.renderer ? G.renderer.info.render.triangles : -1 }));
  console.log(JSON.stringify(r)); console.log('erreurs:', g.errors.length ? g.errors : 'aucune');
  await g.close(); process.exit(g.errors.length ? 1 : 0);
})();
