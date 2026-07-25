# Database — SQLite Schema & JSON Mapping

## Database

Single SQLite file: `cabinet_costing.db`. Created/opened by `storage.js:getDb()`.

### Pragmas

```sql
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;
```

---

## Tables

### `meta`
Key-value store for app metadata (migration flags, etc.).

```sql
CREATE TABLE meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

### `json_store`
Generic JSON storage for files not individually migrated.

```sql
CREATE TABLE json_store (
  key TEXT PRIMARY KEY,
  payload_json TEXT NOT NULL
);
```

### `credentials`
Single-row table (id must be 1). Default password = "123", primary = "1".

```sql
CREATE TABLE credentials (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  password TEXT NOT NULL,
  primary_password TEXT NOT NULL
);
```

### `clients`

```sql
CREATE TABLE clients (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  cnic TEXT,
  contact TEXT,
  email TEXT,
  ntn TEXT,
  city TEXT,
  address TEXT
);
```

### `pricings`
Full quotation/invoice records. The `payload_json` holds the complete nested data (items per elevation + pinfo).

```sql
CREATE TABLE pricings (
  id TEXT PRIMARY KEY,
  pricing_no TEXT,
  entry_date TEXT,
  manual_no TEXT,
  client TEXT,
  client_name TEXT,
  product_type TEXT,
  sales_rp TEXT,
  carcass TEXT,
  category TEXT,
  is_quotation INTEGER,
  gross_amount REAL,
  discount REAL,
  tax REAL,
  calculated_tax REAL,
  net REAL,
  payload_json TEXT NOT NULL
);

CREATE INDEX idx_pricings_entry_date ON pricings(entry_date);
CREATE INDEX idx_pricings_client ON pricings(client);
```

### `utilities` → `types` → `codes` (hierarchy)

```sql
CREATE TABLE utilities (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL UNIQUE
);

CREATE TABLE types (
  id INTEGER PRIMARY KEY,
  utility_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  FOREIGN KEY(utility_id) REFERENCES utilities(id) ON DELETE CASCADE
);

CREATE TABLE codes (
  id INTEGER PRIMARY KEY,
  type_id INTEGER NOT NULL,
  utility_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  rate REAL NOT NULL,
  back_area REAL NOT NULL,
  edging REAL NOT NULL,
  screws REAL NOT NULL,
  secondary_top REAL NOT NULL,
  wall_bracket REAL NOT NULL DEFAULT 0,
  FOREIGN KEY(type_id) REFERENCES types(id) ON DELETE CASCADE,
  FOREIGN KEY(utility_id) REFERENCES utilities(id) ON DELETE CASCADE
);
```

### `global_rates`
Key-value rate configuration for pricing calculations.

```sql
CREATE TABLE global_rates (
  rate_key TEXT PRIMARY KEY,
  rate_value TEXT NOT NULL
);
```

### `doors`

```sql
CREATE TABLE doors (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  rate REAL NOT NULL,
  edging REAL NOT NULL,
  utility_id INTEGER,
  type_id INTEGER,
  code_id INTEGER
);
```

### `hardwares`

```sql
CREATE TABLE hardwares (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  rate REAL NOT NULL,
  slider REAL NOT NULL,
  lift REAL NOT NULL,
  hanger_pipe REAL NOT NULL DEFAULT 0,
  hanger_pipe_fitting REAL NOT NULL DEFAULT 0,
  locks REAL NOT NULL DEFAULT 0,
  drawer_handles REAL NOT NULL DEFAULT 0,
  utility_id INTEGER,
  type_id INTEGER,
  code_id INTEGER
);
```

### `handlers`

```sql
CREATE TABLE handlers (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  rate REAL NOT NULL,
  utility_id INTEGER,
  type_id INTEGER,
  code_id INTEGER
);
```

### `shelves`

```sql
CREATE TABLE shelves (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  rate REAL NOT NULL,
  pin REAL NOT NULL,
  edging REAL NOT NULL,
  utility_id INTEGER,
  type_id INTEGER,
  code_id INTEGER
);
```

### `system_config`
Single-row table (id must be 1).

```sql
CREATE TABLE system_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  master_excel_path TEXT,
  profit_margin_percentage REAL DEFAULT 0.0
);
```

---

## JSON → SQLite Mapping

| Virtual JSON Path | SQLite Table | Notes |
|---|---|---|
| `.credentials.json` | `credentials` | Login + primary passwords |
| `.clients.json` | `clients` | Full sync (insert/update/delete) |
| `.pricings.json` | `pricings` | Full payload in `payload_json` column |
| `.utilities.json` | `utilities` | Full sync + cascade delete check |
| `.types.json` | `types` | Full sync |
| `.codes.json` | `codes` | Full sync |
| `.rates.json` | `global_rates` | Key-value map |
| `.doors.json` | `doors` | Full sync |
| `.hardwares.json` | `hardwares` | Full sync |
| `.handlers.json` | `handlers` | Full sync |
| `.shelves.json` | `shelves` | Full sync |
| Other `.json` files | `json_store` / direct file | Generic JSON |

---

## Write Strategy

Each write to a mapped JSON path triggers:

1. **Transaction** with delete-missing + insert/update
2. **Auto-sync** `Tools_Data.xlsx` (debounced 1.5s)
3. **Cache invalidation** in renderer's `file_manager.js`

---

## Backup & Restore

```js
backupDatabase(outPath)   // WAL checkpoint + fs.copyFileSync
restoreDatabase(inPath)   // Validates SQLite header → close → copy → reopen
```

Default backup: `{dbPath}.bak`
Seed backup for packaged builds: `{resources}/seed/cabinet_costing.db.bak`
