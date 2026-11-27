// Captures à des positions données. Usage : node tests/shots.js <préfixe> <ambiance 0..1> "nom:x,y,z,yaw,pitch;nom2:..."   (yaw 0 = regarde vers -z)
const { launch } = require('./harness');
(async () => {
  const [prefix, amb, spec] = [process.argv[2] || 'shot', parseFloat(process.argv[3] || '0'), process.argv[4] || ''];
  const g = await launch({ w: 960, h: 540 });
  if (process.env.CHAPTER) await g.eval((n) => { G.clearZone(); G.buildChapter(n); G.placeStart(); }, parseInt(process.env.CHAPTER));
  await g.eval((amb) => { G.cops.length = 0; G.frozen = false; if (amb > 0) G.scene.add(new THREE.AmbientLight(0xffffff, amb)); }, amb);
  for (const part of spec.split(';').filter(Boolean)) {
    const [name, v] = part.split(':'); const [x, y, z, yaw, pitch] = v.split(',').map(Number);
    await g.eval(([x, y, z, yaw, pitch]) => { const P = G.P; P.pos.set(x, y, z); P.safe.set(x, y, z); P.yaw = yaw; P.pitch = pitch || 0; G.keys = {}; P.vx = P.vz = P.vy = 0; }, [x, y, z, yaw, pitch]);
    await g.page.waitForTimeout(900); await g.shot(process.env.SHOTDIR + '/' + prefix + '_' + name + '.png');
  }
  console.log('erreurs:', g.errors.length ? g.errors : 'aucune'); await g.close();
})();
