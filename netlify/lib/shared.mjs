// Shared helpers for the Melrose viewing-site functions.
import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto';
import { getStore } from '@netlify/blobs';

export const SESSION_COOKIE = 'mel_session';
export const ADMIN_COOKIE = 'mel_admin';
const SESSION_DAYS = 30;
const ADMIN_HOURS = 12;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error('SESSION_SECRET is not set (needs 16+ characters).');
  return s;
}

const b64 = (str) => Buffer.from(str).toString('base64url');
const unb64 = (str) => Buffer.from(str, 'base64url').toString('utf8');
const sign = (data) => createHmac('sha256', secret()).update(data).digest('base64url');

export function safeEqual(a, b) {
  const x = Buffer.from(String(a ?? ''));
  const y = Buffer.from(String(b ?? ''));
  if (x.length !== y.length) { timingSafeEqual(x, x); return false; }
  return timingSafeEqual(x, y);
}

export function makeToken(payload, maxAgeSeconds) {
  const body = b64(JSON.stringify({ ...payload, exp: Date.now() + maxAgeSeconds * 1000 }));
  return `${body}.${sign(body)}`;
}

export function readToken(token) {
  if (!token || !token.includes('.')) return null;
  const [body, mac] = token.split('.');
  if (!safeEqual(mac, sign(body))) return null;
  try {
    const data = JSON.parse(unb64(body));
    return data.exp > Date.now() ? data : null;
  } catch { return null; }
}

export function getCookie(req, name) {
  const header = req.headers.get('cookie') || '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

export function cookie(name, value, maxAgeSeconds) {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
}

export const sessionCookie = (payload) => cookie(SESSION_COOKIE, makeToken(payload, SESSION_DAYS * 86400), SESSION_DAYS * 86400);
export const adminCookie = () => cookie(ADMIN_COOKIE, makeToken({ admin: true }, ADMIN_HOURS * 3600), ADMIN_HOURS * 3600);
export const clearCookie = (name) => cookie(name, '', 0);

export const viewerSession = (req) => readToken(getCookie(req, SESSION_COOKIE));
export const isAdmin = (req) => readToken(getCookie(req, ADMIN_COOKIE))?.admin === true;

export function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers },
  });
}

export const newId = () => randomBytes(9).toString('base64url');

// ---------------------------------------------------------------- Sign-ins
// Each sign-in is its own blob, so simultaneous visitors never overwrite each other.
export const trackingStore = () => getStore({ name: 'melrose-tracking', consistency: 'strong' });

export async function recordSignIn(name) {
  const key = `signins/${Date.now().toString(36).padStart(10, '0')}-${newId()}`;
  await trackingStore().setJSON(key, { name, at: new Date().toISOString() });
}

export async function allSignIns() {
  const store = trackingStore();
  const { blobs } = await store.list({ prefix: 'signins/' });
  const rows = await Promise.all(blobs.map((b) => store.get(b.key, { type: 'json' })));
  return rows.filter(Boolean);
}

export const pause = (ms) => new Promise((r) => setTimeout(r, ms));
