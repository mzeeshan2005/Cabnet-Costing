# Cabinet Costing — Architecture

## Overview

Desktop Electron app for cabinet manufacturing cost estimation, quotations, and invoices.

| Attribute | Value |
|-----------|-------|
| Name | CabinetCosting |
| Author | Faizan Ali |
| Runtime | Electron 40 + Node 24.x |
| Database | SQLite via better-sqlite3 — single file `cabinet_costing.db` |
| Frontend | HTML + jQuery + Bootstrap 4 |
| PDF | jsPDF + html2pdf.js |
| Excel | SheetJS (xlsx) + adm-zip |
| Build | electron-builder → portable .exe |

---

## Architecture Diagram

```
Renderer Process                    Main Process
┌─────────────────────────┐         ┌──────────────────────────────┐
│  HTML Screens + Scripts  │         │  index.js                    │
│                          │ IPC     │  ├─ IPC handlers             │
│  file_manager.js (cache) │◄──────►│  ├─ storage.js (SQLite)      │
│  ┌─────────────────────┐ │         │  ├─ Excel auto-sync          │
│  │ pricing.js (engine) │ │         │  └─ Window management        │
│  │ report.js (PDF)     │ │         └──────────────────────────────┘
│  │ registration.js     │ │                        │
│  │ tool scripts (7)    │ │                 ┌──────┴──────┐
│  └─────────────────────┘ │                 │  SQLite DB  │
└─────────────────────────┘                 │  (userData)  │
                                            └─────────────┘
```

---

## Data Flow

1. **Renderer** calls `file_manager.loadFile(path)` or `.writeFile(path, data)`
2. **file_manager.js** sends IPC `store:rpc` message
3. **index.js** routes to **storage.js** based on `action`
4. **storage.js** maps `.json` virtual paths → SQLite tables
5. Result returned as JSON via `store:rpc:reply`

---

## App Lifecycle

```
app.on("ready")
  ├─ storage.initializeDatabase()      → Open/create SQLite
  ├─ exportToolsExcel()                → Generate Tools_Data.xlsx
  └─ createWindow("screens/login.html")
       └─ Login → openWindow("screens/index.html")
            └─ Navigation via <a href> or IPC
```

---

## Key Files

| File | Role |
|------|------|
| `index.js` | Main process entry, IPC handlers, window mgmt |
| `src/main/storage.js` | Full SQLite storage layer (2239 lines) |
| `src/scripts/file_manager.js` | Renderer-side IPC bridge + in-memory cache |
| `src/scripts/pricing.js` | Pricing engine (2968 lines) — core business logic |
| `src/scripts/report.js` | Date-range report + PDF export |
| `src/scripts/login.js` | Auth against credentials table |
| `src/scripts/registration.js` | Client CRUD |
| `src/scripts/new_clients.js` | Add new clients |
| `src/scripts/{utility,type,code,door-panel,hardware,handler,adjustable_shelve}.js` | Tool CRUD scripts |

---

## Screens

| Screen | Script | Purpose |
|--------|--------|---------|
| `login.html` | `login.js` | Password auth |
| `index.html` | inline | Dashboard hub |
| `pricing.html` | `pricing.js` | Build quotations/invoices |
| `new_clients.html` | `new_clients.js` | Add clients |
| `registration.html` | `registration.js` | Manage clients |
| `tools/utility.html` | `utility.js` | CRUD utilities |
| `tools/type.html` | `type.js` | CRUD types |
| `tools/code.html` | `code.js` | CRUD codes |
| `tools/door-panel.html` | `door-panel.js` | CRUD finishing |
| `tools/hardware.html` | `hardware.js` | CRUD hardware |
| `tools/handler.html` | `handler.js` | CRUD handles |
| `tools/adjustable-shelve.html` | `adjustable_shelve.js` | CRUD shelves |
| `settings/firm-information.html` | `firm_information.js` | Company profile |
| `settings/password-change.html` | `password_change.js` | Change login password |
| `settings/price-change.html` | `price_change.js` | Update global rates |
| `settings/price-change1.html` | `price_change1.js` | Bulk item rates |
| `settings/report.html` | `report.js` | Sales report + PDF |

---

## Authentication

Two passwords stored in `credentials` table (defaults: `"123"`, `"1"`):

| Password | Used For |
|----------|----------|
| Login password | Sign-in, saving data, reports |
| Primary password | Tools menu, settings, bulk price updates |

---

## Catalog Hierarchy

```
Utilities (e.g. "Kitchen", "Wardrobe")
  └── Types/Descriptions (e.g. "Wall Cabinet", "Base Unit")
        ├── Codes (box sheet, back area, edging, screws, wall bracket)
        ├── Doors/Finishing (panel area, edging)
        ├── Hardwares (hinges, sliders, lift, locks, handles, hanger pipe)
        ├── Handlers (quantity/rate)
        └── Shelves (area, pin, edging)
```

---

## Database Location

- **Packaged (portable):** `{exeDir}/data/cabinet_costing.db`
- **Dev:** `{userData}/cabinet_costing.db`

Backup: `{dbPath}.bak`
