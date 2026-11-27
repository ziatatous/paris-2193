#!/usr/bin/env python3
"""Assemble le jeu en UN SEUL fichier (dist/paris2193.html) pour le publier en ligne ou le partager.
Le code source reste séparé dans js/ pour la lisibilité ; ce script ne fait que les coller dans index.html.
Usage :  python3 build.py
"""
import base64, os, re
from manifest import make_manifest
FILES = ['core', 'gltf', 'render', 'textures', 'physics', 'world', 'city', 'copmodel', 'places', 'dressing', 'cops', 'health', 'building', 'levels', 'story', 'chapter2', 'player', 'sfx', 'audio', 'game']   # même ordre que dans index.html
html = open('index.html', encoding='utf-8').read()
bundle = ''.join('<script>\n/* ---- js/%s.js ---- */\n%s\n</script>\n' % (f, open('js/%s.js' % f, encoding='utf-8').read()) for f in FILES)
assert '<!--BUNDLE-->' in html
three = open('js/vendor/three.min.js', encoding='utf-8').read()
THREE_TAG = '<script src="js/vendor/three.min.js"></script>'
assert THREE_TAG in html
html = html.replace(THREE_TAG, '<script>\n' + three + '\n</script>')   # three.js intégré : aucune dépendance au réseau
out_public = html.replace('<!--BUNDLE-->', bundle)       # version publiable (Artifact) : SANS le modèle du policier (licence à vérifier avant de diffuser un modèle tiers)
if os.path.exists('assets/models/cop.glb'):    # version locale dist/paris2193.html : le modèle est intégré (base64), pas besoin de serveur pour lui
    bundle = '<script>window.COP_GLB_B64="%s";</script>\n' % base64.b64encode(open('assets/models/cop.glb', 'rb').read()).decode() + bundle
out = html.replace('<!--BUNDLE-->', bundle)
# L'image du menu est intégrée au fichier (data URI) pour que la version tout-en-un soit autonome
img = base64.b64encode(open('assets/menu/stairs.webp', 'rb').read()).decode()
out = out.replace('url(assets/menu/stairs.webp)', 'url(data:image/webp;base64,%s)' % img)
out_public = out_public.replace('url(assets/menu/stairs.webp)', 'url(data:image/webp;base64,%s)' % img)
make_manifest()   # met aussi à jour audio/manifest.json
os.makedirs('dist', exist_ok=True)
open('dist/paris2193.html', 'w', encoding='utf-8').write(out)
# Variante pour l'Artifact claude.ai : sans la ligne <!doctype html> (la plateforme ajoute son propre squelette)
open('dist/paris2193.artifact.html', 'w', encoding='utf-8').write(out_public.split('\n', 1)[1] if out_public.startswith('<!doctype html>') else out_public)
print('OK : dist/paris2193.html (%d Ko)' % (len(out) // 1024))
