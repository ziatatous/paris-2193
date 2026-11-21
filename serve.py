#!/usr/bin/env python3
"""Lance le jeu en local : http://localhost:8000
Pourquoi ? Les navigateurs refusent de charger les fichiers sons depuis un double-clic (file://).
Avec ce petit serveur, tes sons de audio/ fonctionnent. À chaque lancement, la liste des sons est refaite.
Usage :  python3 serve.py      (ou double-clic sur jouer.bat sous Windows)
"""
import http.server, os, socketserver, webbrowser
from manifest import make_manifest

os.chdir(os.path.dirname(os.path.abspath(__file__)))
m = make_manifest()
print('Sons trouvés : %d musique(s), dossiers d\'effets : %s' % (len(m['music']), ', '.join(m['fx']) or 'aucun'))

class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, '.webp': 'image/webp', '.ogg': 'audio/ogg', '.opus': 'audio/ogg', '.json': 'application/json', '.js': 'text/javascript'}
    def end_headers(self):                       # pas de cache : un nouveau fichier est pris en compte tout de suite
        self.send_header('Cache-Control', 'no-store'); super().end_headers()
    def log_message(self, *a): pass

socketserver.TCPServer.allow_reuse_address = True
for port in range(8000, 8010):
    try:
        httpd = socketserver.TCPServer(('127.0.0.1', port), Handler); break
    except OSError:
        continue
print('Jeu : http://localhost:%d   (Ctrl+C pour arrêter)' % port)
webbrowser.open('http://localhost:%d/' % port)
httpd.serve_forever()
