const { app, BrowserWindow, Menu, shell, ipcMain, dialog, session, net, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');
const { createTokenManager } = require('./oauth-manager');

let win;

/* ── SSO (federated) connection support ─────────────────────────────────────
   Optional auth mode. The user completes their org SSO (e.g. Argano → customer
   Oracle) in a real browser window backed by a persistent session partition;
   the resulting session cookies are then reused for read-only REST GETs issued
   from the main process. Basic-auth path is untouched and remains the default. */
const SSO_PARTITION = 'persist:fusion-sso';

// Open the Oracle base URL for interactive SSO. Resolves when the user closes the
// window after signing in. Cookies persist in SSO_PARTITION for subsequent fetches.
ipcMain.handle('sso-login', async (event, baseUrl) => {
  return new Promise((resolve) => {
    let loginWin;
    try {
      loginWin = new BrowserWindow({
        width: 1100, height: 820, title: 'Sign in to Oracle (SSO)',
        parent: win, modal: false, show: true,
        webPreferences: { partition: SSO_PARTITION, nodeIntegration: false, contextIsolation: true }
      });
    } catch (e) { resolve({ ok: false, error: String(e) }); return; }
    let settled = false;
    const finish = (ok) => { if (settled) return; settled = true; resolve({ ok: ok, partition: SSO_PARTITION }); };
    loginWin.on('closed', () => finish(true)); // user signs in, then closes the window
    loginWin.loadURL(baseUrl).catch((e) => { finish(false); });
  });
});

// Issue a read-only GET using the SSO session's cookies. Returns a plain
// {status, responseText} or {networkError:true} — the renderer feeds this into
// the SAME t2sProcessResponse guard, so SSO can never fabricate rows either.
ipcMain.handle('sso-fetch', async (event, opts) => {
  const url = (opts && opts.url) || '';
  return new Promise((resolve) => {
    let body = '';
    let req;
    try {
      req = net.request({ method: 'GET', url: url, session: session.fromPartition(SSO_PARTITION), useSessionCookies: true });
    } catch (e) { resolve({ networkError: true, message: String(e) }); return; }
    req.setHeader('Accept', 'application/json');
    req.on('response', (resp) => {
      resp.on('data', (chunk) => { body += chunk.toString(); });
      resp.on('end', () => resolve({ status: resp.statusCode, responseText: body }));
      resp.on('error', () => resolve({ networkError: true }));
    });
    req.on('error', (err) => resolve({ networkError: true, message: String(err) }));
    req.end();
  });
});

// Issue a read-only POST using the SSO session's cookies — used by the BIP engine
// to call BI Publisher's runReport SOAP service. This is how SSO-enabled pods are
// queried for SQL (CloudSQL-style): the interactive login establishes the session,
// and BI Publisher trusts that SSO session even though REST rejects it. Returns the
// same {status, responseText} | {networkError:true} shape, so it feeds the SAME
// t2sProcessBipResponse guard — SSO can never fabricate rows here either.
ipcMain.handle('sso-post', async (event, opts) => {
  const url = (opts && opts.url) || '';
  const bodyOut = (opts && opts.body) || '';
  const contentType = (opts && opts.contentType) || 'application/soap+xml; charset=UTF-8';
  return new Promise((resolve) => {
    let body = '';
    let req;
    try {
      req = net.request({ method: 'POST', url: url, session: session.fromPartition(SSO_PARTITION), useSessionCookies: true });
    } catch (e) { resolve({ networkError: true, message: String(e) }); return; }
    req.setHeader('Content-Type', contentType);
    req.setHeader('Accept', 'application/soap+xml, text/xml, */*');
    req.on('response', (resp) => {
      resp.on('data', (chunk) => { body += chunk.toString(); });
      resp.on('end', () => resolve({ status: resp.statusCode, responseText: body }));
      resp.on('error', () => resolve({ networkError: true }));
    });
    req.on('error', (err) => resolve({ networkError: true, message: String(err) }));
    req.write(bodyOut);
    req.end();
  });
});

// Clear the SSO session (sign out / switch customer).
ipcMain.handle('sso-clear', async () => {
  try { await session.fromPartition(SSO_PARTITION).clearStorageData(); return { ok: true }; }
  catch (e) { return { ok: false, error: String(e) }; }
});

/* ── OAuth 2.0 Client Credentials (Bearer) — the supported path for SAML-federated pods ──
   Token Manager lives in oauth-manager.js (injected transport, unit-tested for the
   401-refresh-once path). The client secret is encrypted at rest via Electron
   safeStorage (macOS Keychain / Windows DPAPI) keyed by tokenUrl|clientId; the
   secret and the live token NEVER reach the renderer — it only ever gets raw
   {status,responseText}|{networkError}, which feeds the same t2sProcessResponse
   guard as Basic and SSO. No fabrication path. */

function netRequest(method, url, headers, body) {
  return new Promise((resolve) => {
    let req;
    try { req = net.request({ method: method, url: url }); }
    catch (e) { resolve({ networkError: true, message: String(e) }); return; }
    Object.keys(headers || {}).forEach((h) => { try { req.setHeader(h, headers[h]); } catch (e) {} });
    let buf = '';
    req.on('response', (resp) => {
      resp.on('data', (c) => { buf += c.toString(); });
      resp.on('end', () => resolve({ status: resp.statusCode, responseText: buf, body: buf }));
      resp.on('error', () => resolve({ networkError: true }));
    });
    req.on('error', (err) => resolve({ networkError: true, message: String(err) }));
    if (body) req.write(body);
    req.end();
  });
}

const OAUTH_SECRETS_FILE = path.join(app.getPath('userData'), 'talk2sql-oauth-secrets.json');
let oauthCfgKey = null; // tokenUrl|clientId of the active config

function oauthSecretsRead() { try { return JSON.parse(fs.readFileSync(OAUTH_SECRETS_FILE, 'utf8')); } catch (e) { return {}; } }
function oauthSecretsWrite(o) { try { fs.writeFileSync(OAUTH_SECRETS_FILE, JSON.stringify(o)); return true; } catch (e) { return false; } }
function oauthSecretSave(key, secret) {
  if (!safeStorage.isEncryptionAvailable()) return { ok: false, error: 'OS keychain encryption is unavailable on this machine — cannot store the client secret safely' };
  const all = oauthSecretsRead();
  all[key] = safeStorage.encryptString(secret).toString('base64');
  return oauthSecretsWrite(all) ? { ok: true } : { ok: false, error: 'Could not persist the encrypted secret' };
}
function oauthSecretLoad(key) {
  try {
    const b64 = oauthSecretsRead()[key];
    if (!b64) return null;
    return safeStorage.decryptString(Buffer.from(b64, 'base64'));
  } catch (e) { return null; }
}

/* ── Claude (Anthropic) API key — secure storage + reasoning layer ─────────────
   The Ariadne architect advisor can answer with real LLM reasoning, grounded in
   the app's deterministic rules engine. The API key is encrypted at rest via
   Electron safeStorage (macOS Keychain / Windows DPAPI) and lives in the MAIN
   process ONLY — it is NEVER exposed to the renderer. The renderer only ever
   receives {ok, text|error}; the key itself never crosses IPC. */
const AI_KEY_FILE = path.join(app.getPath('userData'), 'talk2sql-ai-key.json');
function aiKeyRead() { try { return JSON.parse(fs.readFileSync(AI_KEY_FILE, 'utf8')); } catch (e) { return {}; } }
function aiKeyWrite(o) { try { fs.writeFileSync(AI_KEY_FILE, JSON.stringify(o)); return true; } catch (e) { return false; } }
function aiKeySave(secret) {
  if (!safeStorage.isEncryptionAvailable()) return { ok: false, error: 'OS keychain encryption is unavailable on this machine — cannot store the API key safely' };
  const all = aiKeyRead();
  all['anthropic'] = safeStorage.encryptString(secret).toString('base64');
  return aiKeyWrite(all) ? { ok: true } : { ok: false, error: 'Could not persist the encrypted API key' };
}
function aiKeyLoad() {
  try {
    const b64 = aiKeyRead()['anthropic'];
    if (!b64) return null;
    return safeStorage.decryptString(Buffer.from(b64, 'base64'));
  } catch (e) { return null; }
}
function aiKeyClear() {
  try {
    const all = aiKeyRead();
    delete all['anthropic'];
    if (Object.keys(all).length) { aiKeyWrite(all); }
    else { try { fs.unlinkSync(AI_KEY_FILE); } catch (e) {} }
    return true;
  } catch (e) { return false; }
}

// Save the key (validated; encrypted; main-process only). Never echoed back.
ipcMain.handle('ai-key-save', (e, key) => {
  const k = String(key || '').trim();
  if (!k || k.indexOf('sk-') !== 0) return { ok: false, error: 'That does not look like an Anthropic API key' };
  return aiKeySave(k);
});
// Status only — NEVER returns the key itself.
ipcMain.handle('ai-key-status', () => ({ hasKey: !!aiKeyLoad() }));
// Forget the stored key.
ipcMain.handle('ai-key-clear', () => { aiKeyClear(); return { ok: true }; });

// Ariadne → Claude. The key is loaded in main and attached as x-api-key here; only
// the {ok, text|error} result crosses IPC back to the renderer. The renderer renders
// this ONLY inside the advisor panel as labeled AI guidance — never as live pod data.
ipcMain.handle('ariadne-advise', async (e, payload) => {
  payload = payload || {};
  const key = aiKeyLoad();
  if (!key) return { ok: false, error: 'no-key' };
  const body = JSON.stringify({
    model: payload.model || 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: payload.system || '',
    messages: [{ role: 'user', content: String(payload.user || '') }]
  });
  const res = await netRequest('POST', 'https://api.anthropic.com/v1/messages', {
    'x-api-key': key,
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json'
  }, body);
  if (res.networkError) return { ok: false, error: 'Network error reaching api.anthropic.com' };
  try {
    const j = JSON.parse(res.responseText || '{}');
    if (res.status >= 200 && res.status < 300 && Array.isArray(j.content)) {
      return { ok: true, text: j.content.map(c => c.text || '').join('') };
    }
    return { ok: false, error: (j.error && j.error.message) || ('HTTP ' + res.status) };
  } catch (err) {
    return { ok: false, error: 'HTTP ' + res.status };
  }
});

const oauthManager = createTokenManager({
  httpPost: (url, headers, body) => netRequest('POST', url, headers, body),
  httpGet:  (url, headers) => netRequest('GET', url, headers, null),
  getSecret: async () => (oauthCfgKey ? oauthSecretLoad(oauthCfgKey) : null)
});

// Configure + eagerly mint a token (verifies IAM domain, client, scope, secret).
// clientSecret is optional: omit it to reuse the keychain-stored secret.
ipcMain.handle('oauth-connect', async (event, c) => {
  c = c || {};
  const cfgRes = oauthManager.configure(c);
  if (!cfgRes.ok) return cfgRes;
  oauthCfgKey = (c.tokenUrl || '') + '|' + (c.clientId || '');
  if (c.clientSecret) {
    const s = oauthSecretSave(oauthCfgKey, c.clientSecret);
    if (!s.ok) { oauthManager.clear(); oauthCfgKey = null; return s; }
  } else if (!oauthSecretLoad(oauthCfgKey)) {
    oauthManager.clear(); oauthCfgKey = null;
    return { ok: false, error: 'No client secret on file for this client — enter it once; it is stored encrypted in the OS keychain' };
  }
  return oauthManager.connect();
});

// Authorized read-only request with Bearer; host-pinned; 401 → refresh once → retry once.
// GET by default; POST only to /xmlpserver/ (BIP runReport) — enforced in oauth-manager.
ipcMain.handle('oauth-fetch', async (event, opts) => {
  opts = opts || {};
  return oauthManager.authedFetch(opts.url || '', { method: opts.method, body: opts.body, contentType: opts.contentType, accept: opts.accept });
});

// Token clear on disconnect. {forget:true} also deletes the stored secret.
ipcMain.handle('oauth-clear', async (event, opts) => {
  oauthManager.clear();
  if (opts && opts.forget && oauthCfgKey) {
    const all = oauthSecretsRead(); delete all[oauthCfgKey]; oauthSecretsWrite(all);
  }
  oauthCfgKey = null;
  return { ok: true };
});

function createWindow() {
  win = new BrowserWindow({
    width: 1400, height: 900, minWidth: 900, minHeight: 600,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    title: 'Talk2Sql',
    icon: path.join(__dirname, 'assets', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false
    },
    backgroundColor: '#0f1117',
    show: false
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.once('ready-to-show', () => { win.show(); });
  win.on('closed', () => { win = null; });
}

function buildMenu() {
  const T = [
    ...(process.platform === 'darwin' ? [{
      label: 'Talk2Sql',
      submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'quit' }]
    }] : []),
    { label: 'File', submenu: [
      { label: 'New Tab', accelerator: 'CmdOrCtrl+T', click: () => win.webContents.send('menu-new-tab') },
      { label: 'Save Query', accelerator: 'CmdOrCtrl+S', click: () => win.webContents.send('menu-save') },
      { type: 'separator' },
      { label: 'Export Excel', accelerator: 'CmdOrCtrl+E', click: () => win.webContents.send('menu-export-excel') },
      { label: 'Export CSV', accelerator: 'CmdOrCtrl+Shift+E', click: () => win.webContents.send('menu-export-csv') },
      { type: 'separator' },
      process.platform === 'darwin' ? { role: 'close' } : { role: 'quit' }
    ]},
    { label: 'Edit', submenu: [
      { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
      { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }
    ]},
    { label: 'Query', submenu: [
      { label: 'Run', accelerator: 'CmdOrCtrl+Return', click: () => win.webContents.send('menu-run') },
      { label: 'Format SQL', accelerator: 'CmdOrCtrl+Shift+F', click: () => win.webContents.send('menu-format') },
      { label: 'Explain SQL', click: () => win.webContents.send('menu-explain') },
      { type: 'separator' },
      { label: 'Connect', accelerator: 'CmdOrCtrl+Shift+C', click: () => win.webContents.send('menu-connect') }
    ]},
    { label: 'View', submenu: [
      { role: 'reload' }, { role: 'forceReload' }, { type: 'separator' },
      { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' },
      { type: 'separator' }, { role: 'togglefullscreen' },
      { type: 'separator' },
      { label: 'Dev Tools', accelerator: 'Alt+CmdOrCtrl+I', click: () => win.webContents.toggleDevTools() }
    ]},
    { label: 'Help', submenu: [
      { label: 'Oracle Fusion Docs', click: () => shell.openExternal('https://docs.oracle.com/en/cloud/saas/sales/oedms/index.html') },
      { label: 'GitHub', click: () => shell.openExternal('https://github.com/cskasarabada/Talk2Sql') }
    ]}
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(T));
}

ipcMain.handle('save-file', async (event, { filename, data, type }) => {
  const result = await dialog.showSaveDialog(win, {
    defaultPath: path.join(app.getPath('downloads'), filename),
    filters: type === 'excel' ? [{name:'Excel',extensions:['xlsx']}]
           : type === 'csv'   ? [{name:'CSV',extensions:['csv']}]
           : type === 'html'  ? [{name:'HTML',extensions:['html','htm']}]
           : type === 'md'    ? [{name:'Markdown',extensions:['md']}]
           : type === 'sql'   ? [{name:'SQL',extensions:['sql']}]
           : type === 'txt'   ? [{name:'Text',extensions:['txt']}]
           : type === 'json'  ? [{name:'JSON',extensions:['json']}]
           : [{name:'All Files',extensions:['*']}]
  });
  if (!result.canceled) {
    fs.writeFileSync(result.filePath, Buffer.from(data));
    return { success: true, path: result.filePath };
  }
  return { success: false };
});

/* ── Durable connection-profile store ──────────────────────────────────────
   localStorage is unreliable for file:// origins in Electron (wiped on relaunch),
   so profiles are persisted to a JSON file in the app's userData folder.
   sendSync keeps the renderer's existing synchronous load/save API intact. */
const PROFILES_FILE = path.join(app.getPath('userData'), 'talk2sql-profiles.json');
ipcMain.on('profiles-load', (event) => {
  try { event.returnValue = fs.existsSync(PROFILES_FILE) ? fs.readFileSync(PROFILES_FILE, 'utf8') : ''; }
  catch (e) { event.returnValue = ''; }
});
ipcMain.on('profiles-save', (event, json) => {
  try { fs.writeFileSync(PROFILES_FILE, json || '[]'); event.returnValue = true; }
  catch (e) { event.returnValue = false; }
});

// Durable app settings (engine choice, BIP report path, …) — localStorage is
// wiped on file:// reloads, so settings persist to userData like profiles do.
const SETTINGS_FILE = path.join(app.getPath('userData'), 'talk2sql-settings.json');
ipcMain.on('settings-load', (event) => {
  try { event.returnValue = fs.existsSync(SETTINGS_FILE) ? fs.readFileSync(SETTINGS_FILE, 'utf8') : ''; }
  catch (e) { event.returnValue = ''; }
});
ipcMain.on('settings-save', (event, json) => {
  try { fs.writeFileSync(SETTINGS_FILE, json || '{}'); event.returnValue = true; }
  catch (e) { event.returnValue = false; }
});

// Durable key-value store — localStorage is wiped on file:// relaunch in Electron,
// so app state (saved queries, schema catalog, BI dashboards, discovery/scope, etc.)
// is mirrored to a userData JSON file and rehydrated into localStorage on launch.
const KV_FILE = path.join(app.getPath('userData'), 'talk2sql-kv.json');
ipcMain.on('kv-load', (event) => {
  try { event.returnValue = fs.existsSync(KV_FILE) ? fs.readFileSync(KV_FILE, 'utf8') : ''; }
  catch (e) { event.returnValue = ''; }
});
ipcMain.on('kv-save', (event, json) => {
  try { fs.writeFileSync(KV_FILE, json || '{}'); event.returnValue = true; }
  catch (e) { event.returnValue = false; }
});

// Schema Catalog — its own durable file (the harvested base SQL core can be 20MB+,
// far past the localStorage quota). Load is sync (one-time, on launch); save is async.
const SCHEMA_CAT_FILE = path.join(app.getPath('userData'), 'talk2sql-schema-catalog.json');
ipcMain.on('schema-cat-load', (event) => {
  try { event.returnValue = fs.existsSync(SCHEMA_CAT_FILE) ? fs.readFileSync(SCHEMA_CAT_FILE, 'utf8') : ''; }
  catch (e) { event.returnValue = ''; }
});
ipcMain.handle('schema-cat-save', async (event, json) => {
  try { fs.writeFileSync(SCHEMA_CAT_FILE, json || '{}'); return { ok: true }; }
  catch (e) { return { ok: false, error: String(e) }; }
});

ipcMain.handle('toggle-maximize', () => {
  if (!win) return;
  if (win.isMaximized()) {
    win.unmaximize();
  } else {
    win.maximize();
  }
});

app.whenReady().then(() => {
  createWindow();
  buildMenu();
  app.on('activate', () => { if (!win) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
