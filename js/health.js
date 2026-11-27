/* =====================================================================
   health.js : BLESSURES (pas de barre de vie). Dima n'a aucune arme. 2 impacts = mort.
   1er impact : étourdissement bref, vision qui s'assombrit (douleur), mouvement réduit un moment ; la boiterie RESTE ensuite (conséquence).
   2e impact : mort -> retour au début du chapitre.
   Les policiers ARMÉS (cops.js) tirent : 3 balles dans le chargeur, puis rechargement (c'est ta fenêtre pour fuir).
   ===================================================================== */
(function () {
  'use strict';
  const G = window.G, T = G.T;
  G.wounds = 0; G.painT = 0; G.limp = false;
  let ov = null;
  function overlay() {
    if (ov) return ov;
    ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:4;opacity:0;transition:opacity .25s;background:radial-gradient(ellipse at center, rgba(0,0,0,0) 12%, rgba(30,0,0,.55) 55%, rgba(8,0,0,.96) 100%)';
    document.body.appendChild(ov); return ov;
  }
  // Vitesse de déplacement : réduite pendant la douleur (-45 %), puis boiterie permanente légère (-8 %)
  G.moveScale = function () { return G.painT > 0 ? 0.55 : (G.limp ? 0.92 : 1); };
  G.hurt = function (from) {
    if (G.arrest || G.dead || G.completed || G.frozen) return;
    if (G.hurtCD > 0) return; G.hurtCD = 0.6; G.wounds++;
    const P = G.P, f = G.audio && G.audio.fx;
    if (f) { f('hit', 1); setTimeout(() => f('pain', 0.9), 120); }
    if (G.wounds >= 2) { G.die(); return; }
    G.painT = 7; G.limp = true; P.stunT = Math.max(P.stunT || 0, 0.5); P.kickP = -0.12; P.kickR = (Math.random() - 0.5) * 0.3;
    if (G.flag) G.flag('wounded', true);
    G.say('Une brûlure dans la jambe. Ça saigne. Continue de bouger.', 3500);
    overlay().style.opacity = 1;
  };
  G.die = function () {
    if (G.dead) return; G.dead = true; G.frozen = true; const P = G.P; P.vx = P.vz = 0;
    const f = document.getElementById('fade'); if (f) { f.style.transition = 'opacity 0.3s'; f.style.opacity = 1; }
    overlay().style.opacity = 1;
    setTimeout(() => { G.dead = false; G.wounds = 0; G.painT = 0; G.limp = !!G.chapterLimpStart; if (G.flag) G.flag('wounded', G.limp); overlay().style.opacity = 0; (G.resetLevel || function () {})(); }, 900);
  };
  G.updateHealth = function (dt) {
    if (G.hurtCD > 0) G.hurtCD -= dt;
    if (G.painT > 0) { G.painT -= dt; if (G.painT <= 0 && ov) ov.style.opacity = 0.35; }             // la douleur retombe, un voile reste
  };
  G.resetHealth = function () { G.wounds = 0; G.painT = 0; if (ov) ov.style.opacity = 0; };
  G.loaded.push('health');
})();
