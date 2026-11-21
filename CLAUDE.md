# CLAUDE.md — Paris 2193 (titre provisoire)

> Ce fichier est la mémoire du projet. Le relire à chaque session, le mettre à jour à chaque décision.

## CONTEXTE
Jeu vidéo 3D en première personne, **dans le navigateur : JavaScript + Three.js r128 + Web Audio** (le prototype Godot initial est archivé dans `godot-archive/`). Pas d'artiste, peu de temps : tout passe par du **code, des primitives et des assets gratuits**. L'utilisateur est étudiant en informatique (ASIR), **débutant en dev de jeux** : expliquer simplement ce qui est fait, étape par étape. Langue de travail : français.

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

## STRUCTURE DU CODE (v3) — à lire en premier
- `index.html` : **menu** (JOUER / OPTIONS : qualité, sensibilité, volume) + chargeur. Le jeu ne se charge qu'après « JOUER ». Pas de modules ES (double-clic possible).
- `js/core.js` (G, réglages, aléatoire, bruit) · `js/render.js` (rendu basse résolution + filtre : flou, halo, grain, balayage, vignette) · `js/textures.js` (béton coffré, peinture, asphalte, métal, neige CRT) · `js/world.js` (appartement y=9, escalier 3 étages, hall, rue brutaliste, lampes, corps) · `js/player.js` (marche 2,5 m/s, course 6,4 m/s, caméra qui balance, collisions, marches) · `js/audio.js` (tout généré, change selon intérieur/extérieur) · `js/game.js` (boot, boucle, entrées, interaction E, intro).
- Un seul objet global `G` ; chaque fichier y ajoute ses fonctions et ne fait rien avant `G.boot()`.
- **`python3 build.py`** -> `dist/paris2193.html` (tout en un) et `dist/paris2193.artifact.html` (sans `<!doctype>`, pour la publication Artifact). Publier l'Artifact depuis ce dernier fichier.
- Éclairage : **3 vraies lumières seulement**, déplacées sur les 3 lampes les plus proches ; les autres lampes sont émissives (ampoule + halo). Saleté « cuite » dans les couleurs de sommets (sombre au sol). Pas de bump map.
- Tests locaux : Playwright + `three.min.js` r128 (npm) redirigé à la place du CDN ; un pilote automatique appelle `G.updatePlayer(dt)` pour valider l'escalier et les sauts.
- Lieux/coordonnées : départ (0.1, 9, 0.9) face à la fenêtre (-z). Palier d'étage z 3.3–4.7 ; volée est x 0.1–1.8 (descend vers +z), volée ouest x -1.8–-0.1 (retour vers -z). Sortie hall : porte x -1.6–-0.4 à z=-2.65. Rue vers -z, passerelle ouest à 3,2 m avec trou de 3 m (z -34 à -37, il faut COURIR), blocs à escalader côté est (1/2/3 m), corps vers (-3.2, 0, -21.5).

## DÉCISIONS PRISES
- **[CHANGEMENT MAJEUR] Passage de Godot à JavaScript dans le navigateur** : Three.js (r128, cdnjs) + Web Audio, un seul fichier `index.html`. Raison : Godot trop lourd à installer/lancer pour l'utilisateur ; le navigateur donne un résultat direct (lien cliquable), sons et musique générés par code sans fichiers. Claude peut aussi tester avec Chromium/Playwright (captures d'écran). Le code Godot (étapes 1-2) est archivé dans `godot-archive/`. Les décisions « Godot » ci-dessous sont historiques.
- Le jeu est publié comme Artifact claude.ai (lien jouable) et versionné ici. Pour la republication : retirer la ligne `<!doctype html>` du fichier avant de publier (l'Artifact ajoute son propre squelette).
- Test local : `three.min.js` r128 depuis npm (`npm pack three@0.128.0`), redirigé par Playwright à la place du CDN (le conteneur n'accède pas à cdnjs).
- **Godot 4.7.2 stable** (version de l'utilisateur, à viser pour toute API), GDScript. Renderer **Forward+/Mobile non imposé** : on vise `gl_compatibility` pour la compatibilité large (PC modestes) — à revoir si besoin.
- Structure : `scenes/` (.tscn), `scripts/` (.gd). Scènes construites au maximum **par code** (peu de fichiers .tscn à écrire à la main, moins d'erreurs sans éditeur).
- Contrôles : ZQSD (AZERTY, via touches physiques) + souris, Shift sprint, Espace saut, Échap libère la souris.

- Rendu PS1 : fenêtre 1280x720, rendu interne 640x360 (`stretch/mode=viewport`). Souris via `screen_relative` (sensibilité indépendante de la résolution).
- Textures 100 % procédurales (`scripts/textures.gd`), 64x64, filtrage nearest, projection triplanar monde (pas d'UV à gérer).
- Ruelle : `scripts/alley.gd` (boîtes/cylindres), z=+20 départ -> z=-20 fond, 4 m de large. Zone libre côté gauche vers z=-10 réservée au corps.

- **Passe « réalisme » (v2)** : le look « Roblox » (boîtes partout) remplacé par du détail : vraies formes (cylindres, tubes, sphères déformées), textures 128x128 avec cartes de relief (bump), pavés mouillés qui reflètent les néons, fenêtres avec cadres/volets/appuis, balcons en fer forgé (barres instanciées), escalier de secours praticable (saut depuis la benne), câbles, conduits, affiches de propagande/avis de recherche/graffitis, grille fermée au fond, flaques, fumée d'égout, pluie (lignes) + bruit de pluie et gouttes, halos de néon dans le brouillard, éclairage hémisphérique. Corps humain refait (membres effilés, visage, mains, flaque irrégulière, traînée sur le mur). Rendu interne 480p.
- Réglages de perf si ça rame chez l'utilisateur : `INTERNAL_H` (480 -> 360), `RAIN_N` (900 -> 400), nombre de fenêtres/balcons.
- Piège rencontré : bumpScale trop fort = pavés en « pointes » et crépi en « taches ». Rester entre 0.5 et 1.2.

## DIRECTION ARTISTIQUE v3 (retours utilisateur, en cours de brainstorm, rien de codé)
Verdict sur la v2 : « trop lego, plastique, net ». Objectifs :
- **Silent Hill + écran à tube cathodique** : flou, pixellisé, granuleux, brut. Voir MOINS de détails (le brouillard et le flou cachent les limites du navigateur). Gros brouillard seulement, **plus de pluie**.
- **Brutaliste, gris, béton brut** (granit/béton banché, taches, aucune couleur vive), style Straftat, plus orienté **parkour**. Très peu de couleurs : néons réduits.
- **Fluide** sur un vrai PC (priorité perf : peu de lumières dynamiques, éclairage « cuit » dans les sommets, pas de bump).
- **Début dans un appartement**, puis sortie vers la rue (plus de départ dans la ruelle).
- **Voir son propre corps** (mains, bras, jambes) : modulable plus tard (chrome, tatouages) => peau en texture peinte par couches, peu de textures mais bien faites.
- **Menu au démarrage**, puis le jeu se charge ; **code séparé en plusieurs fichiers** pour la lisibilité (scripts classiques, pas de modules ES, pour pouvoir ouvrir en double-clic).
- À retirer pour l'instant : affiches, pneus, pluie, **scène de peur** (jugée ratée). À garder : **tonneaux**. Ne pas supprimer le corps dans la ruelle sans en reparler.
- Insight : le brutalisme EST fait de grosses boîtes ; le côté « lego » venait des couleurs, de la netteté et de la texture uniforme, pas des boîtes.

## RETOURS v3 (utilisateur) et décisions
- Fluide sur sa GTX (modeste) ; texture béton appréciée ; ambiance OK. Le sol était trop brillant -> corrigé (asphalte mat, halos qui s'effacent de près, lampadaires plus doux).
- **Effet cathodique supprimé** (ça fatiguait les yeux) : plus de lignes de balayage ni d'aberration chromatique. Voulu : **brouillard doux, dense, sombre, plus de grain, on voit peu** (densité dehors 0.09).
- **Sons générés par code supprimés** (pas réalistes). L'utilisateur fournira ses fichiers : dossiers `audio/music/` et `audio/fx/<élément>/` (voir `audio/README.md`). `audio/manifest.json` est généré par `serve.py` / `build.py` (`manifest.py`). **Pour entendre les sons il faut un serveur local** : `jouer.bat` ou `python3 serve.py` (le double-clic file:// bloque fetch). Version Artifact : silencieuse tant que les fichiers ne sont pas publiés avec.
- **Menu** : photo d'escalier (assets/menu/stairs.webp, fournie par l'utilisateur) en fond, bords fondus, titre à gauche ; options qualité/sensibilité/volume/musique/effets.
- **Appartement trop carré (« kogama »)** : veut du Silent Hill moins carré ou dissimulé par les textures. **Il veut choisir des textures libres sur internet (je les présente avant d'implémenter)**. Pistes proposées : Poly Haven (CC0) concrete_wall_008, plastered_wall, damaged_plaster, red_plaster_weathered, yellow_plaster_02 ; OpenGameArt CC0 ; ambientCG à chercher. Les hôtes polyhaven/ambientcg sont BLOQUÉS dans le conteneur : l'utilisateur télécharge dans `assets/textures/` (ou on ouvre le réseau). Anti-carré côté code : arêtes chanfreinées, occlusion ambiante cuite dans les coins, murs légèrement irréguliers, désordre/décalcomanies.
- **Ville** : pas une grande rue entourée de buildings. Veut un **embranchement de ruelles pas forcément à angle droit, qui partent dans tous les sens, façon Paris ancien**, + **zones larges SANS bâtiments autour** (hors de la ville, plat, brouillard, on ne voit pas les murs = plus flippant). Pas de génération aléatoire (trop dur). Premier schéma : `docs/carte-v1.txt` (en attente de ses retours). Référence « Urban Alley Pack » : ruelle étroite, grillages, tuyaux, lampes sodium, graffitis, mais trop « lego » : garder la structure, pas le rendu.
- **Parkour à refaire plus tard** : dash, saut, franchissement simple d'obstacle (passement « chat » de côté, caméra qui tourne façon roulade/torpille), wallrides courts avec glissade si on insiste, chutes si mal fait.

## STATUT v3 (fait)
Menu + code multi-fichiers ; rendu brouillard/CRT ; béton brut gris ; appartement (lit, bureau, écran CRT, briquet Bic gris à ramasser avec E) ; escalier sans ascenseur ; hall ; rue brutaliste fluide avec parkour ; son par zone ; début calme (titre puis fondu). Retirés : pluie, affiches, pneus, scène de peur (corps conservé, sans déclencheur).
## À FAIRE ENSUITE (ordre proposé)
1. Retours de l'utilisateur sur l'ambiance/perf. 2. **Mains/avant-bras et jambes visibles** (corps réaliste sombre/sale, peau en texture peinte par couches pour chrome/tatouages plus tard). 3. Détails du studio (pod de hacking, écran). 4. Premier ennemi / fuite (backlog 1). 5. Scène de peur refaite plus subtile, plus tard.

## ÉTAPES (historique, version Godot puis web)
(Version web : prototype complet livré d'un coup — ruelle, brouillard, néons qui grésillent, corps, son 3D, musique générative, scène de peur. À valider par l'utilisateur.)
- [x] Étape 1 — Projet + joueur FPS dans une salle de test.
- [x] Étape 2 — Ruelle (primitives, textures procédurales nearest, rendu basse résolution PS1). (étape 1 validée par l'utilisateur)
- [ ] Étape 3 — Brouillard, lumière faible, néons qui grésillent.
- [ ] Étape 4 — Le corps au sol.
- [ ] Étape 5 — Sons d'ambiance (générés par code) + pas.
