# Oracle Fusion Implementation Journey — Foundation First

A field guide for the SI Business Architect onboarding a brand-new Oracle Fusion
customer whose pod was just provisioned. It mirrors the build-lifecycle taxonomy
used inside Talk2Sql (the **Foundation — Base Setup** config area), so the doc and
the app tell the same story.

> **In the app, this lives in the Ariadne pillar** 🧵 (*"Your Thread Through the
> Fusion Labyrinth"*). Ariadne encodes a 46-task dependency graph across 11 pillars
> and gates every task **Ready / Blocked / Done** by its prerequisites — Probe → Learn
> → Build. The key cross-pillar rule this guide enforces: **CX Products & Catalog
> depends on SCM Item Master (PIM)**, and the whole CX stack stays Blocked until
> Foundation + clean TCA customer data are Done.

---

## 1. Overview — the phased path

```
Pod Provisioned  →  Foundation (Base Setup)  →  Business Modules
```

A freshly provisioned pod is an empty shell. **Nothing module-specific works until
the Foundation is in place.** You cannot create a payables invoice without a
Business Unit; you cannot create a Business Unit without a Ledger; you cannot
create a Ledger without a Chart of Accounts, an Accounting Calendar and a Currency;
and none of those mean anything until the Enterprise and Legal Entities exist.

So every implementation follows the same opening sequence regardless of which
pillars the customer bought:

1. **Enterprise Structures** — geographies, currencies, reference data sets,
   enterprise, legal entities/reporting units, business units, divisions,
   departments, locations.
2. **Financial Foundation** — chart of accounts, calendars, the primary ledger,
   and the legal-entity / business-unit assignments that wire it together.
3. **Security & Users** — users, roles, data roles, provisioning.
4. **Common Reference** — lookups, profile options, trees, document sequences,
   flexfields.
5. **Workflow, Approvals & Scheduling** — approval rules, notifications, ESS jobs,
   audit.

Only after Foundation do you layer on the business modules (Financials, Procurement,
SCM, CX, HCM, ICM). The Foundation is shared infrastructure: do it once, do it right,
and every module inherits it.

---

## 2. Discovery Questionnaire

Ask these up front. The answers determine the build order, the number of each object
to create, and which modules can start when.

### Scope (which pillars/modules)
- Which Oracle pillars are in scope — **ERP, SCM, HCM, CX, Projects, ICM**?
- Within each pillar, which modules at go-live vs. later phases?
- Is this a net-new implementation, a re-implementation, or an add-on to existing live modules?

### Enterprise
- How many **legal entities**, and in which **countries**?
- Which **currencies**, and what is the **primary (functional) currency** per ledger?
- What **fiscal / accounting calendar** (period type, fiscal year start, # of periods, adjusting periods)?
- What is the **Chart of Accounts design** — how many segments, which qualifiers (natural account, cost center, balancing), segment value sources?
- How many **ledgers** — single primary, or primary + secondary/reporting?
- How many **business units** and **divisions**, and how do they map to legal entities and the ledger?
- Shared vs. segregated setup data → drives the **Reference Data Set (SetID)** design.

### Security model
- Single sign-on / federation (SAML)? Provisioning source for users?
- Role strategy — use seeded job roles, or custom copies?
- Data-access model — which users see which BUs/ledgers (data roles)?
- Segregation-of-duties / audit requirements?

### Go-live date & phasing
- Target go-live(s) and any phased rollout (by module, by region, by legal entity)?
- Freeze/blackout windows for data conversion and cutover?

### Data conversion scope
- Which masters convert (customers, suppliers, items, employees, GL balances, open transactions)?
- Source systems and data quality state?
- One-time load (FBDI/HDL) vs. ongoing integration?

### Integrations
- Inbound/outbound interfaces (bank, tax engine, payroll, CRM, e-commerce, EDI)?
- Real-time (REST/SOAP) vs. batch (FBDI/BICC)?
- Which integration owns which object (system of record)?

---

## 3. Foundation build order with dependencies

Build top to bottom. The **depends on** column is the reason for the order — you
cannot start a step until its dependencies exist.

### Section 1 — Enterprise Structures
| Step | Object | Depends on |
|------|--------|------------|
| 1 | Geographies | (first) address validation source |
| 2 | Currencies | — (enabled before ledger currency) |
| 3 | Reference Data Sets (SetIDs) | — (before BUs, which carry a default SetID) |
| 4 | Enterprise | — (single top node) |
| 5 | Legal Addresses | Geographies |
| 6 | Legal Entities | Legal Addresses |
| 7 | Legal Reporting Units | Legal Entities |
| 8 | Business Units | Legal Entity + **Ledger** + default Reference Data Set |
| 9 | Divisions | Enterprise, Business Units |
| 10 | Departments | Enterprise (+ COA for costing) |
| 11 | Locations | Geographies |

> Note the loop: **Business Units depend on the Ledger** (Section 2), and the Ledger
> depends on structures from Section 1. In practice you frame the legal entities and
> COA, build the ledger, then complete the business units.

### Section 2 — Financial Foundation
| Step | Object | Depends on |
|------|--------|------------|
| 1 | Value Sets | — (segment value lists) |
| 2 | COA Structure | Value Sets |
| 3 | COA Structure Instance (deployed) | COA Structure |
| 4 | Accounting Calendars | — |
| 5 | **Primary Ledger** | COA Instance **+** Calendar **+** Currency (the three C's) |
| 6 | Legal Entity ↔ Ledger Assignment | Ledger + Legal Entities |
| 7 | BU ↔ Ledger / Reference Data Assignment | Ledger + Business Unit + Reference Data Sets |

### Section 3 — Security & Users
| Step | Object | Depends on |
|------|--------|------------|
| 1 | Users | — (often created with workers) |
| 2 | Job & Abstract Roles | — |
| 3 | Duty & Data Roles | Enterprise structures (BU/ledger scope) |
| 4 | Data Role Provisioning | Data Roles + Users |
| 5 | Role Provisioning Rules | Roles + HR data |
| 6 | Data Security Policies | Data Roles |

### Section 4 — Common Reference
| Step | Object | Depends on |
|------|--------|------------|
| 1 | Lookups | — |
| 2 | Profile Options | — |
| 3 | Trees | structures / value sets they organize |
| 4 | Document Sequences | — (before transactions) |
| 5 | Descriptive Flexfields (DFF) | base objects (deploy) |
| 6 | Extensible Flexfields (EFF) | base objects (deploy) |

### Section 5 — Workflow, Approvals & Scheduling
| Step | Object | Depends on |
|------|--------|------------|
| 1 | BPM / AMX Approval Rules | Roles + supervisor hierarchy |
| 2 | Notifications | Approval rules |
| 3 | Enterprise Scheduler (ESS) Jobs | Modules/data to process |
| 4 | Audit Setup | Business objects (enable before go-live) |

---

## 4. Which business areas first (and why)

After Foundation, sequence the modules by their dependencies — never start a module
whose prerequisites are not live.

1. **Financials first — GL → AP/AR.**
   The General Ledger is the accounting backbone; sub-ledgers (Payables, Receivables)
   post to it via Subledger Accounting. AP needs suppliers, AR needs customers, both
   need the ledger and BU. Get GL solid, then turn on the sub-ledgers.

2. **Procurement / SCM — Inventory → Purchasing → Order Management.**
   Inventory organizations and items must exist before Purchasing can buy them and
   before Order Management can sell them. Item validation org and UOM are prerequisites
   for OM. SCM also depends on the BU/ledger from Foundation.

3. **CX and HCM.**
   CX (Sales/Service) needs the customer/resource model and integrates back to
   Financials for quote-to-cash. HCM needs the enterprise structure (already built in
   Foundation) plus jobs/grades; it supplies the worker population other modules rely on.

4. **ICM (Incentive Compensation) last.**
   ICM **depends on HR participants** (salespeople, from HCM) **and a transaction source**
   (orders/invoices from OM or AR) to calculate commissions. It is downstream of both
   the people model and the revenue transactions, so it goes after HCM and the
   order-to-cash flow are producing data.

**Reasoning in one line:** money (GL) before the things that move money (AP/AR/SCM)
before the people-and-revenue layers (CX/HCM) before what *rewards* people for revenue
(ICM).

---

## 5. Read-only SQL verification templates

Safe, parameter-free `SELECT` queries to run in Talk2Sql to answer
"is the pod's Foundation set up yet?". Each is read-only. Where a table name is not
certain on a given pod release, it is flagged **verify table name on pod**.

```sql
-- Ledgers: confirms a primary ledger exists with its currency and calendar
SELECT NAME, CURRENCY_CODE, PERIOD_SET_NAME
FROM GL_LEDGERS
FETCH FIRST 50 ROWS ONLY;
```

```sql
-- Legal entities: confirms registered legal entities exist
SELECT NAME, LEGAL_ENTITY_IDENTIFIER
FROM XLE_ENTITY_PROFILES
FETCH FIRST 50 ROWS ONLY;
```

```sql
-- Business units: confirms BUs exist and their reference data set assignment
SELECT NAME, SET_ID
FROM FUN_ALL_BUSINESS_UNITS_V
FETCH FIRST 50 ROWS ONLY;
```

```sql
-- Chart of accounts structure: confirms a COA structure is defined
-- (verify table name on pod — FND_KF_STRUCTURES_VL / structure-instance views vary by release)
SELECT STRUCTURE_CODE, NAME, ENABLED_FLAG
FROM FND_KF_STRUCTURES_VL
FETCH FIRST 50 ROWS ONLY;
```

```sql
-- COA value sets: confirms segment value sets exist
-- (verify table name on pod)
SELECT VALUE_SET_CODE, DESCRIPTION
FROM FND_VS_VALUE_SETS_VL
FETCH FIRST 50 ROWS ONLY;
```

```sql
-- Accounting calendar definitions: confirms fiscal calendars exist
SELECT PERIOD_SET_NAME, PERIOD_TYPE
FROM GL_PERIOD_SETS
FETCH FIRST 50 ROWS ONLY;
```

```sql
-- Accounting periods: confirms calendar periods have been generated
SELECT PERIOD_SET_NAME, PERIOD_NAME, START_DATE, END_DATE
FROM GL_PERIODS
FETCH FIRST 50 ROWS ONLY;
```

```sql
-- Currencies: confirms enabled currencies
SELECT CURRENCY_CODE, NAME, ENABLED_FLAG
FROM FND_CURRENCIES
FETCH FIRST 50 ROWS ONLY;
```

```sql
-- Geographies: confirms geography hierarchy has been imported (address validation)
SELECT GEOGRAPHY_ELEMENT1, GEOGRAPHY_TYPE, COUNTRY_CODE
FROM HZ_GEOGRAPHIES
FETCH FIRST 50 ROWS ONLY;
```

```sql
-- Locations: confirms physical locations exist
-- (verify table name on pod — HR_LOCATIONS_ALL is the common base table)
SELECT LOCATION_CODE, COUNTRY
FROM HR_LOCATIONS_ALL
FETCH FIRST 50 ROWS ONLY;
```

```sql
-- Departments / org units: confirms HR organizations exist
-- (verify table name on pod)
SELECT NAME, ORGANIZATION_ID
FROM HR_ALL_ORGANIZATION_UNITS
FETCH FIRST 50 ROWS ONLY;
```

```sql
-- Users: confirms user accounts exist
-- (verify table name on pod — user/role data usually lives behind the Security Console;
--  PER_USERS is the common base table, but role assignments may not be directly queryable)
SELECT USERNAME, ACTIVE_FLAG
FROM PER_USERS
FETCH FIRST 50 ROWS ONLY;
```

> Tip: run these in the order above. If `GL_LEDGERS` is empty, the Financial
> Foundation is not built yet and no sub-ledger module can be configured. If
> `FUN_ALL_BUSINESS_UNITS_V` is empty, no transactional module can run.
