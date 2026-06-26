# Talk2Sql v3.25.0 — Auto-fix + Config Hub 🧵🛠

## Added — 🛠 Apply fixes (catalog auto-fix)
The base SQL core now *fixes* the SQL, not just flags it. After **🧠 Learn Schema → 🔎 Verify config SQL vs catalog**, click **🛠 Apply fixes**: every confident finding becomes a persistent correction — table **and** column names resolved to your pod's real ones — stored as overrides that the config / validation / export runners use. One click hardens the whole rule set across all modules instead of one pod-run at a time.

- "🩹 N SQL overrides active" indicator, with **Clear** and **⬇ Export** (the overrides are portable to the next customer's pod).
- Re-runs verify after applying, so you see what's resolved vs the low-confidence ones left for manual review.
- Read-only: it only rewrites generated query *text* using catalog-resolved names; it never edits the source SQL and never writes to the pod.

**Workflow:** Connect → 🧠 Learn Schema → 🔎 Verify → 🛠 Apply fixes → run Validate / Extract / Snapshot — the name errors are gone.

## Added — ⚙️ Configuration Hub (Config Export consolidated)
Config Export (tab 4) now opens to a clean hub:
- **6 module launch cards** (OM / HCM / SCM / Financials / CX / ICM) with their SQL config-object counts — click one to select the module and run its **SQL config export → BR100** (the path that works on federated pods).
- **✓ Validate (Batch)** jumps to the per-area validation.
- The old by-module **REST browser** is preserved behind a collapsible **"Legacy module browser (REST)"**, collapsed by default (REST 404s on federated pods, so it's secondary but kept for non-federated/demo pods).

## Safety
Read-only throughout. Overrides and the hub never write to the pod or mutate the source config data; the anti-fabrication guard is untouched.

## Install
Download the DMG (macOS) or EXE (Windows) below. Unsigned — on macOS, right-click → Open the first time (or run `Fix-macOS-Open.command`).
