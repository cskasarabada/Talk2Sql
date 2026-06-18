# Talk2Sql — SSO Customer Playbook

**Reusable reference: what to do when a customer's Oracle Fusion pod uses SSO / SAML federation (Microsoft Entra, Okta, Ping) and you need to run SQL.**

This clubs the setup recipe and the troubleshooting journey into one place. Keep it for the next engagement.

---

## 0. First question: is the pod SSO‑federated?

| | |
|---|---|
| **NOT federated** (login is a plain Oracle/IDCS username + password) | Just connect with **Basic auth**. Nothing below applies. Done. |
| **Federated** (login redirects to Entra/Okta/Ping, often with MFA) | ⚠️ **This is the problem.** Follow this playbook. |

**Why SSO is the blocker:** a federated user authenticates at the corporate IdP and has **no Fusion‑local password**. So username/password (Basic) auth to Fusion's data APIs fails, and the REST API / direct report URLs sit behind the SSO web gate. The only programmatic SQL path is: **a local (non‑federated) service account → BI Publisher SOAP → a `DBMS_XMLGEN` report.** (Same mechanism SplashBI and OFJDBC use.)

---

## 1. The fix — 6 steps (you can do all of these yourself with Security Console + BI Author access; no customer dependency)

### Step 1 — Create a LOCAL service account
**Security Console → Users → Add User Account.** Create a **standalone, local** user (e.g. `talk2sql_svc`) — *not* tied to a worker or the Entra directory. **Reset Password** to a known value. A local account has a real Fusion password — the thing federated users lack, and the whole reason this works.

### Step 2 — Disable MFA for that account
On the user page → **Configure MFA Exclusion → MFA Excluded → Save.** A headless/service account must never be prompted for MFA.

### Step 3 — Assign the STANDARD BI roles
Add **`ORA_BI_ADMINISTRATOR_JOB`** and **`ORA_BI_CONSUMER_JOB`**.
> A *custom* BI role is **not enough** — the report's permissions key to these standard roles, which also grant the privilege to execute reports. Wait ~3–5 min for role propagation.

### Step 4 — Deploy the BI Publisher report (upload + UNARCHIVE)
Download the OFJDBC catalog files from `github.com/krokozyab/ofjdbc` → `otbireport/`:
`DM_ARB.xdm.catalog` (data model) and `RP_ARB.xdo.catalog` (report).
In **`/xmlpserver` → Catalog → Shared Folders → Custom**, create a folder (e.g. `Financials`), then **Unarchive** each `.catalog` into it.
> **Unarchive, do NOT just upload.** A plain upload leaves a `.catalog` *file* (useless); unarchiving deploys the real **Data Model** + **Report** objects. After it, you should see a Data Model icon and a Report icon — not `.catalog` files.

### Step 5 — Grant the account access to the report
On the folder → **More → Permissions** → add the service account with **Read + Execute** on `RP_ARB` and `DM_ARB` (auto‑covered if it has `ORA_BI_ADMINISTRATOR_JOB`).

### Step 6 — Connect in Talk2Sql
- **Auth:** Basic (the service account from Step 1)
- **Instance URL:** pod base URL, e.g. `https://<pod>.fa.<dc>.oraclecloud.com`
- **Engine:** **BIP SQL**
- **⚙ Report path:** `/Custom/Financials/RP_ARB.xdo`
- Save as a profile.

**Smoke test:** `SELECT 1 AS ONE FROM DUAL` → 1 row + green "✓ Verified … → BIP runReport". Then real queries, e.g. `SELECT * FROM CN_COMP_PLANS_ALL_VL FETCH FIRST 5 ROWS ONLY`.

---

## 2. What each error means (and the fix)

| Error | Meaning | Fix |
|---|---|---|
| Redirect to **Entra/Okta login page** | Hit an SSO‑gated endpoint with Basic | Use the SOAP/BIP path + local account |
| `InvalidSecurity … WS‑Security header` | Credential can't be validated (federated user, or temp/"must‑change" password) | Use a **local** account; clear "must change password" by signing in once locally |
| `does not have permission to run the report` | Missing run access | Add `ORA_BI_ADMINISTRATOR_JOB` + `ORA_BI_CONSUMER_JOB`; grant Read/Execute on `RP_ARB` **and** `DM_ARB`; wait for propagation |
| `Invalid format requested: xml` | Report can't emit raw data (interactive `xpt` layout) | Use the OFJDBC `RP_ARB` report (DBMS_XMLGEN) |
| `report path not found` / 404 | Wrong path, or `.catalog` was uploaded but never **unarchived** | Unarchive; path is `/Custom/Financials/RP_ARB.xdo` |
| `ORA‑00942: table or view does not exist` | **Real Oracle error** — wrong/invisible table name | Fix the SQL (this means it's executing live — the guard surfaced the real error) |

---

## 3. Dead ends (don't waste time here on a federated pod)

REST API (`/fscmRestApi`) → 401 · BIP REST API (`/services/rest/v1`) → 404 (not deployed on Fusion Cloud) · SSO session cookie → 401 for REST · `/analytics/saw.dll` → needs a JS‑generated token (only a real embedded browser can get it) · direct report URL with Basic → SSO login redirect · your own report with an interactive layout → "Invalid format: xml". **All blocked by design.** The Step‑1‑to‑6 path is the one that works.

---

## 4. One‑line quick reference

> **SSO pod?** Create a **local service account** (no MFA) → give it **`ORA_BI_ADMINISTRATOR_JOB` + `ORA_BI_CONSUMER_JOB`** → **unarchive** OFJDBC's `DM_ARB`/`RP_ARB` into `/Custom/Financials` → connect Talk2Sql in **Basic + BIP SQL** mode with report path `/Custom/Financials/RP_ARB.xdo`.

---

## 5. Security & hygiene
- Read‑only by nature (BI layer permits no writes); Talk2Sql also gates to SELECT/WITH only.
- **Rotate the service‑account password** and store it in a keychain.
- Results carry a live‑execution provenance stamp; the anti‑fabrication guard means real data or an explicit error — never invented rows.
