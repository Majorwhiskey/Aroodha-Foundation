// Scroll motion: Lenis smooth scroll + GSAP ScrollTrigger / SplitText.
// Effects are modelled on Awwwards "scrolling" sites that suit a contemplative tone:
//   - STILL.            masked line-rise headings, pinned word-by-word quote
//   - A.P.J. Abdul Kalam ink-in paragraphs, blur-to-sharp imagery
//   - 21 Oaks           fanned card stack settling into place
//   - Nabil Issa/Cocoon clip-path portrait reveal, footer rising from beneath
// Loads before site.js. If the CDN scripts fail, or the visitor prefers reduced
// motion, it does nothing and the page keeps site.js's simple reveals.
(() => {
  if (!window.gsap || !window.ScrollTrigger || !window.SplitText || !window.Lenis) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  gsap.registerPlugin(ScrollTrigger, SplitText);
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  // Elements GSAP drives must lose site.js's CSS reveal/tilt, whose transitions fight scrubbing.
  const takeOver = (els) => els.forEach(el => {
    el.classList.remove('reveal-node', 'reveal-row', 'interactive-tilt');
    el.style.transition = 'none';
  });

  // ── Smooth scroll ─────────────────────────────────────────────
  const lenis = new Lenis({ lerp: 0.085, anchors: { offset: -96 } });
  document.documentElement.classList.remove('scroll-smooth');
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(time => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  const wide = '(min-width: 1024px)';
  const mm = gsap.matchMedia();
  const pathCards = $$('#paths .grid > div');
  const quote = $('#wisdom blockquote');
  takeOver([...pathCards, ...(quote ? [quote] : [])]);

  document.fonts.ready.then(() => {
    // ── Headings rise line by line out of a mask (STILL.) ────────
    $$('main h1, main h2').forEach(el => {
      SplitText.create(el, {
        type: 'lines', mask: 'lines', autoSplit: true,
        onSplit: self => gsap.from(self.lines, {
          yPercent: 110, duration: 1.2, ease: 'expo.out', stagger: 0.12,
          scrollTrigger: { trigger: el, start: 'top 90%', once: true }
        })
      });
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
          scrollTrigger: { trigger: wisdom, start: 'top 80px', end: '+=110%', pin: true, scrub: 1 }
        });
        tl.fromTo(split.words, { opacity: 0.1, filter: 'blur(4px)' }, { opacity: 1, filter: 'blur(0px)', stagger: 0.1, ease: 'none' })
          .fromTo('#wisdom-glow', { scale: 1 }, { scale: 1.25, ease: 'none' }, 0);
        return () => split.revert();
      });
    }

    ScrollTrigger.refresh();
  });

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

  // ── Founder portrait opens out of a smaller frame (Nabil Issa / Cocoon) ──
  const portrait = $('#portrait-card');
  if (portrait) {
    const img = $('#founder-img');
    img.style.transition = 'none';
    gsap.timeline({
      scrollTrigger: { trigger: portrait, start: 'top 90%', end: 'center 50%', scrub: 1 }
    })
      .fromTo(portrait, { clipPath: 'inset(14% 14% 14% 14% round 1rem)' }, { clipPath: 'inset(0% 0% 0% 0% round 1rem)', ease: 'none' })
      .fromTo(img, { scale: 1.3 }, { scale: 1, ease: 'none' }, 0);
  }

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

  // Layout shifts (fonts, lazy images, the map) move trigger positions.
  window.addEventListener('load', () => ScrollTrigger.refresh());
})();
