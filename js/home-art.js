// Homepage banner: a "Collatz coral".
// Each random starting number's Collatz path is traced backwards from 1,
// turning one way on even values and the other way on odd values.
// Click the banner to grow a new one.
(function () {
  var canvas = document.querySelector('.home-art');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');

  var COUNT = 300;
  var MAX_START = 10000;
  var EVEN_TURN = 0.075;
  var ODD_TURN = -0.16;
  var GROW_MS = 2200;
  var PAD = 14;
  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var paths = [];
  var frame = null;

  function collatz(n) {
    var seq = [n];
    while (n !== 1) {
      n = n % 2 === 0 ? n / 2 : 3 * n + 1;
      seq.push(n);
    }
    return seq.reverse(); // grow outward from 1
  }

  // Build every path in unit steps, then scale them all to fit the canvas.
  function buildPaths(w, h) {
    var raw = [];
    var minX = 0, maxX = 0, minY = 0, maxY = 0;
    for (var i = 0; i < COUNT; i++) {
      var seq = collatz(2 + Math.floor(Math.random() * MAX_START));
      var x = 0, y = 0, angle = 0;
      var pts = [[0, 0]];
      for (var j = 1; j < seq.length; j++) {
        angle += seq[j] % 2 === 0 ? EVEN_TURN : ODD_TURN;
        x += Math.cos(angle);
        y += Math.sin(angle);
        pts.push([x, y]);
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
      raw.push({ pts: pts, gold: Math.random() < 0.75 });
    }
    // Size the coral by the bulk of its strands (ignoring the few longest
    // outliers, which can run off the edges), trying a range of rotations
    // and keeping the one that fills the wide banner best.
    var availW = w - 2 * PAD, availH = h - 2 * PAD;
    function pct(arr, f) { return arr[Math.floor(f * (arr.length - 1))]; }
    function bounds(c, s) {
      var xs = [], ys = [];
      raw.forEach(function (p) {
        for (var k = 0; k < p.pts.length; k += 2) {
          var q = p.pts[k];
          xs.push(q[0] * c - q[1] * s);
          ys.push(q[0] * s + q[1] * c);
        }
      });
      xs.sort(function (a, b) { return a - b; });
      ys.sort(function (a, b) { return a - b; });
      return { x0: pct(xs, 0.02), x1: pct(xs, 0.98), y0: pct(ys, 0.04), y1: pct(ys, 0.96) };
    }
    var best = null;
    for (var r = 0; r < 36; r++) {
      var a = r * Math.PI / 18, c = Math.cos(a), s = Math.sin(a);
      var b = bounds(c, s);
      var sc = Math.min(availW / (b.x1 - b.x0 || 1), availH / (b.y1 - b.y0 || 1));
      if (!best || sc > best.sc) best = { sc: sc, c: c, s: s, b: b };
    }
    raw.forEach(function (p) {
      p.pts = p.pts.map(function (q) {
        return [q[0] * best.c - q[1] * best.s, q[0] * best.s + q[1] * best.c];
      });
    });
    var scale = best.sc;
    minX = best.b.x0; maxX = best.b.x1; minY = best.b.y0; maxY = best.b.y1;
    var offX = (w - (maxX - minX) * scale) / 2 - minX * scale;
    var offY = (h - (maxY - minY) * scale) / 2 - minY * scale;
    raw.forEach(function (p) {
      p.pts = p.pts.map(function (q) {
        return [offX + q[0] * scale, offY + q[1] * scale];
      });
    });
    return raw;
  }

  // Draw segments [from, to) of every path.
  function drawSteps(from, to) {
    paths.forEach(function (p) {
      var end = Math.min(to, p.pts.length - 1);
      if (end <= from) return;
      ctx.strokeStyle = p.gold ? 'rgba(245, 190, 0, 0.22)' : 'rgba(170, 170, 170, 0.18)';
      ctx.beginPath();
      ctx.moveTo(p.pts[from][0], p.pts[from][1]);
      for (var k = from + 1; k <= end; k++) ctx.lineTo(p.pts[k][0], p.pts[k][1]);
      ctx.stroke();
    });
  }

  function render() {
    if (frame) cancelAnimationFrame(frame);
    var dpr = window.devicePixelRatio || 1;
    var w = canvas.clientWidth, h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = 1;
    ctx.lineJoin = 'round';

    paths = buildPaths(w, h);
    var longest = paths.reduce(function (m, p) { return Math.max(m, p.pts.length); }, 0);

    if (reduceMotion) {
      drawSteps(0, longest);
      return;
    }
    var start = null, drawn = 0;
    function tick(t) {
      if (start === null) start = t;
      var progress = Math.min(1, (t - start) / GROW_MS);
      var eased = 1 - Math.pow(1 - progress, 3);
      var target = Math.ceil(eased * longest);
      if (target > drawn) {
        drawSteps(drawn, target);
        drawn = target;
      }
      if (progress < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
  }

  var resizeTimer = null, lastWidth = canvas.clientWidth;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      if (canvas.clientWidth !== lastWidth) {
        lastWidth = canvas.clientWidth;
        render();
      }
    }, 200);
  });
  canvas.addEventListener('click', render);

  render();
})();
