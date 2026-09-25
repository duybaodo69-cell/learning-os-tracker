# Learning OS Tracker

## 1. Mục đích dự án (Project purpose)

A personal learning-tracker **PWA**, mobile-first, used on the owner's phone many times per day.
Owner: a finance student. Goal: log study/deep-work data fast, review it with spaced repetition,
practise calibrated forecasting, and see the numbers on a dashboard.

**Hard requirement: every log action must take under 30 seconds.**

- UI language: **Vietnamese**. Keep standard English terms as-is: "deep work", "retrieval",
  "Brier score", "area", "PWA".
- Code, comments, file names, type names: English.
- No backend, no login, no account. All data lives on the device (IndexedDB).
- Timezone: **Asia/Ho_Chi_Minh**. Dates are stored as plain `YYYY-MM-DD` strings in local time,
  never as UTC timestamps, so a day never shifts.

The owner has almost no coding experience. Therefore:
- Keep the code **simple and well-commented**. Prefer plain, obvious code over clever code.
- Explain each step briefly **in Vietnamese** in chat.
- **Do not skip ahead** to features from a later phase.

## 2. Tech stack (use exactly this unless something is broken)

| Purpose        | Tool                                   |
| -------------- | -------------------------------------- |
| Build tool     | Vite                                   |
| UI             | React + TypeScript                     |
| Styling        | Tailwind CSS                           |
| Local storage  | Dexie.js (IndexedDB wrapper)           |
| Charts         | Recharts                               |
| PWA            | vite-plugin-pwa                        |
| Dates          | date-fns (timezone Asia/Ho_Chi_Minh)   |

No other UI kit, no state-management library, no router library beyond what is already here.

## 3. Data model

These types are the contract for every phase. Add fields only when a phase needs them.

```ts
// A once-a-day check-in about sleep and energy.
type DailyCheckin = {
  date: string;        // "YYYY-MM-DD", unique (primary key)
  bedTime: string;     // "HH:mm"
  wakeTime: string;    // "HH:mm"
  sleepHours: number;  // computed from bedTime + wakeTime
  energy: 1 | 2 | 3 | 4 | 5;
  note?: string;
};

// One session of deep work.
type FocusBlock = {
  id: string;
  date: string;        // "YYYY-MM-DD"
  startTime: string;   // "HH:mm"
  minutes: number;
  area: Area;
  focusRating: 1 | 2 | 3 | 4 | 5;
  distractions: number; // count
  phoneAway: boolean;
  resumeNote?: string;
};

type Area =
  | "Internship VC"
  | "IM/Memo"
  | "Financial modeling"
  | "IELTS"
  | "EFM"
  | "AFEP"
  | "BFN"
  | "Stock competition"
  | "M&A sourcing"
  | "Other";

// Free-recall practice: write down what you remember, then what you missed.
type BrainDump = {
  id: string;
  date: string;
  area: Area;
  recalled: string;  // text
  gaps: string;      // text
  minutes: number;
};

// A spaced-repetition flashcard.
type Card = {
  id: string;
  front: string;
  back: string;
  area: Area;
  createdAt: string;
  dueDate: string;     // "YYYY-MM-DD"
  intervalDays: number;
  ease: number;
  reps: number;
  lapses: number;
};

type ReviewLog = {
  id: string;
  cardId: string;
  date: string;
  grade: "again" | "hard" | "good" | "easy";
  intervalBefore: number;
};

// A forecast with a probability, later scored with the Brier score.
type Prediction = {
  id: string;
  statement: string;
  probability: number; // 1-99 (percent)
  category: "Deal/VC" | "Market" | "Study" | "Personal";
  createdAt: string;
  resolveBy: string;              // "YYYY-MM-DD"
  outcome: true | false | null;   // null = not resolved yet
  resolvedAt?: string;
  note?: string;
};

type WeeklyReview = {
  weekStart: string;  // Monday, "YYYY-MM-DD" (primary key)
  learnedWithoutNotes: string;
  dataInsight: string;
  oneChange: string;
};

// Marks a day as belonging to condition A or B of a personal experiment.
type ExperimentTag = {
  date: string;
  experimentName: string;
  condition: "A" | "B";
};
```

## 4. Rules (non-negotiable)

1. **Mobile-first.** Design for a phone screen first; desktop is an afterthought.
2. **Large tap targets: minimum 44x44 px** for every button, tab, chip and input.
   Use the `.tap-target` helper class.
3. **Every log form must be completable in under 30 seconds.** Prefer taps over typing:
   default values, +/- steppers, chips, 1-5 rating rows. Optional fields come last.
4. **Never delete user data without an in-app confirmation step.** Every delete/reset/import-overwrite
   shows a confirm dialog inside the app that names exactly what will be lost. No silent wipes,
   no destructive migrations.
5. No network calls with user data. Everything stays on device.
6. **Real data is only entered on the production Vercel URL; the local dev URL is for testing only.**
   IndexedDB is per-origin, so `localhost:5173` and the Vercel URL hold two completely separate
   databases. Anything typed into the dev server is throwaway test data and will never appear in the
   real app. When demonstrating or testing a feature, use obvious fake values on the dev URL.
7. **Weekly JSON backup.** Once export exists (Phase 4), the owner exports a JSON backup once a week
   and saves it off-device. Reason: the data lives only in one phone's browser storage — clearing
   site data, uninstalling the PWA, or losing the phone destroys it with no server copy.
   Until Phase 4 ships, remind the owner that there is still no way to back up, so the data at risk
   is whatever has been logged so far.

## 5. Phase roadmap

Work on **one phase at a time**, in order. Do not build a later phase early.

- **Phase 1** — Check-in + focus blocks + Today screen.
  *(Also includes: scaffold, CLAUDE.md, 5-tab bottom navigation.)*
- **Phase 2** — Brain dump + spaced-review cards.
- **Phase 3** — Predictions + Brier score + calibration.
- **Phase 4** — Dashboard + weekly review + experiments + export/import.
- **Phase 5** — PWA (installable + offline) + deploy to Vercel + install on phone.
- **Phase 6** *(later)* — Claude weekly-analysis export + optional cloud sync.

### Current status

- [x] Phase 1 — step 1: scaffold + dependencies
- [x] Phase 1 — step 2: CLAUDE.md
- [x] Phase 1 — step 3: bottom tab navigation with 5 empty screens
- [ ] Phase 1 — step 4: daily check-in + focus block forms + real Today screen
- [x] Out-of-order: deployed to Vercel early (see section 9) so the app is usable on the phone
      without the laptop. PWA/offline/icons stay in Phase 5 as planned.

## 6. The 5 screens

| Tab | Vietnamese | English  | Purpose                                      |
| --- | ---------- | -------- | -------------------------------------------- |
| 1   | Hôm nay    | Today    | Daily check-in + focus blocks of today       |
| 2   | Ôn tập     | Review   | Brain dump + due cards (Phase 2)             |
| 3   | Dự đoán    | Predictions | Make and resolve predictions (Phase 3)    |
| 4   | Thống kê   | Dashboard   | Charts and trends (Phase 4)               |
| 5   | Cài đặt    | Settings | Export/import, experiments, reset (Phase 4)  |

## 7. Project structure

```
src/
  components/    # reusable UI pieces (BottomNav, ...)
  screens/       # one file per tab
  db/            # Dexie database + types (from Phase 1 step 4)
  lib/           # helpers (dates, formatting)
  App.tsx        # holds which tab is active
  main.tsx       # React entry point
  index.css      # Tailwind + global styles
```

## 8. Commands

```bash
npm run dev -- --host   # dev server, reachable from the phone on the same Wi-Fi
npm run build           # type-check + production build
npm run preview         # preview the production build
```

## 9. Deployment

- **GitHub repo (private):** https://github.com/duybaodo69-cell/learning-os-tracker
- **Production URL (Vercel):** https://learning-os-tracker-bao-dd5a.vercel.app
  This is the stable alias — it always points at the newest `main` deployment. Vercel also prints a
  per-deployment URL like `learning-os-tracker-93hgd7w5i-bao-dd5a.vercel.app`; that one is frozen to
  a single build and changes every push, so never bookmark it on the phone.
  Note: `learning-os-tracker.vercel.app` (no scope suffix) belongs to an unrelated project owned by
  someone else. It is not this app.
- **Deployment Protection must stay OFF.** Vercel enables "Vercel Authentication" by default, which
  redirects every visitor to a Vercel login page — that makes the app unusable on the phone. It lives
  in Settings -> Deployment Protection. Turning it off is safe here because the build contains no
  secrets and no user data; all data sits in the phone's IndexedDB and never reaches Vercel.
- **Auto-deploy:** Vercel is connected to the `main` branch. Every `git push` to `main`
  builds and deploys automatically — there is no manual deploy step.
- Vercel auto-detects Vite: build command `npm run build`, output directory `dist`.
  There is no `vercel.json` and none is needed.

### Git identity

The GitHub account is **duybaodo69-cell**. Commits must be authored with an email that GitHub
recognises for that account, otherwise they land in the repo but show as an unlinked author and
earn no contribution credit. Use the account's noreply address (already set globally and in this
repo, and it keeps the real address out of the public commit log):

```
git config user.name  "duybaodo69-cell"
git config user.email "288628278+duybaodo69-cell@users.noreply.github.com"
```

Do **not** use the personal Gmail address here — it is not registered on the GitHub account.
Check attribution at any time with:

```bash
gh api repos/duybaodo69-cell/learning-os-tracker/commits --jq '.[] | "\(.sha[0:7])  \(.author.login // "UNLINKED")"'
```

### Everyday workflow

```bash
npm run dev -- --host   # 1. build and test locally (throwaway data only — see rule 6)
npm run build           # 2. make sure it compiles before pushing
git add -A
git commit -m "..."     # 3.
git push                # 4. Vercel deploys in ~1 minute
```

If a push produces a broken deploy, the previous deployment is still live in Vercel's
"Deployments" list and can be promoted back with **Instant Rollback** — the production URL
never has to stay broken.

**Note:** deploying does not back up the data. The data lives in the phone's IndexedDB,
not on Vercel. See rule 7.
