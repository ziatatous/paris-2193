/* =====================================================================
   render.js : le rendu "brouillard doux + grain".
   1) La scène est dessinée dans une petite image (ex. 324 pixels de haut) AVEC sa carte de profondeur.
   2) Un filtre plein écran l'agrandit en l'adoucissant, puis ajoute :
      - OCCLUSION AMBIANTE (SSAO) : assombrit les creux, les coins, le pied des objets. C'est ce qui
        casse l'aspect "boîtes posées" : les angles se salissent comme dans la vraie vie ;
      - flou léger, halo sur les lumières, couleurs ternes, gros grain, bords sombres.
   Pas de lignes de balayage ni de décalage de couleurs (ça fatiguait les yeux).
   ===================================================================== */
(function () {
  'use strict';
  const G = window.G, T = G.T;
  const QUALITY_HEIGHT = { low: 240, medium: 324, high: 432 };

  const VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position, 1.0); }`;
  const FRAG = `
    uniform sampler2D tDiffuse; uniform sampler2D tDepth; uniform vec2 texel; uniform float time; uniform float flash;
    uniform float near; uniform float far; uniform float tanHalf; uniform float aspect; uniform float aoK;
    varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    float linZ(float d){ float z = d * 2.0 - 1.0; return (2.0 * near * far) / (far + near - z * (far - near)); }
    void main(){
      vec2 c = vUv - 0.5;
      vec3 col = texture2D(tDiffuse, vUv).rgb;
      // --- Occlusion ambiante : on compare la profondeur du pixel à celle de ses voisins proches
      float zc = linZ(texture2D(tDepth, vUv).r), ao = 0.0;
      if (zc < far * 0.8 && aoK > 0.0) {
        float ry = 0.7 / zc * 0.5 / tanHalf;                       // rayon de 0,7 m projeté à l'écran
        ry = clamp(ry, texel.y * 2.0, 0.09); vec2 rad = vec2(ry / aspect, ry);
        float rot = hash(gl_FragCoord.xy) * 6.2832;
        for (int i = 0; i < 12; i++) {
          float a = rot + float(i) * 2.39996; float rr = (float(i) + 1.0) / 12.0;
          vec2 o = vec2(cos(a), sin(a)) * rad * (0.25 + 0.75 * rr);
          float zs = linZ(texture2D(tDepth, vUv + o).r), diff = zc - zs;
          ao += smoothstep(0.04, 0.3, diff) * (1.0 - smoothstep(0.6, 1.4, diff));
        }
        ao = clamp(ao / 12.0 * 1.6, 0.0, 1.0) * aoK * (1.0 - smoothstep(10.0, 28.0, zc));
      }
      col *= 1.0 - ao * 0.72;
      vec2 t = texel * 1.6;                                      // flou : moyenne avec les voisins
      vec3 blur = (texture2D(tDiffuse, vUv + vec2(t.x, 0.)).rgb + texture2D(tDiffuse, vUv - vec2(t.x, 0.)).rgb
                 + texture2D(tDiffuse, vUv + vec2(0., t.y)).rgb + texture2D(tDiffuse, vUv - vec2(0., t.y)).rgb) * 0.25;
      col = mix(col, blur * (1.0 - ao * 0.72), 0.5);
      vec2 t2 = texel * 5.0;                                     // halo : les zones claires débordent
      vec3 wide = (texture2D(tDiffuse, vUv + vec2(t2.x, t2.y)).rgb + texture2D(tDiffuse, vUv - vec2(t2.x, t2.y)).rgb
                 + texture2D(tDiffuse, vUv + vec2(-t2.x, t2.y)).rgb + texture2D(tDiffuse, vUv - vec2(-t2.x, t2.y)).rgb) * 0.25;
      col += max(wide - 0.32, 0.0) * 0.75;
      float l = dot(col, vec3(0.299, 0.587, 0.114));            // couleurs ternes, teinte froide un peu verdâtre
      col = mix(vec3(l), col, 0.62) * vec3(0.93, 1.0, 0.95) + 0.028;
      col += (hash(gl_FragCoord.xy + fract(time) * 71.0) - 0.5) * 0.13;   // grain (marqué)
      col *= smoothstep(1.15, 0.3, length(c) * 1.3);             // bords sombres, doux
      col += flash;
      gl_FragColor = vec4(col, 1.0);
    }`;

  G.initRender = function (canvas) {
    G.renderer = new T.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    G.renderer.setPixelRatio(1);
    G.scene = new T.Scene();
    G.camera = new T.PerspectiveCamera(70, 16 / 9, 0.05, 90);
    G.camera.rotation.order = 'YXZ';        // d'abord gauche/droite, ensuite haut/bas
    G.postScene = new T.Scene();
    G.postCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    G.postMat = new T.ShaderMaterial({
      uniforms: { tDiffuse: { value: null }, tDepth: { value: null }, texel: { value: new T.Vector2(1 / 576, 1 / 324) }, time: { value: 0 }, flash: { value: 0 },
                  near: { value: 0.05 }, far: { value: 90 }, tanHalf: { value: 0.7 }, aspect: { value: 16 / 9 }, aoK: { value: 1 } },
      vertexShader: VERT, fragmentShader: FRAG, depthTest: false, depthWrite: false
    });
    G.postScene.add(new T.Mesh(new T.PlaneGeometry(2, 2), G.postMat));
    window.addEventListener('resize', G.resize);
    G.resize();
  };

  G.resize = function () {
    const w = window.innerWidth, h = window.innerHeight;
    const ih = QUALITY_HEIGHT[G.settings.quality] || 324, iw = Math.max(2, Math.round(ih * w / h));
    G.renderer.setSize(w, h, false);
    if (G.rt) { G.rt.dispose(); if (G.rt.depthTexture) G.rt.depthTexture.dispose(); }
    G.rt = new T.WebGLRenderTarget(iw, ih, { minFilter: T.LinearFilter, magFilter: T.LinearFilter, format: T.RGBAFormat });
    G.rt.depthTexture = new T.DepthTexture(iw, ih); G.rt.depthTexture.type = T.UnsignedIntType;
    G.rt.depthTexture.minFilter = T.NearestFilter; G.rt.depthTexture.magFilter = T.NearestFilter;
    const u = G.postMat.uniforms;
    u.tDiffuse.value = G.rt.texture; u.tDepth.value = G.rt.depthTexture; u.texel.value.set(1 / iw, 1 / ih);
    u.aoK.value = G.settings.quality === 'low' ? 0 : 1;            // qualité Bas : pas d'occlusion ambiante (plus rapide)
    G.camera.aspect = w / h; G.camera.updateProjectionMatrix();
  };

  G.render = function (time) {
    const u = G.postMat.uniforms;
    u.time.value = time; u.aspect.value = G.camera.aspect; u.tanHalf.value = Math.tan(G.camera.fov * Math.PI / 360);
    G.renderer.setRenderTarget(G.rt);
    G.renderer.render(G.scene, G.camera);
    G.renderer.setRenderTarget(null);
    G.renderer.render(G.postScene, G.postCam);
  };

  G.loaded.push('render');
})();
