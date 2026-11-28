# BILAN — « Paris 2193 », v28 (28 novembre 2026)

## Ce qui est livré
Un jeu d'horreur à la première personne, dans le navigateur, **complet de bout en bout** : 4 chapitres, 2 fins, ≈ 35-45 min.
- **Histoire** (`docs/HISTOIRE.md`) : Dima, ancien hooligan, élève sa petite sœur Mila (asthmatique). Une clé USB à livrer contient le registre des enfants « prélevés » par le régime ; le nom de Mila y figure. Roman, son ancien frère d'armes, le traque. Fins : « La lumière » (donner la clé) ou « Le prix » (la garder).
- **Chapitres** : 1 Chez nous (appartement, escalier à 4 étages, cour, ruelles) · 2 Le marché (furtivité, 3 patrouilles) · 3 Les toits (parkour : saut, barre de balancement, échelle, saut avec dash ; drone ; flics armés) · 4 Les égouts (vanne, Roman, garage = pièce sûre).
- **Systèmes** : alerte progressive des policiers, cachettes (E), arrestation en 3 temps (lutte), blessures sans barre de vie (2 impacts = mort, boiterie persistante), mort = retour au début du chapitre, sauvegarde validée, journal (Tab), documents à collectionner, option « Assistance », menu Continuer / Nouvelle partie, 23 FX sonores générés par code (musique : fichiers de l'utilisateur dans `audio/music/`).

## Vérifié automatiquement (dossier `tests/`)
`full_run` (partie complète 1→4 avec les vraies transitions), bots des 4 chapitres, enchaînement, tirs/blessures, barres/échelles, Roman (équité), état après mort/arrestation, sauvegarde piégée, sons, journal, performances (≤ 274 appels de dessin, ≤ 61 000 triangles), simulation des policiers.
**3 revues par sous-agents** (sécurité : 0 critique/moyen ; logique et cas limites : 3 + 7 défauts graves corrigés).
**Sécurité** : aucun accès réseau au lancement (three.js intégré), CSP, textContent partout, sauvegarde et manifeste audio validés, serveur local anti-rebinding.

## Limites connues (honnêtes)
- **Je n'ai jamais vu le jeu tourner en vrai** : tout vient de tests automatiques et de captures dans un navigateur sans carte graphique. Le ressenti (peur, attachement, rythme), la lisibilité en lumière réelle et l'effet des sons générés restent à valider par le joueur.
- **Difficulté de la furtivité au marché** non mesurable par bot (ils jouent mal) : l'option « Assistance » existe pour régler.
- **Policiers = stickmen provisoires** ; le modèle 3D (Quaternius, `assets/models/README.md`) est prêt à brancher mais pas téléchargé (hôtes bloqués dans mon environnement).
- Pas de monde en grille ni d'inventaire/objets multiples, de mode deal/commerce, de cyberespace : prévus (CLAUDE.md, backlog), non construits.

## Pour reprendre
Lire `CLAUDE.md` (état du 28/11), `docs/PLAN-24H.md` (journal), lancer `python3 build.py` puis `node tests/full_run.js` après toute modification de gameplay.
