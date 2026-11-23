/* ============================================================
   WIESEL CAPITAL — Redaktion (/admin)
   ============================================================
   Seiten:
     /admin                 Artikelliste
     /admin/login           Anmeldung
     /admin/artikel/neu     neuer Artikel
     /admin/artikel/<id>    Artikel bearbeiten

   Schnittstelle (nur angemeldet, JSON):
     POST   /admin/api/login | /admin/api/logout
     POST   /admin/api/posts          anlegen
     PUT    /admin/api/posts/<id>     speichern
     DELETE /admin/api/posts/<id>     löschen
     POST   /admin/api/images         Bild hochladen (Rohdaten)
   ============================================================ */

import crypto from 'node:crypto';
import path from 'node:path';
import express from 'express';
import { DEFAULT_AUTHOR } from './config.js';
import * as db from './db.js';
import * as auth from './auth.js';
import { cleanArticleHtml, cleanLine } from './sanitize.js';
import { slugify } from './util.js';
import { imageUrl } from './blog.js';
import { loginPage, dashboardPage, editorPage, adminNoticePage } from './views/admin.js';

export const adminRouter = express.Router();

/* Nichts unter /admin gehört in Suchmaschinen oder in einen Cache. */
adminRouter.use('/admin', (req, res, next) => {
  res.set({ 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'no-store', 'X-Frame-Options': 'DENY' });
  next();
});

adminRouter.use('/admin/assets', express.static(path.join(import.meta.dirname, 'admin-assets'), { index: false, redirect: false }));

const page = (res, body, status = 200) => res.status(status).type('html').send(body);


/* ── Seiten ── */

function requireLoginPage(req, res, next) {
  if (!auth.isLoggedIn(req)) return res.redirect('/admin/login');
  if (!db.dbReady()) {
    return page(res, adminNoticePage({
      heading: 'Die Datenbank ist nicht verbunden',
      text: db.dbConfigured()
        ? 'Der Server erreicht die Datenbank gerade nicht und versucht es automatisch weiter. Bitte in einer Minute neu laden.'
        : 'Auf dem Server fehlt die Variable DATABASE_URL. Sobald die Postgres-Datenbank in Railway verknüpft ist, funktioniert die Redaktion.',
    }), 503);
  }
  next();
}

adminRouter.get('/admin/login', (req, res) => {
  if (auth.isLoggedIn(req)) return res.redirect('/admin');
  page(res, loginPage({ configured: auth.adminConfigured() }));
});

adminRouter.get('/admin', requireLoginPage, async (req, res) => {
  page(res, dashboardPage({ posts: await db.listAllPosts() }));
});

adminRouter.get('/admin/artikel/neu', requireLoginPage, async (req, res) => {
  page(res, editorPage({ post: null, categories: await db.listAllCategories() }));
});

adminRouter.get('/admin/artikel/:id', requireLoginPage, async (req, res, next) => {
  const post = /^\d{1,9}$/.test(req.params.id) ? await db.getPostById(Number(req.params.id)) : null;
  if (!post) return next();
  page(res, editorPage({ post, categories: await db.listAllCategories() }));
});


/* ── Schnittstelle ── */

const api = express.Router();
adminRouter.use('/admin/api', api);

/* Schreibende Anfragen müssen von unseren eigenen Seiten kommen: Der eigene
   Header lässt sich von fremden Websites nicht mitsenden, und die Herkunft
   muss zur aufgerufenen Adresse passen. */
api.use((req, res, next) => {
  if (req.method === 'GET') return next();
  const origin = req.get('origin');
  let sameOrigin = true;
  if (origin) {
    try {
      sameOrigin = new URL(origin).host === req.get('host');
    } catch {
      sameOrigin = false;
    }
  }
  if (!sameOrigin || req.get('x-wiesel-admin') !== '1') {
    return res.status(403).json({ error: 'Anfrage abgelehnt.' });
  }
  next();
});

const json = express.json({ limit: '2mb' });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

api.post('/login', json, async (req, res) => {
  if (!auth.adminConfigured()) {
    return res.status(503).json({ error: 'Auf dem Server ist noch kein Passwort hinterlegt (Variable ADMIN_PASSWORD).' });
  }
  if (auth.loginBlocked(req.ip)) {
    return res.status(429).json({ error: 'Zu viele Fehlversuche. Bitte in 15 Minuten erneut versuchen.' });
  }
  if (!auth.passwordMatches(req.body?.password ?? '')) {
    auth.noteLoginFailure(req.ip);
    await sleep(400);
    return res.status(401).json({ error: 'Das Passwort stimmt nicht.' });
  }
  auth.noteLoginSuccess(req.ip);
  auth.startSession(req, res);
  res.json({ ok: true });
});

api.post('/logout', (req, res) => {
  auth.endSession(req, res);
  res.json({ ok: true });
});

api.use((req, res, next) => {
  if (!auth.isLoggedIn(req)) return res.status(401).json({ error: 'Die Sitzung ist abgelaufen. Bitte neu anmelden.' });
  if (!db.dbReady()) return res.status(503).json({ error: 'Die Datenbank ist gerade nicht erreichbar. Bitte gleich noch einmal versuchen.' });
  next();
});

const RESERVED_SLUGS = new Set(['bild']);
const COVER_PATTERN = /^(\/blog\/bild\/[a-f0-9]{24}\.(jpg|png|webp|gif)|\/img\/[A-Za-z0-9/_.-]+\.(jpg|jpeg|png|webp|gif)|https:\/\/[^\s"'<>]+)$/;

/* Macht aus den Formulardaten einen sauberen Datensatz oder meldet, was fehlt. */
async function readPost(body, existing) {
  const title = cleanLine(body.title, 160);
  if (!title) return { error: 'Bitte einen Titel eingeben.' };

  let slug = slugify(body.slug || title);
  if (!slug) return { error: 'Bitte eine Adresse (URL) für den Artikel eingeben.' };
  if (RESERVED_SLUGS.has(slug)) slug += '-artikel';
  // Schon vergeben? Dann -2, -3 … anhängen, statt mit einem Fehler abzubrechen.
  const base = slug;
  for (let n = 2; await db.slugTaken(slug, existing?.id ?? null); n++) {
    slug = `${base.slice(0, 74)}-${n}`;
  }

  const status = body.status === 'published' ? 'published' : 'draft';
  let publishedAt = null;
  if (body.published_at) {
    const date = new Date(body.published_at);
    if (Number.isNaN(date.getTime())) return { error: 'Das Veröffentlichungsdatum ist ungültig.' };
    publishedAt = date;
  }
  if (status === 'published' && !publishedAt) publishedAt = new Date();

  const cover = cleanLine(body.cover_image, 300);
  const content = cleanArticleHtml(String(body.content_html ?? '').slice(0, 600_000));
  if (status === 'published' && !content) return { error: 'Der Artikel hat noch keinen Text.' };

  return {
    post: {
      slug,
      title,
      excerpt: cleanLine(body.excerpt, 320),
      content_html: content,
      category: cleanLine(body.category, 40),
      author: cleanLine(body.author, 60) || DEFAULT_AUTHOR,
      cover_image: COVER_PATTERN.test(cover) ? cover : '',
      cover_alt: cleanLine(body.cover_alt, 200),
      status,
      published_at: publishedAt,
    },
  };
}

const postId = req => (/^\d{1,9}$/.test(req.params.id) ? Number(req.params.id) : null);

api.post('/posts', json, async (req, res) => {
  const { post, error } = await readPost(req.body || {}, null);
  if (error) return res.status(422).json({ error });
  res.status(201).json({ post: await db.createPost(post) });
});

api.put('/posts/:id', json, async (req, res) => {
  const existing = postId(req) ? await db.getPostById(postId(req)) : null;
  if (!existing) return res.status(404).json({ error: 'Diesen Artikel gibt es nicht mehr.' });
  const { post, error } = await readPost(req.body || {}, existing);
  if (error) return res.status(422).json({ error });
  res.json({ post: await db.updatePost(existing.id, post) });
});

api.delete('/posts/:id', async (req, res) => {
  const deleted = postId(req) ? await db.deletePost(postId(req)) : false;
  if (!deleted) return res.status(404).json({ error: 'Diesen Artikel gibt es nicht mehr.' });
  res.json({ ok: true });
});

/* Der Dateityp wird am Inhalt erkannt, nicht an dem, was der Browser behauptet. */
function detectImageType(buffer) {
  if (buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buffer.toString('latin1', 0, 4) === 'RIFF' && buffer.toString('latin1', 8, 12) === 'WEBP') return 'image/webp';
  if (/^GIF8[79]a$/.test(buffer.toString('latin1', 0, 6))) return 'image/gif';
  return null;
}

api.post('/images', express.raw({ type: () => true, limit: '6mb' }), async (req, res) => {
  const data = Buffer.isBuffer(req.body) ? req.body : null;
  const mime = data ? detectImageType(data) : null;
  if (!mime) return res.status(415).json({ error: 'Bitte ein Bild im Format JPG, PNG, WebP oder GIF hochladen.' });
  const id = crypto.randomBytes(12).toString('hex');
  await db.saveImage({ id, mime, data });
  res.status(201).json({ url: imageUrl(id, mime) });
});

api.use((req, res) => res.status(404).json({ error: 'Nicht gefunden.' }));
