/* ============================================================
   WIESEL CAPITAL — Main JavaScript
   ============================================================
   1. Navigation scroll behaviour
   2. Mobile menu toggle
   3. Scroll-triggered fade animations
   4. Counter animations
   5. Hedging chart (canvas)
   6. FAQ accordion
   7. Smooth scroll for anchor links
   ============================================================ */


/* ── 1. NAVIGATION SCROLL BEHAVIOUR ── */

const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 60);
});


/* ── TOP BAR: current month (auto-updating) ── */

const topbarMonthEl = document.getElementById('topbarMonth');
if (topbarMonthEl) {
  topbarMonthEl.textContent = new Date().toLocaleDateString('de-DE', { month: 'long' });
}


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


/* ── 5. HEDGING CHART (CANVAS) ── */

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


/* ── 6. FAQ ACCORDION ── */

function toggleFaq(btn) {
  const item   = btn.closest('.faq-item');
  const isOpen = item.classList.contains('open');
  document.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));
  if (!isOpen) item.classList.add('open');
}


/* ── 7. SMOOTH SCROLL FOR ANCHOR LINKS ── */

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', e => {
    const target = document.querySelector(anchor.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
    }
  });
});




/* ── 9. CLOSE MOBILE MENU ON OUTSIDE CLICK ── */

document.addEventListener('click', e => {
  const menu   = document.getElementById('mobMenu');
  const burger = document.querySelector('[aria-controls="mobMenu"]');
  if (menu && menu.classList.contains('open') && !menu.contains(e.target) && !burger.contains(e.target)) {
    toggleMenu();
  }
});


/* ── 10. CLOSE MOBILE MENU ON ESC KEY ── */

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    const menu = document.getElementById('mobMenu');
    if (menu && menu.classList.contains('open')) toggleMenu();
    const lb = document.getElementById('certLightbox');
    if (lb && lb.classList.contains('open')) lb.classList.remove('open');
  }
});



/* ── 11. PERFORMANCE CHART REVEAL (Wiesel-System vs. S&P 500) ──
   Zeichnet die Kurve beim Reinscrollen von links nach rechts auf und
   zaehlt Startkapital / Endwerte parallel dazu hoch. */

(function () {
  const chartVisual = document.querySelector('#performance .chart-visual');
  if (!chartVisual) return;

  const revealRect = document.getElementById('chartRevealRect');
  const startEl     = document.getElementById('chartStartValue');
  const wieselEl    = document.getElementById('wealthWiesel');
  const etfEl       = document.getElementById('wealthEtf');
  const fmt         = n => Math.round(n).toLocaleString('de-DE') + ' €';

  const START_VAL  = 100000;
  const WIESEL_VAL = 2745000;
  const ETF_VAL    = 753000;
  const PLOT_WIDTH = 640;
  const DURATION   = 1900;

  function setFrame(p) {
    if (revealRect) revealRect.setAttribute('width', PLOT_WIDTH * p);
    if (startEl)  startEl.textContent  = fmt(START_VAL  * p);
    if (wieselEl) wieselEl.textContent = fmt(WIESEL_VAL * p);
    if (etfEl)    etfEl.textContent    = fmt(ETF_VAL    * p);
  }

  function runReveal() {
    if (reducedMotion) {
      setFrame(1);
      chartVisual.classList.add('revealed');
      return;
    }
    setFrame(0);
    const t0 = performance.now();
    function frame(now) {
      const p = Math.min((now - t0) / DURATION, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setFrame(eased);
      if (p < 1) {
        requestAnimationFrame(frame);
      } else {
        chartVisual.classList.add('revealed');
      }
    }
    requestAnimationFrame(frame);
  }

  const perfChartObserver = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting && !chartVisual.dataset.done) {
      chartVisual.dataset.done = '1';
      runReveal();
      perfChartObserver.disconnect();
    }
  }), { threshold: 0.35 });
  perfChartObserver.observe(chartVisual);
})();


/* ── 12. DRAWDOWN BARS REVEAL ── */

(function () {
  const track = document.querySelector('.drawdown-compare');
  if (!track) return;
  const bars = track.querySelectorAll('.drawdown-bar');
  const MAX_REF_PCT = 60; // scale reference: a 50% loss should read as clearly dominant, not half-empty

  const drawdownObserver = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting && !track.dataset.done) {
      track.dataset.done = '1';
      bars.forEach(bar => {
        const pct = +bar.dataset.pct || 0;
        const heightPct = Math.min(100, (pct / MAX_REF_PCT) * 100);
        requestAnimationFrame(() => { bar.style.height = heightPct + '%'; });
      });
      drawdownObserver.disconnect();
    }
  }), { threshold: 0.4 });
  drawdownObserver.observe(track);
})();


/* ── 13. TESTIMONIAL PINNED STAGE ──
   Heading + the currently-visible card live inside ONE sticky
   "stage" (see CSS). The .testimonial-track wrapping it is given
   an explicit height = stage height + N * perCardHold, which is
   exactly how long the stage's native position:sticky will hold
   it in place (containing-block height minus its own height) —
   so entering and leaving the pinned zone is handled entirely by
   the browser's own sticky behaviour, symmetric by construction,
   with no separate elements that can drift out of sync. Which
   card is visible is purely a function of how far we've scrolled
   into the track, divided evenly across the N cards. */

(function () {
  const track    = document.getElementById('testimonialTrack');
  const stage    = document.getElementById('testimonialStage');
  const viewport = document.querySelector('.testimonial-cards-viewport');
  const cards    = viewport ? viewport.querySelectorAll('.testimonial-card') : [];
  if (!track || !stage || !viewport || !cards.length) return;

  const STAGE_TOP   = 110;  // must match .testimonial-stage { top: ... } in CSS
  const HOLD_VH      = 0.85; // scroll distance dedicated to each card, in viewport-heights
  // The last card has no successor to slide in over it, so its trailing
  // hold is pure silent scrolling before the section releases — that read
  // as "stuck" even though it matched every other card's hold. Shortened
  // instead of released outright, so there's still a moment to read it.
  const LAST_HOLD_FACTOR = 0.45;

  let holds  = [];  // px length of each card's own hold
  let starts = [];  // px offset where each card's hold begins
  let total  = 0;   // px total hold length across all cards
  let activeIndex = -1;

  function isPinned() {
    return getComputedStyle(stage).position === 'sticky';
  }

  function measure() {
    if (!isPinned()) {
      // Mobile: cards render in normal static flow (see CSS media query) — nothing to size.
      track.style.height = '';
      viewport.style.height = '';
      return;
    }
    const maxCardHeight = Math.max(...Array.from(cards).map(c => c.offsetHeight));
    viewport.style.height = maxCardHeight + 'px';

    const perCardHold = window.innerHeight * HOLD_VH;
    holds = Array.from(cards, (_, i) => i === cards.length - 1 ? perCardHold * LAST_HOLD_FACTOR : perCardHold);
    starts = [];
    let acc = 0;
    holds.forEach(h => { starts.push(acc); acc += h; });
    total = acc;

    const stageHeight = stage.offsetHeight;
    track.style.height = (stageHeight + total) + 'px';
  }

  // Portion of the PRECEDING card's hold that is spent sliding the next
  // card up into place. E.g. 0.4 = card rests for the first 60% of its
  // hold, then the next card rises over its final 40% — arriving exactly
  // as the next card's own hold begins. Keeping this a fraction (not the
  // whole hold) gives each card real resting time between slides.
  const SLIDE_FRACTION = 0.4;

  function update() {
    if (!isPinned() || !total) return;

    const trackTop = track.getBoundingClientRect().top; // <= STAGE_TOP once pinned, down to negative while held
    const scrolledIntoTrack = STAGE_TOP - trackTop;
    const clamped = Math.max(0, Math.min(scrolledIntoTrack, total - 1));

    // --card-enter is recomputed on every scroll frame (not gated on the
    // index changing) so the slide is driven directly by scroll position —
    // it can never lag behind or fall out of sync with the scrollbar.
    let topIndex = 0;
    cards.forEach((card, i) => {
      let enter;
      if (i === 0) {
        enter = 1; // first card is the base of the stack, always in place
      } else {
        const slideLen = holds[i - 1] * SLIDE_FRACTION;
        const slideStart = starts[i] - slideLen;
        enter = Math.max(0, Math.min(1, (clamped - slideStart) / slideLen));
      }
      card.style.setProperty('--card-enter', enter);
      card.style.setProperty('--card-z', i);
      if (enter > 0) topIndex = i; // z-index ascends, so the last revealed card sits on top
    });

    if (topIndex !== activeIndex) {
      activeIndex = topIndex;
      cards.forEach((card, i) => card.classList.toggle('is-active', i === activeIndex));
    }
  }

  let ticking = false;
  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(() => { ticking = false; update(); });
    }
  }

  function recalc() {
    activeIndex = -1;
    measure();
    update();
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', recalc);
  window.addEventListener('load', recalc);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(recalc);
  }

  recalc();
})();


/* ── 14. FINN WIESEL — TIMELINE SCROLL LINE ──
   The gold progress line draws itself in as the timeline scrolls
   through a fixed point in the viewport: empty when the track's top
   reaches that point, full once its bottom has passed it. No-ops on
   any page without a .finn-timeline (guarded by the null check). */
(function () {
  const track = document.querySelector('.finn-timeline-track');
  const progress = document.querySelector('.finn-timeline-progress');
  if (!track || !progress) return;

  const TRIGGER_FRACTION = 0.85; // point down the viewport that drives the fill

  function update() {
    const rect = track.getBoundingClientRect();
    const triggerY = window.innerHeight * TRIGGER_FRACTION;
    const fraction = Math.max(0, Math.min(1, (triggerY - rect.top) / rect.height));
    progress.style.height = (fraction * 100) + '%';
  }

  let ticking = false;
  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(() => { ticking = false; update(); });
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', update);
  window.addEventListener('load', update);
  update();
})();


/* ── 16. TEAM PAGE — HERO PHOTO STARTS BELOW THE FIXED HEADER ──
   A hardcoded pixel guess for the topbar+nav height left a sliver of the
   plain page background showing (the header is 20px shorter on the
   hamburger-nav breakpoint, for example). Measuring the real rendered
   height instead guarantees the photo's top edge always lines up exactly
   with the header's bottom edge, at any width. No-ops elsewhere. */
(function () {
  const media = document.querySelector('.team-hero-media');
  const overlay = document.querySelector('.team-hero-overlay');
  const topbar = document.getElementById('topbar');
  const nav = document.getElementById('nav');
  if (!media || !overlay || !topbar || !nav) return;

  function update() {
    // getBoundingClientRect().bottom is the true rendered edge in one
    // subpixel-accurate reading — summing two separate offsetHeights (each
    // independently rounded to an integer) was leaving a hairline gap.
    // Rounding up and pulling in by 2px forces a tiny overlap under the
    // (opaque) header instead, which can never show a gap on any side.
    const h = Math.ceil(nav.getBoundingClientRect().bottom) - 2;
    media.style.top = h + 'px';
    overlay.style.top = h + 'px';
  }

  window.addEventListener('resize', update);
  window.addEventListener('load', update);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(update);
  }
  update();
})();


/* ── 17. STRATEGIE — ASSET-ALLOCATION DONUT (auto-cycling detail + reveal-in-view) ──
   The ring continuously advances through its five segments on its own; hovering
   or focusing a segment interrupts the cycle and shows that segment instead,
   resuming automatic cycling once the pointer leaves. */
(function () {
  const wrap   = document.querySelector('.donut-wrap');
  const svg    = document.querySelector('.donut-svg');
  const nameEl = document.getElementById('donutDetailName');
  const pEl    = document.getElementById('donutDetailP');
  if (!wrap || !svg || !nameEl || !pEl) return;

  const ORDER = ['wachstum', 'stabilitaet', 'liquiditaet', 'diversifikation', 'absicherung'];
  const DATA = {
    wachstum:        ['Wachstum',        'Dieser Baustein liefert das langfristige Renditepotenzial des Depots, etwa über Aktien und unternehmerische Beteiligungen.'],
    stabilitaet:     ['Stabilität',      'Dieser Baustein soll Schwankungen im Gesamtportfolio reduzieren und Abhängigkeiten von einzelnen Marktphasen begrenzen.'],
    liquiditaet:     ['Liquidität',      'Die strategische Reserve hält das Depot handlungsfähig, um Chancen zu nutzen oder kurzfristigen Bedarf zu decken.'],
    diversifikation: ['Diversifikation', 'Alternative Renditequellen reduzieren die Abhängigkeit von einzelnen Märkten oder Anlageklassen.'],
    absicherung:     ['Absicherung',     'Klare Regeln zum Risikomanagement begrenzen Verluste, bevor sie das Depot spürbar belasten.']
  };

  const segs = svg.querySelectorAll('.donut-seg');
  let cycleIndex = 0;
  let cycleTimer = null;

  function setActive(key) {
    const d = DATA[key];
    if (!d) return;
    nameEl.textContent = d[0];
    pEl.textContent    = d[1];
    segs.forEach(s => s.classList.toggle('seg-active', s.dataset.key === key));
  }

  function startCycle() {
    if (reducedMotion || cycleTimer) return;
    cycleTimer = setInterval(() => {
      cycleIndex = (cycleIndex + 1) % ORDER.length;
      setActive(ORDER[cycleIndex]);
    }, 2600);
  }
  function stopCycle() {
    if (cycleTimer) { clearInterval(cycleTimer); cycleTimer = null; }
  }

  segs.forEach(seg => {
    const key = seg.dataset.key;
    seg.addEventListener('mouseenter', () => { stopCycle(); setActive(key); });
    seg.addEventListener('focus',      () => { stopCycle(); setActive(key); });
    seg.addEventListener('click',      () => { stopCycle(); setActive(key); });
  });
  wrap.addEventListener('mouseleave', startCycle);

  setActive(ORDER[0]);

  if (reducedMotion) {
    wrap.classList.add('in-view');
    return;
  }

  const donutObserver = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) {
      wrap.classList.add('in-view');
      startCycle();
      donutObserver.disconnect();
    }
  }), { threshold: 0.3 });
  donutObserver.observe(wrap);
})();


/* ── 18. STRATEGIE — VERLUST-RECHNER (interaktiver Slider) ──
   Zeigt live, welche prozentuale Erholung nach einem Depotverlust
   nötig ist: recovery% = loss% / (100 - loss%) * 100. */
(function () {
  const slider = document.getElementById('riskSlider');
  if (!slider) return;

  const lossPctEl  = document.getElementById('riskLossPct');
  const startEl    = document.getElementById('riskStart');
  const afterEl    = document.getElementById('riskAfter');
  const recoveryEl = document.getElementById('riskRecoveryPct');
  const noteEl     = document.getElementById('riskCalcNote');
  const START      = 100000;

  const fmtEUR = n => Math.round(n).toLocaleString('de-DE') + ' €';
  const fmtPct1 = n => n.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  function update() {
    const pct      = +slider.value;
    const after    = START * (1 - pct / 100);
    const recovery = pct / (100 - pct) * 100;

    slider.setAttribute('aria-valuenow', String(pct));
    lossPctEl.textContent  = '−' + pct + ' %';
    startEl.textContent    = fmtEUR(START);
    afterEl.textContent    = fmtEUR(after);
    recoveryEl.textContent = '+' + fmtPct1(recovery) + ' %';
    noteEl.textContent     = '−' + pct + ' % Verlust bedeuten: +' + fmtPct1(recovery) + ' % Gewinn sind nötig, nur um wieder beim Ausgangspunkt zu sein.';
  }

  slider.addEventListener('input', update);
  update();
})();
