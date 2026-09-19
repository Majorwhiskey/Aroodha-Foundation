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
