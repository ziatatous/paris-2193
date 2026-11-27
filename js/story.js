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
      if (Array.isArray(raw.collect)) G.save.collect = raw.collect.filter(x => typeof x === 'string' && ID.test(x)).slice(0, 64);
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
  G.loaded.push('story');
})();
