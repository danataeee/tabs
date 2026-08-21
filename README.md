# tabs — household expense splitting

A single static HTML page plus a Supabase (Postgres) backend. Two roommates share
one anon key; there are no user accounts.

**Files**


| File                                | What it is                                                                      |
| ----------------------------------- | ------------------------------------------------------------------------------- |
| `index.html`                        | The whole frontend — markup, styles, and logic                                  |
| `config.js`                         | Your Supabase URL + anon key. **Not committed** — copy from `config.template.js` |
| `config.template.js`                 | Template to copy                                                                |
| `supabase/migrations/0001_init.sql` | Schema, Row Level Security, realtime setup                                      |
| `supabase/import_from_sheets.sql`   | Optional one-time import of old Google Sheets data                              |
| `archive/`                          | Retired Apps Script backend + old setup PDF. Reference only                     |
| `netlify.toml`                      | Publish dir + the build command that writes `config.js` on deploy               |
| `SETUP.md`                          | Fork-your-own-copy guide: Supabase, Netlify, continuous deploy                   |


---



## 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com), sign in, **New project**.
2. Name it (`tabs` is fine), set a database password (save it in your password
  manager — you won't need it for this app, only for direct DB access), pick the
   region closest to you, and create.
3. Wait for provisioning to finish (~2 minutes).



## 2. Create the tables

1. In the project sidebar, open **SQL Editor** → **New query**.
2. Paste the entire contents of `supabase/migrations/0001_init.sql` and hit **Run**.
3. You should see `Success. No rows returned`. Check **Table Editor** — `people`,
  `ledger`, and `recurring` should now exist.



## 3. Get your URL and anon key

1. Sidebar → **Project Settings** → **API**.
2. Copy **Project URL** (looks like `https://abcdefgh.supabase.co`).
3. Under **Project API keys**, copy the `anon` **/** `public` key.
  Use the `anon` key — **never** the `service_role` key. The service_role key
   bypasses Row Level Security and must never ship in a browser.



## 4. Paste them in

```bash
cp config.template.js config.js
```

Then edit `config.js`:

```js
window.APP_CONFIG = {
  SUPABASE_URL: 'https://abcdefgh.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGci...'
};
```

Both values are safe to expose in the browser — that's what the anon key is for.
What protects your data is Row Level Security, configured in the migration.

**A caveat worth understanding:** this app has no login, so the policies grant
the anon key full read/write on all three tables. Anyone who has your deployed
URL can view and edit your expenses. That's the deliberate tradeoff for a
two-person household with no sign-in. Don't put anything sensitive in the note
field, and don't post the URL publicly.

## 5. Run it locally (OPTIONAL)

The page must be served over HTTP, not opened as a `file://` URL:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Any static server works (`npx serve`, `php -S localhost:8000`, etc.).

## 6. Deploy free

The app is three static files (`index.html`, `config.js`, `favicon.png`) — no  
build step.

### Netlify

1. [app.netlify.com](https://app.netlify.com) → **Add new site** → **Import an
  existing project**, pick the repo.
2. Build command **empty**, publish directory `.`.
3. **Deploy.**

Or, without Git at all: drag the project folder onto
[app.netlify.com/drop](https://app.netlify.com/drop).

**Important:** `config.js` is gitignored, so a Git-based deploy won't include it
and the app will load with an error. Either commit it (fine for a private repo,
and the anon key is public-safe anyway) or add the two values as a build-time
file in your host's UI. The simplest path for a household app: remove
`config.js` from `.gitignore` and commit it.

---

