# Talk2Sql — Project Brief & Context Handoff

> Paste this into a new chat to carry full context. Updated at app version **v3.0.1**.

## What Talk2Sql is

An **Electron desktop app** that lets a user write SQL against **Oracle Fusion**. There is **no backend / no `oracledb` / no `cursor`** — it maps the SQL `FROM` table to a Fusion **REST resource**, fetches it live over HTTPS, and applies `SELECT / WHERE / GROUP BY / aggregates / ORDER BY / LIMIT` **client-side** on the returned rows. NLP→SQL generation uses the Claude API to produce a SQL *string only* (never data).

## The core problem we fixed

The old app **fabricated data**: on any failed, empty, or unmapped query it silently fell back to an LLM (`aiData()` via the Claude API) that invented realistic-looking rows. That fake data was shown as real and acted on externally — the defect that caused real trouble.

## Current state (v3.0.1) — what's done

- **All fabrication removed.** `aiData()` deleted; no demo/hardcoded/sample data anywhere.
- **Single invariant:** result rows have exactly one origin — a live REST fetch in the current request, tagged with provenance. Every other path yields an **error** or an explicit **"0 rows returned"** state. Never invented rows.
- **Choke point:** all REST responses flow through `t2sProcessResponse()` → returns exactly one of `error | empty | rows`. The render boundary calls `t2sAssertRenderable()`, which throws if rows lack `prov.live === true`.
- **Provenance stamp** on results: `✓ Verified against <instance> at <time> — N rows`. Oracle/HTTP errors surfaced **verbatim**. **Read-only SQL gate** (`t2sReadOnlySQL` — SELECT/WITH only; rejects DML/DDL/multi-statement/result-junk).
- **Grid wiped** on every new query and every error; zero rows is a first-class explicit state.
- **Guard test** (`npm test` → `test/t2s-guard.test.js`) extracts the *real embedded guard code* from `index.html` and proves dropped-connection, malformed-SQL (ORA-00942), and zero-row cases never put rows on the grid, plus that untagged rows are refused. 21 assertions, all pass.
- **Real REST mappings** added in `REST_MAP`: opportunities (`MKL_OPPORTUNITIES_ALL_*` → `/crmRestApi/.../opportunities`), channel programs (`CJM_PROGRAMS_ALL_*` → `/fscmRestApi/.../channelPrograms`), inventory (`INV_ONHAND_QUANTITIES_VAL` → `/fscmRestApi/.../inventoryOnhandBalances`), items (`EGP_SYSTEM_ITEMS_*` → `itemsV2`). Unmapped tables fail fast with a clear message (no silent catalog-root 400).
- **Hybrid auth:** Basic (username/password) is default; an **SSO interactive-login mode is built but hidden** behind `var SSO_ENABLED = false;` in `renderer/index.html`. All REST GETs route through one transport choke point, `t2sAuthGet(url)`.

## The auth situation (why SSO is hard)

Customer pods (e.g. Alto-Shaam) are **SAML-federated to Microsoft Entra ID**. Proven empirically:
- Federated **Basic auth fails** (no local Fusion password to match).
- The **UI session cookie returns HTTP 401 for REST** — no cookie/session shortcut.
- Password reset is moot (redirects to the IdP; nothing on the Oracle side).

Oracle's rule: **federated SSO users must use an OAuth access token for REST.**

## Decided path forward

**OAuth 2.0 Client Credentials → Bearer token**, minted in the **main process** from the customer's IAM identity domain:
- Token endpoint: `https://<iam-domain>/oauth2/v1/token`, `grant_type=client_credentials`, scope e.g. `urn:opc:resource:fusion:<pod>:erp/`.
- Client secret stored in **OS keychain** (Electron `safeStorage`); renderer never sees the secret or token.
- Fallback: a **local (non-federated) service account** with Basic if the customer can't register an OAuth client.
- Full design + diagrams: **`docs/SSO-Auth-Architecture.html`**.

This is an **assessment** — building OAuth is optional, not urgent.

## Hard guardrail for ALL future work

**Never reintroduce a path that can put non-live data on the grid.** Auth changes transport only; `t2sProcessResponse` / `t2sAssertRenderable` / the guard test stay intact. If you can't fetch it live this request, render an error or explicit empty — never a substitute.

---

## Repo & git

| | |
|---|---|
| **Remote** | `https://github.com/cskasarabada/Talk2Sql.git` |
| **Local path** | `~/GitFolders/Talk2Sql` |
| **Branch** | `main` |
| **HEAD** | `c410533` — *v3.0.1 — remove data fabrication; live SQL→REST execution with provenance + guard test; hybrid Basic/SSO auth (SSO gated off)* |
| **Latest tag** | `v3.0.1` (points at `c410533`) |
| **Stale tag** | `v3.0.0` points at the OLD pre-fix commit `658f6b0` — left as-is (no one uses the releases). Do **not** ship from v3.0.0. |

### Key files
- `main.js` — Electron main; IPC handlers incl. SSO (`sso-login` / `sso-fetch` / `sso-clear`).
- `preload.js` — `contextBridge` exposure (`electronAPI`, incl. `ssoLogin/ssoFetch/ssoClear`).
- `renderer/index.html` — the whole app (UI + logic, one big inline script). Contains the embedded executor + guard block between the markers `/* ===== SQL→REST client-side executor ... ===== */` and `/* ===== end executor ===== */`.
- `test/t2s-guard.test.js` — anti-fabrication guard test (`npm test`).
- `docs/SSO-Auth-Architecture.html` — SSO/OAuth architecture (doc + diagrams).
- `docs/PROJECT-BRIEF.md` — this file.

### Code anchors (in `renderer/index.html`)
- `t2sProcessResponse(http, ctx)` — the single choke point (error | empty | rows).
- `t2sAssertRenderable(payload)` — render-boundary invariant.
- `t2sProvenance / t2sExtractError / t2sReadOnlySQL` — provenance stamp, verbatim error, read-only gate.
- `t2sRun(items, sql)` — client-side SQL executor over REST rows.
- `t2sAuthGet(url)` — transport choke point (Basic now; OAuth branch goes here).
- `REST_MAP` — table → REST resource mapping.
- `SSO_ENABLED` — flag gating the SSO UI (currently `false`).

### Commands
```bash
cd ~/GitFolders/Talk2Sql
npm install          # first time
npm start            # run the app (Electron)
npm test             # run the anti-fabrication guard test
npm run build:mac    # build .dmg
npm run build:win    # build .exe
```

### Release flow
GitHub Actions (`.github/workflows/build.yml`) triggers on a pushed tag `v*`, builds mac `.dmg` + win `.exe`, and publishes a GitHub Release. To cut a release:
```bash
# bump version in package.json AND the 3 labels in renderer/index.html first, then:
git add -A && git commit -m "vX.Y.Z — ..."
git push origin main
git tag vX.Y.Z && git push origin vX.Y.Z
```
> Note: a stale `.git/index.lock` has bitten commits here before — if `git commit` complains another process is running, `rm -f .git/index.lock` and retry.

## Open items / roadmap
- **Phase 0 (done):** anti-fabrication guard, provenance, Basic/SSO hybrid, single `t2sAuthGet` choke point — v3.0.1.
- **Phase 1:** Token Manager in main (client-credentials fetch + cache/refresh; `authedFetch` over IPC; secret via `safeStorage`).
- **Phase 2:** `authMode:"oauth"` + profile fields + `t2sAuthGet` OAuth branch (guard unchanged).
- **Phase 3:** keychain storage, refresh-once-on-401, host pinning, token clear on disconnect; extend guard test for the 401-refresh path.
- **Phase 4 (optional):** Authorization Code + PKCE for per-user attribution.
- Optional: route the ICM dashboard / Data Sentinels fetchers (`icmFetch` / `sentFetch`) through `t2sAuthGet` so SSO/OAuth covers the whole app (today they're Basic-only; in other modes they return empty, never fabricate).
