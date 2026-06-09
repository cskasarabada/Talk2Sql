const { app, BrowserWindow, Menu, shell, ipcMain, dialog, session, net } = require('electron');
const path = require('path');
const fs = require('fs');

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

// Clear the SSO session (sign out / switch customer).
ipcMain.handle('sso-clear', async () => {
  try { await session.fromPartition(SSO_PARTITION).clearStorageData(); return { ok: true }; }
  catch (e) { return { ok: false, error: String(e) }; }
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
                               : [{name:'JSON',extensions:['json']}]
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
