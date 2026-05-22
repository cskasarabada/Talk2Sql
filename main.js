const { app, BrowserWindow, Menu, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let win;

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

app.whenReady().then(() => {
  createWindow();
  buildMenu();
  app.on('activate', () => { if (!win) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
