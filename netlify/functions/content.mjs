import content from '../lib/content.mjs';
import { json, viewerSession } from '../lib/shared.mjs';

export default async (req) => {
  const session = viewerSession(req);
  if (!session) return json({ error: 'Sign in' }, 401);
  return json({ viewer: { name: session.name }, ...content });
};

export const config = { path: '/api/content' };
