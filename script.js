/* EcoAnalysis. Runs entirely in the browser: no network calls, no accounts, no servers. */
(function () {
  'use strict';

  /* ---------- reference data ---------- */
  var SPECIES = [
    ['salix-alba', 'White willow', 'Salix alba', 'Willows', .85], ['salix-caprea', 'Goat willow', 'Salix caprea', 'Willows', .80],
    ['salix-fragilis', 'Crack willow', 'Salix fragilis', 'Willows', .78], ['salix-viminalis', 'Osier', 'Salix viminalis', 'Willows', .82],
    ['populus-balsamifera', 'Balsam poplar', 'Populus balsamifera', 'Poplars', .90], ['populus-tremula', 'Aspen', 'Populus tremula', 'Poplars', .72],
    ['populus-nigra', 'Black poplar', 'Populus nigra', 'Poplars', .88], ['populus-alba', 'White poplar', 'Populus alba', 'Poplars', .86],
    ['betula-pendula', 'Silver birch', 'Betula pendula', 'Birches', .60], ['betula-pubescens', 'Downy birch', 'Betula pubescens', 'Birches', .62],
    ['acer-platanoides', 'Norway maple', 'Acer platanoides', 'Maples', .55], ['acer-negundo', 'Box elder', 'Acer negundo', 'Maples', .70],
    ['acer-campestre', 'Field maple', 'Acer campestre', 'Maples', .58], ['tilia-cordata', 'Small-leaved lime', 'Tilia cordata', 'Limes', .65],
    ['tilia-platyphyllos', 'Large-leaved lime', 'Tilia platyphyllos', 'Limes', .63], ['quercus-robur', 'Pedunculate oak', 'Quercus robur', 'Oaks', .50],
    ['quercus-petraea', 'Sessile oak', 'Quercus petraea', 'Oaks', .52], ['ulmus-laevis', 'European white elm', 'Ulmus laevis', 'Elms', .75],
    ['ulmus-minor', 'Field elm', 'Ulmus minor', 'Elms', .73], ['fraxinus-excelsior', 'European ash', 'Fraxinus excelsior', 'Ash', .68],
    ['prunus-padus', 'Bird cherry', 'Prunus padus', 'Other trees', .60], ['sorbus-aucuparia', 'Rowan', 'Sorbus aucuparia', 'Other trees', .58],
    ['malus-sylvestris', 'European crab apple', 'Malus sylvestris', 'Other trees', .55], ['alnus-glutinosa', 'Black alder', 'Alnus glutinosa', 'Alders and hazel', .76],
    ['alnus-incana', 'Grey alder', 'Alnus incana', 'Alders and hazel', .74], ['corylus-avellana', 'Common hazel', 'Corylus avellana', 'Alders and hazel', .62]
  ].map(function (r) { return { id: r[0], name: r[1], latin: r[2], group: r[3], tol: r[4] }; });
  function sp(id) { return SPECIES.filter(function (s) { return s.id === id; })[0]; }

  var FA_CLASSES = [
    { n: 'I', max: .040, label: 'Normal', range: '< 0.040' }, { n: 'II', max: .045, label: 'Early deviation', range: '0.040 to 0.044' },
    { n: 'III', max: .050, label: 'Medium', range: '0.045 to 0.049' }, { n: 'IV', max: .055, label: 'Significant', range: '0.050 to 0.054' },
    { n: 'V', max: Infinity, label: 'Critical', range: '> 0.054' }
  ];
  var CHL_CLASSES = [
    { k: 'A', min: .15, label: 'High', range: '> 0.15' }, { k: 'B', min: .05, label: 'Medium', range: '0.05 to 0.15' },
    { k: 'C', min: -.05, label: 'Reduced', range: '-0.05 to 0.05' }, { k: 'D', min: -Infinity, label: 'Low (stress)', range: '< -0.05' }
  ];
  var DEMO = [
    [760, 430, 'populus-balsamifera', .058, -.02], [840, 500, 'salix-alba', .055, .01], [900, 420, 'populus-nigra', .060, -.04], [800, 545, 'betula-pendula', .062, -.06], [700, 470, 'salix-caprea', .051, .03],
    [470, 290, 'tilia-cordata', .046, .06], [545, 365, 'acer-platanoides', .049, .04], [400, 390, 'betula-pendula', .047, .07], [600, 245, 'acer-negundo', .044, .08], [330, 270, 'fraxinus-excelsior', .043, .09],
    [170, 150, 'quercus-robur', .036, .19], [250, 215, 'tilia-cordata', .038, .17], [120, 430, 'betula-pendula', .035, .21], [230, 500, 'acer-platanoides', .039, .16], [720, 140, 'betula-pubescens', .037, .18], [800, 215, 'alnus-glutinosa', .041, .12]
  ].map(function (r, i) { return { id: 'd' + i, mine: false, x: r[0], y: r[1], species: r[2], fa: r[3], chl: r[4] }; });

  /* ---------- helpers ---------- */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function reduced() { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, reduced() ? 0 : ms); }); }
  var toastTimer;
  function toast(msg) { var t = $('#toast'); t.textContent = msg; t.classList.add('is-on'); clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('is-on'); }, 3800); }

  function faClass(fa) { for (var i = 0; i < FA_CLASSES.length; i++) if (fa < FA_CLASSES[i].max) return i + 1; return 5; }
  function chlClass(c) { for (var i = 0; i < CHL_CLASSES.length; i++) if (c > CHL_CLASSES[i].min) return i; return 3; }
  function normFa(fa) { return clamp((fa - .030) / (.065 - .030), 0, 1); }
  function normChl(c) { return clamp((c + .15) / .40, 0, 1); }
  function stressOf(fa, c) { return clamp((normFa(fa) + (1 - normChl(c))) / 2, 0, 1); }
  function faColor(n) { return 'var(--c' + n + ')'; }
  function chlColor(i) { return 'var(--h' + (i + 1) + ')'; }
  function stressColor(s) { return s < .3 ? 'var(--c1)' : s < .45 ? 'var(--c2)' : s < .6 ? 'var(--c3)' : s < .75 ? 'var(--c4)' : 'var(--c5)'; }
  function fmtChl(c) { return (c < 0 ? '-' : '') + Math.abs(c).toFixed(2).replace(/^0/, ''); }

  /* ---------- chrome ---------- */
  function setupChrome() {
    var root = document.documentElement, tb = $('#themeBtn'), nav = $('#navLinks'), burger = $('#burger');
    function label() { tb.setAttribute('aria-label', root.getAttribute('data-theme') === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'); }
    label();
    tb.addEventListener('click', function () {
      var t = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', t); try { localStorage.setItem('eco-theme', t); } catch (e) {} label();
      $('meta[name="theme-color"]').setAttribute('content', t === 'dark' ? '#14301F' : '#F2F1E4');
    });
    function close() { nav.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); burger.setAttribute('aria-label', 'Open menu'); }
    burger.addEventListener('click', function () {
      var open = !nav.classList.contains('is-open'); nav.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', String(open)); burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) close(); });
    document.addEventListener('click', function (e) { if (!e.target.closest('#nav')) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    $('.skip').addEventListener('click', function (e) { e.preventDefault(); $('#main').focus(); $('#main').scrollIntoView(); });
    $('.brand').addEventListener('click', function (e) { if (e.currentTarget.getAttribute('href') === '#top') { /* default scroll */ } });
  }

  /* ---------- static lists ---------- */
  function renderStatic() {
    $('#legFa').innerHTML = FA_CLASSES.map(function (c, i) { return '<li><i style="background:' + faColor(i + 1) + '"></i>' + c.n + '. ' + esc(c.label) + '</li>'; }).join('');
    $('#legChl').innerHTML = CHL_CLASSES.map(function (c, i) { return '<li><i style="background:' + chlColor(i) + '"></i>' + esc(c.label) + '</li>'; }).join('');
    $('#scaleFa').innerHTML = FA_CLASSES.map(function (c, i) { return '<li><b style="background:' + (i < 2 ? '' : '') + faColor(i + 1) + '">' + c.n + '</b><span>' + esc(c.label) + '</span><span>' + c.range + '</span></li>'; }).join('');
    $('#scaleChl').innerHTML = CHL_CLASSES.map(function (c, i) { return '<li><b style="background:' + chlColor(i) + '">' + c.k + '</b><span>' + esc(c.label) + '</span><span>' + c.range + '</span></li>'; }).join('');
    var groups = {}; SPECIES.forEach(function (s) { (groups[s.group] = groups[s.group] || []).push(s); });
    var sel = $('#plantSelect');
    Object.keys(groups).forEach(function (g) {
      var og = document.createElement('optgroup'); og.label = g;
      groups[g].forEach(function (s) { var o = document.createElement('option'); o.value = s.id; o.textContent = s.name + ' (' + s.latin + ')'; og.appendChild(o); });
      sel.appendChild(og);
    });
    function names(list, n) { var a = list.slice(0, n).map(function (s) { return '<li>' + esc(s.name) + '</li>'; }).join(''); return a + (list.length > n ? '<li>and ' + (list.length - n) + ' more</li>' : ''); }
    var hi = SPECIES.filter(function (s) { return s.tol >= .8; }).sort(function (a, b) { return b.tol - a.tol; });
    var mid = SPECIES.filter(function (s) { return s.tol >= .6 && s.tol < .8; });
    var lo = SPECIES.filter(function (s) { return s.tol < .6; });
    $('#recStatic').innerHTML =
      '<article class="tier"><h3>Polluted districts</h3><p>Tolerant of exhaust and industrial emissions. A safe choice along busy roads.</p><ul>' + names(hi, 5) + '</ul></article>' +
      '<article class="tier tier--2"><h3>Moderately clean districts</h3><p>Reasonably tolerant and still informative. Good species to monitor with this tool.</p><ul>' + names(mid, 5) + '</ul></article>' +
      '<article class="tier tier--3"><h3>Clean districts</h3><p>Sensitive to pollution. They grow best where the air is clean.</p><ul>' + names(lo, 5) + '</ul></article>';
  }

  /* ---------- image analysis ---------- */
  function largestComponent(mask, W, H) {
    var lab = new Int32Array(W * H), stack = new Int32Array(W * H), best = 0, bestId = 0, id = 0, i, out = new Uint8Array(W * H);
    for (i = 0; i < W * H; i++) {
      if (!mask[i] || lab[i]) continue;
      id++; var sp = 0, cnt = 0; stack[sp++] = i; lab[i] = id;
      while (sp) {
        var p = stack[--sp], x = p % W; cnt++;
        if (x > 0 && mask[p - 1] && !lab[p - 1]) { lab[p - 1] = id; stack[sp++] = p - 1; }
        if (x < W - 1 && mask[p + 1] && !lab[p + 1]) { lab[p + 1] = id; stack[sp++] = p + 1; }
        if (p >= W && mask[p - W] && !lab[p - W]) { lab[p - W] = id; stack[sp++] = p - W; }
        if (p < W * (H - 1) && mask[p + W] && !lab[p + W]) { lab[p + W] = id; stack[sp++] = p + W; }
      }
      if (cnt > best) { best = cnt; bestId = id; }
    }
    for (i = 0; i < W * H; i++) out[i] = lab[i] === bestId ? 1 : 0;
    return { mask: out, area: best };
  }

  function analyze(imd) {
    var d = imd.data, W = imd.width, H = imd.height, N = W * H, i, x, y;
    // 1. white calibration from the border
    var bd = Math.max(2, Math.floor(Math.min(W, H) * .04)), rs = 0, gs = 0, bs = 0, c = 0;
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      if (x < bd || x >= W - bd || y < bd || y >= H - bd) { i = (y * W + x) * 4; rs += d[i]; gs += d[i + 1]; bs += d[i + 2]; c++; }
    }
    var rr = rs / c, gg = gs / c, bb = bs / c;
    var white = rr > 150 && gg > 150 && bb > 150 && Math.max(rr, gg, bb) - Math.min(rr, gg, bb) < 45;
    var sr = white ? 255 / rr : 1, sg = white ? 255 / gg : 1, sb = white ? 255 / bb : 1;
    // 2. segment leaf pixels
    var raw = new Uint8Array(N);
    for (i = 0; i < N; i++) {
      var r = Math.min(255, d[i * 4] * sr), g = Math.min(255, d[i * 4 + 1] * sg), b = Math.min(255, d[i * 4 + 2] * sb);
      var mx = Math.max(r, g, b), mn = Math.min(r, g, b), avg = (r + g + b) / 3;
      raw[i] = (avg < 228 && mx > 40 && (mx - mn) / mx > .16 && g >= b * .85) ? 1 : 0;
    }
    var comp = largestComponent(raw, W, H), mask = comp.mask;
    if (comp.area < N * .015) throw new Error('No leaf found. Use a single leaf on a plain white background.');
    // 3. principal direction
    var mx0 = 0, my0 = 0;
    for (i = 0; i < N; i++) if (mask[i]) { mx0 += i % W; my0 += (i / W) | 0; }
    mx0 /= comp.area; my0 /= comp.area;
    var cxx = 0, cyy = 0, cxy = 0;
    for (i = 0; i < N; i++) if (mask[i]) { var dx = i % W - mx0, dy = ((i / W) | 0) - my0; cxx += dx * dx; cyy += dy * dy; cxy += dx * dy; }
    var th = .5 * Math.atan2(2 * cxy, cxx - cyy), ux = Math.cos(th), uy = Math.sin(th);
    if (uy > 0) { ux = -ux; uy = -uy; } // point towards the top of the image
    var umin = Infinity, umax = -Infinity, us = new Float32Array(N);
    for (i = 0; i < N; i++) if (mask[i]) { var u = (i % W - mx0) * ux + (((i / W) | 0) - my0) * uy; us[i] = u; if (u < umin) umin = u; if (u > umax) umax = u; }
    var len0 = umax - umin, ex = len0 * .015, bx = 0, by = 0, bn = 0, ax0 = 0, ay0 = 0, an = 0;
    for (i = 0; i < N; i++) if (mask[i]) {
      if (us[i] < umin + ex) { bx += i % W; by += (i / W) | 0; bn++; }
      if (us[i] > umax - ex) { ax0 += i % W; ay0 += (i / W) | 0; an++; }
    }
    var B = { x: bx / bn, y: by / bn }, A = { x: ax0 / an, y: ay0 / an };
    var Ln = Math.hypot(A.x - B.x, A.y - B.y);
    if (Ln < Math.min(W, H) * .2) throw new Error('The leaf is too small in the photo. Move closer.');
    var ax = (A.x - B.x) / Ln, ay = (A.y - B.y) / Ln;
    // 4. paired half-widths at five stations
    var POS = [.20, .35, .50, .65, .80], hi = POS.map(function () { return 0; }), lo = POS.map(function () { return 0; }), has = POS.map(function () { return 0; }), tol = .012;
    for (i = 0; i < N; i++) if (mask[i]) {
      var px = i % W - B.x, py = ((i / W) | 0) - B.y, t = (px * ax + py * ay) / Ln, v = -px * ay + py * ax;
      for (var k = 0; k < POS.length; k++) if (Math.abs(t - POS[k]) < tol) { has[k]++; if (v > hi[k]) hi[k] = v; if (-v > lo[k]) lo[k] = -v; }
    }
    var st = [], sum = 0;
    for (var s = 0; s < POS.length; s++) {
      if (!has[s] || hi[s] + lo[s] < 4) throw new Error('Could not measure the leaf outline. Try a sharper photo.');
      var asym = Math.abs(hi[s] - lo[s]) / (hi[s] + lo[s]);
      st.push({ pos: POS[s], L: lo[s], R: hi[s], asym: asym, Lp: lo[s] / Ln * 100, Rp: hi[s] / Ln * 100 }); sum += asym;
    }
    var fa = sum / POS.length;
    // 5. chlorophyll index over leaf pixels
    var cs = 0, cn = 0;
    for (i = 0; i < N; i++) if (mask[i]) {
      var r2 = Math.min(255, d[i * 4] * sr), g2 = Math.min(255, d[i * 4 + 1] * sg);
      if (r2 + g2 > 0) { cs += (g2 - r2) / (g2 + r2); cn++; }
    }
    var chl = cn ? cs / cn : 0;
    var edge = 0; for (x = 0; x < W; x++) { if (mask[x] || mask[(H - 1) * W + x]) edge++; } for (y = 0; y < H; y++) { if (mask[y * W] || mask[y * W + W - 1]) edge++; }
    return { fa: fa, chl: chl, stress: stressOf(fa, chl), stations: st, white: white, cropped: edge > 3, mask: mask, W: W, H: H, B: B, a: { x: ax, y: ay }, Ln: Ln };
  }

  function drawOverlay(res, source) {
    var cv = $('#overlay'), W = res.W, H = res.H, g = cv.getContext('2d');
    cv.width = W; cv.height = H;
    g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
    g.globalAlpha = .55; g.drawImage(source, 0, 0, W, H); g.globalAlpha = 1;
    var tint = g.createImageData(W, H), i;
    for (i = 0; i < W * H; i++) if (res.mask[i]) { tint.data[i * 4] = 22; tint.data[i * 4 + 1] = 163; tint.data[i * 4 + 2] = 74; tint.data[i * 4 + 3] = 70; }
    var tc = document.createElement('canvas'); tc.width = W; tc.height = H; tc.getContext('2d').putImageData(tint, 0, 0); g.drawImage(tc, 0, 0);
    var lw = Math.max(1.5, W / 260), B = res.B, a = res.a, n = { x: -a.y, y: a.x }, Ln = res.Ln;
    g.lineWidth = lw; g.strokeStyle = '#B45309'; g.setLineDash([lw * 4, lw * 3]);
    g.beginPath(); g.moveTo(B.x - a.x * Ln * .04, B.y - a.y * Ln * .04); g.lineTo(B.x + a.x * Ln * 1.04, B.y + a.y * Ln * 1.04); g.stroke(); g.setLineDash([]);
    res.stations.forEach(function (s) {
      var cx = B.x + a.x * s.pos * Ln, cy = B.y + a.y * s.pos * Ln;
      var x1 = cx - n.x * s.L, y1 = cy - n.y * s.L, x2 = cx + n.x * s.R, y2 = cy + n.y * s.R;
      g.strokeStyle = '#B45309'; g.lineWidth = lw * 1.4; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
      g.fillStyle = '#B45309'; [[x1, y1], [x2, y2]].forEach(function (p) { g.beginPath(); g.arc(p[0], p[1], lw * 2.4, 0, 7); g.fill(); });
    });
  }

  /* ---------- sample leaves (drawn on a canvas) ---------- */
  function sampleLeaf(kind) {
    var cfg = { healthy: { A: .034, col: [74, 124, 50], spots: 0 }, stressed: { A: .080, col: [122, 142, 58], spots: 0 }, polluted: { A: .102, col: [154, 148, 62], spots: 9 } }[kind];
    var W = 600, H = 760, c = document.createElement('canvas'), g; c.width = W; c.height = H; g = c.getContext('2d');
    g.fillStyle = '#FBFBFA'; g.fillRect(0, 0, W, H);
    var seed = kind.length * 7919 + 13; function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
    g.translate(W / 2, H / 2); g.rotate(.12); g.translate(-W / 2, -H / 2);
    var bx = W / 2, by = H * .83, len = H * .72, Wm = W * .27, N = 80, pts = [], t, k;
    for (k = 0; k <= N; k++) {
      t = k / N; var w = Wm * Math.pow(Math.sin(Math.PI * Math.pow(t, .8)), .85) * (1 - .12 * t), a = cfg.A * (.6 + .4 * Math.sin(5.1 * t + .9)), jit = 1 + (rnd() - .5) * .012;
      pts.push({ y: by - t * len, l: w * (1 + a) * jit, r: w * (1 - a) * jit });
    }
    g.strokeStyle = 'rgb(' + (cfg.col[0] - 20) + ',' + (cfg.col[1] - 25) + ',' + (cfg.col[2] - 15) + ')'; g.lineWidth = 9; g.lineCap = 'round';
    g.beginPath(); g.moveTo(bx, by); g.lineTo(bx, by + H * .06); g.stroke();
    var gr = g.createLinearGradient(0, by - len, 0, by);
    gr.addColorStop(0, 'rgb(' + Math.min(255, cfg.col[0] + 14) + ',' + Math.min(255, cfg.col[1] + 14) + ',' + cfg.col[2] + ')'); gr.addColorStop(1, 'rgb(' + (cfg.col[0] - 10) + ',' + (cfg.col[1] - 12) + ',' + (cfg.col[2] - 8) + ')');
    g.fillStyle = gr; g.beginPath(); g.moveTo(bx, by);
    pts.forEach(function (p) { g.lineTo(bx + p.r, p.y); });
    for (k = N; k >= 0; k--) g.lineTo(bx - pts[k].l, pts[k].y);
    g.closePath(); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.28)'; g.lineWidth = 3; g.beginPath(); g.moveTo(bx, by); g.lineTo(bx, by - len * .96); g.stroke(); g.lineWidth = 1.6;
    for (k = 1; k < 8; k++) {
      var p = pts[Math.round(k * N / 8.6)];
      g.beginPath(); g.moveTo(bx, p.y + 20); g.lineTo(bx + p.r * .85, p.y - 30); g.moveTo(bx, p.y + 20); g.lineTo(bx - p.l * .85, p.y - 30); g.stroke();
    }
    for (k = 0; k < cfg.spots; k++) {
      var q = pts[10 + Math.floor(rnd() * 60)], sx = bx + (rnd() - .5) * (q.l + q.r) * .8;
      g.fillStyle = 'rgba(110,70,30,' + (.35 + rnd() * .3) + ')'; g.beginPath(); g.arc(sx, q.y, 5 + rnd() * 9, 0, 7); g.fill();
    }
    return c.toDataURL('image/png');
  }

  /* ---------- analysis tool ---------- */
  var tool = { species: null, url: null, obj: null, last: null };
  var preview = $('#preview');
  function needSpecies() {
    if (tool.species) return false;
    toast('Pick a tree species first.'); $('#plantSelect').focus(); return true;
  }
  function showPhoto(src, isObj) {
    if (tool.obj) { URL.revokeObjectURL(tool.obj); tool.obj = null; }
    if (isObj) tool.obj = src;
    preview.src = src;
    $('#stageEmpty').hidden = true; $('#stagePhoto').hidden = false; $('#progress').hidden = true; $('#result').hidden = true; tool.last = null;
  }
  function handleFile(f) {
    if (!f) return;
    if (!/^image\//.test(f.type)) { toast('That file is not an image.'); return; }
    if (f.size > 25 * 1024 * 1024) { toast('That image is larger than 25 MB.'); return; }
    showPhoto(URL.createObjectURL(f), true);
  }
  function setupTool() {
    var sel = $('#plantSelect'), drop = $('#drop'), input = $('#fileInput');
    sel.addEventListener('change', function () {
      tool.species = sp(sel.value) || null; $('#pickBtn').disabled = !tool.species;
      $('#plantHint').textContent = tool.species ? 'Reference tolerance to pollution: ' + (tool.species.tol >= .8 ? 'high' : tool.species.tol >= .6 ? 'medium' : 'low') + '.' : 'Pick the species first. It sets the reference tolerance shown in the results.';
    });
    $('#pickBtn').addEventListener('click', function () { if (!needSpecies()) input.click(); });
    input.addEventListener('change', function () { handleFile(input.files[0]); input.value = ''; });
    drop.addEventListener('dragover', function (e) { e.preventDefault(); drop.classList.add(tool.species ? 'is-over' : 'is-blocked'); });
    drop.addEventListener('dragleave', function () { drop.classList.remove('is-over', 'is-blocked'); });
    drop.addEventListener('drop', function (e) { e.preventDefault(); drop.classList.remove('is-over', 'is-blocked'); if (needSpecies()) return; handleFile(e.dataTransfer.files[0]); });
    $$('[data-sample]').forEach(function (b) { b.addEventListener('click', function () { if (needSpecies()) return; showPhoto(sampleLeaf(b.dataset.sample), false); }); });
    $('#changeBtn').addEventListener('click', function () { $('#stagePhoto').hidden = true; $('#stageEmpty').hidden = false; $('#result').hidden = true; $('#progress').hidden = true; tool.last = null; });
    $('#analyzeBtn').addEventListener('click', runAnalysis);
    $('#placeBtn').addEventListener('click', function () { startPlacing(true); });
  }

  var busy = false;
  async function runAnalysis() {
    if (busy) return;
    if (needSpecies()) return;
    busy = true; $('#analyzeBtn').disabled = true;
    try {
      try { await preview.decode(); } catch (e) {}
      var nw = preview.naturalWidth, nh = preview.naturalHeight;
      if (!nw || !nh) throw new Error('The image could not be read.');
      var sc = Math.min(1, 480 / Math.max(nw, nh)), W = Math.max(1, Math.round(nw * sc)), H = Math.max(1, Math.round(nh * sc));
      var cv = $('#work'); cv.width = W; cv.height = H;
      var ctx = cv.getContext('2d', { willReadFrequently: true }); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); ctx.drawImage(preview, 0, 0, W, H);
      var res = analyze(ctx.getImageData(0, 0, W, H));
      $('#stagePhoto').hidden = true; $('#result').hidden = true; $('#progress').hidden = false;
      var items = $$('#progressList li'); items.forEach(function (li) { li.className = ''; });
      for (var i = 0; i < items.length; i++) { items[i].className = 'is-active'; await sleep(360); items[i].className = 'is-done'; }
      $('#progress').hidden = true; $('#stagePhoto').hidden = false;
      drawOverlay(res, cv); showResult(res);
    } catch (err) {
      $('#progress').hidden = true; $('#stagePhoto').hidden = false; toast(err.message || 'Analysis failed.');
    } finally { busy = false; $('#analyzeBtn').disabled = false; }
  }

  function showResult(res) {
    var s = tool.species, cls = faClass(res.fa), cc = chlClass(res.chl);
    tool.last = { species: s.id, fa: res.fa, chl: res.chl };
    $('#resultTitle').textContent = s.name + ', ' + FA_CLASSES[cls - 1].label.toLowerCase() + ' asymmetry';
    var pill = $('#resultClass'); pill.textContent = 'Class ' + FA_CLASSES[cls - 1].n; pill.style.borderColor = faColor(cls);
    function setIdx(v, bar, t, text, pct, color, tx) { $(v).textContent = text; var b = $(bar); b.style.background = color; requestAnimationFrame(function () { b.style.width = pct + '%'; }); $(t).textContent = tx; }
    setIdx('#faV', '#faBar', '#faT', res.fa.toFixed(4), normFa(res.fa) * 100, faColor(cls), 'Class ' + FA_CLASSES[cls - 1].n + ': ' + FA_CLASSES[cls - 1].label);
    setIdx('#chlV', '#chlBar', '#chlT', res.chl.toFixed(3), normChl(res.chl) * 100, chlColor(cc), CHL_CLASSES[cc].label);
    var sp100 = res.stress * 100, sl = sp100 < 25 ? 'Low' : sp100 < 45 ? 'Moderate' : sp100 < 65 ? 'Medium' : sp100 < 80 ? 'High' : 'Critical';
    setIdx('#strV', '#strBar', '#strT', sp100.toFixed(0) + '%', sp100, stressColor(res.stress), sl);
    var dg = diagnosis(res.fa, res.chl);
    $('#diag').style.borderLeftColor = dg.color;
    $('#diag').innerHTML = '<svg class="i" aria-hidden="true" style="color:' + dg.color + '"><use href="#i-' + dg.icon + '"/></svg><p>' + esc(dg.text) + '</p>';
    var rows = res.stations.map(function (r) { return '<tr><td>' + Math.round(r.pos * 100) + '% of length</td><td>' + r.Lp.toFixed(1) + '</td><td>' + r.Rp.toFixed(1) + '</td><td>' + r.asym.toFixed(4) + '</td></tr>'; }).join('');
    $('#faTable tbody').innerHTML = rows + '<tr class="sum"><td colspan="3">Mean (FA index)</td><td>' + res.fa.toFixed(4) + '</td></tr>';
    var notes = [];
    if (!res.white) notes.push('No white background was detected, so colours were not calibrated and the chlorophyll value is less reliable.');
    if (res.cropped) notes.push('The leaf touches the edge of the photo. Leave a margin around it.');
    notes.push('Reference tolerance of ' + s.name.toLowerCase() + ': ' + s.tol.toFixed(2) + '.');
    $('#resultNote').textContent = notes.join(' ');
    $('#result').hidden = false;
    $('#resultTitle').focus({ preventScroll: true });
    $('#result').scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
  }
  function diagnosis(fa, chl) {
    var faHigh = fa >= .050, faLow = fa < .040, chlLow = chl < 0, chlHigh = chl > .10;
    if (faHigh && chlLow) return { icon: 'alert', color: 'var(--c5)', text: 'High asymmetry and low chlorophyll point to a critical situation: long-lasting stress that is still going on.' };
    if (faHigh) return { icon: 'alert', color: 'var(--c4)', text: 'High asymmetry with normal chlorophyll suggests chronic stress in the past. The source may no longer be active, but its effects remain.' };
    if (chlLow) return { icon: 'alert', color: 'var(--c3)', text: 'Low asymmetry with reduced chlorophyll suggests recent, acute stress such as exhaust fumes. The leaf has not had time to deform yet.' };
    if (faLow && chlHigh) return { icon: 'check', color: 'var(--c1)', text: 'Low asymmetry and high chlorophyll suggest a clean site. The plant shows little sign of stress.' };
    return { icon: 'layers', color: 'var(--c2)', text: 'Moderate readings suggest an average environmental load. Repeat the measurement in two to four weeks with another leaf.' };
  }

  /* ---------- demo map ---------- */
  var VB0 = { x: 0, y: 0, w: 1000, h: 620 }, vb = { x: 0, y: 0, w: 1000, h: 620 };
  var map = { layer: 'all', heat: false, sel: null, placing: false, mine: [] };
  var svg = $('#mapSvg'), NS = 'http://www.w3.org/2000/svg';
  function allPins() { return DEMO.concat(map.mine); }
  function loadMine() {
    try {
      var raw = JSON.parse(localStorage.getItem('eco-mine') || '[]'); map.mine = validate(raw);
    } catch (e) { map.mine = []; }
  }
  function saveMine() { try { localStorage.setItem('eco-mine', JSON.stringify(map.mine)); } catch (e) {} }
  function validate(list) {
    if (!Array.isArray(list)) return [];
    return list.filter(function (p) {
      return p && isFinite(p.x) && isFinite(p.y) && p.x >= 0 && p.x <= 1000 && p.y >= 0 && p.y <= 620 && sp(p.species) && isFinite(p.fa) && p.fa >= 0 && p.fa <= .2 && isFinite(p.chl) && p.chl >= -1 && p.chl <= 1;
    }).slice(0, 200).map(function (p, i) { return { id: 'm' + i + '-' + Math.round(p.x) + '-' + Math.round(p.y), mine: true, x: +p.x, y: +p.y, species: p.species, fa: +p.fa, chl: +p.chl }; });
  }
  function el(tag, attrs, html) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (html) e.innerHTML = html; return e; }
  var DROP = 'M0 0C-3-6-15-17-15-26A15 15 0 1 1 15-26C15-17 3-6 0 0Z', HEX = '0,-13 11,-6.500 11,6.500 0,13 -11,6.500 -11,-6.500';

  function renderPins() {
    var gF = $('#gFa'), gC = $('#gChl'), gH = $('#gHeat'), k = pinK();
    gF.textContent = ''; gC.textContent = ''; gH.textContent = '';
    allPins().forEach(function (p, idx) {
      var cls = faClass(p.fa), cc = chlClass(p.chl), sp0 = sp(p.species), label = (p.mine ? 'Your sample' : 'Sample ' + (idx + 1)) + ': ' + sp0.name + ', asymmetry class ' + FA_CLASSES[cls - 1].n + ', chlorophyll ' + p.chl.toFixed(2);
      gH.appendChild(el('circle', { cx: p.x, cy: p.y, r: 70, fill: stressColor(stressOf(p.fa, p.chl)), opacity: .55, filter: 'url(#soft)' }));
      var f = el('g', { class: 'pin' + (p.mine ? ' pin--mine' : '') + (map.sel === p.id ? ' is-sel' : ''), 'data-id': p.id, tabindex: 0, role: 'button', 'aria-label': label, transform: 'translate(' + p.x + ' ' + p.y + ') scale(' + k + ')' });
      f.appendChild(el('path', { class: 'shape', d: DROP, fill: faColor(cls) })); f.appendChild(el('path', { class: 'halo', d: DROP }));
      f.appendChild(el('text', { x: 0, y: -21 }, FA_CLASSES[cls - 1].n)); gF.appendChild(f);
      var h = el('g', { class: 'pin' + (p.mine ? ' pin--mine' : '') + (map.sel === p.id ? ' is-sel' : ''), 'data-id': p.id, tabindex: 0, role: 'button', 'aria-label': label.replace('asymmetry class ' + FA_CLASSES[cls - 1].n + ', ', ''), transform: 'translate(' + (p.x + 22 * k) + ' ' + (p.y - 8 * k) + ') scale(' + k + ')' });
      h.appendChild(el('polygon', { class: 'shape', points: HEX, fill: chlColor(cc) })); h.appendChild(el('polygon', { class: 'halo', points: HEX }));
      h.appendChild(el('text', { x: 0, y: 4, style: 'font-size:10.5px' }, fmtChl(p.chl))); gC.appendChild(h);
    });
    var ps = allPins(); $('#statPins').textContent = ps.length;
    var u = {}; ps.forEach(function (p) { u[p.species] = 1; }); $('#statSpecies').textContent = Object.keys(u).length;
    applyLayers(); renderCompare(); renderRecs();
  }
  function applyLayers() {
    $('#gFa').style.display = map.layer === 'chl' ? 'none' : ''; $('#gChl').style.display = map.layer === 'fa' ? 'none' : '';
    $('#gHeat').style.display = map.heat ? '' : 'none';
    $$('#layers .seg__b').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.layer === map.layer)); });
  }
  function pinK() { var w = svg.getBoundingClientRect().width || 1000; return vb.w / 1000 * Math.min(2.2, Math.max(1, 900 / w)); }
  function rescalePins() {
    var k = pinK(); $$('#gFa .pin').forEach(function (g) { var p = byId(g.dataset.id); g.setAttribute('transform', 'translate(' + p.x + ' ' + p.y + ') scale(' + k + ')'); });
    $$('#gChl .pin').forEach(function (g) { var p = byId(g.dataset.id); g.setAttribute('transform', 'translate(' + (p.x + 22 * k) + ' ' + (p.y - 8 * k) + ') scale(' + k + ')'); });
  }
  function byId(id) { return allPins().filter(function (p) { return p.id === id; })[0]; }
  function setVb(next) {
    var w = clamp(next.w, 250, 1000), h = w * .62, x = clamp(next.x, 0, 1000 - w), y = clamp(next.y, 0, 620 - h);
    vb = { x: x, y: y, w: w, h: h }; svg.setAttribute('viewBox', [x, y, w, h].map(function (n) { return n.toFixed(1); }).join(' ')); rescalePins();
  }
  function zoom(f) { var cx = vb.x + vb.w / 2, cy = vb.y + vb.h / 2, w = clamp(vb.w / f, 250, 1000); setVb({ x: cx - w / 2, y: cy - w * .31, w: w }); }
  function toSvg(e) { var r = svg.getBoundingClientRect(); return { x: vb.x + (e.clientX - r.left) / r.width * vb.w, y: vb.y + (e.clientY - r.top) / r.height * vb.h }; }

  function select(id, focus) {
    map.sel = id; var p = byId(id); if (!p) return;
    $$('.pin').forEach(function (g) { g.classList.toggle('is-sel', g.dataset.id === id); });
    var cls = faClass(p.fa), cc = chlClass(p.chl), s0 = sp(p.species), st = stressOf(p.fa, p.chl);
    $('#detail').innerHTML = '<span class="tag' + (p.mine ? ' tag--mine' : '') + '">' + (p.mine ? 'Your sample' : 'Demo sample') + '</span><h4>' + esc(s0.name) + '</h4><p class="latin small muted" style="font-style:italic">' + esc(s0.latin) + '</p>' +
      '<dl><dt>Asymmetry</dt><dd>' + p.fa.toFixed(4) + ' (class ' + FA_CLASSES[cls - 1].n + ')</dd><dt>Chlorophyll</dt><dd>' + p.chl.toFixed(3) + ' (' + esc(CHL_CLASSES[cc].label.toLowerCase()) + ')</dd><dt>Stress</dt><dd>' + Math.round(st * 100) + '%</dd></dl>' +
      (p.mine ? '<button class="btn btn--ghost" type="button" data-remove="' + esc(p.id) + '"><svg class="i" aria-hidden="true"><use href="#i-trash"/></svg>Remove</button>' : '');
  }
  function startPlacing(fromResult) {
    if (!tool.last) { toast('Run an analysis first, then place the result.'); $('#analysis').scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth' }); return; }
    map.placing = true; $('#mapBox').classList.add('is-placing'); $('#mapHint').hidden = false;
    if (fromResult) $('#map').scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth' });
  }
  function stopPlacing() { map.placing = false; $('#mapBox').classList.remove('is-placing'); $('#mapHint').hidden = true; }
  function addMine(x, y) {
    if (!tool.last) { stopPlacing(); return; }
    var p = { id: 'm' + Date.now(), mine: true, x: clamp(x, 10, 990), y: clamp(y, 10, 610), species: tool.last.species, fa: tool.last.fa, chl: tool.last.chl };
    map.mine.push(p); saveMine(); stopPlacing(); renderPins(); select(p.id); toast('Sample placed on the map.');
  }

  function setupMap() {
    var drag = null;
    window.addEventListener('resize', rescalePins);
    svg.addEventListener('pointerdown', function (e) {
      if (e.target.closest('.pin')) return;
      drag = { x: e.clientX, y: e.clientY, vb: { x: vb.x, y: vb.y, w: vb.w }, moved: false };
      svg.setPointerCapture(e.pointerId);
    });
    svg.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var r = svg.getBoundingClientRect(), dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) < 5) return;
      drag.moved = true; $('#mapBox').classList.add('is-drag');
      setVb({ x: drag.vb.x - dx / r.width * vb.w, y: drag.vb.y - dy / r.height * vb.h, w: vb.w });
    });
    function end(e) {
      if (!drag) return;
      var d = drag; drag = null; $('#mapBox').classList.remove('is-drag');
      if (!d.moved && map.placing && e.type === 'pointerup') { var pt = toSvg(e); addMine(pt.x, pt.y); }
    }
    svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);
    svg.addEventListener('click', function (e) { var g = e.target.closest('.pin'); if (g) select(g.dataset.id); });
    svg.addEventListener('keydown', function (e) { var g = e.target.closest && e.target.closest('.pin'); if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); select(g.dataset.id); } });
    $('#zoomIn').addEventListener('click', function () { zoom(1.5); }); $('#zoomOut').addEventListener('click', function () { zoom(1 / 1.5); }); $('#zoomReset').addEventListener('click', function () { setVb(VB0); });
    $('#layers').addEventListener('click', function (e) { var b = e.target.closest('.seg__b'); if (b) { map.layer = b.dataset.layer; applyLayers(); } });
    $('#heatToggle').addEventListener('change', function (e) { map.heat = e.target.checked; applyLayers(); });
    $('#cancelPlace').addEventListener('click', stopPlacing);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && map.placing) stopPlacing(); });
    $('#placeCenter').addEventListener('click', function () { if (!tool.last) { toast('Run an analysis first, then place the result.'); return; } addMine(vb.x + vb.w / 2, vb.y + vb.h / 2); });
    $('#detail').addEventListener('click', function (e) {
      var b = e.target.closest('[data-remove]'); if (!b) return;
      map.mine = map.mine.filter(function (p) { return p.id !== b.dataset.remove; }); saveMine(); map.sel = null; $('#detail').innerHTML = '<p class="muted">Select a marker to see its readings.</p>'; renderPins();
    });
    $('#clearBtn').addEventListener('click', function () {
      if (!map.mine.length) { toast('You have no samples on the map.'); return; }
      if (!confirm('Remove all of your samples from the map?')) return;
      map.mine = []; saveMine(); map.sel = null; $('#detail').innerHTML = '<p class="muted">Select a marker to see its readings.</p>'; renderPins();
    });
    $('#exportBtn').addEventListener('click', function () {
      if (!map.mine.length) { toast('Nothing to export yet.'); return; }
      var blob = new Blob([JSON.stringify({ app: 'eco-analysis', version: 1, samples: map.mine.map(function (p) { return { x: p.x, y: p.y, species: p.species, fa: p.fa, chl: p.chl }; }) }, null, 2)], { type: 'application/json' });
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'eco-analysis-samples.json'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 500);
    });
    $('#importBtn').addEventListener('click', function () { $('#importInput').click(); });
    $('#importInput').addEventListener('change', async function (e) {
      var f = e.target.files[0]; e.target.value = ''; if (!f) return;
      try {
        var raw = JSON.parse(await f.text()), list = Array.isArray(raw) ? raw : raw.samples, ok = validate(list);
        if (!ok.length) throw new Error('empty'); map.mine = ok; saveMine(); renderPins(); toast('Imported ' + ok.length + ' of ' + list.length + ' samples.');
      } catch (err) { toast('That file is not a valid sample export.'); }
    });
  }

  /* ---------- comparison and recommendations ---------- */
  function renderCompare() {
    var g = {}; allPins().forEach(function (p) { var o = g[p.species] = g[p.species] || { fa: 0, chl: 0, st: 0, n: 0 }; o.fa += p.fa; o.chl += p.chl; o.st += stressOf(p.fa, p.chl); o.n++; });
    var rows = Object.keys(g).map(function (id) { var o = g[id]; return { s: sp(id), fa: o.fa / o.n, chl: o.chl / o.n, st: o.st / o.n, n: o.n }; }).sort(function (a, b) { return a.st - b.st; });
    $('#compare').innerHTML = '<table class="table"><thead><tr><th scope="col">Species</th><th scope="col">Mean FA</th><th scope="col">Mean ChlI</th><th scope="col">Stress</th><th scope="col">Samples</th></tr></thead><tbody>' +
      rows.map(function (r) {
        return '<tr><td><span class="cmp-name">' + esc(r.s.name) + '</span><span class="cmp-latin">' + esc(r.s.latin) + '</span></td><td>' + r.fa.toFixed(4) + '</td><td>' + r.chl.toFixed(3) + '</td><td><div class="cmp-bar"><div class="bar"><span style="width:' + (r.st * 100).toFixed(0) + '%;background:' + stressColor(r.st) + '"></span></div><b>' + (r.st * 100).toFixed(0) + '%</b></div></td><td>' + r.n + '</td></tr>';
      }).join('') + '</tbody></table>';
  }
  function renderRecs() {
    var ps = allPins(), as = ps.reduce(function (s, p) { return s + stressOf(p.fa, p.chl); }, 0) / ps.length, ac = ps.reduce(function (s, p) { return s + p.chl; }, 0) / ps.length, L = [];
    if (as > .6) { L.push('The average stress is high. Plant tolerant species such as balsam poplar and white willow.'); L.push('Avoid sensitive species such as Norway maple and silver birch here.'); }
    else if (as > .35) { L.push('The average stress is moderate. Small-leaved lime and goat willow are a good fit.'); L.push('Use silver birch as an indicator to track changes over time.'); }
    else { L.push('Conditions look favourable. Most species will do well, including maple and birch.'); L.push('Mixed plantings give the most biodiversity.'); }
    if (ac < .02) L.push('The average chlorophyll index is low, which points to acute stress. Check for emission sources nearby.');
    $('#recList').innerHTML = L.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '<li class="muted">Based on ' + ps.length + ' samples with an average stress of ' + Math.round(as * 100) + '%.</li>';
    $('#recDyn').hidden = false;
  }

  /* ---------- start ---------- */
  function init() {
    setupChrome(); renderStatic(); loadMine(); setupTool(); setupMap(); renderPins();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
