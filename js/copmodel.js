/* =====================================================================
   copmodel.js : le CORPS du policier peut être un vrai modèle 3D riggé (assets/models/cop.glb, ex. Quaternius « Universal Base Characters », CC0).
   Si le fichier n'existe pas, on garde le corps fait main (places.js). Le modèle est habillé EN CODE (long manteau, col, sangle, masque à gaz, casquette)
   et animé par le même squelette « proxy » que d'habitude (cops.js animate) : on copie les rotations des pivots sur les os du modèle.
   Pour que ça marche avec n'importe quel nommage d'os (UE, Mixamo, Blender...), les os sont reconnus par leur NOM (voir classify).
   ===================================================================== */
(function () {
  'use strict';
  const G = window.G, T = G.T;
  let SRC = null;                         // le gltf chargé (scène modèle)
  G.copModelReady = () => !!SRC;

  // --- Reconnaissance des os par leur nom ---
  function classify(raw) {
    const n = raw.toLowerCase().replace(/mixamorig|armature|[^a-z0-9]/g, '');
    if (/(finger|thumb|index|middle|ring|pinky|toe|ball|clavicle|shoulder|twist|ik|roll|helper|corrective|top|end)/.test(n)) return null;
    if (/^(pelvis|hips)$/.test(n)) return { part: 'hips', side: 0 };
    if (/^spine(0?1|1)?$/.test(n)) return { part: 'torso', side: 0 };
    if (/^neck(0?1|1)?$/.test(n)) return { part: 'neck', side: 0 };
    if (/^head$/.test(n)) return { part: 'head', side: 0 };
    // côté : +1 = côté +x du perso (sa GAUCHE quand il regarde +z), -1 = l'autre
    const side = /left/.test(n) ? 1 : /right/.test(n) ? -1 : /l\d*$/.test(n) ? 1 : /r\d*$/.test(n) ? -1 : 0;
    if (!side) return null;
    if (/(forearm|lowerarm)/.test(n)) return { part: 'el', side };
    if (/(upperarm|^(left|right)?arm|^arm)/.test(n)) return { part: 'sh', side };
    if (/(thigh|upleg|upperleg)/.test(n)) return { part: 'hip', side };
    if (/(calf|shin|lowerleg|^(left|right)?leg|^leg)/.test(n)) return { part: 'kn', side };
    if (/foot/.test(n)) return { part: 'foot', side };
    return null;
  }
  const ORDER = ['hips', 'torso', 'neck', 'head', 'sh1', 'sh-1', 'el1', 'el-1', 'hip1', 'hip-1', 'kn1', 'kn-1'];

  G.loadCopModel = async function () {
    if (!T.GLTFLoader) return;
    try {
      let buf = null;
      if (window.COP_GLB_B64) { const bin = atob(window.COP_GLB_B64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); buf = u.buffer; }
      else { if (location.protocol === 'file:') return; const r = await fetch('assets/models/cop.glb'); if (!r.ok) return; buf = await r.arrayBuffer(); }
      if (!buf || buf.byteLength > 20e6) return;                                   // fichier absent ou démesuré : on garde le corps fait main
      const gltf = await new Promise((ok, ko) => new T.GLTFLoader().parse(buf, '', ok, ko));
      const probe = analyse(gltf.scene.clone(true));      // essai : il faut au moins les os principaux
      if (!probe) { console.warn('[cop.glb] os non reconnus : corps fait main conservé'); return; }
      SRC = gltf.scene; console.log('[cop.glb] chargé, os reconnus :', Object.keys(probe.bones).join(', '));
    } catch (e) { console.warn('[cop.glb] absent ou illisible, corps fait main :', e && e.message); }
  };

  // Trouve les os, leur orientation au repos, l'échelle et le décalage pour que le modèle fasse ~1,75 m, pieds au sol
  function analyse(root) {
    root.updateMatrixWorld(true);
    const bones = {}, all = [];
    root.traverse(o => { if (o.isBone) all.push(o); });
    for (const b of all) {
      const c = classify(b.name); if (!c) continue;
      const key = c.part === 'foot' ? 'foot' + c.side : c.part + (c.side || ''); if (key.startsWith('foot')) { (bones._feet = bones._feet || []).push(b); continue; }
      if (!bones[key]) bones[key] = b;
    }
    const need = ['hips', 'head', 'sh1', 'sh-1', 'hip1', 'hip-1', 'kn1', 'kn-1'];
    if (!need.every(k => bones[k])) return null;
    const feet = bones._feet || [bones['kn1'], bones['kn-1']]; delete bones._feet;
    const wp = b => b.getWorldPosition(new T.Vector3());
    const footY = Math.min(...feet.map(f => wp(f).y)), headY = wp(bones.head).y;
    return { bones, footY, headY, feet };
  }

  // Habille un policier : appelé par G.makeCop quand le modèle est disponible. `rig` = pivots proxy, `g` = groupe du policier.
  G.attachCopModel = function (g, rig) {
    if (!SRC) return false;
    const root = T.SkeletonUtils.clone(SRC), holder = new T.Group(); holder.add(root); g.add(holder);
    g.updateMatrixWorld(true); const info = analyse(root); if (!info) return false;
    const sc = 1.62 / Math.max(0.5, info.headY - info.footY); holder.scale.setScalar(sc); holder.position.y = -info.footY * sc;
    // Orientation : si les orteils pointent vers -z, on retourne le modèle (il doit regarder vers +z comme nos pivots)
    root.updateMatrixWorld(true); holder.updateMatrixWorld(true);
    const toe = (() => { let t = null; root.traverse(o => { if (o.isBone && /toe|ball/i.test(o.name) && !t) t = o; }); return t; })();
    if (toe && toe.parent) { const d = toe.getWorldPosition(new T.Vector3()).sub(toe.parent.getWorldPosition(new T.Vector3())); if (d.z < -0.01) holder.rotation.y = Math.PI; }
    holder.updateMatrixWorld(true);
    // Matière : cuir sombre mat sur tout le corps (la peau est cachée par le masque, les gants et le manteau)
    const dark = new T.MeshPhongMaterial({ color: 0x14171a, shininess: 14, specular: 0x14181b, skinning: true });
    root.traverse(o => { if (o.isMesh) { o.material = dark; o.frustumCulled = false; o.castShadow = false; } });
    // Données de repos de chaque os : orientation monde (dans le repère du perso) et rotation « neutre » (bras le long du corps)
    const gInv = new T.Quaternion(), tmp = new T.Quaternion(), down = new T.Vector3(0, -1, 0), rest = {};
    g.getWorldQuaternion(gInv); gInv.invert();
    for (const key of ORDER) {
      const b = info.bones[key]; if (!b) continue;
      const Rw = b.getWorldQuaternion(new T.Quaternion()).premultiply(gInv), N = new T.Quaternion();
      if (/^(sh|el)/.test(key)) {                                                          // bras en T : on cherche vers où pointe l'os et on l'amène vers le bas
        const child = b.children.find(c => c.isBone), dir = child ? child.getWorldPosition(new T.Vector3()).sub(b.getWorldPosition(new T.Vector3())).applyQuaternion(gInv) : new T.Vector3(key.endsWith('1') ? -1 : 1, 0, 0);
        dir.normalize(); N.setFromUnitVectors(dir, down);
      }
      rest[key] = { b, Rw, N, p0: b.position.clone(), proxy: rig[key], parentKey: null };
    }
    const q = new T.Quaternion(), qa = new T.Quaternion(), gq = new T.Quaternion(), dv = new T.Vector3(), proxyQ = (p) => p.getWorldQuaternion(new T.Quaternion());
    rig.sync = function () {
      g.updateMatrixWorld(true);
      for (const key of ORDER) {
        const r = rest[key]; if (!r || !r.proxy) continue;
        if (key === 'hips') {                                                                 // le bassin monte/descend et se balance
          r.b.parent.updateWorldMatrix(true, false); r.b.parent.getWorldQuaternion(qa);
          dv.set(r.proxy.position.x, r.proxy.position.y - 0.98, 0).applyQuaternion(gq.setFromRotationMatrix(g.matrixWorld)).applyQuaternion(qa.clone().invert()).divideScalar(sc);
          r.b.position.copy(r.p0).add(dv);
        }
        const Wp = proxyQ(r.proxy);
        q.copy(Wp).multiply(r.N).multiply(r.Rw);                                          // orientation monde voulue
        r.b.parent.updateWorldMatrix(true, false); r.b.parent.getWorldQuaternion(qa);
        r.b.quaternion.copy(qa.invert().multiply(q));                                       // -> rotation locale
        r.b.updateMatrixWorld(true);
      }
    };
    rig.modelRoot = holder; rig.hasModel = true; return true;
  };
  G.loaded.push('copmodel');
})();
