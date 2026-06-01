# Installing Talk2Sql

Talk2Sql is distributed **unsigned** (no paid code-signing certificate), so the first time you open it your operating system will show a security warning. This is expected for personal/internal apps and does **not** mean the file is unsafe. Below is how to get past it on each platform.

---

## macOS — "Talk2Sql is damaged and can't be opened. You should move it to the Trash."

This message appears on Apple Silicon (M1/M2/M3) Macs because the `.dmg` was downloaded from the internet and macOS applies a *quarantine* flag to unsigned apps. The app is fine — you just need to clear that flag.

### Step 1 — Install normally
1. Open the `.dmg` (e.g. `Talk2Sql-2.0.1-arm64.dmg`).
2. Drag **Talk2Sql** into your **Applications** folder.
3. Eject the `.dmg`.

### Step 2 — Clear the quarantine flag (the reliable fix)
Open **Terminal** (Applications → Utilities → Terminal) and run:

```bash
xattr -dr com.apple.quarantine "/Applications/Talk2Sql.app"
```

Then open Talk2Sql normally from Applications or Launchpad. You only do this once per install.

> Prefer not to use Terminal? Double-click the **`Fix-macOS-Open.command`** helper included with the release — it runs the exact command above for you.

### Alternative — Right-click → Open
If you only see "unidentified developer" (not "damaged"), you can instead:
1. Right-click (or Control-click) **Talk2Sql** in Applications → **Open**.
2. Click **Open** in the dialog.
3. Or go to **System Settings → Privacy & Security**, scroll down, and click **Open Anyway**.

---

## Windows — "Windows protected your PC" (Microsoft Defender SmartScreen)

SmartScreen warns about installers it hasn't seen signed by a known publisher. To proceed:

1. When the blue **"Windows protected your PC"** box appears, click **More info**.
2. Click the **Run anyway** button that appears.
3. Continue through the Talk2Sql setup (`Talk2Sql.Setup.2.0.1.exe`).

### If Defender Antivirus quarantines the file
Occasionally Defender's real-time scan may flag a brand-new unsigned `.exe`. If the installer disappears or is blocked:

1. Open **Windows Security → Virus & threat protection → Protection history**.
2. Find the Talk2Sql item and choose **Allow / Restore**.
3. Re-run the installer.

You can also add the download folder to **Exclusions** under *Virus & threat protection → Manage settings → Exclusions* before downloading.

---

## Why this happens (and how to remove the warnings permanently)

The warnings are tied to **code signing**, not to anything wrong with the build:

- **macOS** clears the warning permanently only when the app is signed with an **Apple Developer ID** certificate **and notarized** by Apple.
- **Windows** SmartScreen clears the warning when the `.exe` is signed with a **code-signing certificate** (an EV certificate earns trust immediately; an OV certificate earns it over time as more users install).

If you later want to eliminate the warnings, both can be wired into the GitHub Actions release workflow using certificate secrets — no change to the app code is required.
