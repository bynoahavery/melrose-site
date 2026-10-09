import { json, clearCookie, SESSION_COOKIE } from '../lib/shared.mjs';

export default async () => json({ ok: true }, 200, { 'Set-Cookie': clearCookie(SESSION_COOKIE) });

export const config = { path: '/api/logout' };
