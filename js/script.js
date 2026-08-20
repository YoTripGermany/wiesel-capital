/* ============================================================
   WIESEL CAPITAL — Main JavaScript
   ============================================================
   1. Navigation scroll behaviour
   2. Mobile menu toggle
   3. Scroll-triggered fade animations
   4. Counter animations
   5. FAQ accordion
   6. Smooth scroll for anchor links
   ============================================================ */


/* ── 1. NAVIGATION SCROLL BEHAVIOUR ── */

const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 60);
});

/* Team-page hero photo/overlay (see .team-hero in style.css) sit right
   below the fixed topbar+nav, so they need that header's real height —
   it varies by breakpoint (topbar hidden + nav flush to top on mobile).
   Measured at rest (pre-scroll nav padding) since the hero itself scrolls
   away with the page well before the nav's scrolled-state padding kicks in. */
const topbar = document.getElementById('topbar');
function setTeamHeaderHeight() {
  const h = (topbar ? topbar.offsetHeight : 0) + nav.offsetHeight;
  document.documentElement.style.setProperty('--team-header-h', h + 'px');
}
setTeamHeaderHeight();
window.addEventListener('resize', setTeamHeaderHeight);
window.addEventListener('load', setTeamHeaderHeight);


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
  if (!isOpen) {
    menu.querySelectorAll('.mob-dropdown.open').forEach(d => {
      d.classList.remove('open');
      d.querySelector('.mob-dropdown-trigger').setAttribute('aria-expanded', 'false');
    });
  }
}

/* "Investment" / "Über uns" inside the mobile menu — same exclusive
   open-one-at-a-time behaviour as the FAQ accordion. */
function toggleMobDropdown(btn) {
  const dropdown = btn.closest('.mob-dropdown');
  const isOpen = dropdown.classList.contains('open');
  document.querySelectorAll('.mob-dropdown.open').forEach(d => {
    d.classList.remove('open');
    d.querySelector('.mob-dropdown-trigger').setAttribute('aria-expanded', 'false');
  });
  if (!isOpen) {
    dropdown.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
  }
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
  const WIESEL_VAL = 3783000;
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


/* ── 19. AUTO-SCROLL CAROUSELS ──
   Shared driver behind two independent tracks:
   - #trust .trust-grid — below the 860px breakpoint this becomes a
     horizontally scrollable track (see CSS) holding the 3 badge cards
     twice in a row; above that breakpoint it's a static grid, so the
     scrollWidth===clientWidth check below naturally no-ops it.
   - #reviews .review-track — the Trustpilot review carousel, which
     scrolls at every viewport width since it's the page's primary
     content there, not a mobile-only fallback.
   Each drives a slow, continuous right-to-left auto-scroll on top of
   native overflow-x, so touch/trackpad scrolling and tapping a card both
   keep working untouched. Auto-scroll pauses whenever the visitor is
   actively touching/dragging and resumes shortly after they let go, and
   wraps scrollLeft by exactly one card-set width (measured, not
   hardcoded) once it — or the visitor — scrolls past the first set, so
   the loop back to the start is invisible. No-ops on any page/track
   that isn't present. */
function initAutoCarousel(track, SPEED) {
  if (!track) return;

  let setWidth = 0;
  let paused = false;
  let resumeTimer = null;
  let last = null;
  // Tracked separately from track.scrollLeft (which the browser rounds to
  // an integer on every read) so a sub-1px-per-frame speed can still
  // accumulate smoothly instead of rounding away to nothing each frame.
  let pos = track.scrollLeft;

  function measure() {
    setWidth = track.scrollWidth / 2;
  }

  function pause() {
    paused = true;
    clearTimeout(resumeTimer);
  }
  function scheduleResume() {
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(() => {
      paused = false;
      last = null;
      pos = track.scrollLeft; // continue from wherever the visitor left it
    }, 2200);
  }

  track.addEventListener('pointerdown', pause, { passive: true });
  track.addEventListener('pointerup', scheduleResume, { passive: true });
  track.addEventListener('pointercancel', scheduleResume, { passive: true });
  track.addEventListener('touchstart', pause, { passive: true });
  track.addEventListener('touchend', scheduleResume, { passive: true });
  track.addEventListener('wheel', () => { pause(); scheduleResume(); }, { passive: true });

  track.addEventListener('scroll', () => {
    if (setWidth && track.scrollLeft >= setWidth) {
      track.scrollLeft -= setWidth;
      pos = track.scrollLeft;
    }
  }, { passive: true });

  function tick(now) {
    if (last === null) last = now;
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    if (!paused && !reducedMotion && setWidth && track.clientWidth < track.scrollWidth - 1) {
      pos += SPEED * dt;
      track.scrollLeft = pos;
    }
    requestAnimationFrame(tick);
  }

  window.addEventListener('resize', measure);
  window.addEventListener('load', measure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  measure();
  requestAnimationFrame(tick);
}

initAutoCarousel(document.querySelector('#trust .trust-grid'), 28);

/* ── Newsletter → Klaviyo ── */
(function () {
  const KLAVIYO_PUBLIC_KEY = 'XAdS8M';
  const KLAVIYO_LIST_ID = 'X4eeE2';

  const form = document.getElementById('newsletterForm');
  if (!form) return;
  const emailInput = form.querySelector('input[type="email"]');
  const button = form.querySelector('button[type="submit"]');
  const msg = document.getElementById('newsletterMsg');

  function showMsg(text, isError) {
    if (!msg) return;
    msg.textContent = text;
    msg.classList.toggle('is-error', !!isError);
    msg.classList.add('is-visible');
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    const email = emailInput.value.trim();
    if (!email) return;

    button.disabled = true;

    try {
      const res = await fetch(`https://a.klaviyo.com/client/subscriptions?company_id=${KLAVIYO_PUBLIC_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          revision: '2024-10-15'
        },
        body: JSON.stringify({
          data: {
            type: 'subscription',
            attributes: {
              profile: {
                data: {
                  type: 'profile',
                  attributes: { email }
                }
              }
            },
            relationships: {
              list: {
                data: { type: 'list', id: KLAVIYO_LIST_ID }
              }
            }
          }
        })
      });

      if (res.ok) {
        showMsg('Danke! Bitte bestätigen Sie Ihre E-Mail-Adresse in Ihrem Postfach.', false);
        form.reset();
      } else {
        showMsg('Etwas ist schiefgelaufen. Bitte versuchen Sie es erneut.', true);
      }
    } catch (err) {
      showMsg('Etwas ist schiefgelaufen. Bitte versuchen Sie es erneut.', true);
    } finally {
      button.disabled = false;
    }
  });
})();
initAutoCarousel(document.querySelector('#reviews .review-track'), 24);
