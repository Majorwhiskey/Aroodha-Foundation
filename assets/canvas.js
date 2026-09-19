// Scroll-driven canvas scenes. Each <canvas data-scene="…"> is wiped and redrawn from
// scratch whenever its one input changes: p, how far through its section you have
// scrolled (0 → 1). Nothing is pre-drawn or recorded, so every scene is a few hundred
// lines of arithmetic, and it scrubs backwards exactly as smoothly as forwards.
//
//   noise  – "Sit until the noise gets bored of you": turbulent water settles to stillness
//   nada   – Chladni figures: the zero-set of cos(nπx)cos(mπy) − cos(mπx)cos(nπy), morphing
//            through vibration modes, traced with marching squares
//   mala   – japa: 108 beads and the guru bead, lit one by one
//   lotus  – a lotus bud rises from the water and opens, reflected below
//
// Attributes: data-trigger (selector, default the parent section), data-start / data-end
// (desktop ScrollTrigger positions), data-start-sm / data-end-sm (below 1024px),
// data-pin (selector pinned on desktop). Reduced motion draws the finished figure (p = 1).
(() => {
  const canvases = [...document.querySelectorAll('canvas[data-scene]')];
  if (!canvases.length) return;
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DPR = Math.min(2, window.devicePixelRatio || 1);
  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };
  const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

  const palette = (onDark) => {
    const evening = root.classList.contains('evening');
    return {
      gold: (a) => `rgba(${onDark || evening ? '223,183,108' : '181,135,44'},${a})`,
      ink: (a) => `rgba(${onDark || evening ? '238,242,250' : '15,43,92'},${a})`,
      serif: '"Cormorant Garamond", "EB Garamond", serif',
      sans: '"Plus Jakarta Sans", sans-serif'
    };
  };

  // ── noise: layered sine turbulence whose amplitude decays to zero ─────────────
  function noise(ctx, W, H, p) {
    const c = palette(true);
    const lines = Math.max(24, Math.round(H / 15));
    const amp = Math.pow(1 - p, 1.7);
    const calm = smooth(0.55, 1, p);
    for (let i = 0; i < lines; i++) {
      const y0 = (i + 0.5) * H / lines;
      const r1 = hash(i) * TAU, r2 = hash(i + 50) * TAU, r3 = hash(i + 99) * TAU;
      const nearCentre = 1 - Math.min(1, Math.abs(y0 / H - 0.5) * 1.8);
      const height = (6 + 42 * nearCentre) * amp;
      ctx.beginPath();
      for (let x = 0; x <= W + 5; x += 5) {
        const u = x / W;
        const env = Math.pow(Math.sin(Math.PI * u), 2);
        const n = 0.55 * Math.sin(u * 9.1 + i * 0.7 + r1 + p * 7)
                + 0.3 * Math.sin(u * 23.7 - i * 0.33 + r2 - p * 11)
                + 0.15 * Math.sin(u * 57.3 + i * 1.1 + r3 + p * 17);
        const y = y0 + n * env * height;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.strokeStyle = c.gold(0.07 + 0.13 * nearCentre);
      ctx.lineWidth = 1;
      ctx.stroke();
      // once the water is nearly still, moonlight spreads across the lower lines
      if (calm > 0 && y0 > H * 0.5) {
        const depth = (y0 - H * 0.5) / (H * 0.5);
        const half = W * (0.03 + 0.22 * depth) * calm;
        const g = ctx.createLinearGradient(W / 2 - half, 0, W / 2 + half, 0);
        g.addColorStop(0, c.gold(0));
        g.addColorStop(0.5, c.gold(0.5 * calm * (1 - depth * 0.6)));
        g.addColorStop(1, c.gold(0));
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(W / 2 - half, y0);
        ctx.lineTo(W / 2 + half, y0);
        ctx.stroke();
      }
    }
  }

  // ── nada: Chladni plate figures traced with marching squares ─────────────────
  const MODES = [[1, 2], [2, 3], [1, 4], [3, 5], [2, 7], [4, 7], [5, 9], [3, 11]];
  const G = 128;
  const field = new Float32Array((G + 1) * (G + 1));
  function nada(ctx, W, H, p) {
    const c = palette(false);
    const t = p * (MODES.length - 1);
    const k = Math.min(MODES.length - 2, Math.floor(t));
    const f = smooth(0.15, 0.85, t - k);
    const n = lerp(MODES[k][0], MODES[k + 1][0], f);
    const m = lerp(MODES[k][1], MODES[k + 1][1], f);
    const S = Math.min(W, H) * 0.94, ox = (W - S) / 2, oy = (H - S) / 2, cell = S / G, R = S / 2;
    const PI = Math.PI;
    for (let j = 0; j <= G; j++) {
      const y = j / G;
      const cny = Math.cos(n * PI * y), cmy = Math.cos(m * PI * y);
      for (let i = 0; i <= G; i++) {
        const x = i / G;
        field[j * (G + 1) + i] = Math.cos(n * PI * x) * cmy - Math.cos(m * PI * x) * cny;
      }
    }
    ctx.save();
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, R, 0, TAU);
    ctx.clip();
    // faint fill so the plate reads as an object
    const plate = ctx.createRadialGradient(W / 2, H / 2, R * 0.1, W / 2, H / 2, R);
    plate.addColorStop(0, c.gold(0.07));
    plate.addColorStop(1, c.gold(0.015));
    ctx.fillStyle = plate;
    ctx.fillRect(ox, oy, S, S);
    const trace = (level, width, alpha) => {
      ctx.beginPath();
      const at = (i, j) => field[j * (G + 1) + i] - level;
      const cross = (a, b) => a / (a - b);
      for (let j = 0; j < G; j++) {
        for (let i = 0; i < G; i++) {
          const a = at(i, j), b = at(i + 1, j), d = at(i, j + 1), e = at(i + 1, j + 1);
          const pts = [];
          if ((a > 0) !== (b > 0)) pts.push([i + cross(a, b), j]);
          if ((b > 0) !== (e > 0)) pts.push([i + 1, j + cross(b, e)]);
          if ((d > 0) !== (e > 0)) pts.push([i + cross(d, e), j + 1]);
          if ((a > 0) !== (d > 0)) pts.push([i, j + cross(a, d)]);
          for (let q = 0; q + 1 < pts.length; q += 2) {
            ctx.moveTo(ox + pts[q][0] * cell, oy + pts[q][1] * cell);
            ctx.lineTo(ox + pts[q + 1][0] * cell, oy + pts[q + 1][1] * cell);
          }
        }
      }
      ctx.lineWidth = width;
      ctx.strokeStyle = c.gold(alpha);
      ctx.stroke();
    };
    trace(0.45, 0.8, 0.18);
    trace(-0.45, 0.8, 0.18);
    trace(0, 1.8, 0.85);
    ctx.restore();
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, R, 0, TAU);
    ctx.strokeStyle = c.gold(0.45);
    ctx.lineWidth = 1;
    ctx.stroke();
    return `Mode ${n.toFixed(2)} : ${m.toFixed(2)}`;
  }

  // ── mala: 108 beads and the guru bead ────────────────────────────────────────
  function mala(ctx, W, H, p) {
    const c = palette(false);
    const N = 108;
    const count = p * N;
    const cx = W / 2, cy = H * 0.46, R = Math.min(W, H) * 0.38;
    const gap = 0.14;
    const bead = R * 0.043;
    const pos = (k) => {
      const a = Math.PI + gap + (k + 0.5) / N * (TAU - 2 * gap);
      return [cx + R * Math.sin(a), cy - R * Math.cos(a) * 1.04];
    };
    // thread
    ctx.beginPath();
    for (let k = 0; k <= N; k++) { const [x, y] = pos(Math.min(k, N - 1)); k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.strokeStyle = c.gold(0.25);
    ctx.lineWidth = 1;
    ctx.stroke();
    for (let k = 0; k < N; k++) {
      const [x, y] = pos(k);
      const lit = clamp(count - k);
      const current = k === Math.floor(count) && count < N;
      const r = bead * (current ? 1 + 0.5 * Math.sin((count - k) * Math.PI) : 1);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      if (lit > 0) {
        ctx.fillStyle = c.gold(0.25 + 0.75 * lit);
        ctx.shadowColor = c.gold(0.8);
        ctx.shadowBlur = current ? 16 : 0;
        ctx.fill();
        ctx.shadowBlur = 0;
      } else {
        ctx.strokeStyle = c.gold(0.35);
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
    // guru bead and tassel at the bottom
    const gx = cx, gy = cy + R * 1.04 + bead * 2.2;
    ctx.beginPath();
    ctx.arc(gx, gy, bead * 1.8, 0, TAU);
    ctx.fillStyle = c.gold(count >= N - 0.01 ? 1 : 0.55);
    ctx.fill();
    for (let s = -4; s <= 4; s++) {
      ctx.beginPath();
      ctx.moveTo(gx + s * bead * 0.25, gy + bead * 1.8);
      ctx.quadraticCurveTo(gx + s * bead * 0.6, gy + bead * 5, gx + s * bead * 0.9, gy + bead * 8.5);
      ctx.strokeStyle = c.gold(0.45);
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    // the count
    const shown = Math.min(N, Math.floor(count + 0.001));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = c.ink(0.9);
    ctx.font = `600 ${Math.round(R * 0.42)}px ${c.serif}`;
    ctx.fillText(String(shown), cx, cy - R * 0.05);
    ctx.fillStyle = c.gold(0.9);
    ctx.font = `600 ${Math.max(10, Math.round(R * 0.06))}px ${c.sans}`;
    ctx.fillText(shown >= N ? 'ONE MALA COMPLETE' : 'OF 108', cx, cy + R * 0.25);
  }

  // ── lotus: rises from the water and opens ────────────────────────────────────
  function lotus(ctx, W, H, p) {
    const c = palette(false);
    const rise = smooth(0, 0.45, p);
    const bloom = smooth(0.2, 0.95, p);
    const water = H * 0.7;
    const scale = Math.min(W, H) * 0.42;
    const baseX = W / 2, baseY = water + scale * 0.35 * (1 - rise) - scale * 0.05 * rise;
    const petal = (angle, len, width, fill, stroke) => {
      const tipX = baseX + Math.sin(angle) * len, tipY = baseY - Math.cos(angle) * len;
      const nx = Math.cos(angle) * width, ny = Math.sin(angle) * width;
      const midX = baseX + Math.sin(angle) * len * 0.5, midY = baseY - Math.cos(angle) * len * 0.5;
      ctx.beginPath();
      ctx.moveTo(baseX, baseY);
      ctx.quadraticCurveTo(midX - nx, midY - ny, tipX, tipY);
      ctx.quadraticCurveTo(midX + nx, midY + ny, baseX, baseY);
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.1;
      ctx.stroke();
    };
    const drawFlower = () => {
      // stem below the flower
      ctx.beginPath();
      ctx.moveTo(baseX, baseY);
      ctx.quadraticCurveTo(baseX - scale * 0.05, baseY + scale * 0.5, baseX + scale * 0.02, baseY + scale);
      ctx.strokeStyle = c.gold(0.35);
      ctx.lineWidth = 1.2;
      ctx.stroke();
      const layers = [
        { n: 7, spread: lerp(0.05, 0.36, bloom), len: lerp(0.55, 0.9, bloom), w: 0.2, a: 0.1 },
        { n: 5, spread: lerp(0.04, 0.3, bloom), len: lerp(0.6, 1, bloom), w: 0.24, a: 0.16 },
        { n: 3, spread: lerp(0.03, 0.22, smooth(0.4, 1, p)), len: lerp(0.62, 0.92, bloom), w: 0.22, a: 0.24 }
      ];
      layers.forEach(L => {
        for (let i = 0; i < L.n; i++) {
          const ang = (i - (L.n - 1) / 2) * L.spread;
          petal(ang, scale * L.len, scale * L.w, c.gold(L.a), c.gold(0.75));
        }
      });
      // seed pod appears as the flower opens
      const pod = smooth(0.7, 1, p);
      if (pod > 0) {
        for (let d = 0; d < 13; d++) {
          const a = d * 2.39996, r = scale * 0.022 * Math.sqrt(d);
          ctx.beginPath();
          ctx.arc(baseX + Math.cos(a) * r, baseY - scale * 0.42 + Math.sin(a) * r * 0.4, scale * 0.012, 0, TAU);
          ctx.fillStyle = c.gold(0.9 * pod);
          ctx.fill();
        }
      }
    };
    // the flower above the water
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W, water); ctx.clip();
    drawFlower();
    ctx.restore();
    // its reflection, faint and flattened, below the water line
    ctx.save();
    ctx.beginPath(); ctx.rect(0, water, W, H - water); ctx.clip();
    ctx.globalAlpha = 0.28;
    ctx.translate(0, water * 2);
    ctx.scale(1, -1);
    drawFlower();
    ctx.restore();
    // water: ripples spread wider as the bud breaks the surface
    for (let r = 0; r < 7; r++) {
      const y = water + r * H * 0.04;
      const half = W * (0.08 + r * 0.06) * (0.4 + 0.6 * rise);
      ctx.beginPath();
      for (let x = -half; x <= half; x += 4) {
        const yy = y + Math.sin(x * 0.05 + r + p * 9) * (1 - r / 7) * 2.2 * (1 - bloom * 0.7);
        x === -half ? ctx.moveTo(W / 2 + x, yy) : ctx.lineTo(W / 2 + x, yy);
      }
      ctx.strokeStyle = c.gold(0.3 * (1 - r / 7));
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  const SCENES = { noise, nada, mala, lotus };
  const hasST = !!(window.gsap && window.ScrollTrigger);
  const all = [];

  canvases.forEach(cv => {
    const draw = SCENES[cv.dataset.scene];
    if (!draw) return;
    const ctx = cv.getContext('2d');
    const section = cv.closest('section');
    const readout = section && section.querySelector('[data-scene-readout]');
    const state = { p: reduce ? 1 : 0 };
    let W = 0, H = 0, queued = false;
    const render = () => {
      queued = false;
      if (!W || !H) return;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const out = draw(ctx, W, H, state.p);
      if (readout && out) readout.textContent = out;
    };
    const redraw = () => { if (!queued) { queued = true; requestAnimationFrame(render); } };
    const resize = () => {
      const r = cv.getBoundingClientRect();
      W = r.width; H = r.height;
      cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
      redraw();
    };
    new ResizeObserver(resize).observe(cv);
    all.push(redraw);
    if (reduce) return;

    const trigger = cv.dataset.trigger ? document.querySelector(cv.dataset.trigger) : section;
    const setP = (v) => {
      if (hasST) gsap.to(state, { p: v, duration: 0.45, ease: 'power2.out', overwrite: true, onUpdate: redraw });
      else { state.p = v; redraw(); }
    };
    if (hasST) {
      gsap.matchMedia().add({ wide: '(min-width: 1024px)', narrow: '(max-width: 1023px)' }, (ctxMM) => {
        const wide = ctxMM.conditions.wide;
        const pin = wide && cv.dataset.pin ? document.querySelector(cv.dataset.pin) : false;
        ScrollTrigger.create({
          trigger,
          start: (wide ? cv.dataset.start : cv.dataset.startSm) || cv.dataset.start || 'top 80%',
          end: (wide ? cv.dataset.end : cv.dataset.endSm) || cv.dataset.end || 'bottom 20%',
          pin,
          onUpdate: self => setP(self.progress),
          onRefresh: self => { state.p = self.progress; redraw(); }
        });
      });
    } else {
      // no GSAP: progress from the section's position in the viewport
      const update = () => {
        const r = trigger.getBoundingClientRect(), vh = window.innerHeight;
        setP(clamp((vh * 0.8 - r.top) / (r.height + vh * 0.6)));
      };
      window.addEventListener('scroll', update, { passive: true });
      update();
    }
  });

  // colours follow the morning / evening theme and the web fonts once loaded
  new MutationObserver(() => all.forEach(r => r())).observe(root, { attributes: true, attributeFilter: ['class'] });
  if (document.fonts) document.fonts.ready.then(() => all.forEach(r => r()));
})();
