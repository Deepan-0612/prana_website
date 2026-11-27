/*
 * PRANA — page behaviour.
 * Progressive enhancement: with no JS, no GSAP or no WebGL the site is fully visible and usable;
 * the intro and scroll animations are additions, never requirements.
 */
const INTRO_LOAD_TIMEOUT_MS = 6000;

const root = document.documentElement;
const $ = (s, r = document) => r.querySelector(s);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const hasGsap = () => typeof window.gsap !== 'undefined';

/* ---------- nav ---------- */
function setupNav() {
  const nav = $('#nav'), toggle = $('#navToggle'), links = $('#navLinks');
  if (!nav || !toggle || !links) return;

  const file = location.pathname.split('/').pop() || 'index.html';
  const activePage = file === 'product.html' ? 'shop.html' : file === 'calm.html' ? 'shop.html' : file;
  links.querySelectorAll('a[href]').forEach((link) => {
    const target = new URL(link.href, location.href).pathname.split('/').pop() || 'index.html';
    const active = target === activePage;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });

  const onScroll = () => nav.classList.toggle('is-scrolled', scrollY > 24);
  onScroll();
  addEventListener('scroll', onScroll, { passive: true });

  const setOpen = (open) => {
    links.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };
  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  links.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
}

/* ---------- animations ---------- */
function heroIn() {
  if (!hasGsap() || reduceMotion) return;
  const targets = $('[data-hero]');
  if (!targets) return;
  gsap.from('[data-hero]', { y: 38, opacity: 0, duration: 1.2, ease: 'power3.out', stagger: 0.13, clearProps: 'transform,opacity' });
}

function scrollEffects() {
  if (!hasGsap() || !window.ScrollTrigger || reduceMotion) return;
  gsap.registerPlugin(ScrollTrigger);

  const items = gsap.utils.toArray('[data-reveal]');
  if (items.length) {
    gsap.set(items, { opacity: 0, y: 46 });
    ScrollTrigger.batch(items, {
      start: 'top 90%',
      once: true,
      onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 1.15, ease: 'power3.out', stagger: 0.12, overwrite: true, clearProps: 'transform,opacity' })
    });
  }

  // gentle depth on the hero image
  if ($('.arch img') && $('.hero')) {
    gsap.to('.arch img', { yPercent: -7, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  }
  if ($('.hero__mark') && $('.hero')) {
    gsap.to('.hero__mark', { yPercent: 10, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  }
}

/* ---------- intro orchestration ---------- */
function withTimeout(promise, ms, label) {
  return Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(new Error(label + ' timed out')), ms))]);
}

function endIntro() {
  root.classList.remove('intro-active');
  try { sessionStorage.setItem('prana-intro-seen', '1'); } catch (e) {}
  if (window.ScrollTrigger) ScrollTrigger.refresh();
}

async function boot() {
  setupNav();

  if (!root.classList.contains('intro-active')) {
    heroIn();
    scrollEffects();
    return;
  }

  try {
    // The intro uses only native browser animation, so it does not depend on GSAP or any CDN.
    const { prepare } = await import('./intro.js');
    const intro = await withTimeout(prepare(), INTRO_LOAD_TIMEOUT_MS, 'Intro load');
    scrollEffects();                       // set up while the intro plays (the page is hidden behind it)
    await intro.play(heroIn);              // resolves once the logo has landed in the nav
  } catch (err) {
    console.warn('[Prana] Intro skipped:', err && err.message ? err.message : err);
    scrollEffects();
    heroIn();
  } finally {
    endIntro();
  }
}

boot();
