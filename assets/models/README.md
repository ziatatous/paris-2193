# Modèle du policier (optionnel)

Dépose ici **`cop.glb`** : un personnage humain **riggé** (squelette), de préférence le `.glb` / `.gltf` d'un corps de
**Quaternius – Universal Base Characters** (CC0) : https://quaternius.com/packs/universalbasecharacters.html

- Une seule pose / un seul personnage suffit (les animations du fichier ne sont pas utilisées : on anime les os en code).
- Debout en T ou en A, face à +z ou -z (le jeu détecte).
- Au chargement, la console du navigateur (F12) affiche `[cop.glb] chargé, os reconnus : ...` — ou pourquoi il est refusé.
- Sans ce fichier, le jeu utilise le corps fait main.
- `python3 build.py` intègre le fichier au `dist/paris2193.html` (aucun serveur nécessaire pour lui).
