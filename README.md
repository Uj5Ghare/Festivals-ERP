# मंडळ हिशोब — Mandal Hisaab

A simple Marathi + English web app for Ganpati mandals to record **vargani** (donations) and **kharch** (expenses), send receipts on WhatsApp, and share a public hisaab report. It installs on Android phones like an app (PWA).

**Stack:** React + Vite + TypeScript + Tailwind · Supabase (database, login, photos) · Vercel (hosting) · PWA (Android install). Everything here runs on free plans.

---

## What it does

- **Two tabs only:** मुख्य (Home) and हिशोब (Records). Home has the balance and two big buttons: वर्गणी घ्या / खर्च लिहा.
- **Vargani:**
  - Type any total or tap ₹100 / ₹200 / ₹300 / ₹500 / ₹1,000.
  - Choose **full paid, part paid or pending**. For part paid, edit either "paid now" or "balance" and the other updates itself.
  - Name, house and WhatsApp number (optional). Previous donors and picked phone contacts are suggested as you type. A mic button lets you speak the name.
  - **Receipt numbers start at 1** and come from the database, so two volunteers can never get the same number, and a deleted receipt's number is never reused.
- **Receipt:** the receipt card with mandal logo and toran. Send it on WhatsApp, share it as a photo, or print it.
- **Kharch:** six category tiles plus **इतर (Other)** with your own name for the expense. You can keep custom names as new tiles, and attach a photo of the bill.
- **Records:**
  - Paid / due totals and filters, search by name, house or receipt number.
  - **जमा करा** to collect a balance.
  - Delete with Undo, and a **recently deleted** list (kept 30 days) with restore.
- **Only the president deletes:** volunteers can only *request* a deletion. The president keeps or deletes it. This is enforced in the database, not just hidden in the app.
- **Public report (जाहीर हिशोब):** totals, spending by category and pending vargani, with no devotee names. Share it to the WhatsApp group or save it as a PDF.
- **Profile:** the president changes the mandal name and logo; invite volunteers with a 6-character code; remove volunteers.
- **मराठी / EN** switch on every screen, remembered on the phone.
- **Live sync:** an entry saved by one volunteer appears on everyone's phone without refreshing.

### Login: mobile number + 6-digit PIN

No SMS is sent, so login is free. The app turns the number into a private address (`m98XXXXXXXX@phone.mandal-hisaab.app`) for Supabase; nothing is ever emailed. For this to work, **"Confirm email" must be turned off** (step 1.3 below).

---

## 1. Create the Supabase database (about 10 minutes)

1. Go to <https://supabase.com>, sign in, and click **New project**. Pick a name, set a database password, and choose the region **South Asia (Mumbai)** for speed in India.
2. Open **SQL Editor → New query**, paste everything from [`supabase/schema.sql`](supabase/schema.sql), and click **Run**. It creates:
   - the tables,
   - the security rules (who can see and change what),
   - the receipt-number counter,
   - the president-only delete functions,
   - live updates,
   - the `mandal-files` photo bucket.

   It is safe to run again.
3. Open **Authentication → Sign In / Providers → Email**:
   - keep **Email** enabled
   - turn **Confirm email** **OFF** and save.
4. Open **Project Settings → API** (or the **Connect** button) and copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`

> The anon key is meant to be public. The security rules in `schema.sql` are what protect the data.

## 2. Run it on your computer (optional)

Needs Node.js 20 or newer.

```bash
npm install
cp .env.example .env      # paste the two values from step 1.4
npm run dev               # open the address it prints
```

## 3. Put it online free with Vercel

1. Push this folder to a GitHub repository.
2. Go to <https://vercel.com> → **Add New → Project** → import the repository. Vercel detects Vite by itself.
3. Under **Environment Variables**, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. Click **Deploy**. You get a link like `https://mandal-hisaab.vercel.app`. Every push to GitHub redeploys automatically.

`vercel.json` already makes deep links like `/hisaab` work, and keeps the offline service worker fresh.

## 4. Install on Android

1. Open the Vercel link in **Chrome** on the phone.
2. Tap **⋮ → Add to Home screen** (or **Install app**).
3. The marigold icon appears on the home screen. It opens full-screen like a normal app and loads even with a weak network.

## 5. First use

1. **President:** open the app → **नवीन खाते** (New account) with name, mobile and a 6-digit PIN → **नवीन मंडळ तयार करा** → the invite screen shows a 6-character **mandal code** → **WhatsApp वर कोड पाठवा**.
2. **Volunteers:** open the link → **नवीन खाते** → **मंडळात सामील व्हा** → enter the code.
3. The president can add the mandal logo and change the name from **Profile** (the person icon on Home).

---

## Looking after the app

**Someone forgot their PIN.** In Supabase **SQL Editor**, run this with their number and a new PIN, then tell them the new PIN:

```sql
update auth.users
set encrypted_password = crypt('654321', gen_salt('bf'))
where email = 'm9850021134@phone.mandal-hisaab.app';
```

**Empty the deleted list after 30 days automatically (optional).** Enable the `pg_cron` extension in **Database → Extensions**, then run the commented block at the end of `schema.sql`. Without it, the app simply stops showing entries older than 30 days.

**Free-plan limits worth knowing:**
- Supabase may pause a free project after a long period with no use; open the dashboard and click **Restore** if that happens.
- Storage and database sizes on the free plan are far more than one mandal needs.

**Security notes:**
- A 6-digit PIN is convenient but short. Supabase limits repeated wrong attempts.
- Ask volunteers not to share their PIN.
- The president can remove a volunteer from Profile at any time.

---

## Where it differs from the design

| Design | App | Why |
|---|---|---|
| President types volunteer names and numbers | Volunteers join with the **mandal code** | Each volunteer needs their own login; the code is the safe, free way to link them |
| "सिंक करा" imports all contacts | Opens the phone's **contact picker** (choose one or many) | Websites aren't allowed to read the whole address book; Chrome on Android offers the picker. Previous donors are suggested too |
| Demo "तुम्ही" chip switches roles | Shows your real role | Roles come from login now |
| Receipt shows amount in words | Not included | Reliable Marathi number words need more care; easy to add later |

Voice input and the contact picker work in **Chrome on Android**. On other browsers those buttons simply don't appear.

---

## Project layout

```
supabase/schema.sql        tables, security rules, server functions, storage
src/lib/                   supabase client, data hooks, i18n (Marathi/English), formatting, device helpers
src/components/            icons, toran, headers, bottom nav, toasts, invite card
src/pages/                 Login, Setup, Invite, Home, Donation, DonationDone, Receipt,
                           Expense, Records, Report, Profile
public/                    app icons
vite.config.ts             PWA manifest and offline caching
```

To change any wording, edit the `mr` and `en` lists in `src/lib/i18n.tsx`. Colours are the `@theme` tokens in `src/index.css`.
