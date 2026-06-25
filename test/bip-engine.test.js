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
const START = "/* ===== ariadne@";
const END = "/* ===== end ariadne ===== */";
const s = html.indexOf(START), e = html.indexOf(END);
if (s < 0 || e < 0) { console.error("Could not locate the embedded executor block"); process.exit(2); }
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(html.slice(s, e) +
  "\nthis.__api={t2sBipEnvelope,t2sBipParseSoap,t2sBipRowsFromXml,t2sProcessBipResponse,t2sBipB64Decode,t2sAssertRenderable," +
  "t2sBipRestPath,t2sBipRestPathCandidates,t2sBipRestBody,t2sBipParseRestMultipart,t2sProcessBipRestResponse," +
  "t2sBipReportName,t2sSawOpenUrl,t2sSawExtractToken,t2sSawRunUrl,t2sProcessSawResponse,t2sBipRowsFromHtml," +
  "t2sBipDirectUrl,t2sProcessBipDirectResponse," +
  "t2sMetaSchemasSQL,t2sMetaTablesSQL,t2sMetaColumnsSQL,t2sMetaSearchSQL,t2sReadOnlySQL};", sandbox);
const { t2sBipEnvelope, t2sBipParseSoap, t2sBipRowsFromXml, t2sProcessBipResponse, t2sBipB64Decode, t2sAssertRenderable,
        t2sBipRestPath, t2sBipRestPathCandidates, t2sBipRestBody, t2sBipParseRestMultipart, t2sProcessBipRestResponse,
        t2sBipReportName, t2sSawOpenUrl, t2sSawExtractToken, t2sSawRunUrl, t2sProcessSawResponse, t2sBipRowsFromHtml,
        t2sBipDirectUrl, t2sProcessBipDirectResponse,
        t2sMetaSchemasSQL, t2sMetaTablesSQL, t2sMetaColumnsSQL, t2sMetaSearchSQL, t2sReadOnlySQL } = sandbox.__api;

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
  ok(env.xml.indexOf("<pub:attributeFormat>xml</pub:attributeFormat>") > 0, "requests xml (raw data; report must allow it — no interactive layout)");
  ok(t2sBipEnvelope("SELECT ']]>' FROM dual", "/Custom/x.xdo").error, "CDATA breakout sequence refused");
  ok(t2sBipEnvelope(ctx.sql, "not-a-path").error, "non-.xdo report path refused");
  ok(t2sBipEnvelope("", "/Custom/x.xdo").error, "empty SQL refused");
  const w = t2sBipEnvelope(ctx.sql, "/Custom/x.xdo", { user: "amy<&>", pass: 'p"w' });
  ok(w.xml.indexOf("<wsse:UsernameToken") > 0 && w.xml.indexOf("amy&lt;&amp;&gt;") > 0, "WSS UsernameToken added, credentials XML-escaped");
  ok(w.xml.indexOf("mustUnderstand") > 0 && /<wsu:Timestamp[\s\S]*<wsu:Created>\d{4}-\d{2}-\d{2}T/.test(w.xml), "full OWSM header: mustUnderstand + Timestamp present");
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

console.log("\n(10) REST PATH ENCODING — relative to Shared Folders, no .xdo, slashes %2F");
{
  ok(t2sBipRestPath("/Custom/Argano/T2S_SQL.xdo") === "Custom%2FArgano%2FT2S_SQL", "leading slash + .xdo stripped, slashes encoded");
  ok(t2sBipRestPath("/Custom/My Reports/T2S.xdo") === "Custom%2FMy%20Reports%2FT2S", "spaces in folder names encoded");
  const cands = t2sBipRestPathCandidates("/shared/Custom/Argano/T2S_SQL.xdo");
  ok(cands.length === 4, "four path candidates produced");
  ok(cands[0] === "Custom%2FArgano%2FT2S_SQL", "leading 'shared' root dropped from primary candidate");
  ok(cands.indexOf("%2Fshared%2FCustom%2FArgano%2FT2S_SQL") >= 0, "literal-root variant included as fallback");
}

console.log("\n(11) REST MULTIPART BODY — single ReportRequest JSON part, SQL in p_sql");
{
  const b = t2sBipRestBody(ctx.sql);
  ok(/multipart\/form-data; boundary=/.test(b.contentType), "multipart content type with boundary");
  ok(b.body.indexOf('name="ReportRequest"') > 0, "ReportRequest part present");
  ok(b.body.indexOf('"p_sql"') > 0 && b.body.indexOf(ctx.sql) > 0, "p_sql parameter carries the SQL");
  ok(t2sBipRestBody("").error, "empty SQL refused");
}

function restMultipart(dataXml) {
  const b = "Bnd_42";
  return "--" + b + "\r\nContent-Type: application/json\r\nContent-Disposition: form-data; name=\"ReportResponse\"\r\n\r\n" +
    '{"reportContentType":"text/xml"}\r\n--' + b +
    "\r\nContent-Type: application/octet-stream\r\nContent-Disposition: form-data; name=\"ReportOutput\"\r\n\r\n" +
    dataXml + "\r\n--" + b + "--\r\n";
}

console.log("\n(12) REST RESPONSE — live rows from the ReportOutput part, with provenance");
{
  const data = '<?xml version="1.0"?><DATA_DS><G_1><ONE>1</ONE></G_1></DATA_DS>';
  const p = t2sProcessBipRestResponse({ status: 200, responseText: restMultipart(data) }, ctx);
  ok(p.kind === "rows" && p.rows.length === 1 && p.rows[0][0] === "1", "ReportOutput XML parsed to rows");
  ok(p.prov && p.prov.live === true, "provenance stamped");
  ok(rowsThatReachGrid(p).length === 1, "passes the render boundary");
}

console.log("\n(13) REST 401 — SSO session rejected → honest error, no rows");
{
  const p = t2sProcessBipRestResponse({ status: 401, responseText: "" }, ctx);
  ok(p.kind === "error" && /401/.test(p.message) && /SSO session/.test(p.message), "401 explains the SSO/role cause");
  ok(rowsThatReachGrid(p).length === 0, "0 rows reach the grid");
}

console.log("\n(14) REST empty + transport failures");
{
  ok(t2sProcessBipRestResponse({ status: 200, responseText: restMultipart("<DATA_DS></DATA_DS>") }, ctx).kind === "empty", "empty rowset → empty");
  ok(t2sProcessBipRestResponse({ networkError: true }, ctx).kind === "error", "networkError → error");
  ok(t2sProcessBipRestResponse({ status: 404, responseText: "" }, ctx).kind === "error", "404 → error");
}

console.log("\n(15) SAW.DLL URLs — open page + run carry the right path, token, SQL, xml format");
{
  const base = "https://pod.fa.ocs.oraclecloud.com";
  const ap = "/Custom/Argano/T2S_SQL.xdo";
  ok(t2sBipReportName(ap) === "T2S_SQL", "report name derived (no .xdo)");
  const openU = t2sSawOpenUrl(base, ap);
  ok(openU.indexOf("bipublisherEntry") > 0 && openU.indexOf("Action=open") > 0, "open URL hits the bipublisherEntry gateway");
  ok(openU.indexOf("path=" + encodeURIComponent("/shared/Custom/Argano/T2S_SQL.xdo")) > 0, "open URL uses the /shared catalog path");
  const runU = t2sSawRunUrl(base, ap, "SELECT 1 AS ONE FROM DUAL", "TKN123");
  ok(runU.indexOf("TKN123") > 0, "run URL carries the scraped _sTkn");
  ok(decodeURIComponent(runU).indexOf('"_paramsp_sql":"SELECT 1 AS ONE FROM DUAL"') > 0, "run URL carries the SQL in _paramsp_sql");
  ok(decodeURIComponent(runU).indexOf('"_xf":"xml"') > 0, "run URL requests xml data (not pdf)");
}

console.log("\n(16) SAW.DLL TOKEN SCRAPE");
{
  ok(t2sSawExtractToken('var x={_sTkn:"f864576019ed670c680",a:1}') === "f864576019ed670c680", "extracts _sTkn from JS");
  ok(t2sSawExtractToken('"_sTkn":"abc123DEF456"') === "abc123DEF456", "extracts quoted _sTkn");
  ok(t2sSawExtractToken("<html>no token here</html>") === null, "no token → null (caller errors, never fabricates)");
}

console.log("\n(17) SAW.DLL RESPONSE — data rows vs HTML/expired/ORA");
{
  const data = '<?xml version="1.0"?><DATA_DS><G_1><ONE>1</ONE></G_1></DATA_DS>';
  const p = t2sProcessSawResponse({ status: 200, responseText: data }, ctx);
  ok(p.kind === "rows" && p.rows.length === 1 && p.prov.live === true, "data XML → rows with provenance");
  ok(rowsThatReachGrid(p).length === 1, "passes render boundary");
  const h = t2sProcessSawResponse({ status: 200, responseText: "<!DOCTYPE html><html><body>Sign In</body></html>" }, ctx);
  ok(h.kind === "error" && /HTML page/.test(h.message), "login/expired HTML → explicit error, no rows");
  ok(rowsThatReachGrid(h).length === 0, "HTML page yields 0 rows");
  ok(t2sProcessSawResponse({ status: 200, responseText: "<DATA_DS>ORA-00942: bad table</DATA_DS>" }, ctx).kind === "error", "ORA error surfaced");
  ok(t2sProcessSawResponse({ status: 401, responseText: "" }, ctx).kind === "error", "HTTP 401 → error");
  ok(t2sProcessSawResponse({ networkError: true }, ctx).kind === "error", "networkError → error");
}

console.log("\n(18) HTML OUTPUT PARSING — rendered report table → rows (xpt fallback)");
{
  const html = '<html><body><table><tr><td>ignore</td></tr></table>' +
    '<table class="data"><tr><th>PARTY_NAME</th><th>PARTY_ID</th></tr>' +
    '<tr><td>Acme &amp; Sons</td><td>101</td></tr><tr><td>Globex</td><td>102</td></tr></table></body></html>';
  const r = t2sBipRowsFromHtml(html);
  ok(r.cols && r.cols.join(",") === "PARTY_NAME,PARTY_ID", "header row → columns");
  ok(r.rows.length === 2 && r.rows[0][0] === "Acme & Sons", "data rows parsed, entities decoded, biggest table chosen");
  // full pipe through the SOAP processor (HTML body in reportBytes)
  const soapHtml = '<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"><soap:Body>' +
    '<runReportResponse><runReportReturn><reportBytes>' +
    Buffer.from('<html><table><tr><th>ONE</th></tr><tr><td>1</td></tr></table></html>', 'utf8').toString('base64') +
    '</reportBytes></runReportReturn></runReportResponse></soap:Body></soap:Envelope>';
  const p = t2sProcessBipResponse({ status: 200, responseText: soapHtml }, ctx);
  ok(p.kind === "rows" && p.rows.length === 1 && p.rows[0][0] === "1" && p.prov.live === true, "HTML report output flows to rows with provenance");
  ok(t2sBipRowsFromHtml("<html>no table, JS-rendered</html>").error, "no table → explicit error (never fabricates)");
}

console.log("\n(18b) NESTED RESULT COLUMN — OFJDBC-style serialized rowset is unwrapped");
{
  // Single RESULT column whose value is the real rowset as escaped XML
  const nested = '<DATA_DS><G_1><RESULT>&lt;ROWSET&gt;&lt;ROW&gt;&lt;DUMMY&gt;X&lt;/DUMMY&gt;&lt;/ROW&gt;&lt;/ROWSET&gt;</RESULT></G_1></DATA_DS>';
  const r = t2sBipRowsFromXml(nested);
  ok(r.cols && r.cols.join(",") === "DUMMY", "inner column names recovered (DUMMY), not 'RESULT'");
  ok(r.rows.length === 1 && r.rows[0][0] === "X", "inner value recovered cleanly (X), no XML fragments");
  // multi-row, multi-col nested
  const n2 = '<DATA_DS>' +
    '<G_1><RESULT>&lt;ROW&gt;&lt;NAME&gt;Acme&lt;/NAME&gt;&lt;ID&gt;1&lt;/ID&gt;&lt;/ROW&gt;</RESULT></G_1>' +
    '<G_1><RESULT>&lt;ROW&gt;&lt;NAME&gt;Globex&lt;/NAME&gt;&lt;ID&gt;2&lt;/ID&gt;&lt;/ROW&gt;</RESULT></G_1></DATA_DS>';
  const r2 = t2sBipRowsFromXml(n2);
  ok(r2.cols.join(",") === "NAME,ID" && r2.rows.length === 2 && r2.rows[1][0] === "Globex", "multiple nested ROW chunks combined and parsed");
}

console.log("\n(19) DIRECT REPORT URL — /xmlpserver/<path>.xdo?_xf=xml (SplashBI method)");
{
  const u = t2sBipDirectUrl("https://pod.fa.ocs.oraclecloud.com", "/Custom/Argano/T2S_SQL.xdo", "SELECT 1 AS ONE FROM DUAL");
  ok(u.indexOf("/xmlpserver/Custom/Argano/T2S_SQL.xdo") > 0, "report path under /xmlpserver, Shared Folders root dropped, .xdo kept");
  ok(u.indexOf("_xf=xml") > 0, "_xf=xml requests Data output");
  ok(u.indexOf("_xpt=1") > 0 && u.indexOf("_xmode=4") > 0, "exports document only (not the viewer shell)");
  ok(decodeURIComponent(u).indexOf("p_sql=SELECT 1 AS ONE FROM DUAL") > 0, "SQL carried in the p_sql data-model parameter");
}

console.log("\n(20) DIRECT URL RESPONSE — data rows vs login-HTML vs ORA vs 401");
{
  const data = '<?xml version="1.0"?><DATA_DS><G_1><ONE>1</ONE></G_1></DATA_DS>';
  const p = t2sProcessBipDirectResponse({ status: 200, responseText: data }, ctx);
  ok(p.kind === "rows" && p.rows.length === 1 && p.rows[0][0] === "1" && p.prov.live === true, "data XML → rows with provenance");
  ok(rowsThatReachGrid(p).length === 1, "passes render boundary");
  // ROWSET shape (orfujdbc-style) also parses
  const rowset = '<ROWSET><ROW><PARTY_NAME>Acme</PARTY_NAME></ROW><ROW><PARTY_NAME>Globex</PARTY_NAME></ROW></ROWSET>';
  ok(t2sProcessBipDirectResponse({ status: 200, responseText: rowset }, ctx).rows.length === 2, "ROWSET/ROW shape parses too");
  const h = t2sProcessBipDirectResponse({ status: 200, responseText: "<!DOCTYPE html><html>login</html>" }, ctx);
  ok(h.kind === "error" && /error\/HTML page/.test(h.message), "login HTML → explicit error, no rows");
  // XHTML error page prefixed with <?xml ...?> must NOT be parsed into rows
  const xhtmlErr = '<?xml version="1.0"?><html><body><table><tr><td>Error</td><td>Error Detail</td></tr>' +
    '<tr><td>oracle.xdo.servlet.data.DataException</td><td>Invalid format requested</td></tr></table></body></html>';
  const xe = t2sProcessBipDirectResponse({ status: 200, responseText: xhtmlErr }, ctx);
  ok(xe.kind === "error" && /error\/HTML page/.test(xe.message), "XHTML error page (xml-prefixed) → error, never fake rows");
  ok(rowsThatReachGrid(xe).length === 0, "error page yields 0 rows on the grid");
  ok(t2sProcessBipDirectResponse({ status: 200, responseText: "<DATA_DS>ORA-00942: bad</DATA_DS>" }, ctx).kind === "error", "ORA surfaced");
  ok(t2sProcessBipDirectResponse({ status: 401, responseText: "" }, ctx).kind === "error", "401 → error");
  ok(t2sProcessBipDirectResponse({ networkError: true }, ctx).kind === "error", "networkError → error");
}

console.log("\n(21) LIVE SCHEMA EXPLORER — dictionary SQL is read-only & injection-safe");
{
  ok(/^SELECT owner, COUNT\(\*\)/.test(t2sMetaSchemasSQL()), "schemas query lists owners");
  ok(t2sMetaTablesSQL("fusion").indexOf("owner='FUSION'") > 0, "tables query uppercases + quotes owner");
  ok(/all_tables/.test(t2sMetaTablesSQL("X")) && /all_views/.test(t2sMetaTablesSQL("X")), "tables query unions tables + views");
  ok(t2sMetaColumnsSQL("o","t").indexOf("all_tab_columns") > 0, "columns query hits all_tab_columns");
  ok(/all_tables/i.test(t2sMetaSearchSQL("X")) && /all_views/i.test(t2sMetaSearchSQL("X")), "search covers BOTH tables and views (so _VL views are found)");
  // prefix scoping: ICM 'Earnings' chip = prefix CN + term EARNING → can't match LEARNING
  const scoped = t2sMetaSearchSQL("EARNING","CN");
  ok(scoped.indexOf("LIKE 'CN\\_%' ESCAPE") > 0, "prefix anchored to family pattern CN_% (not 'MCN', not mid-name)");
  ok(scoped.indexOf("LIKE '%EARNING%' ESCAPE") > 0, "keyword applied within the family");
  ok(t2sMetaSearchSQL("","HZ").indexOf("LIKE 'HZ\\_%' ESCAPE") > 0, "prefix-only chip lists the whole family (HZ_%)");
  // injection attempts are neutralised — no statement-breaking characters survive
  const evil = t2sMetaSearchSQL("x'; DROP TABLE foo;--");
  ok(evil.indexOf(";") < 0 && evil.indexOf("--") < 0 && evil.indexOf("'%X") >= 0, "search term strips ; quotes -- (becomes a harmless LIKE literal)");
  ok(t2sReadOnlySQL(evil).ok, "sanitized search still passes the read-only gate (no DROP/DDL word-boundary)");
  ok(t2sMetaTablesSQL("a' OR '1'='1").indexOf("''") > 0, "owner single-quotes are escaped (doubled)");
  // every builder is still a read-only SELECT per the gate
  [t2sMetaSchemasSQL(), t2sMetaTablesSQL("FUSION"), t2sMetaColumnsSQL("FUSION","CN_COMP_PLANS_ALL_VL"), t2sMetaSearchSQL("COMP")].forEach(function(q){
    ok(t2sReadOnlySQL(q).ok, "passes read-only gate: " + q.slice(0,42) + "…");
  });
}

console.log("\n" + (failures ? failures + " GUARD FAILURE(S)" : "ALL BIP GUARDS PASS"));
process.exit(failures ? 1 : 0);
