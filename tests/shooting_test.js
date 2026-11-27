// Flics armés : 3 balles puis rechargement ; 1er impact = douleur + boiterie ; 2e impact = mort puis retour au début ; les tirs ratés ne blessent pas.
const { launch } = require('./harness');
(async () => {
  const g = await launch({});
  const r = await g.eval(async () => {
    const out = {}, P = G.P, c = G.cops[0]; G.cops.length = 1; G.frozen = true;
    const realRandom = Math.random;
    function setup() { G.resetHealth(); G.dead = false; G.completed = false; G.arrest = null; G.resetCops(); c.armed = true; c.ammo = undefined; c.reloadT = 0; c.aimT = 0; c.fireCD = 0; P.pos.set(c.x + 7, 0, c.z); P.safe.copy(P.pos); P.h = 1.75; G.frozen = false; G.keys = {}; c.state = 'chase'; c.alert = 1; c.last = [P.pos.x, P.pos.z]; }
    // 1) tous les tirs manquent
    Math.random = () => 0.999; setup(); let shots = 0; const sh0 = G.wounds;
    for (let t = 0; t < 20 / 0.05; t++) { G.updateCops(0.05); if (c.ammo === 0) break; } out.missAmmo = c.ammo; out.missWounds = G.wounds - sh0; out.reloading = c.reloadT > 0;
    // 2) tous les tirs touchent : 1er impact
    Math.random = () => 0; setup(); G.shotLuck = 5; let firstHit = false;
    for (let t = 0; t < 20 / 0.05 && G.wounds < 1; t++) { G.updateCops(0.05); G.updateHealth(0.05); }
    out.afterFirst = { wounds: G.wounds, painT: +G.painT.toFixed(1), limp: G.limp, scale: +G.moveScale().toFixed(2), flag: G.flag('wounded') };
    // 3) 2e impact = mort puis retour au début du chapitre
    for (let t = 0; t < 20 / 0.05 && !G.dead && G.wounds < 2; t++) { G.updateCops(0.05); G.updateHealth(0.05); }
    out.dead = G.dead || G.wounds >= 2; await new Promise(r => setTimeout(r, 1300));
    out.afterDeath = { wounds: G.wounds, dead: G.dead, pos: [P.pos.x, P.pos.y, P.pos.z].map(v => +v.toFixed(1)), frozen: G.frozen, deaths: G.save.deaths };
    Math.random = realRandom; G.shotLuck = 1; return out;
  });
  console.log(JSON.stringify(r)); console.log('erreurs:', g.errors.length ? g.errors : 'aucune');
  const ok = r.missAmmo === 0 && r.missWounds === 0 && r.reloading && r.afterFirst.wounds === 1 && r.afterFirst.painT > 5 && r.afterFirst.limp && r.afterFirst.scale === 0.55 && r.dead && r.afterDeath.wounds === 0 && !r.afterDeath.dead && r.afterDeath.pos[1] === 12 && !g.errors.length;
  console.log(ok ? 'TIRS : OK' : 'TIRS : ÉCHEC'); await g.close(); process.exit(ok ? 0 : 1);
})();
