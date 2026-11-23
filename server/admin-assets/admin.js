/* ============================================================
   WIESEL CAPITAL — Redaktion (/admin)
   ============================================================
   1. Helfer (Meldungen, Server-Anfragen)
   2. Anmeldung
   3. Artikelliste
   4. Editor
      4.1 Felder & Zustand        4.4 Bilder
      4.2 Werkzeugleiste          4.5 Speichern & Veröffentlichen
      4.3 Einfügen (Word, Docs)
   ============================================================ */

(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };


  /* ── 1. HELFER ── */

  var toastEl = $('toast');
  var toastTimer;
  function toast(message, options) {
    options = options || {};
    toastEl.textContent = message;
    if (options.link) {
      var a = document.createElement('a');
      a.href = options.link.href;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = options.link.label;
      toastEl.appendChild(a);
    }
    toastEl.classList.toggle('is-error', Boolean(options.error));
    toastEl.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('on'); }, options.error ? 7000 : 4500);
  }

  /* Anfrage an den Server. Wirft einen Fehler mit verständlichem Text. */
  async function api(method, url, body) {
    var options = { method: method, headers: { 'X-Wiesel-Admin': '1' }, credentials: 'same-origin' };
    if (body instanceof Blob) {
      options.body = body;
      options.headers['Content-Type'] = body.type || 'application/octet-stream';
    } else if (body !== undefined) {
      options.body = JSON.stringify(body);
      options.headers['Content-Type'] = 'application/json';
    }
    var response;
    try {
      response = await fetch(url, options);
    } catch (e) {
      throw new Error('Keine Verbindung zum Server. Bitte die Internetverbindung prüfen und erneut versuchen.');
    }
    var data = {};
    try { data = await response.json(); } catch (e) { /* keine JSON-Antwort */ }
    if (!response.ok) {
      var error = new Error(data.error || 'Es ist ein Fehler aufgetreten. Bitte erneut versuchen.');
      error.status = response.status;
      throw error;
    }
    return data;
  }

  var logoutBtn = $('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async function () {
      try { await api('POST', '/admin/api/logout'); } catch (e) { /* trotzdem zur Anmeldung */ }
      location.href = '/admin/login';
    });
  }


  /* ── 2. ANMELDUNG ── */

  var loginForm = $('loginForm');
  if (loginForm) {
    var loginError = $('loginError');
    loginForm.addEventListener('submit', async function (event) {
      event.preventDefault();
      var button = loginForm.querySelector('button[type="submit"]');
      button.disabled = true;
      loginError.hidden = true;
      try {
        await api('POST', '/admin/api/login', { password: $('password').value });
        location.href = '/admin';
      } catch (error) {
        loginError.textContent = error.message;
        loginError.hidden = false;
        button.disabled = false;
        $('password').select();
      }
    });
  }


  /* ── 3. ARTIKELLISTE ── */

  document.querySelectorAll('[data-delete]').forEach(function (button) {
    button.addEventListener('click', async function () {
      if (!confirm('„' + button.dataset.title + '“ endgültig löschen?\n\nDas lässt sich nicht rückgängig machen.')) return;
      try {
        await api('DELETE', '/admin/api/posts/' + button.dataset.delete);
        location.reload();
      } catch (error) {
        toast(error.message, { error: true });
      }
    });
  });


  /* ── 4. EDITOR ── */

  var content = $('fContent');
  if (!content) return;

  var data = JSON.parse($('adminData').textContent);
  var post = data.post;                 // null bei einem neuen Artikel
  var dirty = false;
  var saving = false;

  var fTitle = $('fTitle');
  var fExcerpt = $('fExcerpt');
  var fCategory = $('fCategory');
  var fAuthor = $('fAuthor');
  var fSlug = $('fSlug');
  var fPublishedAt = $('fPublishedAt');
  var fCoverAlt = $('fCoverAlt');
  var saveState = $('saveState');
  var draftBtn = $('draftBtn');
  var publishBtn = $('publishBtn');
  var previewBtn = $('previewBtn');
  var coverUrl = post ? post.cover_image : '';


  /* 4.1 Felder & Zustand */

  function slugify(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
      .replace(/€/g, ' euro ').replace(/%/g, ' prozent ').replace(/&/g, ' und ')
      .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
      .replace(/(\d)\.(?=\d{3}(\D|$))/g, '$1')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80)
      .replace(/-+$/g, '');
  }

  /* Datum ↔ Eingabefeld (das Feld rechnet in der Ortszeit des Browsers) */
  function toLocalInput(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    var pad = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function fromLocalInput(value) {
    if (!value) return null;
    var d = new Date(value);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }

  function isLive() {
    return Boolean(post && post.status === 'published');
  }
  function plannedDate() {
    var iso = fromLocalInput(fPublishedAt.value);
    return iso && new Date(iso) > new Date() ? new Date(iso) : null;
  }

  function refreshState() {
    var badge = $('stateBadge');
    var planned = plannedDate();
    var key = !isLive() ? 'draft' : planned ? 'planned' : 'live';
    badge.className = 'adm-badge adm-badge--' + key;
    badge.textContent = key === 'draft' ? 'Entwurf'
      : key === 'live' ? 'Veröffentlicht'
      : 'Geplant für ' + planned.toLocaleString('de-DE', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' Uhr';

    draftBtn.textContent = isLive() ? 'Zurück in Entwurf' : 'Als Entwurf speichern';
    publishBtn.textContent = isLive() ? 'Änderungen speichern' : planned ? 'Planen' : 'Veröffentlichen';
    $('slugHint').textContent = isLive()
      ? 'Achtung: Wird die Adresse eines veröffentlichten Artikels geändert, funktionieren bereits geteilte Links nicht mehr.'
      : 'Wird aus dem Titel gebildet und kann angepasst werden.';
  }

  function markDirty() {
    if (dirty) return;
    dirty = true;
    saveState.textContent = 'Ungespeicherte Änderungen';
    saveState.classList.add('is-dirty');
  }
  function markSaved() {
    dirty = false;
    saveState.classList.remove('is-dirty');
    saveState.textContent = 'Gespeichert um ' + new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr';
  }

  function fitTitle() {
    fTitle.style.height = 'auto';
    fTitle.style.height = fTitle.scrollHeight + 'px';
  }

  function refreshEmpty() {
    var empty = !content.textContent.trim() && !content.querySelector('img, table, hr, li');
    content.classList.toggle('is-empty', empty);
  }

  /* Die Werkzeugleiste klebt direkt unter der Kopfleiste — deren Höhe hängt
     von der Bildschirmbreite ab und wird deshalb gemessen. */
  var topBar = document.querySelector('.adm-top');
  function measureTop() {
    document.documentElement.style.setProperty('--top-h', topBar.offsetHeight + 'px');
  }
  measureTop();
  window.addEventListener('resize', measureTop);

  // Startwerte
  content.innerHTML = post && post.content_html ? post.content_html : '<p><br></p>';
  fPublishedAt.value = post ? toLocalInput(post.published_at) : '';
  var slugEdited = Boolean(post);
  try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch (e) { /* nicht überall verfügbar */ }
  fitTitle();
  refreshEmpty();
  refreshState();
  updateExcerptCount();
  showCover();
  window.addEventListener('resize', fitTitle);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitTitle);

  fTitle.addEventListener('input', function () {
    fTitle.value = fTitle.value.replace(/\n/g, ' ');
    fitTitle();
    if (!slugEdited) fSlug.value = slugify(fTitle.value);
    markDirty();
  });
  fTitle.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') { event.preventDefault(); content.focus(); }
  });
  fSlug.addEventListener('input', function () { slugEdited = true; markDirty(); });
  fSlug.addEventListener('blur', function () { fSlug.value = slugify(fSlug.value || fTitle.value); });

  function updateExcerptCount() { $('excerptCount').textContent = fExcerpt.value.length; }
  fExcerpt.addEventListener('input', function () { updateExcerptCount(); markDirty(); });
  [fCategory, fAuthor, fCoverAlt].forEach(function (el) { el.addEventListener('input', markDirty); });
  fPublishedAt.addEventListener('input', function () { markDirty(); refreshState(); });
  content.addEventListener('input', function () { refreshEmpty(); markDirty(); });

  window.addEventListener('beforeunload', function (event) {
    if (dirty) { event.preventDefault(); event.returnValue = ''; }
  });


  /* 4.2 Werkzeugleiste */

  var toolbar = $('toolbar');
  var savedRange = null;

  function exec(command, value) {
    content.focus();
    document.execCommand(command, false, value === undefined ? null : value);
  }

  function selectionNode() {
    var selection = window.getSelection();
    if (!selection.rangeCount) return null;
    var node = selection.anchorNode;
    if (!node || !content.contains(node)) return null;
    return node.nodeType === 1 ? node : node.parentElement;
  }
  function closest(selector) {
    var node = selectionNode();
    var match = node && node.closest(selector);
    return match && content.contains(match) && match !== content ? match : null;
  }

  function saveSelection() {
    var selection = window.getSelection();
    savedRange = selection.rangeCount && content.contains(selection.anchorNode) ? selection.getRangeAt(0).cloneRange() : null;
  }
  function restoreSelection() {
    content.focus();
    if (!savedRange) return;
    var selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(savedRange);
  }

  /* Setzt den Absatztyp; ein zweiter Klick auf denselben Typ macht wieder normalen Text. */
  function setBlock(tag) {
    var quote = closest('blockquote');
    if (tag === 'blockquote' && quote) {
      exec('formatBlock', 'p');
      // Manche Browser lassen die Hülle stehen — dann von Hand auspacken.
      quote = closest('blockquote');
      if (quote) {
        while (quote.firstChild) quote.parentNode.insertBefore(quote.firstChild, quote);
        quote.remove();
      }
      return;
    }
    var current = closest('h2, h3, blockquote, p');
    var same = current && current.tagName.toLowerCase() === tag;
    exec('formatBlock', same && tag !== 'p' ? 'p' : tag);
  }

  function insertHtml(html) {
    exec('insertHTML', html);
  }

  /* Browser verschachteln beim Formatieren gern Blöcke in Absätze (<p><ul>…).
     Solche Hüllen werden aufgelöst, damit sich der Text danach normal weiterschreiben lässt. */
  var BLOCK_CHILD = 'ul, ol, blockquote, table, h2, h3, p, figure, hr';
  function tidyStructure() {
    content.querySelectorAll('p').forEach(function (p) {
      if (!p.querySelector(BLOCK_CHILD)) return;
      var parent = p.parentNode;
      var run = null;   // sammelt losen Text zwischen den Blöcken in einen eigenen Absatz
      while (p.firstChild) {
        var child = p.firstChild;
        var isBlock = child.nodeType === 1 && child.matches(BLOCK_CHILD);
        if (isBlock) {
          run = null;
          parent.insertBefore(child, p);
        } else if (child.nodeType === 3 && !child.nodeValue.trim() && !run) {
          p.removeChild(child);
        } else {
          if (!run) { run = document.createElement('p'); parent.insertBefore(run, p); }
          run.appendChild(child);
        }
      }
      p.remove();
    });
    if (!content.firstChild) content.innerHTML = '<p><br></p>';
  }

  var COMMANDS = {
    p: function () { setBlock('p'); },
    h2: function () { setBlock('h2'); },
    h3: function () { setBlock('h3'); },
    quote: function () { setBlock('blockquote'); },
    bold: function () { exec('bold'); },
    italic: function () { exec('italic'); },
    ul: function () { exec('insertUnorderedList'); },
    ol: function () { exec('insertOrderedList'); },
    hr: function () { insertHtml('<hr><p><br></p>'); },
    undo: function () { exec('undo'); },
    redo: function () { exec('redo'); },
    clear: function () { exec('removeFormat'); exec('unlink'); },
    link: openLinkDialog,
    image: function () { saveSelection(); $('inlineImageInput').click(); },
    table: insertTable,
  };

  // mousedown statt click: so bleibt die Markierung im Text erhalten.
  toolbar.addEventListener('mousedown', function (event) {
    if (event.target.closest('.adm-tool')) event.preventDefault();
  });
  toolbar.addEventListener('click', function (event) {
    var button = event.target.closest('.adm-tool');
    if (!button) return;
    COMMANDS[button.dataset.cmd]();
    tidyStructure();
    refreshEmpty();
    refreshToolbar();
    markDirty();
  });

  function refreshToolbar() {
    var block = closest('h2, h3, blockquote, li, p');
    var blockTag = block ? block.tagName.toLowerCase() : 'p';
    var inQuote = Boolean(closest('blockquote'));
    var active = {
      p: !inQuote && (blockTag === 'p'),
      h2: blockTag === 'h2',
      h3: blockTag === 'h3',
      quote: inQuote,
      link: Boolean(closest('a')),
      ul: Boolean(closest('ul')),
      ol: Boolean(closest('ol')),
    };
    try {
      active.bold = document.queryCommandState('bold');
      active.italic = document.queryCommandState('italic');
    } catch (e) { /* ohne Markierung */ }
    toolbar.querySelectorAll('.adm-tool').forEach(function (button) {
      button.classList.toggle('is-active', Boolean(active[button.dataset.cmd]) && Boolean(selectionNode()));
    });
  }
  document.addEventListener('selectionchange', refreshToolbar);

  content.addEventListener('keydown', function (event) {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      openLinkDialog();
    }
  });

  /* Link-Dialog */
  var linkDialog = $('linkDialog');
  var linkUrl = $('linkUrl');
  var editedLink = null;

  function normalizeUrl(value) {
    var url = value.trim();
    if (!url) return '';
    if (/^(https?:\/\/|mailto:|tel:|\/|#)/i.test(url)) return url;
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(url)) return 'mailto:' + url;
    return 'https://' + url;
  }

  function openLinkDialog() {
    saveSelection();
    editedLink = closest('a');
    linkUrl.value = editedLink ? editedLink.getAttribute('href') : '';
    $('linkRemove').hidden = !editedLink;
    linkDialog.showModal();
    linkUrl.focus();
    linkUrl.select();
  }

  $('linkForm').addEventListener('submit', function (event) {
    event.preventDefault();
    var url = normalizeUrl(linkUrl.value);
    linkDialog.close();
    restoreSelection();
    if (!url) return;
    if (editedLink) {
      editedLink.setAttribute('href', url);
    } else if (window.getSelection().isCollapsed) {
      var a = document.createElement('a');
      a.href = url;
      a.textContent = url.replace(/^(https?:\/\/|mailto:|tel:)/i, '');
      insertHtml(a.outerHTML);
    } else {
      exec('createLink', url);
    }
    markDirty();
  });
  $('linkCancel').addEventListener('click', function () { linkDialog.close(); restoreSelection(); });
  $('linkRemove').addEventListener('click', function () {
    linkDialog.close();
    restoreSelection();
    if (editedLink) {
      var range = document.createRange();
      range.selectNodeContents(editedLink);
      var selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      exec('unlink');
      markDirty();
    }
  });

  function insertTable() {
    var answer = prompt('Größe der Tabelle als Spalten x Zeilen (ohne Kopfzeile), z. B. 3x4', '3x3');
    if (answer === null) return;
    var match = /^\s*(\d+)\s*[x×*]\s*(\d+)\s*$/i.exec(answer);
    var cols = match ? Math.min(6, Math.max(1, Number(match[1]))) : 3;
    var rows = match ? Math.min(30, Math.max(1, Number(match[2]))) : 3;
    var head = '<tr>' + Array(cols).fill('<th>Spalte</th>').join('') + '</tr>';
    var row = '<tr>' + Array(cols).fill('<td><br></td>').join('') + '</tr>';
    insertHtml('<table><thead>' + head + '</thead><tbody>' + Array(rows).fill(row).join('') + '</tbody></table><p><br></p>');
  }


  /* 4.3 Einfügen (Word, Google Docs, Webseiten)
     Übernommen werden nur Struktur und Auszeichnung — Schriftarten, Farben und
     Abstände der Quelle bleiben draußen, damit jeder Artikel gleich aussieht. */

  var KEEP = { P: 'p', H1: 'h2', H2: 'h2', H3: 'h3', H4: 'h3', H5: 'h3', H6: 'h3', UL: 'ul', OL: 'ol', LI: 'li',
    BLOCKQUOTE: 'blockquote', BR: 'br', HR: 'hr', A: 'a', STRONG: 'strong', EM: 'em', B: 'strong', I: 'em',
    TABLE: 'table', THEAD: 'thead', TBODY: 'tbody', TR: 'tr', TH: 'th', TD: 'td', SUP: 'sup', SUB: 'sub', DIV: 'p' };
  var DROP = { SCRIPT: 1, STYLE: 1, META: 1, LINK: 1, TITLE: 1, HEAD: 1, IMG: 1, SVG: 1, IFRAME: 1, OBJECT: 1, BUTTON: 1, INPUT: 1 };
  var BLOCKS = /^(p|h2|h3|ul|ol|blockquote|table|hr)$/;

  function cleanNode(node, out) {
    node.childNodes.forEach(function (child) {
      if (child.nodeType === 3) {
        out.appendChild(document.createTextNode(child.nodeValue.replace(/\u00a0/g, ' ')));
        return;
      }
      if (child.nodeType !== 1 || DROP[child.tagName]) return;

      var tag = KEEP[child.tagName];
      var style = child.getAttribute('style') || '';
      var weight = /font-weight:\s*(bold|[6-9]00)/i.test(style);
      var normalWeight = /font-weight:\s*(normal|[1-4]00)/i.test(style);
      var italic = /font-style:\s*italic/i.test(style);

      // Google Docs packt alles in <b style="font-weight:normal"> — das ist kein Fettdruck.
      if (tag === 'strong' && normalWeight) tag = null;
      if (child.tagName === 'SPAN' && weight) tag = 'strong';
      if (child.tagName === 'SPAN' && !weight && italic) tag = 'em';
      // Ein <div>, das selbst Absätze enthält, ist nur eine Hülle.
      if (child.tagName === 'DIV' && child.querySelector('p, div, h1, h2, h3, h4, ul, ol, table, blockquote')) tag = null;

      if (!tag) { cleanNode(child, out); return; }
      var el = document.createElement(tag);
      if (tag === 'a') {
        var href = child.getAttribute('href') || '';
        if (!/^(https?:|mailto:|tel:|\/)/i.test(href)) { cleanNode(child, out); return; }
        el.setAttribute('href', href);
      }
      cleanNode(child, el);
      if (tag === 'strong' && italic && child.tagName === 'SPAN') {
        var em = document.createElement('em');
        while (el.firstChild) em.appendChild(el.firstChild);
        el.appendChild(em);
      }
      out.appendChild(el);
    });
  }

  function cleanPastedHtml(html) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var out = document.createElement('div');
    cleanNode(doc.body, out);
    // Leere Hüllen entfernen, die beim Aufräumen übrig bleiben.
    out.querySelectorAll('p, h2, h3, li, strong, em, a, blockquote').forEach(function (el) {
      if (!el.textContent.trim() && !el.querySelector('br, hr')) el.remove();
    });
    var hasBlock = Array.prototype.some.call(out.children, function (el) { return BLOCKS.test(el.tagName.toLowerCase()); });
    return { html: out.innerHTML, hasBlock: hasBlock };
  }

  function escapeHtml(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  content.addEventListener('paste', function (event) {
    var clipboard = event.clipboardData;
    if (!clipboard) return;
    event.preventDefault();

    var html = clipboard.getData('text/html');
    var text = clipboard.getData('text/plain');
    var file = Array.prototype.find.call(clipboard.files || [], function (f) { return /^image\/(jpeg|png|webp)$/.test(f.type); });

    if (file && !text) {
      saveSelection();
      insertInlineImage(file);
      return;
    }
    if (html) {
      var cleaned = cleanPastedHtml(html);
      if (cleaned.html.trim()) {
        insertHtml(cleaned.html);
        tidyStructure();
        if (/<img/i.test(html)) toast('Bilder aus der Zwischenablage wurden nicht übernommen. Bitte über das Bild-Symbol einfügen.');
        return;
      }
    }
    if (!text) return;
    var paragraphs = text.split(/\n\s*\n/).map(function (p) { return p.trim(); }).filter(Boolean);
    if (paragraphs.length > 1) {
      insertHtml(paragraphs.map(function (p) { return '<p>' + escapeHtml(p).replace(/\n/g, '<br>') + '</p>'; }).join(''));
    } else {
      exec('insertText', text.trim());
    }
  });

  // Dateien, die ins Textfeld gezogen werden, würden sonst die Seite ersetzen.
  content.addEventListener('drop', function (event) {
    var file = event.dataTransfer && Array.prototype.find.call(event.dataTransfer.files || [], function (f) { return /^image\//.test(f.type); });
    if (!event.dataTransfer || !event.dataTransfer.files.length) return;
    event.preventDefault();
    if (file) { saveSelection(); insertInlineImage(file); }
  });


  /* 4.4 Bilder
     Fotos werden vor dem Hochladen im Browser verkleinert (längste Seite
     höchstens 1800 px) und als WebP gespeichert — so bleiben die Seiten schnell. */

  var MAX_SIDE = 1800;

  function loadImage(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('Das Bild konnte nicht gelesen werden.')); };
      img.src = url;
    });
  }
  function canvasBlob(canvas, type, quality) {
    return new Promise(function (resolve) { canvas.toBlob(resolve, type, quality); });
  }

  async function prepareImage(file) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('Bitte ein Bild im Format JPG, PNG oder WebP wählen.');
    var img = await loadImage(file);
    var scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    var width = Math.max(1, Math.round(img.naturalWidth * scale));
    var height = Math.max(1, Math.round(img.naturalHeight * scale));

    var canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);
    var blob = await canvasBlob(canvas, 'image/webp', 0.84);
    if (!blob || blob.type !== 'image/webp') {
      // Browser ohne WebP-Ausgabe: JPEG mit weißem Grund statt schwarzer Transparenz.
      ctx.globalCompositeOperation = 'destination-over';
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      blob = await canvasBlob(canvas, 'image/jpeg', 0.86);
    }
    if (!blob) throw new Error('Das Bild konnte nicht verarbeitet werden.');
    // Ist das Original schon klein und passend, wird es unverändert übernommen.
    if (scale === 1 && file.size <= blob.size && file.type !== 'image/png') blob = file;
    return { blob: blob, width: width, height: height };
  }

  async function uploadImage(file) {
    var prepared = await prepareImage(file);
    var result = await api('POST', '/admin/api/images', prepared.blob);
    return { url: result.url, width: prepared.width, height: prepared.height };
  }

  /* Bild im Text */
  async function insertInlineImage(file) {
    content.classList.add('is-uploading');
    try {
      var image = await uploadImage(file);
      var alt = prompt('Kurze Beschreibung des Bildes (für Suchmaschinen und Screenreader):', '') || '';
      var caption = prompt('Bildunterschrift unter dem Bild (optional):', '') || '';
      restoreSelection();
      var figure = document.createElement('figure');
      var img = document.createElement('img');
      img.src = image.url;
      img.alt = alt;
      img.width = image.width;
      img.height = image.height;
      figure.appendChild(img);
      if (caption) {
        var figcaption = document.createElement('figcaption');
        figcaption.textContent = caption;
        figure.appendChild(figcaption);
      }
      insertHtml(figure.outerHTML + '<p><br></p>');
      refreshEmpty();
      markDirty();
    } catch (error) {
      toast(error.message, { error: true });
    } finally {
      content.classList.remove('is-uploading');
    }
  }
  $('inlineImageInput').addEventListener('change', function () {
    var file = this.files[0];
    this.value = '';
    if (file) insertInlineImage(file);
  });

  /* Titelbild */
  var coverBox = $('coverBox');
  var coverInput = $('coverInput');

  function showCover() {
    var preview = $('coverPreview');
    preview.hidden = !coverUrl;
    if (coverUrl) preview.src = coverUrl;
    $('coverBox').classList.toggle('has-image', Boolean(coverUrl));
    $('coverActions').hidden = !coverUrl;
  }

  async function setCover(file) {
    coverBox.classList.add('is-busy');
    try {
      coverUrl = (await uploadImage(file)).url;
      showCover();
      markDirty();
    } catch (error) {
      toast(error.message, { error: true });
    } finally {
      coverBox.classList.remove('is-busy');
    }
  }

  $('coverPick').addEventListener('click', function () { coverInput.click(); });
  $('coverReplace').addEventListener('click', function () { coverInput.click(); });
  $('coverRemove').addEventListener('click', function () { coverUrl = ''; showCover(); markDirty(); });
  coverInput.addEventListener('change', function () {
    var file = this.files[0];
    this.value = '';
    if (file) setCover(file);
  });
  ['dragenter', 'dragover'].forEach(function (name) {
    coverBox.addEventListener(name, function (event) { event.preventDefault(); coverBox.classList.add('is-drag'); });
  });
  ['dragleave', 'drop'].forEach(function (name) {
    coverBox.addEventListener(name, function (event) { event.preventDefault(); coverBox.classList.remove('is-drag'); });
  });
  coverBox.addEventListener('drop', function (event) {
    var file = event.dataTransfer && event.dataTransfer.files[0];
    if (file) setCover(file);
  });


  /* 4.5 Speichern & Veröffentlichen */

  function setBusy(busy) {
    saving = busy;
    [draftBtn, publishBtn, previewBtn].forEach(function (button) { button.disabled = busy; });
    if (busy) {
      saveState.classList.remove('is-dirty');
      saveState.textContent = 'Speichert …';
    }
  }

  /* Speichert den Artikel mit dem gewünschten Status. Gibt true zurück, wenn es geklappt hat. */
  async function save(status) {
    if (saving) return false;
    if (!fTitle.value.trim()) {
      toast('Bitte zuerst einen Titel eingeben.', { error: true });
      fTitle.focus();
      return false;
    }
    var payload = {
      title: fTitle.value,
      slug: fSlug.value || fTitle.value,
      excerpt: fExcerpt.value,
      content_html: content.innerHTML,
      category: fCategory.value,
      author: fAuthor.value,
      cover_image: coverUrl,
      cover_alt: fCoverAlt.value,
      status: status,
      published_at: fromLocalInput(fPublishedAt.value),
    };
    setBusy(true);
    try {
      var result = post
        ? await api('PUT', '/admin/api/posts/' + post.id, payload)
        : await api('POST', '/admin/api/posts', payload);
      var wasNew = !post;
      post = result.post;
      fSlug.value = post.slug;
      slugEdited = true;
      fPublishedAt.value = toLocalInput(post.published_at);
      if (wasNew) history.replaceState(null, '', '/admin/artikel/' + post.id);
      document.title = post.title + ' – Redaktion Wiesel Capital';
      markSaved();
      refreshState();
      return true;
    } catch (error) {
      saveState.textContent = 'Nicht gespeichert';
      saveState.classList.add('is-dirty');
      toast(error.status === 401
        ? 'Die Sitzung ist abgelaufen. Bitte in einem neuen Tab unter /admin anmelden und danach hier erneut speichern — der Text bleibt erhalten.'
        : error.message, { error: true });
      return false;
    } finally {
      setBusy(false);
    }
  }

  draftBtn.addEventListener('click', async function () {
    var wasLive = isLive();
    if (wasLive && !confirm('Der Artikel verschwindet damit von der Website, bis er wieder veröffentlicht wird. Fortfahren?')) return;
    if (await save('draft')) toast(wasLive ? 'Der Artikel ist wieder ein Entwurf und nicht mehr öffentlich.' : 'Entwurf gespeichert.');
  });

  publishBtn.addEventListener('click', async function () {
    var wasLive = isLive();
    if (!(await save('published'))) return;
    var planned = plannedDate();
    if (planned) {
      toast('Geplant: Der Artikel erscheint automatisch am ' + planned.toLocaleString('de-DE', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) + ' Uhr.');
    } else {
      toast(wasLive ? 'Änderungen sind online.' : 'Der Artikel ist jetzt online.', { link: { href: '/blog/' + post.slug, label: 'Ansehen' } });
    }
  });

  previewBtn.addEventListener('click', async function () {
    if (dirty && isLive() && !confirm('Für die Vorschau werden die Änderungen gespeichert — bei einem veröffentlichten Artikel sind sie damit sofort online. Fortfahren?')) return;
    // Das Fenster sofort öffnen (sonst blockiert der Browser es), Adresse nach dem Speichern setzen.
    var tab = window.open('', '_blank');
    var ok = (!dirty && post) || await save(isLive() ? 'published' : 'draft');
    if (!ok) { if (tab) tab.close(); return; }
    var url = '/blog/' + post.slug + '?vorschau';
    if (tab) tab.location = url; else location.href = url;
  });

  document.addEventListener('keydown', function (event) {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      save(isLive() ? 'published' : 'draft').then(function (ok) { if (ok) toast('Gespeichert.'); });
    }
  });

  var deleteBtn = $('deleteBtn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async function () {
      if (!confirm('Diesen Artikel endgültig löschen?\n\nDas lässt sich nicht rückgängig machen.')) return;
      try {
        await api('DELETE', '/admin/api/posts/' + post.id);
        dirty = false;
        location.href = '/admin';
      } catch (error) {
        toast(error.message, { error: true });
      }
    });
  }

})();
