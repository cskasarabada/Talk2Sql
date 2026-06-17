/* ──────────────────────────────────────────────────────────────────────────
   BIP SQL engine guard test for Talk2Sql.

   THE INVARIANT under test: the BIP path (t2sProcessBipResponse and friends)
   obeys the same contract as the REST choke point — rows are ONLY produced
   from a live 2xx SOAP body that decodes to a real rowset, always carry
   live-execution provenance, and every failure (SOAP fault, ORA- error,
   garbage, missing reportBytes, network error, timeout, HTTP error) is an
   explicit error/empty state. Fabricated rows cannot pass the render boundary.

   Loads the REAL embedded executor block from renderer/index.html so the test
   can never drift from what ships.

   Run:  node test/bip-engine.test.js     (exit 0 = pass)
   ────────────────────────────────────────────────────────────────────────── */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const html = fs.readFileSync(path.join(__dirname, "..", "renderer", "index.html"), "utf8");
const START = "/* ===== SQL→REST client-side executor";
const END = "/* ===== end executor ===== */";
const s = html.indexOf(START), e = html.indexOf(END);
if (s < 0 || e < 0) { console.error("Could not locate the embedded executor block"); process.exit(2); }
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(html.slice(s, e) +
  "\nthis.__api={t2sBipEnvelope,t2sBipParseSoap,t2sBipRowsFromXml,t2sProcessBipResponse,t2sBipB64Decode,t2sAssertRenderable};", sandbox);
const { t2sBipEnvelope, t2sBipParseSoap, t2sBipRowsFromXml, t2sProcessBipResponse, t2sBipB64Decode, t2sAssertRenderable } = sandbox.__api;

let failures = 0;
const ok = (cond, msg) => { console.log((cond ? "  PASS  " : "  FAIL  ") + msg); if (!cond) failures++; };
const b64 = (str) => Buffer.from(str, "utf8").toString("base64");
const soapWrap = (dataXml) =>
  '<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"><soap:Body>' +
  '<runReportResponse><runReportReturn><reportBytes>' + b64(dataXml) + '</reportBytes></runReportReturn></runReportResponse>' +
  '</soap:Body></soap:Envelope>';
const ctx = { instance: "PROD_POD", endpoint: "BIP /Custom/Talk2Sql/T2S_SQL.xdo",
              sql: "SELECT party_name FROM hz_parties WHERE ROWNUM<10", connectionId: "prod-pod-1" };

// Faithful render-boundary stand-in (same as t2s-guard.test.js).
function rowsThatReachGrid(payload) {
  const kind = t2sAssertRenderable(payload);
  return kind === "rows" ? payload.rows : [];
}

console.log("\n(1) ENVELOPE — builds correctly, refuses CDATA breakout and bad paths");
{
  const env = t2sBipEnvelope(ctx.sql, "/Custom/Talk2Sql/T2S_SQL.xdo");
  ok(env.xml && env.xml.indexOf("<![CDATA[" + ctx.sql + "]]>") > 0, "SQL travels inside CDATA");
  ok(env.xml.indexOf("<pub:name>p_sql</pub:name>") > 0, "p_sql parameter present");
  ok(t2sBipEnvelope("SELECT ']]>' FROM dual", "/Custom/x.xdo").error, "CDATA breakout sequence refused");
  ok(t2sBipEnvelope(ctx.sql, "not-a-path").error, "non-.xdo report path refused");
  ok(t2sBipEnvelope("", "/Custom/x.xdo").error, "empty SQL refused");
  const w = t2sBipEnvelope(ctx.sql, "/Custom/x.xdo", { user: "amy<&>", pass: 'p"w' });
  ok(w.xml.indexOf("<wsse:UsernameToken>") > 0 && w.xml.indexOf("amy&lt;&amp;&gt;") > 0, "WSS UsernameToken added, credentials XML-escaped");
  ok(w.xml.indexOf("mustUnderstand") < 0 && w.xml.indexOf("Timestamp") < 0, "no mustUnderstand/Timestamp decorations (OWSM rejects them)");
  ok(w.xml.indexOf("http://www.w3.org/2003/05/soap-envelope") > 0, "SOAP 1.2 envelope (the service rejects 1.1/text-xml)");
  ok(t2sBipEnvelope(ctx.sql, "/Custom/x.xdo").xml.indexOf("wsse:") < 0, "no WSS header when no credentials passed (OAuth / SSO mode)");
}

console.log("\n(2) HAPPY PATH — live rowset reaches the grid with provenance");
{
  const data = '<?xml version="1.0"?><DATA_DS><G_1><PARTY_NAME>Acme &amp; Sons</PARTY_NAME><PARTY_ID>101</PARTY_ID></G_1>' +
               '<G_1><PARTY_NAME>Globex</PARTY_NAME><PARTY_ID>102</PARTY_ID></G_1></DATA_DS>';
  const p = t2sProcessBipResponse({ status: 200, responseText: soapWrap(data) }, ctx);
  ok(p.kind === "rows" && p.rows.length === 2, "2 live rows produced");
  ok(p.cols.join(",") === "PARTY_NAME,PARTY_ID", "columns from rowset tags");
  ok(p.rows[0][0] === "Acme & Sons", "XML entities decoded");
  ok(p.prov && p.prov.live === true && p.prov.row_count === 2, "provenance stamped");
  ok(rowsThatReachGrid(p).length === 2, "passes the render boundary");
}

console.log("\n(2b) PARAMETER ECHO — <P_SQL> tag (Include Parameter Tags on) is NOT a row");
{
  const data = '<DATA_DS><P_SQL>SELECT party_name FROM hz_parties</P_SQL>' +
               '<G_1><PARTY_NAME>Acme</PARTY_NAME></G_1></DATA_DS>';
  const p = t2sProcessBipResponse({ status: 200, responseText: soapWrap(data) }, ctx);
  ok(p.kind === "rows" && p.rows.length === 1, "exactly 1 row — echo skipped, no phantom row");
  ok(p.cols.join(",") === "PARTY_NAME", "columns unaffected by the echo element");
  // echo only, no rowset → honest empty
  const p2 = t2sProcessBipResponse({ status: 200, responseText:
    soapWrap('<DATA_DS><P_SQL>SELECT x FROM y</P_SQL></DATA_DS>') }, ctx);
  ok(p2.kind === "empty", "parameter echo alone is an explicit empty, not a fake row");
}

console.log("\n(3) EMPTY ROWSET — explicit empty, never a placeholder row");
{
  const p = t2sProcessBipResponse({ status: 200, responseText: soapWrap("<DATA_DS></DATA_DS>") }, ctx);
  ok(p.kind === "empty", "empty state");
  ok(rowsThatReachGrid(p).length === 0, "0 rows reach the grid");
  ok(p.prov && p.prov.live === true, "even empty carries provenance");
}

console.log("\n(4) SOAP FAULT — surfaced verbatim as error");
{
  const fault = '<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"><soap:Body><soap:Fault>' +
    '<faultstring>oracle.xdo.servlet.data.DataException: Invalid format</faultstring></soap:Fault></soap:Body></soap:Envelope>';
  const p = t2sProcessBipResponse({ status: 200, responseText: fault }, ctx);
  ok(p.kind === "error" && /Invalid format/.test(p.message), "fault text surfaced verbatim");
  ok(rowsThatReachGrid(p).length === 0, "0 rows reach the grid");
}

console.log("\n(5) ORA- ERROR INSIDE THE PAYLOAD — surfaced verbatim, no rows");
{
  const p = t2sProcessBipResponse({ status: 200, responseText: soapWrap('<DATA_DS>ORA-00942: table or view does not exist</DATA_DS>') }, ctx);
  ok(p.kind === "error" && /ORA-00942/.test(p.message), "ORA error surfaced verbatim");
  ok(rowsThatReachGrid(p).length === 0, "0 rows reach the grid");
}

console.log("\n(6) GARBAGE / MISSING reportBytes — error, never invented rows");
{
  const p1 = t2sProcessBipResponse({ status: 200, responseText: "<html>login page</html>" }, ctx);
  ok(p1.kind === "error", "non-SOAP body is an error");
  const p2 = t2sProcessBipResponse({ status: 200, responseText: soapWrap("") }, ctx);
  ok(p2.kind === "error", "empty payload is an error");
  const p3 = t2sProcessBipResponse({ status: 200, responseText:
    '<soap:Envelope xmlns:soap="x"><soap:Body><runReportResponse></runReportResponse></soap:Body></soap:Envelope>' }, ctx);
  ok(p3.kind === "error" && /reportBytes/.test(p3.message), "missing reportBytes is an explicit error");
}

console.log("\n(7) TRANSPORT FAILURES — dropped connection / timeout / HTTP errors");
{
  ok(t2sProcessBipResponse({ networkError: true }, ctx).kind === "error", "networkError → error");
  ok(t2sProcessBipResponse({ timeout: true }, ctx).kind === "error", "timeout → error");
  const p401 = t2sProcessBipResponse({ status: 401, responseText: "" }, ctx);
  ok(p401.kind === "error" && /401/.test(p401.message), "HTTP 401 → error naming the status");
  const p500 = t2sProcessBipResponse({ status: 500, responseText:
    '<soap:Fault><faultstring>Server died</faultstring></soap:Fault>' }, ctx);
  ok(p500.kind === "error" && /Server died/.test(p500.message), "HTTP 500 fault text included");
}

console.log("\n(8) STRUCTURAL — a BIP payload stripped of provenance is REFUSED");
{
  const data = '<DATA_DS><G_1><A>1</A></G_1></DATA_DS>';
  const p = t2sProcessBipResponse({ status: 200, responseText: soapWrap(data) }, ctx);
  delete p.prov; // simulate a fabrication/tampering attempt
  let threw = false;
  try { rowsThatReachGrid(p); } catch (e) { threw = true; }
  ok(threw, "untagged BIP rows throw at the render boundary");
}

console.log("\n(9) B64 DECODER — UTF-8 round trip");
{
  const txt = '<R><C>Müller — “quotes” ✓</C></R>';
  ok(t2sBipB64Decode(Buffer.from(txt, "utf8").toString("base64")) === txt, "multi-byte UTF-8 decodes exactly");
}

console.log("\n" + (failures ? failures + " GUARD FAILURE(S)" : "ALL BIP GUARDS PASS"));
process.exit(failures ? 1 : 0);
