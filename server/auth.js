/* ============================================================
   WIESEL CAPITAL — Admin-Anmeldung
   ============================================================
   Ein Passwort (ADMIN_PASSWORD), eine signierte Sitzung im
   Cookie. Der Signaturschlüssel wird aus dem Passwort
   abgeleitet: Wird das Passwort geändert, sind alle alten
   Sitzungen sofort ungültig.
   ============================================================ */

import crypto from 'node:crypto';
import { ADMIN_PASSWORD } from './config.js';

const COOKIE = 'wc_admin';
const SESSION_DAYS = 14;
const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;

export const adminConfigured = () => ADMIN_PASSWORD.length > 0;

const sessionKey = () => crypto.createHash('sha256').update(`wc-admin-session-v1:${ADMIN_PASSWORD}`).digest();
const sign = value => crypto.createHmac('sha256', sessionKey()).update(value).digest('base64url');

function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

export function passwordMatches(candidate) {
  return adminConfigured() && safeEqual(candidate, ADMIN_PASSWORD);
}

function readCookie(req, name) {
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > -1 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return '';
}

function writeCookie(req, res, value, maxAgeSeconds) {
  const attrs = [`${COOKIE}=${value}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${maxAgeSeconds}`];
  if (req.secure) attrs.push('Secure');
  res.setHeader('Set-Cookie', attrs.join('; '));
}

export function startSession(req, res) {
  const expires = String(Date.now() + SESSION_MS);
  writeCookie(req, res, `${expires}.${sign(expires)}`, SESSION_MS / 1000);
}

export function endSession(req, res) {
  writeCookie(req, res, '', 0);
}

export function isLoggedIn(req) {
  if (!adminConfigured()) return false;
  const [expires, signature] = readCookie(req, COOKIE).split('.');
  if (!expires || !signature || !/^\d+$/.test(expires)) return false;
  return Number(expires) > Date.now() && safeEqual(signature, sign(expires));
}


/* ── Schutz gegen Passwort-Raten ──
   Zählt Fehlversuche pro Adresse und insgesamt. Die Gesamtgrenze greift auch
   dann, wenn jemand seine Adresse fälscht oder ständig wechselt. */

const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_IP = 8;
const MAX_TOTAL = 40;
const failures = new Map();   // ip → [zeitstempel, …]
let totalFailures = [];

const recent = list => list.filter(t => t > Date.now() - WINDOW_MS);

export function loginBlocked(ip) {
  totalFailures = recent(totalFailures);
  const mine = recent(failures.get(ip) || []);
  if (mine.length) failures.set(ip, mine); else failures.delete(ip);
  return mine.length >= MAX_PER_IP || totalFailures.length >= MAX_TOTAL;
}

export function noteLoginFailure(ip) {
  totalFailures.push(Date.now());
  failures.set(ip, [...(failures.get(ip) || []), Date.now()]);
}

export function noteLoginSuccess(ip) {
  failures.delete(ip);
}
