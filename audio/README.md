# Sons du jeu : où glisser tes fichiers

Formats : `.ogg` (recommandé), `.mp3`, `.wav`, `.m4a`, `.flac`.
Puis **relance `jouer.bat`** (ou `python3 serve.py`) : la liste des sons est refaite toute seule.
S'il y a plusieurs fichiers dans un dossier, le jeu en prend un au hasard à chaque fois (pratique pour les pas).
Un dossier vide = silence. Rien ne plante.

## `music/`
Tous les morceaux, joués dans un ordre aléatoire, avec un fondu de 4 s. Touche **M** en jeu = couper la musique.

## `fx/` : un dossier par élément
| Dossier | Quand il joue | Type |
|---|---|---|
| `footsteps/` | à chaque pas en marchant | court, plusieurs variantes |
| `footsteps_run/` | à chaque pas en courant (sinon `footsteps/`) | court, plusieurs variantes |
| `jump/` | au saut | court |
| `land/` | à l'atterrissage après une chute | court |
| `lighter/` | quand on ramasse le briquet | court |
| `ambience_inside/` | ambiance dans l'immeuble (boucle) | long, bouclable |
| `ambience_outside/` | ambiance dans la rue (boucle) | long, bouclable |
| `breath_idle/` | respiration au repos (boucle) | long, bouclable |
| `breath_run/` | respiration essoufflée après un sprint (boucle) | long, bouclable |
| `crt/` | bourdonnement de l'écran, spatialisé dans la pièce (boucle) | long, bouclable |
| `siren/` | sirène lointaine, toutes les 40 à 90 s | long |
| `cop_alert/` | un policier te repère (« Hé ! Toi ! ») | court, plusieurs variantes |
| `arrest/` | tu te fais arrêter | court |
| `heartbeat/` | battements de coeur, de plus en plus forts quand l'alerte monte (boucle) | long, bouclable |

Les ambiances et respirations passent de l'une à l'autre en fondu (dedans/dehors, repos/effort).
Pour ajouter un nouvel élément plus tard (porte, tonneau...), dis-le-moi : je crée le dossier et je le branche.

## Version en ligne (lien claude.ai)
Les sons ne sont lus que si les fichiers sont publiés avec le jeu. Demande-moi de les inclure quand tu en as.

- `hide/` : son quand on entre/sort d'une cachette.
- `deliver/` : son de la livraison de la clé.
