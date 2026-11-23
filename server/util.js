/* Kleine Helfer für Templates und Texte. */

import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './config.js';

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** HTML-escaped — für jeden Wert, der aus der Datenbank in ein Template geht. */
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ESCAPES[ch]);
}

/** JSON für <script type="application/ld+json"> bzw. eingebettete Daten. */
export function jsonForScript(data) {
  return JSON.stringify(data).replace(/</g, '\\u003c').replace(/[\u2028\u2029]/g, '');
}

/** "Rente mit 500.000 € – geht das?" → "rente-mit-500000-euro-geht-das" */
export function slugify(text) {
  return String(text ?? '')
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

const dateLong = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Berlin' });

/** 23. November 2026 */
export function formatDate(date) {
  return date ? dateLong.format(new Date(date)) : '';
}

export function isoDate(date) {
  return date ? new Date(date).toISOString() : '';
}

/** Reiner Text aus Artikel-HTML (für Lesezeit und Auszüge). */
export function plainText(html) {
  return String(html ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/** Lesezeit in Minuten bei rund 200 Wörtern pro Minute. */
export function readingMinutes(html) {
  const text = plainText(html);
  const words = text ? text.split(' ').length : 0;
  return Math.max(1, Math.round(words / 200));
}

export function truncate(text, max) {
  const clean = String(text ?? '').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  return cut.slice(0, Math.max(cut.lastIndexOf(' '), max - 30)).replace(/[\s,;:.–-]+$/, '') + '…';
}

/** Versions-Parameter aus dem Änderungsdatum, damit Browser neue CSS/JS-Stände sofort laden. */
const versionCache = new Map();
export function assetUrl(relPath) {
  let v = versionCache.get(relPath);
  if (v === undefined || process.env.NODE_ENV !== 'production') {
    try {
      v = Math.round(fs.statSync(path.join(ROOT, relPath)).mtimeMs / 1000).toString(36);
    } catch {
      v = '1';
    }
    versionCache.set(relPath, v);
  }
  return `/${relPath}?v=${v}`;
}
