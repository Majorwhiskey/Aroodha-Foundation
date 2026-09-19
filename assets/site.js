// Shared behaviour for every page. Page-specific parts check that their
// elements exist, so this file can load everywhere.

// WhatsApp handoff (no backend: messages go to the Foundation's number)
const WHATSAPP = 'https://wa.me/917892316905?text=';
const openWhatsApp = (msg) => window.open(WHATSAPP + encodeURIComponent(msg), '_blank', 'noopener');
const field = (form, name) => {
  const el = form.elements.namedItem(name);
  return el ? el.value.trim() : '';
};

// Mobile menu
const menuToggle = document.getElementById('menu-toggle');
const mobileMenu = document.getElementById('mobile-menu');
if (menuToggle && mobileMenu) {
  const setMenu = (open) => {
    mobileMenu.classList.toggle('hidden', !open);
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.querySelector('span').textContent = open ? 'close' : 'menu';
  };
  menuToggle.addEventListener('click', () => setMenu(mobileMenu.classList.contains('hidden')));
  mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
}

// Dana selection pills
function selectDana(btn) {
  document.querySelectorAll('.dana-btn').forEach(b => {
    b.className = "dana-btn py-2.5 rounded-xl border border-border-subtle text-xs font-bold text-primary hover:border-primary hover:-translate-y-0.5 transition";
  });
  btn.className = "dana-btn active py-2.5 rounded-xl border border-primary text-xs font-bold transition hover:-translate-y-0.5";
}

const danaSubmit = document.getElementById('dana-submit');
if (danaSubmit) {
  danaSubmit.addEventListener('click', () => {
    const chosen = document.querySelector('.dana-btn.active');
    openWhatsApp('Namaskara, I would like to offer dana of ' + (chosen ? chosen.dataset.amount : '') + ' to Aroodha Foundation.');
  });
}

const sundayForm = document.getElementById('sunday-form');
if (sundayForm) {
  sundayForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    openWhatsApp('Namaskara, please add me to the Sunday teaching.\nName: ' + field(f, 'name') + '\nEmail: ' + field(f, 'email') + (field(f, 'phone') ? '\nWhatsApp: ' + field(f, 'phone') : ''));
  });
}

// Scroll progress bar, nav elevation & parallax
const scrollProgress = document.getElementById('scroll-progress');
const heroBg = document.getElementById('hero-parallax-bg');
const orb1 = document.getElementById('hero-orb-1');
const orb2 = document.getElementById('hero-orb-2');
const mainNav = document.getElementById('main-nav');

window.addEventListener('scroll', () => {
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;

  if (scrollProgress) {
    scrollProgress.style.width = progress + '%';
  }

  if (mainNav) {
    mainNav.classList.toggle('shadow-md', scrollTop > 30);
  }

  if (window.innerWidth >= 768) {
    if (heroBg && scrollTop < 900) {
      heroBg.style.transform = `translateY(${scrollTop * 0.18}px)`;
    }
    if (orb1 && scrollTop < 900) {
      orb1.style.transform = `translate(-50%, ${scrollTop * 0.28}px) scale(${1 + scrollTop * 0.0003})`;
    }
    if (orb2 && scrollTop < 900) {
      orb2.style.transform = `translateY(${scrollTop * -0.15}px)`;
    }
  }
}, { passive: true });

// Reveal on scroll
const revealObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('revealed');
      if (entry.target.classList.contains('lineage-quote-box')) {
        entry.target.classList.add('in-view');
      }
      observer.unobserve(entry.target);
    }
  });
}, { root: null, rootMargin: '0px 0px -60px 0px', threshold: 0.12 });

document.querySelectorAll('.reveal-node, .reveal-row, .lineage-quote-box').forEach(el => {
  revealObserver.observe(el);
});

// 3D card tilt on hover
document.querySelectorAll('.interactive-tilt').forEach(card => {
  card.addEventListener('mousemove', (e) => {
    if (window.innerWidth < 768) return;
    const rect = card.getBoundingClientRect();
    const rotateX = ((e.clientY - rect.top - rect.height / 2) / (rect.height / 2)) * -4;
    const rotateY = ((e.clientX - rect.left - rect.width / 2) / (rect.width / 2)) * 4;
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0)';
  });
});

// Links and buttons that open WhatsApp with a prefilled message: data-whatsapp="..."
document.querySelectorAll('[data-whatsapp]').forEach(el => {
  el.addEventListener('click', (e) => {
    e.preventDefault();
    openWhatsApp(el.dataset.whatsapp);
  });
});

// Programme tabs (programs.html) — the URL hash (#advanced, #mantra) picks the tab
const tabButtons = document.querySelectorAll('.tab-btn');
if (tabButtons.length) {
  const ON = ['bg-primary', 'text-white', 'shadow-md'];
  const OFF = ['text-on-surface-variant', 'hover:text-primary'];
  const showTab = (key) => {
    tabButtons.forEach(btn => {
      const on = btn.dataset.tab === key;
      btn.setAttribute('aria-selected', String(on));
      btn.classList.add(...(on ? ON : OFF));
      btn.classList.remove(...(on ? OFF : ON));
      document.getElementById(btn.dataset.tab).classList.toggle('hidden', !on);
    });
  };
  const fromHash = () => {
    const key = location.hash.slice(1);
    return [...tabButtons].some(b => b.dataset.tab === key) ? key : tabButtons[0].dataset.tab;
  };
  tabButtons.forEach(btn => btn.addEventListener('click', () => {
    history.replaceState(null, '', '#' + btn.dataset.tab);
    showTab(btn.dataset.tab);
  }));
  window.addEventListener('hashchange', () => showTab(fromHash()));
  showTab(fromHash());
}

// Online enrolment (online.html)
const enrolForm = document.getElementById('enrol-form');
if (enrolForm) {
  const plans = JSON.parse(document.getElementById('plan-data').textContent);
  const inr = (n) => '₹' + n.toLocaleString('en-IN');
  const chosenPlan = () => plans[enrolForm.elements.namedItem('plan').value];
  const updateSummary = () => {
    const p = chosenPlan();
    const gst = Math.round(p.price * 0.18);
    document.getElementById('sum-name').textContent = p.name;
    document.getElementById('sum-per').textContent = p.per;
    document.getElementById('sum-price').textContent = inr(p.price);
    document.getElementById('sum-gst').textContent = inr(gst);
    document.getElementById('sum-total').textContent = inr(p.price + gst);
  };
  enrolForm.addEventListener('change', updateSummary);
  updateSummary();

  document.querySelectorAll('[data-plan]').forEach(a => a.addEventListener('click', () => {
    enrolForm.querySelector(`input[name="plan"][value="${a.dataset.plan}"]`).checked = true;
    updateSummary();
  }));

  enrolForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const p = chosenPlan();
    const f = enrolForm;
    openWhatsApp('Namaskara, I would like to enrol in the ' + p.name + ' membership (' + inr(p.price) + ' / ' + p.per + ' + GST).' +
      '\nName: ' + field(f, 'name') + '\nWhatsApp: ' + field(f, 'phone') + '\nEmail: ' + field(f, 'email') +
      (field(f, 'city') ? '\nCity: ' + field(f, 'city') : '') +
      (field(f, 'experience') ? '\nPractice so far: ' + field(f, 'experience') : ''));
  });
}

// Contact form (contact.html) — ?topic=... preselects the subject
const contactForm = document.getElementById('contact-form');
if (contactForm) {
  const topic = new URLSearchParams(location.search).get('topic');
  const select = contactForm.elements.namedItem('topic');
  if (topic && [...select.options].some(o => o.value === topic)) select.value = topic;

  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    openWhatsApp('Namaskara, I am writing about: ' + field(f, 'topic') + '\nName: ' + field(f, 'name') + (field(f, 'phone') ? '\nPhone: ' + field(f, 'phone') : '') + '\n\n' + field(f, 'message'));
  });
}

// Morning / evening theme. The <head> script picks one from the visitor's clock
// (evening from 6:30 PM to 5 AM, around the 7 PM and 5:30 AM sadhana); the
// toggle overrides it and remembers the choice.
const themeBtn = document.getElementById('theme-toggle');
if (themeBtn) {
  const root = document.documentElement;
  const sync = () => {
    const evening = root.classList.contains('evening');
    themeBtn.querySelector('span').textContent = evening ? 'light_mode' : 'dark_mode';
    themeBtn.title = evening ? 'Morning mode' : 'Evening mode';
    themeBtn.setAttribute('aria-label', 'Switch to ' + (evening ? 'morning' : 'evening') + ' mode');
  };
  themeBtn.addEventListener('click', () => {
    const evening = root.classList.toggle('evening');
    try { localStorage.setItem('aroodha-theme', evening ? 'evening' : 'morning'); } catch (e) { /* not remembered */ }
    sync();
  });
  sync();
}

// Countdown to the weekly satsang (Sunday 10:00–11:30 AM IST), shown in the top banner.
const bannerCountdown = document.getElementById('banner-countdown');
if (bannerCountdown) {
  const IST = 5.5 * 3600e3;
  const plural = (n, word) => n + ' ' + word + (n === 1 ? '' : 's');
  const update = () => {
    const now = Date.now();
    const ist = new Date(now + IST); // read with UTC getters = wall-clock time in India
    const day = ist.getUTCDay();
    const mins = ist.getUTCHours() * 60 + ist.getUTCMinutes();
    const short = window.innerWidth < 640;
    const tail = short ? ' · Sadhana 5:30 AM & 7 PM' : ' · Daily sadhana 5:30 AM & 7:00 PM IST';
    if (day === 0 && mins >= 600 && mins < 690) {
      bannerCountdown.textContent = 'Weekly Satsang is on now' + (short ? '' : ' · Foundation hall, Hubballi');
      return;
    }
    let ahead = (7 - day) % 7;
    if (day === 0 && mins >= 690) ahead = 7;
    const target = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate() + ahead, 10, 0) - IST;
    const left = Math.max(0, target - now);
    const d = Math.floor(left / 864e5), h = Math.floor(left / 36e5) % 24, m = Math.floor(left / 6e4) % 60;
    let when;
    if (short) when = d ? `${d}d ${h}h` : (h ? `${h}h ${m}m` : `${m} min`);
    else when = d ? `${plural(d, 'day')}, ${plural(h, 'hour')}` : (h ? `${plural(h, 'hour')}, ${m} min` : `${m} min`);
    bannerCountdown.textContent = (short ? 'Satsang in ' : 'Weekly Satsang in ') + when + tail;
  };
  update();
  setInterval(update, 30000);
  window.addEventListener('resize', update);
}

// Donate form (donate.html)
const donateForm = document.getElementById('donate-form');
if (donateForm) {
  donateForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = donateForm;
    const chosen = f.querySelector('.dana-btn.active');
    const other = field(f, 'other');
    const amount = other ? '₹' + Number(other).toLocaleString('en-IN') : (chosen ? chosen.dataset.amount : '');
    openWhatsApp('Namaskara, I would like to offer dana of ' + amount + ' towards: ' + field(f, 'purpose') +
      '.\nName: ' + field(f, 'name') + (field(f, 'pan') ? '\nPAN (for 80G receipt): ' + field(f, 'pan') : ''));
  });
}

// Gallery lightbox: opens photos that have loaded (placeholders stay put).
const gallery = document.querySelector('[data-gallery]');
if (gallery) {
  const box = document.createElement('div');
  box.id = 'lightbox';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.innerHTML = '<button aria-label="Close" class="absolute top-5 right-5 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition" type="button"><span class="material-symbols-outlined">close</span></button><img alt=""/><p class="text-gold-soft text-xs font-semibold uppercase tracking-widest"></p>';
  document.body.appendChild(box);
  const img = box.querySelector('img'), cap = box.querySelector('p'), closeBtn = box.querySelector('button');
  const close = () => { box.classList.remove('is-open'); if (window.__lenis) window.__lenis.start(); };
  gallery.addEventListener('click', (e) => {
    const fig = e.target.closest('figure');
    const photo = fig && fig.querySelector('img');
    if (!photo) return;
    img.src = photo.currentSrc || photo.src;
    img.alt = photo.alt;
    cap.textContent = fig.querySelector('figcaption') ? fig.querySelector('figcaption').textContent.trim() : '';
    box.classList.add('is-open');
    if (window.__lenis) window.__lenis.stop();
    if (window.gsap) gsap.fromTo(img, { scale: 0.92, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.7, ease: 'expo.out' });
    closeBtn.focus();
  });
  box.addEventListener('click', (e) => { if (e.target === box || e.target.closest('button')) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && box.classList.contains('is-open')) close(); });
}

// Breathing guide: a floating 4–7–8 breath, four rounds.
(() => {
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.id = 'breath-toggle';
  toggle.setAttribute('aria-label', 'Open the breathing guide');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.title = 'Breathe · 4–7–8';
  toggle.className = 'fixed bottom-4 left-4 sm:bottom-5 sm:left-5 z-[60] w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white border border-gold/40 shadow-lg hover:shadow-xl flex items-center justify-center transition';
  toggle.innerHTML = '<span class="w-5 h-5 rounded-full bg-gradient-to-br from-gold-light to-gold animate-pulse"></span>';

  const panel = document.createElement('div');
  panel.id = 'breath-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Breathing guide');
  panel.className = 'hidden fixed bottom-24 left-5 z-[60] w-[19rem] max-w-[calc(100vw-2.5rem)] rounded-3xl bg-white border border-border-subtle shadow-2xl p-6 text-center';
  panel.innerHTML = `
    <div class="flex items-center justify-between">
      <span class="text-[11px] font-bold uppercase tracking-widest text-gold">Breathe • 4–7–8</span>
      <button aria-label="Close the breathing guide" class="w-8 h-8 rounded-full hover:bg-surface-muted text-on-surface-variant flex items-center justify-center" data-breath-close type="button"><span class="material-symbols-outlined text-lg">close</span></button>
    </div>
    <div class="relative h-44 flex items-center justify-center my-3">
      <div class="absolute w-40 h-40 rounded-full border border-gold/30"></div>
      <div class="absolute w-40 h-40 rounded-full border border-dashed border-gold/20"></div>
      <div class="breath-orb w-16 h-16 rounded-full bg-gradient-to-br from-gold-light to-gold shadow-[0_0_40px_rgba(201,154,62,0.45)]"></div>
    </div>
    <div class="font-serif text-2xl text-primary" data-breath-phase>Ready when you are</div>
    <div class="text-xs text-on-surface-variant mt-1 h-4" data-breath-count></div>
    <button class="mt-5 px-6 py-2.5 rounded-full bg-primary hover:bg-royal-blue text-white text-xs font-semibold tracking-wider uppercase transition" data-breath-start type="button">Begin</button>
    <p class="text-[11px] text-on-surface-variant leading-relaxed mt-4">Inhale through the nose for 4, hold for 7, exhale slowly through the mouth for 8. Four rounds.</p>`;
  document.body.append(toggle, panel);

  const orb = panel.querySelector('.breath-orb');
  const phaseEl = panel.querySelector('[data-breath-phase]');
  const countEl = panel.querySelector('[data-breath-count]');
  const startBtn = panel.querySelector('[data-breath-start]');
  const PHASES = [['Breathe in', 4, 2.5], ['Hold', 7, 2.5], ['Breathe out', 8, 1]];
  const ROUNDS = 4;
  let timer = null;

  const stop = (message) => {
    clearInterval(timer); timer = null;
    orb.style.transitionDuration = '1.2s';
    orb.style.transform = 'scale(1)';
    phaseEl.textContent = message || 'Ready when you are';
    countEl.textContent = '';
    startBtn.textContent = 'Begin';
  };
  const start = () => {
    let round = 1, phase = 0, left = PHASES[0][1];
    const show = () => {
      const [name, secs, scale] = PHASES[phase];
      phaseEl.textContent = name;
      orb.style.transitionDuration = secs + 's';
      orb.style.transform = `scale(${scale})`;
      countEl.textContent = `${left} · round ${round} of ${ROUNDS}`;
    };
    show();
    startBtn.textContent = 'Stop';
    timer = setInterval(() => {
      left -= 1;
      if (left > 0) { countEl.textContent = `${left} · round ${round} of ${ROUNDS}`; return; }
      phase = (phase + 1) % PHASES.length;
      if (phase === 0) round += 1;
      if (round > ROUNDS) { stop('Rest in the stillness'); return; }
      left = PHASES[phase][1];
      show();
    }, 1000);
  };

  toggle.addEventListener('click', () => {
    const open = !panel.classList.toggle('hidden');
    toggle.setAttribute('aria-expanded', String(open));
    if (!open) stop();
  });
  panel.querySelector('[data-breath-close]').addEventListener('click', () => {
    panel.classList.add('hidden');
    toggle.setAttribute('aria-expanded', 'false');
    stop();
  });
  startBtn.addEventListener('click', () => (timer ? stop() : start()));
})();
