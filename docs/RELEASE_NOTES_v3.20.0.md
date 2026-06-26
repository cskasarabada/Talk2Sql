# Talk2Sql v3.20.0 — Extract-All Report + Pod Fixes 🧵📄

## Added — ⚡ Extract All → Configuration Extract Report
One click per area (Finance / SCM / Customer) runs **every extractable object in the manifest** against the pod and compiles an as-built **Configuration Extract Report**:
- Self-contained **HTML** (print-to-PDF) + **Markdown**.
- Header (pod/instance, date, area), summary, table of contents.
- A **data table per object** (column headers + rows, capped with a count), so you see the actual configuration.
- **Setup-only** objects documented with their Setup & Maintenance path.
- Errors flagged per object (a table/column not on this pod shows as an error, not a config issue).

This is the "document the configuration" deliverable that sits alongside the Validation Report. Together: **Extract All** (document) + **Validate Configs → report** (validate).

## Fixed
- **Report saved as `.html.json`.** The file-save handler defaulted everything except Excel/CSV to a JSON filter, so HTML reports got a `.json` extension. HTML / Markdown / SQL / CSV / JSON now each save correctly. *(This is a main-process fix — fully quit and `npm start` again; Force Reload alone won't pick it up.)*
- **SCM validation corrected against the live Alto-Shaam pod.** The 14 rules that errored (EBS-isms and wrong columns) now use Fusion Cloud table/column names confirmed by the rules that passed. The validation already caught two real findings — no buyers configured, and sourcing rules without an assignment set.

## Notes
- Extraction and validation are **read-only** — only config SELECTs run; nothing is written. Findings/data render in the Config Batch panel and the downloaded reports, never on the SQL grid.
- A few SCM rules and several Finance/Customer rules are still best-effort on table/column names — run Validate / Extract All on each area; anything that shows an error is a name to adjust (never a write). Send the errors and they get fixed with ground truth.

## Install
Download the DMG (macOS) or EXE (Windows) below. Unsigned — on macOS, right-click → Open the first time (or run `Fix-macOS-Open.command`).
