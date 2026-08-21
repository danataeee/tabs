# Setting up your own version of tabs.

The app is a single static HTML page backed by Supabase (Postgres). There is no
build step and no server to run. Total time is about 20 minutes, and every
service used here is free at this scale.

You'll need accounts on [GitHub](https://github.com),
[Supabase](https://supabase.com), and [Netlify](https://netlify.com).

> **Sharing a household?** If you just want your roommate to use the same
> expense list as you, they don't need any of this. Send them your deployed URL
> — it's the same app and the same data. Fork only if you want a *separate*
> household with its own database.

---



## 1. Fork the repo

On the GitHub page for this project, click **Fork** (top right), then
**Create fork**. You now have your own copy at
`github.com/YOUR-USERNAME/tabs`.

Clone it if you want to work locally:

```bash
git clone https://github.com/YOUR-USERNAME/tabs.git
cd tabs
```

---



## 2. Create a Supabase project

1. Sign in at [supabase.com](https://supabase.com) and click **New project**.
2. Name it `tabs`, set a database password, and pick the region closest to you.
3. Save the password in your password manager. The app never uses it — it's only
  for connecting to the database directly — but you can't recover it later.

Provisioning takes about two minutes.

---



## 3. Create the tables

1. In the project sidebar open **SQL Editor** → **New query**.
2. Paste the entire contents of `supabase/migrations/0001_init.sql` and **Run**.

You should see `Success. No rows returned`. Open **Table Editor** and confirm
that `people`, `ledger`, and `recurring` now exist.

That one file creates the three tables, enables row-level security with a policy
for each, and adds all three to the realtime publication so everyone viewing the
app sees changes live.

---



## 4. Copy your keys

Go to **Project Settings** → **API** and copy two values:


| Value                 | Looks like                     |
| --------------------- | ------------------------------ |
| **Project URL**       | `https://abcdefgh.supabase.co` |
| **anon / public key** | `eyJhbGciOi...` (a long JWT)   |


> **Use the** `anon` **key — never** `service_role`**.** The service_role key bypasses
> row-level security entirely and must never ship in a browser.

---



## 5. Deploy to Netlify from Git

1. At [app.netlify.com](https://app.netlify.com), choose
  **Add new site** → **Import an existing project**.
2. Pick **GitHub**, authorize Netlify if prompted, and select your fork.
3. Leave the build settings alone. The repo has a `netlify.toml` that already
  sets the publish directory to `.` and the build command.
4. Before deploying, open **Add environment variables** and add both:

  | Key                 | Value                        |
  | ------------------- | ---------------------------- |
  | `SUPABASE_URL`      | your Project URL from step 4 |
  | `SUPABASE_ANON_KEY` | your anon key from step 4    |

5. Click **Deploy**.

You'll get a URL like `https://something-random-123.netlify.app`. Rename it
under **Site configuration** → **Change site name**.

### Why environment variables and not a committed file

`config.js` holds your keys and is listed in `.gitignore`, so it is never
committed and never arrives from the repo. The build command in `netlify.toml`
writes it at deploy time from the two environment variables:

```bash
printf "window.APP_CONFIG={SUPABASE_URL:'%s',SUPABASE_ANON_KEY:'%s'};" \
  "$SUPABASE_URL" "$SUPABASE_ANON_KEY" > config.js
```

This keeps your keys out of Git, which matters because forks are often public.
If you'd rather not bother, you can delete the `config.js` line from
`.gitignore` and commit the file instead — the anon key is designed to be
public — but then anyone reading your repo can reach your data. See
[Who can see your data](#who-can-see-your-data).

---

## 6. First run

Open your Netlify URL. You should see:

- **Connected** in green at the top, with your Supabase hostname beside it.
- The setup screen, asking how many people share expenses.

Enter everyone's names. This writes to the `people` table, so it only happens  
once — anyone else opening the URL lands straight in the app.

---

