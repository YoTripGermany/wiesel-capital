/* ============================================================
   WIESEL CAPITAL — Erster Artikel
   ============================================================
   Legt beim allerersten Start mit einer leeren Datenbank einen
   Beispielartikel an, damit der Blog nicht leer online geht.
   Das passiert genau einmal: Wird der Artikel später gelöscht,
   kommt er nicht wieder. Er lässt sich unter /admin ganz normal
   bearbeiten oder löschen.
   ============================================================ */

import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_AUTHOR } from '../config.js';
import { cleanArticleHtml } from '../sanitize.js';

const FIRST_POST = {
  slug: 'rente-mit-500000-euro',
  title: 'Rente mit 500.000 Euro: Wie viel können Sie wirklich entnehmen?',
  excerpt: 'Die 4\u2011%\u2011Regel gilt als Maßstab für die Rente aus dem Depot. Historische Rückrechnungen zeigen: Mit der richtigen Strategie war deutlich mehr möglich.',
  category: 'Ruhestandsplanung',
  author: DEFAULT_AUTHOR,
  cover_image: '/img/blog/rente-mit-500000-euro.jpg',
  cover_alt: 'Grafik: monatliche Entnahme aus einem Depot von 500.000 Euro bei Entnahmequoten von 4 bis 8,5 Prozent',
  published_at: '2026-11-23T08:00:00+01:00',
  file: 'rente-mit-500000-euro.html',
};
// \u2011 bzw. &#8209; ist ein geschützter Bindestrich: "4-%-Regel" wird am Zeilenende nicht getrennt.

export async function seedIfEmpty(pool) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Der Merker verhindert, dass der Artikel nach dem Löschen wieder auftaucht.
    const marker = await client.query(
      `INSERT INTO blog_meta (key, value) VALUES ('first_post_seeded', now()::text)
       ON CONFLICT (key) DO NOTHING RETURNING key`,
    );
    const existing = await client.query(`SELECT 1 FROM blog_posts LIMIT 1`);
    if (marker.rowCount > 0 && existing.rowCount === 0) {
      const html = fs.readFileSync(path.join(import.meta.dirname, FIRST_POST.file), 'utf8');
      await client.query(
        `INSERT INTO blog_posts (slug, title, excerpt, content_html, category, author, cover_image, cover_alt, status, published_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'published', $9)`,
        [
          FIRST_POST.slug, FIRST_POST.title, FIRST_POST.excerpt, cleanArticleHtml(html), FIRST_POST.category,
          FIRST_POST.author, FIRST_POST.cover_image, FIRST_POST.cover_alt, FIRST_POST.published_at,
        ],
      );
      console.log('[db] erster Artikel angelegt:', FIRST_POST.slug);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
