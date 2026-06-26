# Talk2Sql v3.23.0 — Base SQL Core (Schema Catalog) 🧵🧠

**Stop guessing Fusion table names. Learn them from the pod, keep them as a base SQL core, and self-heal every query against the truth.** This is the backbone that ends the ORA-00942/00904 loop and feeds the BI builder next.

## What's new

**🧠 Schema Catalog — learn the pod's real schema.**
A new panel by the Schema Explorer. **🧠 Learn Schema** harvests the pod's data dictionary through the read-only BIP engine:
- the full **table/view inventory** (broad — all Fusion app prefixes), plus
- **columns by prefix** (CN_, HZ_, GL_, AP_, AR_, EGP_, INV_, QP_, DOO_, PER_, … and many more), paginated, cancellable, and saved incrementally so a long run isn't lost.

It persists in the app and **exports/imports as `schema_catalog.json`** — your reusable, pod-specific base SQL core. A lookup box resolves any table name → its real name + columns.

**Resolver.** Fuzzy matching (`schemaResolveTable` / `schemaResolveColumn`) strips and swaps the Fusion suffixes (`_B / _VL / _TL / _ALL / _F`) and uses edit-distance within a prefix family — so `INV_UNITS_OF_MEASURE_TL` → `_B`, `VENDOR_NAME` → `SUPPLIER_NAME`, and the like.

**Self-healing SQL.** Once the catalog is harvested, every generated config / validation / export query is auto-corrected (table names resolved to the real ones) **before it runs** — with an "🩹 auto-healed" chip showing what changed. Toggleable, and a safe no-op until you've learned the schema.

**🔎 Verify config SQL vs catalog.** One pass scans all the config/validation/export SQL and reports every table or column not present on your pod, with the suggested real name — downloadable. Harden the whole rule set at once instead of one pod-run at a time.

## How to use
1. Connect to the pod → **🧠 Learn Schema** (let it harvest — it's read-only and resumable).
2. **🔎 Verify config SQL vs catalog** to see/fix any name mismatches across all modules.
3. Leave **Auto-heal** on — extracts, validation, and BR100 now self-correct table names against your pod.
4. **⬇ Export** the catalog as your base SQL core to reuse on the next engagement.

## Next
Phase 2: a BI report & dashboard builder that generates accurate SQL from the catalog (real tables, columns, joins) and renders charts/KPIs.

## Safety
Read-only end to end — the catalog is built from data-dictionary SELECTs, healing only rewrites query text, nothing is written to the pod, and the anti-fabrication guard is untouched.

## Install
Download the DMG (macOS) or EXE (Windows) below. Unsigned — on macOS, right-click → Open the first time (or run `Fix-macOS-Open.command`).
