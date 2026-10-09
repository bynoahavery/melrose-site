import { json, safeEqual, sessionCookie, recordSignIn, pause } from '../lib/shared.mjs';

const clean = (v) => String(v || '').replace(/\s+/g, ' ').trim().slice(0, 40);

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (!process.env.SITE_PASSCODE) return json({ error: 'The site passcode has not been set up yet.' }, 500);

  const body = await req.json().catch(() => ({}));
  const firstName = clean(body.firstName);
  const lastName = clean(body.lastName);
  if (!/\p{L}/u.test(firstName)) return json({ error: 'Enter your first name.', field: 'firstName' }, 400);
  if (!/\p{L}/u.test(lastName)) return json({ error: 'Enter your last name.', field: 'lastName' }, 400);
  const name = `${firstName} ${lastName}`;

  if (!safeEqual(String(body.passcode || '').trim(), process.env.SITE_PASSCODE.trim())) {
    await pause(600); // slows down guessing
    return json({ error: 'That passcode is incorrect.', field: 'passcode' }, 401);
  }

  await recordSignIn(name);
  return json({ ok: true, name }, 200, { 'Set-Cookie': sessionCookie({ name }) });
};

export const config = { path: '/api/login' };
