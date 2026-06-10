/* ──────────────────────────────────────────────────────────────────────────
   OAuth Token Manager guard test for Talk2Sql.

   THE INVARIANT under test: the OAuth transport (oauth-manager.js) never
   synthesizes a response. Specifically:
     (a) a 401 triggers exactly ONE token refresh and ONE retry — never a loop,
         never a substituted body;
     (b) a persistent 401 is surfaced verbatim as {status:401};
     (c) an unreachable token endpoint yields {networkError:true} — no body;
     (d) GETs to any host other than the configured Fusion pod are blocked;
     (e) cleared/unconfigured state yields {networkError:true}.
   All of these land in the renderer's t2sProcessResponse as honest error
   states, so OAuth mode cannot put non-live rows on the grid.

   Run:  node test/oauth-refresh.test.js   (exit 0 = pass)
   ────────────────────────────────────────────────────────────────────────── */
const { createTokenManager } = require("../oauth-manager");

let failures = 0;
const ok = (cond, msg) => { console.log((cond ? "  PASS  " : "  FAIL  ") + msg); if (!cond) failures++; };

const CFG = {
  baseUrl: "https://pod.fa.us2.oraclecloud.com",
  tokenUrl: "https://idcs-x.identity.oraclecloud.com/oauth2/v1/token",
  clientId: "abc123",
  scope: "urn:opc:resource:fusion:pod:erp/"
};
const LIVE_BODY = JSON.stringify({ items: [{ ProgramNumber: "CP-100" }] });

function makeMgr(behavior) {
  const calls = { post: 0, get: 0 };
  const mgr = createTokenManager({
    httpPost: async (url) => {
      calls.post++;
      if (behavior.tokenDown) return { networkError: true, message: "ECONNREFUSED" };
      return { status: 200, body: JSON.stringify({ access_token: "tok_" + calls.post, expires_in: 3600 }) };
    },
    httpGet: async (url, headers) => {
      calls.get++;
      return behavior.onGet(calls, headers);
    },
    getSecret: async () => (behavior.noSecret ? null : "s3cret"),
    now: () => 1000000
  });
  mgr._calls = calls;
  return mgr;
}

(async () => {
  console.log("\n(1) HAPPY PATH — token minted once, live body passed through untouched");
  {
    const m = makeMgr({ onGet: () => ({ status: 200, responseText: LIVE_BODY }) });
    m.configure(CFG);
    const r = await m.authedFetch(CFG.baseUrl + "/fscmRestApi/resources/latest/channelPrograms?limit=10");
    ok(r.status === 200 && r.responseText === LIVE_BODY, "returns the live body verbatim");
    ok(m._calls.post === 1 && m._calls.get === 1, "exactly 1 mint + 1 GET");
  }

  console.log("\n(2) 401 → REFRESH ONCE → RETRY ONCE → success");
  {
    const m = makeMgr({ onGet: (calls, headers) =>
      calls.get === 1 ? { status: 401, responseText: "" }
                      : { status: 200, responseText: LIVE_BODY } });
    m.configure(CFG);
    const r = await m.authedFetch(CFG.baseUrl + "/fscmRestApi/resources/latest/channelPrograms");
    ok(r.status === 200 && r.responseText === LIVE_BODY, "recovers after a single silent refresh");
    ok(m._calls.post === 2 && m._calls.get === 2, "exactly 2 mints + 2 GETs (refresh-once)");
  }

  console.log("\n(3) PERSISTENT 401 — surfaced verbatim, no loop, no substituted body");
  {
    const m = makeMgr({ onGet: () => ({ status: 401, responseText: "" }) });
    m.configure(CFG);
    const r = await m.authedFetch(CFG.baseUrl + "/fscmRestApi/resources/latest/channelPrograms");
    ok(r.status === 401, "401 reaches the guard as a 401");
    ok(!r.responseText || !/items/.test(r.responseText), "no row-shaped body invented");
    ok(m._calls.get === 2, "retried exactly once (no infinite refresh loop)");
  }

  console.log("\n(4) TOKEN ENDPOINT DOWN — honest networkError, never a body");
  {
    const m = makeMgr({ tokenDown: true, onGet: () => ({ status: 200, responseText: LIVE_BODY }) });
    m.configure(CFG);
    const r = await m.authedFetch(CFG.baseUrl + "/fscmRestApi/resources/latest/channelPrograms");
    ok(r.networkError === true, "networkError state");
    ok(r.responseText === undefined, "no response body fabricated");
    ok(m._calls.get === 0, "no data GET attempted without a token");
  }

  console.log("\n(5) NO SECRET ON FILE — honest error, no GET");
  {
    const m = makeMgr({ noSecret: true, onGet: () => ({ status: 200, responseText: LIVE_BODY }) });
    m.configure(CFG);
    const r = await m.authedFetch(CFG.baseUrl + "/fscmRestApi/resources/latest/channelPrograms");
    ok(r.networkError === true && m._calls.get === 0, "networkError, 0 GETs");
  }

  console.log("\n(6) HOST PINNING — only the configured Fusion pod is reachable");
  {
    const m = makeMgr({ onGet: () => ({ status: 200, responseText: LIVE_BODY }) });
    m.configure(CFG);
    const r = await m.authedFetch("https://evil.example.com/fscmRestApi/resources/latest/channelPrograms");
    ok(r.networkError === true && /not the configured/.test(r.message || ""), "foreign host blocked");
    ok(m._calls.get === 0, "no GET issued to the foreign host");
  }

  console.log("\n(7) CLEAR ON DISCONNECT — no standing capability afterwards");
  {
    const m = makeMgr({ onGet: () => ({ status: 200, responseText: LIVE_BODY }) });
    m.configure(CFG);
    await m.authedFetch(CFG.baseUrl + "/x");
    m.clear();
    const r = await m.authedFetch(CFG.baseUrl + "/fscmRestApi/resources/latest/channelPrograms");
    ok(r.networkError === true, "post-disconnect fetch is an honest error");
    ok(!m.isConfigured(), "config dropped");
  }

  console.log("\n(8) TOKEN CACHING — second call within expiry does NOT re-mint");
  {
    const m = makeMgr({ onGet: () => ({ status: 200, responseText: LIVE_BODY }) });
    m.configure(CFG);
    await m.authedFetch(CFG.baseUrl + "/a");
    await m.authedFetch(CFG.baseUrl + "/b");
    ok(m._calls.post === 1 && m._calls.get === 2, "1 mint serves 2 GETs");
  }

  console.log("\n(9) METHOD RESTRICTION — POST only to the BIP service path");
  {
    const m = makeMgr({ onGet: () => ({ status: 200, responseText: LIVE_BODY }) });
    m.configure(CFG);
    const blocked = await m.authedFetch(CFG.baseUrl + "/fscmRestApi/resources/latest/invoices", { method: "POST", body: "x" });
    ok(blocked.networkError === true && /only permitted/.test(blocked.message || ""), "POST to a REST resource is blocked");
    const del = await m.authedFetch(CFG.baseUrl + "/xmlpserver/services/ExternalReportWSSService", { method: "DELETE" });
    ok(del.networkError === true, "non-GET/POST methods are blocked everywhere");
    // POST to the BIP SOAP path is allowed and flows through the same refresh logic
    const m2 = makeMgr({ onGet: () => ({ status: 200, responseText: LIVE_BODY }) });
    m2.configure(CFG);
    // reuse httpPost: first call is the token mint, second is the SOAP POST
    let soapPosts = 0;
    const m3 = createTokenManager({
      httpPost: async (url) => {
        if (/oauth2\/v1\/token/.test(url)) return { status: 200, body: JSON.stringify({ access_token: "t", expires_in: 3600 }) };
        soapPosts++; return { status: 200, responseText: "<soap/>", body: "<soap/>" };
      },
      httpGet: async () => ({ status: 200, responseText: LIVE_BODY }),
      getSecret: async () => "s3cret", now: () => 1000000
    });
    m3.configure(CFG);
    const r = await m3.authedFetch(CFG.baseUrl + "/xmlpserver/services/ExternalReportWSSService", { method: "POST", body: "<env/>" });
    ok(r.status === 200 && soapPosts === 1, "POST to /xmlpserver/ is permitted with Bearer");
  }

  console.log("\n" + (failures ? failures + " GUARD FAILURE(S)" : "ALL OAUTH GUARDS PASS"));
  process.exit(failures ? 1 : 0);
})();
