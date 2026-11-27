# PLAN 24 H — finir le jeu (démarré le 2026-11-27 ~15:30 UTC, fin visée le 2026-11-28 ~15:30 UTC)

Règle d'or (leçon de la pause) : **petites étapes, vérifiées à l'écran (captures en vraie lumière) + tests auto, jamais de gros lot non vérifié.** Chaque étape = commit + republication de l'Artifact + une ligne dans ce fichier. Rien de « bordel » : peu d'éléments, bien placés, circulation libre.

## Définition de « fini » (acceptation)
- Menu -> 4 chapitres enchaînés -> 2 fins -> écran de fin ; ≈ 35-45 min de jeu.
- Jamais bloqué : chaque chapitre a un test auto qui parcourt le chemin (bot) et vérifie : pas de plantage, pas de coincement, objectifs atteignables, retour au début OK.
- Flics fiables : aucun « téléport », aucun coincement (test de simulation 5 min / chapitre), apparition seulement depuis des lieux plausibles.
- Sauvegarde (chapitre atteint, collectibles, réglages) dans localStorage, validée à la lecture.
- Sécurité : aucune dépendance réseau au lancement (three.js intégré), CSP, pas d'eval/innerHTML avec données externes, sauvegarde validée.
- Perf : 60 fps sur PC moyen (tests de budget : dessin <= ~300 appels, mémoire), réglage de qualité.
- Son : tous les points d'accroche prévus (dossiers audio/), jeu complet même sans fichiers (légendes).

## Décisions de l'utilisateur (réponses aux questions de reprise)
- **Son** : je crée les FX (pas, respiration, cœur, portes, ambiance, sirènes...) **par code (Web Audio)** ; l'utilisateur fournira la MUSIQUE (dossier audio/music/). Ses fichiers FX éventuels remplacent les miens.
- **Mort / arrestation** : **retour au début du CHAPITRE** (instantané, histoire et objets trouvés conservés).
- **Violence** : **viscérale, réaliste, façon Outlast 2**.
- **Combat** : **aucune arme pour le joueur, jamais.** Fuite, cachettes, esquive, parkour. Les flics armés tirent (3 balles, 2 impacts = mort).

## Jalons (heures depuis le début)
- [~] **H0-2 Fondations & triage** (fait : three.js local, CSP, sauvegarde validée + test, chambre refaite sobre avec Mila/dessins/mots/veilleuse, halo de lampe des flics, banc d'essai tests/ ; reste : écran de chapitre/G.chapters, bot de parcours, test des flics) : corriger la chambre (lit/porte, câbles), flics (test de simulation), three.js local + CSP, système de sauvegarde, structure « chapitres » (G.chapters), écran de chapitre, objectifs.
- [x] **H2-5 Chapitre 1 fini** (fait : chapitres/zones déchargées, voisine, corps, mots/dessins, bot `tests/chapter1_bot.js` OK) : appartement sobre (dessins de Mila, mot, 6 collectibles max), escalier gardé, voisin, cour, ruelles ; narration (dictaphone) ; test bot.
- [~] **H5-9 Chapitre 2 « Le marché »** (fait : carte, étals, 3 patrouilles, Samuel/coup de feu, grille + boucle nord, Roman au loin, sortie ; bot OK ; reste : réglage de la furtivité, captures, Roman poursuivant) : plan ASCII (à ma charge), étals, patrouilles x3, Roman (apparition scriptée), cachettes ; test bot.
- [x] **H9-13 Chapitre 3 « Les toits »** (fait : 5 toits, saut/barre/échelle/saut avec dash, drone-projecteur, 2 flics armés avec fenêtre de rechargement, terminal du registre ; bot `tests/chapter3_bot.js` OK ; blessures `js/health.js`, barres/échelles `js/parkour2.js`) : parkour (sauts/murs/barres), drone, flics armés (3 balles, 2 impacts = mort, étourdissement), le registre ; test bot.
- [x] **H13-17 Chapitre 4 « Égouts & garage »** (fait : égouts, volant + vanne + grille, Roman tueur (conduit), garage = pièce sûre, Léna, Mila, 2 fins ; bot `tests/chapter4_bot.js` OK) : poursuite de Roman, pièce sûre, voiture, 2 fins ; test bot.
- [ ] **H17-21 Finition** : menu, options, accessibilité, **FX sonores générés par code (moteur Web Audio, à commencer dès que possible : peur = son)**, perf, effets de peur (écran, souffle, cœur), écran de fin/crédits.
- [ ] **H21-24 Recette** : QA complète, revue sécurité, correction des bugs, publication finale, CLAUDE.md à jour.

## Organisation (agents)
- Tâche récurrente (toutes les heures, dans cette session) : « lire ce plan, faire le prochain jalon, tester, commiter, publier, cocher ».
- Sous-agents ponctuels : revue de code / QA / sécurité à la fin de chaque chapitre (jamais d'édition parallèle du même fichier).

## Journal
- 2026-11-27 15:30 : plan + histoire écrits.
- 2026-11-27 16:05 : fondations posées (three.js intégré, CSP, sauvegarde + test, banc d'essai `tests/`), chambre sobre (lit hors de la porte, plus de câbles), Mila dort, 3 dessins + 2 mots + veilleuse ; flics : pas de téléportation en simulation, halo de lampe visible de loin.
- 2026-11-27 17:10 : questions posées -> réponses notées. Moteur de FX sonores par code (`js/sfx.js`, 23 sons, test `tests/sfx_test.js`), branchés dans audio.js (remplacés par tes fichiers s'il y en a). Reste à brancher : portes, grincements, stingers dans les chapitres.
- 2026-11-27 18:30 : chapitres 1 et 2 jouables et chaînés (`tests/chapters_flow.js`), bots OK, sauvegarde de la progression. Prochain : blessures/flics armés, barres + escalade, chapitre 3.
- 2026-11-27 20:00 : chapitre 3 jouable (bot OK), tirs/blessures testés, barres + échelles testées. Prochain : chapitre 4 (égouts, vanne, Roman, garage, 2 fins).
- 2026-11-27 21:00 : les 4 chapitres + 2 fins sont jouables (bots OK). Menu : continuer / nouvelle partie (outils de dev cachés, #dev). Reste : recette (captures des chapitres 3-4, test de chaîne 1->4, perf, équité de la poursuite de Roman, revue de sécurité par sous-agent), finitions (pause/options, accessibilité, gore, sons accrochés).
- 2026-11-27 22:00 : revues par 2 sous-agents (sécurité : 0 critique/moyen, 6 faibles corrigés ; logique : 3 graves + mineurs corrigés — flics armés du ch3 après mort, caméra penchée, touche E sans garde, minuteurs `G.later` liés au chapitre, fin du jeu). Test de régression `tests/reset_state_test.js`. Reste : équité de Roman, finitions (pause/options, accessibilité), recette finale.
