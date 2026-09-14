// ============================================
// AMBIENT NETWORK — minimal scroll/mouse-reactive background
// Pure Canvas 2D, deliberately cheap: capped DPR, a handful of
// soft particles blitted from one pre-rendered sprite, and a
// sparse nearest-neighbor line pass. No per-frame gradients,
// no shadowBlur, no heavy path stroking.
// ============================================

(function () {
  const canvas = document.getElementById('bgScene');
  if (!canvas) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ctx = canvas.getContext('2d');
  const isCoarse = window.matchMedia('(pointer: coarse)').matches;

  const COUNT = isCoarse ? 16 : 26;
  const LINK_DIST = isCoarse ? 110 : 140;
  const MOUSE_R = 130;

  let W = 0, H = 0, DPR = 1;
  let particles = [];
  let running = true;
  let lastT = performance.now();

  let lastScrollY = window.scrollY;
  let driftBoost = 0;

  let mouseX = -9999, mouseY = -9999;

  let sprite = null;
  let particleColor = '212,169,80';

  function readThemeColor() {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--scene-particle').trim();
    if (v) particleColor = v;
  }

  function buildSprite() {
    const size = 64;
    const off = document.createElement('canvas');
    off.width = size; off.height = size;
    const octx = off.getContext('2d');
    const grad = octx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, `rgba(${particleColor},0.9)`);
    grad.addColorStop(0.4, `rgba(${particleColor},0.35)`);
    grad.addColorStop(1, `rgba(${particleColor},0)`);
    octx.fillStyle = grad;
    octx.fillRect(0, 0, size, size);
    sprite = off;
  }

  function resize() {
    DPR = 1; // deliberately uncapped-but-low: this layer is soft/blurred, retina sharpness isn't needed
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
  }

  function spawnParticle() {
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.055,
      vy: (Math.random() - 0.5) * 0.055,
      r: 5 + Math.random() * 6,
      alpha: 0.35 + Math.random() * 0.4,
    };
  }

  function init() {
    resize();
    readThemeColor();
    buildSprite();
    particles = [];
    for (let i = 0; i < COUNT; i++) particles.push(spawnParticle());
  }

  function onScroll() {
    const y = window.scrollY;
    const delta = y - lastScrollY;
    lastScrollY = y;
    const clamped = Math.max(-90, Math.min(90, delta));
    driftBoost += clamped * 0.00055;
    driftBoost = Math.max(-0.6, Math.min(0.6, driftBoost));
  }

  function draw(t) {
    if (!running) return;
    const dt = Math.min(48, t - lastT);
    lastT = t;

    driftBoost += (0 - driftBoost) * 0.02;

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const margin = 40;
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      // gentle mouse repulsion
      const dxm = p.x - mouseX, dym = p.y - mouseY;
      const distM = Math.hypot(dxm, dym);
      if (distM < MOUSE_R) {
        const f = (1 - distM / MOUSE_R) * 0.018;
        p.vx += (dxm / (distM || 1)) * f;
        p.vy += (dym / (distM || 1)) * f;
      }

      p.x += p.vx * dt;
      p.y += (p.vy + driftBoost * 0.03) * dt;

      // gentle velocity damping so mouse impulses settle
      p.vx *= 0.994;
      p.vy *= 0.994;

      if (p.x < -margin) p.x = W + margin;
      if (p.x > W + margin) p.x = -margin;
      if (p.y < -margin) p.y = H + margin;
      if (p.y > H + margin) p.y = -margin;
    }

    // connecting lines (sparse network)
    ctx.lineWidth = 1;
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i], b = particles[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const dist = Math.hypot(dx, dy);
        if (dist < LINK_DIST) {
          const alpha = (1 - dist / LINK_DIST) * 0.12;
          ctx.strokeStyle = `rgba(${particleColor},${alpha})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // particles (blitted sprite, cheap)
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      ctx.globalAlpha = p.alpha;
      ctx.drawImage(sprite, p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
    }
    ctx.globalAlpha = 1;

    requestAnimationFrame(draw);
  }

  function staticFrame() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.globalAlpha = 0.5;
    particles.forEach(p => {
      ctx.drawImage(sprite, p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
    });
    ctx.globalAlpha = 1;
  }

  window.addEventListener('resize', () => { resize(); });
  window.addEventListener('scroll', onScroll, { passive: true });

  if (!isCoarse) {
    window.addEventListener('pointermove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    }, { passive: true });
    window.addEventListener('pointerleave', () => { mouseX = -9999; mouseY = -9999; });
  }

  document.addEventListener('visibilitychange', () => {
    running = !document.hidden && !reduceMotion;
    if (running) { lastT = performance.now(); requestAnimationFrame(draw); }
  });

  window.addEventListener('themechange', () => {
    readThemeColor();
    buildSprite();
  });

  init();

  if (reduceMotion) {
    staticFrame();
  } else {
    running = true;
    requestAnimationFrame(draw);
  }
})();
