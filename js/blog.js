/* ============================================================
   WIESEL CAPITAL — Blog-Artikel
   ============================================================
   1. Lesefortschritt (Goldlinie am oberen Rand)
   2. "Link kopieren" in der Teilen-Leiste
   ============================================================ */

(function () {

  /* ── 1. LESEFORTSCHRITT ── */

  var bar = document.getElementById('postProgress');
  var article = document.querySelector('.post');
  if (bar && article) {
    var ticking = false;
    var update = function () {
      ticking = false;
      var rect = article.getBoundingClientRect();
      var distance = rect.height - window.innerHeight;
      var progress = distance > 0 ? Math.min(1, Math.max(0, -rect.top / distance)) : 1;
      bar.style.transform = 'scaleX(' + progress + ')';
    };
    var request = function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    };
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request);
    update();
  }


  /* ── 2. LINK KOPIEREN ── */

  document.querySelectorAll('[data-copy-link]').forEach(function (button) {
    var note = button.querySelector('.post-share-copied');
    var timer;
    button.addEventListener('click', function () {
      var url = button.getAttribute('data-copy-link');
      var done = function (text) {
        if (!note) return;
        note.textContent = text;
        note.classList.add('on');
        clearTimeout(timer);
        timer = setTimeout(function () { note.classList.remove('on'); }, 2200);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(
          function () { done('Link kopiert'); },
          function () { window.prompt('Link zum Kopieren:', url); }
        );
      } else {
        window.prompt('Link zum Kopieren:', url);
      }
    });
  });

})();
