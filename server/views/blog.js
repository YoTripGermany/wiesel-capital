/* ============================================================
   WIESEL CAPITAL — Blog-Ansichten
   ============================================================
   Übersicht (/blog), Artikelseite (/blog/<slug>) und die
   Hinweis-Seiten. Gestaltung: css/blog.css.

   Achtung: kein <nav>-Element verwenden — style.css fixiert
   jedes <nav> als Kopfleiste. Deshalb role="navigation".
   ============================================================ */

import { SITE_URL, DEFAULT_AUTHOR } from '../config.js';
import { esc, formatDate, isoDate, readingMinutes, assetUrl } from '../util.js';
import { sitePage, finalCta } from './layout.js';

const AVATAR = '/img/blog/finn-wiesel-avatar.jpg';

const ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

const categoryUrl = category => (category ? `/blog?kategorie=${encodeURIComponent(category)}` : '/blog');

const metaLine = post => `<span>${esc(formatDate(post.published_at))}</span><span aria-hidden="true">·</span><span>${readingMinutes(post.content_html)} Min. Lesezeit</span>`;

/* Titelbild oder — wenn keines hinterlegt ist — eine Fläche im Markenlook. */
function cardMedia(post, { eager = false } = {}) {
  if (post.cover_image) {
    return `<img src="${esc(post.cover_image)}" alt="${esc(post.cover_alt || post.title)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"/>`;
  }
  return `<span class="blog-media-empty" aria-hidden="true"><img src="/logo-wiesel-capital-white.png" alt="" loading="lazy"/></span>`;
}

function postCard(post) {
  return `
        <a class="blog-card fade" href="/blog/${esc(post.slug)}">
          <div class="blog-card-media">${cardMedia(post)}</div>
          <div class="blog-card-body">
            ${post.category ? `<span class="blog-cat">${esc(post.category)}</span>` : ''}
            <h2 class="blog-card-title">${esc(post.title)}</h2>
            ${post.excerpt ? `<p class="blog-card-excerpt">${esc(post.excerpt)}</p>` : ''}
            <div class="blog-meta">${metaLine(post)}</div>
          </div>
        </a>`;
}

function featuredCard(post) {
  return `
      <a class="blog-feature fade" href="/blog/${esc(post.slug)}">
        <div class="blog-feature-media">${cardMedia(post, { eager: true })}</div>
        <div class="blog-feature-body">
          <span class="blog-cat">${post.category ? `${esc(post.category)} · ` : ''}Neuester Artikel</span>
          <h2 class="blog-feature-title">${esc(post.title)}</h2>
          ${post.excerpt ? `<p class="blog-feature-excerpt">${esc(post.excerpt)}</p>` : ''}
          <div class="blog-meta">${metaLine(post)}</div>
          <span class="blog-more">Artikel lesen ${ARROW}</span>
        </div>
      </a>`;
}

function pagination({ page, totalPages, category }) {
  if (totalPages <= 1) return '';
  const url = n => {
    const params = new URLSearchParams();
    if (category) params.set('kategorie', category);
    if (n > 1) params.set('seite', String(n));
    const query = params.toString();
    return `/blog${query ? `?${query}` : ''}`;
  };
  const links = [];
  for (let n = 1; n <= totalPages; n++) {
    links.push(n === page
      ? `<span class="blog-page is-active" aria-current="page">${n}</span>`
      : `<a class="blog-page" href="${esc(url(n))}" aria-label="Seite ${n}">${n}</a>`);
  }
  return `
      <div class="blog-pagination" role="navigation" aria-label="Seiten">
        ${page > 1 ? `<a class="blog-page blog-page--step" href="${esc(url(page - 1))}" rel="prev">Zurück</a>` : ''}
        ${links.join('\n        ')}
        ${page < totalPages ? `<a class="blog-page blog-page--step" href="${esc(url(page + 1))}" rel="next">Weiter</a>` : ''}
      </div>`;
}


/* ── Übersicht ── */

export function blogIndexPage({ posts, categories, category, page, totalPages }) {
  const showFeature = page === 1 && !category && posts.length > 0;
  const feature = showFeature ? posts[0] : null;
  const rest = showFeature ? posts.slice(1) : posts;

  const filters = categories.length > 1 || category ? `
      <div class="blog-filters" role="navigation" aria-label="Kategorien">
        <a class="blog-filter${category ? '' : ' is-active'}" href="/blog">Alle</a>
        ${categories.map(c => `<a class="blog-filter${c.category === category ? ' is-active' : ''}" href="${esc(categoryUrl(c.category))}">${esc(c.category)}</a>`).join('\n        ')}
      </div>` : '';

  const body = posts.length === 0 ? `
      <div class="blog-empty">
        <span class="eyebrow">In Vorbereitung</span>
        <h2 class="blog-empty-h">${category ? 'In dieser Kategorie gibt es noch keine Artikel.' : 'Die ersten Artikel erscheinen in Kürze.'}</h2>
        <p class="blog-empty-p">${category
          ? 'Schauen Sie sich gern die übrigen Beiträge an.'
          : 'Hier finden Sie bald Einordnungen und Strategien rund um systematischen Vermögensaufbau.'}</p>
        ${category ? `<a class="blog-more" href="/blog">Alle Artikel ansehen ${ARROW}</a>` : ''}
      </div>` : `
      ${feature ? featuredCard(feature) : ''}
      ${rest.length ? `<div class="blog-grid">${rest.map(postCard).join('')}
      </div>` : ''}
      ${pagination({ page, totalPages, category })}`;

  const main = `
  <section class="mkt-hero blog-hero">
    <div class="container">
      <span class="eyebrow">Wiesel Capital Blog</span>
      <h1 class="mkt-hero-h">Wissen für Ihren <em>Vermögensaufbau.</em></h1>
      <p class="mkt-hero-sub">Strategien, Einordnungen und Hintergründe rund um systematisches Investieren — verständlich erklärt von Finn Wiesel.</p>
    </div>
  </section>

  <section class="page-sec" id="artikel">
    <div class="panel panel--cream blog-panel">
    <div class="container">${filters}${body}
    </div>
    </div>
  </section>
${finalCta({
    heading: 'Aus Wissen wird erst mit einem <em>klaren System</em> Vermögen.',
    text: 'In einem persönlichen, kostenlosen Erstgespräch schauen wir uns an, wo Sie heute stehen und ob der Ansatz von Wiesel Capital zu Ihren Zielen passt.',
  })}`;

  const filtered = Boolean(category) || page > 1;
  return sitePage({
    title: category ? `${category} – Blog – Wiesel Capital` : 'Blog – Wiesel Capital',
    description: 'Der Blog von Wiesel Capital: Strategien, Einordnungen und Hintergründe rund um systematischen Vermögensaufbau — von Finn Wiesel, Ex-Banker und Wertpapieranalyst.',
    path: '/blog',
    // Gefilterte und Folgeseiten sollen nicht als eigene Treffer bei Google landen.
    robots: filtered ? 'noindex, follow' : 'index, follow',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Blog',
      name: 'Wiesel Capital Blog',
      url: `${SITE_URL}/blog`,
      publisher: { '@type': 'Organization', name: 'Wiesel Capital', url: SITE_URL },
    },
    main,
  });
}


/* ── Artikel ── */

const SHARE_ICONS = {
  linkedin: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4.98 3.5a2.5 2.5 0 11-.02 5 2.5 2.5 0 01.02-5zM3 9h4v12H3zM9 9h3.8v1.7h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1V21h-4v-5.6c0-1.34-.02-3.06-1.87-3.06-1.87 0-2.16 1.46-2.16 2.96V21H9z"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.9 2H22l-7.6 8.7L23.3 22h-7l-5.5-7.2L4.5 22H1.4l8.1-9.3L1 2h7.2l5 6.6L18.9 2zm-1.2 18h1.7L7.4 3.9H5.6L17.7 20z"/></svg>',
  whatsapp: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2a9.9 9.9 0 00-8.5 15l-1.4 5 5.2-1.36A9.93 9.93 0 1012.04 2zm0 1.8a8.12 8.12 0 11-4.14 15.1l-.3-.18-3.08.8.83-3-.2-.3A8.12 8.12 0 0112.04 3.8zM8.5 7.3c-.2 0-.5.07-.75.35-.26.28-.98.96-.98 2.34s1 2.71 1.14 2.9c.14.19 1.95 3.1 4.8 4.22 2.37.94 2.85.75 3.37.7.51-.04 1.66-.67 1.9-1.33.23-.65.23-1.21.16-1.33-.07-.12-.26-.19-.54-.33-.28-.14-1.66-.82-1.92-.91-.26-.1-.44-.14-.63.14-.19.28-.72.91-.89 1.1-.16.18-.33.2-.6.07-.29-.14-1.2-.44-2.27-1.4a8.5 8.5 0 01-1.57-1.96c-.17-.28-.02-.43.12-.57.13-.13.28-.33.42-.5.14-.16.19-.28.28-.46.1-.19.05-.35-.02-.5-.07-.13-.62-1.53-.87-2.1-.22-.5-.45-.5-.63-.51l-.52-.02z"/></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
  link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 007.07 0l2.83-2.83a5 5 0 00-7.07-7.07L11.5 4.43"/><path d="M14 11a5 5 0 00-7.07 0L4.1 13.83a5 5 0 007.07 7.07l1.33-1.33"/></svg>',
};

function shareRow(post) {
  const url = `${SITE_URL}/blog/${post.slug}`;
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(post.title);
  return `
      <div class="post-share">
        <span class="post-share-label">Artikel teilen</span>
        <div class="post-share-links">
          <a href="https://www.linkedin.com/sharing/share-offsite/?url=${u}" target="_blank" rel="noopener" aria-label="Auf LinkedIn teilen">${SHARE_ICONS.linkedin}</a>
          <a href="https://x.com/intent/post?url=${u}&amp;text=${t}" target="_blank" rel="noopener" aria-label="Auf X teilen">${SHARE_ICONS.x}</a>
          <a href="https://wa.me/?text=${t}%20${u}" target="_blank" rel="noopener" aria-label="Per WhatsApp teilen">${SHARE_ICONS.whatsapp}</a>
          <a href="mailto:?subject=${t}&amp;body=${u}" aria-label="Per E-Mail teilen">${SHARE_ICONS.mail}</a>
          <button type="button" data-copy-link="${esc(url)}" aria-label="Link kopieren">${SHARE_ICONS.link}<span class="post-share-copied" role="status" aria-live="polite"></span></button>
        </div>
      </div>`;
}

function authorBox(post) {
  if (post.author !== DEFAULT_AUTHOR) return '';
  return `
      <aside class="post-author">
        <img src="${AVATAR}" alt="Finn Wiesel" width="72" height="72" loading="lazy"/>
        <div>
          <span class="post-author-label">Über den Autor</span>
          <p class="post-author-name">Finn Wiesel</p>
          <p class="post-author-bio">Gründer und Geschäftsführer von Wiesel Capital, Ex-Banker und Wertpapieranalyst (Frankfurt School of Finance &amp; Management). Im persönlichen Mentoring zeigt er Investoren, wie sie ihr Vermögen systematisch vermehren und schützen.</p>
          <a class="blog-more" href="/finn-wiesel">Mehr über Finn Wiesel ${ARROW}</a>
        </div>
      </aside>`;
}

/* Tabellen bekommen einen Rahmen, in dem sie auf schmalen Bildschirmen seitlich scrollen. */
const wrapTables = html => html
  .replace(/<table>/g, '<div class="post-table"><table>')
  .replace(/<\/table>/g, '</table></div>');

export function blogPostPage({ post, related, preview = false }) {
  const url = `${SITE_URL}/blog/${post.slug}`;
  const minutes = readingMinutes(post.content_html);
  const isFinn = post.author === DEFAULT_AUTHOR;
  const published = post.published_at || post.updated_at;

  const main = `
  <div class="post-progress" aria-hidden="true"><span id="postProgress"></span></div>
${preview ? `
  <div class="post-preview-bar" role="status">Vorschau — dieser Stand ist ${post.status === 'published' && new Date(post.published_at) <= new Date() ? 'bereits öffentlich sichtbar' : 'noch nicht öffentlich sichtbar'}. <a href="/admin/artikel/${post.id}">Zurück zum Bearbeiten</a></div>` : ''}
  <article class="post">
    <header class="mkt-hero post-hero${post.cover_image ? ' post-hero--cover' : ''}">
      <div class="container">
        <div class="post-crumbs" role="navigation" aria-label="Brotkrumen">
          <a href="/blog">Blog</a>${post.category ? `<span aria-hidden="true">/</span><a href="${esc(categoryUrl(post.category))}">${esc(post.category)}</a>` : ''}
        </div>
        <h1 class="post-title">${esc(post.title)}</h1>
        ${post.excerpt ? `<p class="post-lead">${esc(post.excerpt)}</p>` : ''}
        <div class="post-meta">
          ${isFinn
            ? `<img class="post-meta-avatar" src="${AVATAR}" alt="" width="44" height="44"/>`
            : `<span class="post-meta-avatar post-meta-avatar--initial" aria-hidden="true">${esc((post.author || 'W').trim().charAt(0).toUpperCase())}</span>`}
          <div class="post-meta-text">
            <span class="post-meta-author">${esc(post.author || 'Wiesel Capital')}</span>
            <span class="post-meta-sub"><time datetime="${esc(isoDate(published))}">${esc(formatDate(published))}</time><span aria-hidden="true">·</span>${minutes} Min. Lesezeit</span>
          </div>
        </div>
      </div>
    </header>
${post.cover_image ? `
    <figure class="post-cover">
      <img src="${esc(post.cover_image)}" alt="${esc(post.cover_alt || post.title)}" fetchpriority="high" decoding="async"/>
    </figure>` : ''}

    <div class="post-wrap">
      <div class="post-body">
${wrapTables(post.content_html)}
      </div>
${shareRow(post)}

      <aside class="post-disclaimer">
        <p><strong>Hinweis:</strong> Dieser Artikel dient ausschließlich zu Informations- und Bildungszwecken und stellt keine Anlageberatung und keine Anlageempfehlung dar. Vergangene Wertentwicklungen und Ergebnisse — auch aus Rückrechnungen (Backtests) — sind kein verlässlicher Indikator für zukünftige Entwicklungen. Bitte beachten Sie unseren <a href="/risikohinweis">Risikohinweis</a>.</p>
      </aside>
${authorBox(post)}
    </div>
  </article>
${related.length ? `
  <section class="page-sec" id="weitere-artikel">
    <div class="panel panel--cream blog-panel">
    <div class="container">
      <div class="sec-head">
        <h2 class="sec-h2">Weitere <em>Artikel</em></h2>
      </div>
      <div class="blog-grid blog-grid--related">${related.map(postCard).join('')}
      </div>
    </div>
    </div>
  </section>` : ''}
${finalCta({
    heading: 'Sie möchten Ihr Vermögen <em>systematisch</em> strukturieren?',
    text: 'In einem persönlichen, kostenlosen Erstgespräch schauen wir uns an, wo Sie heute stehen und ob der Ansatz von Wiesel Capital zu Ihren Zielen passt.',
  })}`;

  return sitePage({
    title: `${post.title} – Wiesel Capital`,
    description: post.excerpt,
    path: `/blog/${post.slug}`,
    robots: preview ? 'noindex, nofollow' : 'index, follow',
    ogType: 'article',
    ogImage: post.cover_image,
    ogImageAlt: post.cover_alt || post.title,
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'BlogPosting',
          headline: post.title,
          description: post.excerpt,
          ...(post.cover_image ? { image: post.cover_image.startsWith('/') ? SITE_URL + post.cover_image : post.cover_image } : {}),
          datePublished: isoDate(published),
          dateModified: isoDate(post.updated_at),
          author: isFinn
            ? { '@type': 'Person', name: 'Finn Wiesel', url: `${SITE_URL}/finn-wiesel`, jobTitle: 'Gründer & Geschäftsführer' }
            : { '@type': 'Person', name: post.author || 'Wiesel Capital' },
          publisher: { '@type': 'Organization', name: 'Wiesel Capital', url: SITE_URL, logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo-wiesel-capital.png` } },
          mainEntityOfPage: url,
          ...(post.category ? { articleSection: post.category } : {}),
          inLanguage: 'de-DE',
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Startseite', item: `${SITE_URL}/` },
            { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog` },
            { '@type': 'ListItem', position: 3, name: post.title, item: url },
          ],
        },
      ],
    },
    headExtra: `  <script src="${assetUrl('js/blog.js')}" defer></script>\n`,
    bodyClass: 'page-post',
    main,
  });
}


/* ── Hinweis-Seiten ── */

function noticePage({ title, eyebrow, heading, text, link, blogActive = true }) {
  return sitePage({
    title: `${title} – Wiesel Capital`,
    description: text,
    robots: 'noindex, follow',
    blogActive,
    main: `
  <section class="mkt-hero blog-notice">
    <div class="container">
      <span class="eyebrow">${esc(eyebrow)}</span>
      <h1 class="mkt-hero-h">${heading}</h1>
      <p class="mkt-hero-sub">${esc(text)}</p>
      <a href="${esc(link.href)}" class="btn-p" aria-label="${esc(link.label)}">
        <span class="btn-text-wrap">
          <span class="btn-text btn-text-a">${esc(link.label)}</span>
          <span class="btn-text btn-text-b">${esc(link.label)}</span>
        </span>
      </a>
    </div>
  </section>`,
  });
}

export const notFoundPage = ({ inBlog = false } = {}) => noticePage({
  title: 'Seite nicht gefunden',
  eyebrow: 'Fehler 404',
  heading: inBlog ? 'Diesen Artikel gibt es <em>nicht (mehr).</em>' : 'Diese Seite gibt es <em>nicht.</em>',
  text: inBlog
    ? 'Der Artikel wurde verschoben oder entfernt. In der Übersicht finden Sie alle aktuellen Beiträge.'
    : 'Die Adresse ist nicht mehr gültig oder wurde falsch eingegeben.',
  link: inBlog ? { href: '/blog', label: 'Zur Blog-Übersicht' } : { href: '/', label: 'Zur Startseite' },
  blogActive: inBlog,
});

export const blogUnavailablePage = () => noticePage({
  title: 'Blog',
  eyebrow: 'Wiesel Capital Blog',
  heading: 'Der Blog ist gerade <em>nicht erreichbar.</em>',
  text: 'Bitte versuchen Sie es in wenigen Minuten noch einmal.',
  link: { href: '/', label: 'Zur Startseite' },
});
