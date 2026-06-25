# Talk2Sql v3.17.0 — Validation Report 🧵📄

**Run the validation, then hand the customer a report.**

After **✓ Validate Configs**, you can now generate a shareable report of the findings — a clean, professional deliverable, not just the on-screen list.

## What's new
- **📄 Generate report (HTML)** — a self-contained, printable document (open it and print to PDF). 
- **⬇ Markdown** — a .md version for notes, tickets, or docs.
- **📄 Combined report (all areas)** — appears once you've validated two or more areas; rolls Finance + SCM + Customer into one document with combined totals and per-area sections.

## What's in the report
- **Header** — pod / instance, generated date/time, the area, "by Talk2Sql · Ariadne".
- **Executive summary** — checks run, ✅ pass / ⚠ warn / ❌ fail / ⊘ error counts, a one-line verdict ("4 issues to fix, 2 best-practice warnings, 24 checks passed"), and a status banner colored by the worst severity.
- **Findings** — fails-first table: check · category · severity · findings (count) · remediation.
- **Passed-checks appendix** — the sign-off list of everything that was verified and passed.
- **Footer** — read-only note, and the clarification that an ERROR means a table/column isn't present on this pod, not a configuration failure.

## Safety
The report is built entirely from the validation results already fetched — no new queries, no network, read-only. The downloaded HTML is self-contained (its own styles), so it opens and prints anywhere.

## Install
Download the DMG (macOS) or EXE (Windows) below. Unsigned — on macOS, right-click → Open the first time (or run `Fix-macOS-Open.command`).
