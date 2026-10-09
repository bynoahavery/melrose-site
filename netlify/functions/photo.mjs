// Serves property photos only to signed-in viewers.
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import content from '../lib/content.mjs';
import { json, viewerSession } from '../lib/shared.mjs';

const known = new Set(content.photos.map((p) => p.id));
const roots = [
  path.join(process.cwd(), 'private/photos'),
  '/var/task/private/photos',
  path.join(process.env.LAMBDA_TASK_ROOT || '', 'private/photos'),
];
const photoDir = () => roots.find((r) => existsSync(r));

export default async (req) => {
  if (!viewerSession(req)) return new Response('Sign in', { status: 401 });
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  const size = url.searchParams.get('size') === 'full' ? 'full' : 'md';
  if (!known.has(id)) return new Response('Not found', { status: 404 });
  const dir = photoDir();
  if (!dir) return json({ error: 'Photo folder missing from the deploy' }, 500);

  // The floor plan PDF download (private/floorplan.pdf)
  if (id === 'floor-plan' && url.searchParams.get('size') === 'pdf') {
    const pdf = await readFile(path.join(dir, '..', 'floorplan.pdf'));
    return new Response(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="Melrose-floor-plan.pdf"',
        'Cache-Control': 'private, max-age=86400',
      },
    });
  }
  const file = await readFile(path.join(dir, `${id}-${size}.jpg`));
  return new Response(file, {
    headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=86400' },
  });
};

export const config = { path: '/api/photo' };
