// Régressions trouvées par la revue : flics armés du ch3 après une mort, caméra penchée, bandes de cachette, minuteurs annulés, boiterie après arrestation.
const { launch } = require('./harness');
(async () => {
  const g = await launch({});
  const r = await g.eval(async () => {
    const out = {}, P = G.P, sleep = ms => new Promise(r => setTimeout(r, ms));
    G.clearZone(); G.buildChapter(3); G.placeStart(); G.frozen = false;
    out.yBefore = G.cops.map(c => c.y); G.die(); await sleep(1300); out.yAfter = G.cops.map(c => c.y); out.deadCleared = !G.dead;
    // état de caméra et bandes noires nettoyés au changement de chapitre
    P.animRoll = 0.5; P.animPitch = -0.2; const slit = document.getElementById('slit'); slit.style.display = 'block'; G.docOpen = false;
    G.clearZone(); G.buildChapter(2); G.placeStart(); out.roll = P.animRoll; out.slit = slit.style.display;
    // minuteur lié au chapitre : annulé par un redémarrage
    let fired = false; G.later(() => { fired = true; }, 300); G.resetLevel(); await sleep(500); out.timerCancelled = !fired;
    // boiterie : une arrestation ramène à l'état du début du chapitre
    G.chapterLimpStart = false; G.limp = true; G.flag('wounded', true); G.resetLevel(); out.limpAfterReset = G.limp; out.woundedFlag = G.flag('wounded');
    // arrestation ignorée pendant la mort
    G.dead = true; const c = G.cops[0]; P.pos.set(c.x + 0.5, 0, c.z); c.state = 'chase'; c.alert = 1; G.updateCops(0.05); out.noArrestWhileDead = !G.arrest; G.dead = false;
    return out;
  });
  console.log(JSON.stringify(r)); console.log('erreurs:', g.errors.length ? g.errors : 'aucune');
  const ok = r.yBefore.length === 2 && r.yAfter[0] === 9 && r.yAfter[1] === 15 && r.deadCleared && r.roll === 0 && r.slit === 'none' && r.timerCancelled && r.limpAfterReset === false && r.woundedFlag === false && r.noArrestWhileDead && !g.errors.length;
  console.log(ok ? 'ÉTAT : OK' : 'ÉTAT : ÉCHEC'); await g.close(); process.exit(ok ? 0 : 1);
})();
