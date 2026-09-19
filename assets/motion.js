// Scroll motion: Lenis smooth scroll + GSAP ScrollTrigger / SplitText.
// Effects are modelled on Awwwards "scrolling" sites that suit a contemplative tone:
//   - STILL.             masked line-rise headings, pinned word-by-word quote
//   - A.P.J. Abdul Kalam ink-in paragraphs, blur-to-sharp imagery
//   - 21 Oaks            fanned card stack settling into place
//   - Nabil Issa/Cocoon  clip-path portrait reveal, footer rising from beneath
// plus a veil intro / page transition, a scroll-drawn mandala, a velocity-aware
// lineage marquee, drawn eyebrow rules, batched reveals and magnetic buttons.
// Loads before site.js. If the CDN scripts fail, or the visitor prefers reduced
// motion, it does nothing and the page keeps site.js's simple reveals.
(() => {
  const root = document.documentElement;
  const ready = window.gsap && window.ScrollTrigger && window.SplitText && window.Lenis;
  if (!ready || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    root.classList.remove('is-loading');
    return;
  }
  clearTimeout(window.__veilTimer);

  gsap.registerPlugin(ScrollTrigger, SplitText);
  gsap.defaults({ ease: 'expo.out' });
  const $ = (sel, scope = document) => scope.querySelector(sel);
  const $$ = (sel, scope = document) => [...scope.querySelectorAll(sel)];
  const wide = '(min-width: 1024px)';
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const mm = gsap.matchMedia();

  // Elements GSAP drives must lose site.js's CSS reveal/tilt, whose transitions fight scrubbing.
  const takeOver = (els) => els.forEach(el => {
    el.classList.remove('reveal-node', 'reveal-row', 'interactive-tilt');
    el.style.transition = 'none';
  });

  // ── Smooth scroll ─────────────────────────────────────────────
  const lenis = new Lenis({ lerp: 0.085, anchors: { offset: -96 } });
  window.__lenis = lenis;
  root.classList.remove('scroll-smooth');
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(time => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  // ── Line mandala (SVG), drawn by animating stroke-dashoffset 1 → 0 ──
  const NS = 'http://www.w3.org/2000/svg';
  const mandala = (className) => {
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '-100 -100 200 200');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('class', 'mandala ' + className);
    const add = (tag, attrs) => {
      const el = document.createElementNS(NS, tag);
      Object.entries({ pathLength: 1, ...attrs }).forEach(([k, v]) => el.setAttribute(k, v));
      svg.appendChild(el);
    };
    [98, 86, 62, 38, 16].forEach(r => add('circle', { r }));
    for (let i = 0; i < 12; i++) add('ellipse', { cy: -50, rx: 11, ry: 33, transform: `rotate(${i * 30})` });
    for (let i = 0; i < 24; i++) add('ellipse', { cy: -74, rx: 4.5, ry: 11, transform: `rotate(${i * 15 + 7.5})` });
    for (let i = 0; i < 8; i++) add('line', { y1: -16, y2: -38, transform: `rotate(${i * 45 + 22.5})` });
    return svg;
  };
  const drawIn = (svg, vars) => gsap.fromTo(svg.children, { strokeDashoffset: 1 }, { strokeDashoffset: 0, stagger: 0.02, ease: 'power2.inOut', ...vars });

  // ── Veil: intro on the first page of a session, then page transitions ──
  const veil = $('#veil');
  let firstVisit = false;
  try { firstVisit = !sessionStorage.getItem('aroodha-intro'); sessionStorage.setItem('aroodha-intro', '1'); } catch (e) { /* storage blocked: skip the long intro */ }

  const intro = new Promise(resolve => {
    if (!veil) { root.classList.remove('is-loading'); resolve(); return; }
    veil.classList.add('is-active');
    root.classList.remove('is-loading');
    lenis.stop();
    const mark = $('.veil-mark', veil);
    const ring = mandala('veil-mandala');
    veil.prepend(ring);
    const done = () => { veil.classList.remove('is-active'); lenis.start(); };
    const tl = gsap.timeline({ onComplete: done });
    if (firstVisit) {
      tl.add(drawIn(ring, { duration: 1.2, stagger: 0.012 }))
        .fromTo(mark, { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 0.9 }, 0.1)
        .to([mark, ring], { opacity: 0, y: -24, duration: 0.45, ease: 'power2.in' }, '+=0.05');
    } else {
      gsap.set(ring.children, { strokeDashoffset: 0 });
      tl.to([mark, ring], { opacity: 0, duration: 0.3, ease: 'power1.in' }, 0.1);
    }
    tl.to(veil, { yPercent: -100, duration: 0.9, ease: 'expo.inOut' })
      .call(resolve, [], '-=0.55');
  });

  // Leave for another page of the site behind the veil.
  if (veil) {
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href]');
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (a.target === '_blank' || a.hasAttribute('download')) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || !/(\.html|\/)$/.test(url.pathname)) return;
      const page = p => p.replace(/index\.html$/, '');
      if (page(url.pathname) === page(location.pathname) && url.search === location.search) return; // same page: let the anchor scroll
      e.preventDefault();
      veil.classList.add('is-active');
      gsap.set($$('.veil-mark, .veil-mandala', veil), { opacity: 0 });
      gsap.fromTo(veil, { yPercent: 100 }, { yPercent: 0, duration: 0.7, ease: 'expo.inOut', onComplete: () => { location.href = url.href; } });
    });
    // Back/forward cache restores the page with the veil still down.
    window.addEventListener('pageshow', (e) => {
      if (e.persisted) { gsap.set(veil, { yPercent: -100 }); veil.classList.remove('is-active'); lenis.start(); }
    });
  }

  // Things the page needs before anything is revealed.
  const pathCards = $$('#paths .grid > div');
  const quote = $('#wisdom blockquote');
  takeOver([...pathCards, ...(quote ? [quote] : [])]);

  const hero = $('main > section');
  const isEyebrow = el => el.tagName === 'SPAN' && el.classList.contains('uppercase') && /tracking-\[0\.2(5)?em\]/.test(el.className);
  // Direct children of the hero's content container only (nested .relative blocks keep their own motion).
  const heroInner = hero ? [...hero.children].find(el => el.classList.contains('relative')) : null;
  const heroBits = heroInner ? [...heroInner.children].filter(el =>
    el.tagName !== 'H1' && !isEyebrow(el) && !el.classList.contains('reveal-node') && !el.querySelector('.reveal-node, h1')) : [];
  if (heroBits.length) gsap.set(heroBits, { opacity: 0, y: 26 });

  const revealEls = $$('.reveal-node, .reveal-row');
  revealEls.forEach(el => {
    el.dataset.row = el.classList.contains('reveal-row') ? '1' : '';
    el.classList.remove('reveal-node', 'reveal-row');
  });
  if (revealEls.length) gsap.set(revealEls, { opacity: 0, y: (i, el) => (el.dataset.row ? 0 : 48), x: (i, el) => (el.dataset.row ? -36 : 0) });

  Promise.all([intro, document.fonts.ready]).then(() => {
    // ── Hero: content rises in, then drifts and fades as you scroll away ──
    if (heroBits.length) gsap.to(heroBits, { opacity: 1, y: 0, duration: 1.3, stagger: 0.12, delay: 0.15 });
    if (hero) {
      const heroMandala = mandala(hero.id === 'hero-section' ? 'hero-mandala' : 'page-mandala');
      hero.insertBefore(heroMandala, hero.children[1] || null);
      drawIn(heroMandala, { duration: 2.6, delay: 0.1 });
      gsap.to(heroMandala, { rotation: 50, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
      if (hero.id === 'hero-section') {
        gsap.to([...heroInner.children].filter(el => !el.matches('[data-hero-photo], .grid')), {
          y: 110, opacity: 0.15, ease: 'none',
          scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true }
        });
      }
    }

    // ── Headings rise line by line out of a mask (STILL.) ────────
    $$('main h1, main h2').forEach(el => {
      SplitText.create(el, {
        type: 'lines', mask: 'lines', autoSplit: true,
        onSplit: self => gsap.from(self.lines, {
          yPercent: 110, duration: 1.3, stagger: 0.12,
          scrollTrigger: { trigger: el, start: 'top 90%', once: true }
        })
      });
    });

    // ── Section eyebrows: a gold hairline draws in beside the label ──
    $$('main span').filter(isEyebrow).forEach(el => {
      const centred = getComputedStyle(el.parentElement).textAlign === 'center';
      const rule = () => {
        const line = document.createElement('i');
        line.className = 'eyebrow-rule';
        return line;
      };
      const lines = centred ? [rule(), rule()] : [rule()];
      el.prepend(lines[0]);
      if (lines[1]) el.append(lines[1]);
      el.classList.add('eyebrow-drawn');
      if (centred) el.style.justifyContent = 'center';
      const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 92%', once: true } });
      tl.from(lines, { scaleX: 0, duration: 1.1, ease: 'expo.inOut' })
        .from(el, { opacity: 0, x: centred ? 0 : -10, duration: 1 }, 0.15);
    });

    // ── Cards and rows rise in, in batches, on one shared ease ──
    if (revealEls.length) ScrollTrigger.batch(revealEls, {
      start: 'top 90%', once: true,
      onEnter: batch => gsap.to(batch, {
        opacity: 1, y: 0, x: 0, duration: 1.2, stagger: 0.1,
        onStart() { batch.forEach(el => { el.dataset.t = el.style.transition; el.style.transition = 'none'; }); },
        onComplete() { batch.forEach(el => { el.style.transition = el.dataset.t || ''; }); }
      })
    });

    // ── Paragraphs ink in word by word as they cross the screen (Kalam) ──
    $$('[data-ink]').forEach(el => {
      SplitText.create(el, {
        type: 'words',
        onSplit: self => gsap.fromTo(self.words, { opacity: 0.14 }, {
          opacity: 1, ease: 'none', stagger: 0.08,
          scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 50%', scrub: true }
        })
      });
    });

    // ── Contemplation of the Day: pinned while the quote inks in (STILL.) ──
    const wisdom = $('#wisdom');
    if (wisdom && quote) {
      mm.add(wide, () => {
        const split = SplitText.create(quote, { type: 'words' });
        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: { trigger: wisdom, start: 'top 80px', end: '+=130%', pin: true, scrub: 1 }
        });
        tl.fromTo(split.words, { opacity: 0.1, filter: 'blur(4px)' }, { opacity: 1, filter: 'blur(0px)', stagger: 0.1 })
          .fromTo('#wisdom-glow', { scale: 1 }, { scale: 1.25 }, 0);
        if ($('.wisdom-photo', wisdom)) {
          tl.fromTo($('.wisdom-photo', wisdom), { clipPath: 'circle(0% at 50% 30%)' }, { clipPath: 'circle(80% at 50% 30%)' }, 0);
        }
        return () => split.revert();
      });
    }

    // ── Paths of Practice: a fanned stack settles into the row (21 Oaks) ──
    if (pathCards.length === 3) {
      mm.add(wide, () => {
        const fan = [
          { x: '55%', y: 160, rotation: -9 },
          { x: '0%', y: 220, rotation: 0 },
          { x: '-55%', y: 160, rotation: 9 }
        ];
        pathCards.forEach((card, i) => gsap.set(card, { ...fan[i], scale: 0.9, autoAlpha: 0.4, zIndex: i === 1 ? 2 : 1 }));
        gsap.to(pathCards, {
          x: 0, y: 0, rotation: 0, scale: 1, autoAlpha: 1, ease: 'power2.out', stagger: 0.06,
          scrollTrigger: { trigger: pathCards[0].parentElement, start: 'top 95%', end: 'top 30%', scrub: 1 }
        });
      });
    }

    // ── Seeker reflections drift at slightly different speeds ──
    mm.add(wide, () => {
      $$('#reflections .grid > div').forEach((card, i) => {
        const s = [6, -3, 9][i % 3];
        gsap.fromTo(card, { yPercent: s }, {
          yPercent: -s, ease: 'none',
          scrollTrigger: { trigger: card.parentElement, start: 'top bottom', end: 'bottom top', scrub: true }
        });
      });
    });

    ScrollTrigger.refresh();
  });

  // ── Lineage ribbon becomes a slow marquee that follows scroll direction ──
  const ribbon = $('#about');
  if (ribbon) {
    const inner = $('.max-w-7xl', ribbon);
    const kn = $('.italic', inner).textContent.trim();
    const en = inner.lastElementChild.textContent.trim();
    const item = `<span class="marquee-item"><span class="text-gold font-serif text-xl">✦</span>
      <span class="font-serif text-base sm:text-lg italic tracking-wide text-gold-pale">${kn}</span>
      <span class="text-xs font-medium text-white/70 uppercase tracking-widest">${en}</span></span>`;
    const track = document.createElement('div');
    track.className = 'marquee-track';
    track.innerHTML = item.repeat(6);
    track.setAttribute('aria-hidden', 'true');
    inner.classList.add('sr-only');
    ribbon.appendChild(track);
    const loop = gsap.to(track, { xPercent: -50, duration: 70, ease: 'none', repeat: -1 });
    ScrollTrigger.create({
      onUpdate: self => {
        const dir = self.direction;
        const boost = Math.min(Math.abs(self.getVelocity()) / 250, 6);
        gsap.to(loop, { timeScale: dir * (1 + boost), duration: 0.25, overwrite: true });
        gsap.to(loop, { timeScale: dir, duration: 1.4, delay: 0.25, ease: 'power2.out' });
      }
    });
  }

  // ── Programme tabs: the new panel's cards rise in ──
  $$('.tab-btn').forEach(btn => btn.addEventListener('click', () => requestAnimationFrame(() => {
    const panel = document.getElementById(btn.dataset.tab);
    gsap.from($$('.grid > div', panel), { y: 34, opacity: 0, duration: 1, stagger: 0.07 });
    ScrollTrigger.refresh();
  })));


  // ── Home hero photo: the frame widens as it arrives, the photo zooms out and the shade deepens ──
  const heroPhoto = $('[data-hero-photo]');
  if (heroPhoto) {
    const img = $('img', heroPhoto);
    gsap.fromTo(heroPhoto, { scale: 0.9 }, {
      scale: 1, ease: 'none',
      scrollTrigger: { trigger: heroPhoto, start: 'top bottom', end: 'center 45%', scrub: true }
    });
    const tl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: heroPhoto, start: 'top bottom', end: 'bottom top', scrub: true } });
    if (img) tl.fromTo(img, { scale: 1.25 }, { scale: 1 }, 0);
    tl.fromTo($('.hero-photo-shade', heroPhoto), { opacity: 0 }, { opacity: 1 }, 0);
  }

  // ── Photos open out of a smaller frame (programme banners, page bands) ──
  $$('[data-photo-open]').forEach(fig => {
    const radius = getComputedStyle(fig).borderRadius || '1rem';
    const tl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: fig, start: 'top 95%', end: 'center 55%', scrub: 1 } });
    tl.fromTo(fig, { clipPath: `inset(8% 10% 8% 10% round ${radius})` }, { clipPath: `inset(0% 0% 0% 0% round ${radius})` });
    const img = $('img', fig);
    if (img) tl.fromTo(img, { scale: 1.2 }, { scale: 1 }, 0);
  });

  // ── Gallery: photographs rise in, then drift at their own depths ──
  const galleryItems = $$('[data-gallery] > figure');
  if (galleryItems.length) {
    gsap.set(galleryItems, { opacity: 0, y: 60 });
    ScrollTrigger.batch(galleryItems, {
      start: 'top 92%', once: true,
      onEnter: batch => gsap.to(batch, { opacity: 1, y: 0, duration: 1.3, stagger: 0.12 })
    });
    mm.add(wide, () => {
      galleryItems.forEach(fig => {
        const s = parseFloat(fig.dataset.speed) || 0;
        gsap.fromTo(fig, { yPercent: s }, {
          yPercent: -s, ease: 'none',
          scrollTrigger: { trigger: fig.parentElement, start: 'top bottom', end: 'bottom top', scrub: true }
        });
      });
    });
  }

  // ── The seeker's path: pinned, scrolled sideways, a gold line drawn along it (Tillberg) ──
  const hscroll = $('[data-hscroll]');
  if (hscroll) {
    mm.add(wide, () => {
      const track = $('[data-hscroll-track]', hscroll);
      const line = $('[data-hscroll-line]', hscroll);
      const steps = $$('.hscroll-step', hscroll);
      const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);
      const pinned = { trigger: hscroll, start: 'top 80px', end: () => '+=' + distance(), scrub: 1, invalidateOnRefresh: true };
      const move = gsap.to(track, { x: () => -distance(), ease: 'none', scrollTrigger: { ...pinned, pin: true } });
      if (line) gsap.fromTo(line, { scaleX: 0 }, { scaleX: 1, ease: 'none', scrollTrigger: pinned });
      steps.forEach(step => {
        gsap.set(step, { opacity: 0.35 });
        ScrollTrigger.create({
          trigger: step, containerAnimation: move, start: 'left 70%',
          onEnter: () => { step.classList.add('is-lit'); gsap.to(step, { opacity: 1, duration: 0.8 }); },
          onLeaveBack: () => { step.classList.remove('is-lit'); gsap.to(step, { opacity: 0.35, duration: 0.6 }); }
        });
      });
      return () => { gsap.set(steps, { clearProps: 'opacity' }); steps.forEach(st => st.classList.remove('is-lit')); };
    });
  }

  // ── Founder timeline: a gold line draws down; each chapter's dot lights as it's reached ──
  const timeline = $('[data-timeline]');
  if (timeline) {
    gsap.fromTo($('[data-timeline-line]', timeline), { scaleY: 0 }, {
      scaleY: 1, ease: 'none',
      scrollTrigger: { trigger: timeline, start: 'top 65%', end: 'bottom 65%', scrub: true }
    });
    $$('[data-stage]', timeline).forEach(stage => ScrollTrigger.create({
      trigger: stage, start: 'top 65%', toggleClass: { targets: stage, className: 'is-lit' }
    }));
  }

  // ── Event posters tilt toward the cursor like printed cards ──
  if (finePointer) {
    $$('[data-tilt]').forEach(wrap => {
      const img = $('img', wrap);
      if (!img) return;
      wrap.addEventListener('mousemove', (e) => {
        const r = wrap.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        gsap.to(img, { rotationY: px * 12, rotationX: -py * 12, transformPerspective: 900, duration: 0.6, ease: 'power3.out' });
      });
      wrap.addEventListener('mouseleave', () => gsap.to(img, { rotationX: 0, rotationY: 0, duration: 1.1, ease: 'elastic.out(1, 0.5)' }));
    });
  }

  // ── Founder portraits open out of a smaller frame (Nabil Issa / Cocoon) ──
  $$('#portrait-card, [data-portrait]').forEach(portrait => {
    const img = $('img', portrait);
    img.style.transition = 'none';
    gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: portrait, start: 'top 90%', end: 'center 50%', scrub: 1 }
    })
      .fromTo(portrait, { clipPath: 'inset(14% 14% 14% 14% round 1rem)' }, { clipPath: 'inset(0% 0% 0% 0% round 1rem)' })
      .fromTo(img, { scale: 1.3 }, { scale: 1 }, 0);
  });

  // ── Imagery sharpens from a soft blur as it arrives (Kalam) ──
  $$('main article img, [data-sharpen]').forEach(img => {
    gsap.fromTo(img, { filter: 'blur(14px)', scale: 1.06, opacity: 0.55 }, {
      filter: 'blur(0px)', scale: 1, opacity: 1, ease: 'none',
      scrollTrigger: { trigger: img, start: 'top 98%', end: 'center 62%', scrub: true }
    });
  });

  // ── Footer content rises from beneath the page (Cocoon) ──
  const footer = $('footer');
  if (footer) {
    footer.style.overflow = 'hidden';
    gsap.from(footer.firstElementChild, {
      yPercent: -18, opacity: 0.3, ease: 'none',
      scrollTrigger: { trigger: footer, start: 'top bottom', end: 'bottom bottom', scrub: true }
    });
  }

  // ── Primary buttons lean gently toward the cursor ──
  if (finePointer) {
    $$('a.rounded-full, button.rounded-full').filter(b => /\b(bg-primary|bg-gold)\b/.test(b.className)).forEach(btn => {
      btn.addEventListener('mousemove', (e) => {
        const r = btn.getBoundingClientRect();
        gsap.to(btn, { x: (e.clientX - r.left - r.width / 2) * 0.22, y: (e.clientY - r.top - r.height / 2) * 0.35, duration: 0.5, ease: 'power3.out' });
      });
      btn.addEventListener('mouseleave', () => gsap.to(btn, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.45)' }));
    });
  }

  // Layout shifts (fonts, lazy images, the map) move trigger positions.
  window.addEventListener('load', () => ScrollTrigger.refresh());
})();
