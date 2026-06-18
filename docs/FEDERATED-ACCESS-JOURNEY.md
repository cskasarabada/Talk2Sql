# Cracking SQL Access on an SSO‑Federated Oracle Fusion Pod — Troubleshooting Journey

How we got Talk2Sql to run live SQL against the **Alto‑Shaam DEV** pod (Microsoft Entra–federated SSO). This is the chronological record: what we tried, why each path failed, and the exact steps that finally worked. `SETUP.md` is the clean recipe; this is the "how we got there."

---

## The goal

Run arbitrary `SELECT` SQL against a Fusion Cloud pod that is **SAML‑federated to Microsoft Entra**. Oracle blocks direct DB connections on SaaS, and federation means a normal SSO login has **no Fusion password**, so ordinary username/password (Basic) auth to the data APIs fails.

---

## What we tried, and why it failed (the dead ends)

| # | Attempt | Result | Lesson |
|---|---|---|---|
| 1 | **Basic auth** with the federated user (`@argano.com`) to REST | HTTP 401 | Federated users have no Fusion password for API auth |
| 2 | **SSO session cookie** → Fusion **REST** API | HTTP 401 | The UI session cookie isn't accepted by REST |
| 3 | **BIP REST API** (`/xmlpserver/services/rest/v1/...`) | HTTP 404 | Fusion Cloud doesn't expose the BI Publisher REST API |
| 4 | **SOAP** `ExternalReportWSSService` with federated creds | `InvalidSecurity` (500) | WS‑Security needs a real password the federated user doesn't have |
| 5 | **`/analytics/saw.dll`** UI gateway (CloudSQL‑style) | Needs a JS‑generated `_sTkn` token | The token is created by page JavaScript — a plain HTTP fetch can't get it; only a real embedded browser can |
| 6 | **Direct report URL** (`/xmlpserver/<path>.xdo?_xf=xml`) with Basic | Redirect to Entra login page | The report URL is behind the SSO web gate; it ignores Basic |
| 7 | SOAP with our own report (interactive `xpt` layout) | `Invalid format requested: xml` | An interactive layout can't emit raw data; rendered formats are also locked to design‑time columns |

**Key realizations along the way:**
- The **SOAP** endpoint is the only one that accepts a **local** (non‑federated) account via Basic/WS‑Security.
- Getting **raw, adaptive data** out requires a report whose data model serializes the result set to XML (via `DBMS_XMLGEN`) — exactly what the open‑source **OFJDBC** report does, and what **SplashBI** ships commercially.

---

## What finally worked — the exact steps

### Step 1 — Create a local (non‑federated) service account
In **Security Console → Users → Add User Account**, created a standalone local user (display "ARGANO USER", username `cskasarabada@gmail.com` / `argano.user`) with a **real Fusion password** (`Welcome1@`, since rotated). A local account is the whole unlock — it has a password the WS‑Security header can validate, which the SSO/Entra user does not.

### Step 2 — Disable MFA for the service account
On the user page → **Configure MFA Exclusion → MFA Excluded → Save**. A headless/service account must not be prompted for multi‑factor auth.

### Step 3 — Assign the standard BI roles
Added **`ORA_BI_ADMINISTRATOR_JOB`** (BI Administrator) and **`ORA_BI_CONSUMER_JOB`** (BI Consumer). The custom `AS_BI_ADMIN_CUSTOM` role was **not** sufficient — the report's permissions are keyed to the *standard* BI roles, which also grant the system‑level privilege to execute reports. Waited a few minutes for role propagation.

### Step 4 — Upload and **unarchive** the OFJDBC catalog objects
Downloaded the OFJDBC report files from `github.com/krokozyab/ofjdbc` (`otbireport/`): `DM_ARB.xdm.catalog` and `RP_ARB.xdo.catalog`.

- First mistake: we *uploaded* them as raw files → they showed up as `.catalog` files with a "Download" link, **not** as a runnable report (404 / "no permission" on a path that didn't really exist).
- Fix: **Unarchive** each `.catalog` into `/Shared Folders/Custom/Financials`. Unarchiving deploys the actual **Data Model** (`DM_ARB`) and **Report** (`RP_ARB`) objects. After that, the folder showed a real Data Model icon and Report icon.

The OFJDBC data model wraps the query and serializes it with `DBMS_XMLGEN`:
```sql
function xgetXml(p_sql varchar2) return xmltype as
  res xmltype; lc dbms_xmlgen.ctxHandle; cur sys_refcursor;
begin
  open cur for p_sql;
  select dbms_xmlgen.newcontext(cur) into lc from dual;
  dbms_xmlgen.setnullhandling(lc, dbms_xmlgen.null_attr);
  select dbms_xmlgen.getxmltype(lc) into res from dual;
  close cur; return res;
end;
select xgetXml(:p_sql) result from dual
```

### Step 5 — Grant the account run access on the report
On `/Custom/Financials` → **More → Permissions** → added the service account with **Read + Execute** on both `RP_ARB` and `DM_ARB`. (With `ORA_BI_ADMINISTRATOR_JOB`, the report's "BI Administrator Role → Full Control" grant is inherited automatically.)

### Step 6 — Connect in Talk2Sql
- Auth: **Basic** (the service account)
- Instance URL: the pod base URL
- Engine: **BIP SQL**, report path **`/Custom/Financials/RP_ARB.xdo`**
- Talk2Sql calls SOAP `ExternalReportWSSService` (WS‑Security UsernameToken) with `attributeFormat=xml`, then unwraps the nested `RESULT` (DBMS_XMLGEN `<ROWSET>`) into columns/rows.

### Result
```sql
SELECT * FROM CN_COMP_PLANS_ALL_VL FETCH FIRST 5 ROWS ONLY   -- 5 live rows
-- and a 4‑table ICM join (participants × details × plans) → 100 live rows, 1.1s
```
Live data from the federated pod, rendered as a clean table, with the verification stamp. A real `ORA‑00942` (wrong table name) also surfaced verbatim along the way — confirming SQL was executing live and the anti‑fabrication guard was intact.

---

## Takeaways

1. **On a federated Fusion Cloud pod, the only programmatic SQL path is: local service account → BI Publisher SOAP → a `DBMS_XMLGEN` data report.** Everything else (REST, SSO cookie, saw.dll, direct URL, interactive layouts) is blocked by design.
2. **A local, MFA‑excluded service account with the standard BI roles** is what makes WS‑Security auth succeed — not the federated identity.
3. **Unarchive, don't upload** the `.catalog` objects.
4. Commercial tools (SplashBI) and OSS (OFJDBC) all use this same mechanism — the maintained "magic" is the BI report + auth handling, which Talk2Sql now replicates.
