// Test de la sauvegarde : une sauvegarde piégée ou corrompue ne doit rien casser ni polluer.
const vm = require('vm'), fs = require('fs'); let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('ÉCHEC', m); } else console.log('ok', m); };
function run(stored) {
  const store = { 'paris2193.save': stored }, sb = { window: null, localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = v; } }, addEventListener() {}, document: {}, console, setTimeout, requestAnimationFrame() {}, JSON, Object, Array, Number, String, RegExp, Math, isFinite };
  sb.window = sb; sb.G = { T: {}, loaded: [] }; vm.createContext(sb); vm.runInContext(fs.readFileSync(__dirname + '/../js/story.js', 'utf8'), sb); sb.G.loadSave(); return { G: sb.G, store };
}
let r = run(JSON.stringify({ chapter: 3, collect: ['draw_1', 'x'.repeat(50), 5, '<img>'], flags: { mila_seen: true, '__proto__': true, bad: 'oui' }, deaths: 4 }));
ok(r.G.save.chapter === 3, 'chapitre valide lu'); ok(r.G.save.collect.length === 1 && r.G.save.collect[0] === 'draw_1', 'objets filtrés (longueur, type, caractères)');
ok(r.G.save.flags.mila_seen === true && r.G.save.flags.bad === undefined, 'drapeaux filtrés'); ok(({}).polluted === undefined && Object.getPrototypeOf(r.G.save.flags) === null, 'pas de pollution de prototype'); ok(r.G.save.deaths === 4, 'morts lues');
r = run('{pas du json'); ok(r.G.save.chapter === 1 && r.G.save.collect.length === 0, 'sauvegarde illisible -> départ à zéro');
r = run(JSON.stringify({ chapter: 99, deaths: -5, collect: 'oups' })); ok(r.G.save.chapter === 1 && r.G.save.deaths === 0 && r.G.save.collect.length === 0, 'valeurs hors limites ignorées');
r = run(null); ok(r.G.save.chapter === 1, 'aucune sauvegarde -> départ à zéro');
process.exit(fails ? 1 : 0);
