const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('electronAPI', {
  saveFile: (opts) => ipcRenderer.invoke('save-file', opts),
  toggleMaximize: () => ipcRenderer.invoke('toggle-maximize'),
  loadProfiles: () => { try { return ipcRenderer.sendSync('profiles-load'); } catch (e) { return ''; } },
  saveProfiles: (json) => { try { return ipcRenderer.sendSync('profiles-save', json); } catch (e) { return false; } },
  // SSO (federated) auth — optional. The Basic-auth path never calls these.
  ssoLogin: (baseUrl) => ipcRenderer.invoke('sso-login', baseUrl),
  ssoFetch: (url) => ipcRenderer.invoke('sso-fetch', { url }),
  ssoClear: () => ipcRenderer.invoke('sso-clear'),
  onMenuEvent: (cb) => {
    ['menu-run','menu-save','menu-new-tab','menu-format','menu-explain',
     'menu-connect','menu-export-excel','menu-export-csv'].forEach(e => {
      ipcRenderer.on(e, () => cb(e));
    });
  },
  platform: process.platform
});
