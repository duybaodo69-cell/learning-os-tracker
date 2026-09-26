# BRIEF — Learning OS Tracker: bug fixes + redesign

Read this whole file first. Execute Part A completely before Part B.
One commit per numbered item (Part A) and per screen (Part B). Run `npm test` and `npm run build` after each commit; stop and report if either fails.
Explain each step briefly in Vietnamese. Do not add features not listed here.

---

## Part A — Logic bug fixes (do first)

Add a test for every logic change.

1. **Stale "today"**: the app keeps yesterday's date if left open past midnight. Create one shared hook `useToday()` that recomputes on `visibilitychange`, window `focus`, and every 60 seconds. Use it everywhere `todayISO()` is currently called during render. Also compute the date at SAVE time for check-ins and blocks, not from a prop captured at render.
2. **Sleep→focus lag off by one**: a check-in dated D describes the night BEFORE D, so pair it with focus blocks on the SAME date D. Rename `buildSleepVsNextDayFocus` to `buildSleepVsSameDayFocus`; fix chart labels and tests.
3. **Week-over-week comparison**: compare Monday..today with Monday..same weekday of last week (equal day counts). Label "so cùng số ngày".
4. **Storage persistence**: call `navigator.storage.persist()` on startup; show in Settings whether storage is persistent.
5. **Scheduling**: "hard" must never give a longer interval than "good" (at the learning steps keep the current step).
6. **Charts**: widen YAxis so tick labels like 12 and 300 are not clipped at 390px width.
7. **Demo export**: when demo mode is on, name the file `learning-os-DEMO-<date>.json` and do NOT update the last-export date.
8. **Timer distractions**: while the timer runs, show a large "+1 phân tâm" button; carry the count into the block form.
9. **Forgotten timer**: if a timed block exceeds 180 minutes, ask for in-app confirmation before prefilling.
10. **Default start time**: "+ Block" defaults start time to now minus the selected minutes.
11. **Header date**: show it with `formatDayLabel` ("Thứ Hai, 28/09").

---

## Part B — Visual redesign

Reference designs: `design/stitch/` (screens `h_m_nay`, `phi_n_t_p_trung`, `th_ng_k`, `d_o_n`, `n_t_p`, `c_i_t`; tokens in `quantitative_protocol/DESIGN.md`).
This is a VISUAL restyle: keep all existing logic, data, tests and Dexie schema (except item 6 below). Do not copy the Tailwind CDN or inline scripts from the HTML; port tokens into our Tailwind v4 theme as CSS variables so a light theme can be added later.

Corrections to apply on top of the designs:

1. Remove decorative jargon: SYS_ACTIVE, IDB_STORAGE_V2, ISOLATED_ENV, EXP-xxx ids, BUILD_STABLE, "Empirical OS v4.2", "Hệ thống phân tích định lượng", "T-Rate", "TAP TO EDIT", "Level 4", "Brier Loss" (use "Brier"). UI copy in Vietnamese.
2. Never show p-values or significance. Experiments show results only when both arms have >= 10 days, otherwise "Chưa đủ ngày: A x/10 · B y/10". Correlation r is labelled "sơ bộ" and shows n.
3. Minimum text size 12px (no 10px). Muted text must reach 4.5:1 contrast against its background.
4. Fonts: Be Vietnam Pro for all Vietnamese text; Geist only for numerals/tabular data if it lacks Vietnamese glyphs.
5. **Today**: check-in card has two separate states (form OR one-line summary). Deep-work total shown once, as "3h05". Distraction counts in neutral colour. Backup reminder only when > 7 days since last export. Sample dates use 2026.
6. **Focus session**: title "Phiên tập trung"; bottom tab bar hidden; "+1 phân tâm" is one large button (min 64px tall) with the count inside; the finish form is a bottom sheet shown only after "Hoàn thành phiên"; "Huỷ phiên" asks for in-app confirmation; rename the quick-capture box "Việc chen ngang" and store captures in a new optional FocusBlock field `capturedNotes: string[]` (add a new Dexie version, never edit old versions); each capture also increments distractions; show captured notes on the block in Today.
7. **Stats**: "so cùng số ngày" once in the section header; rows show only the delta with arrow and colour. Energy→deep work needs >= 5 days per level, otherwise show the value greyed with "sơ bộ (n=x)". Period tabs must not overlap the title at 390px.
8. **Predictions**: category chips only Deal/VC, Market, Study, Personal. Summary reads "Đã chấm N · Chờ chấm M" and "Tốt hơn mức luôn đoán 50% (0.25)". Keep the existing Score tab and add-prediction form, restyled to match.
9. **Settings**: demo copy "Dữ liệu mẫu nằm trong kho riêng; bật/tắt sẽ tải lại app, dữ liệu thật không bị động tới." Replace the principles card with "Phiên bản · ngày build".
10. Update manifest `theme_color` and icons to the new palette.

---

## Finish

After Part B: run tests and build, push, confirm the deploy is live, and give me a short Vietnamese summary of what changed and anything you could not do.
