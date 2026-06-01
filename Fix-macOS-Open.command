#!/bin/bash
# Talk2Sql — macOS "damaged / can't be opened" fix.
# Double-click this file (Finder → Open) to clear the quarantine flag that
# macOS puts on unsigned apps downloaded from the internet.

APP="/Applications/Talk2Sql.app"

echo "Talk2Sql — macOS open fix"
echo "-------------------------"

if [ ! -d "$APP" ]; then
  echo "Talk2Sql is not in /Applications yet."
  echo "Open the .dmg and drag Talk2Sql into Applications first, then run this again."
  echo
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
fi

echo "Clearing quarantine flag on $APP ..."
xattr -dr com.apple.quarantine "$APP" 2>/dev/null

# Ad-hoc re-sign as a fallback so the app is allowed to launch on Apple Silicon.
codesign --force --deep --sign - "$APP" 2>/dev/null

echo "Done. You can now open Talk2Sql from Applications or Launchpad."
echo
read -n 1 -s -r -p "Press any key to close..."
