/* ============================================================
   WIESEL CAPITAL — COOKIE-EINWILLIGUNG
   ============================================================
   Wird auf jeder Seite als erstes Skript im <head> geladen (ohne defer),
   damit vor der Entscheidung nichts Einwilligungspflichtiges lädt.

   Kategorien
     notwendig  immer aktiv — Speichern dieser Auswahl (localStorage),
                Auslieferung und Schutz der Website (Cloudflare)
     statistik  HubSpot-Tracking, Contentsquare
     marketing  Meta-Pixel

   Die drei Dienste stehen bewusst nicht mehr im HTML der Seiten, sondern
   nur hier: Sie werden erst nach Zustimmung nachgeladen. Wer eine
   Zustimmung zurücknimmt, bekommt die Cookies des Dienstes gelöscht und
   die Seite neu geladen (ein bereits geladenes Skript lässt sich nicht
   entladen).

   Die Auswahl gilt 12 Monate. Kommt ein neuer Dienst hinzu, VERSION
   erhöhen — dann werden alle Besucher erneut gefragt.

   Öffnen der Einstellungen: jedes Element mit data-consent-open
   (Footer-Link „Cookie-Einstellungen“) oder window.wcConsent.open().
   ============================================================ */
(function () {
  'use strict';

  var KEY = 'wc_consent';
  var VERSION = 1;
  var LAUFZEIT_MS = 365 * 24 * 60 * 60 * 1000;

  /* Cookie-Präfixe je Kategorie — zum Löschen beim Widerruf. */
  var COOKIES = {
    statistik: ['__hstc', '__hssc', '__hssrc', 'hubspotutk', '__hs', 'messagesUtk', '_cs_'],
    marketing: ['_fbp', '_fbc']
  };


  /* ── Auswahl lesen und speichern ── */

  function lesen() {
    try {
      var w = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!w || w.v !== VERSION || typeof w.ts !== 'number') return null;
      if (Date.now() - w.ts > LAUFZEIT_MS) return null;
      return { statistik: !!w.statistik, marketing: !!w.marketing };
    } catch (e) {
      return null;
    }
  }

  function speichern(wahl) {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        v: VERSION, ts: Date.now(), statistik: !!wahl.statistik, marketing: !!wahl.marketing
      }));
    } catch (e) { /* privater Modus o. Ä. — gilt dann nur für diese Seite */ }
  }


  /* ── Dienste laden ── */

  var geladen = { statistik: false, marketing: false };

  function skript(src, id) {
    var s = document.createElement('script');
    s.src = src;
    s.async = true;
    if (id) s.id = id;
    (document.head || document.documentElement).appendChild(s);
  }

  function laden(wahl) {
    if (wahl.statistik && !geladen.statistik) {
      geladen.statistik = true;
      // HubSpot-Tracking (Portal 149183646, EU) und Contentsquare
      skript('https://js-eu1.hs-scripts.com/149183646.js', 'hs-script-loader');
      skript('https://t.contentsquare.net/uxa/4f8378cae3f2b.js');
    }
    if (wahl.marketing && !geladen.marketing) {
      geladen.marketing = true;
      // Meta-Pixel — der offizielle Einbettungscode, unverändert
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      window.fbq('init', '1385885573635656');
      window.fbq('track', 'PageView');
    }
  }


  /* ── Widerruf: Cookies der Kategorie löschen ── */

  function loeschen(kategorie) {
    var praefixe = COOKIES[kategorie] || [];
    var host = location.hostname;
    var domains = ['', host, '.' + host];
    var teile = host.split('.');
    if (teile.length > 2) domains.push('.' + teile.slice(-2).join('.'));

    document.cookie.split(';').forEach(function (c) {
      var name = c.split('=')[0].trim();
      if (!praefixe.some(function (p) { return name.indexOf(p) === 0; })) return;
      domains.forEach(function (d) {
        document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' + (d ? '; domain=' + d : '');
      });
    });
  }


  /* ── Banner ── */

  var banner = null;

  function html() {
    return '' +
      '<div class="cc-box">' +
        '<p class="cc-h" id="cc-h">Cookies &amp; Datenschutz</p>' +
        '<p class="cc-p" id="cc-p">Wir verwenden Cookies und ähnliche Technologien. Technisch notwendige sorgen dafür, dass die Website funktioniert. ' +
          'Mit Ihrer Einwilligung nutzen wir zusätzlich Statistik-Dienste (HubSpot, Contentsquare) und das Meta-Pixel für Marketing; dabei können Daten auch in die USA übermittelt werden. ' +
          'Ihre Auswahl können Sie jederzeit unter „Cookie-Einstellungen“ im Seitenfuß ändern. Mehr dazu in der <a href="datenschutz">Datenschutzerklärung</a>.</p>' +
        '<div class="cc-details" hidden>' +
          '<label class="cc-opt">' +
            '<input type="checkbox" class="cc-switch" checked disabled/>' +
            '<span class="cc-opt-text"><strong>Notwendig</strong> Speichern Ihrer Auswahl sowie sichere Auslieferung der Website. Immer aktiv.</span>' +
          '</label>' +
          '<label class="cc-opt">' +
            '<input type="checkbox" class="cc-switch" data-cc="statistik"/>' +
            '<span class="cc-opt-text"><strong>Statistik</strong> HubSpot Analytics und Contentsquare: Auswertung, wie Besucher unsere Website nutzen.</span>' +
          '</label>' +
          '<label class="cc-opt">' +
            '<input type="checkbox" class="cc-switch" data-cc="marketing"/>' +
            '<span class="cc-opt-text"><strong>Marketing</strong> Meta-Pixel: Messung der Wirkung unserer Anzeigen auf Facebook und Instagram.</span>' +
          '</label>' +
        '</div>' +
        '<div class="cc-actions">' +
          '<button type="button" class="cc-btn cc-btn--sec" data-cc-action="notwendig">Nur notwendige</button>' +
          '<button type="button" class="cc-btn cc-btn--pri" data-cc-action="alle">Alle akzeptieren</button>' +
        '</div>' +
        '<button type="button" class="cc-link" data-cc-action="einstellungen">Einstellungen</button>' +
      '</div>';
  }

  function aufbauen() {
    if (banner) return banner;
    banner = document.createElement('div');
    banner.className = 'cc';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-modal', 'false');
    banner.setAttribute('aria-labelledby', 'cc-h');
    banner.setAttribute('aria-describedby', 'cc-p');
    banner.hidden = true;
    banner.innerHTML = html();
    document.body.appendChild(banner);
    banner.addEventListener('click', function (e) {
      var b = e.target.closest('[data-cc-action]');
      if (b) aktion(b.getAttribute('data-cc-action'));
    });
    return banner;
  }

  function details(an) {
    var d = banner.querySelector('.cc-details');
    var link = banner.querySelector('.cc-link');
    d.hidden = !an;
    link.textContent = an ? 'Auswahl speichern' : 'Einstellungen';
    link.setAttribute('data-cc-action', an ? 'speichern' : 'einstellungen');
    banner.classList.toggle('is-details', an);
  }

  function zeigen(mitDetails) {
    aufbauen();
    var w = lesen() || { statistik: false, marketing: false };
    banner.querySelectorAll('[data-cc]').forEach(function (cb) {
      cb.checked = !!w[cb.getAttribute('data-cc')];
    });
    details(!!mitDetails);
    banner.hidden = false;
  }

  function schliessen() {
    if (banner) banner.hidden = true;
  }

  function entscheiden(neu) {
    var alt = lesen() || { statistik: false, marketing: false };
    speichern(neu);
    schliessen();

    // Zurückgenommene Zustimmung: Cookies weg, und — falls der Dienst auf
    // dieser Seite schon lief — neu laden, damit er wirklich aus ist.
    var neuLaden = false;
    ['statistik', 'marketing'].forEach(function (k) {
      if (!neu[k] && (alt[k] || geladen[k])) {
        loeschen(k);
        if (geladen[k]) neuLaden = true;
      }
    });
    if (neuLaden) { location.reload(); return; }

    laden(neu);
  }

  function aktion(a) {
    if (a === 'alle') entscheiden({ statistik: true, marketing: true });
    else if (a === 'notwendig') entscheiden({ statistik: false, marketing: false });
    else if (a === 'einstellungen') details(true);
    else if (a === 'speichern') {
      var wahl = { statistik: false, marketing: false };
      banner.querySelectorAll('[data-cc]').forEach(function (cb) {
        wahl[cb.getAttribute('data-cc')] = cb.checked;
      });
      entscheiden(wahl);
    }
  }


  /* ── Start ── */

  var wahl = lesen();
  if (wahl) laden(wahl);

  function start() {
    if (!wahl) zeigen(false);
    document.addEventListener('click', function (e) {
      var o = e.target.closest && e.target.closest('[data-consent-open]');
      if (!o) return;
      e.preventDefault();
      zeigen(true);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  window.wcConsent = {
    open: function () { zeigen(true); },
    get: lesen
  };
})();
