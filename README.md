# Vaultly — Premium Expense Tracker

A modern, glassmorphism-styled expense & income tracker with Firebase Auth + Firestore,
Chart.js analytics, a budget module, calendar view, and CSV/Excel/PDF export.

## 1. Create a Firebase project

1. Go to https://console.firebase.google.com → **Add project**.
2. Inside the project: **Build → Authentication → Get started → Email/Password** → enable it.
3. **Build → Firestore Database → Create database** (start in production mode).
4. **Build → Storage → Get started** (needed for receipts + profile photos — optional, skip if you don't need uploads).
5. **Project settings → General → Your apps → Web (</>)** → register an app → copy the `firebaseConfig` object.

## 2. Add your config

Open `js/firebase-config.js` and paste your project's values into `firebaseConfig`:

```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

## 3. Deploy security rules

Using the Firebase CLI (`npm install -g firebase-tools`, then `firebase login`):

```bash
firebase init firestore storage   # point to this folder, use existing firestore.rules / storage.rules
firebase deploy --only firestore:rules,storage
```

These rules ensure every user can only ever read or write their **own** data
(`/users/{uid}/...`), and that receipt/avatar uploads are size- and type-restricted.

## 4. Run it

This is a static site — no build step. Serve the folder with any static server, e.g.:

```bash
npx serve .
# or
python3 -m http.server 8080
```

Then open the printed local URL. (Opening `index.html` directly via `file://` will not
work because ES module imports and Firebase auth require an http(s) origin.)

## Project structure

```
index.html              All screens: auth, dashboard, transactions, analytics, budget,
                         calendar, settings, profile, modals
css/style.css            Full glassmorphism design system
js/firebase-config.js    Firebase init — put your config here
js/state.js               Central app state + default categories
js/db.js                  Firestore CRUD, all scoped to users/{uid}/...
js/auth.js                Register / login / logout / forgot password / verify email / profile
js/router.js               View switching
js/render-helpers.js       Shared transaction-row + category-select rendering
js/transactions.js         Add/edit/delete modal, filters, search
js/dashboard.js            Balance orb, stat cards, recent list, mini chart
js/analytics.js            Pie / bar / line charts, category breakdown
js/budget.js               Monthly + per-category budgets, 80% warning
js/calendar.js             Month grid + per-day transaction view
js/settings.js             Theme / currency / language / notifications / categories
js/profile.js              Photo upload, name/email/password change, delete account
js/export.js               CSV / Excel / PDF export
js/main.js                  Bootstraps everything, auth-state listener
firestore.rules             Per-user data isolation rules
storage.rules                Per-user file isolation rules
```

## Notes & things you may want to extend

- **Language selection** currently stores the preference per-user but the UI copy is
  English-only — wire in a translation dictionary if you need full i18n.
- **Daily/monthly reminder notifications** are shown in-app (bell icon). For real push/email
  reminders you'd add Firebase Cloud Functions + Cloud Scheduler or FCM.
- **Category budgets** use a simple `prompt()`-based flow to keep the demo self-contained —
  swap in a proper modal if you want a more polished UX.
- Chart.js, jsPDF, SheetJS and Font Awesome are loaded from CDNs — for production you may want
  to self-host or pin exact versions.
