# Talk2Sql — Setup Guide

Run real SQL against Oracle Fusion Cloud from a desktop app. Talk2Sql does not connect to the Fusion database directly (Oracle blocks that on SaaS) — it executes your SQL through Oracle **BI Publisher** and renders the results, with a hard anti‑fabrication guarantee: **every row shown is live data, or you get an explicit error — never invented rows.**

- **Version:** v3.4.0
- **Platforms:** macOS (.dmg), Windows (.exe)
- **Repo:** https://github.com/cskasarabada/Talk2Sql

---

## 1. How it connects (the short version)

| Pod type | Auth | Engine | What to set up |
|---|---|---|---|
| **Demo / non‑federated** | Basic (username + password) | REST or BIP SQL | Nothing — just connect |
| **SSO / SAML‑federated** (e.g. Entra) | **Basic with a local service account** | **BIP SQL** | A local service account + the BIP data model/report (Section 3) |

Why federated pods need extra work: when a pod is federated to Microsoft Entra (or Okta/Ping), your normal SSO login has **no Fusion password**, so Basic auth to the data APIs fails. Oracle also restricts the REST API and the direct report URL behind the SSO web gate. The working path — the same one commercial tools (SplashBI, OFJDBC) use — is a **local (non‑federated) service account** calling a **BI Publisher report** over SOAP.

---

## 2. Engines

Talk2Sql has two query engines (toolbar dropdown):

- **REST** — maps the `FROM` table to a Fusion REST business resource and applies SELECT/WHERE/GROUP BY client‑side. No setup, but limited to mapped resources (opportunities, accounts, invoices, …). Does **not** work on federated pods (REST is behind SSO).
- **BIP SQL** — runs your *actual* SQL server‑side through BI Publisher. Full joins, any table. Requires the one‑time report setup below. **This is the engine for federated pods.**

---

## 3. Fusion‑side setup (federated pods) — one time, done by a Fusion admin

You need three things on the pod: a **local service account**, the right **BI roles**, and the **BI Publisher data model + report**. If you have Security Console + BI Author access, you can do all of this yourself — no customer dependency.

### 3.1 Create a local service account

In **Tools → Security Console → Users → Add User Account**:

1. Create a **standalone, local** user (e.g. `talk2sql_svc`) — *not* linked to a worker or the SSO/Entra directory. A local account has a real Fusion password (the thing federated users lack).
2. **Reset Password** to a known value and capture it.
3. **Exclude MFA**: on the user page → *Configure MFA Exclusion* → **MFA Excluded → Save** (service accounts must not be prompted for MFA on headless calls).
4. Confirm the account is **Active**.

### 3.2 Assign BI roles

Add these standard roles to the account (Security Console → the user → **Edit → Add Role**):

- **`ORA_BI_ADMINISTRATOR_JOB`** (BI Administrator)
- **`ORA_BI_CONSUMER_JOB`** (BI Consumer)

> A custom BI role is **not** enough — the BI Publisher report's permissions are keyed to these *standard* roles, and they grant the system‑level privilege to execute reports. Wait ~3–5 minutes after assigning for the role‑membership job to propagate.

### 3.3 Deploy the BI Publisher data model + report

Talk2Sql runs SQL through a small BI Publisher report that wraps your SQL in `DBMS_XMLGEN` and returns the result set as XML. Use the open‑source **OFJDBC** catalog objects (MIT‑licensed):

1. Download from https://github.com/krokozyab/ofjdbc → folder `otbireport/`:
   - `DM_ARB.xdm.catalog` (data model)
   - `RP_ARB.xdo.catalog` (report)
2. In BI Publisher (`<pod>/xmlpserver` → **Catalog**), go to **Shared Folders → Custom** and create a folder (e.g. `Financials`).
3. **Unarchive** each `.catalog` file into that folder (Catalog toolbar/Tasks → **Unarchive** → browse to the local `.catalog` → OK). **Do not just "upload" them** — a raw upload leaves a `.catalog` *file*; unarchiving deploys the actual **Data Model** and **Report** objects.
4. Verify the folder now shows a **Data Model** (`DM_ARB`) and a **Report** (`RP_ARB`) — not `.catalog` files.
5. Grant the service account access: select the folder → **More → Permissions** → add the account (or its role) with **Read + Execute** on both objects. (Having `ORA_BI_ADMINISTRATOR_JOB` usually covers this automatically.)

What the data model does (for reference):
```sql
-- function wraps the user's SQL and serializes the result set to XML
function xgetXml(p_sql varchar2) return xmltype as
  res xmltype; lc dbms_xmlgen.ctxHandle; cur sys_refcursor;
begin
  open cur for p_sql;
  select dbms_xmlgen.newcontext(cur) into lc from dual;
  dbms_xmlgen.setnullhandling(lc, dbms_xmlgen.null_attr);
  select dbms_xmlgen.getxmltype(lc) into res from dual;
  close cur; return res;
end;
-- data model query:
select xgetXml(:p_sql) result from dual
```

---

## 4. Connect in Talk2Sql

1. Open **Connect** (⌘⇧C / Ctrl+Shift+C).
2. **Authentication:** 🔑 Username / Password (Basic).
3. **Instance URL:** the pod base URL, e.g. `https://<pod>.fa.<dc>.oraclecloud.com` (no trailing path).
4. **Username / Password:** the service account (e.g. `talk2sql_svc`).
5. **Engine:** **BIP SQL**.
6. **⚙ (BIP setup):** set the **Report Catalog Path** to the report you deployed, e.g. `/Custom/Financials/RP_ARB.xdo` → **Save**.
7. (Optional) **Anthropic API key** — only needed for the natural‑language → SQL feature.
8. **Save as a profile** so the URL, engine, and report path persist.

Run a smoke test:
```sql
SELECT 1 AS ONE FROM DUAL
```
You should see one row, with a green **"✓ Verified against <pod> … → BIP runReport"** stamp. Then run real queries against any table the service account can read, e.g.:
```sql
SELECT * FROM CN_COMP_PLANS_ALL_VL FETCH FIRST 5 ROWS ONLY
```

Export results with the **Excel / CSV / JSON** buttons in the results pane.

---

## 5. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Redirect to Microsoft/Entra **login page** | The direct report URL / REST is behind the SSO web gate; Basic was ignored | Use the **SOAP/BIP SQL** path with a **local service account** (Section 3.1) |
| `InvalidSecurity : error in processing the WS‑Security security header` | The credential can't be validated — usually a federated account (no Fusion password) or a temporary/"must‑change" password | Use a **local** service account; clear any "password must change" flag by signing in once locally |
| `does not have permission to run the report` | Account lacks run access on the report/data model | Add **`ORA_BI_ADMINISTRATOR_JOB` + `ORA_BI_CONSUMER_JOB`**; grant Read/Execute on `RP_ARB` **and** `DM_ARB`; wait for propagation |
| `Invalid format requested: xml` | The report can't emit raw data (e.g. an interactive `xpt` layout) | Use the OFJDBC `RP_ARB` report (Section 3.3); it returns XML data |
| `report path not found` / HTTP 404 | Path wrong, or the `.catalog` was uploaded but never **unarchived** | Unarchive the catalog files; path is relative to Shared Folders and keeps `.xdo` (e.g. `/Custom/Financials/RP_ARB.xdo`) |
| `ORA‑00942: table or view does not exist` | A real Oracle error — the table name in your SQL is wrong or not visible to the BI schema | Fix the table name (e.g. `CN_COMP_PLANS_ALL_VL`, columns `START_DATE_ACTIVE`/`END_DATE_ACTIVE`) |
| Result looks like a run‑together blob | (Fixed in v3.4.0) cell values weren't HTML‑escaped | Update to v3.4.0+ |
| "no report path configured" | BIP engine selected but no report path saved | ⚙ → set the report path → Save |

A live Oracle error (like `ORA‑00942`) appearing **is the guard working** — Talk2Sql surfaces the real database error verbatim rather than inventing rows.

---

## 6. Security notes

- The service account is **least‑privilege, read‑only** in practice (BI layer is read‑only — no INSERT/UPDATE/DELETE).
- **Rotate the service‑account password** periodically and store it in your OS keychain, not in plaintext.
- All queries are gated to **read‑only** (SELECT/WITH only) before they leave the app.
- Results carry a **provenance stamp** (instance, timestamp, row count); rows render only with live‑execution provenance — enforced by the committed guard test (`npm test`).
- Credentials and data stay on your machine; there is no third‑party relay.

---

## 7. Building the app (maintainers)

```bash
npm install
npm test            # guard tests must pass
npm start           # run from source
npm run build:mac   # → dist/*.dmg
npm run build:win   # → dist/*.exe
```
Tagged pushes (`git push origin v3.4.0`) trigger the GitHub Actions release workflow, which builds the DMG + EXE and publishes them to GitHub Releases. The app icon lives at `assets/icon.png` (macOS) and `assets/icon.ico` (Windows).
