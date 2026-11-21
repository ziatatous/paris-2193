#!/usr/bin/env python3
"""Assemble le jeu en UN SEUL fichier (dist/paris2193.html) pour le publier en ligne ou le partager.
Le code source reste séparé dans js/ pour la lisibilité ; ce script ne fait que les coller dans index.html.
Usage :  python3 build.py
"""
import os
FILES = ['core', 'render', 'textures', 'world', 'player', 'audio', 'game']   # même ordre que dans index.html
html = open('index.html', encoding='utf-8').read()
bundle = ''.join('<script>\n/* ---- js/%s.js ---- */\n%s\n</script>\n' % (f, open('js/%s.js' % f, encoding='utf-8').read()) for f in FILES)
assert '<!--BUNDLE-->' in html
out = html.replace('<!--BUNDLE-->', bundle)
os.makedirs('dist', exist_ok=True)
open('dist/paris2193.html', 'w', encoding='utf-8').write(out)
# Variante pour l'Artifact claude.ai : sans la ligne <!doctype html> (la plateforme ajoute son propre squelette)
open('dist/paris2193.artifact.html', 'w', encoding='utf-8').write(out.split('\n', 1)[1] if out.startswith('<!doctype html>') else out)
print('OK : dist/paris2193.html (%d Ko)' % (len(out) // 1024))
