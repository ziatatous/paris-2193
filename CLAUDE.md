# CLAUDE.md — Paris 2193 (titre provisoire)

> Ce fichier est la mémoire du projet. Le relire à chaque session, le mettre à jour à chaque décision.

## CONTEXTE
Jeu vidéo 3D en première personne avec **Godot 4 (GDScript)**. Pas d'artiste, peu de temps : tout passe par du **code, des primitives et des assets gratuits**. L'utilisateur est étudiant en informatique (ASIR), **débutant en dev de jeux** : expliquer simplement ce qui est fait, étape par étape. Langue de travail : français.

## VISION
Horreur / cyberpunk sombre, an 2193, Paris. Monde sale et rafistolé, peu d'évolution malgré la cybernétique. Plus de pétrole, seul le biodiesel tient (voitures défoncées, mécanique). Les oiseaux ne se mangent plus. Régime autoritaire, net rempli d'IA sombres. Ambiance Russie / Europe sombre et crade, ruelles, urbex, armes anciennes et cinétiques, vieux hacking.
Inspirations : Futu.re (Glukhovsky), Neuromancer (cyberespace vectoriel), Silent Hill (peur lente : brouillard, son, hors-champ), Straftat (mouvement rapide et chaotique).
Ressenti : **peur ET liberté**. Horreur viscérale / gore mais ancrée dans le réel (conséquences, blessures qui restent, corps retrouvés, retenue plutôt que spectacle).

## PERSONNAGE
Ancien hooligan d'origines mixtes, passé par le racisme puis redressé. Passé de rue, parkour, habitué à fuir la police. Son passé peut revenir (anciens camarades).

## BOUCLE DE JEU (cible long terme)
Runs courtes (5-10 min) : sortir de l'appart, marcher dans la rue, récupérer une vieille clé USB (le « colis »), fuir, se cacher, rentrer au garage (hub = voiture au biodiesel).
- Ennemis : flics (alerte progressive, nasses, cordons, drones, sorties qui se ferment) et gangs (territoire, embuscades, armes anciennes). Ennemis rapides.
- Parkour FPS : course, saut, accroche, glissade. Fuite par toits, égouts, urbex.
- Se cacher (casser la ligne de vue) ou courir direct.
- Clés USB : on en porte plusieurs, contenu inconnu sauf ce que le jeu révèle. Fragiles (s'abîment), cachables. Des fragments d'info se débloquent et révèlent des choses étranges.
- Début calme (marche tranquille), puis tension. Première scène de peur : un corps retrouvé dans une ruelle.

## STYLE VISUEL (peu d'art, beaucoup d'ambiance)
- Low-poly façon PS1 : textures pixélisées (filtrage nearest), basse résolution de rendu, éventuellement vertex snapping et dithering.
- Brouillard épais, très peu de lumière, néons qui grésillent, silhouettes.
- Décor par code avec primitives (boîtes, plans) + textures procédurales ou gratuites.
- Aucun HUD lourd.
- Le son compte énormément : pas, respiration, sirènes lointaines, silence soudain, ambiance. Sons gratuits ou générés.
- Assets gratuits autorisés plus tard : Kenney, Quaternius, itch.io, CC0.

## PREMIER OBJECTIF (prototype uniquement)
Une scène jouable : ruelle sombre avec brouillard, néons qui grésillent, un corps au sol, sons d'ambiance. Déplacement FPS (souris, déplacement, sprint, saut, collisions). **Rien d'autre.**

## NE PAS FAIRE POUR L'INSTANT
Monde ouvert, économie, dealing, cyberespace, implants, combat, histoire détaillée. Ne rien construire de tout ça tant que le prototype n'est pas validé.

## BACKLOG (dans l'ordre, plus tard)
1. Fuite : un flic qui me poursuit, cachettes, parkour de base, clé USB à livrer.
2. Hub : garage/voiture, sac à dos, argent, achats chez des dealers (armes, stimulants, cigarettes, café), collectibles (briquets, clippers, zippos collector).
3. Le net : plongée en vecteurs façon Neuromancer. Barre de GLACE (ICE) : nombre limité d'attaques supportées avant dégâts physiques/thermiques. Bains de glaçons comme investissement. Programmes créés/testés par le joueur.
4. Implants (visée, accélération), dealing, fournisseurs, programmes illicites sur disques/USB, gangs, histoire.

## MÉTHODE
- Petites étapes testables. Après chaque étape : ce qui a été fait, comment tester, ce que l'utilisateur doit rapporter (capture/description) — **Claude ne voit pas le jeu tourner** (et Godot n'est pas installé dans l'environnement cloud).
- Code simple et commenté, scènes/scripts clairs.
- Commit git à chaque étape qui marche.
- Choix important (architecture, outil) : proposer 2 options et en recommander une.

## DÉCISIONS PRISES
- Godot 4.x, GDScript. Renderer **Forward+/Mobile non imposé** : on vise `gl_compatibility` pour la compatibilité large (PC modestes) — à revoir si besoin.
- Structure : `scenes/` (.tscn), `scripts/` (.gd). Scènes construites au maximum **par code** (peu de fichiers .tscn à écrire à la main, moins d'erreurs sans éditeur).
- Contrôles : ZQSD (AZERTY, via touches physiques) + souris, Shift sprint, Espace saut, Échap libère la souris.

## ÉTAPES
- [x] Étape 1 — Projet + joueur FPS dans une salle de test.
- [ ] Étape 2 — Ruelle (primitives, textures procédurales nearest, rendu basse résolution PS1).
- [ ] Étape 3 — Brouillard, lumière faible, néons qui grésillent.
- [ ] Étape 4 — Le corps au sol.
- [ ] Étape 5 — Sons d'ambiance (générés par code) + pas.
