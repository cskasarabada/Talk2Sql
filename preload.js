const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('electronAPI', {
  saveFile: (opts) => ipcRenderer.invoke('save-file', opts),
  toggleMaximize: () => ipcRenderer.invoke('toggle-maximize'),
  onMenuEvent: (cb) => {
    ['menu-run','menu-save','menu-new-tab','menu-format','menu-explain',
     'menu-connect','menu-export-excel','menu-export-csv'].forEach(e => {
      ipcRenderer.on(e, () => cb(e));
    });
  },
  platform: process.platform
});
