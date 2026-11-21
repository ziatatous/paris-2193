"""Scanne audio/music et audio/fx/<dossier> et écrit audio/manifest.json (la liste des sons que le jeu doit charger)."""
import json, os
EXT = ('.ogg', '.mp3', '.wav', '.m4a', '.flac', '.opus')

def make_manifest(root='audio'):
    def files(path):
        if not os.path.isdir(path):
            return []
        return sorted(os.path.join(path, f).replace('\\', '/') for f in os.listdir(path) if f.lower().endswith(EXT))
    m = {'music': files(os.path.join(root, 'music')), 'fx': {}}
    fx = os.path.join(root, 'fx')
    if os.path.isdir(fx):
        for d in sorted(os.listdir(fx)):
            lst = files(os.path.join(fx, d))
            if lst:
                m['fx'][d] = lst
    with open(os.path.join(root, 'manifest.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, indent=1, ensure_ascii=False)
    return m

if __name__ == '__main__':
    m = make_manifest()
    print('manifest : %d musique(s), %d dossier(s) d\'effets avec des fichiers' % (len(m['music']), len(m['fx'])))
