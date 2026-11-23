/* ============================================================
   WIESEL CAPITAL — Öffentliche Blog-Routen
   ============================================================
     /blog                 Übersicht (?kategorie=…&seite=…)
     /blog/<slug>          Artikel
     /blog/bild/<datei>    hochgeladene Bilder aus der Datenbank
     /sitemap.xml          alle Seiten und Artikel für Suchmaschinen
   ============================================================ */

import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { ROOT, SITE_URL, POSTS_PER_PAGE } from './config.js';
import * as db from './db.js';
import { isLoggedIn } from './auth.js';
import { esc } from './util.js';
import { blogIndexPage, blogPostPage, notFoundPage, blogUnavailablePage } from './views/blog.js';

export const blogRouter = express.Router();

const html = (res, status, body) => res.status(status).set('Cache-Control', 'no-cache').type('html').send(body);

/* Ohne Datenbank: Hinweis statt Fehler. 503 sagt Suchmaschinen "später wiederkommen". */
function requireDb(req, res, next) {
  if (db.dbReady()) return next();
  res.set('Retry-After', '300');
  html(res, 503, blogUnavailablePage());
}

blogRouter.get('/blog', requireDb, async (req, res) => {
  const category = typeof req.query.kategorie === 'string' ? req.query.kategorie.trim().slice(0, 60) : '';
  const requested = Number.parseInt(req.query.seite, 10);
  const total = await db.countVisiblePosts(category);
  // Die erste Seite zeigt zusätzlich den großen Hauptartikel — also einen Artikel
  // mehr, damit das Dreier-Raster darunter volle Reihen hat.
  const firstPageSize = category ? POSTS_PER_PAGE : POSTS_PER_PAGE + 1;
  const totalPages = total <= firstPageSize ? 1 : 1 + Math.ceil((total - firstPageSize) / POSTS_PER_PAGE);
  const page = Number.isInteger(requested) && requested >= 1 ? Math.min(requested, totalPages) : 1;

  const [posts, categories] = await Promise.all([
    db.listVisiblePosts({
      category,
      limit: page === 1 ? firstPageSize : POSTS_PER_PAGE,
      offset: page === 1 ? 0 : firstPageSize + (page - 2) * POSTS_PER_PAGE,
    }),
    db.listVisibleCategories(),
  ]);
  html(res, 200, blogIndexPage({ posts, categories, category, page, totalPages }));
});

/* Bilder ändern sich nie (jede Datei hat eine zufällige Kennung) — deshalb ein Jahr cachebar. */
const IMAGE_EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
export const imageUrl = (id, mime) => `/blog/bild/${id}.${IMAGE_EXT[mime]}`;

blogRouter.get('/blog/bild/:file', requireDb, async (req, res, next) => {
  const match = /^([a-f0-9]{24})\.(jpg|png|webp|gif)$/.exec(req.params.file);
  if (!match) return next();
  const image = await db.getImage(match[1]);
  if (!image) return next();
  res.set({
    'Content-Type': image.mime,
    'Cache-Control': 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
  });
  res.send(image.data);
});

blogRouter.get('/blog/:slug', requireDb, async (req, res) => {
  const slug = req.params.slug;
  // Vorschau für angemeldete Redakteure: zeigt auch Entwürfe und geplante Artikel.
  const preview = req.query.vorschau !== undefined && isLoggedIn(req);
  const post = /^[a-z0-9-]{1,120}$/.test(slug)
    ? await (preview ? db.getPostBySlug(slug) : db.getVisiblePostBySlug(slug))
    : null;
  if (!post) return html(res, 404, notFoundPage({ inBlog: true }));

  const related = await db.listRelatedPosts(post, 3);
  html(res, 200, blogPostPage({ post, related, preview }));
});

// Alles Weitere unter /blog/… existiert nicht.
blogRouter.use('/blog', (req, res) => html(res, 404, notFoundPage({ inBlog: true })));


/* ── Sitemap ── */

/* Statische Seiten: alle *.html im Hauptordner, außer solchen mit "noindex". */
function staticPages() {
  return fs.readdirSync(ROOT)
    .filter(name => /^[a-z0-9-]+\.html$/.test(name))
    .map(name => {
      const file = path.join(ROOT, name);
      const head = fs.readFileSync(file, 'utf8').slice(0, 4000);
      if (/<meta\s+name="robots"\s+content="[^"]*noindex/i.test(head)) return null;
      const page = name.replace(/\.html$/, '');
      return { loc: page === 'index' ? '/' : `/${page}`, lastmod: fs.statSync(file).mtime };
    })
    .filter(Boolean)
    .sort((a, b) => a.loc.localeCompare(b.loc));
}

blogRouter.get('/sitemap.xml', async (req, res) => {
  const urls = staticPages();
  if (db.dbReady()) {
    const posts = await db.listSitemapPosts();
    if (posts.length) urls.push({ loc: '/blog', lastmod: posts.reduce((max, p) => (p.updated_at > max ? p.updated_at : max), posts[0].updated_at) });
    for (const post of posts) urls.push({ loc: `/blog/${post.slug}`, lastmod: post.updated_at });
  }
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${esc(SITE_URL + u.loc)}</loc><lastmod>${new Date(u.lastmod).toISOString().slice(0, 10)}</lastmod></url>`).join('\n')}
</urlset>
`;
  res.set('Cache-Control', 'public, max-age=3600').type('application/xml').send(body);
});

blogRouter.get('/robots.txt', (req, res) => {
  res.set('Cache-Control', 'public, max-age=3600').type('text/plain').send(`User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);
});
