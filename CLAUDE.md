# Learning OS Tracker

## 1. Mục đích dự án (Project purpose)

A personal learning-tracker **PWA**, mobile-first, used on the owner's phone many times per day.
Owner: a finance student. Goal: log study/deep-work data fast, review it with spaced repetition,
practise calibrated forecasting, and see the numbers on a dashboard.

**Hard requirement: every log action must take under 30 seconds.**

**Product scope lives in `docs/PRODUCT.md`** (vision, mission, the problem, metrics, weekly
schedule, rules, build order, what NOT to build — agreed with the owner on 2026-09-27). It is
imported below, so it is always in context. A feature that does not serve its "Vấn đề" section is
not built. Its build order (Đợt 1 → 3) replaces the old phase roadmap for all new work.
Ready-made kickoff prompts for each round are in `docs/PROMPTS.md`.

@docs/PRODUCT.md

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
  ielts?: IeltsSession;     // only for area "IELTS" (Dexie v8, Đợt 1)
};

// The IELTS part of a focus block. `test` absent = "Không làm đề", or Writing/Speaking.
type IeltsSession = {
  skill: "Listening" | "Reading" | "Writing" | "Speaking";
  test?: {
    book: number;       // Cam 10-19
    test: number;       // 1-4
    parts: number[];    // Listening section 1-4 / Reading passage 1-3
    questions: number;  // default 10 per section, 13/13/14 per passage, editable
    correct: number;
    errors: [number, number, number, number]; // meaning depends on skill, see Đợt 1 rules
  };
  dictationMinutes?: number; // Listening only
  aiBand?: number;           // Writing/Speaking only, 0-9 step 0.5
};

// A mock test (Dexie v8). L/R bands and overall are computed, never stored.
type MockTest = {
  id: string;
  date: string;
  source: "home" | "center" | "ai";
  listeningRaw?: number; // 0-40
  readingRaw?: number;   // 0-40
  writingBand?: number;
  speakingBand?: number;
  note?: string;
};

// One postponement of the 9:30 IELTS frame (Dexie v9, Đợt 2). One row per day.
type AnchorDelay = {
  id: string;     // "#" + date (src/db/keys.ts anchorDelayId), like check-ins
  date: string;
  target: "after-class" | "evening" | "tomorrow";
  reason: "school" | "work" | "personal" | "other";
  at: string;     // "HH:mm" when it was tapped
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
  brainDumpId?: string; // set when the card was made from a brain dump's gaps
  source?: "ielts-listening" | "ielts-vocab" | "writing" | "manager"; // Đợt 3
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
  lastChangeResult?: "yes" | "partly" | "no"; // did LAST week's oneChange happen?
  note?: string;   // Đợt 3, optional
  plan?: {         // Đợt 3: plan for NEXT week, chosen on this week's Sunday
    listening: number; reading: number; // parts (sections / passages)
    listeningFrom?: { book: number; test: number; part: number };
    readingFrom?: { book: number; test: number; part: number };
    light: boolean;
  };
};

// A deadline typed in during Sunday planning (Dexie v10). Fixed dates live in schedule.ts.
type Deadline = { id: string; date: string; title: string };

// Marks a day as belonging to condition A or B of a personal experiment.
type ExperimentTag = {
  date: string;
  experimentName: string;
  condition: "A" | "B";
};
```

## 4. Rules (non-negotiable)

1. **Mobile-first.** Design for a phone screen first. Wider screens get a left rail / sidebar
   and two columns on Ôn tập + Thống kê through CSS only (see "Responsive layout" in section 7).
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
   The focus-session YouTube player loads YouTube (youtube-nocookie.com) only when the owner
   picks a YouTube video; it sends no study data.
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
- [x] **Calm redesign (Stitch, 2026-09-27)** — all 5 tabs, dark + light.
- [x] **Audit fixes (2026-09-27)** — batch 1 + 2 of audit/2026-09-27/REPORT.md (F01–F10).
- [x] **Responsive + display size + focus fullscreen (2026-09-27)** — phone / tablet / desktop
      layouts, 100/125/150% display size, landscape fullscreen focus session.
- [x] **Part C: cloud sync (Dexie Cloud)** — PROD https://zzmteuzif.dexie.cloud (whitelist: production
      URL only), DEV https://zq98wk7oy.dexie.cloud (whitelist: http://localhost:5173 only).
- [x] **Product interview (2026-09-27)** — `docs/PRODUCT.md`: IELTS 7.5 (March 2027) is the one
      self-assigned goal; 9:30 daily anchor; predictions + experiments to be hidden.
- [x] **`docs/PRODUCT.md` Đợt 1 (2026-09-27)** — IELTS start shortcut + "Khung 9:30: x/7",
      IELTS finish step (skill, next test, correct, 4 error types per skill, dictation),
      mock-test results in Ôn tập → Thi thử.
- [x] **`docs/PRODUCT.md` Đợt 2 (2026-09-28)** — countdown + light-week notice (schedule.ts
      replaces the 12-week protocol), "dời khung" after 10:30, IELTS tab replaces Dự đoán,
      Dự đoán + Thí nghiệm moved to Cài đặt → "Công cụ khác".
- [x] **`docs/PRODUCT.md` Đợt 3 (2026-09-28)** — IELTS charts at the top of Thống kê, Sunday
      planning (replaces the 3-question weekly review), deadlines, cards with a source,
      "Sao chép prompt chấm Writing".
- [ ] **Next:** use it until thi thử 1 (15/11); after the 12/12 gate use the "Khi cần điều
      chỉnh kế hoạch" prompt in `docs/PROMPTS.md`.
- [ ] Remaining: Phase 6 (later) — Claude weekly-analysis export.
- [x] Out-of-order: deployed early (see section 9) so the app is usable on the phone
      without the laptop. PWA/offline/icons stay in Phase 5 as planned.

## 6. The 5 screens

| Tab | Vietnamese | English  | Purpose                                      |
| --- | ---------- | -------- | -------------------------------------------- |
| 1   | Hôm nay    | Today    | Daily check-in + focus blocks of today       |
| 2   | Ôn tập     | Review   | Brain dump + due cards (Phase 2)             |
| 3   | IELTS      | IELTS    | Next test + start, sessions, mock tests, errors (Đợt 2; replaced Dự đoán, now in Cài đặt → Công cụ khác) |
| 4   | Thống kê   | Dashboard   | Charts and trends (Phase 4)               |
| 5   | Cài đặt    | Settings | Export/import, experiments, reset (Phase 4)  |

## 7. Project structure

```
src/
  components/
    ui.tsx             # Card, Button, Field, RatingRow, ChipGroup, Counter, Toggle, inputs
    AppNav.tsx         # the 5-tab bar: bottom on phones, left rail / sidebar on wide screens
    ScreenShell.tsx    # sticky header + scrollable body, used by every screen
    ConfirmDialog.tsx  # the rule-4 delete confirmation
    CountdownCard.tsx  # countdown card: big days number, stretch bar, "Đường tới 7.5" timeline,
                       # light-week row (Hôm nay + tab IELTS)
    IeltsStartCard.tsx # "Bắt đầu IELTS" + Khung 9:30 x/7 + this week's plan (Hôm nay + tab IELTS)
    WeeklyReviewCard.tsx  # Sunday planning form (3 steps) + DeadlineList + ThisWeekChange
    DeadlinesSoon.tsx  # Hôm nay: deadlines in the next 72 hours
    QuickCardRow.tsx   # "+ Thẻ ôn từ buổi này" inside the IELTS finish form
    WritingPromptButton.tsx  # copies the Writing grading prompt (no network)
    AnchorDelayRow.tsx # "dời khung" question / "đã dời" line on Hôm nay
    CheckinForm.tsx
    FocusBlockForm.tsx
    IeltsSessionFields.tsx  # IELTS part of the block/finish form (area IELTS only)
    MockTestView.tsx   # IELTS tab → Thi thử: mock-test form + history
  screens/             # one file per tab (IeltsScreen = tab 3), FocusSession.tsx (timer),
                       # PredictionsScreen / ExperimentsScreen (Cài đặt sub-screens)
  config/
    schedule.ts        # EDIT HERE to change mock-test / exam dates and the baseline window
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
    validation.ts      # shared form + backup checks (tested)
    brainDump.ts / weeklyReview.ts  # pure helpers for those screens (tested)
    drafts.ts          # localStorage drafts for long forms (brain dump)
    useSubmit.ts       # save wrapper: double-tap lock + error, form stays open
    uiScale.ts         # display size 100/125/150% (root font-size, per device, tested)
    viewport.ts        # keyboard inset (visualViewport) + safe-area overlay padding (tested)
    fullscreen.ts      # focus-session fullscreen + landscape lock, honest notices (tested)
    sync.ts            # Vietnamese sync status + login messages (tested)
    upload.ts          # planUpload: which local rows are new to the account (tested)
    cloudUpload.ts     # reads the local store, adds only new rows to the account
    ielts.ts           # IELTS: band table, overall rounding, next test, 9:30 anchor, form draft,
                       # error totals (tested)
    plan.ts            # countdown, light week, when to ask "dời khung", delays per week (tested)
    weekPlan.ts        # Sunday planning: look back, suggestions, proposed plan, deadlines (tested)
    ieltsStats.ts      # Thống kê IELTS: hours, Listening %, mocks, errors per 10, anchor (tested)
    cardSources.ts     # card sources, filters, quick card builder (tested)
    writingPrompt.ts   # the Writing grading prompt + clipboard helper
  config/cloud.ts      # Dexie Cloud database URLs (dev + prod; not secret)
  config/backgrounds.ts  # focus-session background presets + source/licence of each
public/backgrounds/    # 9 MP4 loops + posters/thumbs + CREDITS.md (licences)
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
- **The 12-week protocol schedule was replaced in Đợt 2** by `src/config/schedule.ts`
  (PRODUCT.md mục 5 milestones). `BASELINE` there keeps the old phase-1 window 2026-09-28 →
  2026-10-11 so the Thống kê baseline comparison did not move.

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

### Calm redesign (Stitch, 2026-09-27) — rules to keep

- **Source:** Stitch project "Learning OS — UX gọn 2026-09" (design system "Learning OS — Calm
  Protocol", same colour tokens and fonts). The owner approved all 5 tabs and asked for BOTH themes.
  The focus-session screen and its backgrounds were deliberately left as they were.
- **Calm rules:** sentence-case titles and section labels (no ALL-CAPS tracking); ONE filled
  accent button per screen (weekly-review "Bắt đầu" is secondary); Segmented = `bg-track` rail +
  `bg-thumb` selected cell with accent text (tokens in both theme blocks); long area lists use
  `ChipGroup scroll` (one horizontal row); warnings are one slim `Notice` row, not yellow boxes;
  rarely read content goes behind `Disclosure` / `<details>`; settings use `ListGroup` + `ListRow`.
- **Delete buttons live inside edit forms** (blocks on Hôm nay, predictions), never on every list
  row. They still go through `ConfirmDialog` (rule 4) and close the form after deleting.
- **Sheets and dialogs use `bg-surface`**, never `bg-surface-2`: unselected chips, rating buttons
  and secondary buttons are `bg-surface-2` and vanish on a sheet of the same colour.
- **Light theme contrast:** `--good` is green-800 and `--warn` amber-800 because tinted tags
  (`bg-good/12`) dropped green-700 / amber-700 text to 4.2:1. Segmented badges are solid accent.
  A text scan of 11 views (5 tabs + check-in/block forms, review session, brain dump, cards,
  score) gave min 5.26:1 dark and 4.62:1 light. Off switches use `bg-ink-3/45` so they show on white.

### Audit fixes (2026-09-27) — rules to keep

- **Source:** `audit/2026-09-27/REPORT.md` (external audit, untracked folder). Its
  `defects.test.tsx` asserts the OLD bugs, so `vite.config.ts` excludes `audit/**` from
  vitest. The regression tests asserting correct behaviour are `src/auditFixes.test.tsx`.
- **Deploys are gated by tests.** `npm run build` = `oxlint && vitest run && tsc -b &&
  vite build`, and Cloudflare runs `npm run build`, so a failing test blocks the deploy.
  Tests pass under TZ=UTC and TZ=America/Los_Angeles (the build host is UTC).
- **Validation lives in `src/lib/validation.ts`** (tested). HTML `min`/`max`/`type` do NOT
  stop the Save button; every form checks in its handler and shows `FieldError` under the
  field: block minutes 1–600 integer, valid HH:mm, valid resolve date not before createdAt.
- **Every save goes through `useSubmit`** (`src/lib/useSubmit.ts`): a ref lock blocks
  double taps in the same event loop, the form stays open with its text on failure, and
  parents close the form only after the write resolves. Review grading has its own ref lock,
  re-reads the card inside the transaction, and only advances after success.
- **Backup import validates every row** (`findRowErrors` in `backup.ts`) in `parseBackup`
  AND again in `importBackup`: types, real dates, areas, enums, duplicate keys; errors name
  table + row + field. It still ACCEPTS values the pre-fix forms could have saved (empty
  times, empty resolve date, large minutes, `sleepHours` null from NaN — recomputed), so an
  old export of the owner's own data always restores. Never tighten that without a migration.
- **Brain dump:** one "Lưu" writes the dump and its draft cards in one transaction
  (`buildBrainDump`, cards carry `brainDumpId`). The unsaved text is a localStorage draft
  (`learning-os:braindump-draft`, `src/lib/drafts.ts`) so switching views or reloading
  never loses it. History (`BrainDumpHistory.tsx`) shows all dumps: area filter,
  accent-insensitive search (`filterBrainDumps`), 10 per page, detail with linked cards,
  edit, delete via ConfirmDialog (linked cards are kept).
- **Draft cards (empty back) are not reviewable:** `isDue` excludes them, so they are out of
  the queue, the badge and "Sắp tới". Filling the back makes them due immediately.
- **The 30-card cap is per SESSION** (`SESSION_LIMIT`), not per day — a new session can take
  the rest. The badge and the big number show the real backlog (`dueCount` is uncapped).
- **Resolved predictions are locked** (`PredictionForm` → `ResolvedForm`): only the note is
  editable; a mis-tapped outcome is flipped through a confirm dialog that shows the Brier
  change. Statement/probability/date never change after resolution.
- **Weekly review:** `WeeklyReviewForm` is shared by the Sunday card and the history in
  Thống kê (`WeeklyReviewHistory.tsx`, last 8 weeks, view / write late). It asks whether last
  week's `oneChange` happened (`lastChangeResult`), and Hôm nay shows last week's change as
  "Điều chỉnh tuần này" on Mon–Sat.
- **Cloud upload card** (`SyncSection` → `UploadCard`) always re-diffs the local store
  against the CURRENT account; `learning-os:upload-done` is now only "last upload" info.
  "Để sau" stores a fingerprint (user id + keys to add), so new local data or another account
  shows the card again. Still add-only.
- **Small fixes:** review badge uses `useToday` (updates past midnight); the backup nag
  counts cards, brain dumps, predictions and review logs too; Thống kê is not "empty" when
  only resolved predictions exist.
- **Not done (needs the owner's decision):** a "lesson" entity, per-day A/B comparison,
  showing the retention definition/denominator, prediction revision history before
  resolution.

### Responsive layout, display size, focus fullscreen (2026-09-27) — rules to keep

- **Layout uses container queries, not media queries.** `App.tsx` makes the app a
  `@container/app`; `ScreenShell` makes its content a `@container/content`. In a container
  query `rem` follows the REAL root font size (checked in Chrome), so at 150% a 1280px window
  lays out like ~850px — exactly like browser zoom. Media queries (`sm:`, `md:`) do not follow
  the display size; do not use them for app layout.
- **Breakpoints:** app < 42rem → bottom tab bar, one column. `@2xl/app` (42rem) → left rail
  (icon over label). `@6xl/app` (72rem) → wide sidebar (icon beside label, app name).
  `ScreenShell` content max 42rem, or 72rem with `wide` (Ôn tập, Thống kê), which split into
  two columns at `@3xl/content` (48rem): Thống kê = numbers | energy + charts; Ôn tập =
  today card | drafts + upcoming, brain-dump form | history, card list as a grid. Phone order
  is unchanged. Short screens (`short:` = height <= 500px): header scrolls away, bottom bar
  puts icon beside label.
- **Never change the React tree per breakpoint.** Every layout switch is CSS only (order,
  flex direction, grid columns), so rotating the phone or resizing the window never remounts a
  screen and never loses what is typed (verified: prediction form text survives 390 → 844×390
  → 1280 → 768 → 390).
- **Safe areas:** the app root pads `env(safe-area-inset-top/left/right)` (installed iPhone
  draws under the status bar; landscape notch is on a side), the tab bar pads the bottom.
  Dialogs use `overlayPadding()` from `lib/viewport.ts`; sheets with inputs (focus capture,
  focus finish, cloud login) also add the keyboard height from `visualViewport` so the Save
  button stays above the keyboard. Dialog panels are `max-h-full overflow-y-auto`.
- **Display size 100/125/150%** (Settings → Giao diện → Cỡ hiển thị, `lib/uiScale.ts`, key
  `learning-os:ui-scale`, per device, not in backups): `<html data-scale>` sets the root
  font-size in `index.css`; `index.html` applies it before first paint (keep the key in sync).
  NEVER `transform: scale()` and never block pinch zoom. Anything sized in px does not scale:
  use rem (`min-w-[1.125rem]`, `text-[0.9375rem]`), and Recharts font sizes / axis widths go
  through `px()` = n × `uiScaleFactor()`, read at render time. Narrow content (< 20rem, i.e. a
  phone at 125-150%) drops two-up grids to one column (`@xs/content:grid-cols-2`, focus buttons
  `@xs/focus:grid-cols-2`); nav labels are clamped to 12-15px and never wrap.
- **Focus clock size is relative to its ring** (`@container` on the ring, `text-[length:24cqw]`),
  so it can never overflow the circle at any display size or orientation.
- **Fullscreen (`lib/fullscreen.ts`):** `requestFullscreen` is called synchronously inside the
  tap (nothing awaited before it); `screen.orientation.lock("landscape")` only after fullscreen
  succeeded, with a 3 s timeout. The old prefixed webkit API returns before fullscreen starts,
  so `enterFullscreen` waits up to 1 s for `fullscreenchange` before saying "denied". The result
  is `{entered, locked}` or `{entered:false, reason:"unsupported"|"denied"}`; `fullscreenNotice`
  turns it (plus the CURRENT orientation) into one honest line — never "đã xoay". Exiting by the
  app button, Back/Esc (fullscreenchange), save, cancel or unmount always unlocks orientation.
  While fullscreen, the button always shows the word "Thoát". The clock is re-read on
  `visibilitychange`. Nothing here touches the timer keys.
- **"Hoàn thành phiên" leaves fullscreen and unlocks landscape first** (`openFinishForm`,
  2026-09-29): the finish form is ~1,600px tall and was unusable stuck in a ~390px-high
  landscape screen. Closing the form keeps the session running; fullscreen is one tap away.
- **Focus-session sheets scroll the WHOLE overlay** (`fixed inset-0 overflow-y-auto` + an
  inner `flex min-h-full items-end` wrapper), never a `max-h-full overflow-y-auto` panel inside
  a fixed flex overlay — the owner could not swipe down to "Lưu" on the phone. Note for
  testing: CDP `Input.synthesizeScrollGesture` does NOT scroll ANY fixed overlay (even a plain
  control page), so it reports false failures; use `Input.dispatchTouchEvent` sequences.
- **Manifest stays `display: standalone`, `orientation: any`.** Only the focus session asks for
  landscape, and only after the user taps; the 5 tabs are never forced into fullscreen or
  landscape.
- **Verified (Chrome, localhost, demo data):** 5 tabs × 390 / 768 / 1280 × dark / light ×
  100 / 150% — no horizontal overflow, no control under 44px, no page errors. Focus session
  with simulated Android (real Chrome Fullscreen API + faked orientation lock), desktop Chrome
  (lock refused), refused fullscreen and iPhone (no Fullscreen API). NOT verified on a real
  phone yet.

### IELTS Đợt 1 (2026-09-27) — rules to keep

- **Source of truth is `docs/PRODUCT.md`** mục 3 (band table, overall rounding, test order,
  "giữ khung 9:30"), mục 7 (Listening errors ①–④) and 7b (Reading errors Ⓐ–Ⓓ). All of it is
  in `src/lib/ielts.ts` (110 tests in `ielts.test.ts`, every table boundary). Change it there.
- **No second timer.** "Bắt đầu IELTS" on Hôm nay only sets the last area to IELTS and starts
  the normal focus session. The finish form shows the IELTS part because the area is IELTS.
- **The IELTS result lives on the block** (`FocusBlock.ielts`), not in its own table, so the
  session and its score are one write and can never disagree. Switching an edited IELTS block
  to another area drops `ielts` on save; the form says so in orange before saving (rule 4).
- **Save is blocked until the 4 error counters add up to the wrong count** (`draftError`).
  The two error sets never mix: `errors[i]` means ①–④ for Listening, Ⓐ–Ⓓ for Reading — always
  read it with `skill`. "Không làm đề" saves the session without a test (still counts for
  IELTS time and the 9:30 anchor). Writing/Speaking only store an optional AI band.
- **Next test is per skill** (`nextTest`): the part after the highest part of the MOST RECENT
  session (date, then start time) of that skill — not the furthest test. Listening has 4
  sections × 10, Reading 3 passages 13/13/14 (the total is editable). After Cam 19 → null.
  The form preselects ONE part (owner's choice). Editing a block excludes itself from history.
- **Khung 9:30** = IELTS block starting 09:00–10:30 inclusive, >= 45 min. `anchorWeek` counts
  DAYS Monday–Sunday (two sessions on one day = 1). Shown as "x/7" + 7 dots, never a streak.
- **Bands:** raw → band only for a full 40 questions (`practiceBand`); fewer shows raw and %.
  Raw < 10 is below the table → null ("dưới 4.0"), never guessed. Overall =
  `floor(avg × 2 + 0.5) / 2` (x.25 → x.5, x.75 → next whole); needs all 4 skills.
  Every band on screen is written "≈".
- **Mock tests** (`mockTests`, Dexie v8, UUID keys): every skill optional; only raw L/R and W/S
  bands are stored, bands/overall are recomputed. Temporarily in Ôn tập → "Thi thử"; Đợt 2
  moves it to the IELTS tab. Delete only inside the edit form, through ConfirmDialog.
- **Backup:** `mockTests` is a backup table (TABLE_NAMES, ROW_RULES, UNIQUE_FIELD, PRIMARY_KEY
  in upload.ts, so cloud upload picks it up). `focusBlocks.ielts` is shape-checked by
  `isValidIeltsSession`; an error total that does not match is still ACCEPTED on import (it
  breaks nothing, and an old export must always restore). Files without `mockTests` import
  with that table empty — the import preview shows its count like every other table.
- **Hôm nay:** "Bắt đầu IELTS · <next Listening part>" is now the ONE filled accent button;
  "Bắt đầu đếm" (any area) became secondary. The block form's area chips are one scroll row.
- **`Counter compact`**: 44px square buttons so a label and a counter share one row at 390px.
- **Verified (headless Chromium 1228 via playwright-core, localhost, fake data):** timer at a
  faked 09:30 Tuesday → +50 min → finish form → 7/10 with errors ①2 ③1 → saved → "Khung 9:30"
  0/7 → 1/7 and the button moved to S2; mock test L23 R30 W6 S6 → overall ≈ 6.5. Layout:
  390 / 768 / 1280 × dark / light × 100 / 150% on Hôm nay, the finish sheet (Listening +
  Reading) and Thi thử — no control under 44px, no page overflow, no page errors. The Chrome
  extension was not connected, so this was not done in the owner's Chrome, nor on a phone.
- **Not built (Đợt 2/3):** IELTS tab, countdown, "dời khung", error-trend charts, IELTS
  hours/week chart, cards from IELTS errors.

### IELTS Đợt 2 (2026-09-28) — rules to keep

- **One file for the calendar:** `src/config/schedule.ts` — `MILESTONES` (kind `mock` / `exam`
  / `school-exam` / `deadline`) and `BASELINE`. Thi thử 3 = 2027-01-16, thi thử 4 =
  2027-02-20, thi thật = 2027-03-20 are PLACEHOLDERS the owner chose on 2026-09-28 (PRODUCT.md
  only said "giữa T1 / giữa T2 / T3"); change them there when real dates exist.
  `protocolPhases.ts` and `ProtocolBanner.tsx` are gone; `metrics.ts` reads `BASELINE`.
- **Countdown** (`nextTestMilestone`, `CountdownCard` on Hôm nay + IELTS tab): next `mock`, then
  the `exam`; a multi-day mock counts as "Hôm nay: …" on every day of it; after the exam: none.
- **Light week** (`lightWeekExam`): the Monday–Sunday week containing a `school-exam` (11/10,
  25/11, 2/12) shows "Tuần nhẹ nhịp …: giữ sàn 30 phút Listening". AFEP deadlines do not.
- **Dời khung** (`AnchorDelayRow`, `shouldAskDelay`): asked only when now > 10:30 (strictly;
  10:30 itself does not ask), today has NO IELTS block at any time, and today has no delay yet.
  Two taps: target chip, then reason chip saves. One row per day (`anchorDelays`, key
  `"#" + date`, Dexie v9) so two devices never double-count; "Sửa" edits it (keeps its date
  and time), there is no delete. The app only records and counts (no server → no reminder at
  the new time — owner's choice). Wording is neutral; a test checks there is no blame text.
  Once an IELTS block exists today the row disappears; the week count stays as a small line.
- **Tab IELTS** (`IeltsScreen`, wide): Tổng quan (CountdownCard + IeltsStartCard + delays this
  week | error totals of the last 28 days, Listening and Reading in separate cards, "nhiều
  nhất" on the largest type), Buổi luyện (IELTS blocks newest first, 15 per page, tap → the
  same FocusBlockForm, delete inside the form via ConfirmDialog), Thi thử (MockTestView, moved
  out of Ôn tập). `IeltsStartCard` is shared with Hôm nay — never duplicate it.
- **Công cụ khác** (Cài đặt): rows open `PredictionsScreen` / `ExperimentsScreen` as sub-screens
  (`settingsView` in App.tsx; `ScreenShell back` shows "‹ Cài đặt"; tapping the Cài đặt tab
  returns to the main settings). Nothing was deleted or migrated: predictions, experiments and
  tags stay in the database, the backup and the cloud upload. The Hôm nay A/B chip still shows
  while an experiment is active. Dashboard metrics that use predictions are unchanged.
- **Verified (headless Chromium, localhost, fake data):** faked 10:45 Tuesday → question shown,
  10:30 → not shown; Tối nay + reason → "Đã dời sang Tối nay · 1 lần tuần này", IELTS tab
  counts 1; 6/10 shows the light-week line; demo predictions (29) and the demo experiment open
  from Công cụ khác. Layout: 5 tabs + 3 IELTS views + Dự đoán (list, score) + Thí nghiệm ×
  390 / 768 / 1280 × dark / light × 100 / 150% — no control under 44px, no overflow, no page
  errors. Not verified on a phone. Dexie Cloud sync of the new table not tested while signed in.

### Countdown card (2026-09-28) — rules to keep

- **Why:** the Đợt 2 one-line banner did not make the next mock feel close. References
  (web, 2026-09): Pretty Progress (one big number + one supporting visual, calm colours for
  high-stakes dates), Countdawns (bar/ring of the preparation stretch), Poro and DayDrop
  (next event prominent, later events on a multi-event timeline). Stitch project "Learning OS
  — UX gọn 2026-09": screens "Hôm nay — Learning OS (Countdown IELTS 7.5)" (mobile) and
  "Hôm nay — Learning OS (Desktop 1280px)".
- **Content** (`CountdownCard`, logic in `plan.ts`, tested): label "Thi thử kế tiếp" + "T7 ·
  03/10"; milestone label; the days number (`text-[4rem]` Geist) + "≈ N khung 9:30 nữa" (N =
  days before the test day; 1 day → "Mai là ngày thi — hôm nay là khung 9:30 cuối"); during a
  (multi-day) mock → "Hôm nay"; a 6px bar of the CURRENT stretch (`currentStretch`: from the
  last day of the previous test milestone, or `BASELINE.from`, to the next one); "Đường tới
  7.5" = `roadToExam` nodes T0–T4 + Thi thật (`short`, `gate` in schedule.ts): done = filled
  ink-3, next = cyan ring + dot, later = hollow, gate = dashed + footnote, exam = flag. A cyan
  "hôm nay" dot sits on the track between the last done node and the next, proportional to
  the stretch, clamped away from both nodes so they never hide it. Light-week row at the
  bottom. After the real exam the card renders nothing.
- **Nodes are evenly spaced, not time-proportional**, so labels always stay readable.
- **Layout is a container query on the card itself** (`@container/count`): >= 34rem → two
  zones (number | timeline, 2fr/3fr, vertical hairline) — desktop and tablet at 100%; narrower
  (phones, or 150% display size) → stacked. Below 18rem (a phone at 150%) only the next node
  and the exam show a date, otherwise "03/10" labels ran into each other.
- **No new filled button:** the card is information only; the one filled accent button on
  Hôm nay is still "Bắt đầu IELTS". No urgency colours (calm), no streaks.
- **Verified (headless Chromium, localhost):** 390 / 768 / 1280 × dark / light × 100 / 150%
  plus 1/10, 2/10, 4/10 (ongoing), 6/10 (light week), 20/12 (after the gate), 22/3/2027 (no
  card): nothing leaves the card, node labels and dates never touch, no text under 12px, no
  page errors; one column on phones, two zones from 768px at 100%.

### IELTS Đợt 3 (2026-09-28) — rules to keep

- **Thống kê top = IELTS, 8 weeks** (`ieltsStats.ts`, charts in `DashboardCharts.tsx`, same
  lazy Recharts chunk): hours/week bars (left axis, dashed 11.5h line) + Listening % correct
  of practice sessions (line, right axis) + mock tests as hollow dots ON THE SAME % AXIS
  (raw /40 → %, label "≈ band"); error trends Listening and Reading as separate stacked bars
  in "wrong answers per 10 questions" so weeks with more practice compare fairly; anchor days
  x/7 with a 5/7 line. Weeks < 20 questions are "sơ bộ (n=…)"; a week without tests is null,
  never 0%. Percentages multiply by 100 BEFORE dividing (23/40*100 = 57.4999…). The old
  charts and period metrics sit below under "Tổng quan".
- **Chart colours are tokens** `--chart-1..4` and `--chart-bar` in BOTH theme blocks
  (>= 3:1 on surface). Chart text measured: min 7.12:1 dark, 7.58:1 light.
- **Sunday planning replaces the weekly review** (`WeeklyReviewCard.tsx`, logic `weekPlan.ts`).
  Owner's choices 2026-09-28: the app proposes a WEEK VOLUME (8 sections + 6 passages; light
  week 7 + 0), shown as "from → to" test ranges; deadlines = schedule.ts dates + typed ones
  (new table); light week = automatic for school-exam weeks OR toggled by hand; the two old
  free-text questions are gone (old answers still show read-only, new optional "Ghi chú").
  The plan is stored on THIS week's WeeklyReview (`plan`) and applies to NEXT week
  (`planForWeek`). A saved plan beats the automatic light week both ways (CountdownCard,
  lookBack). Hôm nay shows "Kế hoạch tuần: Listening x/8 · Reading y/6" in IeltsStartCard.
- **Deadlines** (`deadlines`, Dexie v10, UUID keys, in backup/upload/demo/Settings counts):
  Hôm nay shows the next 72 hours (PRODUCT.md mục 6 priority 2) including fixed school/AFEP
  dates, excluding mocks/exam (the countdown already shows them). Delete via ConfirmDialog.
- **Cards with a source** (`Card.source`): Lỗi nghe / Từ vựng IELTS / Lỗi Writing / Góp ý
  manager; no source = Brain dump or Tự tạo (`sourceOf`). Kho thẻ filters by source AND area
  (two scroll rows). The IELTS finish form has "+ Thẻ ôn từ buổi này": saved immediately
  (cancelling the session keeps it), empty back = draft card.
- **Writing prompt**: only copies text to the clipboard (fallback: a selectable textarea);
  nothing is sent anywhere (rule 5). On the IELTS tab and in the form when skill = Writing.
- **Containers that hold chips/buttons use a border, not `bg-surface-2`** (the controls are
  surface-2 and vanish) — caught by browser QA on the quick-card box.
- **Verified (gstack `browse`, localhost, demo data 8 weeks):** Thống kê, IELTS, Hôm nay,
  planning form × 390 / 768 / 1280 × dark / light × 100 / 150%: no page overflow, no control
  under 44px, no text under 12px; quick card saved with its source; source filter; the
  planning form proposes a light week for 5/10 (Midterm EFM). Stitch generation timed out,
  so no Stitch mockup this round. Not verified on a phone.

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

### Focus-session backgrounds — rules to keep

- **Layout (openquiz.ai style, chosen by the owner 2026-09-26):** every scene — preset MP4,
  direct image/video link, or YouTube — covers the whole screen BEHIND the clock
  (`FocusBackdrop.tsx`, layer `fixed inset-0 pointer-events-none`). Big clock dead centre on a
  radial dark gradient; small top row (area, "Bật/Tắt video", ⚙ Cài đặt, fullscreen); bottom
  row (+1 phân tâm, Chen ngang sheet, Huỷ, Hoàn thành). Colours on this screen are explicit
  white/black (the text always sits on a darkened video), not theme tokens.
- **YouTube as a backdrop goes against the YouTube API policies** (overlaying the player,
  hiding its controls, blocking taps). The owner accepted that risk after seeing the options:
  YouTube may block embedding on this origin, and ads under the overlay cannot be interacted
  with. Implementation copies openquiz.ai's CSS cover trick (iframe
  `max(177.78vh,100vw)` x `max(56.25vw,100vh)`, centred) but uses the IFrame API
  (`YouTubePlayer variant="background"`: controls 0, loop via `playlist`, muted autoplay,
  youtube-nocookie) so errors and blocked autoplay are detected — openquiz.ai's plain iframe
  cannot tell. The picker still previews YouTube in an interactive mini player.
- **Video on/off** (`learning-os:focus-video`) is independent of the session: off unmounts the
  video (static gradient, nothing downloads); on reuses the saved scene. **Độ tối**
  (`learning-os:focus-dim`, Vừa/Đậm) scales the overlay; `DIM_LEVELS` is tested so white text
  stays >= 4.5:1 even on a pure-white frame. Both apply instantly from ⚙; scene changes still
  need Áp dụng.
- **Fallbacks:** YouTube error -> iframe hidden, static gradient + notice with "Đổi nền";
  blocked autoplay -> notice with the app's own "Phát video" button (`playRequest`); MP4 error
  -> poster.
- **Files:** `BackgroundPicker.tsx` (the "Hình nền" dialog), `lib/background.ts` (link check →
  mode, storage, still-image rules), `lib/youtube.ts` (link → video id + start, error texts),
  `config/youtubePresets.ts` (6 study-with-me videos, embeddable per oEmbed 2026-09-26),
  `lib/fullscreen.ts` (fullscreen + landscape lock, never throws). All tested
  (`fullscreen.test.ts`, `FocusSession.test.tsx`).
- **The background never touches the timer.** It is a sibling layer; the clock still derives
  from the stored start timestamp. `BackgroundPicker.test.tsx` proves a 10 s preview/apply keeps
  the clock counting and leaves the session keys untouched.
- **Preview vs apply:** thumbnails and pasted links only preview. Only "Áp dụng" saves (key
  `learning-os:focus-background`, per device, not in backups, not synced). Apply stays disabled
  until the preview really works — overlay link loaded, or YouTube reported PLAYING (a mini
  player inside the dialog, so the user can tap ▶ when autoplay is blocked). Editing the link
  sets `pending` and locks Apply until the NEW link is previewed; otherwise a fast tap saved the
  previous video. Never a fake success.
- **YouTube player statuses:** loading / playing / blocked (no PLAYING within 6 s, or autoplay off
  for reduced motion → "bấm ▶") / error (IFrame error codes via `describeYouTubeError`; 101/150
  mean embedding disabled OR video gone — YouTube uses one code for both, so say both; offline or
  API blocked → error after at most 15 s). Autoplay is always muted; unmute with YouTube's own
  button. Video pauses when the page is hidden.
- **Links:** YouTube watch / youtu.be / m. / music. / shorts / live / embed / nocookie, with
  `t=` / `start=` → player. Channel / playlist / search links → explicit "không trỏ tới một
  video". Vimeo / TikTok page links → explicit message. Direct https image
  (.jpg/.png/.gif/.webp/.avif) or video (.mp4/.webm) → overlay; unknown extensions are tried as
  image, then video.
- **Preset videos must have a licence that allows a public website** (CC0 / CC BY / CC BY-SA or
  written permission). All current ones are Wikimedia Commons; `public/backgrounds/CREDITS.md`
  and each preset's `source` field hold author + licence, shown under "Nguồn & giấy phép video".
  Audio is always stripped (one candidate was rejected for a copyrighted music track).
- **Encoding:** 1280x720, 30 fps, H.264 MP4, no audio, 11–19 s with a 1 s crossfade loop,
  ~0.7–3 MB each. Poster and thumbnail are the clip's first frame so the thumbnail is the scene.
  Posters/thumbs are precached (offline shows the still); videos are not (16 MB).
- **Fallbacks:** reduced motion, Save-Data, <= 2 GB RAM or <= 2 CPU cores -> poster only, no
  video request. Video error or blocked autoplay -> poster + a visible notice. Hidden page ->
  video paused.
- **Contrast over video:** panels use `--glass` (90% dark / 94% light, in `index.css`), computed
  for a pure-white or pure-black frame behind them so ink-3 stays >= 4.5:1. No backdrop blur
  over video (battery).
- **Landscape:** the manifest orientation is `any` (a `portrait` lock stops the installed
  Android app from ever rotating). Phone landscape (`phone-landscape:` = landscape and
  height <= 500px) = clock left, button column right. Tailwind only sees literal class names —
  never build them from a variable. Fullscreen rules: see "Responsive layout, display size,
  focus fullscreen" below.

## 8. Commands

```bash
npm run dev -- --host   # dev server, reachable from the phone on the same Wi-Fi
npm run build           # lint + tests + type-check + production build (Cloudflare runs this)
npm run build:only      # type-check + production build, skipping lint/tests (local only)
npm test                # unit tests (631: lib/ logic, db upgrade, hooks, components, worker)
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
- **`worker/index.js` runs only for `/backgrounds/*`** (`run_worker_first`). Workers static assets
  ignore `Range` and always answer 200 with the whole file; iOS Safari refuses to play video
  without 206 partial responses. The worker slices the file (`worker/range.js`, tested). Check
  after a deploy: `curl -sD - -o /dev/null -H "Range: bytes=0-1" <url>/backgrounds/window-rain-day.mp4`
  must say `206` and `Content-Range: bytes 0-1/...`.
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
