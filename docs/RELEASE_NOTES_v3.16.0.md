# Talk2Sql v3.16.0 — Config Validation 🧵✓

**Not just "is it set up" — "did they set it up *correctly*."**

Config Export's job is to validate a customer's configuration. This release gives it the actual checking capability: a **✓ Validate Configs** button per area that tells you what's wrong and how to fix it.

## What's new

**66 validation rules** across Finance (30), Supply Chain (21), and Customer/TCA (15), each tagged **completeness**, **correctness**, or **best-practice**. A sample of what they catch:
- **Finance** — ledger missing COA / calendar / currency; no primary ledger; COA value set with no values; missing balancing/natural-account/cost-center qualifier; tax regime with no taxes/rates; bank account without a legal entity; no payment terms; no receipt methods; AutoAccounting not defined; FA book without categories.
- **SCM** — inventory org without parameters; item with no primary UOM / item class; price list with no lines; supplier without a site; no document styles or buyers; orchestration process not defined; sourcing rule with no assignment; cost org without a cost book.
- **Customer (TCA)** — customer account with no site; site with no bill-to/ship-to use; customer with no profile/profile class; duplicate parties; multiple primary site uses; geography structure with no nodes / orphan hierarchy nodes; validation not enabled.

**How it runs.** Open any area's **📦 Config Batch** → **✓ Validate Configs**. Each rule runs read-only against the pod and returns the **offending rows** — zero rows means PASS; rows mean a finding (**FAIL** for completeness/correctness, **WARN** for best-practice).

**The report.** A PASS / WARN / FAIL summary with a plain verdict ("Finance config: 4 issues to fix, 2 best-practice warnings"), findings ordered fails-first, each showing the rule, the count, the **remediation** (where to fix it in Setup & Maintenance), and a **🔍 View rows** link to inspect the exact offending records in the editor.

## Safety
Read-only end to end — validation only *finds* problems; the rule SQL returns exceptions, it never writes. Findings render inside the Config Batch panel, never on the SQL grid, and the anti-fabrication guard is untouched.

## A note for your pod
Rules use standard Fusion config tables; several column/table names vary by release (the build flags the riskier ones). A rule hitting a name your pod doesn't have shows as **ERROR**, not a config failure — adjust the name and re-run. None of it can write.

## Install
Download the DMG (macOS) or EXE (Windows) below. Unsigned — on macOS, right-click → Open the first time (or run `Fix-macOS-Open.command`).
