# Push notifications — how it works and what to set up

Everything below the credentials line is built and tested. **Delivery to a phone needs two things only you can create**: a Firebase
project (Android) and an Apple Developer account with an APNs key (iOS). Until they exist the app still works fully: every
notice appears in the in-app notification center (realtime), and the phone-side registration says "not ready in this build".

## The flow

```
event (new job, reply, message, ticket, inflation month…)
  → SQL trigger writes a row in public.notifications           (in-app center, realtime, category + English text)
  → trigger notifications_push: member switched on + has a device?  → private.push_outbox   (text for the lock screen is generic
                                                                     for replies / mentions / messages: never the text or the sender)
  → private.kick_push() (pg_net, once per transaction) + pg_cron every minute
  → Edge Function send-push: claims the queue (service role) → FCM (Android) / APNs (iOS) → marks sent, deletes dead tokens
  → phone shows it; tapping opens the job / post / chat / ticket (data: type, id, nid) — validated by domain/notifications.ts openTarget()
```

Producers (all in `supabase/migrations/…_push_notifications.sql`, tested in `supabase/tests/database/13_push_notifications.test.sql`):

| Event | Who | Rules |
|---|---|---|
| New job | engineers of the job's discipline (and track), experience within a year of the job's range, the job's governorate (remote: anywhere) | not suspended, notify + «jobs» on, ≤ 3 job alerts a day, ≤ 1000 members per job |
| Reply / @mention | the post's author, the replied-to comment's author, the mentioned handle | never yourself; a burst is one notice (10 min) |
| Private message | the other member; the member for a «فريق EngSpace» message | one notice per thread while unread; never the text |
| Support ticket | the ticket's owner | a reply (existing) and any status change |
| Inflation month | engineers with «salary» on | when staff add the month (Admin → Settings) |
| Salary cell reaches 5 reports | engineers who shared in that discipline + governorate (±2 years) | once |
| Web update published (v0.1.14) | members with the phone app registered, not suspended | only from the Publish web update workflow (service role); once per bundle; opens Home + the update banner (docs/OTA.md) |

Preferences (`notification_prefs` + `profiles.settings.notify`): master, jobs, replies, messages, salary, support. Account and
moderation notices (`verify`, `mod`, `warn`, `suspend`, `report`…) have no switch.

## One-time setup

### 1. The function and its secrets (both platforms)
```bash
npx supabase functions deploy send-push          # also done by the "Deploy database" workflow
npx supabase secrets set PUSH_SECRET="$(openssl rand -hex 24)"      # remember it for step 2
```
### 2. Let the database wake the function (SQL editor, once; the secret never goes in the repo)
```sql
select vault.create_secret('https://<project ref>.supabase.co', 'push_url');
select vault.create_secret('<the same PUSH_SECRET>', 'push_secret');
```
Without these the every-minute cron sweep (`engspace-push-sweep`) still calls nothing — the function must be reachable by pg_net,
so do this step. Check: `select * from net._http_response order by id desc limit 3;` after a test push.

### 3. Android (Firebase Cloud Messaging) — automated since v0.1.8
`android/app/google-services.json` is committed (it holds only the public app config, not a secret) and the Gradle plugin picks it up.
Steps 1–2 above are done by the **Deploy database** workflow once you add one repository secret:
1. Firebase console → Project settings → Service accounts → Generate new private key.
2. GitHub → Settings → Secrets → Actions → **`FCM_SERVICE_ACCOUNT`** = the whole JSON file (paste its contents).
3. Actions → **Deploy database** → Run workflow. It sets the function secrets (`FCM_SERVICE_ACCOUNT`, a fresh `PUSH_SECRET`), writes the
   Vault entries, deploys `send-push` and fails if the function does not report Android as ready.
4. Build the release (Actions → Release preview builds). Settings → إعدادات الإشعارات → «أرسل لي إشعارًا تجريبيًا».
Never commit the service-account JSON; if one was ever pasted in a chat or ticket, revoke it in the Firebase console and create a new one.

### 4. iOS (APNs) — needs the paid Apple Developer Program
Push does **not** work in the sideloaded IPA (a free Apple ID cannot sign the Push Notifications capability). For the signed build:
1. developer.apple.com → Keys → create a key with **Apple Push Notifications service (APNs)**; download the `.p8` once.
2. Xcode → App target → Signing & Capabilities → **+ Push Notifications** (adds the `aps-environment` entitlement); bundle id `app.engspace`.
3. `npx supabase secrets set APNS_KEY_P8="$(cat AuthKey_XXXX.p8)" APNS_KEY_ID=XXXX APNS_TEAM_ID=YYYY APNS_BUNDLE_ID=app.engspace`
   (add `APNS_ENV=sandbox` for builds run from Xcode; TestFlight / App Store use production).
No Firebase iOS SDK is involved: the token the app registers is the raw APNs token and the function talks to APNs directly.

### 5. Web
Browsers get notifications while the app is open in a tab (the Notification API; same preferences). Background web push needs a
service worker, VAPID keys and a public HTTPS address — not built yet; the `user_push_tokens.platform = 'web'` slot is reserved.

## Operating it
- Queue health: `select status, count(*) from private.push_outbox group by 1;` — `skipped / no credentials for android` means step 3 is missing.
- A dead token (app uninstalled) is deleted on the first failed send; a member keeps at most 8 devices; sign-out drops the device.
- Rows older than 24 h are dropped unsent (a late push is worse than none); everything is deleted after 7 days.
- Tests: `bash scripts/db/test.sh` (SQL), `npx vitest run tests/push-delivery.test.ts tests/push-notifications.test.ts`, `npm run test:cloud`
  (includes claim → deliver → finish through the real database).
