/* ============================================================
   WIESEL CAPITAL — Ansichten der Redaktion (/admin)
   ============================================================
   Gestaltung: server/admin-assets/admin.css
   Verhalten:  server/admin-assets/admin.js
   ============================================================ */

import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_AUTHOR } from '../config.js';
import { esc, jsonForScript, formatDate, assetUrl } from '../util.js';

const FONTS = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,600&display=swap';

function adminAsset(name) {
  let v = '1';
  try {
    v = Math.round(fs.statSync(path.join(import.meta.dirname, '..', 'admin-assets', name)).mtimeMs / 1000).toString(36);
  } catch { /* Datei fehlt — Standardwert reicht */ }
  return `/admin/assets/${name}?v=${v}`;
}

function shell({ title, bodyClass = '', body, data = null, withArticleStyles = false }) {
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${esc(title)} – Redaktion Wiesel Capital</title>
  <meta name="robots" content="noindex, nofollow"/>
  <link rel="icon" type="image/png" href="/Fotos%20Webseite/Gemini_Generated_Image_eu28dkeu28dkeu28.png"/>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link href="${FONTS}" rel="stylesheet"/>
  <link rel="stylesheet" href="${adminAsset('admin.css')}"/>
${withArticleStyles ? `  <link rel="stylesheet" href="${assetUrl('css/blog.css')}"/>\n` : ''}</head>
<body class="${esc(bodyClass)}">
${body}
<div class="adm-toast" id="toast" role="status" aria-live="polite"></div>
${data ? `<script type="application/json" id="adminData">${jsonForScript(data)}</script>\n` : ''}<script src="${adminAsset('admin.js')}" defer></script>
</body>
</html>
`;
}

const topbar = ({ left, right }) => `
<header class="adm-top">
  <div class="adm-top-inner">
    <div class="adm-top-left">${left}</div>
    <div class="adm-top-right">${right}</div>
  </div>
</header>`;

const BRAND = `<a class="adm-brand" href="/admin"><img src="/logo-wiesel-capital-white.png" alt="Wiesel Capital"/><span>Redaktion</span></a>`;


/* ── Anmeldung ── */

export function loginPage({ configured }) {
  return shell({
    title: 'Anmelden',
    bodyClass: 'adm-page-login',
    body: `
<main class="adm-login">
  <form class="adm-login-card" id="loginForm" novalidate>
    <img class="adm-login-logo" src="/logo-wiesel-capital.png" alt="Wiesel Capital"/>
    <h1>Redaktion</h1>
    <p class="adm-login-sub">Hier werden die Blog-Artikel geschrieben und veröffentlicht.</p>
    ${configured ? '' : `<p class="adm-note adm-note--warn">Auf dem Server ist noch kein Passwort hinterlegt. In Railway die Variable <code>ADMIN_PASSWORD</code> setzen, dann ist die Anmeldung möglich.</p>`}
    <label class="adm-label" for="password">Passwort</label>
    <input class="adm-input" type="password" id="password" name="password" autocomplete="current-password" required autofocus/>
    <p class="adm-error" id="loginError" role="alert" hidden></p>
    <button class="adm-btn adm-btn--primary adm-btn--block" type="submit">Anmelden</button>
    <a class="adm-login-back" href="/">Zur Website</a>
  </form>
</main>`,
  });
}


/* ── Artikelliste ── */

const dateTime = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' });

export function postState(post) {
  if (post.status !== 'published') return { key: 'draft', label: 'Entwurf' };
  if (post.published_at && new Date(post.published_at) > new Date()) {
    return { key: 'planned', label: `Geplant für ${dateTime.format(new Date(post.published_at))} Uhr` };
  }
  return { key: 'live', label: 'Veröffentlicht' };
}

export function dashboardPage({ posts }) {
  const states = posts.map(postState);
  const count = key => states.filter(s => s.key === key).length;
  const summary = posts.length === 0 ? 'Noch keine Artikel' : [
    `${posts.length} ${posts.length === 1 ? 'Artikel' : 'Artikel'}`,
    count('live') ? `${count('live')} veröffentlicht` : '',
    count('planned') ? `${count('planned')} geplant` : '',
    count('draft') ? `${count('draft')} ${count('draft') === 1 ? 'Entwurf' : 'Entwürfe'}` : '',
  ].filter(Boolean).join(' · ');

  const items = posts.map((post, i) => {
    const state = states[i];
    const date = state.key === 'live' ? formatDate(post.published_at) : state.key === 'draft' ? `zuletzt bearbeitet am ${formatDate(post.updated_at)}` : '';
    return `
      <li class="adm-item">
        <a class="adm-item-thumb" href="/admin/artikel/${post.id}" tabindex="-1" aria-hidden="true">${post.cover_image ? `<img src="${esc(post.cover_image)}" alt="" loading="lazy"/>` : ''}</a>
        <div class="adm-item-main">
          <a class="adm-item-title" href="/admin/artikel/${post.id}">${esc(post.title)}</a>
          <div class="adm-item-meta">
            <span class="adm-badge adm-badge--${state.key}">${esc(state.label)}</span>
            ${date ? `<span>${esc(date)}</span>` : ''}
            ${post.category ? `<span>${esc(post.category)}</span>` : ''}
          </div>
        </div>
        <div class="adm-item-actions">
          <a class="adm-link" href="/admin/artikel/${post.id}">Bearbeiten</a>
          <a class="adm-link" href="/blog/${esc(post.slug)}${state.key === 'live' ? '' : '?vorschau'}" target="_blank" rel="noopener">${state.key === 'live' ? 'Ansehen' : 'Vorschau'}</a>
          <button class="adm-link adm-link--danger" type="button" data-delete="${post.id}" data-title="${esc(post.title)}">Löschen</button>
        </div>
      </li>`;
  }).join('');

  return shell({
    title: 'Artikel',
    bodyClass: 'adm-page-list',
    body: `${topbar({
      left: BRAND,
      right: `<a class="adm-top-link" href="/blog" target="_blank" rel="noopener">Blog ansehen</a><button class="adm-top-link" type="button" id="logoutBtn">Abmelden</button>`,
    })}
<main class="adm-main">
  <div class="adm-head">
    <div>
      <h1>Artikel</h1>
      <p class="adm-head-sub">${esc(summary)}</p>
    </div>
    <a class="adm-btn adm-btn--primary" href="/admin/artikel/neu">Neuer Artikel</a>
  </div>
  ${posts.length ? `<ul class="adm-list">${items}
  </ul>` : `
  <div class="adm-empty">
    <h2>Noch kein Artikel vorhanden</h2>
    <p>Mit „Neuer Artikel“ entsteht der erste Beitrag. Er bleibt ein Entwurf, bis er veröffentlicht wird.</p>
    <a class="adm-btn adm-btn--primary" href="/admin/artikel/neu">Neuer Artikel</a>
  </div>`}
</main>`,
  });
}


/* ── Editor ── */

const TOOL_ICONS = {
  bold: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 5h6a3.5 3.5 0 010 7H7zM7 12h7a3.5 3.5 0 010 7H7z"/></svg>',
  italic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 5h7M7 19h7M14 5l-4 14"/></svg>',
  link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 007.07 0l2.83-2.83a5 5 0 00-7.07-7.07L11.5 4.43"/><path d="M14 11a5 5 0 00-7.07 0L4.1 13.83a5 5 0 007.07 7.07l1.33-1.33"/></svg>',
  ul: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1" fill="currentColor"/><circle cx="4.5" cy="12" r="1" fill="currentColor"/><circle cx="4.5" cy="18" r="1" fill="currentColor"/></svg>',
  ol: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 6h10M10 12h10M10 18h10M4 4.5l1.5-.5v4M4 16.2c.4-.5 2.3-.6 2.3.6 0 .9-1.6 1.5-2.3 2.7h2.5"/></svg>',
  quote: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 17.5V13c0-3.6 1.9-6.3 5.2-7.5l.7 1.6C8 8 7.1 9.3 7 11h3v6.5H4zm10 0V13c0-3.6 1.9-6.3 5.2-7.5l.7 1.6C18 8 17.1 9.3 17 11h3v6.5h-6z"/></svg>',
  image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="8.5" cy="9.5" r="1.6"/><path d="M21 16l-5.2-5.2a1 1 0 00-1.4 0L5 20"/></svg>',
  table: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M9.5 4v16M15 4v16"/></svg>',
  hr: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 12h16"/><path d="M8 6h8M8 18h8" opacity=".35"/></svg>',
  clear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 5h12M12 5v6M9 19h6M4 4l16 16"/></svg>',
  undo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 010 12h-3"/></svg>',
  redo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14l5-5-5-5"/><path d="M20 9H10a6 6 0 000 12h3"/></svg>',
};

const tool = (cmd, label, content, extra = '') => `<button type="button" class="adm-tool${extra}" data-cmd="${cmd}" title="${label}" aria-label="${label}">${content}</button>`;

const TOOLBAR = `
      <div class="adm-toolbar" id="toolbar" role="toolbar" aria-label="Formatierung">
        <div class="adm-tool-group">
          ${tool('p', 'Normaler Absatz', 'Text', ' adm-tool--text')}
          ${tool('h2', 'Überschrift', 'Überschrift', ' adm-tool--text')}
          ${tool('h3', 'Zwischenüberschrift', 'Zwischen&shy;überschrift', ' adm-tool--text')}
        </div>
        <div class="adm-tool-group">
          ${tool('bold', 'Fett (Strg/Cmd + B)', TOOL_ICONS.bold)}
          ${tool('italic', 'Kursiv (Strg/Cmd + I)', TOOL_ICONS.italic)}
          ${tool('link', 'Link einfügen oder ändern (Strg/Cmd + K)', TOOL_ICONS.link)}
        </div>
        <div class="adm-tool-group">
          ${tool('ul', 'Aufzählung', TOOL_ICONS.ul)}
          ${tool('ol', 'Nummerierte Liste', TOOL_ICONS.ol)}
          ${tool('quote', 'Zitat / Hervorhebung', TOOL_ICONS.quote)}
        </div>
        <div class="adm-tool-group">
          ${tool('image', 'Bild einfügen', TOOL_ICONS.image)}
          ${tool('table', 'Tabelle einfügen', TOOL_ICONS.table)}
          ${tool('hr', 'Trennlinie', TOOL_ICONS.hr)}
        </div>
        <div class="adm-tool-group">
          ${tool('clear', 'Formatierung entfernen', TOOL_ICONS.clear)}
          ${tool('undo', 'Rückgängig', TOOL_ICONS.undo)}
          ${tool('redo', 'Wiederholen', TOOL_ICONS.redo)}
        </div>
      </div>`;

export function editorPage({ post, categories }) {
  const isNew = !post;
  const state = post ? postState(post) : { key: 'draft', label: 'Entwurf' };
  const data = {
    post: post ? {
      id: post.id,
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      content_html: post.content_html,
      category: post.category,
      author: post.author,
      cover_image: post.cover_image,
      cover_alt: post.cover_alt,
      status: post.status,
      published_at: post.published_at ? new Date(post.published_at).toISOString() : null,
    } : null,
    defaultAuthor: DEFAULT_AUTHOR,
  };

  return shell({
    title: isNew ? 'Neuer Artikel' : post.title,
    bodyClass: 'adm-page-editor',
    withArticleStyles: true,
    data,
    body: `${topbar({
      left: `<a class="adm-back" href="/admin"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg><span>Alle Artikel</span></a>
      <span class="adm-save-state" id="saveState" role="status" aria-live="polite"></span>`,
      right: `<button class="adm-btn adm-btn--ghost" type="button" id="previewBtn">Vorschau</button>
      <button class="adm-btn adm-btn--ghost" type="button" id="draftBtn">Als Entwurf speichern</button>
      <button class="adm-btn adm-btn--primary" type="button" id="publishBtn">Veröffentlichen</button>`,
    })}
<main class="adm-editor">
  <section class="adm-editor-main">
    <label class="adm-sr" for="fTitle">Titel</label>
    <textarea class="adm-title" id="fTitle" rows="1" maxlength="160" placeholder="Titel des Artikels">${esc(post?.title || '')}</textarea>
    <div class="adm-content-card">${TOOLBAR}
      <div class="post-body adm-content" id="fContent" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Artikeltext" data-placeholder="Hier den Artikel schreiben oder einfügen …"></div>
    </div>
    <input type="file" id="inlineImageInput" accept="image/jpeg,image/png,image/webp" hidden/>
  </section>

  <aside class="adm-editor-side">
    <section class="adm-card">
      <h2>Veröffentlichung</h2>
      <p class="adm-status-line"><span class="adm-badge adm-badge--${state.key}" id="stateBadge">${esc(state.label)}</span></p>
      <label class="adm-label" for="fPublishedAt">Datum und Uhrzeit</label>
      <input class="adm-input" type="datetime-local" id="fPublishedAt"/>
      <p class="adm-hint">Leer lassen = sofort beim Veröffentlichen. Ein Datum in der Zukunft plant den Artikel: Er erscheint dann automatisch.</p>
    </section>

    <section class="adm-card">
      <h2>Titelbild</h2>
      <div class="adm-cover" id="coverBox">
        <img id="coverPreview" alt="" hidden/>
        <button class="adm-cover-pick" type="button" id="coverPick">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16V5M7 10l5-5 5 5M5 19h14"/></svg>
          <span>Bild auswählen oder hierher ziehen</span>
          <small>JPG, PNG oder WebP — am besten Querformat 16:9</small>
        </button>
      </div>
      <div class="adm-cover-actions" id="coverActions" hidden>
        <button class="adm-link" type="button" id="coverReplace">Anderes Bild</button>
        <button class="adm-link adm-link--danger" type="button" id="coverRemove">Entfernen</button>
      </div>
      <input type="file" id="coverInput" accept="image/jpeg,image/png,image/webp" hidden/>
      <label class="adm-label" for="fCoverAlt">Bildbeschreibung</label>
      <input class="adm-input" type="text" id="fCoverAlt" maxlength="200" placeholder="Was ist auf dem Bild zu sehen?" value="${esc(post?.cover_alt || '')}"/>
      <p class="adm-hint">Für Suchmaschinen und Screenreader.</p>
    </section>

    <section class="adm-card">
      <h2>Kurzbeschreibung</h2>
      <label class="adm-sr" for="fExcerpt">Kurzbeschreibung</label>
      <textarea class="adm-input" id="fExcerpt" rows="4" maxlength="320" placeholder="Ein bis zwei Sätze, die Lust auf den Artikel machen.">${esc(post?.excerpt || '')}</textarea>
      <p class="adm-hint"><span id="excerptCount">0</span> Zeichen — ideal sind 120 bis 160. Erscheint in der Übersicht, unter dem Titel und bei Google.</p>
    </section>

    <section class="adm-card">
      <h2>Einordnung</h2>
      <label class="adm-label" for="fCategory">Kategorie</label>
      <input class="adm-input" type="text" id="fCategory" maxlength="40" list="categoryList" placeholder="z. B. Vermögensaufbau" value="${esc(post?.category || '')}"/>
      <datalist id="categoryList">${categories.map(c => `<option value="${esc(c)}"></option>`).join('')}</datalist>
      <label class="adm-label" for="fAuthor">Autor</label>
      <input class="adm-input" type="text" id="fAuthor" maxlength="60" value="${esc(post?.author || DEFAULT_AUTHOR)}"/>
      <label class="adm-label" for="fSlug">Adresse des Artikels</label>
      <div class="adm-slug"><span>/blog/</span><input class="adm-input" type="text" id="fSlug" maxlength="80" spellcheck="false" value="${esc(post?.slug || '')}"/></div>
      <p class="adm-hint" id="slugHint">Wird aus dem Titel gebildet.</p>
    </section>
    ${isNew ? '' : `
    <section class="adm-card adm-card--quiet">
      <button class="adm-link adm-link--danger" type="button" id="deleteBtn">Artikel löschen</button>
    </section>`}
  </aside>
</main>

<dialog class="adm-dialog" id="linkDialog">
  <form method="dialog" id="linkForm">
    <h2>Link</h2>
    <label class="adm-label" for="linkUrl">Adresse</label>
    <input class="adm-input" type="text" id="linkUrl" placeholder="https://… oder /erstgespraech" autocomplete="off"/>
    <div class="adm-dialog-actions">
      <button class="adm-link adm-link--danger" type="button" id="linkRemove">Link entfernen</button>
      <span></span>
      <button class="adm-btn adm-btn--ghost" type="button" id="linkCancel">Abbrechen</button>
      <button class="adm-btn adm-btn--primary" type="submit">Übernehmen</button>
    </div>
  </form>
</dialog>`,
  });
}


/* ── Hinweis (z. B. Datenbank nicht verbunden) ── */

export function adminNoticePage({ heading, text }) {
  return shell({
    title: heading,
    bodyClass: 'adm-page-list',
    body: `${topbar({ left: BRAND, right: `<button class="adm-top-link" type="button" id="logoutBtn">Abmelden</button>` })}
<main class="adm-main">
  <div class="adm-empty">
    <h2>${esc(heading)}</h2>
    <p>${esc(text)}</p>
    <a class="adm-btn adm-btn--primary" href="/admin">Neu laden</a>
  </div>
</main>`,
  });
}
