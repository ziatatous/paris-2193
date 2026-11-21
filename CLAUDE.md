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

## STRUCTURE DU CODE (v4) — à lire en premier
- `index.html` : **menu** (JOUER / OPTIONS : qualité, sensibilité, mouvements brouillons, volume, musique, effets) + chargeur. Le jeu ne se charge qu'après « JOUER ». Scripts classiques (pas de modules ES). Ordre des fichiers : **core, render, textures, physics, world, city, places, dressing, cops, levels, player, audio, game** (même liste dans `index.html` ET `build.py`).
- `js/core.js` (G, réglages, aléatoire, bruit) · `js/render.js` (rendu basse résolution + **SSAO** + flou/halo/grain/vignette + bord rouge d'alerte) · `js/textures.js` (béton coffré, peinture, façade, asphalte, métal, neige CRT) · `js/physics.js` (obstacles : boîtes ET segments de mur en biais, grille 8 m, `pushOut/groundAt/ceilingAt/blocked/topAhead`) · `js/world.js` (tour : appartement y=9, escalier 3 étages, hall ; lampes ; `G.B` boîte à limites, `G.wall`, corps `G.buildBody`, `G.limb/G.ball`) · `js/city.js` (**tracé** : ruelles, murs, sol, façades ; exporte `G.city`) · `js/places.js` (**lieux** : marché, place, terrasse, ponts, viaduc, garage, barrages, pylônes, métro, épaves, corps, clé USB ; `G.makeCop`) · `js/dressing.js` (**crasse et détails** : sang, mains, écritures, humidité, devantures, câbles, débris) · `js/cops.js` (police) · `js/player.js` (mouvement) · `js/audio.js` (lit les fichiers de `audio/`) · `js/game.js` (boot, boucle, entrées, E, intro).
- Un seul objet global `G` ; chaque fichier y ajoute ses fonctions et ne fait rien avant `G.boot()`.
- **`python3 build.py`** -> `dist/paris2193.html` (tout en un, image du menu intégrée) et `dist/paris2193.artifact.html` (sans `<!doctype>`, pour l'Artifact) + regénère `audio/manifest.json`. **`jouer.bat` / `python3 serve.py`** = serveur local (nécessaire pour entendre les sons de `audio/`).
- Éclairage : **3 vraies lumières seulement**, déplacées sur les 3 lampes les plus proches ; les autres lampes sont émissives (ampoule + halo). Saleté « cuite » dans les couleurs de sommets.
- Tests locaux (Playwright + three r128 npm redirigé) : pilote automatique appelant `G.updatePlayer(dt)` ; vue de dessus en coupant `G.render`.

### La carte (js/city.js, places.js, dressing.js) — CARTE v2 « Sleeping Dogs gris »
- Schémas : `docs/carte-v1.txt` (v1) et `docs/carte-v2-proposition.txt` (v2, **implémentée**, aussi dans `G.MAP_ASCII`). 1 case = 4 m ; tour = origine ; `G.mapWorld(col, ligne)` -> (x, z).
- **Méthode** : l'ESPACE LIBRE est décrit par une distance signée `sdf(x,z)` (ruelles = lignes brisées épaissies `ALLEYS`, place `PLACE`, terrasse `TERRACE`, cachettes `ALCOVES`, zone plate via `xlim(z)`, + bruit). Contour par marching squares (grille 1 m) puis murs extrudés (>= 12 m, `G.addSegCollider`). Murs en biais, irréguliers.
- `ALLEYS` : 0 = rue du marché (large, 8,8 m), 1 = branche égout, 2 = boucle/cour (clé USB), 3 = vers la zone plate (barrage de police E), 4 = vers le garage (barrage SE), 5 = nord (grille), 6 = raccord, 7 = ruelle sud, 8 = couloir de l'escalier de la terrasse.
- Lieux : marché (étals bâchés + lampes nues + fûts qui brûlent), place + fontaine, **terrasse haute** (+3,2 m, escalier de 16 marches), 4 **passerelles** à 4,4 m (3 caisses pour monter), **viaduc** en ruine (zone plate) + **garage** dessous (futur hub), 2 **barrages de police** (herses, fourgon, gyrophare, projecteur, 2 gardes), pylônes, métro condamné, grille fermée au nord, corps dans la rue du marché.
- **Dressing (esprit Outlast)** : décalcomanies de sang/mains/écritures à la craie/humidité/griffures/fissures, devantures (rideaux de fer fermés ou à moitié, enseignes délavées, auvents), silhouettes aux fenêtres, planches, câbles pendants/coupés, linge, tuyaux, climatiseurs, balcons, débris au sol (sacs, cartons, planches, bouteilles, gravats, papiers, flaques, sang, huile), traînées de sang, quelques enseignes néon très faibles. Presque tout est **instancié**.
- **Sécurités** : plafond invisible à 12,4 m, `G.isPlayable` + dernier point sûr, murs invisibles aux limites. `G.B` et `addBoxCollider` remettent les limites dans l'ordre (un bug d'escalier « à l'envers » = aucune collision avait passé inaperçu).
- Test de connectivité (BFS sur grille 0,5 m dans une page Playwright) : tout lieu clé doit être atteignable à pied, sauf le dessous de la terrasse.

### Police (js/cops.js)
Vision (cône ~110°, 20 m, moins visible accroupi, plus en courant) + ouïe (course 8 m, glissade/dash 12 m, marche 3 m), **alerte progressive** (idle -> suspicious -> chase -> search), pathfinding A* le long des ruelles, enjambent les obstacles <= 1,1 m (pas plus : passerelles, toits, terrasse, saut de mur = échappatoires). Arrestation = fondu, retour devant la tour (0,0,-6). 2 gardes par barrage + 2 patrouilleurs (marché, place). Vitesses : patrouille 1,4 / enquête 2,4 / poursuite 6,0 m/s. `G.alert` pilote le bord rouge et le battement de coeur (`audio/fx/heartbeat/`). Fichiers sons : `cop_alert/`, `arrest/`, `heartbeat/`.

### Mouvement (js/player.js) — touches PHYSIQUES (AZERTY ok)
Z Q S D · Maj courir · Espace sauter / **franchir** (passement ≤1,3 m, grimpette ≤2,35 m ; en courant le passement est automatique) · **C** s'accroupir / **glisser** (course+C) / **rouler** (C juste avant de toucher le sol) · **F** dash (1 en l'air) · E interagir · M musique (lettre M).
Modes : move, slide, dash, vault, mantle, wallrun, roll, stun. Saut variable + temps de grâce + saut mémorisé. Course sur mur : en l'air, vite, contre un grand mur ; ~0,9 s puis glissade ; Espace = saut de mur (rechaîne sur un autre mur). Chutes : < 4,5 m ok, > 4,5 m trébuche (0,45 s), > 8 m chute dure (1,2 s) ; roulade annule. Seuils réglables en tête de fichier.
Piège : les obstacles à franchir doivent être des **boîtes alignées** (les rectangles tournés = segments sans sommet marchable, donc non franchissables).

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

## RETOURS v6 (utilisateur) et décisions
- **Nouvelle structure : 4 NIVEAUX PETITS et PARFAITEMENT LINÉAIRES** (la grosse carte est mise de côté, conservée dans le code). Propositions ASCII : `docs/niveaux-propositions.txt` (en attente de validation avant de les construire). Niveau 1 « Chez nous » (didactique : appartement, escalier, cour, ruelle), 2 « Le marché » (furtivité), 3 « Les toits » (parkour, drone), 4 « Le barrage » (plaine dans la brume, projecteurs, garage).
- **Trame** : on prend une clé USB « de chez nous » (dans l'appartement) et on la **livre** à quelqu'un / quelque part (E sur le destinataire). **IDÉE À NOTER POUR PLUS TARD** : se brancher à un ordinateur, pirater la GLACE (ICE) avec la plongée en vecteurs façon Neuromancer (voir backlog 3).
- **Police** : OK, vitesse bonne (« m'ont surpris plusieurs fois »). **Corps refait** : squelette articulé (bassin > torse > épaules > coudes, hanches > genoux), animations de marche (genoux), course penchée, attitudes d'attente (radio à l'épaule, déhanchement, balayage de la tête), méfiance (accroupi, main à l'étui), cri/geste du bras quand il repère, bras tendus à l'arrestation ; **lampe frontale** (vraie lumière + faisceau visible dans la brume). Voir `G.makeCop` (places.js) et `animate` (cops.js).
- **Manque de cachettes** -> à concevoir (cachettes où l'on peut ENTRER : benne, casier, placard, sous une bâche ; + couvertures basses ; + ombre).
- **Brume plus épaisse** : densité dehors 0,105 (avant 0,072), plaine 0,095, intérieur 0,05.
- **Architecture « plus carrée »** : fini les murs arrondis/irréguliers (les portes de garage et fenêtres dépassaient au niveau des courbes). Les nouveaux niveaux = murs droits à angles droits, MAIS plus naturel grâce à beaucoup plus d'éléments (cadres de fenêtres/portes en retrait, linteaux, rideaux, tuyaux, enseignes, câbles, désordre).

## RETOURS v5 (utilisateur) et décisions
- Densité (pas de néons colorés). Carte v2 OK mais **« trop lisse, fade, pas assez Outlast »** -> dressing de crasse ci-dessus. Ordre voulu : **(a) rues vivantes** (fait) **puis (c) barrage de police + début de fuite** (fait en version 1). Reste de ses idées : (b) toits/passerelles réels, corps visible (mains/jambes), cachettes utilisables, garage-hub, drones, nasses/cordons, sorties qui se ferment.
- Mouvement : OK ; plus brouillon via réglage `chaos`.
- Il a quitté la carte par accident : corrigé (voir sécurités).

## RETOURS v4 (utilisateur) et décisions
- Tourne « nickel » sur son gros PC. Mouvements bons **mais il les veut plus brouillons** (Straftat) -> réglage **« Mouvements brouillons »** (0 précis ... 1 chaotique, défaut 0,6) dans le menu : inertie plus molle, dérapage au demi-tour en courant, secousses de caméra proportionnelles à la vitesse + à-coups à chaque foulée, chocs d'épaule contre les murs, dash qui part un peu de travers, réceptions approximatives, passements de durée variable (12 % de trébuchement à la sortie). `G.settings.chaos` lu par `CH()` dans player.js.
- **Bug : il est sorti de la carte sans le faire exprès.** Causes probables : (1) on pouvait monter en chaînant des sauts de mur entre deux façades puis passer au-dessus des murs, dans la masse des immeubles (vide) ; (2) tunnel à travers un mur très fin en dash à basse cadence. Corrigé : murs >= 12 m, **plafond invisible à 12,4 m** (pieds jamais au-dessus de ~10,6 m), **mouvement en sous-pas de 0,2 m max**, **filet de sécurité** (`G.isPlayable` : si on est au sol hors de l'espace libre, retour au dernier point sûr toutes les 0,4 s), chute dans le vide -> dernier point sûr (plus l'appartement). Futur : quand il y aura de vrais toits, remplacer le plafond par des toits réels.
- **« Manque d'éléments »** et **nouvelle direction de ville : « comme Sleeping Dogs »** (dense, vivante, étagée : marchés, étals, enseignes, passerelles, toits, scooters, câbles...). Interprétation retenue (À CONFIRMER) : densité et verticalité de Sleeping Dogs, mais **dans notre style** (gris, brouillard, sodium, néons très faibles, pas de couleurs vives). Proposition de carte : `docs/carte-v2-proposition.txt` (rue du marché large avec étals, place des lanternes, terrasse haute + escalier, passerelles, toits, métro, viaduc en ruine, garage dessous, contrôle de police, pylônes). En attente de ses retours avant d'implémenter.

## STATUT v5 (fait)
Carte v2 implémentée + dressing Outlast + police (voir plus haut). Avant : carte v1 (ruelles en biais, place, zone plate, garage), occlusion ambiante (SSAO) contre l'aspect « boîtes », textures procédurales (façade/béton/asphalte) — **les textures réelles n'ont pas pu être téléchargées (hôtes bloqués)** : choix = procédural pour l'instant, avec possibilité de déposer des images dans `assets/textures/` plus tard. Mouvement complet (voir plus haut). Début calme, escalier, hall inchangés.
## À FAIRE ENSUITE (ordre proposé)
1. Retours de l'utilisateur sur la carte (déplacer/ajouter), le mouvement (réglages à ajuster), la luminosité. 2. **Mains/avant-bras et jambes visibles** (corps réaliste sombre/sale, peau en texture par couches pour chrome/tatouages plus tard). 3. Vrais sons (l'utilisateur les fournit dans `audio/`). 4. Textures réelles CC0 si choisies. 5. Détails du studio (pod de hacking, écran). 6. Garage-hub, parcours sur les toits (`r` du schéma), cachettes `+` utilisables, égout `E`. 7. Premier ennemi / fuite (backlog 1). 8. Scène de peur plus subtile, plus tard.

## ÉTAPES (historique, version Godot puis web)
(Version web : prototype complet livré d'un coup — ruelle, brouillard, néons qui grésillent, corps, son 3D, musique générative, scène de peur. À valider par l'utilisateur.)
- [x] Étape 1 — Projet + joueur FPS dans une salle de test.
- [x] Étape 2 — Ruelle (primitives, textures procédurales nearest, rendu basse résolution PS1). (étape 1 validée par l'utilisateur)
- [ ] Étape 3 — Brouillard, lumière faible, néons qui grésillent.
- [ ] Étape 4 — Le corps au sol.
- [ ] Étape 5 — Sons d'ambiance (générés par code) + pas.

## NIVEAUX (v7) — structure actuelle
- Menu : **JOUER** = niveau 1 (`G.mode='level'`) ; **GRANDE CARTE (ancienne)** = bac à sable (`G.mode='sandbox'`, ancienne ville conservée).
- `js/levels.js` : `G.facade(...)` = murs CUBIQUES à deux couches (0,3 + 0,3 m) ; fenêtres/portes/rideaux de fer sont posés DANS des niches, donc rien ne dépasse. `G.buildLevel1()`, `G.resetLevel()`, `G.levelComplete()`.
- **Niveau 1 « Chez nous »** (livré) : appartement (clé USB près du lit) -> escalier -> hall -> cour (1 patrouilleur) -> ruelle -> place du contact (1 garde). E sur le contact avec la clé = fin de niveau.
- **Échec = retour immédiat au début du niveau** (style Hotline Miami, punitif).
- **Cachettes (les trois)** : (a) entrer avec E (benne, casier, tas de caisses sous bâche ; un flic qui te voit entrer peut fouiller), (b) couvertures basses accroupi, (c) l'ombre réduit la visibilité (fûts qui brûlent = plus visible).
- Niveaux prévus : 2 « Le marché » (furtivité), 3 « Les toits » (parkour, drone), 4 **égouts jusqu'au garage** (choix de l'utilisateur).
- Idée à garder : brancher la clé sur un ordinateur, pirater la GLACE (plongée en vecteurs, backlog 3).
- Tests : `G.cops.length=0` + AmbientLight pour voir les façades ; vérifié : chargement sans erreur, clé -> cachette -> livraison -> reset, arrestation -> reset.
