# Build & Deploy

## Setup

```bash
npm install
```

Requires Node 24.x and npm 10.x.

---

## Development

```bash
npm start
```

Launches the app with `--no-sandbox`. Linux-specific flags in the start script handle Wayland/X11 compatibility.

### Quick Data Reset

Delete the database file:
```bash
rm ~/.config/cabinet_costing/cabinet_costing.db   # Linux dev
rm ~/Library/Application\ Support/cabinet_costing/cabinet_costing.db  # macOS
# Or wherever your userData points
```

Or use:
```bash
npm run db:backup    # Backup current DB
npm run db:restore   # Restore from backup
```

---

## Rebuild Native Modules

After `npm install` or Electron version changes:

```bash
npm run rebuild
```

This runs `@electron/rebuild` to compile `better-sqlite3` against the correct Electron ABI.

---

## Build Windows Portable

```bash
npm run build:win
```

Uses `electron-builder` to produce a portable `.exe` in `release/`.

### Build Output

- `release/CabinetCosting Setup x.x.x.exe` — installer (if configured)
- `release/CabinetCosting x.x.x.exe` — portable

### Build Configuration (`package.json`)

```json
{
  "build": {
    "appId": "com.cabinetcosting.app",
    "productName": "CabinetCosting",
    "directories": { "output": "release" },
    "win": {
      "icon": "src/images/icon/favicon.ico",
      "target": [{ "target": "portable", "arch": ["x64"] }]
    },
    "files": [
      "**/*",
      "!src/db/.*.json",      # Exclude legacy JSON from package
      "!src/db/.*.json.bak"
    ],
    "asarUnpack": ["**/*.node"],  # Native addons must be unpacked
    "asar": true
  }
}
```

### After Pack Script

`scripts/after-pack.js` runs post-build to clean up the packaged output.

---

## Packaging with electron-packager (alt)

```bash
npm run pack:win
```

Uses `@electron/packager` for an alternative packaging approach.

---

## Data Locations

| Mode | DB Path |
|---|---|
| Dev | `{userData}/cabinet_costing.db` |
| Packaged (portable) | `{exeDir}/data/cabinet_costing.db` |
| Backup | `{dbPath}.bak` |
| Excel export | `{exeDir}/data/Tools_Data.xlsx` (packaged) or project root (dev) |
| Seed DB | `{resources}/seed/cabinet_costing.db.bak` (packaged) |

---

## Database Utilities

```bash
npm run seed:db       # Seed from bundled backup (first-run for packaged builds)
npm run db:backup     # CLI backup helper
npm run db:restore    # CLI restore helper
```

---

## CI Notes

- Native modules (`better-sqlite3`) must be rebuilt for the target Electron version
- Build machine must match target OS/arch (cross-compilation not supported for native addons)
- `*.db`, `*.db-wal`, `*.db-shm`, `*.bak` should be gitignored
