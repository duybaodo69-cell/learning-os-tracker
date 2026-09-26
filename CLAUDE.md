# Learning OS Tracker

## 1. Mục đích dự án (Project purpose)

A personal learning-tracker **PWA**, mobile-first, used on the owner's phone many times per day.
Owner: a finance student. Goal: log study/deep-work data fast, review it with spaced repetition,
practise calibrated forecasting, and see the numbers on a dashboard.

**Hard requirement: every log action must take under 30 seconds.**

- UI language: **Vietnamese**. Keep standard English terms as-is: "deep work", "retrieval",
  "Brier score", "area", "PWA".
- Code, comments, file names, type names: English.
- No backend of our own. All data lives on the device (IndexedDB). Login is **optional**
  (Part C, Dexie Cloud sync); without it the app is fully local as before.
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
  id: string;          // primary key = "#" + date (src/db/keys.ts, Dexie v6)
  date: string;        // "YYYY-MM-DD", one per day
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
  capturedNotes?: string[]; // "Việc chen ngang" typed during a timed session (Dexie v5)
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
  id: string;         // primary key = "#" + weekStart (Dexie v6)
  weekStart: string;  // Monday, "YYYY-MM-DD"
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
   **Never add `maximum-scale=1` or `user-scalable=no` to the viewport meta.** It stops iOS
   zooming on focused inputs, but it also blocks the user's own pinch-to-zoom, which is an
   accessibility failure. `src/index.css` sets `font-size: max(16px, 1em)` on every
   `input`/`select`/`textarea` instead — iOS only zooms when a control is under 16px.
   That rule sits outside every `@layer`, so it beats Tailwind size utilities in both
   directions: `text-xs` on a control is ignored, and so is `text-lg`. To make a control
   larger, set the font size on its wrapper and `1em` inherits it.
3. **Every log form must be completable in under 30 seconds.** Prefer taps over typing:
   default values, +/- steppers, chips, 1-5 rating rows. Optional fields come last.
4. **Never delete user data without an in-app confirmation step.** Every delete/reset/import-overwrite
   shows a confirm dialog inside the app that names exactly what will be lost. No silent wipes,
   no destructive migrations.
5. No network calls with user data, **except Dexie Cloud sync, and only after the owner has
   signed in** from Settings -> Đồng bộ. Before sign-in, and always in demo mode, nothing
   leaves the device (the local and demo stores do not even load the cloud addon).
6. **Real data is only entered on the production URL; the local dev URL is for testing only.**
   Production is https://learning-os-tracker.duybaodo69.workers.dev
   IndexedDB is per-origin, so `localhost:5173` and the production URL hold two completely separate
   databases. Anything typed into the dev server is throwaway test data and will never appear in the
   real app. When demonstrating or testing a feature, use obvious fake values on the dev URL.
7. **Weekly JSON backup.** Settings -> "Xuất dữ liệu (JSON)". The owner exports once a week and
   saves the file off-device. Reason: the data lives only in one phone's browser storage — clearing
   site data, uninstalling the PWA, or losing the phone destroys it with no server copy.
   The Today screen nags after 7 days without an export.

## 5. Phase roadmap

Work on **one phase at a time**, in order. Do not build a later phase early.

- **Phase 1** — Check-in + focus blocks + Today screen.
  *(Also includes: scaffold, CLAUDE.md, 5-tab bottom navigation.)*
- **Phase 2** — Brain dump + spaced-review cards.
- **Phase 3** — Predictions + Brier score + calibration.
- **Phase 4** — Dashboard + weekly review + experiments + export/import.
- **Phase 5** — PWA (installable + offline) + install on phone. **Done.**
- **Phase 6** *(later)* — Claude weekly-analysis export + optional cloud sync.

### Current status

- [x] Phase 1 — step 1: scaffold + dependencies
- [x] Phase 1 — step 2: CLAUDE.md
- [x] Phase 1 — step 3: bottom tab navigation with 5 empty screens
- [x] Phase 1 — step 4: daily check-in + focus block forms + real Today screen
- [x] **Phase 1 COMPLETE.**
- [x] **Phase 2 COMPLETE** — brain dump, cards, review queue, 10-minute mode.
- [x] **Phase 3 COMPLETE** — predictions, Brier score, calibration chart, pre-mortem.
- [x] **Phase 4 COMPLETE** — dashboard, weekly review, experiments, JSON export/import.
- [x] **Phase 5 COMPLETE** — PWA: installable, offline, icons, version line.
- [x] **Redesign COMPLETE** (design/BRIEF.md Part A + B) — dark "Quantitative Protocol" theme.
- [x] **Part C: cloud sync (Dexie Cloud)** — PROD https://zzmteuzif.dexie.cloud (whitelist: production
      URL only), DEV https://zq98wk7oy.dexie.cloud (whitelist: http://localhost:5173 only).
- [ ] Remaining: Phase 6 (later) — Claude weekly-analysis export.
- [x] Out-of-order: deployed early (see section 9) so the app is usable on the phone
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
  components/
    ui.tsx             # Card, Button, Field, RatingRow, ChipGroup, Counter, Toggle, inputs
    BottomNav.tsx      # the 5-tab bar
    ScreenShell.tsx    # sticky header + scrollable body, used by every screen
    ConfirmDialog.tsx  # the rule-4 delete confirmation
    ProtocolBanner.tsx
    CheckinForm.tsx
    FocusBlockForm.tsx
  screens/             # one file per tab, plus FocusSession.tsx (full-screen timer)
  config/
    protocolPhases.ts  # EDIT HERE to change the 12-week schedule
  db/
    types.ts           # Area, Rating, DailyCheckin, FocusBlock
    db.ts              # Dexie; opens one of three stores (local / cloud / demo)
    store.ts           # chooseStore(): which store to open (tested)
    keys.ts            # "#date" primary keys for checkins / weekly reviews
    demoData.ts        # sample data, demo database only
  lib/
    dates.ts           # Asia/Ho_Chi_Minh dates, sleep hours, formatting, ids
    timer.ts           # start/stop timer backed by a stored timestamp
    prefs.ts           # remembers the last-used area
    useToday.ts        # today's date, recomputed past midnight
    persistence.ts     # navigator.storage.persist() + status
    areaColors.ts      # one fixed colour per area (Today + charts)
    scheduling.ts / calibration.ts / metrics.ts / backup.ts  # tested pure logic
    sync.ts            # Vietnamese sync status + login messages (tested)
    upload.ts          # planUpload: which local rows are new to the account (tested)
    cloudUpload.ts     # reads the local store, adds only new rows to the account
  config/cloud.ts      # Dexie Cloud database URLs (dev + prod; not secret)
  App.tsx              # holds which tab is active
  main.tsx             # React entry point
  index.css            # theme tokens, fonts, .tap-target, font-num, 16px input floor
```

### Phase 1 decisions worth knowing

- **Sleep across midnight.** `computeSleepHours` adds 24h when the wake time is at or before the
  bed time, so 23:30 -> 06:30 is 7h, not -17h. Verified against 8 cases including 00:00 and 12:00.
- **The timer stores a start timestamp, never a ticking counter.** Browsers freeze timers in
  background tabs, so counting seconds would lose time whenever the phone is locked or the user
  switches apps. Elapsed time is always `now - startedAt`. The on-screen clock is display only.
- **Demo mode is a second Dexie database** (`learning-os-demo`), not a flag on the rows. Toggling
  it reloads the page because the database is chosen once at startup. Real data is never touched,
  and every sample note is tagged `[MẪU]`. `demoData.ts` seeds all five tables; when a phase adds
  a table, seed it there too or demo mode shows that screen empty and looks broken.
- **`useLiveQuery` (dexie-react-hooks)** re-renders screens automatically when data changes; there
  is no manual refresh anywhere.
- **`useLiveQuery` returns `undefined` while loading, and `Table.get()` resolves to `undefined`
  when the row is missing.** Those are different states sharing one value, and conflating them
  shipped a bug where the check-in form never rendered. Always map "missing" to `null`:
  `useLiveQuery(async () => (await db.checkins.get(d)) ?? null, [d])`, then
  `undefined` = loading, `null` = absent, object = found.
- **New tables need a new `this.version(n).stores({...})`** in `db.ts`. Never edit version 1 in
  place — that breaks existing installs. Phase 2 adds `brainDumps`, `cards`, `reviewLogs` this way.
- **The protocol schedule starts 2026-09-28.** Before that date `findProtocolPhase` returns null
  and the banner is intentionally hidden.

### Phase 2 decisions worth knowing

- **All scheduling lives in `src/lib/scheduling.ts`** as pure functions, covered by
  `scheduling.test.ts` (28 tests, `npm test`). Change intervals there and nowhere else.
  Wrong intervals fail silently — the card still appears, just on the wrong day — so the tests
  are the safety net.
- **Ease is currently fixed at 2.5.** The four rules specified were interval-only, so no grade
  changes ease. Real SM-2 lowers ease on a lapse; the constants at the top of the file are where
  that would go.
- **`again` resets `reps` to 0**, so a forgotten card walks the 1-day/3-day ladder again instead of
  jumping back to a long interval. This went beyond the stated rules; the owner reviewed it and
  confirmed it on 2026-09-25. Do not revert without asking.
- **`easy` is floored at `good + 1` day.** Without it, `round(1 x 2.5 x 1.3)` and the first ladder
  step collide and the Easy button does nothing on a new card. Also confirmed by the owner
  on 2026-09-25.
- **The review queue is frozen when the session starts** (`queueIds`), not recomputed per render.
  A live query would drop each card the moment it is graded and reshuffle the order mid-session.
- **Grading writes the card and the ReviewLog in one Dexie transaction** so history can never
  disagree with the card's state.
- **Editing a card's text never touches its schedule.** Fixing a typo must not reset weeks of
  spaced repetition.
- **Deleting a card keeps its ReviewLogs** so Phase 4 statistics still reflect work actually done.
- **Cards made from brain-dump gaps have an empty back on purpose.** Writing the answer yourself
  is the part that teaches; the Cards tab surfaces the count of unfilled backs.
- **Both countdowns (focus timer, 10-minute review) derive from a stored start timestamp.** Never
  reintroduce a per-second accumulator: background tabs freeze and the count drifts.

### Phase 3 decisions worth knowing

- **All prediction maths lives in `src/lib/calibration.ts`**, covered by `calibration.test.ts`
  (34 tests). Brier and calibration answer different questions: Brier is accuracy, calibration is
  whether the stated number is trustworthy. Someone who always says 50% is perfectly calibrated
  and useless, which is why both are shown.
- **Empty averages return `null`, never 0.** A Brier of 0 means flawless, so defaulting to 0 would
  read as a perfect score when nothing has been graded.
- **Bucket edges are lower-inclusive, upper-exclusive, except the last bucket includes 100.** Every
  probability lands in exactly one bucket; the boundary cases are tested.
- **`buildCalibration` always returns all five buckets**, empty ones included, so the chart and
  table never reshuffle columns as data arrives.
- **Recharts is lazy-loaded** (`lazy(() => import(...))` in PredictionsScreen). Loading it eagerly
  put the main bundle at 720 kB for a screen most opens never touch; it is now a 321 kB chunk
  fetched only when the Điểm số tab opens. Do the same for Phase 4 dashboard charts.
- **The under-20 note is a nudge, not a lock.** Charts still render below the threshold; the note
  only warns against drawing conclusions from a small sample.
- **Pre-mortem only renders for category "Deal/VC"**, and switching category away clears the field
  on save so no orphan text survives.

### Phase 4 decisions worth knowing

- **All dashboard maths lives in `src/lib/metrics.ts`** (tested) and backup parsing in
  `src/lib/backup.ts` (tested). 120 tests total across the four lib files.
- **Empty means `null`, missing means 0.** Averages return `null` when there is nothing to average;
  only genuine sums return 0. Mixing them up draws charts that lie.
- **`mondayOf` handles Sunday correctly.** `getDay()` returns 0 for Sunday, so a naive `day - 1`
  pushes Sunday into the *next* week. Sunday goes back 6 days. This is tested.
- **Sleep is paired with the SAME day's deep work** (`buildSleepVsSameDayFocus`). A check-in
  dated D is filled in on the morning of D and describes the night before it, so it is the sleep
  that fuelled day D. The first version paired it with D+1, which was off by one day.
- **Retention only counts reviews where `intervalBefore >= 3`.** Cards resurfacing after one day
  are remembered by everyone and would inflate the number.
- **Consistency counts days, never streaks.** A streak that resets to zero after one missed day
  punishes the owner and is how habit trackers get abandoned.
- **Baseline comparison is per-week normalised.** The baseline window is 14 days; comparing its
  totals against a 7-day week would make every week look like a regression.
- **Export tries `navigator.share` first, then falls back to `<a download>`.** On iOS the share
  sheet is effectively the only way to get a file out of an installed PWA. A cancelled share is
  not treated as a successful backup.
- **Import is the only destructive path in the app.** It shows a per-table preview of existing vs
  incoming counts, then a confirm dialog naming both totals, and runs inside one Dexie transaction
  so a failure leaves the old data intact.
- **Recharts is shared between the calibration and dashboard charts** and Vite splits it into its
  own chunk. Keep new charts inside `DashboardCharts.tsx` rather than adding more lazy entries.

### Phase 5 decisions worth knowing

- **PWA config lives in `vite.config.ts`** under `VitePWA`. Name "Learning OS", short name
  "LearnOS", theme/background `#0c0e12` (the app canvas), portrait, `display: standalone`,
  `registerType: "autoUpdate"`.
- **Icons are generated PNGs in `public/icons/`**: 192, 512, a padded 512 `maskable`, a 180
  apple-touch-icon and a 64 favicon. Three ascending cyan bars on the canvas colour, no text and
  no emoji so they stay legible at 48px. Regenerate all sizes from one source if the mark changes —
  iOS ignores the manifest and uses `apple-touch-icon` from `index.html`.
- **`maximumFileSizeToCacheInBytes` is raised to 4MB** so the ~308 kB Recharts chunk is precached.
  Without it workbox skips large files and the Thống kê tab breaks offline.
- **Offline was verified by killing the server, not by trusting the config.** Reload with the
  origin dead: all five tabs render and the lazy chart chunk still loads.
- **The service worker only runs in a production build** (`devOptions.enabled: false`). Test PWA
  behaviour with `npm run build && npx vite preview`, never with `npm run dev`.
- **`__BUILD_DATE__` is injected by `define` in `vite.config.ts`** and shown in Settings, so the
  owner can tell whether an update actually landed. It must be `JSON.stringify`-ed or Vite pastes
  it in as a bare identifier.
- **`autoUpdate` means a new deploy is picked up on the next cold start.** If the version line
  looks stale, fully close the installed app and reopen it.

### Post-Phase-5 fixes worth knowing

- **Never read "today" once at render.** Use `useToday()` (`src/lib/useToday.ts`), which
  recomputes on `visibilitychange`, window `focus` and every 60 s. When SAVING a new check-in or
  block, stamp `todayISO()` at save time; edits keep their original date.
- **Week-over-week compares equal day counts** (`sameSpanLastWeek`): Monday..today against
  Monday..same weekday last week. The card says "so cùng số ngày".
- **`navigator.storage.persist()` runs on startup** (`src/lib/persistence.ts`); Settings shows the
  result. The helper never throws — a rejection there must not blank the app.
- **"Khó" never exceeds "Được".** At a learning step it repeats the step without advancing
  `reps`; later it is clamped to the good interval. The invariant again <= hard <= good < easy is
  tested exhaustively.
- **Chart margins are 0 left / 14 right** with Y-axis widths sized to the widest label. Negative
  margins clipped labels at 390px.
- **Demo-mode exports are `learning-os-DEMO-<date>.json`** and do not update the last-export date.
- **Timer extras:** a "+1 phân tâm" button counts distractions live (stored beside the start
  timestamp, reset by `startTimer`); runs over 180 min ask for confirmation before prefilling.
- **A running timer takes over the whole app** (`src/screens/FocusSession.tsx`, chosen in
  `App.tsx` when `getTimerStart()` is set) and hides the tab bar. The finish form is a bottom
  sheet opened only by "Hoàn thành phiên"; closing it leaves the timer running. "Huỷ phiên"
  confirms, then `clearSession()` wipes timestamp, distractions and captures.
- **"Việc chen ngang" captures** live in localStorage during the session, each one also adds a
  distraction, and they are saved to `FocusBlock.capturedNotes`. Editing a block keeps them.
- **Manual "+ Block" start time defaults to now minus the selected minutes**, following the
  minute chips until the user edits the time field.
- **Component tests use happy-dom** via `// @vitest-environment happy-dom` at the top of the file.

### Redesign (Quantitative Protocol) — rules to keep

- **Colours are CSS variables** on `:root` in `src/index.css`, wired into Tailwind through
  `@theme inline`: `canvas`, `surface`, `surface-2`, `line`, `ink`, `ink-2`, `ink-3`, `accent`,
  `on-accent`, `indigo`, `indigo-ink`, `good`, `warn`, `bad`, `bad-ink`. Use these class names
  (`bg-surface`, `text-ink-2`...), never raw Tailwind palette colours. A light theme later only
  needs to override the variables.
- **Two themes, one set of variable names.** Dark (Quantitative Protocol) is the default;
  `:root[data-theme="light"]` in `src/index.css` restores the previous white/blue palette. The
  switch is "Chế độ tối" in Settings (`src/lib/theme.ts`, saved in localStorage as a per-device
  preference, not in backups). An inline script in `index.html` applies the saved theme before
  first paint to avoid a dark flash; keep its key and colours in sync with `theme.ts`. Any new
  colour must be added to BOTH blocks.
- **Contrast is measured, not eyeballed.** `ink-3` is `#8792a5` (>= 5.3:1 on every surface)
  instead of the design's `#475569`, which measured 2.2-2.55:1. The light theme likewise swaps
  the old slate-400 / green-600 / amber-600 text colours (2.3-3.3:1) for `#5b6678`, green-700 and
  amber-700. A full-page text scan of all five tabs gave a minimum of 4.58:1 (light) and 5.26:1
  (dark). Red text uses `bad-ink`, indigo
  text uses `indigo-ink`. Chart bars must reach 3:1; Recharts legends are forced to `ink-2`
  because by default they inherit the series colour.
- **Minimum text size is 12px** everywhere, including chart axes and legends. No `text-[10px]`
  or `text-[11px]`.
- **Fonts are self-hosted via @fontsource** (precached, so offline works): Be Vietnam Pro for all
  text, Geist latin subset only for numerals through the `font-num` utility.
- **Colour means state, not decoration:** good = improved, warn = attention, bad = worse or
  delete, indigo = category. Distraction counts use a neutral tag.
- **Statistics honesty:** never show p-values or "significant". Experiments hide per-arm results
  until both arms have >= 10 days ("Chưa đủ ngày: A x/10 · B y/10"). Energy -> deep work needs
  >= 5 days per level, otherwise greyed "sơ bộ (n=x)". Correlation r is always "sơ bộ" with n.
- **One verdict per comparison.** Brier colour, summary sentence and `describeBrier` all use
  `fiftyVerdict`, which compares at the displayed 3-decimal precision.
- **Stats period tabs** (`periodRanges`) always compare equal spans; baseline comparisons use
  `normalisePerWeek` for cumulative metrics.
- **No decorative jargon** from the mockups (SYS_ACTIVE, EXP ids, "Brier Loss"...). The "Sao chép
  tóm tắt tuần cho Claude" button in the stats mockup is Phase 6 and was deliberately not built.

### Part C (Dexie Cloud sync) — rules to keep

- **Three separate stores** (`src/db/store.ts`): `learning-os` (local, default),
  `learning-os-cloud` (after sign-in, has the addon), `learning-os-demo` (never syncs).
  Demo always wins. Switching store reloads the page, like demo mode. The flag is
  `learning-os:sync` in localStorage.
- **`requireAuth: true` on the cloud store is load-bearing.** Dexie Cloud uploads rows
  created before login ("unauthorized user" data) automatically on login. Requiring auth
  means the cloud store is never written before login, so nothing is ever merged silently.
- **Old data reaches the account only through "Đưa dữ liệu trên máy này lên tài khoản"**
  (Settings, `cloudUpload.ts`). It reuses the backup path (`collectBackupFrom` +
  `normaliseBackupData`), shows a per-table preview, confirms, then ADDS only keys the account
  lacks, in one transaction. Never clear or overwrite cloud tables here: a delete on the cloud
  store deletes on every device. The local store is never touched. Upload is disabled until
  the first sync is `in-sync`, otherwise every row would look "new".
- **Primary keys:** Dexie Cloud needs globally unique string keys. UUID tables are fine;
  `experimentTags.key` contains the experiment UUID, so it is fine. Check-ins and weekly
  reviews use private IDs `"#" + date` (unique per user, so the same day on two devices is
  one row). Dexie v6 copies the old tables into `dailyCheckins` / `weekReviews`, v7 drops the
  old ones; `db.test.ts` runs that upgrade on a fake v5 database.
- **Backup files keep the table names `checkins` / `weeklyReviews`** and format version 1;
  `normaliseBackupData` fills missing ids and strips Dexie Cloud fields (`owner`, `realmId`,
  `$ts`). Old files still import. In cloud mode, "Nhập" warns that it overwrites every device.
- **Login UI is ours** (`customLoginGui: true`, `CloudLoginDialog.tsx`, Vietnamese, messages via
  `translateLoginAlert`). Cancelling email/OTP turns sync off and returns to the local store.
- **Evaluation users stop syncing after 30 days.** The owner's user must be switched to
  production in the Dexie Cloud manager (free for up to 3). Settings warns via `evalWarning`.
- **Two cloud databases:** DEV (localhost, test email only) and PROD (production URL). Never
  whitelist localhost on the PROD database. `dexie-cloud.json` / `dexie-cloud.key` are
  gitignored — the key is a secret.
- Sync runs in the page only (no service-worker sync); the app syncs whenever it is open.

## 8. Commands

```bash
npm run dev -- --host   # dev server, reachable from the phone on the same Wi-Fi
npm run build           # type-check + production build
npm test                # unit tests (255: lib/ logic, db upgrade, useToday, theme)
npm run lint            # oxlint
npm run preview         # preview the production build
```

## 9. Deployment

- **Host:** Cloudflare Workers (static assets). **Not Vercel** — see "Why not Vercel" below.
- **Production URL:** https://learning-os-tracker.duybaodo69.workers.dev
- **GitHub repo (private):** https://github.com/duybaodo69-cell/learning-os-tracker
- **Auto-deploy:** Cloudflare is connected to the `main` branch. Every `git push` to `main`
  runs `npm run build` then `npx wrangler deploy`. There is no manual deploy step.
- **Config:** `wrangler.jsonc` serves `./dist` with `not_found_handling: single-page-application`,
  so an unknown path returns `index.html` instead of a 404.
- **`.nvmrc` pins Node 22.** Build hosts default to Node 18, but Vite 8 requires
  `^20.19.0 || >=22.12.0`. Deleting `.nvmrc` breaks every future build.
- **Never enable "Protect with Cloudflare Access"** on this project. It puts a login wall in front
  of the app, which makes it unusable on the phone and will break offline mode in Phase 5.
  The app holds no secrets and no user data, so it does not need one.

### Why not Vercel

The first deployment went to Vercel and had to be abandoned. Vercel's "Deployment Protection ->
Vercel Authentication" was on by default and covered the production alias, redirecting every
visitor to a Vercel login page. On this account the setting was locked behind a paid plan, so it
could not be turned off. If Vercel is ever reconsidered, verify that production is publicly
reachable *before* relying on it.

Do not reuse `learning-os-tracker.vercel.app` — that domain belongs to an unrelated project owned
by someone else, not this app.

### Verifying a deploy

Check the site the way a stranger would — from outside, with no cookies — not from a browser that
is already logged in to the host. A logged-in browser hides exactly the login-wall problem that
killed the Vercel attempt.

```bash
curl -s -o /dev/null -w "%{http_code} %{redirect_url}
"   https://learning-os-tracker.duybaodo69.workers.dev/
# 200 and no redirect = genuinely public. A 3xx to a login page = blocked.
```

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
git push                # 4. Cloudflare builds and deploys in ~2 minutes
```

If a push produces a broken deploy, roll back in the Cloudflare dashboard under the project's
**Deployments** tab, or just fix the code and push again — the production URL never has to stay
broken. Running `npm run build` locally before pushing catches most breakage first.

**Note:** deploying does not back up the data. The data lives in the phone's IndexedDB,
not on the host. See rule 7.
