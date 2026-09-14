// ============================================
// NEON PUZZLE SPACE — scroll-driven background scene
// Pure Canvas 2D, no 3D model / WebGL required.
// Jigsaw-piece silhouettes fly outward from a vanishing
// point, depth-mapped with a hand-rolled perspective
// projection. Scroll speed/direction drives the "warp".
// ============================================

(function () {
  const canvas = document.getElementById('bgScene');
  if (!canvas) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ctx = canvas.getContext('2d');
  const isCoarse = window.matchMedia('(pointer: coarse)').matches;

  const PIECE_COUNT = isCoarse ? 22 : 46;
  const HUES = [
    { r: 212, g: 169, b: 80, w: 0.55 },  // gold (primary)
    { r: 94, g: 224, b: 214, w: 0.25 },  // cyan
    { r: 176, g: 132, b: 255, w: 0.20 }, // violet
  ];

  function pickHue() {
    const roll = Math.random();
    let acc = 0;
    for (const h of HUES) { acc += h.w; if (roll <= acc) return h; }
    return HUES[0];
  }

  // Jigsaw-piece Path2D, unit square 0..100 with a tab (bump) on
  // top + bottom edges and a blank (notch) on left + right edges.
  const KNOB = 15;
  const piecePath = new Path2D(`
    M 0,0
    L ${50 - KNOB},0
    A ${KNOB},${KNOB} 0 1 1 ${50 + KNOB},0
    L 100,0
    L 100,${50 - KNOB}
    A ${KNOB},${KNOB} 0 1 0 100,${50 + KNOB}
    L 100,100
    L ${50 + KNOB},100
    A ${KNOB},${KNOB} 0 1 1 ${50 - KNOB},100
    L 0,100
    L 0,${50 + KNOB}
    A ${KNOB},${KNOB} 0 1 0 0,${50 - KNOB}
    Z
  `);

  let W = 0, H = 0, DPR = 1;
  let pieces = [];
  let running = true;
  let lastT = performance.now();

  // scroll-driven thrust
  let lastScrollY = window.scrollY;
  let thrust = 0.00035; // idle ambient drift

  // gentle mouse parallax (desktop only)
  let mouseX = 0, mouseY = 0, parX = 0, parY = 0;

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
  }

  function spawnPiece(initial) {
    let dx, dy, mag;
    do {
      dx = Math.random() * 2 - 1;
      dy = Math.random() * 2 - 1;
      mag = Math.hypot(dx, dy);
    } while (mag < 0.18);
    dx /= mag; dy /= mag;
    return {
      dx, dy,
      z: initial ? Math.random() * 1 : 0.02 + Math.random() * 0.06,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.4,
      size: 20 + Math.random() * 16,
      hue: pickHue(),
    };
  }

  function init() {
    resize();
    pieces = [];
    for (let i = 0; i < PIECE_COUNT; i++) pieces.push(spawnPiece(true));
  }

  function onScroll() {
    const y = window.scrollY;
    const delta = y - lastScrollY;
    lastScrollY = y;
    // clamp so a huge jump (e.g. anchor jump) doesn't blast pieces off-frame
    const clamped = Math.max(-60, Math.min(60, delta));
    thrust += clamped * 0.000085;
  }

  function draw(t) {
    if (!running) return;
    const dt = Math.min(48, t - lastT);
    lastT = t;

    // relax thrust back toward idle drift
    thrust += (0.00035 - thrust) * 0.02;

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);

    parX += ((mouseX - 0.5) * 24 - parX) * 0.04;
    parY += ((mouseY - 0.5) * 24 - parY) * 0.04;

    const cx = W / 2 + parX;
    const cy = H / 2 + parY;
    const spread = Math.max(W, H) * 0.62;

    ctx.globalCompositeOperation = 'lighter';

    for (let i = 0; i < pieces.length; i++) {
      const p = pieces[i];
      p.z += thrust * (dt * 0.06);
      p.rot += p.rotSpeed * dt * 0.001;

      if (p.z >= 1 || p.z <= 0) {
        pieces[i] = spawnPiece(false);
        continue;
      }

      const persp = 1 / (1.0001 - p.z);
      const x = cx + p.dx * persp * spread * 0.14;
      const y = cy + p.dy * persp * spread * 0.14;

      if (x < -80 || x > W + 80 || y < -80 || y > H + 80) {
        pieces[i] = spawnPiece(false);
        continue;
      }

      const scale = (p.size / 100) * Math.min(persp, 5.5) * 0.9;
      const alpha = Math.min(0.55, 0.05 + p.z * 0.5);
      const glow = 6 + p.z * 22;
      const { r, g, b } = p.hue;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(p.rot);
      ctx.scale(scale, scale);
      ctx.translate(-50, -50);
      ctx.lineWidth = 3.2;
      ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
      ctx.shadowColor = `rgba(${r},${g},${b},${Math.min(1, alpha + 0.25)})`;
      ctx.shadowBlur = glow;
      ctx.stroke(piecePath);
      ctx.restore();
    }

    ctx.globalCompositeOperation = 'source-over';

    requestAnimationFrame(draw);
  }

  function staticFrame() {
    // reduced-motion: draw one calm, non-animating frame
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    pieces.forEach((p, i) => {
      p.z = 0.15 + (i / pieces.length) * 0.5;
      const persp = 1 / (1.0001 - p.z);
      const cx = W / 2, cy = H / 2, spread = Math.max(W, H) * 0.62;
      const x = cx + p.dx * persp * spread * 0.14;
      const y = cy + p.dy * persp * spread * 0.14;
      const scale = (p.size / 100) * Math.min(persp, 5.5) * 0.9;
      const { r, g, b } = p.hue;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(p.rot);
      ctx.scale(scale, scale);
      ctx.translate(-50, -50);
      ctx.lineWidth = 3.2;
      ctx.strokeStyle = `rgba(${r},${g},${b},0.22)`;
      ctx.shadowColor = `rgba(${r},${g},${b},0.3)`;
      ctx.shadowBlur = 10;
      ctx.stroke(piecePath);
      ctx.restore();
    });
    ctx.globalCompositeOperation = 'source-over';
  }

  window.addEventListener('resize', () => { resize(); });
  window.addEventListener('scroll', onScroll, { passive: true });

  if (!isCoarse) {
    window.addEventListener('pointermove', (e) => {
      mouseX = e.clientX / W;
      mouseY = e.clientY / H;
    }, { passive: true });
  }

  document.addEventListener('visibilitychange', () => {
    running = !document.hidden && !reduceMotion;
    if (running) { lastT = performance.now(); requestAnimationFrame(draw); }
  });

  init();

  if (reduceMotion) {
    staticFrame();
  } else {
    running = true;
    requestAnimationFrame(draw);
  }
})();
