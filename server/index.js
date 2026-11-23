/* ============================================================
   WIESEL CAPITAL — Webserver
   ============================================================
   Liefert die bestehende Website unverändert aus (alle Dateien
   im Hauptordner, wie zuvor der reine Datei-Server) und ergänzt:

     /blog, /blog/<slug>   Blog (server/blog.js)
     /admin                Redaktion (server/admin.js)
     /sitemap.xml          Sitemap
     /healthz              Lebenszeichen für Railway

   Start:  npm start        (lokal: http://localhost:8080)
   Einstellungen: siehe server/config.js
   ============================================================ */

import express from 'express';
import compression from 'compression';
import { ROOT, PORT } from './config.js';
import { initDb, closeDb, dbReady } from './db.js';
import { blogRouter } from './blog.js';
import { adminRouter } from './admin.js';
import { notFoundPage } from './views/blog.js';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', true);   // hinter Railway/Cloudflare: echtes Protokoll und echte Adresse

app.get('/healthz', (req, res) => res.json({ ok: true, blog: dbReady() }));

app.use(compression());
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  next();
});

app.use(blogRouter);
app.use(adminRouter);


/* ── Bestehende Website ──
   Alles im Hauptordner ist öffentlich, so wie bisher — ausgenommen der
   Server-Code, die Paketdateien und alles, was mit einem Punkt beginnt. */

const PRIVATE_DIRS = new Set(['server', 'node_modules']);
const PRIVATE_FILES = new Set(['package.json', 'package-lock.json', 'railway.json']);

app.use((req, res, next) => {
  let decoded;
  try {
    decoded = decodeURIComponent(req.path);
  } catch {
    return res.status(400).type('text/plain').send('Ungültige Adresse');
  }
  const segments = decoded.split(/[\\/]+/).filter(Boolean).map(s => s.toLowerCase());
  const isPrivate = segments.some(s => s.startsWith('.'))
    || PRIVATE_DIRS.has(segments[0])
    || (segments.length === 1 && PRIVATE_FILES.has(segments[0]));
  if (isPrivate) return notFound(req, res);

  // /faq/ → /faq (Seiten liegen ohne Schrägstrich am Ende)
  if (segments.length && decoded.endsWith('/')) {
    const query = req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?')) : '';
    return res.redirect(301, '/' + segments.map(encodeURIComponent).join('/') + query);
  }
  next();
});

app.use(express.static(ROOT, {
  extensions: ['html'],      // /faq → faq.html
  index: 'index.html',
  redirect: false,
  dotfiles: 'ignore',
  setHeaders(res, filePath) {
    // Seiten immer frisch prüfen; Bilder, Videos, CSS und JS wie bisher vier Stunden cachen.
    res.set('Cache-Control', filePath.endsWith('.html') ? 'no-cache' : 'public, max-age=14400');
  },
}));

function notFound(req, res) {
  res.status(404).set('Cache-Control', 'no-cache');
  if (req.method === 'GET' && req.accepts('html')) return res.type('html').send(notFoundPage());
  res.type('text/plain').send('Nicht gefunden');
}
app.use(notFound);

app.use((err, req, res, next) => {
  console.error(`[fehler] ${req.method} ${req.originalUrl}:`, err);
  if (res.headersSent) return next(err);
  const status = err.status >= 400 && err.status < 600 ? err.status : 500;
  if (req.path.startsWith('/admin/api/')) {
    return res.status(status).json({ error: status === 413 ? 'Die Datei ist zu groß.' : 'Es ist ein Fehler aufgetreten. Bitte erneut versuchen.' });
  }
  res.status(status).type('text/plain').send('Es ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.');
});


const server = app.listen(PORT, () => {
  console.log(`[server] Wiesel Capital läuft auf Port ${PORT}`);
  initDb();
});

for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    server.close(async () => {
      await closeDb().catch(() => {});
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 8000).unref();
  });
}
