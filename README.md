# Melrose — private viewing site

Same setup as Ranee: visitors enter their first name, last name and a passcode before they see the property. Every sign-in (name and time) is recorded for the agent's dashboard at `/admin`.

## Deploy on Netlify

1. Create a new site from this folder: drag it into Netlify, or push it to a Git repo and import it. The build settings come from `netlify.toml`, so no build command is needed.
2. Under **Site configuration → Environment variables**, add:
   - `SITE_PASSCODE`: the passcode buyers use, e.g. `CLV2026`
   - `ADMIN_PASSCODE`: a different passcode for the agent's dashboard
   - `SESSION_SECRET`: a long random string of 32+ characters (it signs the login cookies)
3. Redeploy so the variables take effect.
4. Visit `/` to check the buyer sign-in, then `/admin` to check the dashboard.

Visitor data is stored in Netlify Blobs (store `melrose-tracking`). It needs no setup and stays put between deploys.

## Where things live

- `netlify/lib/content.mjs`: all the copy, headings, stats, disclaimer, agent and photo order. Set `agent` to `{ "label": "Contact agent", "name": "...", "phone": "...", "tel": "+61..." }` to show the agent on the hero.
- `private/photos/`: the photos (`<id>-md.jpg` and `<id>-full.jpg`). They're served only to signed-in visitors via `/api/photo`.
- `public/`: the page, styles, slideshow and dashboard.
- `netlify/functions/`: sign-in, content, photo, tracking and dashboard endpoints.

The floor plan image is `private/photos/floor-plan-md.jpg` / `floor-plan-full.jpg`, and the downloadable PDF is `private/floorplan.pdf` (served to signed-in visitors only). To replace it, swap those files and keep the names.

## What's tracked

Each sign-in: the visitor's name and the time. The dashboard at `/admin` shows the number of people and visits, a table of each person with their visit count and latest sign-in, and a list of every sign-in, newest first. It's the same as Ranee's.
