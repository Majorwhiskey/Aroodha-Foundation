// Scroll-driven canvas scenes. Each <canvas data-scene="…"> is wiped and redrawn from
// scratch whenever its one input changes: p, how far through its section you have
// scrolled (0 → 1). Nothing is pre-drawn or recorded, so every scene is a few hundred
// lines of arithmetic, and it scrubs backwards exactly as smoothly as forwards.
//
//   noise  – "Sit until the noise gets bored of you": turbulent water settles to stillness
//   mantra – the Pavamana mantra written in points of light, line by line, as the field
//            dawns from darkness to light
//   neti   – "not this, not this": drifting thoughts let go one by one until ಸತ್ಯ remains
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

  // ── mantra: the Pavamana mantra written in points of light ───────────────────
  // Each line is rendered once to an offscreen canvas and sampled into N points;
  // p decides which two lines the points are travelling between and how far.
  const KANNADA = '"Noto Serif Kannada", "Nirmala UI", "Tunga", serif';
  const MANTRA = [
    ['ಅಸತೋ ಮಾ ಸದ್ಗಮಯ', 'Lead me from the unreal to the real'],
    ['ತಮಸೋ ಮಾ ಜ್ಯೋತಿರ್ಗಮಯ', 'Lead me from darkness to light'],
    ['ಮೃತ್ಯೋರ್ಮಾ ಅಮೃತಂ ಗಮಯ', 'Lead me from death to immortality'],
    ['ಓಂ ಶಾಂತಿಃ ಶಾಂತಿಃ ಶಾಂತಿಃ', 'Om — peace, peace, peace']
  ];
  // [start of the move into line k, moment it has fully formed, moment it starts to leave]
  const STAGES = [[0.02, 0.14, 0.28], [0.28, 0.42, 0.52], [0.52, 0.66, 0.76], [0.76, 0.9, 1.01]];
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  function sampleText(text, W, H, N) {
    const off = document.createElement('canvas');
    off.width = Math.ceil(W); off.height = Math.ceil(H);
    const o = off.getContext('2d');
    o.font = `600 100px ${KANNADA}`;
    const size = Math.min(H * 0.17, 100 * (W * 0.84) / o.measureText(text).width);
    o.font = `600 ${size}px ${KANNADA}`;
    o.textAlign = 'center';
    o.textBaseline = 'middle';
    o.fillStyle = '#fff';
    o.fillText(text, W / 2, H * 0.46);
    const data = o.getImageData(0, 0, off.width, off.height).data;
    const step = Math.max(2, Math.round(size / 40));
    const hits = [];
    for (let y = 0; y < off.height; y += step) {
      for (let x = 0; x < off.width; x += step) {
        if (data[(y * off.width + x) * 4 + 3] > 140) hits.push(x, y);
      }
    }
    const count = hits.length / 2;
    const xs = new Float32Array(N), ys = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const k = count ? Math.floor(hash(i * 3.7 + text.length) * count) : 0;
      xs[i] = (hits[k * 2] || W / 2) + (hash(i + 7) - 0.5) * step * 0.8;
      ys[i] = (hits[k * 2 + 1] || H / 2) + (hash(i + 13) - 0.5) * step * 0.8;
    }
    return { xs, ys, size };
  }

  function mantra(ctx, W, H, p) {
    const cv = ctx.canvas;
    const N = W < 700 ? 1800 : 3400;
    if (!cv._pts || cv._pts.W !== W || cv._pts.H !== H || cv._pts.stale) {
      cv._pts = { W, H, lines: MANTRA.map(([k]) => sampleText(k, W, H, N)) };
    }
    const sets = cv._pts.lines;
    const c = palette(true);
    // dawn: the dark field warms from the centre as the mantra moves toward light
    const light = smooth(0.3, 0.62, p) * (1 - 0.35 * smooth(0.8, 1, p));
    const glow = ctx.createRadialGradient(W / 2, H * 0.46, 0, W / 2, H * 0.46, Math.max(W, H) * lerp(0.25, 0.75, smooth(0.25, 0.7, p)));
    glow.addColorStop(0, `rgba(201,154,62,${0.04 + 0.3 * light})`);
    glow.addColorStop(0.5, `rgba(120,86,28,${0.02 + 0.14 * light})`);
    glow.addColorStop(1, 'rgba(8,20,43,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // which line are we leaving, which are we forming, and how far along
    let from = -1, to = 0, t = 0;
    for (let k = 0; k < STAGES.length; k++) {
      const [s, f] = STAGES[k];
      if (p >= s) { from = k - 1; to = k; t = clamp((p - s) / (f - s)); }
    }
    if (p < STAGES[0][0]) { from = -1; to = 0; t = 0; }
    const A = from >= 0 ? sets[from] : null, B = sets[to];
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < N; i++) {
      const delay = hash(i + 101) * 0.35;
      const ti = easeInOut(clamp((t - delay) / 0.65));
      const ax = A ? A.xs[i] : hash(i + 211) * W, ay = A ? A.ys[i] : hash(i + 307) * H;
      const bx = B.xs[i], by = B.ys[i];
      const swirl = Math.sin(Math.PI * ti) * (hash(i + 401) - 0.5) * H * 0.35;
      const x = lerp(ax, bx, ti) + swirl * 0.6;
      const y = lerp(ay, by, ti) + swirl;
      const twinkle = 0.7 + 0.3 * Math.sin(i * 12.9898 + p * 60);
      const settled = !A ? ti : 1;
      const a = (0.3 + 0.7 * settled) * twinkle;
      const r = (A || ti > 0.9 ? 1.7 : 1.1) + hash(i + 503) * 0.7;
      ctx.fillStyle = hash(i + 601) > 0.85 ? `rgba(248,236,210,${a})` : c.gold(a);
      ctx.fillRect(x - r / 2, y - r / 2, r, r);
    }
    ctx.globalCompositeOperation = 'source-over';
    // the meaning, shown while each line holds its shape
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    MANTRA.forEach(([, en], k) => {
      const [, formed, leaves] = STAGES[k];
      const a = smooth(formed - 0.04, formed + 0.01, p) * (1 - smooth(leaves - 0.02, leaves + 0.02, p));
      if (a <= 0) return;
      ctx.fillStyle = `rgba(238,242,250,${0.85 * a})`;
      ctx.font = `italic 400 ${Math.max(17, Math.round(sets[k].size * 0.3))}px ${c.serif}`;
      ctx.fillText(en, W / 2, H * 0.46 + sets[k].size * 0.95);
    });
    return null;
  }

  // ── neti: "not this, not this" — thoughts let go one by one ──────────────────
  const THOUGHTS = ['my name', 'the body', 'worry', 'memory', 'ambition', 'fear', 'the past', 'opinions',
    'plans', 'desire', 'my story', 'restlessness', 'praise', 'blame', 'the future', 'doubt',
    'the roles I play', 'comparison', 'noise', 'regret', 'hurry', 'what others think', 'the narrator', 'wanting'];
  function neti(ctx, W, H, p) {
    const c = palette(false);
    const cx = W / 2, cy = H / 2, n = THOUGHTS.length;
    // release order: a fixed shuffle
    const order = THOUGHTS.map((_, i) => i).sort((a, b) => hash(a + 71) - hash(b + 71));
    const rank = new Array(n);
    order.forEach((idx, r) => { rank[idx] = r; });
    // what remains: a soft light at the centre
    const still = smooth(0.55, 1, p);
    if (still > 0) {
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(W, H) * 0.45);
      g.addColorStop(0, c.gold(0.22 * still));
      g.addColorStop(1, c.gold(0));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    THOUGHTS.forEach((word, i) => {
      const release = 0.06 + 0.72 * rank[i] / (n - 1);
      const gone = smooth(release, release + 0.08, p);
      if (gone >= 1) return;
      const ring = i < 6 ? 0 : i < 14 ? 1 : 2;
      const slot = ring === 0 ? i : ring === 1 ? i - 6 : i - 14;
      const perRing = [6, 8, 10][ring];
      const ang = (slot + 0.5 * ring) / perRing * TAU + (hash(i + 17) - 0.5) * 0.25;
      const rad = [0.42, 0.7, 0.96][ring];
      const x = cx + Math.cos(ang) * W * 0.4 * rad + Math.sin(p * 3 + i) * 8;
      const y = cy + Math.sin(ang) * H * 0.42 * rad + Math.cos(p * 2.3 + i * 1.7) * 6 - gone * 50;
      const size = Math.round(17 + 11 * hash(i + 29)) * (W < 600 ? 0.75 : 1);
      ctx.font = `${hash(i + 41) > 0.5 ? 'italic ' : ''}500 ${size}px ${c.serif}`;
      ctx.filter = gone > 0 ? `blur(${(gone * 6).toFixed(1)}px)` : 'none';
      ctx.fillStyle = c.ink((0.4 + 0.45 * hash(i + 53)) * (1 - gone));
      ctx.fillText(word, x, y);
    });
    ctx.filter = 'none';
    const show = smooth(0.8, 0.95, p);
    if (show > 0) {
      const s = Math.min(W, H) * 0.2 * lerp(0.92, 1, show);
      ctx.fillStyle = c.gold(show);
      ctx.font = `600 ${Math.round(s)}px ${KANNADA}`;
      ctx.fillText('ಸತ್ಯ', cx, cy - s * 0.1);
      ctx.fillStyle = c.ink(0.7 * smooth(0.86, 0.98, p));
      ctx.font = `600 ${Math.max(10, Math.round(s * 0.09))}px ${c.sans}`;
      ctx.fillText('W H A T   R E M A I N S', cx, cy + s * 0.62);
    }
    return null;
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

  const SCENES = { noise, mantra, neti, mala, lotus };
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
  if (document.fonts) {
    const fresh = () => { canvases.forEach(cv => { if (cv._pts) cv._pts.stale = true; }); all.forEach(r => r()); };
    document.fonts.ready.then(fresh);
    document.fonts.load('600 40px "Noto Serif Kannada"', 'ಓಂ').then(fresh, () => {});
  }
})();
