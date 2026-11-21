/* =====================================================================
   render.js : le rendu "vieil écran + brouillard".
   1) La scène est dessinée dans une petite image (ex. 324 pixels de haut).
   2) Un filtre plein écran l'agrandit en l'adoucissant, puis ajoute :
      flou léger, halo sur les lumières, couleurs ternes, gros grain, bords sombres.
      (Pas de lignes de balayage ni de décalage de couleurs : ça fatiguait les yeux.)
   Moins de pixels à calculer = jeu fluide ; et le flou cache les limites du navigateur.
   ===================================================================== */
(function () {
  'use strict';
  const G = window.G, T = G.T;
  const QUALITY_HEIGHT = { low: 240, medium: 324, high: 432 };

  const VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position, 1.0); }`;
  const FRAG = `
    uniform sampler2D tDiffuse; uniform vec2 texel; uniform float lines; uniform float time; uniform float flash;
    varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec2 c = vUv - 0.5;
      vec3 col = texture2D(tDiffuse, vUv).rgb;
      vec2 t = texel * 1.6;                                      // flou : moyenne avec les voisins
      vec3 blur = (texture2D(tDiffuse, vUv + vec2(t.x, 0.)).rgb + texture2D(tDiffuse, vUv - vec2(t.x, 0.)).rgb
                 + texture2D(tDiffuse, vUv + vec2(0., t.y)).rgb + texture2D(tDiffuse, vUv - vec2(0., t.y)).rgb) * 0.25;
      col = mix(col, blur, 0.5);
      vec2 t2 = texel * 5.0;                                     // halo : les zones claires débordent
      vec3 wide = (texture2D(tDiffuse, vUv + vec2(t2.x, t2.y)).rgb + texture2D(tDiffuse, vUv - vec2(t2.x, t2.y)).rgb
                 + texture2D(tDiffuse, vUv + vec2(-t2.x, t2.y)).rgb + texture2D(tDiffuse, vUv - vec2(-t2.x, t2.y)).rgb) * 0.25;
      col += max(wide - 0.32, 0.0) * 0.75;
      float l = dot(col, vec3(0.299, 0.587, 0.114));            // couleurs ternes, teinte froide un peu verdâtre
      col = mix(vec3(l), col, 0.62) * vec3(0.93, 1.0, 0.95);
      col = pow(max(col, 0.0), vec3(1.0)) + 0.016;
      col += (hash(gl_FragCoord.xy + fract(time) * 71.0) - 0.5) * 0.13;   // grain (plus marqué)
      col *= smoothstep(1.15, 0.3, length(c) * 1.3);            // bords sombres, doux
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
      uniforms: { tDiffuse: { value: null }, texel: { value: new T.Vector2(1 / 576, 1 / 324) }, lines: { value: 324 }, time: { value: 0 }, flash: { value: 0 } },
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
    if (G.rt) G.rt.dispose();
    G.rt = new T.WebGLRenderTarget(iw, ih, { minFilter: T.LinearFilter, magFilter: T.LinearFilter, format: T.RGBAFormat });
    G.postMat.uniforms.tDiffuse.value = G.rt.texture;
    G.postMat.uniforms.texel.value.set(1 / iw, 1 / ih);
    G.postMat.uniforms.lines.value = ih;
    G.camera.aspect = w / h; G.camera.updateProjectionMatrix();
  };

  G.render = function (time) {
    G.postMat.uniforms.time.value = time;
    G.renderer.setRenderTarget(G.rt);
    G.renderer.render(G.scene, G.camera);
    G.renderer.setRenderTarget(null);
    G.renderer.render(G.postScene, G.postCam);
  };

  G.loaded.push('render');
})();
