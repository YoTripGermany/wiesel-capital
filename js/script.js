/* ============================================================
   WIESEL CAPITAL — Main JavaScript
   ============================================================
   1. Navigation scroll behaviour
   2. Mobile menu toggle
   3. Scroll-triggered fade animations
   4. Counter animations
   5. Hero canvas (particle network)
   6. Hedging chart (canvas)
   7. FAQ accordion
   8. Smooth scroll for anchor links
   ============================================================ */


/* ── 1. NAVIGATION SCROLL BEHAVIOUR ── */

const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 60);
});


/* ── 2. MOBILE MENU TOGGLE ── */

function toggleMenu() {
  const menu    = document.getElementById('mobMenu');
  const burger  = document.querySelector('[aria-controls="mobMenu"]');
  const isOpen  = menu.classList.toggle('open');
  document.body.style.overflow = isOpen ? 'hidden' : '';
  if (burger) burger.setAttribute('aria-expanded', String(isOpen));
}


/* ── 3. SCROLL-TRIGGERED FADE ANIMATIONS ── */

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// If user prefers reduced motion, show all elements immediately
if (reducedMotion) {
  document.querySelectorAll('.fade').forEach(el => el.classList.add('on'));
} else {
  const fadeObserver = new IntersectionObserver(
    entries => entries.forEach(e => {
      if (e.isIntersecting) e.target.classList.add('on');
    }),
    { threshold: 0.12, rootMargin: '0px 0px -30px 0px' }
  );
  document.querySelectorAll('.fade').forEach(el => fadeObserver.observe(el));
}


/* ── 4. COUNTER ANIMATIONS ── */

function animateCounter(el) {
  const target = +el.dataset.target;
  const suffix = el.dataset.suffix || '';
  const prefix = el.dataset.prefix || '';

  // Skip animation for users who prefer reduced motion
  if (reducedMotion) {
    el.textContent = prefix + target + suffix;
    return;
  }

  const steps     = 60;
  const increment = target / steps;
  let current     = 0;

  const timer = setInterval(() => {
    current = Math.min(current + increment, target);
    el.textContent = prefix + Math.round(current) + suffix;
    if (current >= target) clearInterval(timer);
  }, 1800 / steps);
}

const counterObserver = new IntersectionObserver(
  entries => entries.forEach(e => {
    if (e.isIntersecting && !e.target.dataset.done) {
      e.target.dataset.done = '1';
      animateCounter(e.target);
    }
  }),
  { threshold: 0.5 }
);
document.querySelectorAll('[data-target]').forEach(el => counterObserver.observe(el));


/* ── 5. HERO CANVAS (PARTICLE NETWORK) ── */

const heroCanvas = document.getElementById('heroCanvas');
const heroCtx    = heroCanvas ? heroCanvas.getContext('2d') : null;
let particles    = [];
let heroRafId    = null;
let resizeTimer  = null;

function resizeHeroCanvas() {
  heroCanvas.width  = window.innerWidth;
  heroCanvas.height = window.innerHeight;
  particles = Array.from({ length: 60 }, () => ({
    x:  Math.random() * heroCanvas.width,
    y:  Math.random() * heroCanvas.height,
    vx: (Math.random() - 0.5) * 0.4,
    vy: (Math.random() - 0.5) * 0.4,
    r:  Math.random() * 1.5 + 0.5,
  }));
}

function drawHeroCanvas() {
  heroCtx.clearRect(0, 0, heroCanvas.width, heroCanvas.height);

  particles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    if (p.x < 0 || p.x > heroCanvas.width)  p.vx *= -1;
    if (p.y < 0 || p.y > heroCanvas.height) p.vy *= -1;

    heroCtx.beginPath();
    heroCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    heroCtx.fillStyle = 'rgba(201,168,76,.35)';
    heroCtx.fill();
  });

  // Connect nearby particles
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x;
      const dy = particles[i].y - particles[j].y;
      const d  = Math.hypot(dx, dy);
      if (d < 140) {
        heroCtx.beginPath();
        heroCtx.moveTo(particles[i].x, particles[i].y);
        heroCtx.lineTo(particles[j].x, particles[j].y);
        heroCtx.strokeStyle = `rgba(201,168,76,${0.12 * (1 - d / 140)})`;
        heroCtx.lineWidth   = 0.5;
        heroCtx.stroke();
      }
    }
  }

  heroRafId = requestAnimationFrame(drawHeroCanvas);
}

if (heroCanvas && !reducedMotion) {
  resizeHeroCanvas();

  // Throttled resize handler
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resizeHeroCanvas, 150);
  });

  // Pause animation when tab is hidden, resume when visible
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(heroRafId);
    } else {
      drawHeroCanvas();
    }
  });

  drawHeroCanvas();
}


/* ── 6. HEDGING CHART (CANVAS) ── */

function drawHedgingChart() {
  const canvas = document.getElementById('hedgingChart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  canvas.width  = canvas.offsetWidth  * devicePixelRatio;
  canvas.height = canvas.offsetHeight * devicePixelRatio;
  ctx.scale(devicePixelRatio, devicePixelRatio);

  const W   = canvas.offsetWidth;
  const H   = canvas.offsetHeight;
  const pad = { t: 20, r: 20, b: 40, l: 50 };
  const iW  = W - pad.l - pad.r;
  const iH  = H - pad.t - pad.b;
  // Seeded PRNG (mulberry32) — deterministic but looks like real markets
  let seed = 1337;
  function rand() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }

  const n = 80;
  const spData = [], wcData = [];
  let sv = 100, wv = 100;
  let wcPeak = 100;

  for (let i = 0; i < n; i++) {
    // S&P: high volatility, hard crash around i=30-50, slow recovery
    const spBias = (i < 30) ? 0.06 : (i < 50) ? -0.55 : 0.08;
    sv += (rand() - 0.5 + spBias) * 6;
    sv  = Math.max(45, sv);
    spData.push(sv);

    // Wiesel: low volatility, steady uptrend, max ~6% drawdown
    const wcBias = (i < 30) ? 0.18 : (i < 50) ? 0.04 : 0.22;
    wv += (rand() - 0.5 + wcBias) * 2;
    wcPeak = Math.max(wcPeak, wv);
    wv  = Math.max(wcPeak * 0.94, wv); // enforce 6% max drawdown
    wcData.push(wv);
  }

  const allValues = [...spData, ...wcData];
  const minVal    = Math.min(...allValues) - 5;
  const maxVal    = Math.max(...allValues) + 5;
  const scaleY    = v => pad.t + iH - (v - minVal) / (maxVal - minVal) * iH;
  const scaleX    = i => pad.l + (i / (n - 1)) * iW;

  // Grid lines
  ctx.strokeStyle = 'rgba(201,168,76,.18)';
  ctx.lineWidth   = 1;
  for (let g = 0; g <= 4; g++) {
    const y = pad.t + (g / 4) * iH;
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(W - pad.r, y);
    ctx.stroke();
  }

  // S&P 500 line (red)
  ctx.beginPath();
  spData.forEach((v, i) =>
    i === 0 ? ctx.moveTo(scaleX(i), scaleY(v)) : ctx.lineTo(scaleX(i), scaleY(v))
  );
  ctx.strokeStyle = 'rgba(248,113,113,.95)';
  ctx.lineWidth   = 2;
  ctx.stroke();

  // Wiesel Capital line (gold)
  ctx.beginPath();
  wcData.forEach((v, i) =>
    i === 0 ? ctx.moveTo(scaleX(i), scaleY(v)) : ctx.lineTo(scaleX(i), scaleY(v))
  );
  ctx.strokeStyle = '#e2c97e';
  ctx.lineWidth   = 2.5;
  ctx.stroke();

  // Legend
  ctx.font      = '11px Jost, sans-serif';
  ctx.fillStyle = '#e2c97e';
  ctx.fillRect(pad.l, H - 26, 22, 3);
  ctx.fillStyle = 'rgba(220,210,190,.9)';
  ctx.fillText('Wiesel System', pad.l + 28, H - 20);

  ctx.fillStyle = 'rgba(248,113,113,.95)';
  ctx.fillRect(pad.l + 148, H - 26, 22, 3);
  ctx.fillStyle = 'rgba(220,210,190,.9)';
  ctx.fillText('S&P 500 ungesichert', pad.l + 176, H - 20);

  // Axis labels
  ctx.fillStyle = 'rgba(220,210,190,.6)';
  ctx.font      = '10px Jost, sans-serif';
  ctx.fillText('Hoch', pad.l - 38, pad.t + 4);
  ctx.fillText('Tief', pad.l - 32, pad.t + iH);
}

// Draw chart only when it scrolls into view
const hedgingChartEl = document.getElementById('hedgingChart');
if (hedgingChartEl) {
  const chartObserver = new IntersectionObserver(
    entries => entries.forEach(e => {
      if (e.isIntersecting) {
        drawHedgingChart();
        chartObserver.disconnect();
      }
    }),
    { threshold: 0.3 }
  );
  chartObserver.observe(hedgingChartEl);
}


/* ── 7. FAQ ACCORDION ── */

function toggleFaq(btn) {
  const item   = btn.closest('.faq-item');
  const isOpen = item.classList.contains('open');
  document.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));
  if (!isOpen) item.classList.add('open');
}


/* ── 8. SMOOTH SCROLL FOR ANCHOR LINKS ── */

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', e => {
    const target = document.querySelector(anchor.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
    }
  });
});


/* ── 9. BACK TO TOP BUTTON ── */

const backToTopBtn = document.getElementById('backToTop');
if (backToTopBtn) {
  window.addEventListener('scroll', () => {
    backToTopBtn.classList.toggle('visible', window.scrollY > 400);
  });
  backToTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
  });
}


/* ── 10. CLOSE MOBILE MENU ON OUTSIDE CLICK ── */

document.addEventListener('click', e => {
  const menu   = document.getElementById('mobMenu');
  const burger = document.querySelector('[aria-controls="mobMenu"]');
  if (menu && menu.classList.contains('open') && !menu.contains(e.target) && !burger.contains(e.target)) {
    toggleMenu();
  }
});


/* ── 11. CLOSE MOBILE MENU ON ESC KEY ── */

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    const menu = document.getElementById('mobMenu');
    if (menu && menu.classList.contains('open')) toggleMenu();
    const lb = document.getElementById('certLightbox');
    if (lb && lb.classList.contains('open')) lb.classList.remove('open');
  }
});
