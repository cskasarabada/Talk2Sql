# Talk2Sql v3.15.0 — Config-Only + Area Batch 🧵📦

**Configuration, not transactions.** For Finance, SCM, and Customer, the tool now extracts only setup/master data — never invoices, orders, receipts, or payments.

## Fixed — detection is configuration-only
About two dozen detection queries were counting *transactions* to decide if a module was "in use." That's now corrected: each checks the corresponding *configuration* object instead.

- AP → payment terms / payment methods (not invoices/payments)
- AR → receipt methods / transaction types / sources (not invoices/receipts)
- GL → ledgers / journal sources (not journals)
- FA → books / categories / methods (not mass additions)
- Expenses → expense types / templates (not expense reports)
- Procurement → document styles / buyers / options (not POs/requisitions)
- Order Management → orchestration / order types / sequences (not orders/shipments)
- Manufacturing → work definitions / plant params (not work orders)
- ICM → formulas / rules / plan components / pay groups (not comp transactions)

"Detected" now means **set up**, never **transacted**. An audit confirms **zero transactional tables** remain in any detection query.

## Added — per-area Configuration Batch 📦
A new **Config Batch (by area)** card: pick **💰 Finance**, **📦 Supply Chain**, or **👥 Customer (TCA)** and you get a checklist of that area's configuration objects (Finance 23 · SCM 17 · Customer 11). From there:

- **Generate batch script** — one stacked, read-only extract of all checked config objects (each commented with its label + table).
- **Open in editor** / **Download .sql** — run or save the batch.
- **Download FSM export manifest** — the Oracle-native batch path: a setup-task list + runbook for **Setup & Maintenance → Manage Configuration Packages / Export Setup Data**, to migrate the whole area's configuration between pods.
- **▶ Run** any single object on its own.

All config-only, read-only — no transactional data anywhere in the batch.

## The one exception
The domain **loop SQL** (earn-to-pay, order-to-cash, etc.) stays transactional **by design** — that's the "loop with data" view you asked for, the specified exception to the config-only rule.

## Unchanged
AI Config Builder, architect brain (rules + Claude), scope-driven roadmap, probe-the-pod, anti-fabrication guard. Parse checks and `npm test` pass.

## Install
Download the DMG (macOS) or EXE (Windows) below. Unsigned — on macOS, right-click → Open the first time (or run `Fix-macOS-Open.command`).
