/* ──────────────────────────────────────────────────────────────────────────
   Talk2Sql — OAuth 2.0 Client-Credentials Token Manager (MAIN PROCESS ONLY).

   Transport layer for SAML-federated Fusion pods, per docs/SSO-Auth-Architecture.html:
   mints a Bearer token from the customer's IAM identity domain, caches it until
   expires_in (minus skew), refreshes once on a 401, and pins GETs to the
   configured Fusion host. The client secret is supplied via an injected
   getSecret() (backed by Electron safeStorage / OS keychain in main.js) and the
   token never leaves this module — the renderer only ever receives raw
   {status, responseText} | {networkError:true}, which feeds the SAME
   t2sProcessResponse guard. This module NEVER synthesizes a response body:
   every failure is an explicit error, so no path can fabricate rows.

   Dependency-injected (httpPost/httpGet/getSecret/now) so the guard test can
   prove the 401-refresh-once behavior without a network.
   ────────────────────────────────────────────────────────────────────────── */

function createTokenManager(opts) {
  const httpPost = opts.httpPost;   // (url, headers, body) -> {status, body} | {networkError, message}
  const httpGet  = opts.httpGet;    // (url, headers)       -> {status, responseText} | {networkError, message}
  const getSecret = opts.getSecret; // () -> Promise<string|null> — keychain-backed; never logged
  const now = opts.now || (() => Date.now());

  const SKEW_MS = 60 * 1000;        // refresh proactively 60s before expiry
  let cfg = null;                   // {baseUrl, tokenUrl, clientId, scope}
  let token = null;                 // held in main-process memory only
  let expMs = 0;

  function host(u) { try { return new URL(u).host; } catch (e) { return ""; } }

  async function mint() {
    if (!cfg) return { ok: false, error: "OAuth not configured" };
    let secret;
    try { secret = await getSecret(); } catch (e) { secret = null; }
    if (!secret) return { ok: false, error: "No client secret available — enter it once so it can be stored in the OS keychain" };
    const res = await httpPost(cfg.tokenUrl, {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": "Basic " + Buffer.from(cfg.clientId + ":" + secret).toString("base64"),
      "Accept": "application/json"
    }, "grant_type=client_credentials&scope=" + encodeURIComponent(cfg.scope));
    if (!res || res.networkError) return { ok: false, error: "IAM token endpoint unreachable" + (res && res.message ? ": " + res.message : "") };
    if (res.status !== 200) return { ok: false, error: "IAM token endpoint HTTP " + res.status + (res.body ? " — " + String(res.body).slice(0, 300) : "") };
    let j; try { j = JSON.parse(res.body); } catch (e) { return { ok: false, error: "IAM token endpoint returned non-JSON" }; }
    if (!j.access_token) return { ok: false, error: "Token response missing access_token" };
    token = j.access_token;
    expMs = now() + Math.max(0, (Number(j.expires_in) || 300)) * 1000 - SKEW_MS;
    return { ok: true, expiresIn: Number(j.expires_in) || 0 };
  }

  return {
    /* Set/replace the active OAuth config. Invalidates any cached token. */
    configure(c) {
      if (!c || !c.baseUrl || !c.tokenUrl || !c.clientId || !c.scope)
        return { ok: false, error: "Missing OAuth fields (Fusion URL, Token URL, Client ID, Scope)" };
      cfg = { baseUrl: String(c.baseUrl).replace(/\/$/, ""), tokenUrl: c.tokenUrl, clientId: c.clientId, scope: c.scope };
      token = null; expMs = 0;
      return { ok: true };
    },

    /* Token clear on disconnect — no standing credential left in memory. */
    clear() { cfg = null; token = null; expMs = 0; },

    isConfigured() { return !!cfg; },

    /* Mint (or re-mint) eagerly — used by the connect flow to verify setup. */
    async connect() { return mint(); },

    /* Authorized read-only request. Host-pinned to the configured pod. GET by
       default; POST is permitted ONLY to the BI Publisher SOAP service path
       (/xmlpserver/...) so the BIP SQL engine can call runReport — every other
       method/path is refused (the read-only posture is enforced by the SQL gate
       upstream AND this transport restriction). On 401, refreshes the token ONCE
       and retries ONCE; a second 401 is surfaced verbatim. Never returns
       invented content. */
    async authedFetch(url, opts) {
      opts = opts || {};
      const method = (opts.method || "GET").toUpperCase();
      if (!cfg) return { networkError: true, message: "OAuth not configured" };
      if (host(url) !== host(cfg.baseUrl))
        return { networkError: true, message: "Blocked: " + host(url) + " is not the configured Fusion host" };
      let pathname; try { pathname = new URL(url).pathname; } catch (e) { pathname = ""; }
      if (method !== "GET" && !(method === "POST" && pathname.indexOf("/xmlpserver/") === 0))
        return { networkError: true, message: "Blocked: " + method + " is only permitted to the BI Publisher service path" };
      if (!token || now() >= expMs) {
        const m = await mint();
        if (!m.ok) return { networkError: true, message: "OAuth token: " + m.error };
      }
      const send = () => {
        const hdrs = { "Authorization": "Bearer " + token, "Accept": opts.accept || "application/json" };
        if (method === "POST") {
          hdrs["Content-Type"] = opts.contentType || "application/soap+xml; charset=UTF-8";
          return httpPost(url, hdrs, opts.body || "");
        }
        return httpGet(url, hdrs);
      };
      let r = await send();
      if (r && !r.networkError && r.status === 401) {
        const m = await mint();                          // 401 → refresh once
        if (!m.ok) return { status: 401, responseText: r.responseText || "" };
        r = await send();
      }
      if (!r || r.networkError) return { networkError: true, message: (r && r.message) || "" };
      return { status: r.status, responseText: r.responseText || r.body || "" };
    }
  };
}

module.exports = { createTokenManager };
