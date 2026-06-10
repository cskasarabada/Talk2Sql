const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('electronAPI', {
  saveFile: (opts) => ipcRenderer.invoke('save-file', opts),
  toggleMaximize: () => ipcRenderer.invoke('toggle-maximize'),
  loadProfiles: () => { try { return ipcRenderer.sendSync('profiles-load'); } catch (e) { return ''; } },
  saveProfiles: (json) => { try { return ipcRenderer.sendSync('profiles-save', json); } catch (e) { return false; } },
  loadSettings: () => { try { return ipcRenderer.sendSync('settings-load'); } catch (e) { return ''; } },
  saveSettings: (json) => { try { return ipcRenderer.sendSync('settings-save', json); } catch (e) { return false; } },
  // SSO (federated) auth — optional. The Basic-auth path never calls these.
  ssoLogin: (baseUrl) => ipcRenderer.invoke('sso-login', baseUrl),
  ssoFetch: (url) => ipcRenderer.invoke('sso-fetch', { url }),
  ssoClear: () => ipcRenderer.invoke('sso-clear'),
  // OAuth client-credentials (Bearer) — for SAML-federated pods. The token and the
  // keychain-stored secret live in the main process only; the renderer just asks
  // for authorized GETs and receives raw {status,responseText}|{networkError}.
  oauthConnect: (cfg) => ipcRenderer.invoke('oauth-connect', cfg),
  oauthFetch: (url, opts) => ipcRenderer.invoke('oauth-fetch', Object.assign({ url }, opts || {})),
  oauthClear: (opts) => ipcRenderer.invoke('oauth-clear', opts || {}),
  onMenuEvent: (cb) => {
    ['menu-run','menu-save','menu-new-tab','menu-format','menu-explain',
     'menu-connect','menu-export-excel','menu-export-csv'].forEach(e => {
      ipcRenderer.on(e, () => cb(e));
    });
  },
  platform: process.platform
});
