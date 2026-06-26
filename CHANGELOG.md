# Changelog

All notable changes to Talk2Sql are documented here.

## [3.34.2] — 2026-06-26 · "Repair fetches real columns on demand"

### Fixed
- **Repair still guessing (e.g. `PS.SUPPLIER_ID` invalid).** When the agent's corrected query introduced a table whose columns weren't in the harvested catalog, Claude had nothing to ground on and guessed again. The repair now **fetches the real column list for every table in the query on demand** (`schemaHarvestTableCols`) before asking Claude, so it always corrects to a column that actually exists.

## [3.34.1] — 2026-06-26 · "BI runs auto-retry network blips"

### Fixed
- **"Network error — could not reach … (BIP service)" in BI.** The BI run path and dashboard tiles called `queryBIP` directly with no retry, so a transient connectivity blip failed hard. They now go through `queryBIPResilient` (up to 3 tries with backoff on network/timeout only — real ORA errors still stop immediately), the same resilience config extraction already had.

## [3.34.0] — 2026-06-26 · "Smarter self-repair (exact columns, 2 passes)"

### Why these errors happen
The English→SQL agent has Claude write the query from a *slice* of the catalog. When the real column isn't in that slice, or a Fusion column differs from the EBS name Claude expects (`VENDOR_ID`→`SUPPLIER_ID`, `SET_OF_BOOKS_ID`→`LEDGER_ID`), it guesses and the guess fails as `ORA-00904`.

### Changed
- **Repair now feeds Claude the EXACT, complete column list of the tables the failing SQL referenced** (parsed from the query via `biTablesInSql`), so it corrects to a real column instead of guessing again. The repair prompt also names common Fusion-vs-EBS column swaps.
- **Up to 2 repair passes** (was 1) for both the Result area and dashboard tiles — most misses clear on pass 1, stubborn ones on pass 2; tiles persist the corrected SQL.
- **First-pass grounding widened** — 45 columns/table (was 28) and a larger context budget — so fewer queries miss in the first place.

## [3.33.2] — 2026-06-26 · "Readable primary buttons"

### Fixed
- **"Build dashboard" / "Build report" button text was dark/invisible** in some themes — the white text color was being overridden. Both primary buttons now set `color:#fff;background:var(--a1)` inline so the label is always readable on the blue button.

## [3.33.1] — 2026-06-26 · "BI layout + readable inputs"

### Fixed
- **Prebuilt-dashboard cards were cramped/clipped.** The Ask-in-English and Prebuilt-Dashboards cards now render **full width above** the manual builder grid (they were squeezed into the 340px builder column). Report chips are a full-width, left-aligned, wrapping list so long names like "Commission earnings by participant" no longer get cut off.
- **Invisible text in the Ask box / key field.** The textarea and key input now set explicit `color`/`background` so text is readable in every theme.
- **Horizontal overflow** in the BI pane is clipped (`overflow-x:hidden`), so the layout can't shift sideways and hide content.

### Changed
- Auto-repair prompt now explains each ORA code, and for `ORA-01031` tells Claude the base table isn't granted to the reporting user → switch to a readable `_VL`/`_V` view of the same entity.

## [3.33.0] — 2026-06-26 · "Self-repairing BI queries"

### Added
- **One-shot auto-repair for generated SQL.** When an Ask-in-English report or a dashboard tile fails with `ORA-00904` (bad column), `ORA-00942` (missing table), or `ORA-01031` (owner-prefixed object the report user can't read), Ariadne feeds the failing SQL + error back to Claude, grounded in your catalog, gets a corrected single read-only SELECT, and re-runs automatically. For tiles the corrected SQL is persisted, so it stays fixed.
- **Defensive `FUSION.` strip at run time** in both `biRun` and `biTileRun`, so older tiles or hand-edited SQL carrying an owner prefix no longer throw `ORA-01031`.

### Note
- Repair is limited to one attempt per run to avoid loops; if it still fails, the error shows as before so you can rephrase.

## [3.32.3] — 2026-06-26 · "Stop re-asking for the Claude key"

### Fixed
- **"Connect Anthropic key" every time / Build dashboard blocked.** The key was saved (encrypted in the OS keychain), but the connected flag was only re-read when visiting the Ariadne pillar — so the BI tab always thought no key was present. Now `renderBI` rehydrates the flag on entry, and the Ask-in-English build, the prebuilt-pack build, and the resolver each check the keychain **live** (`ariadneAiStatusAsync`) before asking — so a saved key is honored across reloads and you're not prompted again.

## [3.32.2] — 2026-06-26 · "BI pane scrolls"

### Fixed
- **BI / Dashboards tab couldn't scroll** — the long Prebuilt-Dashboards pack list spilled past the viewport with no way down. The BI pane now uses the same inner flex-scroll wrapper (`#bi-scroll`) as the Build pane, so all content scrolls reliably.

## [3.32.1] — 2026-06-26 · "Dashboard font + Run/scroll + seeded reports"

### Fixed
- **"Run again" did nothing / couldn't scroll to the result.** On the Dashboard view the Result area was stacked below the cards and off-screen. It now sits directly under the Ask-in-English card, and `biNlRun` auto-scrolls the result into view after running (and warns if there's no SQL yet).
- **Dashboard fonts too big.** Tile content (charts, KPI numbers, data tables, bar labels) is now sized for the small tiles instead of the full builder — compact CSS scoped to `.bidash-tile`, and the dashboard title trimmed.

### Added
- **⭐ Seeded Oracle Reports (ICM)** pack in Prebuilt Dashboards — Commission Statement, participant plan assignments, plan/formula/rate detail, unpaid/held earnings, and quota-vs-attainment — reconstructed against your live catalog.

## [3.32.0] — 2026-06-26 · "Prebuilt Dashboards (Pass A)"

### Added
- **📚 Prebuilt Dashboards** in the BI section (both Report Builder and Dashboard views). Curated, themed report packs — **Commissions (ICM), Receivables, General Ledger, Customers (TCA), Order Management, Procurement** — each a set of ready-made reports. **▶ Build dashboard** resolves every report in the pack through the English→SQL agent (grounded in your live catalog, so columns are pod-correct), then pins each as a dashboard tile. Or click a single report chip to build just that one.
- **`biNlResolve()`** — the English→SQL core extracted into a reusable resolver (catalog retrieval → Claude → read-only gate → `fusion.` strip → catalog heal), shared by the Ask-in-English card and the packs.

### Notes
- Needs the Schema Catalog learned and a Claude key connected. Reports that don't fit a given pod are skipped; only successful ones are pinned (toast shows "N of M added").
- This is **Pass A** of the seeded-catalog work. **Pass B** (live OTBI / BI Publisher Presentation Catalog browser — listing and importing the pod's actual seeded analyses/dashboards) is a separate transport build, lined up next.

## [3.31.3] — 2026-06-26 · "Fix ORA-01031 (drop FUSION. prefix)"

### Fixed
- **`ORA-01031: insufficient privileges` on ICM Plan Details and NL reports.** The BIP report's DB user reads Fusion objects through synonyms, not direct grants on the `FUSION` schema — so an explicit `fusion.` owner prefix is rejected. Stripped the prefix from both Plan Details queries (all-plans + per-plan) so they use bare table names like the working extracts. The English→SQL agent now also instructs Claude not to schema-qualify, and strips any `fusion.` prefix defensively before running.

## [3.31.2] — 2026-06-26 · "Connect Claude from the BI card"

### Added
- **🔑 Connect Claude inline.** When no key is connected, the Ask-in-English card now shows a key field + Connect button right there — paste your `sk-ant-…` key without hunting for the Ariadne panel. Stored encrypted in the OS keychain (same secure store), never kept in the page. After connecting, press ✨ Build report again.

## [3.31.1] — 2026-06-26 · "Ask in English on the Dashboard too"

### Changed
- **🧠 Ask in English now appears on the Dashboard view**, not just Report Builder. It has its own inline Result area there, so from the Dashboard tab you can describe a report, see it run, and ➕ Add to dashboard as a tile without switching to the builder.

## [3.31.0] — 2026-06-26 · "Ask in English → report (agentic BI)"

### Added
- **🧠 Ask in English** at the top of the BI Report Builder. Describe a report in plain language — no table or column names needed. Ariadne (1) retrieves candidate tables + columns from your **Schema Catalog** by matching your words against table names and a business-term hint map (commission, plan, participant, customer, invoice, order, …), (2) asks Claude for **one read-only SELECT grounded only in that catalog subset** (never invents names), (3) validates it through the read-only guard and heals table names against the catalog, (4) shows the SQL and a "**Ariadne chose:**" rationale on the side, and (5) **auto-runs** the report and charts it. You can Run again, open in the editor, or **➕ Add to dashboard**.
- **Raw-SQL dashboard tiles.** Dashboard tiles can now carry a raw SQL string (from the NL agent), not just a structured builder query; `biTileRun` uses `tile.sql` when present.

### Notes
- Needs the **Schema Catalog** learned and a **Claude API key** connected (🧠 panel). Without a key, the panel still lists the candidate tables it found so you can use the manual builder. Everything stays read-only.

## [3.30.1] — 2026-06-26 · "ICM workbook + plan picker fixes"

### Fixed
- **Configuration Workbook failed only for ICM.** Two ICM-specific causes: (1) the Plan Details `SQL_Select` / rendered-expression cells can exceed Excel's 32,767-char limit, making `XLSX.write` throw and abort the whole file — every cell is now capped at 32,000 chars; (2) sheet names with `★`/`·` broke sheet refs/hyperlinks — sheet names are now ASCII-safe. Each section sheet is also built in its own try/catch so one bad section can't abort the workbook.
- **Comp Plan deep-dive "Load plans" → `ORA-00904: NAME`.** The picker queried `NAME`; the column is `COMP_PLAN_NAME`. Fixed the SELECT and the column lookup.

## [3.30.0] — 2026-06-26 · "Real Comp Plan Details SQL"

### Changed
- **ICM Plan Details now uses Chandra's authored SQL.** Replaced the guessed join with the proven "Compensation Plan Components — Full Detail" query from the ICM Hub. Correct Fusion path: `cn_comp_plan_components_all` (bridge) → `cn_plan_components_all_vl` → `cn_plan_component_formulas_all` → `cn_formulas_all_vl`, with the **rate table reached through the formula** (`cn_formula_rate_tables_all` → `cn_rate_tables_all_vl`), plus credit category (`cn_formula_ecats_all`) and Input/Output expressions (`cn_expressions_all_vl`, incl. `rendered_expression_disp` and `SQL_Select`). This fixes the earlier `ORA-00904: PCRD` — the rate link never went through a rate-dims table.
  - **All-plans flagship**: full component detail across every plan (Formula Type, Performance Measure, In/Out expressions, Credit Category, Rate Table).
  - **Per-plan deep-dive**: the participant-assignment variant (`CN_SRP_ASSIGNMENTS_V`) scoped by `comp_plan_id` — plan components joined to assigned participants (id, role, dates). Hardcoded plan-name/participant filters removed; scoped by the picked plan.

## [3.29.2] — 2026-06-26 · "Workbook export + Plan Details fixes"

### Fixed
- **📘 Configuration Workbook (Excel) click did nothing.** `XLSX.writeFile` relies on a browser download that Electron's `file://` origin silently drops. The workbook now writes its bytes through the app's `saveFile` IPC (real Save dialog), with a `writeFile` fallback for non-Electron contexts.
- **Plan Details `ORA-00904: PCRD`.** The rate-table link table (`CN_PLAN_COMP_RATE_DIMS`) doesn't resolve on every pod, leaving its alias dangling. Both the all-plans and per-plan Plan Details joins are simplified to the rock-solid **Plan → Components** path; rate tables / dimensions still extract as their own objects.

## [3.29.1] — 2026-06-26 · "ICM per-plan deep-dive"

### Added
- **🎯 Comp Plan deep-dive** in the ICM Config Snapshot result. **Load plans** → pick one comp plan → **Export plan bundle** runs everything scoped to that single plan: Plan Details (denormalized), Plan Header, Plan-Component Assignments, Plan Components, and Rate Table / Dimension associations — all `WHERE COMP_PLAN_ID = <id>` (id sanitized to digits). The bundle flows through the same pipeline, so **📘 Workbook** and **📄 BR100** export it with a plan-specific title. The all-plans flat view (3.29.0) stays as the default.

### Internal
- Generic `cfgRunScopedExport(mod, titleOverride, objs)` runner + `titleOverride` carried into the result store, error log, BR100, and Workbook titles.

## [3.29.0] — 2026-06-26 · "ICM Comp Plan Details"

### Added
- **★ Compensation Plan Details** leads the ICM Configuration export. A denormalized view — one row per **Plan × Plan Component × Rate Table** (`CN_COMP_PLANS_ALL_VL` → `CN_COMP_PLAN_COMPONENTS` → `CN_PLAN_COMPONENTS_VL` → `CN_PLAN_COMP_RATE_DIMS` → `CN_RATE_TABLES_ALL_VL`) — so the export shows a comp plan and everything associated with it, not just flat tables. The 18 per-entity extracts (components, measures, rate tables/dims/tiers, formulas, rules, roles, pay groups, participants, quotas, plan-component assignments, earning types) remain beneath it as the backing detail.

### Changed
- ICM export relabeled **"Incentive Compensation — Comp Plan & Associated Config."**

### Note
- The Plan Details join uses standard Fusion ICM keys; per-object error isolation means if a column/table differs on a given pod, the rest still extract and the **Error Log** pinpoints the one to harden (same workflow that cleared SCM/OM).

## [3.28.1] — 2026-06-26 · "TCA = configuration, not customer data"

### Changed
- **Customer (TCA) now extracts configuration, not the customer master.** The TCA card was pulling master/transaction data — Parties, Customer Accounts, Party Sites, Account Sites, Site Uses, Customer/Org Profiles, Contact Points, Account Relationships, Geographies. Those are records, not setup. The customer area is now config-only: **Customer Profile Classes, Profile Class Amounts, Account Relationship Types, Trading Community Source Systems, Classification Categories, Classification Codes, Reference Data Sets** (live SQL), plus setup-only references for **Party Usage Rules, Customer Account Numbering, Geography & Address Validation, Address Formats / Geography Structure, and Data Quality / Duplicate Identification**. So the BR100 / Workbook for TCA documents how customers are *structured*, not the customers themselves.

## [3.28.0] — 2026-06-26 · "Configuration Workbook (Excel)"

### Added
- **📘 Configuration Workbook (Excel).** After a Config Snapshot (SQL) run, the result actions now offer a true multi-sheet `.xlsx` workbook instead of only the BR100 HTML. Structure: a **Start Here** cover sheet (instance, extracted date, summary counts, how-to), a clickable **Contents** sheet (every configuration with its table, status, row count — the name links straight to its section sheet), then **one sheet per configuration section**, each with header rows (table, records, extracted) and the as-built data, plus a "← Back to Contents" link. Sheet names are auto-numbered and Excel-legal (≤31 chars, deduped). BR100 (HTML) remains available alongside it.

## [3.27.1] — 2026-06-26 · "Hub cards always show their run"

### Fixed
- **Clicking a non-OM Hub card looked like nothing happened.** When the Legacy module browser (REST) was expanded, its panel pushed the SQL snapshot result area far below the fold, so launching another module's configs ran off-screen — making it seem like only OM worked. Clicking any Config Hub card now collapses the legacy panel and scrolls the result area into view, so every card (OM · HCM · SCM · Fin · CX · ICM · Customer/TCA) visibly runs its config snapshot.

## [3.27.0] — 2026-06-26 · "Resilient + catalog-gated + TCA"

### Added
- **TCA / Customer in the Configuration Hub.** Added a **Customer (TCA)** card alongside the 6 modules — runs the customer area's SQL config export → BR100 like any module.
- **Catalog-gated extraction.** Before running each extract, the table is checked against your harvested catalog: if it exists, run; if a close real variant exists, auto-resolve and run that (🔁 resolved-to note); if it genuinely doesn't exist on the pod, mark it **⊘ not on pod** (skipped, not an error). This turns `ORA-00942` table-not-exist (e.g. `DOO_ASSIGNMENT_RULES_B`, `CN_RULE_HIERARCHIES_ALL_VL`) into clean "not present" rows. Summary now reads "N extracted · M empty · K not on pod · J error."
- **Auto-retry on network blips + 🔄 Retry errors.** Transient BIP failures (network/timeout — not ORA/HTTP) auto-retry up to 3× with backoff, so a dropped request doesn't leave a hole. A **🔄 Retry errors** button on the Error Log re-runs only the failed objects.

### Note
- Genuine SQL errors (ORA-#####) and HTTP errors are never auto-retried — only transient connection failures.

---

## [3.26.3] — 2026-06-26 · "Extracts ignore stale overrides"

### Fixed
- **The last extract errors were stale overrides shadowing the new `SELECT *`.** The extract runners consulted the override store first, so the old bad-column SQL (from earlier Apply-fixes / Rebuild) still ran for the objects that had overrides. The Config Snapshot (SQL) and Extract All runners now use the `SELECT *` source directly and don't consult overrides — so every extract runs clean regardless of any saved overrides. (Overrides remain in effect for Validation, where real columns matter.)

---

## [3.26.2] — 2026-06-26 · "Extracts use SELECT * (no more column errors)"

### Fixed
- **Config extracts can no longer throw ORA-00904.** Every extract object in CONFIG_AREAS (66) and CONFIG_MODULE_EXPORT (71) — 137 total — now uses `SELECT * FROM <table> FETCH FIRST 200 ROWS ONLY`. With no column names in the SQL, there's nothing to get wrong, so Config Snapshot (SQL) / Extract All / BR100 run clean on the first try with no Learn-Schema / Rebuild / overrides needed. (Also removed an embedded `= "Y"` double-quote bug.) The catalog/rebuild/override machinery remains for producing curated column subsets when you want them, but extracts work out of the box.
- Validation rules still use real column logic (can't be SELECT *) — those are hardened separately via Verify → Apply fixes / Rebuild against the catalog.

---

## [3.26.1] — 2026-06-26 · "Rebuild reaches all paths"

### Fixed
- **Catalog fixes weren't applying to Config Snapshot (SQL).** Finance/SCM objects live in CONFIG_AREAS but Config Snapshot runs them under a `mod:` key while fixes were stored under `area:` — so overrides were ignored on that screen. `cfgSqlFor` now resolves equivalent keys (`mod:fin↔area:finance`, `mod:scm↔area:scm`), and rebuilds are stored under both, so fixes apply everywhere.
- **Rebuild now fetches the columns it needs.** The broad harvest didn't reach every config table, so Rebuild skipped them. It now **fetches each config table's real columns on demand** (read-only data-dictionary query) before rebuilding, so every extract is regenerated from real columns — clearing the `ORA-00904` column errors (SET_OF_BOOKS_ID, ITEM_STATUS, UOM_CLASS, …) across all modules.

---

## [3.26.0] — 2026-06-26 · "Catalog rebuild + Error Log"

### Added
- **🔧 Rebuild extracts from catalog.** Regenerates every config-extract SELECT to use only columns that actually exist on your pod (from the harvested catalog), as overrides. Fixes the `ORA-00904` column errors (e.g. EBS-ism `SET_OF_BOOKS_ID`) that Apply-fixes couldn't rename — across all module extracts at once. Tables not in the catalog are skipped.
- **Remove custom objects.** A control to prune Alto-Shaam (or any pod's) **custom objects** from the catalog by name prefix (e.g. `XXAS_`), with an opt-in "drop anything not on a standard Fusion prefix" heuristic. Persisted.
- **⛔ Consolidated Error Log.** Every Config Snapshot (SQL) / Extract All / Validate run now shows one Error Log at the top — every errored object on one line (`label [table] → ORA-00904 invalid identifier: SET_OF_BOOKS_ID`), with **📋 Copy all** and **⬇ Download log**. No more clicking each error.

### Safety
- All read-only — rebuilds and the log only transform/read; custom-object removal prunes the local catalog only; nothing is written to the pod.

---

## [3.25.1] — 2026-06-26 · "Durable schema catalog"

### Fixed
- **The harvested schema catalog wasn't persisting.** A real-pod harvest (Alto-Shaam: 26.8k tables, 8.1k views, 245.8k columns) is ~20MB+ — far past the localStorage ~5MB quota, so it was silently dropped and lost on restart. The catalog now saves to its own durable userData file (`talk2sql-schema-catalog.json`, no size limit), loaded on launch. localStorage stays as a best-effort cache. *(main.js + preload change — needs a full restart.)*
- Recovery for an already-harvested (in-memory) catalog: **⬇ Export** it, restart on this build, **⬆ Import** the JSON — it then writes to the durable file and persists. Future harvests persist automatically.

---

## [3.25.0] — 2026-06-25 · "Auto-fix + Config Hub"

### Added
- **🛠 Apply fixes (catalog auto-fix).** After Learn Schema → 🔎 Verify, one click turns every confident finding into a persistent SQL correction (table **and** column names resolved to your pod's real ones) stored as overrides the config/validation/export runners use — so the whole rule set across all modules is fixed at once, not one pod-run at a time. "🩹 N overrides active" with Clear and ⬇ Export (portable to the next pod). Read-only; never edits the source SQL, never writes to the pod.
- **⚙️ Configuration Hub (Config Export consolidation).** Config Export (tab 4) now opens to a clean hub: 6 module launch cards (OM/HCM/SCM/Financials/CX/ICM, with their SQL config-object counts) → click to select the module and run its **SQL config export → BR100** (the path that works on federated pods), plus **✓ Validate (Batch)**. The old by-module REST browser is preserved behind a collapsible "Legacy module browser (REST)," collapsed by default.

---

## [3.24.1] — 2026-06-25 · "Durable storage (history fix)"

### Fixed
- **Saved data was lost on restart.** Electron wipes localStorage on file:// relaunch, so the **saved-query history** (and the schema catalog, BI dashboards, discovery answers, scope, Ariadne progress) didn't survive a restart. Added a durable KV store: localStorage is mirrored to a `talk2sql-kv.json` in userData and rehydrated on launch — every app-prefixed key now persists across restarts, like profiles/settings already did. *(main.js + preload change — needs a full restart to take effect.)*
- Note: history already wiped by earlier restarts can't be recovered (it was never stored durably); from this build forward, everything persists.

---

## [3.24.0] — 2026-06-25 · "BI Builder + Dashboards"

The base SQL core now drives BI — a new 📊 pillar to build reports and dashboards on the learned schema.

### Added
- **📊 BI / Dashboards pillar (tab 6).** A catalog-driven **report builder**: search the learned tables/views, pick **dimensions** and **measures** (COUNT/SUM/AVG/MIN/MAX), add filters, group/order/limit, and an optional **join** (auto-suggested on shared `_ID` columns). It generates a read-only SELECT (auto-healed against the catalog), runs it via BIP, and renders a **data table + chart**.
- **Charts** — vanilla inline SVG, no libraries: **Bar · Line · Pie · KPI · Table**, switchable without re-querying. Theme-aware, light/dark safe.
- **Dashboards** — save reports as **tiles** in a responsive grid (sm/md/lg sizes); each tile re-runs its query on the pod and renders its chart. **🔄 Refresh all**, per-tile refresh, chart-type quick-switch (from cache), open-in-builder, remove, editable dashboard name, and **⬇ Export** (dashboard JSON). Persists locally.

### Safety
- Read-only — every report/tile runs SELECTs through the existing guard; charts render real query results only; nothing is written. No external libraries/CDN (offline-safe).

---

## [3.23.0] — 2026-06-25 · "Base SQL Core (Schema Catalog)"

Stop guessing Fusion table names — learn them from the pod and self-heal every query against the truth.

### Added
- **Schema Catalog ("base SQL core").** A new 🧠 Schema Catalog panel learns the pod's real schema from its data dictionary: **🧠 Learn Schema** harvests the table/view inventory broadly (all Fusion app prefixes) plus columns by prefix (paginated, cancellable, incrementally saved) via the read-only BIP engine. Persisted in localStorage and **exportable/importable as `schema_catalog.json`** — a reusable, pod-specific base SQL core. A lookup box resolves any table → real name + columns.
- **Resolver** — `schemaResolveTable` / `schemaResolveColumn` with fuzzy matching (strips/swaps `_B/_VL/_TL/_ALL/_F`, edit-distance within a prefix family) so `VENDOR_NAME`→`SUPPLIER_NAME`, `INV_UNITS_OF_MEASURE_TL`→`_B`, etc.
- **Self-healing SQL.** With the catalog harvested, generated config/validation/export queries are auto-corrected (table names resolved to the real ones) before they run — an "🩹 auto-healed" chip shows what changed. Toggleable; a safe no-op until you've learned the schema.
- **🔎 Verify config SQL vs catalog** — scans all CONFIG_AREAS / CONFIG_MODULE_EXPORT / CONFIG_VALIDATION SQL and reports every table/column not in the catalog with the suggested real name (downloadable), so the whole rule set can be hardened at once instead of one pod-run at a time.

### Next
- BI report & dashboard builder on top of the catalog (Phase 2).

### Safety
- Read-only throughout — the catalog is built from data-dictionary SELECTs; healing transforms query text only; nothing is written; the anti-fabrication guard is untouched.

---

## [3.22.0] — 2026-06-25 · "Per-Module SQL Snapshot"

Audit a module → export ALL its config features → BR100, on the federated pod.

### Added
- **CONFIG_MODULE_EXPORT** — full config feature sets in SQL for **HCM (19), Order Management (14), CX (19), ICM (19)** = 71 config-only objects. Finance and SCM reuse their existing CONFIG_AREAS SQL sets. So all six Config Export modules have a complete SQL config export.
- **📸 Config Snapshot (SQL)** in the Config Export toolbar now runs the **current module's full config feature set via SQL/BIP** (works on SSO/SAML-federated pods), shows per-object results, and generates a per-module **BR100 setup document** (cover, TOC, a data table per feature, sign-off).

### Changed
- The Config Snapshot button was **repointed from REST to SQL/BIP**. The old REST snapshot (`item.ep` endpoints) returns nothing on federated pods like Alto-Shaam (REST 404s) and mixed in a transactional item; the SQL path is config-only and works on the pod.

### Note
- As with SCM, each module's SQL set may need one pod-run to correct release-specific table/column names — anything that errors shows in the BR100 (not a failure), and gets fixed with the ground-truth error.

---

## [3.21.0] — 2026-06-25 · "Batch BR100"

### Added
- **📄 BR100 Report (batch).** After Extract All, generate one self-contained **BR100 setup document** for the whole area — cover (BR100 logo, area, instance, date, totals), table of contents, a BR100 section + data table per object, setup-only objects shown with their Setup & Maintenance path, errored objects showing the SQL, and a Prepared/Reviewed/Approved sign-off. Same Oracle BR.100 format as the single-item Config Snapshot, but covering every configured object in the area at once. Self-contained HTML (print-to-PDF).

---

## [3.20.0] — 2026-06-25 · "Extract-All Report + Pod Fixes"

### Added
- **⚡ Extract All → Configuration Extract Report.** One click per area runs every extractable object in the manifest against the pod and compiles an as-built **Configuration Extract Report** (self-contained HTML + Markdown): header (pod/instance, date, area), summary, table of contents, a data table per object (capped, with row counts), setup-only objects documented with their Setup & Maintenance guide, errors flagged per object. The "document the config" deliverable alongside the validation report.

### Fixed
- **Report download extension bug.** The file-save handler defaulted everything except Excel/CSV to a **JSON** filter, so HTML reports saved as `report.html.json`. Now HTML/Markdown/SQL/CSV/JSON each save with the correct extension. *(main.js change — requires a full app restart, not just Force Reload.)*
- **SCM validation rules corrected against the live pod.** All 14 rules that errored (ORA-00942 / ORA-00904 from EBS-isms and wrong columns — `ORG_ORGANIZATION_DEFINITIONS`, `EGP_SYSTEM_ITEMS_B.MASTER_ORGANIZATION_ID`/`ITEM_CLASS_ID`, `INV_UNITS_OF_MEASURE_TL.BASE_UOM_FLAG`, `POZ_SUPPLIERS.VENDOR_NAME`, `INV_ORG_PARAMETERS.WIP_ENABLED_FLAG`, etc.) now use Fusion Cloud names confirmed by the rules that passed. The two real findings (no buyers; sourcing rules without assignment) validated correctly. Two extract objects (Item Master, Suppliers) aligned to drop the invalid columns.

---

## [3.19.0] — 2026-06-23 · "Everything Extractable"

The architect job: document every configured item, then validate it. So nearly every config object is now extractable.

### Changed
- **Setup-only → extractable.** 15 setup-only entries that were only showing Setup & Maintenance guidance now **extract real config via SQL** (calendars, COA value sets, cross-validation rules, data access sets, SLA methods, tax, AP/AR options, PPP, cash mgmt, FA controls; item statuses, shipping/carriers, cost books; source systems, account relationship types). The Setup & Maintenance path is kept as a reference. Result: **66 extractable + 2 setup-only** per the three areas (only Data Quality/Dedup and per-country Geography Validation stay setup-only — no clean config table). 11 duplicate entries were merged.
- Every extractable object can now be run, batched, documented (downloaded), and **validated**.

### Fixed
- **Config Batch area buttons did nothing on click** — the batch rendered into a container below the fold. Navigation now scrolls the result into view.
- **Config Export ↔ Config Batch bridge** — a **📦 Batch & Validate →** button in Config Export (tab 4) jumps to the matching area's Config Batch (Financials→Finance, SCM→SCM, CX→Customer).

---

## [3.18.0] — 2026-06-23 · "Setup-Only Areas in Config Export"

### Added
- **Setup-only areas now included in per-area config exports.** Configuration that lives in Setup & Maintenance (not SQL-extractable) — led by **Geographies & Master Address Data** — is now part of each area's Config Batch: **28 setup-only entries** across Customer (6), Finance (12), SCM (10), each with its **📋 Setup-only area** badge and the exact **Setup & Maintenance →** navigation guide.
- They render distinctly (badge + guide, no Run button, but a checkbox so you can include/exclude), are emitted as **commented SETUP-ONLY blocks** in the generated batch script, and are listed in the **FSM export manifest** with a `Type` column (Extract vs Setup-only) + the guide — so the manifest is the complete picture of an area's configuration. Header counts now read "N extractable + M setup-only."

### Safety
- Setup-only objects carry no SQL and can never be Run — they're documentation/guidance. Read-only throughout; guard untouched.

---

## [3.17.0] — 2026-06-23 · "Validation Report"

### Added
- **Validation report.** After running ✓ Validate Configs, generate a clean, shareable **report** of the findings — a customer deliverable. **📄 Generate report (HTML)** produces a self-contained, printable (→PDF) document; **⬇ Markdown** gives a .md version. When two or more areas have been validated, a **Combined report (all areas)** is offered.
- Report contents: header (pod/instance, date, area), an **executive summary** with pass/warn/fail/error counts and a plain verdict + a status banner, a **findings table** ordered fails-first (check · category · severity · count · remediation), and a **passed-checks appendix** (the sign-off list of what was verified). Footer notes it's read-only and that an ERROR means a table not present on the pod, not a config failure.

### Safety
- Built entirely from the already-fetched validation results — no new queries, no network, read-only. Downloaded HTML is self-contained.

---

## [3.16.0] — 2026-06-23 · "Config Validation"

Not just "is it set up" — "did they set it up *correctly*." A ✓ Validate Configs button per area.

### Added
- **Config Validation engine — 66 rules** across Finance (30), Supply Chain (21), and Customer/TCA (15), each tagged **completeness · correctness · best-practice**. Examples: ledger missing COA/calendar/currency; BU without default LE; tax regime with no rates; COA value set with no values; inventory org without parameters; price list with no lines; supplier without site; customer account with no site; account site with no bill-to/ship-to use; duplicate parties; geography structure without nodes / orphan hierarchy nodes.
- **✓ Validate Configs button** in each area's Config Batch view. Runs every rule read-only against the pod; each rule returns the **offending rows** (zero rows = PASS), classed **FAIL** (completeness/correctness) or **WARN** (best-practice).
- **Validation report** — a PASS / WARN / FAIL summary with a plain-English verdict ("Finance config: 4 issues to fix, 2 best-practice warnings"), findings ordered fails-first, each with the rule, count, **remediation** (where to fix it in Setup & Maintenance), and a **🔍 View rows** link to inspect the offending records.

### Safety
- Read-only throughout — validation only *finds* problems (the rule SQL returns exceptions), never writes. Findings render in the Config Batch panel, never on the SQL grid; the anti-fabrication guard is untouched.

---

## [3.15.0] — 2026-06-23 · "Config-Only + Area Batch"

Configuration, not transactions. Detection and the new per-area batch extract only setup/master data — never invoices, orders, receipts, or payments.

### Fixed
- **Detection is now configuration-only.** ~24 detect queries that were counting *transactions* (AP/AR invoices, payments, journals, POs, requisitions, orders, shipments, work orders, ICM comp transactions) now check the corresponding *configuration* object instead (payment terms, receipt methods, journal sources, document styles, order orchestration, work definitions, ICM formulas/rules…). "Detected" now means **set up**, never **transacted**. Audit confirms **0 transactional tables** remain in any detection query.

### Added
- **`CONFIG_AREAS`** — configuration-only object catalogs for **Finance (23)**, **Supply Chain (17)**, and **Customer/TCA (11)**: ledgers, COA, calendars, currencies, tax, banks, payment terms/methods, receipt methods, FA books, item/inventory setup, pricing, suppliers, OM orchestration, sourcing, cost profiles, work definitions, parties, customer accounts/sites/profiles, geographies — all read-only config SELECTs, no transactional tables.
- **📦 Config Batch (by area).** Pick Finance / SCM / Customer → a checklist of that area's config objects → **Generate batch script** (one stacked read-only extract), **Open in editor**, **Download .sql**, or **Download FSM export manifest** (the Oracle-native batch path: Manage Configuration Packages / Export Setup Data). Run a single object or the whole area.

### Note
- The domain **loop SQL** stays transactional **by design** — that's the explicit "loop with data" view, the one specified exception.

---

## [3.14.0] — 2026-06-23 · "Ariadne Config Builder (Pass 1)"

Ariadne starts building configuration, not just guiding it. Pilot: **Foundation (Geographies)** — buildable from base details with no upstream. (Downstream/calculation modules like ICM need their full dependency chain + plan details first, so they're modeled for later.)

### Added
- **AI Config Builder — capture → generate → preview → download.** A new "🛠 Build & Push config" view (from any module's loop or module view) where you fill a **questionnaire**, it's **captured and stored**, and Ariadne **generates the upload file** in the best format for that object.
- **Channel auto-pick.** Each object routes to the right mechanism — **FBDI** (bulk import CSV), **REST** (JSON payload), or **FSM Setup Data** (setup-data CSV) — with the rationale shown, and an override dropdown.
- **Foundation pilot — 15 objects.** Geographies (8): Country Geography Structure, Geography Types, Master Reference Usage, Geography Nodes (FBDI), Parent-Child hierarchy (FBDI), Address-Style Mapping, Validation Control, Import (Loqate/file). Plus the core chain: Enterprise Definition, Currencies, COA Structure + Segment Values (FBDI), Primary Ledger, Legal Entities, Business Units. Repeatable tier editors for nodes/segments/currencies/LEs/BUs.
- **6 ICM objects** also modeled (Comp Plan, Component, Rate Table, Rate Dimension, Participant/Role, Comp Transaction) for when the dependency chain is in place.
- Each object generates the artifact text + a step-by-step **Fusion upload runbook** + a **⬇ Download**. Every artifact is fenced "best-effort template — validate column names against your pod's import template."

### Next (Pass 2)
- Gated push: confirm → submit the generated artifact via the chosen channel using your pod's auth → verify by detection (the node flips to ✓ Configured). Dev-first, environment-aware.

### Safety
- The builder generates files only — it does not write to the pod in this pass, never touches the SQL grid, and the anti-fabrication guard is untouched.

---

## [3.13.0] — 2026-06-23 · "Ariadne Brain"

Ariadne now thinks like an SI / Enterprise / Solution Architect and guides you — bidirectionally.

### Added
- **Architect rules engine (the brain).** A deterministic reasoning layer over the framework — phase position, readiness, next moves with the architect's "why," blockers with the exact unmet prerequisites, and an **EA-grade audit** (foundation-gate, CX→SCM PIM, ICM-needs-OM/AR/HCM, clean-TCA-first, detection drift, discovery gaps). Offline, never fabricates, always cites the rule.
- **Architect Guidance panel** at the top of Ariadne: phase + readiness, next moves, **🔍 Run review**, and **agentic clarifying questions** — when scope or key discovery answers are missing, Ariadne asks, and your quick-pick answers configure the app (bidirectional).
- **Ask-Ariadne Q&A.** Ask "What do I do first?", "Why is ICM blocked?", "Show my critical path," etc. — answered from the dependency/flow rules, citing the why.
- **Claude API layer (optional).** Connect your Anthropic key (stored encrypted in the OS keychain — never in the renderer, code, or logs) and Ask-Ariadne answers with senior-architect reasoning grounded in your live state snapshot. Falls back to the rules engine when no key is set. AI guidance is fenced to the advisor panel — never the SQL grid.

### Changed / Fixed
- **Graph interaction redesigned.** **Left-click a box → opens its end-to-end loop** (the docked hover panel was covering right-side nodes and eating their clicks — fixed). **Right-click → connection popup at the node** (prereqs/dependents with status), so it appears right where you're looking instead of far away. Hover now just highlights the node's edges.

---

## [3.12.0] — 2026-06-23 · "Ariadne Scope"

You answer Discovery and pick what you're implementing; the roadmap narrows to your choices.

### Added
- **Discovery is now answerable.** Every Discovery question has an answer field that saves automatically (locally). Per-group and overall "answered" counts, plus a **📋 Copy answers** button to export the whole Q&A as text.
- **Scope picker — choose your modules/pillars.** A "🎯 Scope — what are you implementing?" panel lets you select modules (or whole pillars). Your picks persist.
- **Scope-driven roadmap.** Once a scope is set, the roadmap shows **only what you need** — your chosen modules plus the prerequisites they pull in automatically (transitive). Out-of-scope nodes dim; prereq-pulled-in nodes are marked with a dashed ring + "↳" so you see why they're there. The summary, "next actions," and counts recompute to the in-scope set. A toggle flips between **in-scope only** and **show all 46** (choices preserved).

### Fixed
- **Hover panel visibility.** The connection side-panel had a hardcoded dark background that made text unreadable in the light theme — it now uses a theme-aware opaque surface with high-contrast text and slightly larger type.

---

## [3.11.0] — 2026-06-23 · "Ariadne Loops"

Click a box → see its connections, their status, and runnable SQL for the whole end-to-end loop with data.

### Added
- **Hover → connection side-panel.** Hovering a node docks a panel showing its connection map — prerequisites (in) and dependents (out), each status-colored — plus P1-remaining and the business loop it belongs to. Prereq/dependent names are clickable.
- **Click → end-to-end loop view.** Clicking a box opens the domain process loop it lives in, with a connection strip (prereqs → this → dependents) and the ordered flow steps.
- **10 domain end-to-end flows** (64 steps): Earn-to-Pay (ICM), Order-to-Cash, Procure-to-Pay, Record-to-Report, Plan-to-Produce, Lead-to-Order, Request-to-Resolution, Hire-to-Retire, Subscription-to-Cash, and Foundation/Master-Data. All 46 modules mapped to their flow.
- **Loop SQL — stacked + joined.** Each loop gives you a **per-step script** (every step's read-only data SQL, commented) and a **combined join query** that returns the data flowing across the whole loop. Open either in the editor, or hit **⚡ Run loop** to execute the join and see the rows inline.
- **🔧 Build steps** button in the loop view jumps to the Probe → Learn → Build detail for that module.

---

## [3.10.0] — 2026-06-23 · "Ariadne Drive"

The roadmap becomes the command center — it drives the work, not just shows it.

### Added
- **🛰 Probe the pod (1-click).** One button runs a read-only detect across all 46 modules and lights the whole graph up by **real pod state** — Configured / Missing / Error. Connect → click → instant implementation-status dashboard. Includes a Clear and a graceful "connect first" guard.
- **⚡ Live edges.** Every dependency connection now shows whether it's *live*: when a prerequisite is Done or detected-configured, its edges turn green and **flow** (animated) — the live thread spreads through the graph as the implementation gets built. The SCM → CX Products reconciliation edge flows green when satisfied.
- **▶ What's-next guidance.** A "Next actions" panel lists the Ready tasks in priority order (most P1-critical first), each click-to-drill; Ready nodes pulse so your eye goes straight to what's actionable.
- **Filter / focus / search.** Filter the graph by pillar, phase, status, or "has P1 remaining"; click legend chips to isolate a status; type to search-and-highlight (the rest dim); live "N of 46 shown" count. Rich **hover cards** show task, prereqs (status-colored), P1-remaining, and stage counts without drilling in.
- **Node → SQL workspace.** **⇧-click** any node (or use the new "▶ Open detect SQL in editor" / per-item "▶ Editor" buttons) to load that detect SQL straight into the query editor — the roadmap now drives the live SQL side.
- **⛶ Full screen** for the roadmap (from v3.9.x) — button on the summary line and in the graph controls; Esc to exit.

---

## [3.9.0] — 2026-06-23 · "Ariadne Prioritized"

### Added
- **Probe → Learn → Build prioritization on every step.** All 563 config items are now classified by **stage** (🔎 Probe = inspect current/upstream state · 📐 Learn = design decisions to settle first · 🔧 Build = create/configure/load) and ranked **P1 / P2 / P3** (P1 = critical path or hard to reverse), each with a one-line rationale that holds up to a deep-dive. Distribution: Probe 43 · Learn 109 · Build 411; P1 174 · P2 267 · P3 122.
- **"⚑ Priority Path" panel** in each module — the do-this-next ordered checklist (all P1, then P2), sequenced Probe → Learn → Build, each row showing the priority chip, stage, item, its section, and the rationale. Built for presenting.
- **Stage rail + "P1 remaining"** per module, and a **P1-remaining badge on each graph node** that ticks down as live detection confirms items configured.
- **L4 items grouped by stage** (Probe → Learn → Build) and sorted P1-first, with a `⚑ why` rationale line on every item.

---

## [3.8.0] — 2026-06-23 · "Ariadne Live"

### Added
- **Interactive dependency graph.** The Ariadne roadmap is now a zoomable, pannable SVG graph of all 46 tasks laid out in six phase columns, edges drawn prerequisite → task. Nodes are colored by status (Done / Ready / Blocked); the cross-pillar reconciliation edge **SCM Item Master → CX Products** is highlighted. Wheel to zoom, drag to pan, ＋ / − / ⤢ Reset.
- **Drill-down L1 → L4.** Click a node to drill: **L2** module map → **L3** module detail (prerequisites, dependents, build-lifecycle sections) → **L4** config items. Breadcrumbs (`All ▸ pillar · task ▸ section`) navigate back up.
- **46 full module lifecycles.** Authored `ARIADNE_L34` — **187 sections / 563 config items** across all 46 tasks (Foundation, ERP, SCM/Mfg, HCM, CX, Subscriptions, Marketing, PRM, ICM), each item tagged LIVE or GUIDE.
- **Live pod detection.** **351 read-only detect queries** run against the connected pod via the BIP engine. Detect a single item or a whole module; results roll up to **Configured / Partial / Missing** and a fully-configured module auto-marks Done. Detection is SELECT-only and never writes — a missing object yields a safe "Missing," a wrong table a safe error.

### Changed
- The static phase list from 3.7.0 is replaced by the interactive graph. Manual Mark-Done still persists locally; live detection is in-memory and reflects real pod state.

---

## [3.7.0] — 2026-06-23 · "Ariadne"

### Added
- **Ariadne** 🧵 — *Your Thread Through the Fusion Labyrinth.* Pillar 5 (formerly "Greenfield") is now an agentic, dependency-gated **end-to-end Fusion implementation builder**. *Probe → Learn → Build.*
- **46-task dependency engine** spanning **11 pillars** across phases 1–6: Foundation (Common) → Customer Data Cleansing → ERP/Financials, SCM/Procurement/Mfg, HCM → CX (Sales/Service/CPQ), Subscriptions, Marketing/Eloqua, PRM → ICM. Encoded in `ARIADNE_DEPS` as the authoritative graph (`{id: {phase, pillar, task, prereqs}}`).
- **Live Ready / Blocked / Done gating.** Each task shows `✓ Done` / `● Ready` / `🔒 Blocked` with a "needs: …" list of unmet prerequisites. Mark a task Done and every downstream task recomputes instantly. A header summary tracks "X done · Y ready · Z blocked · of 46." Progress persists locally (planning state only — never pod data, so the read-only-pod guarantee is intact).

### Changed
- Pillar 5 renamed **Greenfield → Ariadne** (tab, header, code comments). Subtitle: *"Probe → Learn → Build. Dependency-gated, end-to-end, agentic."*
- The CX build lifecycle was **reconciled against the Foundation dependency model**. Cross-pillar edges now enforced: **CX Products & Catalog ← SCM Inventory/Item Master (PIM)**; the CX stack is gated behind **Foundation + Customer Data Cleansing**; ICM is terminal at Phase 6 (Transactions ← Plans + Order Management + Receivables).

### Notes
- Source of truth for the graph: `HANDOFF_Fusion_Foundation.md`, `Fusion_SI_Implementation_Playbook.docx`, and `Fusion_Implementation_Tracker.xlsx` (Module Tracker + Dependencies tabs).
- Anti-fabrication guard, SQL engines (REST/BIP), auth modes, and other pillars unchanged. Parse check + `npm test` green.

---

## [3.6.0] — 2026-06
- Added Pillar 5 "Build" — SI implementation copilot (Discovery / Foundation / Modules). Moved `foundation` out of Config Export into `BUILD_JOURNEY`.

## [3.5.0] — 2026-06
- Live Schema Explorer (⚡ Live toggle): lazy schema → table/view → column tree from the data dictionary, module-aware family chips. Docs: SETUP, FEDERATED-ACCESS-JOURNEY, SSO-PLAYBOOK (+PDF).

## [3.3.x] — 2026-06
- **Federated-pod live SQL solved.** Local non-federated service account + standard BI roles + OFJDBC data model (`DBMS_XMLGEN` over `:p_sql`) + BIP SOAP (`ExternalReportWSSService`, WS-Security UsernameToken) + nested-`<ROWSET>` parsing. Verified against the SAML-federated Alto-Shaam DEV pod.

## [3.2.0] — 2026-06
- BIP SQL engine: real server-side SQL via BI Publisher `runReport`. Engine toggle REST | BIP.

## [3.0.1] — 2026-06
- Removed the `aiData()` LLM fallback entirely. Anti-fabrication invariant enforced via `t2sProcessResponse` choke point + `t2sAssertRenderable` render boundary + guard test. Read-only SQL gate (SELECT/WITH only).
