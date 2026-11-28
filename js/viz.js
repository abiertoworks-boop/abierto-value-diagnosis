/* =========================================================
   見える化の部品 — ABIERTO WORKS 価値診断
   ・AWViz.radar(root, opts)       … SVGのレーダーチャート（中心から広がって描かれる）
   ・AWViz.HoloLayers(el, opts)    … 斜めに浮かぶ「層」のレーダー（土台／自分の声／周りの声／重ねて見える価値）
                                     光の輪が下から上へ走査し、通った層が明るくなる。トップでは層が重なっては離れる
   ・AWViz.HoloMap(el, opts)       … 5つの領域のホログラム（EQ Platform の MAP＝holo.js の作り方を流用）
                                     中心の「らしさ」から5つの領域へ光が流れ、領域どうしは輪でめぐる
   Three.js（r128）が読めない・WebGL が使えない環境では、3Dは出さずに文章とレーダーだけで成り立つ。
   ========================================================= */
window.AWViz = (function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var CAPTURE = /[?&]capture=1/.test(location.search);
  var REDUCED = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  function fmt(v) { return (Math.round(v * 10) / 10).toFixed(1); }
  function svgEl(tag, attrs, text) {
    var e = document.createElementNS(NS, tag);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }
  function onVisible(target, cb, threshold) {
    if (CAPTURE || !('IntersectionObserver' in window)) { cb(true); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { cb(e.isIntersecting); });
    }, { threshold: threshold || 0.12 });
    io.observe(target);
  }
  function hasWebGL() {
    if (!window.THREE) return false;
    try {
      var c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch (e) { return false; }
  }
  function ease(t) { t = Math.min(1, Math.max(0, t)); return 1 - Math.pow(1 - t, 3); }
  function smooth(t) { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); }

  // 光の粒・グローに使う、ぼかした丸（holo.js と同じ）
  var dotTex = null;
  function dotTexture(T) {
    if (dotTex) return dotTex;
    var c = document.createElement('canvas'); c.width = c.height = 128;
    var g = c.getContext('2d');
    var grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.18, 'rgba(255,255,255,.75)');
    grd.addColorStop(0.45, 'rgba(255,255,255,.18)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
    dotTex = new T.CanvasTexture(c);
    return dotTex;
  }
  function makeRenderer(T, container, cls) {
    var r;
    try { r = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: CAPTURE }); }
    catch (err) { return null; }
    r.setClearColor(0x000000, 0);
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.domElement.className = cls;
    container.appendChild(r.domElement);
    return r;
  }
  // ドラッグで回す（縦スクロールは邪魔しない）
  function dragYaw(cv, container, st) {
    cv.style.touchAction = 'pan-y';
    var lastX = 0;
    cv.addEventListener('pointerdown', function (e) {
      st.dragging = true; st.moved = 0; lastX = e.clientX;
      try { cv.setPointerCapture(e.pointerId); } catch (x) {}
      container.classList.add('is-dragging', 'is-touched');
    });
    cv.addEventListener('pointermove', function (e) {
      if (!st.dragging) return;
      var d = (e.clientX - lastX) * 0.008; st.drag += d; st.vel = d; st.moved += Math.abs(e.clientX - lastX); lastX = e.clientX;
    });
    var end = function () { st.dragging = false; container.classList.remove('is-dragging'); };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  }

  /* ---------------- レーダーチャート ---------------- */
  // opts: { labels:[5], self:[5]|null, others:[5]|null, selfName:'自分' }
  function radar(root, o) {
    root.textContent = '';
    var W = 560, H = 470, cx = 280, cy = 238, R = 150, N = o.labels.length;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'radar', role: 'img',
      'aria-label': 'レーダーチャート：' + o.labels.map(function (l, i) {
        return l + (o.self ? ' ' + o.selfName + fmt(o.self[i]) : '') + (o.others ? ' 周り' + fmt(o.others[i]) : '');
      }).join('、') });
    function pt(i, v) { var a = -Math.PI / 2 + i * 2 * Math.PI / N, r = R * v / 5; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
    function pts(arr) { return arr.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' '); }

    var grid = svgEl('g', { class: 'radar__grid' });
    for (var l = 1; l <= 5; l++) {
      var ring = []; for (var i = 0; i < N; i++) ring.push(pt(i, l));
      grid.appendChild(svgEl('polygon', { points: pts(ring), class: l === 5 ? 'is-outer' : '' }));
    }
    for (i = 0; i < N; i++) { var e = pt(i, 5); grid.appendChild(svgEl('line', { x1: cx, y1: cy, x2: e[0], y2: e[1] })); }
    for (l = 1; l <= 5; l++) { var p = pt(0, l); grid.appendChild(svgEl('text', { x: p[0] + 7, y: p[1] + 4, class: 'radar__tick' }, String(l))); }
    svg.appendChild(grid);

    function series(vals, cls, name, delay) {
      if (!vals) return;
      var g = svgEl('g', { class: 'radar__series ' + cls });
      g.style.transformOrigin = cx + 'px ' + cy + 'px';
      g.style.transitionDelay = delay + 's';
      var P = vals.map(function (v, i) { return pt(i, v || 0); });
      g.appendChild(svgEl('polygon', { points: pts(P) }));
      P.forEach(function (q, i) {
        var c = svgEl('circle', { cx: q[0], cy: q[1], r: 6 });
        c.appendChild(svgEl('title', null, name + '：' + o.labels[i] + ' ' + fmt(vals[i])));
        g.appendChild(c);
      });
      svg.appendChild(g);
    }
    series(o.others, 'others', '周りの人', 0.18);
    series(o.self, 'self', o.selfName, 0);

    for (i = 0; i < N; i++) {
      var q = pt(i, 6.2);
      var anchor = Math.abs(q[0] - cx) < 12 ? 'middle' : (q[0] > cx ? 'start' : 'end');
      var lines = [{ t: o.labels[i], c: 'radar__label' }];
      if (o.self) lines.push({ t: o.selfName + ' ' + fmt(o.self[i]), c: 'radar__val' });
      if (o.others) lines.push({ t: '周り ' + fmt(o.others[i]), c: 'radar__val' });
      var y0 = q[1] + 5 - (i === 0 ? (lines.length - 1) * 18 : (Math.abs(q[0] - cx) < 12 ? 0 : (lines.length - 1) * 9));
      var t = svgEl('text', { x: q[0], y: y0, 'text-anchor': anchor });
      lines.forEach(function (ln, k) {
        t.appendChild(svgEl('tspan', { x: q[0], dy: k ? 18 : 0, class: ln.c }, ln.t));
      });
      svg.appendChild(t);
    }
    root.appendChild(svg);
    if (CAPTURE || REDUCED) svg.classList.add('is-drawn');
    else onVisible(svg, function (v) { if (v) requestAnimationFrame(function () { svg.classList.add('is-drawn'); }); }, 0.3);
  }

  /* ---------------- 層のレーダー（HoloLayers） ----------------
     opts: { cycle:true（層が重なっては離れる。トップ用）, gapLine:1.0 }
     set(self, others, { labels, selfName, layerNames }) */
  function HoloLayers(container, opts) {
    opts = opts || {};
    if (!hasWebGL()) { container.classList.add('is-fallback'); return { set: function () {} }; }
    var T = window.THREE;
    var renderer = makeRenderer(T, container, 'holo-layers__canvas');
    if (!renderer) { container.classList.add('is-fallback'); return { set: function () {} }; }
    var labelLayer = document.createElement('div');
    labelLayer.className = 'holo-layers__labels'; labelLayer.setAttribute('aria-hidden', 'true');
    container.appendChild(labelLayer);

    var C_INK = new T.Color('#24306e'), C_SELF = new T.Color('#0b22b8'), C_OTH = new T.Color('#a88b4a'), C_GLOW = new T.Color('#c9a95c');
    var scene = new T.Scene();
    var camera = new T.PerspectiveCamera(28, 1, 0.1, 200);
    var stage = new T.Group(); scene.add(stage);      // 層の積み重ね全体（少し斜めに傾ける）
    var Y_AXIS = new T.Vector3(0, 1, 0), yaw = 0;      // 各層は自分の中心で左右にゆれる・ドラッグで回る
    stage.rotation.z = -0.04;

    var R = 1.9, N = 5, GAP = 1.32, DX = 0.6, NL = 4, GAP_LINE = opts.gapLine || 1.0;
    function ang(i) { return -Math.PI / 2 + i * 2 * Math.PI / N; }
    function vtx(i, v, y) { var r = R * v / 5; return new T.Vector3(Math.cos(ang(i)) * r, y || 0, Math.sin(ang(i)) * r); }
    function lineMat(c, o) { return new T.LineBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false }); }
    function fillMat(c, o) { return new T.MeshBasicMaterial({ color: c, transparent: true, opacity: o, side: T.DoubleSide, depthWrite: false }); }
    function lineOf(pts, mat, closed) { var g = new T.BufferGeometry().setFromPoints(pts); return closed ? new T.LineLoop(g, mat) : new T.Line(g, mat); }
    function circlePts(r, a0, a1, seg) { var p = []; for (var i = 0; i <= seg; i++) { var t = a0 + (a1 - a0) * i / seg; p.push(new T.Vector3(Math.cos(t) * r, 0, Math.sin(t) * r)); } return p; }
    function pentagon(v) { var p = []; for (var i = 0; i < N; i++) p.push(vtx(i, v, 0)); return p; }
    function polyMesh(vals, mat) {
      var s = new T.Shape();
      vals.forEach(function (v, i) { var q = vtx(i, v || 0, 0); if (i) s.lineTo(q.x, -q.z); else s.moveTo(q.x, -q.z); });
      var m = new T.Mesh(new T.ShapeGeometry(s), mat); m.rotation.x = -Math.PI / 2; return m;
    }
    function sprite(color, size, opacity) {
      var s = new T.Sprite(new T.SpriteMaterial({ map: dotTexture(T), color: color, transparent: true, opacity: opacity, depthWrite: false }));
      s.scale.set(size, size, 1); return s;
    }

    /* 層の骨組み：どの層にも「外周の五角形」と「切れ目のある円」。土台の層だけ目盛り・格子 */
    var layers = [];
    for (var li = 0; li < NL; li++) {
      var g = new T.Group(); stage.add(g);
      var frm = new T.Group(); g.add(frm);
      var base = li === 0;
      frm.add(new T.Mesh(new T.CircleGeometry(R * 1.2, 96), fillMat(C_INK, base ? 0.05 : 0.022)).rotateX(-Math.PI / 2));
      frm.add(lineOf(pentagon(5), lineMat(C_INK, base ? 0.3 : 0.16), true));
      var arcs = new T.Group(); frm.add(arcs);
      for (var k = 0; k < 3; k++) {
        var a0 = k * Math.PI * 2 / 3 + (li * 0.5);
        arcs.add(lineOf(circlePts(R * 1.2, a0, a0 + Math.PI * 0.5, 40), lineMat(C_INK, base ? 0.34 : 0.2)));
      }
      if (base) {
        for (var lv = 1; lv < 5; lv++) frm.add(lineOf(pentagon(lv), lineMat(C_INK, 0.11), true));
        for (var i = 0; i < N; i++) frm.add(lineOf([new T.Vector3(0, 0, 0), vtx(i, 5, 0)], lineMat(C_INK, 0.12)));
        var tk = [];
        for (i = 0; i < 90; i++) {
          var t = i / 90 * Math.PI * 2, r1 = R * 1.26, r2 = i % 6 ? R * 1.3 : R * 1.36;
          tk.push(new T.Vector3(Math.cos(t) * r1, 0, Math.sin(t) * r1), new T.Vector3(Math.cos(t) * r2, 0, Math.sin(t) * r2));
        }
        frm.add(new T.LineSegments(new T.BufferGeometry().setFromPoints(tk), lineMat(C_INK, 0.22)));
      }
      var data = new T.Group(); g.add(data);
      g.renderOrder = li;
      layers.push({ g: g, frame: frm, arcs: arcs, data: data, y: li * GAP, heat: 0, appear: 0, dots: [], mats: [] });
    }
    // 層をつらぬく縦の線（外周の頂点と中心）
    var verts = new T.Group(); stage.add(verts);
    var TOPY = (NL - 1) * GAP;
    var vLines = [];
    function blank(n) { var p = []; for (var j = 0; j < n; j++) p.push(new T.Vector3()); return p; }
    for (i = 0; i < N; i++) {
      var vl = lineOf(blank(NL), lineMat(C_INK, 0.1)); verts.add(vl); vLines.push({ line: vl, i: i });
    }
    var axis = lineOf(blank(NL + 1), lineMat(C_INK, 0.18)); verts.add(axis);
    // 層の中の点を、積み重ね全体（stage）の座標へ
    function toStage(L, v) { return v.clone().applyAxisAngle(Y_AXIS, yaw).add(L.g.position); }
    // 走査する光の輪
    var scan = new T.Group(); stage.add(scan);
    var scanRing = lineOf(circlePts(R * 1.24, 0, Math.PI * 2, 120), lineMat(C_GLOW, 0.0), true); scan.add(scanRing);
    var scanDisc = new T.Mesh(new T.RingGeometry(R * 0.2, R * 1.24, 96), fillMat(C_GLOW, 0)); scanDisc.rotation.x = -Math.PI / 2; scan.add(scanDisc);
    // 差をつなぐ線（自分の層の頂点 → 周りの層の頂点）
    var links = new T.Group(); stage.add(links);

    /* ラベル */
    var areaLabels = [], layerLabels = [];
    function mk(cls, html) { var d = document.createElement('div'); d.className = cls; d.innerHTML = html; labelLayer.appendChild(d); return d; }
    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

    var info = {}, hasOthers = false, markers = [];
    function clearGroup(grp) { while (grp.children.length) grp.remove(grp.children[0]); }

    function set(self, others, inf) {
      info = inf || {};
      hasOthers = !!others;
      layers.forEach(function (L) { clearGroup(L.data); L.dots = []; L.mats = []; });
      clearGroup(links); markers = [];
      labelLayer.textContent = ''; areaLabels = []; layerLabels = [];
      var names = info.layerNames || ['5つの領域', (info.selfName || '自分') + 'の声', '周りの声', '重ねて見える価値'];

      function addSeries(L, vals, color, fillO) {
        var fm = fillMat(color, fillO); var lm = lineMat(color, 0.95);
        var mesh = polyMesh(vals, fm); mesh.position.y = 0.004; L.data.add(mesh);
        L.data.add(lineOf(vals.map(function (v, i) { return vtx(i, v || 0, 0.006); }), lm, true));
        L.mats.push({ m: fm, o: fillO }, { m: lm, o: 0.95 });
        vals.forEach(function (v, i) {
          var p = vtx(i, v || 0, 0.01);
          var core = new T.Mesh(new T.SphereGeometry(0.055, 14, 10), new T.MeshBasicMaterial({ color: color, transparent: true, opacity: 1 }));
          core.position.copy(p); L.data.add(core);
          var glow = sprite(color, 0.42, 0.35); glow.position.copy(p); L.data.add(glow);
          L.dots.push({ core: core, glow: glow });
          L.mats.push({ m: core.material, o: 1 }, { m: glow.material, o: 0.35 });
        });
      }
      // 1：自分の声
      if (self) addSeries(layers[1], self, C_SELF, 0.17);
      // 2：周りの声（まだなければ、点線の「待っている」形）
      if (others) addSeries(layers[2], others, C_OTH, 0.22);
      else {
        var dm = new T.LineDashedMaterial({ color: C_OTH, dashSize: 0.14, gapSize: 0.1, transparent: true, opacity: 0.75, depthWrite: false });
        var dl = lineOf(pentagon(3.2).map(function (p) { p.y = 0.006; return p; }), dm, true); dl.computeLineDistances();
        layers[2].data.add(dl); layers[2].mats.push({ m: dm, o: 0.75, pulse: true });
        var q = sprite(C_OTH, 0.9, 0.25); q.position.set(0, 0.02, 0); layers[2].data.add(q); layers[2].mats.push({ m: q.material, o: 0.25, pulse: true });
      }
      // 3：重ねて見える価値（2つの輪郭を重ね、差が大きい領域を光らせる）
      var L3 = layers[3];
      if (self && others) {
        [[self, C_SELF], [others, C_OTH]].forEach(function (s) {
          var lm = lineMat(s[1], 0.7); L3.data.add(lineOf(s[0].map(function (v, i) { return vtx(i, v || 0, 0.006); }), lm, true)); L3.mats.push({ m: lm, o: 0.7 });
          var fm = fillMat(s[1], 0.08); var mesh = polyMesh(s[0], fm); L3.data.add(mesh); L3.mats.push({ m: fm, o: 0.08 });
        });
        self.forEach(function (v, i) {
          var d = Math.round(((others[i] || 0) - (v || 0)) * 10) / 10;
          if (Math.abs(d) < GAP_LINE - 0.001) return;
          var hidden = d > 0, col = hidden ? C_OTH : C_SELF;
          var p = vtx(i, hidden ? others[i] : v, 0.02);
          var halo = sprite(col, 0.9, 0.5); halo.position.copy(p); L3.data.add(halo);
          var ring = lineOf(circlePts(0.2, 0, Math.PI * 2, 40), lineMat(col, 0.9), true); ring.position.copy(p); L3.data.add(ring);
          markers.push({ halo: halo, ring: ring, hidden: hidden, i: i, p: p.clone(), d: d });
          L3.mats.push({ m: halo.material, o: 0.5 }, { m: ring.material, o: 0.9 });
        });
        // 差をつなぐ縦の線
        self.forEach(function (v, i) {
          var ln = lineOf([vtx(i, v || 0, 0), vtx(i, others[i] || 0, 0)], lineMat(C_INK, 0.28));
          ln.userData.i = i; ln.userData.v = [v || 0, others[i] || 0]; links.add(ln);
        });
      } else {
        var gm = new T.LineDashedMaterial({ color: C_INK, dashSize: 0.1, gapSize: 0.12, transparent: true, opacity: 0.3, depthWrite: false });
        var gl = lineOf(pentagon(5).map(function (p) { p.y = 0.006; return p; }), gm, true); gl.computeLineDistances();
        L3.data.add(gl); L3.mats.push({ m: gm, o: 0.3 });
      }

      // ラベル：いちばん上の層で光っている領域の名前（土台に全部並べると、上の層と重なって読めないため）
      markers.forEach(function (m) {
        var name = (info.labels || [])[m.i] || '';
        var d = mk('holo-layers__area ' + (m.hidden ? 'is-gold' : 'is-navy'), '<b>' + esc(name) + '</b><small>' + (m.d > 0 ? '+' : '') + m.d.toFixed(1) + '</small>');
        areaLabels.push({ el: d, m: m });
      });
      // ラベル：層の名前（右側）
      var subs = info.layerSubs || [
        '',
        '',
        others ? '' : '集まると、ここに重なります',
        others ? '<em><i class="k-gold"></i>気づいていない価値</em><em><i class="k-navy"></i>まだ伝わっていない価値</em>' : '周りの声と重ねると見えてきます'
      ];
      names.forEach(function (nm, k) {
        var d = mk('holo-layers__layer' + (k === 3 ? ' is-insight' : '') + (k === 2 && !others ? ' is-wait' : ''),
          '<span>LAYER 0' + (k + 1) + '</span><b>' + esc(nm) + '</b>' + (subs[k] ? '<small>' + subs[k] + '</small>' : ''));
        layerLabels.push({ el: d, k: k });
      });
      t0 = 0; started = false;
      if (CAPTURE || REDUCED) layers.forEach(function (L) { L.appear = 1; });
      else layers.forEach(function (L) { L.appear = 0; });
    }

    /* ドラッグ */
    var st = { drag: 0, vel: 0, dragging: false, moved: 0 };
    dragYaw(renderer.domElement, container, st);

    /* サイズとカメラ */
    var w0 = 0, h0 = 0;
    function resize() {
      var w = container.clientWidth, h = container.clientHeight;
      if (!w || !h) return false;
      if (w === w0 && h === h0) return true;
      w0 = w; h0 = h;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      var narrow = w < 520;
      // 層と右側のラベルが収まる距離（横の半幅・縦の半高から）
      var tanV = Math.tan(camera.fov / 2 * Math.PI / 180);
      var halfW = narrow ? 3.75 : 4.6, halfH = 3.4;
      var d = Math.max(halfH / tanV, halfW / (tanV * camera.aspect));
      var E = 0.28, lx = narrow ? 0.85 : 1.15;
      camera.position.set(lx, d * Math.sin(E) + TOPY * 0.5, d * Math.cos(E));
      camera.lookAt(lx, TOPY * 0.5 + 0.22, 0);
      camera.updateProjectionMatrix();
      return true;
    }

    /* 描画 */
    var tmp = new T.Vector3(), t0 = 0, started = false, visible = false;
    function project(v) { tmp.copy(v).project(camera); return { x: (tmp.x + 1) / 2 * w0, y: (1 - tmp.y) / 2 * h0, z: tmp.z }; }
    function draw(now) {
      var t = started ? (now - t0) / 1000 : 0;
      if (CAPTURE) t = 30;
      // 登場：層が順に立ち上がる
      layers.forEach(function (L, k) { L.appear = (CAPTURE || REDUCED) ? 1 : ease((t - 0.25 - k * 0.32) / 1.1); });
      // 重なっては離れる（トップ用）。g：1＝離れている、0.08＝ほぼ重なる
      var g = 1;
      if (opts.cycle && !REDUCED && !CAPTURE) {
        var P = 11, u = ((t - 3.2) % P + P) % P;
        if (t > 3.2) {
          if (u > 6.4 && u < 7.6) g = 1 - smooth((u - 6.4) / 1.2) * 0.92;
          else if (u >= 7.6 && u < 9.2) g = 0.08;
          else if (u >= 9.2 && u < 10.6) g = 0.08 + smooth((u - 9.2) / 1.4) * 0.92;
        }
      }
      var mid = TOPY * 0.5, X0 = -(NL - 1) * DX / 2;
      // 左右のゆれ＋ドラッグ（各層が自分の中心で回る）
      if (!st.dragging) { st.vel *= 0.93; st.drag += st.vel; }
      yaw = (REDUCED || CAPTURE ? 0.22 : 0.22 + Math.sin(t * 0.22) * 0.3) + st.drag;
      // 走査の光：下の層から上の層へ、斜めの並びに沿って昇る
      var sp = 4.2, su = CAPTURE ? 0.42 : ((t * 1) % (sp + 1.6)) / sp;
      var scanY = -0.2 + su * (TOPY + 0.6);
      var scanOn = su <= 1 && g > 0.6 ? Math.sin(Math.PI * Math.min(1, su)) : 0;
      scan.position.set(X0 + (scanY / GAP) * DX, scanY, 0);
      scanRing.material.opacity = 0.55 * scanOn; scanDisc.material.opacity = 0.06 * scanOn;

      layers.forEach(function (L, k) {
        var a = L.appear;
        var y = (mid + (L.y - mid) * g) * a;
        var xk = (X0 + k * DX) * g;
        L.g.position.set(X0 + (xk - X0) * a, y, 0);
        L.g.rotation.y = yaw;
        L.heat += ((g > 0.6 ? Math.max(0, 1 - Math.abs(scanY - L.y) / 0.55) * scanOn : 0) - L.heat) * 0.15;
        var vis = k === 0 ? Math.max(a, 0.001) : a;
        L.frame.children.forEach(function (c) {
          if (c.material) { if (c.userData.o == null) c.userData.o = c.material.opacity; c.material.opacity = c.userData.o * vis * (1 + L.heat * 0.9); }
        });
        L.arcs.rotation.y = (k % 2 ? -1 : 1) * t * 0.08;
        L.arcs.children.forEach(function (c) { if (c.userData.o == null) c.userData.o = c.material.opacity; c.material.opacity = c.userData.o * vis * (1 + L.heat * 1.4); });
        var sc = 0.001 + a;
        L.data.scale.set(sc, 1, sc);
        L.mats.forEach(function (mm) {
          var p = mm.pulse ? 0.55 + 0.45 * Math.sin(t * 2.4) : 1;
          mm.m.opacity = Math.min(1, mm.o * a * p * (1 + L.heat * 0.8));
        });
        L.dots.forEach(function (d) { var s = 0.42 * (1 + L.heat * 0.7); d.glow.scale.set(s, s, 1); });
      });
      markers.forEach(function (m, k) {
        var u = (t * 0.6 + k * 0.23) % 1;
        var s = 0.25 + u * 0.55; m.ring.scale.set(s, s, s);
        m.ring.material.opacity = 0.9 * (1 - u) * layers[3].appear;
        var hs = 0.8 + Math.sin(t * 2.2 + k) * 0.12; m.halo.scale.set(hs, hs, 1);
      });
      // 縦の線と差の線
      vLines.forEach(function (o) {
        var p = o.line.geometry.attributes.position;
        layers.forEach(function (L, k) { var q = toStage(L, vtx(o.i, 5, 0)); p.setXYZ(k, q.x, q.y, q.z); });
        p.needsUpdate = true;
        o.line.material.opacity = 0.12 * layers[NL - 1].appear;
      });
      var ap = axis.geometry.attributes.position;
      ap.setXYZ(0, layers[0].g.position.x, -0.35, 0);
      layers.forEach(function (L, k) { ap.setXYZ(k + 1, L.g.position.x, L.g.position.y + (k === NL - 1 ? 0.4 : 0), 0); });
      ap.needsUpdate = true;
      links.children.forEach(function (ln) {
        var p = ln.geometry.attributes.position, i = ln.userData.i, v = ln.userData.v;
        var a1 = layers[1].appear, a2 = layers[2].appear;
        var A = toStage(layers[1], vtx(i, v[0] * a1, 0)), B = toStage(layers[2], vtx(i, v[1] * a2, 0));
        p.setXYZ(0, A.x, A.y, A.z); p.setXYZ(1, B.x, B.y, B.z); p.needsUpdate = true;
        ln.material.opacity = 0.32 * Math.min(a1, a2) * g;
      });

      scene.updateMatrixWorld();
      renderer.render(scene, camera);

      // ラベル
      var L3 = layers[NL - 1];
      var c3 = project(new T.Vector3().applyMatrix4(L3.g.matrixWorld));
      areaLabels.forEach(function (lb) {
        var wp = lb.m.p.clone(); wp.x *= L3.appear; wp.z *= L3.appear; wp.applyMatrix4(L3.g.matrixWorld);
        var q = project(wp), lw = lb.el.offsetWidth, lh = lb.el.offsetHeight, hw = lw / 2 + 2;
        // 層の中心から外へ押し出す（隣どうしの名前が重ならないように）
        // 奥の点は上へ、手前の点は下へ。横へは少しだけ（右側の層の名前とぶつからないように）
        var dx = q.x - c3.x, len = Math.abs(dx) || 1, up = q.y <= c3.y;
        var x = q.x + dx / len * Math.min(lw * 0.22, Math.abs(dx) * 0.3), y = q.y + (up ? -1 : 1) * (lh * 0.5 + 9);
        x = Math.min(w0 - hw, Math.max(hw, x)); y = Math.min(h0 - lh / 2, Math.max(lh / 2 + 2, y));
        lb.el.style.transform = 'translate(-50%,-50%) translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
        // 狭い枠（スマホの比較など）では名前が重なるので出さない。光と下の凡例で伝える
        lb.el.style.opacity = w0 < 330 ? '0' : (L3.appear * smooth((g - 0.45) / 0.4)).toFixed(2);
      });
      layerLabels.forEach(function (lb) {
        var L = layers[lb.k];
        var wp = new T.Vector3(L.g.position.x + R * 1.38, L.g.position.y, R * 0.3); wp.applyMatrix4(stage.matrixWorld);
        var q = project(wp), lw = lb.el.offsetWidth;
        var x = Math.min(w0 - lw - 4, q.x), y = q.y + (lb.k === NL - 1 ? 12 : 0);
        lb.el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) translateY(-50%)';
        lb.el.style.opacity = (L.appear * smooth((g - 0.45) / 0.4)).toFixed(2);
        lb.el.classList.toggle('is-lit', L.heat > 0.35);
      });
    }

    onVisible(container, function (v) {
      visible = v;
      if (v && CAPTURE) { resize(); started = true; draw(performance.now()); }
    }, 0.2);
    function frame(now) {
      requestAnimationFrame(frame);
      if (!visible || !resize()) return;
      if (!started) { started = true; t0 = now; }
      draw(now);
    }
    requestAnimationFrame(frame);
    return { set: set };
  }

  /* ---------------- 5つの領域のホログラム（HoloMap） ----------------
     EQ Platform の MAP（js/holo.js）と同じ作り：投影装置の台座・光の円錐・フレネルで縁が光る球・
     つながりの上を流れる光・漂う粒子・HTML のラベル・何も触っていない間は順番に照らして案内する。
     opts: { labels:[5], icons:[5], coreLabel:'らしさ', onStep:function(i) } */
  function HoloMap(container, opts) {
    var N = opts.labels.length, current = -1;
    function step(i) { if (i !== current) { current = i; if (opts.onStep) opts.onStep(i); } }

    if (!hasWebGL()) {
      container.classList.add('is-fallback');
      var k0 = 0; step(0);
      if (!REDUCED) setInterval(function () { k0 = (k0 + 1) % N; step(k0); }, 3200);
      return { jump: function (i) { k0 = i; step(i); } };
    }
    var T = window.THREE;
    var renderer = makeRenderer(T, container, 'holo-map__canvas');
    if (!renderer) { container.classList.add('is-fallback'); step(0); return { jump: step }; }
    var labelsEl = document.createElement('div'); labelsEl.className = 'holo-map__labels'; labelsEl.setAttribute('aria-hidden', 'true');
    container.appendChild(labelsEl);

    var GOLD = new T.Color('#e2c27a'), WARM = new T.Color('#ffe2a6'), BLUE = new T.Color('#7d90ff'),
      CORE = new T.Color('#dfe6ff'), FRAME = new T.Color('#8a93c8');
    var scene = new T.Scene();
    var camera = new T.PerspectiveCamera(34, 1, 0.1, 100);
    var world = new T.Group(); scene.add(world);
    function add(o) { world.add(o); return o; }
    function glowMat(color, opacity) { return new T.MeshBasicMaterial({ color: color, transparent: true, opacity: opacity, blending: T.AdditiveBlending, depthWrite: false }); }
    function lineMat(color, opacity) { return new T.LineBasicMaterial({ color: color, transparent: true, opacity: opacity, blending: T.AdditiveBlending, depthWrite: false }); }
    function halo(color, size, opacity) {
      var s = new T.Sprite(new T.SpriteMaterial({ map: dotTexture(T), color: color, transparent: true, opacity: opacity, blending: T.AdditiveBlending, depthWrite: false }));
      s.scale.set(size, size, 1); return s;
    }
    function circle(r, y, seg, color, opacity) {
      var p = []; for (var i = 0; i <= seg; i++) { var t = i / seg * Math.PI * 2; p.push(new T.Vector3(Math.cos(t) * r, y, Math.sin(t) * r)); }
      return add(new T.Line(new T.BufferGeometry().setFromPoints(p), lineMat(color, opacity)));
    }
    var R = 2.75, BASE = -1.35;
    function ang(i) { return -Math.PI / 2 + i * 2 * Math.PI / N; }
    function onRing(a, r, y) { return new T.Vector3(Math.cos(a) * r, y || 0, Math.sin(a) * r); }

    /* 台座（投影装置）と光の円錐 */
    [0.35, 0.62, 0.9].forEach(function (r, i) { circle(r, BASE, 96, FRAME, 0.5 - i * 0.12); });
    var ticks = [];
    for (var i = 0; i < 60; i++) {
      var t = i / 60 * Math.PI * 2, r0 = 1.0, r1 = i % 5 ? 1.08 : 1.2;
      ticks.push(new T.Vector3(Math.cos(t) * r0, BASE, Math.sin(t) * r0), new T.Vector3(Math.cos(t) * r1, BASE, Math.sin(t) * r1));
    }
    var tickRing = add(new T.LineSegments(new T.BufferGeometry().setFromPoints(ticks), lineMat(FRAME, 0.45)));
    var emitter = add(halo(BLUE, 1.6, 0.45)); emitter.position.set(0, BASE, 0);
    var cone = add(new T.Mesh(
      new T.CylinderGeometry(R * 1.02, 0.5, -BASE + 0.25, 48, 1, true),
      new T.ShaderMaterial({
        transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide,
        uniforms: { uColor: { value: FRAME }, uTime: { value: 0 } },
        vertexShader: 'varying float vY; void main(){ vY = uv.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: 'uniform vec3 uColor; uniform float uTime; varying float vY; void main(){ float a = (1.0 - vY) * 0.06 + 0.008; a *= 0.85 + 0.15 * sin(vY * 60.0 - uTime * 3.0); gl_FragColor = vec4(uColor, a); }'
      })
    ));
    cone.position.y = (BASE + 0.25) / 2;
    add(new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(0, BASE, 0), new T.Vector3(0, 0.9, 0)]), lineMat(CORE, 0.3)));

    /* 中心：らしさ（ワイヤーの多面体＋グロー） */
    var core = add(new T.LineSegments(new T.WireframeGeometry(new T.IcosahedronGeometry(0.55, 1)), lineMat(CORE, 0.6)));
    var coreIn = add(new T.Mesh(new T.SphereGeometry(0.2, 24, 16), new T.MeshBasicMaterial({ color: 0xffffff })));
    var coreGlow = add(halo(BLUE, 2.4, 0.5));

    /* 5つの領域をめぐる輪（太く見せるため、チューブ＋外側のぼかし）と、その上を回る光 */
    var ringCurve = new T.CatmullRomCurve3(Array.from({ length: 64 }, function (_, i) { return onRing(i / 64 * Math.PI * 2, R, 0); }), true);
    var ringTube = add(new T.Mesh(new T.TubeGeometry(ringCurve, 256, 0.012, 6, true), glowMat(GOLD, 0.6)));
    var ringGlow = add(new T.Mesh(new T.TubeGeometry(ringCurve, 256, 0.05, 8, true), glowMat(GOLD, 0.1)));
    circle(R * 1.32, 0, 160, FRAME, 0.12);
    circle(R * 0.55, 0, 120, FRAME, 0.14);

    /* ノード：フレネルの球（縁が光る）＋アイコン＋グロー＋回る輪 */
    function fresnel(color) {
      return new T.ShaderMaterial({
        transparent: true, depthWrite: false, blending: T.AdditiveBlending,
        uniforms: { uColor: { value: color }, uPower: { value: 1 } },
        vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
        fragmentShader: 'uniform vec3 uColor; uniform float uPower; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0 - abs(dot(vN, vV)), 2.0); gl_FragColor = vec4(uColor, (f * 1.15 + 0.05) * uPower); }'
      });
    }
    var loader = new T.TextureLoader();
    var nodes = [], pickables = [];
    for (i = 0; i < N; i++) {
      var g = new T.Group(); g.position.copy(onRing(ang(i), R, 0)); add(g);
      var shell = new T.Mesh(new T.SphereGeometry(0.44, 40, 28), fresnel(GOLD));
      var glow = halo(GOLD, 1.7, 0.4);
      var orbit = new T.Line(new T.BufferGeometry().setFromPoints(Array.from({ length: 65 }, function (_, j) { var a = j / 64 * Math.PI * 2; return new T.Vector3(Math.cos(a) * 0.62, Math.sin(a) * 0.62, 0); })), lineMat(WARM, 0.5));
      var hit = new T.Mesh(new T.SphereGeometry(0.7, 12, 8), new T.MeshBasicMaterial({ visible: false }));
      hit.userData.i = i;
      g.add(glow, shell, orbit, hit);
      var icon = null;
      if (opts.icons && opts.icons[i]) {
        icon = new T.Sprite(new T.SpriteMaterial({ map: loader.load(opts.icons[i]), transparent: true, depthWrite: false, opacity: 0.92 }));
        icon.scale.set(0.74, 0.74, 1); g.add(icon);
      } else g.add(new T.Mesh(new T.SphereGeometry(0.11, 16, 12), new T.MeshBasicMaterial({ color: 0xffffff })));
      pickables.push(hit);
      // らしさ → 領域へ流れる光の線
      var A = new T.Vector3(0, 0, 0), B = onRing(ang(i), R - 0.5, 0);
      var spoke = new T.LineCurve3(A, B);
      var tube = add(new T.Mesh(new T.TubeGeometry(spoke, 8, 0.008, 6, false), glowMat(BLUE, 0.45)));
      var pulses = [0, 0.5].map(function (o) { var p = add(halo(WARM, 0.32, 0.9)); p.userData.o = o; return p; });
      var lb = document.createElement('div'); lb.className = 'holo-map__label';
      lb.innerHTML = '<span>0' + (i + 1) + '</span><b>' + opts.labels[i] + '</b>';
      labelsEl.appendChild(lb);
      nodes.push({ i: i, g: g, shell: shell, glow: glow, orbit: orbit, icon: icon, tube: tube, spoke: spoke, pulses: pulses, el: lb, heat: 0 });
    }
    var ringPulses = Array.from({ length: 5 }, function (_, k) { var p = add(halo(WARM, 0.36, 0.9)); p.userData.o = k / 5; return p; });
    var coreLabel = document.createElement('div'); coreLabel.className = 'holo-map__core'; coreLabel.innerHTML = '<span>CORE</span><b>' + (opts.coreLabel || 'らしさ') + '</b>';
    labelsEl.appendChild(coreLabel);

    /* 漂う光の粒子（それぞれの位相でかすかに明滅） */
    var PN = 380;
    var pPos = new Float32Array(PN * 3), pPhase = new Float32Array(PN), pSize = new Float32Array(PN);
    for (i = 0; i < PN; i++) {
      var rr = Math.sqrt(Math.random()) * 5, tt = Math.random() * Math.PI * 2;
      pPos[i * 3] = Math.cos(tt) * rr; pPos[i * 3 + 1] = BASE + Math.random() * 3.4; pPos[i * 3 + 2] = Math.sin(tt) * rr;
      pPhase[i] = Math.random() * Math.PI * 2; pSize[i] = 0.6 + Math.random() * 1.5;
    }
    var pGeo = new T.BufferGeometry();
    pGeo.setAttribute('position', new T.BufferAttribute(pPos, 3));
    pGeo.setAttribute('aPhase', new T.BufferAttribute(pPhase, 1));
    pGeo.setAttribute('aSize', new T.BufferAttribute(pSize, 1));
    var pMat = new T.ShaderMaterial({
      transparent: true, depthWrite: false, blending: T.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uTex: { value: dotTexture(T) }, uPx: { value: renderer.getPixelRatio() } },
      vertexShader: 'attribute float aPhase; attribute float aSize; uniform float uTime; uniform float uPx; varying float vA; void main(){ vec3 p = position; p.y += sin(uTime * 0.3 + aPhase) * 0.12; vec4 mv = modelViewMatrix * vec4(p,1.0); vA = 0.2 + 0.8 * pow(0.5 + 0.5 * sin(uTime * 1.6 + aPhase * 3.0), 3.0); gl_PointSize = aSize * uPx * (14.0 / -mv.z); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform sampler2D uTex; varying float vA; void main(){ vec4 t = texture2D(uTex, gl_PointCoord); gl_FragColor = vec4(vec3(1.0, 0.93, 0.78), t.a * vA * 0.6); }'
    });
    add(new T.Points(pGeo, pMat));

    /* 操作：ドラッグで回す・球にふれると照らす・タップでその領域へ */
    var st = { drag: 0, vel: 0, dragging: false, moved: 0 };
    var cv = renderer.domElement;
    dragYaw(cv, container, st);
    var ray = new T.Raycaster(), ptr = new T.Vector2(9, 9), hover = -1;
    function setPtr(e) { var r = cv.getBoundingClientRect(); ptr.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); }
    function pick() { ray.setFromCamera(ptr, camera); var h = ray.intersectObjects(pickables, false)[0]; return h ? h.object.userData.i : -1; }
    cv.addEventListener('pointermove', setPtr);
    cv.addEventListener('pointerleave', function () { ptr.set(9, 9); });
    cv.addEventListener('pointerup', function (e) {
      if (st.moved > 6) return;
      setPtr(e); var n = pick(); if (n !== -1) jump(n);
    });

    var pinnedUntil = 0, tourAt = performance.now(), focus = 0;
    function jump(i) { focus = i; pinnedUntil = performance.now() + 7000; tourAt = performance.now(); step(i); }

    /* サイズ */
    var w0 = 0, h0 = 0;
    function resize() {
      var w = container.clientWidth, h = container.clientHeight;
      if (!w || !h) return false;
      if (w === w0 && h === h0) return true;
      w0 = w; h0 = h; renderer.setSize(w, h, false);
      camera.aspect = w / h;
      var tanV = Math.tan(camera.fov / 2 * Math.PI / 180);
      var halfW = R * 1.32 + 0.4, halfH = 2.35;
      var d = Math.max(halfW / (tanV * camera.aspect), halfH / tanV) + 1.2;
      camera.position.set(0, d * 0.44, d * 0.9);
      camera.lookAt(0, -0.25, 0);
      camera.updateProjectionMatrix();
      return true;
    }

    var tmp = new T.Vector3(), visible = false, last = 0, tAcc = 0;
    function toScreen(v) { tmp.copy(v).project(camera); return { x: (tmp.x + 1) / 2 * w0, y: (1 - tmp.y) / 2 * h0, z: tmp.z }; }
    function draw(now, dt) {
      var t = tAcc;
      // ホバー → 照らす。触れていない間は順番に照らして案内
      var hp = ptr.x < 2 ? pick() : -1;
      if (hp !== hover) { hover = hp; container.classList.toggle('is-pointing', hp !== -1); if (hp !== -1) { focus = hp; step(hp); pinnedUntil = now + 4000; } }
      if (!REDUCED && !CAPTURE && hover === -1 && now > pinnedUntil && now - tourAt > 3200) {
        tourAt = now; focus = (focus + 1) % N; step(focus);
      }
      nodes.forEach(function (n) {
        var on = n.i === focus ? 1 : 0;
        n.heat += (on - n.heat) * (1 - Math.pow(0.002, dt));
        var s = 1 + n.heat * 0.3 + Math.sin(t * 2 + n.i) * 0.02;
        n.g.scale.setScalar(s);
        n.shell.material.uniforms.uPower.value = 0.7 + n.heat * 1.2;
        n.glow.material.opacity = 0.32 + n.heat * 0.5;
        n.glow.scale.setScalar(1.7 + n.heat * 1.2);
        n.orbit.quaternion.copy(camera.quaternion);
        n.orbit.rotateX(1.1); n.orbit.rotateZ(t * 0.6 + n.i);
        n.orbit.material.opacity = 0.25 + n.heat * 0.6;
        n.tube.material.opacity = 0.18 + n.heat * 0.55;
        n.pulses.forEach(function (p) {
          var u = (t * (0.25 + n.heat * 0.25) + p.userData.o) % 1;
          p.position.copy(n.spoke.getPointAt(u));
          p.material.opacity = (0.35 + n.heat * 0.6) * Math.sin(Math.PI * u);
        });
      });
      ringPulses.forEach(function (p) {
        var u = (t * 0.045 + p.userData.o) % 1;
        p.position.copy(ringCurve.getPointAt(u));
        p.material.opacity = 0.75;
      });
      ringTube.material.opacity = 0.5 + Math.sin(t * 1.3) * 0.06;
      core.rotation.y = t * 0.35; core.rotation.x = t * 0.18;
      coreGlow.material.opacity = 0.45 + Math.sin(t * 1.7) * 0.08;
      tickRing.rotation.y = -t * 0.15;
      emitter.material.opacity = 0.4 + Math.sin(t * 2.3) * 0.1;
      cone.material.uniforms.uTime.value = t;
      pMat.uniforms.uTime.value = t;

      if (!st.dragging) { st.vel *= 0.93; st.drag += st.vel; }
      world.rotation.y = (REDUCED || CAPTURE ? 0 : t * 0.05) + st.drag;
      world.updateMatrixWorld();
      renderer.render(scene, camera);

      // ラベル：球の外側（中心から離れる向き）へ押し出す。手前の球と重ならないように。奥にあるものは薄く
      var c0 = toScreen(new T.Vector3(0, 0, 0));
      var rpx = Math.max(36, w0 * 0.1);
      nodes.forEach(function (n) {
        n.g.getWorldPosition(tmp);
        var q = toScreen(tmp.clone()), dx = q.x - c0.x, dy = q.y - c0.y, len = Math.sqrt(dx * dx + dy * dy) || 1;
        var ux = dx / len, uy = dy / len * 1.6; var ul = Math.sqrt(ux * ux + uy * uy); ux /= ul; uy /= ul;
        var lw = n.el.offsetWidth, lh = n.el.offsetHeight, hw = lw / 2 + 2;
        var x = q.x + ux * (rpx + lw * 0.35), y = q.y + uy * (rpx + lh * 0.3);
        x = Math.min(w0 - hw, Math.max(hw, x)); y = Math.min(h0 - lh / 2 - 4, Math.max(lh / 2 + 4, y));
        n.el.style.transform = 'translate(-50%,-50%) translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
        var gp = n.g.getWorldPosition(new T.Vector3()).applyMatrix4(camera.matrixWorldInverse);
        var depth = Math.min(1, Math.max(0, (-gp.z - (camera.position.length() - R)) / (2 * R)));
        n.el.style.opacity = (n.i === focus ? 1 : 1 - depth * 0.6).toFixed(2);
        n.el.style.zIndex = String(100 - Math.round(depth * 50));
        n.el.classList.toggle('is-lit', n.i === focus);
      });
      var cq = toScreen(new T.Vector3(0, -0.85, 0));
      coreLabel.style.transform = 'translate(-50%,0) translate(' + cq.x.toFixed(1) + 'px,' + cq.y.toFixed(1) + 'px)';
    }

    onVisible(container, function (v) { visible = v; if (v && CAPTURE) { focus = 1; step(1); resize(); for (var k = 0; k < 40; k++) draw(performance.now(), 0.05); } }, 0.15);
    function frame(now) {
      requestAnimationFrame(frame);
      if (!visible || !resize()) { last = now; return; }
      var dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
      if (!REDUCED && !CAPTURE) tAcc += dt;
      draw(now, dt);
    }
    requestAnimationFrame(frame);
    step(0);
    return { jump: jump };
  }

  /* ---------------- 人の姿と2重のオーラ（AuraFigure） ----------------
     中心に、光の粒でできた立体の人（性別を感じさせない形。正面・横・後ろのどこから見ても人に見える）。
     ・内側の青いオーラ … 自分の点数。体のすぐ外側を包む。点数が高い向きほど強い
     ・外側の金のオーラ … 周りの人の点数。内側とはっきり間をあけて、大きく包む
     ・足もとの青い玉と数字（内側の輪）／金の光と領域名（外側の輪）… 領域ごとの点数
     差が gapLine 以上の領域には印が付く。ドラッグで回せる。
     set(self, others, { labels, selfName, gapLine }) */
  function AuraFigure(container, opts) {
    opts = opts || {};
    if (!hasWebGL()) { container.classList.add('is-fallback'); return { set: function () {} }; }
    var T = window.THREE;
    var renderer = makeRenderer(T, container, 'aura__canvas');
    if (!renderer) { container.classList.add('is-fallback'); return { set: function () {} }; }
    var labelsEl = document.createElement('div'); labelsEl.className = 'aura__labels'; labelsEl.setAttribute('aria-hidden', 'true');
    container.appendChild(labelsEl);
    var waitEl = document.createElement('p'); waitEl.className = 'aura__wait'; waitEl.hidden = true;
    waitEl.textContent = '周りの声が集まると、外側に金の光の渦が巻きます';
    container.appendChild(waitEl);

    var SELF_C = new T.Color('#7f95ff'), OTH_C = new T.Color('#f0c978'), BODY_C = new T.Color('#dfe6ff'), FRAME = new T.Color('#8a93c8');
    var scene = new T.Scene();
    var camera = new T.PerspectiveCamera(30, 1, 0.1, 100);
    var world = new T.Group(); scene.add(world);
    function add(o) { world.add(o); return o; }
    function glowMat(c, o) { return new T.MeshBasicMaterial({ color: c, transparent: true, opacity: o, blending: T.AdditiveBlending, depthWrite: false }); }
    function lineMat(c, o) { return new T.LineBasicMaterial({ color: c, transparent: true, opacity: o, blending: T.AdditiveBlending, depthWrite: false }); }
    function halo(c, size, o) {
      var s = new T.Sprite(new T.SpriteMaterial({ map: dotTexture(T), color: c, transparent: true, opacity: o, blending: T.AdditiveBlending, depthWrite: false }));
      s.scale.set(size, size, 1); return s;
    }
    function ringPts(r, y, seg) { var p = []; for (var i = 0; i <= seg; i++) { var t = i / seg * Math.PI * 2; p.push(new T.Vector3(Math.cos(t) * r, y, Math.sin(t) * r)); } return p; }
    function ringLine(r, y, mat) { return add(new T.Line(new T.BufferGeometry().setFromPoints(ringPts(r, y, 180)), mat)); }
    var N = 5, AIN = 0.62, AOUT = 1.45, R1 = 1.0, R2 = 2.35;
    function ang(i) { return -Math.PI / 2 + i * 2 * Math.PI / N; }
    function onRing(i, r, y) { return new T.Vector3(Math.cos(ang(i)) * r, y || 0, Math.sin(ang(i)) * r); }

    /* 足もと：オーラの境目の輪・点数の輪・目盛り */
    var disc = add(new T.Mesh(new T.CircleGeometry(R2 * 1.2, 96), glowMat(FRAME, 0.03))); disc.rotation.x = -Math.PI / 2;
    var footIn = add(new T.Mesh(new T.CircleGeometry(AIN * 1.05, 64), glowMat(SELF_C, 0.08))); footIn.rotation.x = -Math.PI / 2; footIn.position.y = 0.006;
    var footOut = add(new T.Mesh(new T.RingGeometry(AOUT * 0.92, AOUT * 1.06, 96), glowMat(OTH_C, 0.07))); footOut.rotation.x = -Math.PI / 2; footOut.position.y = 0.006;
    ringLine(AIN * 1.05, 0.01, lineMat(SELF_C, 0.45));
    var footOutLine = ringLine(AOUT * 1.06, 0.01, lineMat(OTH_C, 0.4));
    var ring1 = ringLine(R1, 0.01, lineMat(SELF_C, 0.28));
    var ring2 = ringLine(R2, 0.01, lineMat(OTH_C, 0.28));
    var dashMat = new T.LineDashedMaterial({ color: OTH_C, dashSize: 0.12, gapSize: 0.12, transparent: true, opacity: 0.5, depthWrite: false });
    var ring2w = add(new T.Line(new T.BufferGeometry().setFromPoints(ringPts(R2, 0.012, 200)), dashMat)); ring2w.computeLineDistances();
    var tk = [];
    for (var i = 0; i < 90; i++) {
      var t0 = i / 90 * Math.PI * 2, ra = R2 * 1.12, rb = i % 6 ? R2 * 1.15 : R2 * 1.19;
      tk.push(new T.Vector3(Math.cos(t0) * ra, 0, Math.sin(t0) * ra), new T.Vector3(Math.cos(t0) * rb, 0, Math.sin(t0) * rb));
    }
    var ticks = add(new T.LineSegments(new T.BufferGeometry().setFromPoints(tk), lineMat(FRAME, 0.3)));
    var spokes = [];
    for (i = 0; i < N; i++) spokes.push(add(new T.Line(new T.BufferGeometry().setFromPoints([onRing(i, AIN * 1.1, 0.01), onRing(i, R2, 0.01)]), lineMat(FRAME, 0.12))));

    /* 人の姿：体を「楕円の断面をもつ管」と頭の楕円体で組み、その表面と内側に光の粒を置く。
       幅と厚みを別に持たせているので、横から見ても胸・背中・お尻・足の向きが分かる */
    function bodyParts() {
      var tubes = [], balls = [];
      // [x, y, z, 幅（左右）, 厚み（前後）]。足だけは [x, y, z, 高さ, 幅]
      // 胴：肩まで胴の一部として作り、肩から首へなだらかに下がる（肩に丸い玉は置かない）
      tubes.push([[0, 1.40, -0.01, 0.17, 0.12], [0, 1.50, -0.02, 0.255, 0.165], [0, 1.62, -0.03, 0.27, 0.175], [0, 1.82, 0, 0.225, 0.145],
        [0, 2.00, 0.01, 0.25, 0.155], [0, 2.16, 0.02, 0.285, 0.165], [0, 2.27, 0.01, 0.34, 0.14], [0, 2.33, 0, 0.35, 0.115],
        [0, 2.38, -0.01, 0.27, 0.1], [0, 2.43, 0, 0.15, 0.085], [0, 2.47, 0, 0.08, 0.07]]);
      tubes.push([[0, 2.42, 0, 0.07, 0.076], [0, 2.62, 0.015, 0.066, 0.072]]);
      balls.push([0, 2.82, 0.02, 0.155, 0.21, 0.185]);
      [-1, 1].forEach(function (s) {
        tubes.push([[s * 0.14, 1.52, -0.01, 0.13, 0.14], [s * 0.14, 1.25, 0.01, 0.115, 0.125], [s * 0.13, 0.86, 0.02, 0.078, 0.088],
          [s * 0.125, 0.56, 0, 0.082, 0.092], [s * 0.12, 0.14, -0.01, 0.048, 0.054]]);
        tubes.push([[s * 0.12, 0.09, -0.06, 0.05, 0.05], [s * 0.125, 0.05, 0.12, 0.038, 0.055], [s * 0.13, 0.03, 0.23, 0.024, 0.045]]);
        // 腕：肩の内側（胴の中）から始めて、つなぎ目を見せない。指先は太ももの中ほど（参考画像の比率）
        tubes.push([[s * 0.27, 2.3, 0, 0.06, 0.07], [s * 0.33, 2.24, 0, 0.082, 0.086], [s * 0.38, 2.06, -0.01, 0.07, 0.074],
          [s * 0.42, 1.92, -0.02, 0.056, 0.06], [s * 0.46, 1.76, -0.01, 0.05, 0.052], [s * 0.5, 1.6, 0.01, 0.04, 0.036]]);
        tubes.push([[s * 0.5, 1.6, 0.01, 0.046, 0.024], [s * 0.53, 1.48, 0.02, 0.05, 0.021], [s * 0.555, 1.36, 0.03, 0.028, 0.014]]);
      });
      return { tubes: tubes, balls: balls };
    }
    function bodyGeometry() {
      var bp = bodyParts(), tubes = bp.tubes, balls = bp.balls;
      // 面積に比例して粒を割り振る
      var parts = [], total = 0;
      tubes.forEach(function (tb) {
        for (var k = 0; k < tb.length - 1; k++) {
          var a = tb[k], b = tb[k + 1];
          var L = Math.sqrt(Math.pow(b[0] - a[0], 2) + Math.pow(b[1] - a[1], 2) + Math.pow(b[2] - a[2], 2));
          var wgt = L * Math.PI * (a[3] + a[4] + b[3] + b[4]) / 2;
          parts.push({ a: a, b: b, w: wgt }); total += wgt;
        }
      });
      balls.forEach(function (e) { var wgt = 4 * Math.PI * (e[3] * e[4] + e[3] * e[5] + e[4] * e[5]) / 3; parts.push({ e: e, w: wgt }); total += wgt; });
      var NP = 15000, pos = new Float32Array(NP * 3), nor = new Float32Array(NP * 3), aB = new Float32Array(NP), aPh = new Float32Array(NP), aSz = new Float32Array(NP);
      var Z = new T.Vector3(0, 0, 1), X = new T.Vector3(1, 0, 0);
      var d = new T.Vector3(), u = new T.Vector3(), v = new T.Vector3(), p = new T.Vector3(), n = new T.Vector3();
      for (var i = 0; i < NP; i++) {
        var r = Math.random() * total, pt = parts[0];
        for (var k = 0; k < parts.length; k++) { r -= parts[k].w; if (r <= 0) { pt = parts[k]; break; } }
        var inside = Math.random() < 0.14, sc = inside ? Math.sqrt(Math.random()) * 0.85 : 1;
        var th = Math.random() * Math.PI * 2;
        if (pt.e) {
          var e = pt.e, cz = Math.random() * 2 - 1, rr = Math.sqrt(1 - cz * cz);
          var dx = rr * Math.cos(th), dy = cz, dz = rr * Math.sin(th);
          p.set(e[0] + dx * e[3] * sc, e[1] + dy * e[4] * sc, e[2] + dz * e[5] * sc);
          n.set(dx / e[3], dy / e[4], dz / e[5]).normalize();
        } else {
          var a = pt.a, b = pt.b, t = Math.random();
          d.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize();
          u.crossVectors(d, Math.abs(d.z) > 0.9 ? X : Z).normalize();
          v.crossVectors(d, u).normalize();
          var ru = a[3] + (b[3] - a[3]) * t, rv = a[4] + (b[4] - a[4]) * t;
          var cs = Math.cos(th), sn = Math.sin(th);
          p.set(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t)
            .addScaledVector(u, cs * ru * sc).addScaledVector(v, sn * rv * sc);
          n.copy(u).multiplyScalar(cs / ru).addScaledVector(v, sn / rv).normalize();
        }
        pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
        nor[i * 3] = n.x; nor[i * 3 + 1] = n.y; nor[i * 3 + 2] = n.z;
        aB[i] = inside ? 0.3 : 1; aPh[i] = Math.random(); aSz[i] = 0.55 + Math.random() * 1.1;
      }
      var geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.BufferAttribute(pos, 3));
      geo.setAttribute('normal', new T.BufferAttribute(nor, 3));
      geo.setAttribute('aB', new T.BufferAttribute(aB, 1));
      geo.setAttribute('aPh', new T.BufferAttribute(aPh, 1));
      geo.setAttribute('aSz', new T.BufferAttribute(aSz, 1));
      return geo;
    }
    var bodyU = { uTime: { value: 0 }, uTex: { value: dotTexture(T) }, uPx: { value: renderer.getPixelRatio() }, uOn: { value: 0 } };
    var bodyMat = new T.ShaderMaterial({
      transparent: true, depthWrite: false, blending: T.AdditiveBlending, uniforms: bodyU,
      vertexShader: [
        'attribute float aB; attribute float aPh; attribute float aSz;',
        'uniform float uTime; uniform float uPx; uniform float uOn; varying float vA; varying float vR;',
        'void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0);',
        '  vec3 nn = normalize(normalMatrix * normal); vec3 vv = normalize(-mv.xyz);',
        '  float rim = pow(1.0 - abs(dot(nn, vv)), 1.6);',
        '  float tw = 0.5 + 0.5 * sin(uTime * 2.2 + aPh * 6.2831);',
        '  vR = rim; vA = aB * (0.28 + rim * 0.95) * (0.5 + 0.5 * tw) * uOn;',
        '  gl_PointSize = aSz * uPx * (15.0 / -mv.z);',
        '  gl_Position = projectionMatrix * mv; }'].join('\n'),
      fragmentShader: 'uniform sampler2D uTex; varying float vA; varying float vR; void main(){ vec4 t = texture2D(uTex, gl_PointCoord); vec3 c = mix(vec3(0.62, 0.7, 1.0), vec3(0.97, 0.98, 1.0), clamp(vR * 1.4, 0.0, 1.0)); gl_FragColor = vec4(c, t.a * vA); }'
    });
    var body = new T.Group(); world.add(body);
    var bodyGeo = bodyGeometry();
    body.add(new T.Points(bodyGeo, bodyMat));
    var bodyGlow = halo(BODY_C, 1, 0.08); bodyGlow.scale.set(1.3, 3.4, 1); bodyGlow.position.set(0, 1.55, 0); body.add(bodyGlow);
    var heart = halo(SELF_C, 0.9, 0.5); heart.position.set(0, 2.05, 0.06); body.add(heart);
    var heartCore = halo(0xffffff, 0.3, 0.85); heartCore.position.set(0, 2.05, 0.06); body.add(heartCore);

    /* オーラは点数で3段階：弱（2.5未満）／中（2.5〜3.4）／強（3.5以上）。
       領域の向きごとに、光の量・太さ・高さ・うねりの速さが変わる。
       ・内側（自分・青）… 透過光のように体全体を光が覆い、縁から炎が立ちのぼり、光が外へ放たれる（強は稲妻も）
       ・外側（周り・金）… 足もとの光の輪から、炎の筆跡がらせんを描いて巻き上がる渦 */
    function tierK(v) { return v >= 3.5 ? 1 : v >= 2.5 ? 0.5 : 0; }
    function angDiff(a, b) { var d = ((a - b) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI; return Math.abs(d); }
    function makeU(color) { return { uS: { value: [0, 0, 0, 0, 0] }, uTime: { value: 0 }, uOn: { value: 0 }, uColor: { value: color }, uFocus: { value: -1 } }; }
    var auraIn = makeU(SELF_C), auraOut = makeU(OTH_C);
    auraOut.uSpin = { value: 0 }; auraOut.uFlow = { value: 0 };
    function ribbonMat(U, vs, fs) {
      return new T.ShaderMaterial({ uniforms: U, vertexShader: vs, fragmentShader: fs, transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide });
    }

    /* 内側：透過光のオーラ（自分・青）
       セルアニメの「透過光」と同じ考え方で作る。体の形に切り抜いた型（マスク）を後ろから照らし、
       にじませて画面に重ねる。①体全体を覆う光 ②縁の明るい輪郭 ③縁から立ちのぼる炎 を1枚の光として描く。
       型は毎回カメラから見た体の形で作るので、どの向きから見ても体に沿う。揺らぎは1秒12コマの「コマ打ち」。 */
    function tubeGeo(tb) {
      var RS = 18, SUB = 4, rings = [];
      for (var k = 0; k < tb.length - 1; k++) for (var s = 0; s < SUB; s++) rings.push([tb[k], tb[k + 1], s / SUB]);
      rings.push([tb[tb.length - 2], tb[tb.length - 1], 1]);
      var Z = new T.Vector3(0, 0, 1), X = new T.Vector3(1, 0, 0), d = new T.Vector3(), u = new T.Vector3(), v = new T.Vector3();
      var pos = [], nor = [], idx = [];
      rings.forEach(function (r) {
        var a = r[0], b = r[1], t = r[2];
        d.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize();
        u.crossVectors(d, Math.abs(d.z) > 0.9 ? X : Z).normalize(); v.crossVectors(d, u).normalize();
        var ru = a[3] + (b[3] - a[3]) * t, rv = a[4] + (b[4] - a[4]) * t;
        var cx = a[0] + (b[0] - a[0]) * t, cy = a[1] + (b[1] - a[1]) * t, cz = a[2] + (b[2] - a[2]) * t;
        for (var j = 0; j <= RS; j++) {
          var th = j / RS * Math.PI * 2, cs = Math.cos(th), sn = Math.sin(th);
          pos.push(cx + (u.x * cs * ru + v.x * sn * rv), cy + (u.y * cs * ru + v.y * sn * rv), cz + (u.z * cs * ru + v.z * sn * rv));
          var nx = u.x * cs / ru + v.x * sn / rv, ny = u.y * cs / ru + v.y * sn / rv, nz = u.z * cs / ru + v.z * sn / rv;
          var l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1; nor.push(nx / l, ny / l, nz / l);
        }
      });
      for (var i = 0; i < rings.length - 1; i++) for (var j2 = 0; j2 < RS; j2++) {
        var o = i * (RS + 1) + j2; idx.push(o, o + RS + 1, o + 1, o + 1, o + RS + 1, o + RS + 2);
      }
      var g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
      g.setIndex(idx); return g;
    }
    var maskU = { uS: auraIn.uS, uFocus: auraIn.uFocus, uMean: { value: 0 } };
    var maskMat = new T.ShaderMaterial({
      uniforms: maskU,
      vertexShader: [
        'uniform float uS[5]; uniform float uFocus; uniform float uMean; varying vec2 vKF;',
        'const float PI = 3.14159265;',
        'void main(){ float hl = length(normal.xz); float a = atan(normal.z, normal.x + 1e-5); float s = 0.0; float w = 0.0; float fo = 0.0;',
        '  for (int i = 0; i < 5; i++) { float ai = -PI * 0.5 + float(i) * 2.0 * PI / 5.0; float d = abs(mod(a - ai + PI, 2.0 * PI) - PI); float kk = exp(-d * d * 3.2); s += kk * uS[i]; w += kk; if (float(i) == uFocus) fo = exp(-d * d * 6.0); }',
        '  float m = clamp(hl * 1.6, 0.0, 1.0); vKF = vec2(mix(uMean, s / w, m), fo * m);',
        '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }'].join('\n'),
      fragmentShader: 'varying vec2 vKF; void main(){ gl_FragColor = vec4(1.0, vKF.x, vKF.y, 1.0); }'
    });
    var maskScene = new T.Scene(), maskBody = new T.Group(); maskScene.add(maskBody);
    (function () {
      var bp = bodyParts();
      bp.tubes.forEach(function (tb) { maskBody.add(new T.Mesh(tubeGeo(tb), maskMat)); });
      bp.balls.forEach(function (e) {
        var g = new T.SphereGeometry(1, 24, 16); g.scale(e[3], e[4], e[5]); g.translate(e[0], e[1], e[2]);
        maskBody.add(new T.Mesh(g, maskMat));
      });
    })();
    var rtMask = new T.WebGLRenderTarget(4, 4, { minFilter: T.LinearFilter, magFilter: T.LinearFilter, format: T.RGBAFormat });
    var rtAura = new T.WebGLRenderTarget(4, 4, { minFilter: T.LinearFilter, magFilter: T.LinearFilter, format: T.RGBAFormat, depthBuffer: false });
    var orthoCam = new T.Camera();
    function quadScene(mat) { var s = new T.Scene(), m = new T.Mesh(new T.PlaneGeometry(2, 2), mat); m.frustumCulled = false; s.add(m); return s; }
    var QUAD_VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
    var glowU = { uMask: { value: rtMask.texture }, uAsp: { value: 1 }, uTime: { value: 0 }, uOn: { value: 0 }, uColor: { value: SELF_C }, uBody: { value: 0.5 } };
    var auraScene = quadScene(new T.ShaderMaterial({
      uniforms: glowU, vertexShader: QUAD_VS, depthTest: false, depthWrite: false,
      fragmentShader: [
        'uniform sampler2D uMask; uniform float uAsp; uniform float uTime; uniform float uOn; uniform vec3 uColor; uniform float uBody;',
        'varying vec2 vUv;',
        'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
        'float noise(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);',
        '  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }',
        'float fbm(vec2 p){ return noise(p) * 0.55 + noise(p * 2.1 + 3.7) * 0.3 + noise(p * 4.3 + 9.1) * 0.15; }',
        'void main(){',
        '  vec2 uv = vUv; float B = uBody; vec2 ax = vec2(1.0 / uAsp, 1.0);',
        '  float t = floor(uTime * 12.0) / 12.0;',
        '  vec4 m0 = texture2D(uMask, uv);',
        // ① にじみ：体のまわりを包む光
        '  float g = 0.0; float kg = 0.0;',
        '  for (int i = 0; i < 12; i++) { float a = float(i) * 0.5236 + 0.26; vec2 d = vec2(cos(a), sin(a)) * ax;',
        '    vec4 s1 = texture2D(uMask, uv + d * B * 0.03); vec4 s2 = texture2D(uMask, uv + d * B * 0.075);',
        '    g += s1.r * 0.6 + s2.r * 0.4; kg += s1.g * s1.r * 0.6 + s2.g * s2.r * 0.4; }',
        '  g /= 12.0; kg = kg / 12.0 / max(g, 0.001);',
        // ② 輪郭：縁のすぐ外の明るい線（手描きのように少し揺れる）
        '  float wob = 1.0 + (noise(uv * vec2(uAsp, 1.0) * 26.0 / B + t * 3.0) - 0.5) * 0.7;',
        '  float dil = 0.0;',
        '  for (int i = 0; i < 8; i++) { float a = float(i) * 0.7854; dil = max(dil, texture2D(uMask, uv + vec2(cos(a), sin(a)) * ax * B * 0.014 * wob).r); }',
        '  float edge = clamp(dil - m0.r, 0.0, 1.0);',
        // ③ 炎：体の形を、乱れを加えながら上へ引き伸ばす
        '  float fl = 0.0; float kf = 0.0;',
        '  for (int j = 1; j <= 14; j++) { float fj = float(j) / 14.0;',
        '    float sway = (fbm(vec2(uv.x * uAsp * 7.0 / B, uv.y * 3.0 / B - t * 1.6 + fj * 1.3)) - 0.5) * 0.3 * fj;',
        '    vec4 s = texture2D(uMask, uv - vec2(sway * B / uAsp, fj * B * 0.5));',
        '    float allow = mix(0.25, 1.0, s.g);',
        '    float c = s.r * (1.0 - smoothstep(allow * 0.3, allow, fj)) * (1.0 - fj * 0.3);',
        '    if (c > fl) { fl = c; kf = s.g; } }',
        '  float n1 = fbm(vec2(uv.x * uAsp * 16.0 / B, uv.y * 3.2 / B - t * 1.0));',
        '  float n2 = fbm(vec2(uv.x * uAsp * 16.0 / B + 7.0, uv.y * 3.2 / B - t * 2.6));',
        '  float tongue = smoothstep(0.44, 0.62, mix(n1, n2, kf) + fl * 0.18);',
        '  float flame = fl * tongue * (1.0 - m0.r * 0.5);',
        '  float kk = (m0.r * m0.g + g * kg + fl * kf) / (m0.r + g + fl + 0.001);',
        '  float I = m0.r * mix(0.1, 0.2, kk) + edge * mix(0.4, 0.95, kk) + g * mix(0.18, 0.5, kk) + flame * mix(0.4, 1.2, kk);',
        '  I *= mix(0.94 + 0.06 * noise(vec2(t * 2.0, 1.0)), 0.82 + 0.18 * noise(vec2(t * 5.0, 3.0)), kk) * uOn;',
        '  vec3 col = mix(uColor * 0.95, vec3(1.0), clamp(I - 0.3, 0.0, 1.0) * mix(0.35, 0.75, kk));',
        '  gl_FragColor = vec4(col * min(I, 1.1), 1.0);',
        '}'].join('\n')
    }));
    var compMat = new T.ShaderMaterial({
      uniforms: { uTex: { value: rtAura.texture } }, vertexShader: QUAD_VS, depthTest: false, depthWrite: false, transparent: true,
      blending: T.CustomBlending, blendEquation: T.AddEquation, blendSrc: T.OneFactor, blendDst: T.OneFactor,
      fragmentShader: 'uniform sampler2D uTex; varying vec2 vUv; void main(){ vec3 c = texture2D(uTex, vUv).rgb; gl_FragColor = vec4(c, max(c.r, max(c.g, c.b)) * 0.85); }'
    });
    var compScene = quadScene(compMat);

    /* 内側：体から放たれる光（光の線が外へ飛び出す）と、強い段階だけの稲妻 */
    (function () {
      var P = bodyGeo.attributes.position.array, NR = bodyGeo.attributes.normal.array, B = bodyGeo.attributes.aB.array, cand = [], side = [];
      for (var q = 0; q < B.length; q++) if (B[q] > 0.5) {
        var y = P[q * 3 + 1];
        if (y > 0.3) cand.push(q);
        if (y > 1.45 && y < 2.4 && Math.abs(P[q * 3]) > 0.2) side.push(q);
      }
      var list = [];
      for (var k = 0; k < 240; k++) list.push({ kind: 0, seg: 6, c: cand[Math.floor(Math.random() * cand.length)] });
      for (k = 0; k < 14; k++) list.push({ kind: 1, seg: 12, c: side[Math.floor(Math.random() * side.length)] });
      var nv = 0; list.forEach(function (it) { nv += (it.seg + 1) * 2; });
      var pos = new Float32Array(nv * 3), aNrm = new Float32Array(nv * 3), aU = new Float32Array(nv), aSide = new Float32Array(nv),
        aArea = new Float32Array(nv), aRank = new Float32Array(nv), aPh = new Float32Array(nv), aKind = new Float32Array(nv);
      var idx = [], vi = 0;
      list.forEach(function (it) {
        var c = it.c, nx = NR[c * 3], nz = NR[c * 3 + 2], hl = Math.sqrt(nx * nx + nz * nz);
        if (hl < 0.3) { var th = Math.random() * Math.PI * 2; nx = Math.cos(th); nz = Math.sin(th); hl = 1; }
        nx /= hl; nz /= hl;
        var a = Math.atan2(nz, nx), area = 0, best = 9;
        for (var j = 0; j < N; j++) { var dd = angDiff(a, ang(j)); if (dd < best) { best = dd; area = j; } }
        var rank = Math.random(), ph = Math.random(), b0 = vi;
        for (var s = 0; s <= it.seg; s++) for (var sd = -1; sd <= 1; sd += 2) {
          pos[vi * 3] = P[c * 3]; pos[vi * 3 + 1] = P[c * 3 + 1]; pos[vi * 3 + 2] = P[c * 3 + 2];
          aNrm[vi * 3] = nx; aNrm[vi * 3 + 2] = nz;
          aU[vi] = s / it.seg; aSide[vi] = sd; aArea[vi] = area; aRank[vi] = rank; aPh[vi] = ph; aKind[vi] = it.kind; vi++;
        }
        for (s = 0; s < it.seg; s++) { var o = b0 + s * 2; idx.push(o, o + 1, o + 2, o + 1, o + 3, o + 2); }
      });
      var g = new T.BufferGeometry();
      g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('aNrm', new T.BufferAttribute(aNrm, 3));
      [['aU', aU], ['aSide', aSide], ['aArea', aArea], ['aRank', aRank], ['aPh', aPh], ['aKind', aKind]]
        .forEach(function (e) { g.setAttribute(e[0], new T.BufferAttribute(e[1], 1)); });
      g.setIndex(idx);
      var vs = [
        'attribute vec3 aNrm; attribute float aU; attribute float aSide; attribute float aArea; attribute float aRank; attribute float aPh; attribute float aKind;',
        'uniform float uS[5]; uniform float uTime; uniform float uOn; uniform float uFocus;',
        'varying float vX; varying float vA; varying float vK;',
        'float h1(float x){ return fract(sin(x * 12.9898) * 43758.5453); }',
        'float kOf(){ float s = 0.0; for (int i = 0; i < 5; i++) { if (float(i) == aArea) s = uS[i]; } return s; }',
        'void main(){',
        '  float k = kOf(); float t = uTime; float a; vec3 dir; vec3 p;',
        '  vec3 up = vec3(0.0, 1.0, 0.0); vec3 sd = normalize(cross(up, aNrm));',
        '  if (aKind < 0.5) {',
        // 光の線：体の表面から外（やや上）へ飛び出し、遠ざかりながら消える
        '    float life = fract(t * mix(0.35, 0.85, k) + aPh);',
        '    float head = life * mix(0.3, 0.95, k); float len = mix(0.07, 0.28, k);',
        '    dir = normalize(aNrm * 0.8 + up * (0.35 + aRank * 0.6));',
        '    p = position + dir * (0.02 + max(0.0, head - len * (1.0 - aU))) + sd * sin(aU * 3.0 + aPh * 20.0) * 0.02 * aU;',
        '    float dens = mix(0.3, 1.0, k);',
        '    a = (1.0 - smoothstep(dens - 0.06, dens, aRank)) * pow(1.0 - life, 1.3) * smoothstep(0.0, 0.08, life) * (0.25 + 0.75 * aU);',
        '  } else {',
        // 稲妻：強い段階だけ、ときどき体から横へ走る（形は毎回変わる）
        '    float ep = floor(t * 9.0 + aPh * 13.0);',
        '    float on = step(0.8, h1(ep + aPh * 91.0)) * smoothstep(0.72, 0.98, k);',
        '    float L = 0.5 + h1(ep * 1.7 + aPh) * 0.8;',
        '    dir = normalize(aNrm + up * (h1(ep * 2.3 + aPh) - 0.35) * 0.9 + sd * (h1(ep * 3.1 + aPh) - 0.5) * 0.8);',
        '    vec3 jit = (vec3(h1(ep + aU * 37.0 + aPh), h1(ep * 1.3 + aU * 53.0 + aPh), h1(ep * 0.7 + aU * 71.0 + aPh)) - 0.5) * 0.16 * sin(3.14159 * aU);',
        '    p = position + dir * (0.03 + aU * L) + jit;',
        '    a = on * (1.0 - aU * 0.6);',
        '  }',
        '  vec4 wp = modelMatrix * vec4(p, 1.0);',
        '  vec3 tg = normalize(mat3(modelMatrix) * dir);',
        '  vec3 sdw = normalize(cross(tg, normalize(cameraPosition - wp.xyz)) + 1e-5);',
        '  float wid = aKind < 0.5 ? mix(0.01, 0.024, k) * (0.35 + 0.65 * aU) : 0.02 * (1.0 - aU * 0.5);',
        '  wp.xyz += sdw * aSide * wid;',
        '  float fo = aArea == uFocus ? 1.0 : 0.0;',
        '  vX = aSide; vK = aKind > 0.5 ? 1.0 : k;',
        '  vA = a * mix(0.35, 1.0, k) * uOn * (1.0 + fo * 0.4);',
        '  gl_Position = projectionMatrix * viewMatrix * wp;',
        '}'].join('\n');
      var fs = [
        'uniform vec3 uColor; varying float vX; varying float vA; varying float vK;',
        'void main(){ float c = exp(-vX * vX * 6.0); float g = exp(-vX * vX * 1.8) * 0.35;',
        '  vec3 col = mix(uColor, vec3(1.0), c * (0.5 + vK * 0.45));',
        '  gl_FragColor = vec4(col, (c + g) * vA); }'].join('\n');
      var m = add(new T.Mesh(g, ribbonMat(auraIn, vs, fs))); m.frustumCulled = false;
    })();

    /* 外側：光の渦。足もとの輪を回る炎の筆跡と、らせんを描いて昇る炎の筆跡 */
    (function () {
      var strokes = [];
      for (var k = 0; k < 32; k++) strokes.push({ kind: 0, seg: 48, th: Math.random() * Math.PI * 2, turn: Math.PI * (1.3 + Math.random() * 0.9), len: 0.25 + Math.random() * 0.25 });
      for (k = 0; k < 22; k++) strokes.push({ kind: 1, seg: 20, th: Math.random() * Math.PI * 2, turn: 1.6 + Math.random() * 1.4, len: 0.6 + Math.random() * 0.3 });
      var nv = 0; strokes.forEach(function (st) { nv += (st.seg + 1) * 2; });
      var pos = new Float32Array(nv * 3), aU = new Float32Array(nv), aSide = new Float32Array(nv), aKind = new Float32Array(nv), aTh = new Float32Array(nv),
        aTurn = new Float32Array(nv), aLen = new Float32Array(nv), aRank = new Float32Array(nv), aPh = new Float32Array(nv), aSpd = new Float32Array(nv);
      var idx = [], vi = 0;
      strokes.forEach(function (st) {
        var rank = Math.random(), ph = Math.random(), spd = 0.8 + Math.random() * 0.45, b0 = vi;
        for (var s = 0; s <= st.seg; s++) for (var sd = -1; sd <= 1; sd += 2) {
          aU[vi] = s / st.seg; aSide[vi] = sd; aKind[vi] = st.kind; aTh[vi] = st.th; aTurn[vi] = st.turn; aLen[vi] = st.len;
          aRank[vi] = rank; aPh[vi] = ph; aSpd[vi] = spd; vi++;
        }
        for (s = 0; s < st.seg; s++) { var o = b0 + s * 2; idx.push(o, o + 1, o + 2, o + 1, o + 3, o + 2); }
      });
      var g = new T.BufferGeometry();
      g.setAttribute('position', new T.BufferAttribute(pos, 3));
      [['aU', aU], ['aSide', aSide], ['aKind', aKind], ['aTh', aTh], ['aTurn', aTurn], ['aLen', aLen], ['aRank', aRank], ['aPh', aPh], ['aSpd', aSpd]]
        .forEach(function (e) { g.setAttribute(e[0], new T.BufferAttribute(e[1], 1)); });
      g.setIndex(idx);
      var vs = [
        'attribute float aU; attribute float aSide; attribute float aKind; attribute float aTh; attribute float aTurn; attribute float aLen; attribute float aRank; attribute float aPh; attribute float aSpd;',
        'uniform float uS[5]; uniform float uTime; uniform float uOn; uniform float uFocus; uniform float uSpin; uniform float uFlow;',
        'varying float vX; varying float vU; varying float vA; varying float vK; varying float vPh;',
        'const float PI = 3.14159265; const float R = ' + AOUT.toFixed(3) + ';',
        'float kAt(float a, out float fo){ float s = 0.0; float w = 0.0; fo = 0.0;',
        '  for (int i = 0; i < 5; i++) { float ai = -PI * 0.5 + float(i) * 2.0 * PI / 5.0; float d = abs(mod(a - ai + PI, 2.0 * PI) - PI); float kk = exp(-d * d * 3.2); s += kk * uS[i]; w += kk; if (float(i) == uFocus) fo = exp(-d * d * 6.0); }',
        '  return s / w; }',
        'vec3 path(float u, out float k, out float fo){',
        '  if (aKind < 0.5) {',
        '    float a = aTh + uSpin + u * aTurn; k = kAt(a, fo);',
        '    float r = R * (1.0 - 0.14 * u) + mix(0.03, 0.12, k) * sin(u * 6.0 + uFlow * 9.0 + aPh * 6.2831);',
        '    return vec3(cos(a) * r, 0.04 + u * mix(1.5, 3.0, k), sin(a) * r);',
        '  }',
        '  float a = aTh + uSpin * 1.5 + u * aTurn; k = kAt(a, fo);',
        '  float r = R * (1.0 + 0.05 * sin(a * 3.0 + aPh * 6.2831)) + mix(0.0, 0.05, k) * sin(u * 20.0 + aPh * 30.0);',
        '  return vec3(cos(a) * r, 0.02 + 0.05 * u * (1.0 - u) + 0.04 * k * aPh, sin(a) * r);',
        '}',
        'void main(){',
        '  float k; float fo; float k2; float f2;',
        '  vec3 p = path(aU, k, fo);',
        '  vec3 tg = path(min(1.0, aU + 0.015), k2, f2) - path(max(0.0, aU - 0.015), k2, f2);',
        '  vec4 wp = modelMatrix * vec4(p, 1.0);',
        '  tg = normalize(mat3(modelMatrix) * tg + vec3(1e-5, 0.0, 0.0));',
        '  vec3 sdw = normalize(cross(tg, normalize(cameraPosition - wp.xyz)));',
        '  float head = fract(uFlow * aSpd + aPh) * (1.0 + aLen);',
        '  float q = (aU - (head - aLen)) / aLen;',
        '  float taper = (q > 0.0 && q < 1.0) ? sin(PI * q) : 0.0;',
        '  float wid = aKind < 0.5 ? mix(0.022, 0.07, k) * (1.0 - 0.45 * aU) : mix(0.02, 0.05, k);',
        '  wp.xyz += sdw * aSide * wid * pow(taper, 0.6);',
        '  float dens = mix(0.35, 1.0, k);',
        '  float vis = 1.0 - smoothstep(dens - 0.08, dens, aRank);',
        '  float top = aKind < 0.5 ? 1.0 - smoothstep(0.7, 1.0, aU) : 1.0;',
        '  vX = aSide; vU = aU; vK = k; vPh = aPh;',
        '  vA = vis * taper * top * mix(0.22, 0.72, k) * uOn * (1.0 + fo * 0.5);',
        '  gl_Position = projectionMatrix * viewMatrix * wp;',
        '}'].join('\n');
      var fs = [
        'uniform vec3 uColor; varying float vX; varying float vU; varying float vA; varying float vK; varying float vPh;',
        'void main(){',
        '  float rag = 0.62 + 0.3 * sin(vU * 90.0 + vPh * 40.0) * sin(vU * 31.0 + vPh * 13.0);',
        '  float body = 1.0 - smoothstep(rag * 0.55, rag, abs(vX));',
        '  float core = exp(-vX * vX * 10.0);',
        '  vec3 col = mix(vec3(1.0, 0.55, 0.2), uColor, 0.55 + 0.45 * core);',
        '  col = mix(col, vec3(1.0, 0.97, 0.86), core * (0.15 + 0.35 * vK));',
        '  gl_FragColor = vec4(col, (body * 0.7 + core * 0.5) * vA);',
        '}'].join('\n');
      var m = add(new T.Mesh(g, ribbonMat(auraOut, vs, fs))); m.frustumCulled = false;
    })();

    /* 立ちのぼる光の粒：点数が高い向きほど多く明るい（内側は青、外側は金の火の粉） */
    function makeRise(U, color, r0, r1, count, hgt) {
      var aArea = new Float32Array(count), aOff = new Float32Array(count), aR = new Float32Array(count), aPh = new Float32Array(count), aSp = new Float32Array(count);
      for (var k = 0; k < count; k++) {
        aArea[k] = k % N; aOff[k] = (Math.random() - 0.5) * 1.1; aR[k] = r0 + Math.random() * (r1 - r0);
        aPh[k] = Math.random(); aSp[k] = 0.1 + Math.random() * 0.18;
      }
      var g = new T.BufferGeometry();
      g.setAttribute('position', new T.BufferAttribute(new Float32Array(count * 3), 3));
      g.setAttribute('aArea', new T.BufferAttribute(aArea, 1)); g.setAttribute('aOff', new T.BufferAttribute(aOff, 1));
      g.setAttribute('aR', new T.BufferAttribute(aR, 1)); g.setAttribute('aPh', new T.BufferAttribute(aPh, 1)); g.setAttribute('aSp', new T.BufferAttribute(aSp, 1));
      var m = new T.ShaderMaterial({
        transparent: true, depthWrite: false, blending: T.AdditiveBlending,
        uniforms: { uS: U.uS, uOn: U.uOn, uTime: U.uTime, uTex: { value: dotTexture(T) }, uPx: { value: renderer.getPixelRatio() }, uColor: { value: color }, uH: { value: hgt } },
        vertexShader: [
          'attribute float aArea; attribute float aOff; attribute float aR; attribute float aPh; attribute float aSp;',
          'uniform float uS[5]; uniform float uOn; uniform float uTime; uniform float uPx; uniform float uH; varying float vA;',
          'const float PI = 3.14159265;',
          'void main(){',
          '  float s = 0.0; for (int i = 0; i < 5; i++) { if (float(i) == aArea) s = uS[i]; }',
          '  float u = fract(aPh + uTime * aSp * (0.7 + s * 0.8)); float a = -PI * 0.5 + aArea * 2.0 * PI / 5.0 + aOff + u * 0.5;',
          '  float r = aR * (1.0 - 0.25 * u); vec3 p = vec3(cos(a) * r, u * uH * (0.6 + 0.4 * s), sin(a) * r);',
          '  vec4 mv = modelViewMatrix * vec4(p, 1.0);',
          '  vA = (0.08 + 0.92 * s * s) * sin(PI * u) * uOn;',
          '  gl_PointSize = (1.0 + s * 2.0) * uPx * (16.0 / -mv.z);',
          '  gl_Position = projectionMatrix * mv;',
          '}'].join('\n'),
        fragmentShader: 'uniform sampler2D uTex; uniform vec3 uColor; varying float vA; void main(){ vec4 t = texture2D(uTex, gl_PointCoord); gl_FragColor = vec4(uColor, t.a * vA); }'
      });
      add(new T.Points(g, m));
    }
    makeRise(auraIn, SELF_C, AIN * 0.6, AIN * 0.95, 180, 3.0);
    makeRise(auraOut, OTH_C, AOUT * 0.85, AOUT * 1.1, 300, 3.6);

    /* オーラの名前（画面の右側に、境目から引き出して表示） */
    var zoneIn = document.createElement('div'); zoneIn.className = 'aura__zone is-in'; zoneIn.innerHTML = '<b>内側のオーラ</b><small>自分の点数</small>'; labelsEl.appendChild(zoneIn);
    var zoneOut = document.createElement('div'); zoneOut.className = 'aura__zone is-out'; zoneOut.innerHTML = '<b>外側のオーラ</b><small>周りの人の点数</small>'; labelsEl.appendChild(zoneOut);

    /* 領域ごとの印：内側（自分）と外側（周り） */
    var marks = [];
    for (i = 0; i < N; i++) {
      var sCore = add(new T.Mesh(new T.SphereGeometry(1, 20, 14), glowMat(SELF_C, 0.95)));
      sCore.position.copy(onRing(i, R1, 0.12));
      var sHalo = add(halo(SELF_C, 0.6, 0.5)); sHalo.position.copy(sCore.position);
      var oHalo = add(halo(OTH_C, 1, 0)); oHalo.position.copy(onRing(i, R2, 0.14));
      var oCore = add(new T.Mesh(new T.SphereGeometry(1, 20, 14), glowMat(OTH_C, 0)));
      oCore.position.copy(oHalo.position);
      var pulse = add(new T.Line(new T.BufferGeometry().setFromPoints(ringPts(0.3, 0, 48)), lineMat(OTH_C, 0)));
      pulse.position.set(oHalo.position.x, 0.02, oHalo.position.z);
      var la = document.createElement('div'); la.className = 'aura__self'; labelsEl.appendChild(la);
      var lb = document.createElement('div'); lb.className = 'aura__oth'; labelsEl.appendChild(lb);
      marks.push({ i: i, sCore: sCore, sHalo: sHalo, oHalo: oHalo, oCore: oCore, pulse: pulse, la: la, lb: lb, s: 0, o: 0, gap: 0, heat: 0 });
    }

    var hasOthers = false, appear = 0, meanIn = 0, meanOut = 0, spin = 0, flow = 0;
    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function set(self, others, info) {
      info = info || {};
      var gl = info.gapLine || opts.gapLine || 1.0;
      hasOthers = !!others;
      marks.forEach(function (m) {
        var sv = self ? (self[m.i] || 0) : 0, ov = others ? (others[m.i] || 0) : 0;
        m.s = sv; m.o = ov;
        var d = Math.round((ov - sv) * 10) / 10;
        m.gap = others ? (d >= gl - 0.001 ? 1 : d <= -gl + 0.001 ? -1 : 0) : 0;
        m.la.innerHTML = '<small>' + esc(info.selfName || '自分') + '</small><b>' + fmt(sv) + '</b>';
        var tag = m.gap === 1 ? '<em class="is-gold">気づいていない価値かも</em>' : m.gap === -1 ? '<em class="is-navy">まだ伝わっていない価値かも</em>' : '';
        m.lb.innerHTML = '<span>' + esc((info.labels || [])[m.i] || '') + '</span><b>' + (others ? '周り ' + fmt(ov) : '周り ―') + '</b>' + tag;
        m.lb.classList.toggle('is-wait', !others);
      });
      // 3段階（弱0／中0.5／強1）。点数そのものではなく段階で見せる
      auraIn.uS.value = marks.map(function (m) { return tierK(m.s); });
      auraOut.uS.value = marks.map(function (m) { return others ? tierK(m.o) : 0; });
      meanIn = auraIn.uS.value.reduce(function (x, y) { return x + y; }, 0) / N;
      meanOut = auraOut.uS.value.reduce(function (x, y) { return x + y; }, 0) / N;
      maskU.uMean.value = meanIn;
      ring2w.visible = !others; ring2.visible = !!others; footOut.visible = !!others; footOutLine.visible = !!others;
      zoneOut.classList.toggle('is-wait', !others);
      waitEl.hidden = !!others;
      appear = (CAPTURE || REDUCED) ? 1 : 0;
    }

    var st = { drag: 0, vel: 0, dragging: false, moved: 0 };
    dragYaw(renderer.domElement, container, st);

    var w0 = 0, h0 = 0, LOOKY = 1.25;
    function resize() {
      var w = container.clientWidth, h = container.clientHeight;
      if (!w || !h) return false;
      if (w === w0 && h === h0) return true;
      w0 = w; h0 = h; renderer.setSize(w, h, false);
      camera.aspect = w / h;
      var tanV = Math.tan(camera.fov / 2 * Math.PI / 180);
      var halfW = R2 * (w < 520 ? 1.25 : 1.5), halfH = 2.75;
      var d = Math.max(halfH / tanV, halfW / (tanV * camera.aspect));
      var E = 0.36;
      camera.position.set(0, LOOKY + d * Math.sin(E), d * Math.cos(E));
      camera.lookAt(0, LOOKY - 0.3, 0);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
      // 透過光用の型と光は、画面の半分の解像度で作る（にじみには十分で、軽い）
      var pr = renderer.getPixelRatio(), rw = Math.max(2, Math.round(w * pr / 2)), rh = Math.max(2, Math.round(h * pr / 2));
      rtMask.setSize(rw, rh); rtAura.setSize(rw, rh);
      glowU.uAsp.value = w / h;
      var y0 = new T.Vector3(0, 0, 0).project(camera).y, y1 = new T.Vector3(0, 2.95, 0).project(camera).y;
      glowU.uBody.value = Math.abs(y1 - y0) / 2;
      return true;
    }

    var tmp = new T.Vector3(), visible = false, last = 0, tAcc = 0, focus = -1, tourAt = 0;
    var camRight = new T.Vector3();
    function projW(v) { tmp.copy(v).project(camera); return { x: (tmp.x + 1) / 2 * w0, y: (1 - tmp.y) / 2 * h0 }; }
    function proj(v) { tmp.copy(v).applyMatrix4(world.matrixWorld).project(camera); return { x: (tmp.x + 1) / 2 * w0, y: (1 - tmp.y) / 2 * h0 }; }
    function depthOf(v) { tmp.copy(v).applyMatrix4(world.matrixWorld).applyMatrix4(camera.matrixWorldInverse); return -tmp.z; }
    function placeZone(el, r, y, dx) {
      // オーラの殻の右端（画面上）に、細い線つきで名前を置く
      var edge = projW(new T.Vector3(0, y, 0).addScaledVector(camRight, r));
      var x = Math.min(w0 - el.offsetWidth - 6, edge.x + dx);
      el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + edge.y.toFixed(1) + 'px) translateY(-50%)';
      el.style.setProperty('--lead', Math.max(8, x - edge.x).toFixed(1) + 'px');
    }
    function draw(dt) {
      var t = tAcc;
      if (!CAPTURE && !REDUCED) appear = Math.min(1, appear + dt / 2.2);
      var a = ease(appear);
      if (!CAPTURE && !REDUCED && !st.dragging && t - tourAt > 3.2) { tourAt = t; focus = (focus + 1) % N; }
      if (CAPTURE) focus = -1;
      [auraIn, auraOut].forEach(function (U) { U.uTime.value = t; U.uFocus.value = focus; });
      auraIn.uOn.value = a; auraOut.uOn.value = (hasOthers ? 1 : 0) * a;
      // 渦の回る速さと、筆跡が昇る速さ：周りの点数の段階が高いほど速い
      var vSpin = 0.3 + meanOut * 0.8, vFlow = 0.16 + meanOut * 0.26;
      if (CAPTURE) { spin = t * vSpin; flow = t * vFlow; } else { spin += dt * vSpin; flow += dt * vFlow; }
      auraOut.uSpin.value = spin; auraOut.uFlow.value = flow;
      bodyGlow.material.opacity = (0.05 + meanIn * 0.1) * a;
      marks.forEach(function (m) {
        m.heat += ((m.i === focus ? 1 : 0) - m.heat) * Math.min(1, dt * 4);
        var ks = Math.max(0, (m.s - 1) / 4), ko = Math.max(0, (m.o - 1) / 4);
        m.sCore.scale.setScalar(Math.max(0.001, (0.05 + ks * 0.06) * a * (1 + m.heat * 0.3)));
        m.sHalo.scale.setScalar((0.32 + ks * 0.5) * a * (1 + m.heat * 0.4) * (m.gap === -1 ? 1 + 0.18 * Math.sin(t * 4) : 1));
        m.sHalo.material.opacity = (0.35 + ks * 0.35) * a;
        var on = hasOthers ? a : 0;
        m.oHalo.scale.setScalar((0.5 + ko * 1.5) * (1 + m.heat * 0.3) * (m.gap === 1 ? 1 + 0.12 * Math.sin(t * 3.5) : 1));
        m.oHalo.material.opacity = (0.18 + ko * 0.55) * on;
        m.oCore.scale.setScalar(Math.max(0.001, (0.04 + ko * 0.05) * on));
        m.oCore.material.opacity = 0.9 * on;
        var u = (t * 0.55 + m.i * 0.2) % 1;
        m.pulse.scale.setScalar(0.6 + u * (1.2 + ko * 2));
        m.pulse.material.opacity = (m.gap === 1 ? 0.8 : 0.25) * (1 - u) * on;
        spokes[m.i].material.opacity = 0.1 + m.heat * 0.3;
      });
      bodyU.uTime.value = t; bodyU.uOn.value = CAPTURE || REDUCED ? 1 : Math.min(1, bodyU.uOn.value + dt * 0.9);
      heart.material.opacity = 0.42 + 0.12 * Math.sin(t * 2);
      ticks.rotation.y = -t * 0.08;
      dashMat.opacity = 0.3 + 0.25 * Math.sin(t * 2.2);
      if (!st.dragging) { st.vel *= 0.93; st.drag += st.vel; }
      world.rotation.y = (CAPTURE || REDUCED ? -0.35 : -0.35 + t * 0.07) + st.drag;
      world.updateMatrixWorld();
      // 透過光：①体の型を描く → ②型から光（にじみ・輪郭・炎）を作る → ③いつもの画面に光を足す
      maskBody.rotation.y = world.rotation.y; maskBody.updateMatrixWorld();
      glowU.uTime.value = t; glowU.uOn.value = a;
      renderer.setRenderTarget(rtMask); renderer.clear(); renderer.render(maskScene, camera);
      renderer.setRenderTarget(rtAura); renderer.clear(); renderer.render(auraScene, orthoCam);
      renderer.setRenderTarget(null);
      renderer.render(scene, camera);
      renderer.autoClear = false; renderer.render(compScene, orthoCam); renderer.autoClear = true;

      camRight.setFromMatrixColumn(camera.matrixWorld, 0).normalize();
      placeZone(zoneIn, AIN * 0.98, 2.05, 18);
      placeZone(zoneOut, AOUT * 0.95, 2.55, 18);
      zoneIn.style.opacity = a.toFixed(2); zoneOut.style.opacity = a.toFixed(2);

      // 足もとのラベル：内側は数字（玉の下）、外側は領域名と周りの点数（輪の外へ）。奥にあるものは薄く
      var dC = depthOf(new T.Vector3(0, 0, 0));
      marks.forEach(function (m) {
        var p1 = proj(onRing(m.i, R1, 0.12)), p2 = proj(onRing(m.i, R2 * 1.32, 0.1));
        var hw1 = m.la.offsetWidth / 2 + 2, hw2 = m.lb.offsetWidth / 2 + 2, hh2 = m.lb.offsetHeight / 2 + 2;
        var x1 = Math.min(w0 - hw1, Math.max(hw1, p1.x));
        var x2 = Math.min(w0 - hw2, Math.max(hw2, p2.x)), y2 = Math.min(h0 - hh2, Math.max(hh2, p2.y));
        m.la.style.transform = 'translate(-50%,0) translate(' + x1.toFixed(1) + 'px,' + (p1.y + 9).toFixed(1) + 'px)';
        m.lb.style.transform = 'translate(-50%,-50%) translate(' + x2.toFixed(1) + 'px,' + y2.toFixed(1) + 'px)';
        var dd = (depthOf(onRing(m.i, R2, 0)) - dC) / R2;
        var op = (1 - 0.45 * smooth((dd - 0.05) / 0.6)) * a;
        if (m.i === focus) op = Math.max(op, a);
        m.la.style.opacity = op.toFixed(2); m.lb.style.opacity = op.toFixed(2);
        m.lb.classList.toggle('is-lit', m.i === focus);
        m.la.classList.toggle('is-lit', m.i === focus);
      });
    }

    onVisible(container, function (v) {
      visible = v;
      if (v && CAPTURE) { resize(); appear = 1; tAcc = 2.4; draw(0.016); }
    }, 0.15);
    function frame(now) {
      requestAnimationFrame(frame);
      if (!visible || !resize()) { last = now; return; }
      var dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
      if (!CAPTURE && !REDUCED) tAcc += dt;
      draw(dt);
    }
    requestAnimationFrame(frame);
    return { set: set };
  }

  return { radar: radar, HoloLayers: HoloLayers, HoloMap: HoloMap, AuraFigure: AuraFigure };
})();
