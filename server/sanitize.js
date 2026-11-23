/* ============================================================
   WIESEL CAPITAL — Artikel-HTML bereinigen
   ============================================================
   Alles, was aus dem Editor kommt, läuft vor dem Speichern hier
   durch. Übrig bleibt nur schlichtes, semantisches HTML — so
   sehen Artikel immer einheitlich aus (kein mitkopiertes Word-
   oder Google-Docs-Format) und es kann kein Skript in einen
   Artikel gelangen.
   ============================================================ */

import sanitizeHtml from 'sanitize-html';
import { SITE_URL } from './config.js';

const siteHost = new URL(SITE_URL).host;

function isExternal(href) {
  if (!/^https?:\/\//i.test(href)) return false;
  try {
    const host = new URL(href).host;
    return host !== siteHost && host !== `www.${siteHost}`;
  } catch {
    return false;
  }
}

const OPTIONS = {
  allowedTags: [
    'p', 'h2', 'h3', 'strong', 'em', 'a', 'ul', 'ol', 'li', 'blockquote', 'br', 'hr',
    'figure', 'figcaption', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'sup', 'sub',
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    img: ['src', 'alt', 'width', 'height', 'loading', 'decoding'],
    th: ['colspan', 'rowspan'],
    td: ['colspan', 'rowspan'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: { img: ['http', 'https'] },
  allowProtocolRelative: false,
  transformTags: {
    h1: 'h2',
    h4: 'h3',
    h5: 'h3',
    h6: 'h3',
    b: 'strong',
    i: 'em',
    div: 'p',
    a(tagName, attribs) {
      const href = (attribs.href || '').trim();
      const out = { href };
      if (isExternal(href)) {
        out.target = '_blank';
        out.rel = 'noopener';
      }
      return { tagName, attribs: out };
    },
    img(tagName, attribs) {
      const out = { src: (attribs.src || '').trim(), alt: attribs.alt || '', loading: 'lazy', decoding: 'async' };
      if (/^\d+$/.test(attribs.width || '') && /^\d+$/.test(attribs.height || '')) {
        out.width = attribs.width;
        out.height = attribs.height;
      }
      return { tagName, attribs: out };
    },
  },
  exclusiveFilter(frame) {
    // Links ohne Ziel und Bilder ohne Quelle fliegen raus.
    if (frame.tag === 'a' && !frame.attribs.href) return false;
    return frame.tag === 'img' && !frame.attribs.src;
  },
};

/* Geschützte Leerzeichen: Der Editor streut beim Tippen welche ein, die den
   Zeilenumbruch stören — die werden zu normalen Leerzeichen. Dafür kommt
   zwischen Zahl und %/€ immer eines hin, damit "5,7 %" nie getrennt wird. */
function tidySpaces(text) {
  return text.replace(/\u00a0/g, ' ').replace(/(\d) (?=[%€])/g, '$1\u00a0');
}

export function cleanArticleHtml(html) {
  return tidySpaces(sanitizeHtml(String(html ?? ''), OPTIONS))
    // Links, deren Ziel nicht erlaubt war (z. B. javascript:), bleiben als reiner Text.
    .replace(/<a>([\s\S]*?)<\/a>/g, '$1')
    // Leere Absätze und Überschriften, die der Editor beim Tippen hinterlässt.
    .replace(/<(p|h2|h3|blockquote|li)>(?:\s|&nbsp;|<br\s*\/?>)*<\/\1>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Einzeilige Textfelder: Steuerzeichen und Umbrüche raus, Länge begrenzen. */
export function cleanLine(value, max) {
  return tidySpaces(String(value ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max));
}
