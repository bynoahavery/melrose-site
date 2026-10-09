// Agent dashboard API: /api/admin (GET data), /api/admin/login, /api/admin/logout
import { json, isAdmin, safeEqual, adminCookie, clearCookie, ADMIN_COOKIE, allSignIns, pause } from '../lib/shared.mjs';

export default async (req) => {
  const { pathname } = new URL(req.url);

  if (pathname.endsWith('/login')) {
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
    if (!process.env.ADMIN_PASSCODE) return json({ error: 'The dashboard passcode has not been set up yet.' }, 500);
    const { passcode } = await req.json().catch(() => ({}));
    if (!safeEqual(String(passcode || '').trim(), process.env.ADMIN_PASSCODE.trim())) {
      await pause(600);
      return json({ error: 'That passcode is incorrect.' }, 401);
    }
    return json({ ok: true }, 200, { 'Set-Cookie': adminCookie() });
  }

  if (pathname.endsWith('/logout')) return json({ ok: true }, 200, { 'Set-Cookie': clearCookie(ADMIN_COOKIE) });

  if (!isAdmin(req)) return json({ error: 'Sign in' }, 401);
  return json({ signIns: await allSignIns() });
};

export const config = { path: ['/api/admin', '/api/admin/login', '/api/admin/logout'] };
