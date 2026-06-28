# Migration Strategy & Implementation Plan: JSON to SQLite
**Project:** Cabinet Costing (`cabinet_costing`)
**Target Architecture:** Electron v4 + `better-sqlite3` (embedded SQLite)

---

## 1. Executive Summary & Objective

The current architecture of the \*\*Cabinet Costing\*\* desktop application relies on flat, minified JSON files stored within the \`src/db/\` directory for data persistence. While lightweight and highly portable, this mechanism introduces significant long-term performance bottlenecks, risky asynchronous race conditions (potential file corruption), and zero query optimization capabilities as the application scales to thousands of entries (e.g., 20+ tables, 50,000+ rows per table).

The objective of this strategy is to migrate the data layer completely to a local, serverless **SQLite database** using the `better-sqlite3` driver while meeting the client requirement: the delivered build must **run immediately** without the client installing Node.js, npm packages, or any other dependencies. All runtime dependencies (including the native SQLite binding) ship inside the packaged Electron app.

---

## 2. Target Architectural Design

### 2.1 The Embedded Topology
Unlike client-server database architectures (MySQL, PostgreSQL), SQLite lives inside the application runtime and persists into a single file on the client machine.

**Important:** the database file must NOT live inside `src/` or the packaged app folder because those locations are commonly read-only in production builds.  
Store the database under Electron’s per-user data folder:

`app.getPath('userData')/cabinet_costing.db`

+-------------------------------------------------------------+
| Electron App Shell                                           |
|                                                             |
| +------------------+   +--------------------+               |
| | Renderer Window  |   | Renderer Window    |               |
| | (Pricing UI)     |   | (Registration)     |               |
| +--------+---------+   +---------+----------+               |
|          |                       |                          |
|          v                       v                          |
|     ipcRenderer.invoke(...)  ipcRenderer.invoke(...)         |
|                     |                                       |
|                     v                                       |
|          +-------------------------------+                  |
|          | Main Process (ipcMain)        |                  |
|          | db.js (better-sqlite3)        |                  |
|          +---------------+---------------+                  |
|                          |                                  |
+--------------------------|----------------------------------+
                           | (Native binding inside app)
                           v
                 +-----------------------+
                 | cabinet_costing.db    |  <-- stored in userData
                 +-----------------------+

### 2.2 Performance Optimizations for Scale
To support large tables (~50,000 rows each) without lagging the Electron interface, the following configurations will be embedded upon initialization:
1. **Write-Ahead Logging (WAL Mode):** Enables concurrent readers and reduces lock contention.
2. **Synchronous NORMAL:** Reduces disk commit blocking while remaining safe for desktop usage.
3. **Foreign Keys ON:** Ensures relational constraints are enforced (`PRAGMA foreign_keys = ON`).
4. **Busy Timeout:** Reduces transient “database is locked” errors (`PRAGMA busy_timeout = 5000`).

### 2.3 Zero-Install Delivery (Client Requirement)
Client will receive a packaged build and should be able to run it immediately:
- No `npm install` or rebuild steps on the client machine.
- All runtime dependencies ship inside the packaged Electron app (including `better-sqlite3`).
- Builds must be produced per target OS/architecture (native modules must match the target platform).

---

## 3. Relational Schema Mapping (Target Model)

The table structures consolidate the scattered single-line JSON array entities into a structured relational schema:

```sql
-- 1. Administrative Security Credentials (store salted hashes, not plaintext)
CREATE TABLE IF NOT EXISTS credentials (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    password_hash TEXT NOT NULL,
    primary_password_hash TEXT NOT NULL
);

-- 2. Client Management Table
CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    cnic TEXT,
    contact TEXT,
    address TEXT
);

-- 3. Core Quotation / Invoice Table
CREATE TABLE IF NOT EXISTS pricings (
    id TEXT PRIMARY KEY,               -- Maps to current unique timestamp string IDs
    pricing_no TEXT NOT NULL,
    entry_date TEXT NOT NULL,
    manual_no TEXT,
    client_id INTEGER,
    product_type TEXT,
    sales_rp TEXT,
    carcass TEXT,
    category TEXT,
    is_quotation INTEGER NOT NULL CHECK (is_quotation IN (0, 1)),
    gross_amount REAL NOT NULL DEFAULT 0.0,
    discount REAL NOT NULL DEFAULT 0.0,
    tax REAL NOT NULL DEFAULT 0.0,
    net REAL NOT NULL DEFAULT 0.0,
    elevation_data TEXT,
    FOREIGN KEY(client_id) REFERENCES clients(id) ON DELETE RESTRICT
);

-- 4. Catalog Structural Hierarchy
CREATE TABLE IF NOT EXISTS utilities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    utility_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    FOREIGN KEY(utility_id) REFERENCES utilities(id) ON DELETE CASCADE,
    UNIQUE(utility_id, title)
);

CREATE TABLE IF NOT EXISTS codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type_id INTEGER NOT NULL,
    utility_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    rate REAL NOT NULL,
    back_area REAL NOT NULL,
    edging REAL NOT NULL,
    screws REAL NOT NULL,
    secondary_top REAL NOT NULL,
    FOREIGN KEY(type_id) REFERENCES types(id) ON DELETE CASCADE,
    FOREIGN KEY(utility_id) REFERENCES utilities(id) ON DELETE CASCADE,
    UNIQUE(type_id, title)
);

-- 5. Multipliers Matrix
CREATE TABLE IF NOT EXISTS global_rates (
    rate_key TEXT PRIMARY KEY,
    rate_value REAL NOT NULL
);
```

Recommended indexes (create after tables):

```sql
CREATE INDEX IF NOT EXISTS idx_pricings_entry_date ON pricings(entry_date);
CREATE INDEX IF NOT EXISTS idx_pricings_client_id ON pricings(client_id);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
```

## 4. Phase-by-Phase Implementation Blueprint

### Phase 1: Build & Packaging (Developer / CI only)
Goal: client receives a build that runs immediately (no installation steps).

1. Add `better-sqlite3` as an application dependency, pinned to a version compatible with Electron v4 / Node 10.x.
2. Add `electron-rebuild` as a dev dependency.
3. In the build pipeline:
   - Install dependencies on the build machine (not on client machines).
   - Rebuild `better-sqlite3` against the Electron v4 headers.
   - Package the app. Ensure the native `.node` file is unpacked if using ASAR (native addons generally must be in `app.asar.unpacked`).
4. Keep DB artifacts out of git:
   - `*.db`
   - `*.db-wal`
   - `*.db-shm`

### Phase 2: Database Initialization & Access (Main Process)
1. Create a main-process DB module that:
   - Opens the database at `app.getPath('userData')/cabinet_costing.db`
   - Runs `PRAGMA journal_mode=WAL`, `synchronous=NORMAL`, `foreign_keys=ON`, `busy_timeout=5000`
   - Creates tables and indexes (idempotent `CREATE TABLE IF NOT EXISTS`)
2. Expose a small IPC API (e.g., `ipcMain.handle(...)`) for specific operations rather than allowing arbitrary SQL from renderers.

### Phase 3: One-Time Migration from Legacy JSON
1. On first run, detect legacy JSON files from previous versions (candidate directories) and import in a single transaction.
2. Only archive JSON files after the transaction commits successfully.
3. Record a migration flag/version in a `meta` table so migration is idempotent and won’t re-run.

### Phase 4: UI Screen & Logic Refactoring
1. Replace JSON `loadFile`/`writeFile` usage with IPC calls to the main DB module.
2. Update authentication flow to validate hashes (not plaintext).

## 5. Potential Bottlenecks & Operational Risks
1. **UI Freezes from Slow Queries**
   - *Risk:* SQLite calls are synchronous; large table scans can freeze windows.
   - *Mitigation:* Add indexes for all frequently-filtered fields; keep renderer calls small; move heavy reporting to a worker/child process if needed.
2. **Native Module Mismatch (Zero-Install Risk)**
   - *Risk:* If `better-sqlite3` is not rebuilt for Electron v4 and the target platform, the client build will fail to launch.
   - *Mitigation:* Build per OS/architecture; pin a compatible `better-sqlite3` version; run `electron-rebuild` in CI/build scripts; package with `.node` unpacked if using ASAR.
3. **Wrong Data Location / Permissions**
   - *Risk:* Storing DB under `src/` or inside packaged resources can become read-only.
   - *Mitigation:* Always store DB in `app.getPath('userData')` and migrate legacy JSON once.
