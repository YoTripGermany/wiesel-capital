/* ============================================================
   WIESEL CAPITAL — LANDINGPAGE /erstgespraech
   ============================================================
   Läuft vor js/script.js (beide `defer`, Reihenfolge = Dokumentreihenfolge),
   damit Abschnitt 2 das Finn-Video freischaltet, bevor die Lightbox aus
   script.js ihre Trigger einsammelt.

   Gemeinsames — Fade-Animationen, Smooth-Scroll, Video-Lightbox, HubSpot-
   Queue — kommt unverändert aus js/script.js.

   1. Konfiguration (die einzige Stelle zum Eintragen)
   2. Finn-Video freischalten
   3. Vorqualifizierung (vierstufiger Flow)
   ============================================================ */


/* ============================================================
   1. KONFIGURATION
   ============================================================
   Alles, was von außen kommt, steht hier — sonst nirgends.
   ------------------------------------------------------------ */

const WC_CONFIG = {

  hubspot: {
    /* Portal-ID aus dem Tracking-Embed im <head> jeder Seite. */
    portalId: '149183646',

    /* GUID des Formulars, an das übermittelt wird (Portal eu1, geprüft). */
    formGuid: '22f5ccaa-b61b-4f8d-948e-543f73e8d734',

    /* Interne Property-Namen. Links der Feldname im Code, rechts der
       interne Name in HubSpot. */
    properties: {
      vorname:   'firstname',
      nachname:  'lastname',
      telefon:   'phone',
      email:     'email',

      /* Auswahllisten — die internen Werte stehen in den Tabellen unten. */
      vermoegen: 'vermoegensklasse',
      quelle:    'aufmerksam_geworden_ueber'
    }
  },

  meeting: {
    /* Einzige Terminstrecke dieser Landingpage. Bewusst ohne Ausweichweg:
       Lädt der Scheduler nicht, zeigt der Flow eine Fehleransicht mit
       „Erneut laden“ und dem direkten Link — kein stiller Wechsel auf
       Calendly. Die Calendly-Links der übrigen Seiten bleiben unberührt. */
    hubspotUrl: 'https://meetings-eu1.hubspot.com/wiesel-capital/erstgesprach'
  },

  /* ⚠️ EINTRAGEN: Kanal-URL für die Abschlussansicht unter 100.000 €.
     Im Repository ist kein YouTube-Kanal verlinkt (Footer führt Instagram,
     Facebook, LinkedIn, X und TikTok). Solange leer, verweist die Ansicht
     auf die vorhandene Strategie-Seite statt auf einen erfundenen Link. */
  youtubeUrl: ''
};


/* Sichtbare Bezeichnung ⇄ interner Wert der HubSpot-Auswahlliste
   `vermoegensklasse`. Die rechte Spalte ist im Portal geprüft — an HubSpot
   geht ausschließlich sie, nie das Label.

   `qualifiziert: false` blendet die Terminbuchung aus. Das ist die einzige
   Stelle im Code, an der die Schwelle von 100.000 € festgelegt ist. */
const VERMOEGENSKLASSEN = [
  { id: 'u100',      label: 'Unter 100.000 €',       hubspot: 'under_100k', qualifiziert: false },
  { id: '100_250',   label: '100.000–250.000 €',     hubspot: '100k_250k',  qualifiziert: true  },
  { id: '250_500',   label: '250.000–500.000 €',     hubspot: '250k_500k',  qualifiziert: true  },
  { id: '500_1000',  label: '500.000–1.000.000 €',   hubspot: '500k_1m',    qualifiziert: true  },
  { id: '1000_2500', label: '1.000.000–2.500.000 €', hubspot: '1m_2_5m',    qualifiziert: true  },
  { id: 'ue2500',    label: 'Über 2.500.000 €',      hubspot: 'over_2_5m',  qualifiziert: true  }
];

/* Auswahlliste `aufmerksam_geworden_ueber`, ebenfalls im Portal geprüft.
   Die einzige Leadquellen-Zuordnung dieser Seite — sie kommt ausschließlich
   aus dieser Frage, nicht aus URL-Parametern oder Cookies. */
const QUELLEN = [
  { id: 'youtube',    label: 'YouTube',    hubspot: 'youtube'    },
  { id: 'linkedin',   label: 'LinkedIn',   hubspot: 'linkedin'   },
  { id: 'instagram',  label: 'Instagram',  hubspot: 'instagram'  },
  { id: 'facebook',   label: 'Facebook',   hubspot: 'facebook'   },
  { id: 'empfehlung', label: 'Empfehlung', hubspot: 'empfehlung' },
  { id: 'sonstiges',  label: 'Sonstiges',  hubspot: 'sonstiges'  }
];


/* ── 2. FINN-VIDEO (INLINE) ──
   Das Video spielt direkt in der Hero-Karte. Darüber liegt das Standbild
   als Schaltfläche; ein Klick blendet es aus und startet die Wiedergabe
   im selben Tap (Browser erlauben Ton nur so).

   Schneller Start: Das HTML lädt nur die Metadaten. Sobald die Seite
   fertig ist, wird auf preload="auto" umgestellt und das Video puffert
   im Hintergrund vor. Bei Maus-Hover oder erster Berührung passiert das
   sofort, falls die Seite noch lädt. */
(function () {
  const player = document.querySelector('[data-lp-player]');
  if (!player) return;
  const video = player.querySelector('video');
  const cover = player.querySelector('.lp-herovideo-cover');
  if (!video || !cover) return;

  function warmUp() {
    if (video.preload === 'auto') return;
    video.preload = 'auto';
    video.load();
  }

  if (document.readyState === 'complete') warmUp();
  else window.addEventListener('load', warmUp, { once: true });
  cover.addEventListener('pointerenter', warmUp, { once: true });
  cover.addEventListener('touchstart', warmUp, { once: true, passive: true });

  cover.addEventListener('click', function () {
    video.controls = true;
    player.classList.add('is-playing');
    const p = video.play();
    if (p && p.catch) {
      p.catch(function () {
        // Wiedergabe blockiert: Standbild zurück, damit erneut geklickt werden kann.
        player.classList.remove('is-playing');
        video.controls = false;
      });
    }
    video.focus({ preventScroll: true });
  });

  // Am Ende wieder das Standbild mit Play-Knopf zeigen.
  video.addEventListener('ended', function () {
    player.classList.remove('is-playing');
    video.controls = false;
    video.currentTime = 0;
  });
})();


/* ============================================================
   3. VORQUALIFIZIERUNG
   ============================================================
   Vier Schritte, ein Datensatz, eine Übermittlung.

   Ablauf:
     Schritt 1  Name        → Vorname, Nachname
     Schritt 2  Kontakt     → Telefon, E-Mail
     Schritt 3  Vermögen    → eine von sechs Klassen
     Schritt 4  Quelle      → eine von sechs Angaben (+ Freitext bei Sonstiges)
     danach     einmalige Übermittlung an HubSpot
                → ab 100.000 €: Terminbuchung in derselben Sektion
                → darunter:     freundliche Abschlussansicht ohne Kalender

   Die Eingaben bleiben bis zum Schluss ausschließlich im Zustand unten.
   Kein Zwischenspeichern, keine Übermittlung pro Schritt, kein Tracking.
   ------------------------------------------------------------ */

const QualificationForm = (function () {

  const root = document.querySelector('[data-qform]');
  if (!root) return { start: function () {} };

  const mountPoint = root.querySelector('[data-qform-mount]');
  const intro      = root.querySelector('[data-qform-intro]');

  /* Auf /erstgespraech-anfrage sitzt die Fortschrittsanzeige in der
     Kopfzeile statt über der Frage. Sind diese Knoten vorhanden, wird der
     Fortschritt dort geführt und im Schritt selbst weggelassen. */
  const balken      = document.querySelector('[data-qform-bar]');
  const balkenFuell = document.querySelector('[data-qform-bar-fill]');
  const schale      = document.querySelector('[data-qa-shell]');
  const eigeneSeite = root.hasAttribute('data-qform-auto');

  const SCHRITTE = 4;

  const daten = {
    vorname: '', nachname: '', telefon: '', email: '',
    vermoegen: '', quelle: ''
  };

  let schritt = 1;                 // 1…4
  let fehler = {};                 // feldname → Meldung
  let ansicht = 'schritte';        // schritte | senden | termin | terminFehler | danke | fehler
  let erfolgreichGesendet = false; // verhindert eine zweite Übermittlung
  let laeuft = false;              // sperrt den Absenden-Weg gegen Mehrfachklicks
  let ladeWaechter = null;         // Zeitgeber, der das Nichtladen des Schedulers erkennt


  /* ── Hilfsfunktionen ── */

  function esc(v) {
    return String(v).replace(/[&<>"']/g, c => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  function klasse(id) { return VERMOEGENSKLASSEN.find(k => k.id === id) || null; }

  function istQualifiziert() {
    const k = klasse(daten.vermoegen);
    return !!k && k.qualifiziert;
  }

  /* Bewusst nachsichtig: Es geht darum, Tippfehler abzufangen, nicht darum,
     exotische aber gültige Adressen abzulehnen. */
  function emailGueltig(v) {
    return /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(v.trim());
  }

  /* Mindestens sechs Ziffern, beliebig formatiert (+49 …, 0172/…, Leerzeichen). */
  function telefonGueltig(v) {
    return (v.match(/\d/g) || []).length >= 6;
  }


  /* ── Validierung ──
     Läuft erst beim Klick auf „Weiter“, nie beim Tippen. */

  function pruefe() {
    fehler = {};

    if (schritt === 1) {
      if (!daten.vorname.trim())  fehler.vorname  = 'Bitte gib deinen Vornamen ein.';
      if (!daten.nachname.trim()) fehler.nachname = 'Bitte gib deinen Nachnamen ein.';
    }

    if (schritt === 2) {
      if (!daten.telefon.trim())            fehler.telefon = 'Bitte gib deine Telefonnummer ein.';
      else if (!telefonGueltig(daten.telefon)) fehler.telefon = 'Bitte gib eine gültige Telefonnummer ein.';

      if (!daten.email.trim())              fehler.email = 'Bitte gib deine E-Mail-Adresse ein.';
      else if (!emailGueltig(daten.email))  fehler.email = 'Bitte gib eine gültige E-Mail-Adresse ein.';
    }

    if (schritt === 3 && !daten.vermoegen) {
      fehler.vermoegen = 'Bitte wähle eine Angabe aus.';
    }

    if (schritt === 4 && !daten.quelle) {
      fehler.quelle = 'Bitte wähle eine Angabe aus.';
    }

    return Object.keys(fehler).length === 0;
  }


  /* ── Übermittlung ──
     HubSpot Forms API v3. Dieser Endpunkt ist für den Aufruf aus dem Browser
     gedacht und kommt ohne Token aus: Portal-ID und Formular-GUID sind
     öffentliche Kennungen (sie stehen in jedem Einbettungscode). Damit liegt
     kein Geheimnis im Client — dieselbe Bauweise wie beim Newsletter, der in
     js/script.js direkt an Klaviyo sendet.

     Soll die Übermittlung später doch über einen eigenen Server laufen, ist
     genau diese eine Funktion auszutauschen. */

  function feld(name, wert) {
    return { objectTypeId: '0-1', name: name, value: wert };
  }

  function nutzlast() {
    const p = WC_CONFIG.hubspot.properties;
    const felder = [
      feld(p.vorname,  daten.vorname.trim()),
      feld(p.nachname, daten.nachname.trim()),
      feld(p.telefon,  daten.telefon.trim()),
      feld(p.email,    daten.email.trim())
    ];

    const k = klasse(daten.vermoegen);
    if (p.vermoegen && k) felder.push(feld(p.vermoegen, k.hubspot));

    const q = QUELLEN.find(x => x.id === daten.quelle);
    if (p.quelle && q) felder.push(feld(p.quelle, q.hubspot));

    return {
      fields: felder,
      context: { pageUri: location.href, pageName: document.title }
    };
  }

  async function senden() {
    const { portalId, formGuid } = WC_CONFIG.hubspot;
    if (!portalId || !formGuid) {
      throw new Error('nicht konfiguriert');
    }

    const res = await fetch(
      'https://api.hsforms.com/submissions/v3/integration/submit/' + portalId + '/' + formGuid,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nutzlast())
      }
    );

    /* Nur der Status wandert in die Konsole — er enthält nichts
       Personenbezogenes. Antwortkörper und Feldwerte bleiben ungeloggt. */
    if (!res.ok) {
      console.warn('[Wiesel Capital] HubSpot-Übermittlung fehlgeschlagen — HTTP ' + res.status);
      throw new Error('abgelehnt');
    }
  }


  /* ── Buchungsstrecke ──
     Vorname, Nachname und E-Mail werden vorbelegt, damit niemand dieselben
     Angaben zweimal eintippen muss. Beide Anbieter nehmen die Werte als
     Query-Parameter entgegen; die Telefonnummer lassen beide nur über
     eigens angelegte Buchungsfragen zu und bleibt deshalb außen vor. */
  function buchungsUrl(eingebettet) {
    const u = new URL(WC_CONFIG.meeting.hubspotUrl);
    if (eingebettet) u.searchParams.set('embed', 'true');
    /* Alle vier Felder des HubSpot-Buchungsformulars werden vorbelegt —
       im Scheduler geprüft: Vorname, Nachname, E-Mail und Telefonnummer
       kommen dort ausgefüllt an. Zu tun bleibt nur noch das Bestätigen.
       Werden einzelne Parameter später einmal ignoriert, öffnet der
       Scheduler trotzdem, nur ohne Vorbelegung. */
    u.searchParams.set('firstName', daten.vorname.trim());
    u.searchParams.set('lastName', daten.nachname.trim());
    u.searchParams.set('email', daten.email.trim());
    u.searchParams.set('phone', daten.telefon.trim());
    return u.toString();
  }


  /* ── Ansichten ── */

  /* Der Fortschritt läuft ausschließlich über die Linie in der Kopfzeile:
     Sie wird aktualisiert statt neu gebaut, damit die Breite sauber
     weiterläuft, und verschwindet außerhalb der Fragestrecke. */
  function aktualisiereKopfFortschritt() {
    if (!balken) return;
    const inSchritten = ansicht === 'schritte';
    balken.hidden = !inSchritten;
    if (!inSchritten) return;
    balken.setAttribute('aria-valuenow', String(schritt));
    if (balkenFuell) balkenFuell.style.width = Math.round((schritt / SCHRITTE) * 100) + '%';
  }

  function fehlerZeile(name) {
    if (!fehler[name]) return '';
    return `<p class="qf-error" id="qf-fehler-${name}" role="alert">${esc(fehler[name])}</p>`;
  }

  function textfeld(name, label, typ, autocomplete, inputmode) {
    const hatFehler = !!fehler[name];
    return `
      <div class="qf-field">
        <label class="qf-label" for="qf-${name}">${esc(label)}</label>
        <input class="qf-input${hatFehler ? ' is-invalid' : ''}" id="qf-${name}" name="${name}"
               type="${typ}" value="${esc(daten[name])}"
               autocomplete="${autocomplete}"${inputmode ? ` inputmode="${inputmode}"` : ''}
               ${hatFehler ? `aria-invalid="true" aria-describedby="qf-fehler-${name}"` : ''}/>
        ${fehlerZeile(name)}
      </div>`;
  }

  function auswahl(name, optionen) {
    const karten = optionen.map(o => `
        <label class="qf-choice">
          <input type="radio" class="qf-choice-input" name="${name}" value="${o.id}"
                 ${daten[name] === o.id ? 'checked' : ''}/>
          <span class="qf-choice-body">
            <span class="qf-choice-label">${esc(o.label)}</span>
            <span class="qf-choice-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6.5 9.5 17 4 11.5"/></svg>
            </span>
          </span>
        </label>`).join('');

    return `<div class="qf-choices" role="radiogroup" aria-labelledby="qf-frage">${karten}</div>`;
  }

  /* Kopf der Box: Zurück links, „Schritt x von 4“ rechts, darunter vier
     Segmente, die sich Schritt für Schritt füllen. */
  function kopf() {
    const zurueck = schritt > 1
      ? `<button type="button" class="qf-back" data-qf-zurueck>
           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>
           Zurück
         </button>`
      : '<span></span>';

    let segmente = '';
    for (let i = 1; i <= SCHRITTE; i++) {
      segmente += `<span class="qf-seg${i <= schritt ? ' is-done' : ''}"></span>`;
    }

    return `
      <div class="qf-top">
        ${zurueck}
        <span class="qf-steplabel">Schritt ${schritt} von ${SCHRITTE}</span>
      </div>
      <div class="qf-segs" role="progressbar" aria-valuemin="1" aria-valuemax="${SCHRITTE}"
           aria-valuenow="${schritt}" aria-label="Fortschritt">${segmente}</div>`;
  }

  function aktionen() {
    const text = schritt < SCHRITTE ? 'Weiter' : 'Anfrage absenden';
    return `
      <div class="qf-actions">
        <button type="submit" class="btn-p qf-next">
          <span class="btn-text-wrap">
            <span class="btn-text btn-text-a">${text}</span>
            <span class="btn-text btn-text-b">${text}</span>
          </span>
          <svg class="qf-next-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        </button>
      </div>`;
  }

  function schrittAnsicht() {
    let frage = '';
    let inhalt = '';

    if (schritt === 1) {
      frage = 'Wie dürfen wir dich ansprechen?';
      inhalt = `<div class="qf-fields qf-fields--zwei">
          ${textfeld('vorname', 'Vorname', 'text', 'given-name')}
          ${textfeld('nachname', 'Nachname', 'text', 'family-name')}
        </div>`;
    }

    if (schritt === 2) {
      frage = 'Wie können wir dich erreichen?';
      inhalt = `<div class="qf-fields qf-fields--zwei">
          ${textfeld('telefon', 'Telefonnummer', 'tel', 'tel', 'tel')}
          ${textfeld('email', 'E-Mail-Adresse', 'email', 'email', 'email')}
        </div>
        <p class="qf-hint">Deine Angaben verwenden wir ausschließlich zur Kontaktaufnahme rund um dein Erstgespräch. <a href="datenschutz">Datenschutzerklärung</a></p>`;
    }

    if (schritt === 3) {
      frage = 'Wie hoch ist dein aktuell investierbares Vermögen?';
      inhalt = auswahl('vermoegen', VERMOEGENSKLASSEN) + fehlerZeile('vermoegen');
    }

    if (schritt === 4) {
      frage = 'Wie bist du auf Wiesel Capital aufmerksam geworden?';
      inhalt = auswahl('quelle', QUELLEN) + fehlerZeile('quelle');
    }

    return `
      <form class="qf-form" novalidate data-qf-form>
        ${kopf()}
        <div class="qf-body">
          <h1 class="qf-frage" id="qf-frage" tabindex="-1">${esc(frage)}</h1>
          ${inhalt}
        </div>
        ${aktionen()}
      </form>`;
  }

  function ladeAnsicht() {
    return `
      <div class="qf-status" role="status">
        <span class="qf-spinner" aria-hidden="true"></span>
        <p class="qf-status-text">Einen Moment – wir bereiten deinen nächsten Schritt vor …</p>
      </div>`;
  }

  function fehlerAnsicht() {
    return `
      <div class="qf-status qf-status--fehler">
        <h1 class="qf-frage" tabindex="-1">Das hat gerade leider nicht funktioniert.</h1>
        <p class="qf-status-text">Bitte versuche es noch einmal.</p>
        <button type="button" class="btn-p qf-next" data-qf-erneut>
          <span class="btn-text-wrap">
            <span class="btn-text btn-text-a">Erneut versuchen</span>
            <span class="btn-text btn-text-b">Erneut versuchen</span>
          </span>
        </button>
      </div>`;
  }

  function terminAnsicht() {
    return `
      <div class="qf-termin">
        <h1 class="qf-frage" tabindex="-1">Such dir jetzt deinen Termin mit <em class="qf-gold">Finn Wiesel</em> aus.</h1>
        <p class="qf-termin-sub">Wähle einfach einen passenden Zeitpunkt für dein kostenloses Erstgespräch.</p>
        <div class="qf-embed">
          <iframe src="${esc(buchungsUrl(true))}" title="Terminauswahl für dein kostenloses Erstgespräch" data-qf-scheduler></iframe>
        </div>
      </div>`;
  }

  /* Der Scheduler ist der einzige Buchungsweg dieser Seite — lädt er nicht,
     wird das gesagt, statt eine leere Fläche stehen zu lassen. Kein
     Ausweichen auf eine andere Terminstrecke. */
  function terminFehlerAnsicht() {
    return `
      <div class="qf-status qf-status--fehler">
        <h1 class="qf-frage" tabindex="-1">Die Terminauswahl lässt sich gerade nicht laden.</h1>
        <p class="qf-status-text">Deine Angaben sind angekommen. Versuche es noch einmal oder öffne die Terminseite direkt.</p>
        <div class="qf-status-actions">
          <button type="button" class="btn-p qf-next" data-qf-termin-neu>
            <span class="btn-text-wrap">
              <span class="btn-text btn-text-a">Erneut laden</span>
              <span class="btn-text btn-text-b">Erneut laden</span>
            </span>
          </button>
          <a class="qf-linkbtn" href="${esc(buchungsUrl(false))}" target="_blank" rel="noopener">Terminseite öffnen</a>
        </div>
      </div>`;
  }

  function dankeAnsicht() {
    const yt = WC_CONFIG.youtubeUrl;
    const text = yt
      ? 'Unser Mentoring richtet sich aktuell primär an Anleger mit mindestens 100.000 € investierbarem Vermögen. Auf unserem YouTube-Kanal findest du bereits viele kostenlose Inhalte rund um Investments und Vermögensaufbau.'
      : 'Unser Mentoring richtet sich aktuell primär an Anleger mit mindestens 100.000 € investierbarem Vermögen. Wie wir Vermögen strukturieren und Risiken steuern, kannst du dir in Ruhe auf unserer Strategie-Seite ansehen.';

    const cta = yt
      ? `<a href="${esc(yt)}" target="_blank" rel="noopener" class="btn-p qf-next">
           <span class="btn-text-wrap">
             <span class="btn-text btn-text-a">Zu YouTube</span>
             <span class="btn-text btn-text-b">Zu YouTube</span>
           </span>
         </a>`
      : `<a href="strategie" class="btn-p qf-next">
           <span class="btn-text-wrap">
             <span class="btn-text btn-text-a">Unsere Strategie ansehen</span>
             <span class="btn-text btn-text-b">Unsere Strategie ansehen</span>
           </span>
         </a>`;

    return `
      <div class="qf-status qf-status--danke">
        <h1 class="qf-frage" tabindex="-1">Danke für dein Interesse.</h1>
        <p class="qf-status-text">${text}</p>
        ${cta}
      </div>`;
  }


  /* ── Rendern und Verdrahten ── */

  function render(fokus) {
    /* Ein Wächter aus einer vorherigen Ansicht darf nicht in die neue
       hineinfeuern. */
    if (ladeWaechter) { clearTimeout(ladeWaechter); ladeWaechter = null; }

    /* Die Terminauswahl bekommt die volle Breite — die Begründungsspalte
       daneben hat ihren Zweck dann erfüllt. */
    if (schale) schale.classList.toggle('is-breit', ansicht === 'termin');

    if (ansicht === 'schritte')          mountPoint.innerHTML = schrittAnsicht();
    else if (ansicht === 'senden')       mountPoint.innerHTML = ladeAnsicht();
    else if (ansicht === 'termin')       mountPoint.innerHTML = terminAnsicht();
    else if (ansicht === 'terminFehler') mountPoint.innerHTML = terminFehlerAnsicht();
    else if (ansicht === 'danke')        mountPoint.innerHTML = dankeAnsicht();
    else                                 mountPoint.innerHTML = fehlerAnsicht();

    verdrahte();
    aktualisiereKopfFortschritt();

    /* Fokus auf die Überschrift des neuen Abschnitts, damit Screenreader den
       Wechsel mitbekommen und die Tastaturbedienung dort weiterläuft. Beim
       ersten Aufbau nicht, sonst springt die Seite beim Klick auf „Jetzt
       starten“ an der Überschrift vorbei. */
    if (fokus) {
      const erstesFehlerfeld = mountPoint.querySelector('.qf-input.is-invalid');
      const ziel = erstesFehlerfeld || mountPoint.querySelector('.qf-frage');
      if (ziel) ziel.focus({ preventScroll: true });
    }
  }

  function verdrahte() {
    const form = mountPoint.querySelector('[data-qf-form]');

    if (form) {
      form.addEventListener('submit', e => { e.preventDefault(); weiter(); });

      mountPoint.querySelectorAll('.qf-input').forEach(el => {
        el.addEventListener('input', () => { daten[el.name] = el.value; });
      });

      mountPoint.querySelectorAll('.qf-choice-input').forEach(el => {
        el.addEventListener('change', () => {
          daten[el.name] = el.value;
          if (fehler[el.name]) {
            delete fehler[el.name];
            const meldung = mountPoint.querySelector('#qf-fehler-' + el.name);
            if (meldung) meldung.remove();
          }
          /* Beim Vermögen reicht ein Klick: kurz die Auswahl zeigen, dann
             weiter. Der letzte Schritt sendet dagegen erst auf Knopfdruck. */
          if (schritt === 3) {
            const bei = schritt;
            setTimeout(() => { if (schritt === bei && ansicht === 'schritte') weiter(); }, 320);
          }
        });
      });

      const zurueck = mountPoint.querySelector('[data-qf-zurueck]');
      if (zurueck) zurueck.addEventListener('click', () => {
        if (schritt > 1) { schritt--; fehler = {}; render(true); }
      });
    }

    const erneut = mountPoint.querySelector('[data-qf-erneut]');
    if (erneut) erneut.addEventListener('click', abschliessen);

    const terminNeu = mountPoint.querySelector('[data-qf-termin-neu]');
    if (terminNeu) terminNeu.addEventListener('click', () => {
      ansicht = 'termin';
      render(true);
    });

    /* Lädt der Scheduler nicht innerhalb von zwölf Sekunden, tritt die
       Fehleransicht an seine Stelle. */
    const scheduler = mountPoint.querySelector('[data-qf-scheduler]');
    if (scheduler) {
      let geladen = false;
      scheduler.addEventListener('load', () => {
        geladen = true;
        if (ladeWaechter) { clearTimeout(ladeWaechter); ladeWaechter = null; }
      });
      ladeWaechter = setTimeout(() => {
        ladeWaechter = null;
        if (geladen || ansicht !== 'termin') return;
        console.warn('[Wiesel Capital] HubSpot-Meetings-Scheduler wurde nicht geladen.');
        ansicht = 'terminFehler';
        render(true);
      }, 12000);
    }
  }

  function weiter() {
    if (!pruefe()) { render(true); return; }

    if (schritt < SCHRITTE) { schritt++; render(true); return; }

    abschliessen();
  }

  async function abschliessen() {
    /* Zweiter Klick auf „Weiter“ oder „Erneut versuchen“, während die erste
       Anfrage noch unterwegs ist: Die Sperre verhindert eine zweite
       Übermittlung; das Neuzeichnen allein reicht dafür nicht. */
    if (laeuft) return;
    laeuft = true;

    ansicht = 'senden';
    render(false);

    try {
      if (!erfolgreichGesendet) {
        await senden();
        erfolgreichGesendet = true;
      }
      /* Der Kalender erscheint ausschließlich nach erfolgreicher
         Übermittlung — bei einem Fehler führt kein Weg dorthin. */
      ansicht = istQualifiziert() ? 'termin' : 'danke';
    } catch (e) {
      ansicht = 'fehler';
    } finally {
      laeuft = false;
    }

    render(true);
  }


  /* ── Start ── */

  function start(e) {
    if (e) e.preventDefault();
    if (intro) intro.hidden = true;
    mountPoint.hidden = false;
    ansicht = 'schritte';
    schritt = 1;
    fehler = {};
    render(false);
    /* Nur wenn der Flow in eine bestehende Seite hineinklappt. Auf der
       eigenen Anfrageseite steht er ohnehin schon oben. */
    if (!eigeneSeite) mountPoint.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  const startEl = root.querySelector('[data-qform-start]');
  if (startEl) startEl.addEventListener('click', start);

  /* /erstgespraech-anfrage besteht nur aus den Fragen — direkt los. */
  if (eigeneSeite) start();

  /* Hinweis für die Einrichtung — nur Konfiguration, keine Nutzerdaten. */
  if (!WC_CONFIG.hubspot.formGuid) {
    console.warn('[Wiesel Capital] WC_CONFIG.hubspot.formGuid ist nicht gesetzt — die Vorqualifizierung kann noch nicht an HubSpot übermitteln.');
  }

  return { start: start, daten: daten, VERMOEGENSKLASSEN: VERMOEGENSKLASSEN, QUELLEN: QUELLEN };
})();
