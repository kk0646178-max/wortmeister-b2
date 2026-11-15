# WortMeister B2 — Independent Edition

A mobile-first Arabic/German vocabulary trainer rebuilt from the user's November 15, 2026 JSON backup. The public seed contains only the 35 curated bank words with reset learning states; personal review history is intentionally excluded. The five personal words are intentionally not placed in a public static asset. After deploying the new app, import your original `wortmeister-b2-2026-11-15.json` from Settings; merge mode adds your five personal words and preserves the existing 35 words and event IDs.

## What works in this project

- IndexedDB local persistence; the app starts from `initial_backup.json` only when no local state exists.
- Personal and bank words share the same daily queue and spaced-repetition flow. New words with `introduced: null` are eligible for study, regardless of source.
- Due reviews are placed before new cards; the new-word target defaults to five.
- Active-recall review with Again / Hard / Good / Easy scheduling and recorded attempts.
- Add/edit personal words, duplicate guard, topic/type/source filters, word details.
- JSON export, CSV export, and safe JSON merge import (does not replace existing records or erase local progress).
- Installable PWA shell and cached core files for offline access.
- Optional Google OAuth + cloud backup using Supabase; disabled until project credentials and Google provider are configured. Cloud merging prefers the latest per-word update timestamp and preserves deduplicated review events.
- Optional AI tutor through a server-side Vercel function; it does not expose the model key to the browser and requires an authenticated Supabase session.

## Run locally

Requires Node.js 20+.

```bash
npx serve .
```

Open the local URL shown by the server. The AI endpoint requires Vercel Functions, so AI is unavailable with a static local server.

## Deploy to Vercel

1. Import the existing GitHub repository into Vercel (this repository is intentionally public source code).
2. Keep personal learning backups out of this repository; the included seed has only the curated bank and no user activity history.
3. Set the Framework Preset to Other. Framework preset: Other. Build command: leave empty. Output directory: `.`.
4. Add the environment variables listed in `.env.example` to Vercel. Keep `OPENAI_API_KEY` server-only.
5. Deploy. The `/api/ai.js` file is a Vercel serverless function.

## Google sign-in and cloud sync

1. Create a Supabase project.
2. In Supabase SQL Editor, run `supabase/schema.sql`.
3. In Supabase Authentication > Providers, enable Google and configure the Google OAuth Client ID and Client Secret from your Google Cloud OAuth configuration.
4. Add the deployed app origin to Supabase Authentication URL Configuration (Site URL and Redirect URLs). For this app, the OAuth redirect target is the exact origin of the deployed site.
5. Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` as Vercel environment variables (server-side validation for AI).
6. In `config.js`, set `SUPABASE_URL` and `SUPABASE_ANON_KEY` to the Supabase project URL and anon/publishable key. These are browser client settings; never put a service-role key here.
7. Redeploy. OAuth sessions persist through Supabase Auth's PKCE flow and token refresh; once configured, the app should restore a valid session instead of requiring the Emergent Resume flow.

The app also works without Supabase in local-only mode. Local IndexedDB data stays on that browser/device; it does not magically sync to other devices until cloud sync is configured.

## AI tutor

Set `OPENAI_API_KEY` and `OPENAI_MODEL` in Vercel Environment Variables. The API validates the Supabase access token before contacting the model provider. AI requests send the current user's limited vocabulary context (up to 80 entries) and recent conversation turns. Do not add provider secrets to `config.js` or `app.js`.

## Data migration

- `initial_backup.json` is a privacy-safe seed derived from the source backup: 35 curated bank words with no personal history. Your five personal words are not exposed as a public static file.
- The public seed contains 35 curated words with reset learning states and no activity events. Import the private original backup to restore all 40 words and your 120 learning events.
- Imported personal words retain their original values; edit their grammatical type in the app after import if needed. Personal terms and the private backup are not hard-coded into this public source.
- Import your original JSON backup through Settings after the new app first opens. Merge mode adds personal words and restores newer saved progress for matching bank-word IDs without overwriting newer local work. The app never overwrites a non-empty local database with the seed file.
- JSON import merges by ID, restores newer progress for matching word IDs, and adds missing words/events; it does not reset the current database.

## Known setup requirements / limits

- Google OAuth cannot work until the user configures a Supabase project and Google OAuth provider credentials.
- Cross-device synchronization cannot work until the Supabase project and table are configured.
- AI cannot work until a server-side API key and model ID are configured in Vercel.
- Speech-to-text and voice conversation are not implemented in this version.
- Static offline mode includes local vocabulary and review logic; cloud login and AI naturally require connectivity.

## Important: Google OAuth callback

When creating the Google OAuth client in Google Cloud, add this as the authorized redirect URI:

`https://YOUR_SUPABASE_PROJECT_REF.supabase.co/auth/v1/callback`

In Supabase, allow the deployed app URL as a redirect URL (for example `https://YOUR-APP.vercel.app/**`). The browser code uses the deployed site's origin as the post-login redirect target. Do not use the Emergent preview URL for the new app.

## Security notes

- `config.js` contains only the public Supabase project URL and anon/publishable key. Row Level Security protects the user backup table.
- Never place a Supabase service-role key or model API key in `config.js`.
- AI is opt-in. After consent, the question, recent conversation and a limited set of saved vocabulary are sent to the configured provider.
- Local backups remain exportable as JSON even when cloud authentication is not configured.
