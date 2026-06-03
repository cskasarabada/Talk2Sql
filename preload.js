const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('electronAPI', {
  saveFile: (opts) => ipcRenderer.invoke('save-file', opts),
  toggleMaximize: () => ipcRenderer.invoke('toggle-maximize'),
  loadProfiles: () => { try { return ipcRenderer.sendSync('profiles-load'); } catch (e) { return ''; } },
  saveProfiles: (json) => { try { return ipcRenderer.sendSync('profiles-save', json); } catch (e) { return false; } },
  onMenuEvent: (cb) => {
    ['menu-run','menu-save','menu-new-tab','menu-format','menu-explain',
     'menu-connect','menu-export-excel','menu-export-csv'].forEach(e => {
      ipcRenderer.on(e, () => cb(e));
    });
  },
  platform: process.platform
});
