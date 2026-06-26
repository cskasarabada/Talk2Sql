const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('electronAPI', {
  saveFile: (opts) => ipcRenderer.invoke('save-file', opts),
  toggleMaximize: () => ipcRenderer.invoke('toggle-maximize'),
  loadProfiles: () => { try { return ipcRenderer.sendSync('profiles-load'); } catch (e) { return ''; } },
  saveProfiles: (json) => { try { return ipcRenderer.sendSync('profiles-save', json); } catch (e) { return false; } },
  loadSettings: () => { try { return ipcRenderer.sendSync('settings-load'); } catch (e) { return ''; } },
  saveSettings: (json) => { try { return ipcRenderer.sendSync('settings-save', json); } catch (e) { return false; } },
  // Durable KV store — localStorage survives file:// relaunch via this mirror.
  kvLoad: () => { try { return ipcRenderer.sendSync('kv-load'); } catch (e) { return ''; } },
  kvSave: (json) => { try { return ipcRenderer.sendSync('kv-save', json); } catch (e) { return false; } },
  // Schema Catalog durable file (too big for localStorage). Load sync, save async.
  schemaCatFileLoad: () => { try { return ipcRenderer.sendSync('schema-cat-load'); } catch (e) { return ''; } },
  schemaCatFileSave: (json) => { try { return ipcRenderer.invoke('schema-cat-save', json); } catch (e) { return Promise.resolve({ ok: false }); } },
  // SSO (federated) auth — optional. The Basic-auth path never calls these.
  ssoLogin: (baseUrl) => ipcRenderer.invoke('sso-login', baseUrl),
  ssoFetch: (url) => ipcRenderer.invoke('sso-fetch', { url }),
  ssoPost: (url, body, contentType) => ipcRenderer.invoke('sso-post', { url, body, contentType }),
  ssoClear: () => ipcRenderer.invoke('sso-clear'),
  // OAuth client-credentials (Bearer) — for SAML-federated pods. The token and the
  // keychain-stored secret live in the main process only; the renderer just asks
  // for authorized GETs and receives raw {status,responseText}|{networkError}.
  oauthConnect: (cfg) => ipcRenderer.invoke('oauth-connect', cfg),
  oauthFetch: (url, opts) => ipcRenderer.invoke('oauth-fetch', Object.assign({ url }, opts || {})),
  oauthClear: (opts) => ipcRenderer.invoke('oauth-clear', opts || {}),
  // Claude (Anthropic) API key + Ariadne reasoning. The key is stored encrypted in
  // the OS keychain and lives in the main process ONLY — it never crosses back here.
  // The renderer only saves/clears/queries-status, and asks for advice ({ok,text|error}).
  aiKeySave: (key) => ipcRenderer.invoke('ai-key-save', key),
  aiKeyStatus: () => ipcRenderer.invoke('ai-key-status'),
  aiKeyClear: () => ipcRenderer.invoke('ai-key-clear'),
  ariadneAdvise: (payload) => ipcRenderer.invoke('ariadne-advise', payload),
  onMenuEvent: (cb) => {
    ['menu-run','menu-save','menu-new-tab','menu-format','menu-explain',
     'menu-connect','menu-export-excel','menu-export-csv'].forEach(e => {
      ipcRenderer.on(e, () => cb(e));
    });
  },
  platform: process.platform
});
