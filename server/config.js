/* ============================================================
   WIESEL CAPITAL — Server-Konfiguration
   ============================================================
   Alle Einstellungen kommen aus Umgebungsvariablen (auf Railway
   unter "Variables", lokal aus einer optionalen .env-Datei):

     DATABASE_URL    Postgres-Verbindung. Fehlt sie, läuft die
                     Website normal weiter, nur der Blog ist aus.
     ADMIN_PASSWORD  Passwort für /admin. Fehlt es, ist der
                     Login gesperrt.
     SITE_URL        Öffentliche Adresse (Standard:
                     https://wiesel-capital.com) — für Canonical-
                     Links, Open Graph und die Sitemap.
     PORT            Setzt Railway automatisch.
   ============================================================ */

import path from 'node:path';

export const ROOT = path.resolve(import.meta.dirname, '..');

try {
  process.loadEnvFile(path.join(ROOT, '.env'));
} catch {
  /* keine .env vorhanden — in Produktion der Normalfall */
}

export const PORT = Number(process.env.PORT) || 8080;
export const DATABASE_URL = process.env.DATABASE_URL || '';
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
export const SITE_URL = (process.env.SITE_URL || 'https://wiesel-capital.com').replace(/\/+$/, '');

export const POSTS_PER_PAGE = 9;
export const DEFAULT_AUTHOR = 'Finn Wiesel';
