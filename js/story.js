/* =====================================================================
   story.js : l'HISTOIRE côté jeu. Sauvegarde validée (chapitre, objets trouvés, drapeaux, morts), documents à lire (dessins de Mila, mots),
   cartes de chapitre. Aucune donnée externe n'est jamais insérée comme HTML : uniquement textContent.
   ===================================================================== */
(function () {
  'use strict';
  const G = window.G, T = G.T, KEY = 'paris2193.save', ID = /^[a-z0-9_]{1,32}$/;
  G.save = { chapter: 1, collect: [], flags: Object.create(null), deaths: 0 };
  G.loadSave = function () {                                   // lecture VALIDÉE : on ne fait jamais confiance à ce qui vient du stockage
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || 'null'); if (!raw || typeof raw !== 'object') return;
      const c = Number(raw.chapter); if (Number.isInteger(c) && c >= 1 && c <= 4) G.save.chapter = c;
      if (Array.isArray(raw.collect)) G.save.collect = [...new Set(raw.collect.filter(x => typeof x === 'string' && ID.test(x)))].slice(0, 64);
      if (raw.flags && typeof raw.flags === 'object') for (const k of Object.keys(raw.flags)) if (k !== '__proto__' && ID.test(k) && typeof raw.flags[k] === 'boolean') G.save.flags[k] = raw.flags[k];
      const d = Number(raw.deaths); if (Number.isInteger(d) && d >= 0 && d < 1e6) G.save.deaths = d;
    } catch (e) { /* sauvegarde illisible : on repart de zéro */ }
  };
  G.writeSave = function () { try { localStorage.setItem(KEY, JSON.stringify(G.save)); } catch (e) { /* pas grave */ } };
  G.resetSave = function () { G.save = { chapter: 1, collect: [], flags: Object.create(null), deaths: 0 }; G.writeSave(); };
  G.flag = function (k, v) { if (!ID.test(k)) return false; if (v === undefined) return !!G.save.flags[k]; G.save.flags[k] = !!v; G.writeSave(); return !!v; };

  // --- Lecture d'un document : le jeu est en pause, E ou Entrée pour fermer ---
  G.docOpen = false;
  let box = null;
  function ensureBox() {
    if (box) return box;
    box = document.createElement('div');
    box.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);max-width:min(34rem,86vw);padding:1.4rem 1.6rem;background:rgba(8,10,10,.93);border:1px solid #2a3132;color:#b4bcbc;font:1rem/1.55 "Courier New",monospace;z-index:30;display:none;white-space:pre-wrap';
    const h = document.createElement('div'); h.style.cssText = 'letter-spacing:.25em;color:#c9d3cc;margin-bottom:.8rem;font-size:.85rem'; h.id = 'doc-t';
    const b = document.createElement('div'); b.id = 'doc-b';
    const f = document.createElement('div'); f.style.cssText = 'margin-top:1rem;color:#626b6c;font-size:.75rem'; f.textContent = '[E] fermer';
    box.append(h, b, f); box.addEventListener('click', () => G.closeDoc()); document.body.appendChild(box); return box;
  }
  G.readDoc = function (title, text) { const b = ensureBox(); b.querySelector('#doc-t').textContent = String(title).slice(0, 80); b.querySelector('#doc-b').textContent = String(text).slice(0, 900); b.style.display = 'block'; G.docOpen = true; };
  G.closeDoc = function () { if (box) box.style.display = 'none'; G.docOpen = false; };
  addEventListener('keydown', e => { if (G.docOpen && (e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Escape')) { e.stopImmediatePropagation(); e.preventDefault(); G.closeDoc(); } }, true);

  // Objet à collectionner : on le lit, on le garde (sauvegarde), le jeu est en pause pendant la lecture
  G.collect = function (id, title, text) {
    if (ID.test(id) && !G.save.collect.includes(id)) { G.save.collect.push(id); G.writeSave(); }
    G.readDoc(title, text);
  };

  // --- Carte de chapitre : grand texte qui apparaît puis s'efface ---
  G.chapterCard = function (num, name) {
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:7;pointer-events:none;opacity:0;transition:opacity 1.6s;color:#c9d3cc;letter-spacing:.45em;font:1.1rem "Courier New",monospace;text-align:center';
    const a = document.createElement('div'); a.textContent = 'CHAPITRE ' + num; a.style.cssText = 'color:#626b6c;font-size:.8rem;margin-bottom:.8rem';
    const b = document.createElement('div'); b.textContent = String(name).toUpperCase(); b.style.fontSize = 'clamp(1.2rem,3.4vw,2rem)';
    d.append(a, b); document.body.appendChild(d);
    requestAnimationFrame(() => { d.style.opacity = 1; }); setTimeout(() => { d.style.opacity = 0; }, 3200); setTimeout(() => d.remove(), 5200);
  };

  // --- ZONES / CHAPITRES : un seul chapitre est chargé à la fois (le précédent est vidé de la mémoire) ---
  G.chapters = {
    1: { name: 'Chez nous', build() { G.buildLevel1(); } }
  };
  G.currentChapter = 0; G.epoch = 0;
  // Minuteur lié au chapitre : annulé si on change de chapitre ou si on recommence (mort/arrestation)
  G.later = function (fn, ms) { const e = G.epoch; return setTimeout(() => { if (e === G.epoch) fn(); }, ms); };
  G.cleanPlayerState = function () { const P = G.P; if (P) { P.animRoll = P.animPitch = P.animDip = P.kickP = P.kickR = 0; } const s = document.getElementById('slit'); if (s) s.style.display = 'none'; if (G.closeDoc) G.closeDoc(); };
  // Déclencheurs d'événements (scènes scriptées) : test(P) vrai -> fire() une seule fois ; réarmés quand on recommence le chapitre
  G.triggers = [];
  G.addTrigger = function (test, fire) { const t = { test, fire, done: false }; G.triggers.push(t); G.onReset.push(() => { t.done = false; if (t.reset) t.reset(); }); return t; };
  G.updateTriggers = function () { for (const t of G.triggers) if (!t.done && t.test(G.P)) { t.done = true; t.fire(); } };
  G.clearZone = function () {                                    // vide tout ce qui appartient au chapitre en cours
    const sc = G.scene, shared = new Set(Object.values(G.mat || {})), done = new Set();
    sc.traverse(o => {                                                     // libère la mémoire graphique du chapitre (les matières communes G.mat restent)
      if (o.geometry) o.geometry.dispose();
      const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
      for (const m of ms) { if (shared.has(m) || done.has(m)) continue; done.add(m); if (m.map) m.map.dispose(); m.dispose(); }
    });
    for (const c of sc.children.slice()) sc.remove(c);
    G.lamps.length = 0; G.interactables.length = 0; G.animated.length = 0; G.onReset.length = 0; if (G.hides) G.hides.length = 0; if (G.cops) G.cops.length = 0; if (G.triggers) G.triggers.length = 0;
    if (G.clearParkour) G.clearParkour(); G.epoch++; G.cleanPlayerState(); G.dead = false; G.killY = undefined; G.fogOverride = undefined; G.drone = null; G.navGrid = null; G.hidden = null; G.focus = null; G.arrest = null; G.alert = 0; G.have = []; G.clearColliders();
  };
  G.buildChapter = function (n) { G.buildBase(); G.chapters[n].build(); G.currentChapter = n; G.limp = G.flag('wounded'); G.chapterLimpStart = G.limp; if (G.resetHealth) G.resetHealth(); };   // la boiterie PERSISTE d'un chapitre à l'autre
  // Passage d'un chapitre à l'autre : fondu au noir, on décharge, on charge, fondu d'ouverture, carte de chapitre
  G.loadChapter = function (n) {
    const f = document.getElementById('fade'); G.frozen = true;
    if (f) { f.style.transition = 'opacity 0.9s'; f.style.opacity = 1; }
    setTimeout(() => {
      G.clearZone(); G.buildChapter(n); G.placeStart(); G.completed = false; G.frozen = false; G.save.chapter = n; G.writeSave();
      if (f) { f.style.transition = 'opacity 1.4s'; f.style.opacity = 0; }
      G.chapterCard(n, G.chapters[n].name); if (G.objective) setTimeout(() => G.say(G.objective, 6000), 5000);
    }, 1000);
  };
  G.completeChapter = function (n) {
    if (G.completed) return; G.completed = true; G.frozen = true;
    const f = document.getElementById('fade'); if (f) { f.style.transition = 'opacity 1.2s'; f.style.opacity = 1; }
    const fx = G.audio && G.audio.fx; if (fx) fx('deliver', 1);
    if (G.chapters[n + 1]) { G.save.chapter = n + 1; G.writeSave(); setTimeout(() => { G.loadChapter(n + 1); }, 1500); }
    else setTimeout(() => { if (G.endLevelScreen) G.endLevelScreen('À SUIVRE', 'la suite arrive · cliquer pour rejouer le chapitre'); }, 1500);
  };

  // --- FINS : écran noir, quelques lignes qui apparaissent une à une, statistiques, retour au menu au clic ---
  const ENDINGS = {
    a: { title: 'FIN — LA LUMIÈRE', lines: ['Léna branche la clé. Sur toutes les ondes de la ville, une liste de noms se met à défiler.', 'Au matin, les filtres se vident. Les fenêtres s\'allument, une à une.', 'Mila dort sur la banquette arrière. Sa veilleuse est toujours allumée.'] },
    b: { title: 'FIN — LE PRIX', lines: ['Tu gardes la clé. Elle ne vaut qu\'une chose : une vie contre une vie.', 'Le moteur au biodiesel tousse. Paris glisse derrière la vitre, sans un bruit.', 'Dans ta poche, la liste. Les autres noms attendent.'] }
  };
  G.showEnding = function (kind) {
    const E = ENDINGS[kind]; if (!E || G.ended) return; G.ended = true; G.frozen = true; G.flag('ending_' + kind, true); try { document.exitPointerLock(); } catch (e) {}
    const d = document.createElement('div'); d.style.cssText = 'position:fixed;inset:0;background:#000;z-index:40;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1.2rem;color:#b4bcbc;font:1rem/1.7 "Courier New",monospace;text-align:center;padding:2rem;opacity:0;transition:opacity 2s';
    document.body.appendChild(d); requestAnimationFrame(() => { d.style.opacity = 1; });
    const add = (txt, delay, css) => setTimeout(() => { const p = document.createElement('div'); p.textContent = txt; p.style.cssText = 'max-width:34rem;opacity:0;transition:opacity 1.8s;' + (css || ''); d.appendChild(p); requestAnimationFrame(() => { p.style.opacity = 1; }); }, delay);
    E.lines.forEach((t, i) => add(t, 2500 + i * 4200));
    const t1 = 2500 + E.lines.length * 4200;
    add(E.title, t1 + 800, 'letter-spacing:.4em;color:#c9d3cc;font-size:1.3rem;margin-top:1.5rem');
    const found = G.save.collect.length;
    add('Documents trouvés : ' + found + '   ·   Morts : ' + G.save.deaths, t1 + 3000, 'color:#626b6c;font-size:.8rem');
    add('[ cliquer pour revenir au menu ]', t1 + 5000, 'color:#626b6c;font-size:.8rem;cursor:pointer');
    setTimeout(() => { d.style.cursor = 'pointer'; d.addEventListener('click', () => { G.resetSave(); location.reload(); }); }, t1 + 5000);
  };
  G.loaded.push('story');
})();
