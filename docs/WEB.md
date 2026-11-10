# The website (Cloudflare Pages)

The **Deploy website** workflow (`.github/workflows/deploy-web.yml`) builds the web app with the live Supabase keys and puts it on
Cloudflare Pages. It is the same build the phones get as a live update; the desktop shell (`src/app/desk.tsx`) takes over at ≥ 1024 px.

| Trigger | Address |
|---|---|
| push to `main` | `https://engspace.pages.dev/#app` (production) |
| pull request from this repository | `https://<branch>.engspace.pages.dev/#app` (preview, in the run's summary) |
| Actions → Deploy website → Run workflow | the chosen branch |

If the name `engspace` is taken on pages.dev, Cloudflare gives the project a suffixed address (for example `engspace-4xk.pages.dev`);
the run's summary always prints the real one.

## One-time setup (owner)

1. Cloudflare dashboard → the account's overview: copy the **Account ID**.
2. My Profile → API Tokens → Create Token → *Custom token* → permission **Account · Cloudflare Pages · Edit** (that account only).
3. GitHub → Settings → Secrets and variables → Actions → New repository secret:
   `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`.
4. Actions → **Deploy website** → Run workflow (branch `main`). The first run creates the Pages project.

Without the two secrets the workflow ends with a notice, never a failure.

## What the workflow also does

- Adds the site to **Supabase Auth → Redirect URLs** (`https://<project>.pages.dev/**` and `https://*.<project>.pages.dev/**`,
  plus `PUBLIC_URL` when set), keeping every entry already there — so e-mail confirmation, password reset and Google / Apple
  sign-in return to the site. Uses the existing `SUPABASE_ACCESS_TOKEN` secret.
- `public/_headers`: hashed assets cached for a year, the page always revalidated, `nosniff`, `SAMEORIGIN` framing.

## Custom domain (engspace.org)

Pages project → Custom domains → add `engspace.org`. Then set the repository **variable** `PUBLIC_URL=https://engspace.org`
(shared links use it, and the next deploy adds it to the Auth redirects). Optional variable `PAGES_PROJECT` renames the project.

## The public page
The bare address (no `#…`) shows the public page to a visitor who is not signed in; `#landing` shows it to anyone; every app / admin
route and every sign-in return (`?code=`, `?error=`, `?reset=`, tokens in the fragment) opens the app (`src/app/entry.ts`). Its download
buttons use the newest release's `app-debug.apk` / `engspace.ipa`, resolved at deploy time; repository variables `APK_URL` / `IPA_URL`
override them (store links later). No account, nothing stored.
