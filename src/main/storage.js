const fs = require("fs");
const path = require("path");
const { app } = require("electron");

let Database;
let db;
let dbUnavailable = false;

const SQLITE_TARGET_BASENAMES = new Set([
  ".credentials.json",
  ".clients.json",
  ".pricings.json",
  ".utilities.json",
  ".types.json",
  ".codes.json",
  ".rates.json",
  ".doors.json",
  ".hardwares.json",
  ".handlers.json",
  ".shelves.json",
  ".elevations.json",
  ".category.json",
  ".carcass.json",
  ".products.json",
  ".sales.json",
  ".manuals.json",
  ".firm.json",
  "terms.json",
]);

function ensureDir(dirPath) {
  try {
    fs.mkdirSync(dirPath, { recursive: true });
  } catch (e) {
    return;
  }
}

function getDbPath() {
  if (app && app.isPackaged) {
    const exeDir = path.dirname(process.execPath);
    const dataDir = path.join(exeDir, "data");
    ensureDir(dataDir);
    return path.join(dataDir, "cabinet_costing.db");
  }

  return path.join(app.getPath("userData"), "cabinet_costing.db");
}

function getDb() {
  if (db) return db;
  if (dbUnavailable) return null;

  if (!Database) {
    try {
      Database = require("better-sqlite3");
    } catch (e) {
      console.error("SQLite disabled: failed to load better-sqlite3:", e && e.message ? e.message : e);
      dbUnavailable = true;
      return null;
    }
  }

  const dbPath = getDbPath();
  try {
    db = new Database(dbPath);
  } catch (e) {
    console.error("SQLite disabled: failed to open database:", e && e.message ? e.message : e);
    dbUnavailable = true;
    return null;
  }

  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");

  initSchema(db);
  return db;
}

function initSchema(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS json_store (
      key TEXT PRIMARY KEY,
      payload_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS credentials (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      password TEXT NOT NULL,
      primary_password TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      cnic TEXT,
      contact TEXT,
      email TEXT,
      ntn TEXT,
      city TEXT,
      address TEXT
    );

    CREATE TABLE IF NOT EXISTS pricings (
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

    CREATE INDEX IF NOT EXISTS idx_pricings_entry_date ON pricings(entry_date);
    CREATE INDEX IF NOT EXISTS idx_pricings_client ON pricings(client);

    CREATE TABLE IF NOT EXISTS utilities (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS types (
      id INTEGER PRIMARY KEY,
      utility_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      FOREIGN KEY(utility_id) REFERENCES utilities(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS codes (
      id INTEGER PRIMARY KEY,
      type_id INTEGER NOT NULL,
      utility_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      rate REAL NOT NULL,
      back_area REAL NOT NULL,
      edging REAL NOT NULL,
      screws REAL NOT NULL,
      secondary_top REAL NOT NULL,
      FOREIGN KEY(type_id) REFERENCES types(id) ON DELETE CASCADE,
      FOREIGN KEY(utility_id) REFERENCES utilities(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS global_rates (
      rate_key TEXT PRIMARY KEY,
      rate_value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_codes_title ON codes(title);
    CREATE INDEX IF NOT EXISTS idx_codes_utility_id ON codes(utility_id);
    CREATE INDEX IF NOT EXISTS idx_codes_type_id ON codes(type_id);

    CREATE TABLE IF NOT EXISTS doors (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      rate REAL NOT NULL,
      edging REAL NOT NULL,
      utility_id INTEGER,
      type_id INTEGER,
      code_id INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_doors_title ON doors(title);
    CREATE INDEX IF NOT EXISTS idx_doors_utility_id ON doors(utility_id);
    CREATE INDEX IF NOT EXISTS idx_doors_type_id ON doors(type_id);
    CREATE INDEX IF NOT EXISTS idx_doors_code_id ON doors(code_id);

    CREATE TABLE IF NOT EXISTS hardwares (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      rate REAL NOT NULL,
      slider REAL NOT NULL,
      lift REAL NOT NULL,
      utility_id INTEGER,
      type_id INTEGER,
      code_id INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_hardwares_title ON hardwares(title);
    CREATE INDEX IF NOT EXISTS idx_hardwares_utility_id ON hardwares(utility_id);
    CREATE INDEX IF NOT EXISTS idx_hardwares_type_id ON hardwares(type_id);
    CREATE INDEX IF NOT EXISTS idx_hardwares_code_id ON hardwares(code_id);

    CREATE TABLE IF NOT EXISTS handlers (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      rate REAL NOT NULL,
      utility_id INTEGER,
      type_id INTEGER,
      code_id INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_handlers_title ON handlers(title);
    CREATE INDEX IF NOT EXISTS idx_handlers_utility_id ON handlers(utility_id);
    CREATE INDEX IF NOT EXISTS idx_handlers_type_id ON handlers(type_id);
    CREATE INDEX IF NOT EXISTS idx_handlers_code_id ON handlers(code_id);

    CREATE TABLE IF NOT EXISTS shelves (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      rate REAL NOT NULL,
      pin REAL NOT NULL,
      edging REAL NOT NULL,
      utility_id INTEGER,
      type_id INTEGER,
      code_id INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_shelves_title ON shelves(title);
    CREATE INDEX IF NOT EXISTS idx_shelves_utility_id ON shelves(utility_id);
    CREATE INDEX IF NOT EXISTS idx_shelves_type_id ON shelves(type_id);
    CREATE INDEX IF NOT EXISTS idx_shelves_code_id ON shelves(code_id);
  `);
}

function getMeta(database, key) {
  const row = database.prepare("SELECT value FROM meta WHERE key = ?").get(key);
  return row ? row.value : null;
}

function setMeta(database, key, value) {
  database
    .prepare("INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value")
    .run(key, value);
}

function safeReadJsonFile(filePath) {
  const targetPath = fs.existsSync(filePath) ? filePath : `${filePath}.bak`;
  const raw = fs.readFileSync(targetPath, { encoding: "utf8" });
  return JSON.parse(raw);
}

function safeArchiveLegacyFile(filePath) {
  try {
    if (filePath.includes(`${path.sep}src${path.sep}db${path.sep}`)) return;
    if (!fs.existsSync(filePath)) return;
    const bakPath = `${filePath}.bak`;
    if (fs.existsSync(bakPath)) return;
    fs.renameSync(filePath, bakPath);
  } catch (e) {
    return;
  }
}

function normalizeDbBasename(filePath) {
  const base = path.basename(filePath);
  return base.endsWith(".bak") ? base.slice(0, -4) : base;
}

function ensureMigratedForFile(database, filePath) {
  const base = normalizeDbBasename(filePath);
  if (!SQLITE_TARGET_BASENAMES.has(base)) return;

  const structuredV2 =
    base === ".doors.json" ||
    base === ".hardwares.json" ||
    base === ".handlers.json" ||
    base === ".shelves.json";
  const metaKey = structuredV2 ? `migrated2:${base}` : `migrated:${base}`;
  if (getMeta(database, metaKey) === "1") return;

  const resolvedPath = fs.existsSync(filePath) ? filePath : `${filePath}.bak`;
  if (!fs.existsSync(resolvedPath)) {
    setMeta(database, metaKey, "1");
    return;
  }

  const json = safeReadJsonFile(resolvedPath);

  const tx = database.transaction(() => {
    if (base === ".credentials.json") migrateCredentials(database, json);
    else if (base === ".clients.json") migrateClients(database, json);
    else if (base === ".pricings.json") migratePricings(database, json);
    else if (base === ".utilities.json") migrateUtilities(database, json);
    else if (base === ".types.json") migrateTypes(database, json);
    else if (base === ".codes.json") migrateCodes(database, json);
    else if (base === ".rates.json") migrateRates(database, json);
    else if (base === ".doors.json") migrateDoors(database, json);
    else if (base === ".hardwares.json") migrateHardwares(database, json);
    else if (base === ".handlers.json") migrateHandlers(database, json);
    else if (base === ".shelves.json") migrateShelves(database, json);
    else migrateGenericJson(database, base, json);
  });

  tx();
  setMeta(database, metaKey, "1");
  safeArchiveLegacyFile(resolvedPath);
}

function migrateGenericJson(database, base, json) {
  database
    .prepare(
      "INSERT INTO json_store (key, payload_json) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET payload_json=excluded.payload_json"
    )
    .run(base, JSON.stringify(json));
}

function migrateCredentials(database, json) {
  const password = json && json[0] && json[0].password ? String(json[0].password) : "";
  const primaryRaw =
    json && json[1]
      ? json[1].pass != null
        ? json[1].pass
        : json[1].primary_password
      : null;
  const primaryPassword = primaryRaw != null ? String(primaryRaw) : "";

  database
    .prepare("INSERT INTO credentials (id, password, primary_password) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET password=excluded.password, primary_password=excluded.primary_password")
    .run(password, primaryPassword);
}

function migrateClients(database, json) {
  const insert = database.prepare(`
    INSERT INTO clients (id, name, cnic, contact, email, ntn, city, address)
    VALUES (@id, @name, @cnic, @contact, @email, @ntn, @city, @address)
    ON CONFLICT(id) DO UPDATE SET
      name=excluded.name,
      cnic=excluded.cnic,
      contact=excluded.contact,
      email=excluded.email,
      ntn=excluded.ntn,
      city=excluded.city,
      address=excluded.address
  `);

  if (!Array.isArray(json)) return;
  for (const c of json) {
    insert.run({
      id: c && c.id != null ? Number(c.id) : null,
      name: c && c.name != null ? String(c.name) : "",
      cnic: c && c.cnic != null ? String(c.cnic) : "",
      contact: c && c.contact != null ? String(c.contact) : "",
      email: c && c.email != null ? String(c.email) : "",
      ntn: c && c.ntn != null ? String(c.ntn) : "",
      city: c && c.city != null ? String(c.city) : "",
      address: c && c.address != null ? String(c.address) : "",
    });
  }
}

function migratePricings(database, json) {
  const insert = database.prepare(`
    INSERT INTO pricings (
      id, pricing_no, entry_date, manual_no, client, client_name, product_type, sales_rp,
      carcass, category, is_quotation, gross_amount, discount, tax, calculated_tax, net, payload_json
    ) VALUES (
      @id, @pricing_no, @entry_date, @manual_no, @client, @client_name, @product_type, @sales_rp,
      @carcass, @category, @is_quotation, @gross_amount, @discount, @tax, @calculated_tax, @net, @payload_json
    )
    ON CONFLICT(id) DO UPDATE SET
      pricing_no=excluded.pricing_no,
      entry_date=excluded.entry_date,
      manual_no=excluded.manual_no,
      client=excluded.client,
      client_name=excluded.client_name,
      product_type=excluded.product_type,
      sales_rp=excluded.sales_rp,
      carcass=excluded.carcass,
      category=excluded.category,
      is_quotation=excluded.is_quotation,
      gross_amount=excluded.gross_amount,
      discount=excluded.discount,
      tax=excluded.tax,
      calculated_tax=excluded.calculated_tax,
      net=excluded.net,
      payload_json=excluded.payload_json
  `);

  if (!Array.isArray(json)) return;
  for (const p of json) {
    const pinfo = p && p.pinfo ? p.pinfo : {};
    const id = pinfo && pinfo.id != null ? String(pinfo.id) : null;
    if (!id) continue;
    insert.run({
      id,
      pricing_no: pinfo.pricing_no != null ? String(pinfo.pricing_no) : null,
      entry_date: pinfo.entry_date != null ? String(pinfo.entry_date) : null,
      manual_no: pinfo.manual_no != null ? String(pinfo.manual_no) : null,
      client: pinfo.client != null ? String(pinfo.client) : null,
      client_name: pinfo.client_name != null ? String(pinfo.client_name) : null,
      product_type: pinfo.product_type != null ? String(pinfo.product_type) : null,
      sales_rp: pinfo.sales_rp != null ? String(pinfo.sales_rp) : null,
      carcass: pinfo.carcass != null ? String(pinfo.carcass) : null,
      category: pinfo.category != null ? String(pinfo.category) : null,
      is_quotation: pinfo.is_quotation ? 1 : 0,
      gross_amount: pinfo.gross_amount != null ? Number(pinfo.gross_amount) : null,
      discount: pinfo.discount != null ? Number(pinfo.discount) : null,
      tax: pinfo.tax != null ? Number(pinfo.tax) : null,
      calculated_tax: pinfo.calculated_tax != null ? Number(pinfo.calculated_tax) : null,
      net: pinfo.net != null ? Number(pinfo.net) : null,
      payload_json: JSON.stringify(p),
    });
  }
}

function migrateUtilities(database, json) {
  const insert = database.prepare(`
    INSERT INTO utilities (id, title)
    VALUES (@id, @title)
    ON CONFLICT(id) DO UPDATE SET title=excluded.title
  `);

  if (!Array.isArray(json)) return;
  for (const u of json) {
    insert.run({
      id: u && u.id != null ? Number(u.id) : null,
      title: u && u.title != null ? String(u.title) : "",
    });
  }
}

function migrateTypes(database, json) {
  const insert = database.prepare(`
    INSERT INTO types (id, utility_id, title)
    VALUES (@id, @utility_id, @title)
    ON CONFLICT(id) DO UPDATE SET utility_id=excluded.utility_id, title=excluded.title
  `);

  if (!Array.isArray(json)) return;
  for (const t of json) {
    insert.run({
      id: t && t.id != null ? Number(t.id) : null,
      utility_id: t && t.utility_id != null ? Number(t.utility_id) : null,
      title: t && t.title != null ? String(t.title) : "",
    });
  }
}

function migrateCodes(database, json) {
  const insert = database.prepare(`
    INSERT INTO codes (id, type_id, utility_id, title, rate, back_area, edging, screws, secondary_top)
    VALUES (@id, @type_id, @utility_id, @title, @rate, @back_area, @edging, @screws, @secondary_top)
    ON CONFLICT(id) DO UPDATE SET
      type_id=excluded.type_id,
      utility_id=excluded.utility_id,
      title=excluded.title,
      rate=excluded.rate,
      back_area=excluded.back_area,
      edging=excluded.edging,
      screws=excluded.screws,
      secondary_top=excluded.secondary_top
  `);

  if (!Array.isArray(json)) return;
  for (const c of json) {
    insert.run({
      id: c && c.id != null ? Number(c.id) : null,
      type_id: c && c.type_id != null ? Number(c.type_id) : null,
      utility_id: c && c.utility_id != null ? Number(c.utility_id) : null,
      title: c && c.title != null ? String(c.title) : "",
      rate: c && c.rate != null ? Number(c.rate) : 0,
      back_area: c && c.back_area != null ? Number(c.back_area) : 0,
      edging: c && c.edging != null ? Number(c.edging) : 0,
      screws: c && c.screws != null ? Number(c.screws) : 0,
      secondary_top: c && c.secondary_top != null ? Number(c.secondary_top) : 0,
    });
  }
}

function migrateRates(database, json) {
  const insert = database.prepare(`
    INSERT INTO global_rates (rate_key, rate_value)
    VALUES (@rate_key, @rate_value)
    ON CONFLICT(rate_key) DO UPDATE SET rate_value=excluded.rate_value
  `);

  if (!json || typeof json !== "object" || Array.isArray(json)) return;
  for (const [key, value] of Object.entries(json)) {
    insert.run({ rate_key: key, rate_value: String(value) });
  }
}

function migrateDoors(database, json) {
  const insert = database.prepare(`
    INSERT INTO doors (id, title, rate, edging, utility_id, type_id, code_id)
    VALUES (@id, @title, @rate, @edging, @utility_id, @type_id, @code_id)
    ON CONFLICT(id) DO UPDATE SET
      title=excluded.title,
      rate=excluded.rate,
      edging=excluded.edging,
      utility_id=excluded.utility_id,
      type_id=excluded.type_id,
      code_id=excluded.code_id
  `);

  if (!Array.isArray(json)) return;
  for (const d of json) {
    insert.run({
      id: d && d.id != null ? Number(d.id) : null,
      title: d && d.title != null ? String(d.title) : "",
      rate: d && d.rate != null ? Number(d.rate) : 0,
      edging: d && d.edging != null ? Number(d.edging) : 0,
      utility_id: d && d.utility_id != null ? Number(d.utility_id) : null,
      type_id: d && d.type_id != null ? Number(d.type_id) : null,
      code_id: d && d.code_id != null ? Number(d.code_id) : null,
    });
  }
}

function migrateHardwares(database, json) {
  const insert = database.prepare(`
    INSERT INTO hardwares (id, title, rate, slider, lift, utility_id, type_id, code_id)
    VALUES (@id, @title, @rate, @slider, @lift, @utility_id, @type_id, @code_id)
    ON CONFLICT(id) DO UPDATE SET
      title=excluded.title,
      rate=excluded.rate,
      slider=excluded.slider,
      lift=excluded.lift,
      utility_id=excluded.utility_id,
      type_id=excluded.type_id,
      code_id=excluded.code_id
  `);

  if (!Array.isArray(json)) return;
  for (const h of json) {
    insert.run({
      id: h && h.id != null ? Number(h.id) : null,
      title: h && h.title != null ? String(h.title) : "",
      rate: h && h.rate != null ? Number(h.rate) : 0,
      slider: h && h.slider != null ? Number(h.slider) : 0,
      lift: h && h.lift != null ? Number(h.lift) : 0,
      utility_id: h && h.utility_id != null ? Number(h.utility_id) : null,
      type_id: h && h.type_id != null ? Number(h.type_id) : null,
      code_id: h && h.code_id != null ? Number(h.code_id) : null,
    });
  }
}

function migrateHandlers(database, json) {
  const insert = database.prepare(`
    INSERT INTO handlers (id, title, rate, utility_id, type_id, code_id)
    VALUES (@id, @title, @rate, @utility_id, @type_id, @code_id)
    ON CONFLICT(id) DO UPDATE SET
      title=excluded.title,
      rate=excluded.rate,
      utility_id=excluded.utility_id,
      type_id=excluded.type_id,
      code_id=excluded.code_id
  `);

  if (!Array.isArray(json)) return;
  for (const h of json) {
    insert.run({
      id: h && h.id != null ? Number(h.id) : null,
      title: h && h.title != null ? String(h.title) : "",
      rate: h && h.rate != null ? Number(h.rate) : 0,
      utility_id: h && h.utility_id != null ? Number(h.utility_id) : null,
      type_id: h && h.type_id != null ? Number(h.type_id) : null,
      code_id: h && h.code_id != null ? Number(h.code_id) : null,
    });
  }
}

function migrateShelves(database, json) {
  const insert = database.prepare(`
    INSERT INTO shelves (id, title, rate, pin, edging, utility_id, type_id, code_id)
    VALUES (@id, @title, @rate, @pin, @edging, @utility_id, @type_id, @code_id)
    ON CONFLICT(id) DO UPDATE SET
      title=excluded.title,
      rate=excluded.rate,
      pin=excluded.pin,
      edging=excluded.edging,
      utility_id=excluded.utility_id,
      type_id=excluded.type_id,
      code_id=excluded.code_id
  `);

  if (!Array.isArray(json)) return;
  for (const s of json) {
    insert.run({
      id: s && s.id != null ? Number(s.id) : null,
      title: s && s.title != null ? String(s.title) : "",
      rate: s && s.rate != null ? Number(s.rate) : 0,
      pin: s && s.pin != null ? Number(s.pin) : 0,
      edging: s && s.edging != null ? Number(s.edging) : 0,
      utility_id: s && s.utility_id != null ? Number(s.utility_id) : null,
      type_id: s && s.type_id != null ? Number(s.type_id) : null,
      code_id: s && s.code_id != null ? Number(s.code_id) : null,
    });
  }
}

function loadFromSqlite(database, base) {
  if (base === ".credentials.json") {
    const row = database.prepare("SELECT password, primary_password FROM credentials WHERE id = 1").get();
    return [{ password: row ? row.password : "" }, { pass: row ? row.primary_password : "" }];
  }

  if (base === ".clients.json") {
    return database
      .prepare("SELECT id, name, cnic, contact, email, ntn, city, address FROM clients ORDER BY id")
      .all()
      .map((r) => ({
        id: String(r.id),
        name: r.name != null ? r.name : "",
        cnic: r.cnic != null ? r.cnic : "",
        contact: r.contact != null ? r.contact : "",
        email: r.email != null ? r.email : "",
        ntn: r.ntn != null ? r.ntn : "",
        city: r.city != null ? r.city : "",
        address: r.address != null ? r.address : "",
      }));
  }

  if (base === ".pricings.json") {
    return database
      .prepare("SELECT payload_json FROM pricings ORDER BY CAST(pricing_no AS INTEGER) ASC, entry_date ASC")
      .all()
      .map((r) => JSON.parse(r.payload_json));
  }

  if (base === ".utilities.json") {
    return database
      .prepare("SELECT id, title FROM utilities ORDER BY id")
      .all()
      .map((r) => ({ id: String(r.id), title: r.title }));
  }

  if (base === ".types.json") {
    const rows = database
      .prepare(
        "SELECT t.id, t.title, t.utility_id, u.title AS utility FROM types t JOIN utilities u ON u.id = t.utility_id ORDER BY t.id"
      )
      .all();
    return rows.map((r) => ({
      id: String(r.id),
      title: r.title,
      utility_id: String(r.utility_id),
      utility: r.utility,
    }));
  }

  if (base === ".codes.json") {
    const rows = database
      .prepare(
        `SELECT c.id, c.title, c.rate, c.back_area, c.edging, c.screws, c.secondary_top,
                c.utility_id, u.title AS utility, c.type_id, t.title AS type
         FROM codes c
         JOIN utilities u ON u.id = c.utility_id
         JOIN types t ON t.id = c.type_id
         ORDER BY c.id`
      )
      .all();
    return rows.map((r) => ({
      id: String(r.id),
      title: r.title,
      rate: String(r.rate),
      back_area: String(r.back_area),
      edging: String(r.edging),
      screws: String(r.screws),
      secondary_top: String(r.secondary_top),
      utility_id: String(r.utility_id),
      utility: r.utility,
      type_id: String(r.type_id),
      type: r.type,
    }));
  }

  if (base === ".rates.json") {
    const rows = database.prepare("SELECT rate_key, rate_value FROM global_rates").all();
    const obj = {};
    for (const r of rows) obj[r.rate_key] = r.rate_value;
    return obj;
  }

  if (base === ".doors.json") {
    const rows = database
      .prepare(
        `SELECT d.id, d.title, d.rate, d.edging,
                d.utility_id, u.title AS utility,
                d.type_id, t.title AS type,
                d.code_id, c.title AS code
         FROM doors d
         LEFT JOIN utilities u ON u.id = d.utility_id
         LEFT JOIN types t ON t.id = d.type_id
         LEFT JOIN codes c ON c.id = d.code_id
         ORDER BY d.id`
      )
      .all();
    return rows.map((r) => ({
      id: String(r.id),
      title: r.title != null ? r.title : "",
      rate: String(r.rate),
      edging: String(r.edging),
      utility_id: r.utility_id != null ? String(r.utility_id) : "",
      utility: r.utility != null ? r.utility : "",
      type_id: r.type_id != null ? String(r.type_id) : "",
      type: r.type != null ? r.type : "",
      code_id: r.code_id != null ? String(r.code_id) : "",
      code: r.code != null ? r.code : "",
    }));
  }

  if (base === ".hardwares.json") {
    const rows = database
      .prepare(
        `SELECT h.id, h.title, h.rate, h.slider, h.lift,
                h.utility_id, u.title AS utility,
                h.type_id, t.title AS type,
                h.code_id, c.title AS code
         FROM hardwares h
         LEFT JOIN utilities u ON u.id = h.utility_id
         LEFT JOIN types t ON t.id = h.type_id
         LEFT JOIN codes c ON c.id = h.code_id
         ORDER BY h.id`
      )
      .all();
    return rows.map((r) => ({
      id: String(r.id),
      title: r.title != null ? r.title : "",
      rate: String(r.rate),
      slider: String(r.slider),
      lift: String(r.lift),
      utility_id: r.utility_id != null ? String(r.utility_id) : "",
      utility: r.utility != null ? r.utility : "",
      type_id: r.type_id != null ? String(r.type_id) : "",
      type: r.type != null ? r.type : "",
      code_id: r.code_id != null ? String(r.code_id) : "",
      code: r.code != null ? r.code : "",
    }));
  }

  if (base === ".handlers.json") {
    const rows = database
      .prepare(
        `SELECT h.id, h.title, h.rate,
                h.utility_id, u.title AS utility,
                h.type_id, t.title AS type,
                h.code_id, c.title AS code
         FROM handlers h
         LEFT JOIN utilities u ON u.id = h.utility_id
         LEFT JOIN types t ON t.id = h.type_id
         LEFT JOIN codes c ON c.id = h.code_id
         ORDER BY h.id`
      )
      .all();
    return rows.map((r) => ({
      id: String(r.id),
      title: r.title != null ? r.title : "",
      rate: String(r.rate),
      utility_id: r.utility_id != null ? String(r.utility_id) : "",
      utility: r.utility != null ? r.utility : "",
      type_id: r.type_id != null ? String(r.type_id) : "",
      type: r.type != null ? r.type : "",
      code_id: r.code_id != null ? String(r.code_id) : "",
      code: r.code != null ? r.code : "",
    }));
  }

  if (base === ".shelves.json") {
    const rows = database
      .prepare(
        `SELECT s.id, s.title, s.rate, s.pin, s.edging,
                s.utility_id, u.title AS utility,
                s.type_id, t.title AS type,
                s.code_id, c.title AS code
         FROM shelves s
         LEFT JOIN utilities u ON u.id = s.utility_id
         LEFT JOIN types t ON t.id = s.type_id
         LEFT JOIN codes c ON c.id = s.code_id
         ORDER BY s.id`
      )
      .all();
    return rows.map((r) => ({
      id: String(r.id),
      title: r.title != null ? r.title : "",
      rate: String(r.rate),
      pin: String(r.pin),
      edging: String(r.edging),
      utility_id: r.utility_id != null ? String(r.utility_id) : "",
      utility: r.utility != null ? r.utility : "",
      type_id: r.type_id != null ? String(r.type_id) : "",
      type: r.type != null ? r.type : "",
      code_id: r.code_id != null ? String(r.code_id) : "",
      code: r.code != null ? r.code : "",
    }));
  }

  const generic = database.prepare("SELECT payload_json FROM json_store WHERE key = ?").get(base);
  if (generic && generic.payload_json != null) {
    return JSON.parse(generic.payload_json);
  }

  return null;
}

function writeToSqlite(database, base, data) {
  function deleteMissingById(table, idColumn, incomingIds) {
    if (!incomingIds || incomingIds.size === 0) {
      database.exec(`DELETE FROM ${table}`);
      return;
    }
    const rows = database.prepare(`SELECT ${idColumn} AS id FROM ${table}`).all();
    const del = database.prepare(`DELETE FROM ${table} WHERE ${idColumn} = ?`);
    for (const r of rows) {
      const id = r && r.id != null ? String(r.id) : null;
      if (id && !incomingIds.has(id)) del.run(r.id);
    }
  }

  if (base === ".credentials.json") {
    migrateCredentials(database, data);
    return "success";
  }

  if (base === ".clients.json") {
    const tx = database.transaction(() => {
      if (!Array.isArray(data)) {
        return;
      }

      const incomingIds = new Set();
      for (const c of data) {
        const id = c && c.id != null ? String(c.id) : null;
        if (id) incomingIds.add(id);
      }

      deleteMissingById("clients", "id", incomingIds);
      migrateClients(database, data);
    });
    tx();
    return "success";
  }

  if (base === ".utilities.json") {
    const tx = database.transaction(() => {
      database.exec("DELETE FROM utilities");
      migrateUtilities(database, data);
    });
    tx();
    return "success";
  }

  if (base === ".types.json") {
    const tx = database.transaction(() => {
      if (!Array.isArray(data)) {
        return;
      }

      const incomingIds = new Set();
      for (const t of data) {
        const id = t && t.id != null ? String(t.id) : null;
        if (id) incomingIds.add(id);
      }

      deleteMissingById("types", "id", incomingIds);
      migrateTypes(database, data);
    });
    tx();
    return "success";
  }

  if (base === ".codes.json") {
    const tx = database.transaction(() => {
      if (!Array.isArray(data)) {
        return;
      }

      const incomingIds = new Set();
      for (const c of data) {
        const id = c && c.id != null ? String(c.id) : null;
        if (id) incomingIds.add(id);
      }

      deleteMissingById("codes", "id", incomingIds);
      migrateCodes(database, data);
    });
    tx();
    return "success";
  }

  if (base === ".rates.json") {
    const tx = database.transaction(() => {
      if (!data || typeof data !== "object" || Array.isArray(data)) {
        return;
      }

      const incomingKeys = new Set(Object.keys(data).map((k) => String(k)));
      if (incomingKeys.size === 0) {
        database.exec("DELETE FROM global_rates");
      } else {
        const rows = database.prepare("SELECT rate_key AS id FROM global_rates").all();
        const del = database.prepare("DELETE FROM global_rates WHERE rate_key = ?");
        for (const r of rows) {
          const k = r && r.id != null ? String(r.id) : null;
          if (k && !incomingKeys.has(k)) del.run(r.id);
        }
      }

      migrateRates(database, data);
    });
    tx();
    return "success";
  }

  if (base === ".doors.json") {
    const tx = database.transaction(() => {
      if (!Array.isArray(data)) {
        return;
      }

      const incomingIds = new Set();
      for (const r of data) {
        const id = r && r.id != null ? String(r.id) : null;
        if (id) incomingIds.add(id);
      }

      deleteMissingById("doors", "id", incomingIds);
      migrateDoors(database, data);
    });
    tx();
    return "success";
  }

  if (base === ".hardwares.json") {
    const tx = database.transaction(() => {
      if (!Array.isArray(data)) {
        return;
      }

      const incomingIds = new Set();
      for (const r of data) {
        const id = r && r.id != null ? String(r.id) : null;
        if (id) incomingIds.add(id);
      }

      deleteMissingById("hardwares", "id", incomingIds);
      migrateHardwares(database, data);
    });
    tx();
    return "success";
  }

  if (base === ".handlers.json") {
    const tx = database.transaction(() => {
      if (!Array.isArray(data)) {
        return;
      }

      const incomingIds = new Set();
      for (const r of data) {
        const id = r && r.id != null ? String(r.id) : null;
        if (id) incomingIds.add(id);
      }

      deleteMissingById("handlers", "id", incomingIds);
      migrateHandlers(database, data);
    });
    tx();
    return "success";
  }

  if (base === ".shelves.json") {
    const tx = database.transaction(() => {
      if (!Array.isArray(data)) {
        return;
      }

      const incomingIds = new Set();
      for (const r of data) {
        const id = r && r.id != null ? String(r.id) : null;
        if (id) incomingIds.add(id);
      }

      deleteMissingById("shelves", "id", incomingIds);
      migrateShelves(database, data);
    });
    tx();
    return "success";
  }

  if (base === ".pricings.json") {
    const tx = database.transaction(() => {
      if (!Array.isArray(data)) {
        return;
      }

      const incomingIds = new Set();
      for (const p of data) {
        const id = p && p.pinfo && p.pinfo.id != null ? String(p.pinfo.id) : null;
        if (id) incomingIds.add(id);
      }

      const existingIds = database.prepare("SELECT id FROM pricings").all().map((r) => String(r.id));
      const deleteStmt = database.prepare("DELETE FROM pricings WHERE id = ?");
      for (const id of existingIds) {
        if (!incomingIds.has(id)) deleteStmt.run(id);
      }

      migratePricings(database, data);
    });
    tx();
    return "success";
  }

  database
    .prepare(
      "INSERT INTO json_store (key, payload_json) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET payload_json=excluded.payload_json"
    )
    .run(base, JSON.stringify(data));
  return "success";
}

function load(filePath) {
  const base = path.basename(filePath);
  if (!SQLITE_TARGET_BASENAMES.has(base)) {
    return safeReadJsonFile(filePath);
  }

  const database = getDb();
  if (!database) {
    return safeReadJsonFile(filePath);
  }
  ensureMigratedForFile(database, filePath);
  return loadFromSqlite(database, base);
}

function write(filePath, data) {
  const base = path.basename(filePath);
  if (!SQLITE_TARGET_BASENAMES.has(base)) {
    fs.writeFileSync(filePath, JSON.stringify(data));
    return "success";
  }

  const database = getDb();
  if (!database) {
    fs.writeFileSync(filePath, JSON.stringify(data));
    return "success";
  }
  ensureMigratedForFile(database, filePath);
  const res = writeToSqlite(database, base, data);
  return res || "success";
}

function migrateAllLegacyFiles() {
  const database = getDb();
  if (!database) return;

  const dbDir = path.join(__dirname, "../db");
  for (const base of SQLITE_TARGET_BASENAMES) {
    const filePath = path.join(dbDir, base);
    ensureMigratedForFile(database, filePath);
  }
}

function searchCodes(opts) {
  const query = opts && opts.query != null ? String(opts.query) : "";
  const utilityIdRaw = opts && opts.utility_id != null ? String(opts.utility_id) : "";
  const typeIdRaw = opts && opts.type_id != null ? String(opts.type_id) : "";
  const limitRaw = opts && opts.limit != null ? Number(opts.limit) : 300;
  const limit = limitRaw && limitRaw > 0 ? Math.min(limitRaw, 2000) : 300;

  const database = getDb();
  if (!database) {
    const dbDir = path.join(__dirname, "../db");
    const fallbackPath = path.join(dbDir, ".codes.json");
    let rows = safeReadJsonFile(fallbackPath) || [];
    if (!Array.isArray(rows)) rows = [];

    if (utilityIdRaw) {
      rows = rows.filter((r) => r && String(r.utility_id) === utilityIdRaw);
    }
    if (typeIdRaw) {
      rows = rows.filter((r) => r && String(r.type_id) === typeIdRaw);
    }
    if (query) {
      const q = query.toLowerCase();
      rows = rows.filter((r) => {
        const id = r && r.id != null ? String(r.id) : "";
        const title = r && r.title != null ? String(r.title).toLowerCase() : "";
        return id.indexOf(query) !== -1 || title.indexOf(q) !== -1;
      });
    }
    return rows.slice(0, limit);
  }

  const where = [];
  const params = [];

  if (utilityIdRaw) {
    const u = Number(utilityIdRaw);
    if (!Number.isNaN(u)) {
      where.push("c.utility_id = ?");
      params.push(u);
    }
  }

  if (typeIdRaw) {
    const t = Number(typeIdRaw);
    if (!Number.isNaN(t)) {
      where.push("c.type_id = ?");
      params.push(t);
    }
  }

  if (query) {
    const like = `%${query}%`;
    where.push("(CAST(c.id AS TEXT) LIKE ? OR c.title LIKE ? COLLATE NOCASE)");
    params.push(like, like);
  }

  let sql = `
    SELECT
      c.id, c.title, c.rate, c.back_area, c.secondary_top, c.edging, c.screws,
      c.utility_id, u.title AS utility,
      c.type_id, t.title AS type
    FROM codes c
    LEFT JOIN utilities u ON u.id = c.utility_id
    LEFT JOIN types t ON t.id = c.type_id
  `;
  if (where.length) sql += ` WHERE ${where.join(" AND ")} `;
  sql += " ORDER BY c.id LIMIT ? ";
  params.push(limit);

  return database
    .prepare(sql)
    .all(...params)
    .map((r) => ({
      id: String(r.id),
      title: r.title != null ? r.title : "",
      rate: String(r.rate),
      back_area: String(r.back_area),
      secondary_top: String(r.secondary_top),
      edging: String(r.edging),
      screws: String(r.screws),
      utility_id: r.utility_id != null ? String(r.utility_id) : "",
      utility: r.utility != null ? r.utility : "",
      type_id: r.type_id != null ? String(r.type_id) : "",
      type: r.type != null ? r.type : "",
    }));
}

function searchDoors(opts) {
  const query = opts && opts.query != null ? String(opts.query) : "";
  const utilityIdRaw = opts && opts.utility_id != null ? String(opts.utility_id) : "";
  const typeIdRaw = opts && opts.type_id != null ? String(opts.type_id) : "";
  const codeIdRaw = opts && opts.code_id != null ? String(opts.code_id) : "";
  const limitRaw = opts && opts.limit != null ? Number(opts.limit) : 300;
  const limit = limitRaw && limitRaw > 0 ? Math.min(limitRaw, 2000) : 300;

  const database = getDb();
  if (!database) {
    const dbDir = path.join(__dirname, "../db");
    const fallbackPath = path.join(dbDir, ".doors.json");
    let rows = safeReadJsonFile(fallbackPath) || [];
    if (!Array.isArray(rows)) rows = [];

    if (utilityIdRaw) rows = rows.filter((r) => r && String(r.utility_id) === utilityIdRaw);
    if (typeIdRaw) rows = rows.filter((r) => r && String(r.type_id) === typeIdRaw);
    if (codeIdRaw) rows = rows.filter((r) => r && String(r.code_id) === codeIdRaw);
    if (query) {
      const q = query.toLowerCase();
      rows = rows.filter((r) => {
        const id = r && r.id != null ? String(r.id) : "";
        const title = r && r.title != null ? String(r.title).toLowerCase() : "";
        const code = r && r.code != null ? String(r.code).toLowerCase() : "";
        return id.indexOf(query) !== -1 || title.indexOf(q) !== -1 || code.indexOf(q) !== -1;
      });
    }
    return rows.slice(0, limit);
  }

  const where = [];
  const params = [];

  if (utilityIdRaw) {
    const u = Number(utilityIdRaw);
    if (!Number.isNaN(u)) {
      where.push("d.utility_id = ?");
      params.push(u);
    }
  }
  if (typeIdRaw) {
    const t = Number(typeIdRaw);
    if (!Number.isNaN(t)) {
      where.push("d.type_id = ?");
      params.push(t);
    }
  }
  if (codeIdRaw) {
    const c = Number(codeIdRaw);
    if (!Number.isNaN(c)) {
      where.push("d.code_id = ?");
      params.push(c);
    }
  }

  if (query) {
    const like = `%${query}%`;
    where.push("(CAST(d.id AS TEXT) LIKE ? OR d.title LIKE ? COLLATE NOCASE OR c.title LIKE ? COLLATE NOCASE)");
    params.push(like, like, like);
  }

  let sql = `
    SELECT
      d.id, d.title, d.rate, d.edging,
      d.utility_id, u.title AS utility,
      d.type_id, t.title AS type,
      d.code_id, c.title AS code
    FROM doors d
    LEFT JOIN utilities u ON u.id = d.utility_id
    LEFT JOIN types t ON t.id = d.type_id
    LEFT JOIN codes c ON c.id = d.code_id
  `;
  if (where.length) sql += ` WHERE ${where.join(" AND ")} `;
  sql += " ORDER BY d.id LIMIT ? ";
  params.push(limit);

  return database
    .prepare(sql)
    .all(...params)
    .map((r) => ({
      id: String(r.id),
      title: r.title != null ? r.title : "",
      code: r.code != null ? r.code : "",
      rate: String(r.rate),
      edging: String(r.edging),
      utility_id: r.utility_id != null ? String(r.utility_id) : "",
      utility: r.utility != null ? r.utility : "",
      type_id: r.type_id != null ? String(r.type_id) : "",
      type: r.type != null ? r.type : "",
      code_id: r.code_id != null ? String(r.code_id) : "",
    }));
}

function searchHardwares(opts) {
  const query = opts && opts.query != null ? String(opts.query) : "";
  const utilityIdRaw = opts && opts.utility_id != null ? String(opts.utility_id) : "";
  const typeIdRaw = opts && opts.type_id != null ? String(opts.type_id) : "";
  const codeIdRaw = opts && opts.code_id != null ? String(opts.code_id) : "";
  const limitRaw = opts && opts.limit != null ? Number(opts.limit) : 300;
  const limit = limitRaw && limitRaw > 0 ? Math.min(limitRaw, 2000) : 300;

  const database = getDb();
  if (!database) {
    const dbDir = path.join(__dirname, "../db");
    const fallbackPath = path.join(dbDir, ".hardwares.json");
    let rows = safeReadJsonFile(fallbackPath) || [];
    if (!Array.isArray(rows)) rows = [];

    if (utilityIdRaw) rows = rows.filter((r) => r && String(r.utility_id) === utilityIdRaw);
    if (typeIdRaw) rows = rows.filter((r) => r && String(r.type_id) === typeIdRaw);
    if (codeIdRaw) rows = rows.filter((r) => r && String(r.code_id) === codeIdRaw);
    if (query) {
      const q = query.toLowerCase();
      rows = rows.filter((r) => {
        const id = r && r.id != null ? String(r.id) : "";
        const title = r && r.title != null ? String(r.title).toLowerCase() : "";
        const code = r && r.code != null ? String(r.code).toLowerCase() : "";
        return id.indexOf(query) !== -1 || title.indexOf(q) !== -1 || code.indexOf(q) !== -1;
      });
    }
    return rows.slice(0, limit);
  }

  const where = [];
  const params = [];

  if (utilityIdRaw) {
    const u = Number(utilityIdRaw);
    if (!Number.isNaN(u)) {
      where.push("h.utility_id = ?");
      params.push(u);
    }
  }
  if (typeIdRaw) {
    const t = Number(typeIdRaw);
    if (!Number.isNaN(t)) {
      where.push("h.type_id = ?");
      params.push(t);
    }
  }
  if (codeIdRaw) {
    const c = Number(codeIdRaw);
    if (!Number.isNaN(c)) {
      where.push("h.code_id = ?");
      params.push(c);
    }
  }

  if (query) {
    const like = `%${query}%`;
    where.push("(CAST(h.id AS TEXT) LIKE ? OR h.title LIKE ? COLLATE NOCASE OR c.title LIKE ? COLLATE NOCASE)");
    params.push(like, like, like);
  }

  let sql = `
    SELECT
      h.id, h.title, h.rate, h.slider, h.lift,
      h.utility_id, u.title AS utility,
      h.type_id, t.title AS type,
      h.code_id, c.title AS code
    FROM hardwares h
    LEFT JOIN utilities u ON u.id = h.utility_id
    LEFT JOIN types t ON t.id = h.type_id
    LEFT JOIN codes c ON c.id = h.code_id
  `;
  if (where.length) sql += ` WHERE ${where.join(" AND ")} `;
  sql += " ORDER BY h.id LIMIT ? ";
  params.push(limit);

  return database
    .prepare(sql)
    .all(...params)
    .map((r) => ({
      id: String(r.id),
      title: r.title != null ? r.title : "",
      code: r.code != null ? r.code : "",
      rate: String(r.rate),
      slider: String(r.slider),
      lift: String(r.lift),
      utility_id: r.utility_id != null ? String(r.utility_id) : "",
      utility: r.utility != null ? r.utility : "",
      type_id: r.type_id != null ? String(r.type_id) : "",
      type: r.type != null ? r.type : "",
      code_id: r.code_id != null ? String(r.code_id) : "",
    }));
}

function searchHandlers(opts) {
  const query = opts && opts.query != null ? String(opts.query) : "";
  const utilityIdRaw = opts && opts.utility_id != null ? String(opts.utility_id) : "";
  const typeIdRaw = opts && opts.type_id != null ? String(opts.type_id) : "";
  const codeIdRaw = opts && opts.code_id != null ? String(opts.code_id) : "";
  const limitRaw = opts && opts.limit != null ? Number(opts.limit) : 300;
  const limit = limitRaw && limitRaw > 0 ? Math.min(limitRaw, 2000) : 300;

  const database = getDb();
  if (!database) {
    const dbDir = path.join(__dirname, "../db");
    const fallbackPath = path.join(dbDir, ".handlers.json");
    let rows = safeReadJsonFile(fallbackPath) || [];
    if (!Array.isArray(rows)) rows = [];

    if (utilityIdRaw) rows = rows.filter((r) => r && String(r.utility_id) === utilityIdRaw);
    if (typeIdRaw) rows = rows.filter((r) => r && String(r.type_id) === typeIdRaw);
    if (codeIdRaw) rows = rows.filter((r) => r && String(r.code_id) === codeIdRaw);
    if (query) {
      const q = query.toLowerCase();
      rows = rows.filter((r) => {
        const id = r && r.id != null ? String(r.id) : "";
        const title = r && r.title != null ? String(r.title).toLowerCase() : "";
        const code = r && r.code != null ? String(r.code).toLowerCase() : "";
        return id.indexOf(query) !== -1 || title.indexOf(q) !== -1 || code.indexOf(q) !== -1;
      });
    }
    return rows.slice(0, limit);
  }

  const where = [];
  const params = [];

  if (utilityIdRaw) {
    const u = Number(utilityIdRaw);
    if (!Number.isNaN(u)) {
      where.push("h.utility_id = ?");
      params.push(u);
    }
  }
  if (typeIdRaw) {
    const t = Number(typeIdRaw);
    if (!Number.isNaN(t)) {
      where.push("h.type_id = ?");
      params.push(t);
    }
  }
  if (codeIdRaw) {
    const c = Number(codeIdRaw);
    if (!Number.isNaN(c)) {
      where.push("h.code_id = ?");
      params.push(c);
    }
  }

  if (query) {
    const like = `%${query}%`;
    where.push("(CAST(h.id AS TEXT) LIKE ? OR h.title LIKE ? COLLATE NOCASE OR c.title LIKE ? COLLATE NOCASE)");
    params.push(like, like, like);
  }

  let sql = `
    SELECT
      h.id, h.title, h.rate,
      h.utility_id, u.title AS utility,
      h.type_id, t.title AS type,
      h.code_id, c.title AS code
    FROM handlers h
    LEFT JOIN utilities u ON u.id = h.utility_id
    LEFT JOIN types t ON t.id = h.type_id
    LEFT JOIN codes c ON c.id = h.code_id
  `;
  if (where.length) sql += ` WHERE ${where.join(" AND ")} `;
  sql += " ORDER BY h.id LIMIT ? ";
  params.push(limit);

  return database
    .prepare(sql)
    .all(...params)
    .map((r) => ({
      id: String(r.id),
      title: r.title != null ? r.title : "",
      code: r.code != null ? r.code : "",
      rate: String(r.rate),
      utility_id: r.utility_id != null ? String(r.utility_id) : "",
      utility: r.utility != null ? r.utility : "",
      type_id: r.type_id != null ? String(r.type_id) : "",
      type: r.type != null ? r.type : "",
      code_id: r.code_id != null ? String(r.code_id) : "",
    }));
}

function searchShelves(opts) {
  const query = opts && opts.query != null ? String(opts.query) : "";
  const utilityIdRaw = opts && opts.utility_id != null ? String(opts.utility_id) : "";
  const typeIdRaw = opts && opts.type_id != null ? String(opts.type_id) : "";
  const codeIdRaw = opts && opts.code_id != null ? String(opts.code_id) : "";
  const limitRaw = opts && opts.limit != null ? Number(opts.limit) : 300;
  const limit = limitRaw && limitRaw > 0 ? Math.min(limitRaw, 2000) : 300;

  const database = getDb();
  if (!database) {
    const dbDir = path.join(__dirname, "../db");
    const fallbackPath = path.join(dbDir, ".shelves.json");
    let rows = safeReadJsonFile(fallbackPath) || [];
    if (!Array.isArray(rows)) rows = [];

    if (utilityIdRaw) rows = rows.filter((r) => r && String(r.utility_id) === utilityIdRaw);
    if (typeIdRaw) rows = rows.filter((r) => r && String(r.type_id) === typeIdRaw);
    if (codeIdRaw) rows = rows.filter((r) => r && String(r.code_id) === codeIdRaw);
    if (query) {
      const q = query.toLowerCase();
      rows = rows.filter((r) => {
        const id = r && r.id != null ? String(r.id) : "";
        const title = r && r.title != null ? String(r.title).toLowerCase() : "";
        const code = r && r.code != null ? String(r.code).toLowerCase() : "";
        return id.indexOf(query) !== -1 || title.indexOf(q) !== -1 || code.indexOf(q) !== -1;
      });
    }
    return rows.slice(0, limit);
  }

  const where = [];
  const params = [];

  if (utilityIdRaw) {
    const u = Number(utilityIdRaw);
    if (!Number.isNaN(u)) {
      where.push("s.utility_id = ?");
      params.push(u);
    }
  }
  if (typeIdRaw) {
    const t = Number(typeIdRaw);
    if (!Number.isNaN(t)) {
      where.push("s.type_id = ?");
      params.push(t);
    }
  }
  if (codeIdRaw) {
    const c = Number(codeIdRaw);
    if (!Number.isNaN(c)) {
      where.push("s.code_id = ?");
      params.push(c);
    }
  }

  if (query) {
    const like = `%${query}%`;
    where.push("(CAST(s.id AS TEXT) LIKE ? OR s.title LIKE ? COLLATE NOCASE OR c.title LIKE ? COLLATE NOCASE)");
    params.push(like, like, like);
  }

  let sql = `
    SELECT
      s.id, s.title, s.rate, s.pin, s.edging,
      s.utility_id, u.title AS utility,
      s.type_id, t.title AS type,
      s.code_id, c.title AS code
    FROM shelves s
    LEFT JOIN utilities u ON u.id = s.utility_id
    LEFT JOIN types t ON t.id = s.type_id
    LEFT JOIN codes c ON c.id = s.code_id
  `;
  if (where.length) sql += ` WHERE ${where.join(" AND ")} `;
  sql += " ORDER BY s.id LIMIT ? ";
  params.push(limit);

  return database
    .prepare(sql)
    .all(...params)
    .map((r) => ({
      id: String(r.id),
      title: r.title != null ? r.title : "",
      code: r.code != null ? r.code : "",
      rate: String(r.rate),
      pin: String(r.pin),
      edging: String(r.edging),
      utility_id: r.utility_id != null ? String(r.utility_id) : "",
      utility: r.utility != null ? r.utility : "",
      type_id: r.type_id != null ? String(r.type_id) : "",
      type: r.type != null ? r.type : "",
      code_id: r.code_id != null ? String(r.code_id) : "",
    }));
}

function nextIdFor(opts) {
  const base = opts && opts.base != null ? String(opts.base) : "";

  const tableByBase = {
    ".codes.json": "codes",
    ".doors.json": "doors",
    ".hardwares.json": "hardwares",
    ".handlers.json": "handlers",
    ".shelves.json": "shelves",
    ".clients.json": "clients",
    ".utilities.json": "utilities",
    ".types.json": "types",
  };

  const table = tableByBase[base];
  if (!table) return 1;

  const database = getDb();
  if (database) {
    const row = database.prepare(`SELECT MAX(id) AS max_id FROM ${table}`).get();
    const maxId = row && row.max_id != null ? Number(row.max_id) : 0;
    return maxId + 1;
  }

  const dbDir = path.join(__dirname, "../db");
  const filePath = path.join(dbDir, base);
  let rows = safeReadJsonFile(filePath) || [];
  if (!Array.isArray(rows)) rows = [];
  let maxId = 0;
  for (const r of rows) {
    const id = r && r.id != null ? Number(r.id) : 0;
    if (id > maxId) maxId = id;
  }
  return maxId + 1;
}

module.exports = {
  load,
  write,
  migrateAllLegacyFiles,
  searchCodes,
  searchDoors,
  searchHardwares,
  searchHandlers,
  searchShelves,
  nextIdFor,
};
