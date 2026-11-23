/* ============================================================
   WIESEL CAPITAL — Datenbank (Postgres)
   ============================================================
   Hält die Blog-Artikel und die hochgeladenen Bilder.

   Wichtig: Die Website darf nie ausfallen, nur weil die Datenbank
   fehlt oder gerade nicht erreichbar ist. Deshalb startet der
   Server auch ohne Verbindung und versucht es im Hintergrund
   weiter; bis dahin meldet dbReady() false und der Blog zeigt
   einen Hinweis statt einer Fehlerseite.
   ============================================================ */

import pg from 'pg';
import { DATABASE_URL } from './config.js';
import { seedIfEmpty } from './seed/seed.js';

let pool = null;
let ready = false;

export const dbConfigured = () => Boolean(DATABASE_URL);
export const dbReady = () => ready;

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS blog_posts (
    id            SERIAL PRIMARY KEY,
    slug          TEXT NOT NULL UNIQUE,
    title         TEXT NOT NULL,
    excerpt       TEXT NOT NULL DEFAULT '',
    content_html  TEXT NOT NULL DEFAULT '',
    category      TEXT NOT NULL DEFAULT '',
    author        TEXT NOT NULL DEFAULT 'Finn Wiesel',
    cover_image   TEXT NOT NULL DEFAULT '',
    cover_alt     TEXT NOT NULL DEFAULT '',
    status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    published_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS blog_posts_public_idx
    ON blog_posts (published_at DESC) WHERE status = 'published';

  CREATE TABLE IF NOT EXISTS blog_images (
    id          TEXT PRIMARY KEY,
    mime        TEXT NOT NULL,
    data        BYTEA NOT NULL,
    bytes       INTEGER NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS blog_meta (
    key    TEXT PRIMARY KEY,
    value  TEXT NOT NULL
  );
`;

/** Verbindet, legt die Tabellen an und wiederholt den Versuch bei Fehlern alle 15 Sekunden. */
export async function initDb() {
  if (!DATABASE_URL) {
    console.warn('[db] DATABASE_URL ist nicht gesetzt — der Blog bleibt deaktiviert, die Website läuft normal.');
    return;
  }
  if (!pool) {
    pool = new pg.Pool({
      connectionString: DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 8_000,
    });
    // Ohne diesen Handler würde ein Verbindungsabbruch im Leerlauf den Prozess beenden.
    pool.on('error', err => console.error('[db] Verbindung im Leerlauf verloren:', err.message));
  }
  try {
    await pool.query(SCHEMA);
    await seedIfEmpty(pool);
    ready = true;
    console.log('[db] verbunden, Blog ist aktiv.');
  } catch (err) {
    ready = false;
    console.error('[db] nicht erreichbar, neuer Versuch in 15 s:', err.message || err.code || String(err));
    setTimeout(initDb, 15_000).unref();
  }
}

export async function closeDb() {
  if (pool) await pool.end();
}

const q = (text, params) => pool.query(text, params);

/* Öffentlich sichtbar ist ein Artikel erst, wenn er veröffentlicht ist UND sein
   Datum erreicht hat — ein Datum in der Zukunft plant ihn also einfach ein. */
const VISIBLE = `status = 'published' AND published_at <= now()`;

const LIST_COLUMNS = `id, slug, title, excerpt, category, author, cover_image, cover_alt, status,
  published_at, updated_at, content_html`;


/* ── Öffentliche Abfragen ── */

export async function listVisiblePosts({ category = '', limit, offset = 0 }) {
  const params = [limit, offset];
  let where = VISIBLE;
  if (category) {
    params.push(category);
    where += ` AND category = $3`;
  }
  const { rows } = await q(
    `SELECT ${LIST_COLUMNS} FROM blog_posts WHERE ${where}
     ORDER BY published_at DESC, id DESC LIMIT $1 OFFSET $2`,
    params,
  );
  return rows;
}

export async function countVisiblePosts(category = '') {
  const { rows } = category
    ? await q(`SELECT count(*)::int AS n FROM blog_posts WHERE ${VISIBLE} AND category = $1`, [category])
    : await q(`SELECT count(*)::int AS n FROM blog_posts WHERE ${VISIBLE}`);
  return rows[0].n;
}

export async function listVisibleCategories() {
  const { rows } = await q(
    `SELECT category, count(*)::int AS n FROM blog_posts
     WHERE ${VISIBLE} AND category <> '' GROUP BY category ORDER BY category`,
  );
  return rows;
}

export async function getVisiblePostBySlug(slug) {
  const { rows } = await q(`SELECT * FROM blog_posts WHERE slug = $1 AND ${VISIBLE}`, [slug]);
  return rows[0] || null;
}

/** Bis zu `limit` weitere Artikel — zuerst aus derselben Kategorie, dann die neuesten. */
export async function listRelatedPosts(post, limit = 3) {
  const { rows } = await q(
    `SELECT ${LIST_COLUMNS} FROM blog_posts WHERE ${VISIBLE} AND id <> $1
     ORDER BY (category = $2 AND category <> '') DESC, published_at DESC, id DESC LIMIT $3`,
    [post.id, post.category, limit],
  );
  return rows;
}

export async function listSitemapPosts() {
  const { rows } = await q(
    `SELECT slug, updated_at FROM blog_posts WHERE ${VISIBLE} ORDER BY published_at DESC`,
  );
  return rows;
}


/* ── Admin ── */

export async function listAllPosts() {
  const { rows } = await q(
    `SELECT id, slug, title, category, author, cover_image, status, published_at, updated_at, created_at
     FROM blog_posts ORDER BY COALESCE(published_at, updated_at) DESC, id DESC`,
  );
  return rows;
}

export async function listAllCategories() {
  const { rows } = await q(`SELECT DISTINCT category FROM blog_posts WHERE category <> '' ORDER BY category`);
  return rows.map(r => r.category);
}

export async function getPostById(id) {
  const { rows } = await q(`SELECT * FROM blog_posts WHERE id = $1`, [id]);
  return rows[0] || null;
}

export async function getPostBySlug(slug) {
  const { rows } = await q(`SELECT * FROM blog_posts WHERE slug = $1`, [slug]);
  return rows[0] || null;
}

export async function slugTaken(slug, exceptId = null) {
  const { rows } = await q(
    `SELECT 1 FROM blog_posts WHERE slug = $1 AND ($2::int IS NULL OR id <> $2::int) LIMIT 1`,
    [slug, exceptId],
  );
  return rows.length > 0;
}

const WRITE_FIELDS = ['slug', 'title', 'excerpt', 'content_html', 'category', 'author', 'cover_image', 'cover_alt', 'status', 'published_at'];

export async function createPost(post) {
  const values = WRITE_FIELDS.map(f => post[f]);
  const { rows } = await q(
    `INSERT INTO blog_posts (${WRITE_FIELDS.join(', ')})
     VALUES (${WRITE_FIELDS.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`,
    values,
  );
  return rows[0];
}

export async function updatePost(id, post) {
  const values = WRITE_FIELDS.map(f => post[f]);
  const { rows } = await q(
    `UPDATE blog_posts SET ${WRITE_FIELDS.map((f, i) => `${f} = $${i + 1}`).join(', ')}, updated_at = now()
     WHERE id = $${WRITE_FIELDS.length + 1} RETURNING *`,
    [...values, id],
  );
  return rows[0] || null;
}

export async function deletePost(id) {
  const { rowCount } = await q(`DELETE FROM blog_posts WHERE id = $1`, [id]);
  return rowCount > 0;
}


/* ── Bilder ── */

export async function saveImage({ id, mime, data }) {
  await q(`INSERT INTO blog_images (id, mime, data, bytes) VALUES ($1, $2, $3, $4)`, [id, mime, data, data.length]);
}

export async function getImage(id) {
  const { rows } = await q(`SELECT mime, data FROM blog_images WHERE id = $1`, [id]);
  return rows[0] || null;
}
