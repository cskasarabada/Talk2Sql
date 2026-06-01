# Talk2Sql 🔮
> Personal Oracle Fusion Explorer — by Chandra Kasarabada

Query Oracle Fusion Cloud with SQL or plain English. Free. No license fees. Runs locally.

## Quick Start
```bash
npm install
npm start
```

## Build
```bash
npm run build:mac   # Mac DMG (arm64 + x64)
npm run build:win   # Windows installer + portable
npm run build:all   # Both
```
Releases are built by GitHub Actions on a version tag (`git tag v2.0.0 && git push origin v2.0.0`) — the `.dmg` and `.exe` are attached to the GitHub Release automatically.

## Installing a release
The installers are unsigned, so macOS and Windows show a one-time security warning on first launch. This is expected — see **[INSTALL.md](INSTALL.md)** for the quick bypass (macOS "damaged / move to Trash" and Windows Defender SmartScreen). The macOS `Fix-macOS-Open.command` helper is attached to each release.

## Modules
CX Sales · TCA · Finance (GL/AP/AR) · HCM · SCM · Projects

## Features
- 🗣️ Plain English → SQL via Claude AI
- 📋 35 Oracle tables, 700+ columns from docs.oracle.com
- ▶️ Run queries via Oracle Fusion REST API
- 📊 Sortable grid, click row for full detail
- 📥 Export Excel / CSV / JSON
- 💾 Save named queries · Auto-reconnect credentials
