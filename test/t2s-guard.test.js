/* ──────────────────────────────────────────────────────────────────────────
   Anti-fabrication guard test for Talk2Sql.

   THE INVARIANT under test: result rows have exactly one origin — a live REST
   fetch in this request. Across (a) a dropped connection, (b) malformed SQL, and
   (c) a valid query returning zero rows, NO row-shaped data may reach the grid;
   only error or explicit-empty states are produced. Fabricated/untagged rows must
   be refused at the render boundary.

   This test loads the REAL guard code embedded in renderer/index.html (between the
   executor markers) so it can never drift from what ships.

   Run:  node test/t2s-guard.test.js     (exit 0 = pass, non-zero = a guard failed)
   ────────────────────────────────────────────────────────────────────────── */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const html = fs.readFileSync(path.join(__dirname, "..", "renderer", "index.html"), "utf8");
const START = "/* ===== ariadne@";
const END = "/* ===== end ariadne ===== */";
const s = html.indexOf(START), e = html.indexOf(END);
if (s < 0 || e < 0) { console.error("Could not locate the embedded executor block in renderer/index.html"); process.exit(2); }
const code = html.slice(s, e);

// Evaluate the embedded block in a sandbox and pull out the guard functions.
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(code + "\nthis.__api={t2sRun,t2sProcessResponse,t2sAssertRenderable,t2sReadOnlySQL};", sandbox);
const { t2sProcessResponse, t2sAssertRenderable, t2sReadOnlySQL } = sandbox.__api;

let failures = 0;
const ok = (cond, msg) => { console.log((cond ? "  PASS  " : "  FAIL  ") + msg); if (!cond) failures++; };

// Faithful stand-in for the render boundary: the app's renderResults / loadQPanel
// call t2sAssertRenderable first, then paint payload.rows. Replicate that contract.
function rowsThatReachGrid(payload) {
  const kind = t2sAssertRenderable(payload); // throws if rows lack provenance
  return kind === "rows" ? payload.rows : []; // empty/error => nothing painted
}

const ctx = { instance: "PROD_ICM", endpoint: "/fscmRestApi/resources/latest/channelPrograms",
              sql: "SELECT program_number FROM cjm_programs_all_b", connectionId: "prod-pod-1", fetchLim: 500 };

console.log("\n(a) DROPPED CONNECTION");
{
  const p = t2sProcessResponse({ networkError: true }, ctx);
  ok(p.kind === "error", "produces an error state");
  ok(rowsThatReachGrid(p).length === 0, "0 rows reach the grid");
  ok(/could not reach PROD_ICM/.test(p.message), "error names the instance");
}

console.log("\n(a2) TIMEOUT");
{
  const p = t2sProcessResponse({ timeout: true }, ctx);
  ok(p.kind === "error" && rowsThatReachGrid(p).length === 0, "error state, 0 rows");
}

console.log("\n(b) MALFORMED SQL / SCHEMA ERROR (Fusion 400 + ORA body) — surfaced verbatim");
{
  const p = t2sProcessResponse({ status: 400, responseText: JSON.stringify({ detail: "ORA-00942: table or view does not exist" }) }, ctx);
  ok(p.kind === "error", "produces an error state");
  ok(rowsThatReachGrid(p).length === 0, "0 rows reach the grid");
  ok(/ORA-00942/.test(p.message), "Oracle error surfaced verbatim (no invention)");
}

console.log("\n(b2) READ-ONLY GATE rejects non-SELECT / multi-statement / result-junk");
{
  ok(t2sReadOnlySQL("DELETE FROM x").ok === false, "DELETE rejected");
  ok(t2sReadOnlySQL("SELECT 1 FROM dual; DROP TABLE x").ok === false, "multi-statement rejected");
  ok(t2sReadOnlySQL("Here are 12 programs: PROG-0987, PROG-0986 ...").ok === false, "result-shaped junk rejected");
  ok(t2sReadOnlySQL("SELECT n FROM t WHERE last_update_date > sysdate-7").ok === true, "legit SELECT allowed");
}

console.log("\n(c) VALID QUERY, ZERO ROWS — explicit empty, not a fabricated row");
{
  const p = t2sProcessResponse({ status: 200, responseText: JSON.stringify({ items: [] }) }, ctx);
  ok(p.kind === "empty", "explicit empty state");
  ok(rowsThatReachGrid(p).length === 0, "0 rows reach the grid");
  ok(p.prov && p.prov.live === true && p.prov.row_count === 0, "empty still carries provenance, row_count 0");
}

console.log("\n(c2) VALID QUERY, client-side WHERE removes all rows — still explicit empty");
{
  const c2 = Object.assign({}, ctx, { sql: "SELECT program_number FROM cjm_programs_all_b WHERE status_code='ACTIVE'" });
  const p = t2sProcessResponse({ status: 200, responseText: JSON.stringify({ items: [{ ProgramNumber: "P1", StatusCode: "CLOSED" }] }) }, c2);
  ok(p.kind === "empty" && rowsThatReachGrid(p).length === 0, "filtered-to-zero is empty, not a fake row");
}

console.log("\n(d) HAPPY PATH — live rows reach the grid with provenance");
{
  const p = t2sProcessResponse({ status: 200, responseText: JSON.stringify({ items: [
    { ProgramNumber: "PROG-0987", StatusCode: "ACTIVE" }, { ProgramNumber: "PROG-0986", StatusCode: "ACTIVE" }
  ] }) }, ctx);
  ok(p.kind === "rows" && rowsThatReachGrid(p).length === 2, "2 live rows reach the grid");
  ok(p.prov.live === true && p.prov.instance === "PROD_ICM" && p.prov.row_count === 2, "rows carry live provenance stamp");
}

console.log("\n(e) STRUCTURAL — fabricated/untagged rows are REFUSED at the render boundary");
{
  let threw = false; try { rowsThatReachGrid({ kind: "rows", cols: ["x"], rows: [["fake"]] }); } catch (_) { threw = true; }
  ok(threw, "untagged rows throw — cannot reach the grid");
  threw = false; try { rowsThatReachGrid({ kind: "rows", cols: ["x"], rows: [["fake"]], prov: { live: false } }); } catch (_) { threw = true; }
  ok(threw, "prov.live!==true throws — cannot reach the grid");
}

console.log("\n" + (failures === 0 ? "ALL GUARDS HELD ✓" : failures + " GUARD(S) FAILED ✗"));
process.exit(failures === 0 ? 0 : 1);
