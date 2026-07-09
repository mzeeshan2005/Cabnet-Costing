const fs = require("fs");
const path = require("path");
const { app } = require("electron");
const crypto = require("crypto");

let Database;
let db;
let dbUnavailable = false;
let lastDbUnavailableReason = "";
const DEFAULT_LOGIN_PASSWORD = "123";
const DEFAULT_PRIMARY_PASSWORD = "1";

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
]);

const TOOLS_SYNC_BASENAMES = new Set([
  ".utilities.json",
  ".types.json",
  ".codes.json",
  ".doors.json",
  ".hardwares.json",
  ".handlers.json",
  ".shelves.json",
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
  if (process.env.CABINET_COSTING_DISABLE_SQLITE === "1") {
    dbUnavailable = true;
    lastDbUnavailableReason = "CABINET_COSTING_DISABLE_SQLITE=1";
    return null;
  }
  if (db) return db;
  if (dbUnavailable) return null;

  if (!Database) {
    try {
      Database = require("better-sqlite3");
    } catch (e) {
      lastDbUnavailableReason = e && e.message ? e.message : String(e);
      console.error("SQLite disabled: failed to load better-sqlite3:", e && e.message ? e.message : e);
      dbUnavailable = true;
      return null;
    }
  }

  const dbPath = getDbPath();
  try {
    db = new Database(dbPath);
  } catch (e) {
    lastDbUnavailableReason = e && e.message ? e.message : String(e);
    console.error("SQLite disabled: failed to open database:", e && e.message ? e.message : e);
    dbUnavailable = true;
    return null;
  }

  lastDbUnavailableReason = "";
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");

  initSchema(db);
  return db;
}

function requireDbOrThrow() {
  const database = getDb();
  if (database) return database;
  throw new Error(
    `SQLite database is required. JSON fallback is disabled.${lastDbUnavailableReason ? ` Last SQLite error: ${lastDbUnavailableReason}` : ""}`
  );
}

function closeDb() {
  if (!db) return;
  try {
    db.close();
  } catch (e) {
    return;
  } finally {
    db = null;
  }
}

function getDefaultBackupPath() {
  return `${getDbPath()}.bak`;
}

function getBundledSeedBackupPath() {
  const candidates = [];

  if (app && app.isPackaged) {
    candidates.push(path.join(process.resourcesPath, "seed", "cabinet_costing.db.bak"));
  }

  candidates.push(path.join(__dirname, "../../seed/cabinet_costing.db.bak"));

  for (let i = 0; i < candidates.length; i += 1) {
    const candidate = candidates[i];
    try {
      const exists = fs.existsSync(candidate);
      if (exists) return candidate;
    } catch (e) {
      continue;
    }
  }

  return "";
}

function ensureSqliteFileOrThrow(filePath, label) {
  const targetLabel = label || "SQLite database";

  let stats;
  try {
    stats = fs.statSync(filePath);
  } catch (e) {
    throw new Error(`${targetLabel} not found: ${filePath}`);
  }

  if (!stats.isFile()) {
    throw new Error(`${targetLabel} is not a file: ${filePath}`);
  }

  if (stats.size < 16) {
    throw new Error(`${targetLabel} is invalid or truncated: ${filePath}`);
  }

  const header = Buffer.alloc(16);
  const fd = fs.openSync(filePath, "r");
  try {
    fs.readSync(fd, header, 0, header.length, 0);
  } finally {
    fs.closeSync(fd);
  }

  if (header.toString("utf8") !== "SQLite format 3\u0000") {
    throw new Error(`${targetLabel} is not a valid SQLite file: ${filePath}`);
  }
}

function openStandaloneDatabase(dbPath) {
  if (!Database) {
    try {
      Database = require("better-sqlite3");
    } catch (e) {
      throw new Error("SQLite database is required. JSON fallback is disabled.");
    }
  }

  const database = new Database(dbPath);
  database.pragma("journal_mode = WAL");
  database.pragma("synchronous = NORMAL");
  database.pragma("foreign_keys = ON");
  database.pragma("busy_timeout = 5000");
  initSchema(database);
  return database;
}

function cleanupDbSidecars(dbPath) {
  [`${dbPath}-wal`, `${dbPath}-shm`].forEach((sidecarPath) => {
    try {
      if (fs.existsSync(sidecarPath)) fs.unlinkSync(sidecarPath);
    } catch (e) {
      return;
    }
  });
}

function initializeDatabase() {
  const database = requireDbOrThrow();
  ensureToolUniqueness(database);
  return { dbPath: getDbPath() };
}

function seedDatabaseFromBundledBackupIfNeeded() {
  if (!(app && app.isPackaged)) {
    return { seeded: false, reason: "not-packaged" };
  }

  const dbPath = getDbPath();
  if (fs.existsSync(dbPath)) {
    return { seeded: false, reason: "db-exists", dbPath };
  }

  const bundledBackupPath = getBundledSeedBackupPath();
  if (!bundledBackupPath) {
    return { seeded: false, reason: "seed-backup-missing", dbPath };
  }

  const defaultBackupPath = getDefaultBackupPath();
  ensureDir(path.dirname(defaultBackupPath));
  fs.copyFileSync(bundledBackupPath, defaultBackupPath);

  const result = restoreDatabase(defaultBackupPath);
  return {
    seeded: true,
    dbPath: result.dbPath,
    backupPath: result.backupPath,
    sourcePath: bundledBackupPath,
  };
}

function repairToolDatabases() {
  const repaired = [];
  const livePath = getDbPath();
  const liveDb = requireDbOrThrow();
  ensureToolUniqueness(liveDb);
  repaired.push(livePath);

  const backupPath = getDefaultBackupPath();
  if (fs.existsSync(backupPath)) {
    const backupDb = openStandaloneDatabase(backupPath);
    try {
      ensureToolUniqueness(backupDb);
      repaired.push(backupPath);
    } finally {
      backupDb.close();
    }
  }

  return { repaired };
}

function backupDatabase(outPath) {
  const database = requireDbOrThrow();
  const dbPath = getDbPath();
  const targetPath = outPath != null && String(outPath).trim() ? String(outPath).trim() : getDefaultBackupPath();
  if (path.resolve(targetPath) === path.resolve(dbPath)) {
    throw new Error(`Backup path must be different from the live database: ${targetPath}`);
  }

  ensureToolUniqueness(database);
  ensureDir(path.dirname(targetPath));
  database.pragma("wal_checkpoint(TRUNCATE)");
  fs.copyFileSync(dbPath, targetPath);

  return {
    dbPath,
    backupPath: targetPath,
  };
}

function restoreDatabase(inPath) {
  const backupPath = inPath != null && String(inPath).trim() ? String(inPath).trim() : getDefaultBackupPath();
  const dbPath = getDbPath();
  if (path.resolve(backupPath) === path.resolve(dbPath)) {
    throw new Error(`Restore source must be different from the live database: ${backupPath}`);
  }
  ensureSqliteFileOrThrow(backupPath, "SQLite backup");

  closeDb();
  ensureDir(path.dirname(dbPath));
  cleanupDbSidecars(dbPath);
  fs.copyFileSync(backupPath, dbPath);
  cleanupDbSidecars(dbPath);
  const database = requireDbOrThrow();
  ensureToolUniqueness(database);

  return {
    dbPath,
    backupPath,
  };
}

function getDefaultToolsExcelPath() {
  if (app && app.isPackaged) {
    const exeDir = path.dirname(process.execPath);
    const dataDir = path.join(exeDir, "data");
    ensureDir(dataDir);
    return path.join(dataDir, "Tools_Data.xlsx");
  }
  // Dev mode: place next to index.js (project root)
  return path.join(__dirname, "../../Tools_Data.xlsx");
}

function exportToolsExcel(outPath) {
  let XLSX;
  try {
    XLSX = require("xlsx");
  } catch (e) {
    throw new Error("Excel sync requires 'xlsx' dependency.");
  }

  const TOOL_COLORS = {
    "Utility Id": "FF2F5496", "Utility Title": "FF2F5496",
    "Description Id": "FF375623", "Description Title": "FF375623",
    "Code Id": "FFBF6000", "Code Title": "FFBF6000",
    "Finishing Id": "FF5B2C8E", "Finishing Title": "FF5B2C8E",
    "Hardware Id": "FF0070C0", "Hardware Title": "FF0070C0",
    "Handle Id": "FFC00000", "Handle Title": "FFC00000",
    "Shelf Id": "FF806000", "Shelf Title": "FF806000",
  };

  function applyColumnWidths(ws) {
    const ref = ws["!ref"];
    if (!ref) return;
    const range = XLSX.utils.decode_range(ref);
    const colWidths = {};
    for (const key in ws) {
      if (key[0] === "!") continue;
      const cell = ws[key];
      if (cell && cell.v != null) {
        const colLetter = key.replace(/[0-9]/g, "");
        colWidths[colLetter] = Math.max(colWidths[colLetter] || 0, String(cell.v).length);
      }
    }
    const cols = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      const letter = XLSX.utils.encode_col(c);
      cols.push({ wch: Math.max((colWidths[letter] || 8) + 2, 12) });
    }
    ws["!cols"] = cols;
  }

  const cfg = getSystemConfig() || {};
  const targetPath =
    outPath != null && String(outPath).trim()
      ? String(outPath).trim()
      : cfg.master_excel_path != null && String(cfg.master_excel_path).trim()
        ? String(cfg.master_excel_path).trim()
        : getDefaultToolsExcelPath();

  ensureDir(path.dirname(targetPath));

  const database = requireDbOrThrow();

  let utilities = [];
  let types = [];
  let codes = [];
  let doors = [];
  let hardwares = [];
  let handlers = [];
  let shelves = [];

  utilities = database.prepare("SELECT id, title FROM utilities ORDER BY id").all();
  types = database
    .prepare(
      "SELECT t.id, t.title, t.utility_id, u.title AS utility FROM types t LEFT JOIN utilities u ON u.id = t.utility_id ORDER BY t.id"
    )
    .all();
  codes = database
    .prepare(
      "SELECT c.id, c.title, c.utility_id, u.title AS utility, c.type_id, t.title AS type, c.rate, c.back_area, c.secondary_top, c.edging, c.screws, c.wall_bracket FROM codes c LEFT JOIN utilities u ON u.id = c.utility_id LEFT JOIN types t ON t.id = c.type_id ORDER BY c.id"
    )
    .all();
  doors = database
    .prepare(
      "SELECT d.id, d.title, d.utility_id, u.title AS utility, d.type_id, t.title AS type, d.code_id, c.title AS code, d.rate, d.edging FROM doors d LEFT JOIN utilities u ON u.id = d.utility_id LEFT JOIN types t ON t.id = d.type_id LEFT JOIN codes c ON c.id = d.code_id ORDER BY d.id"
    )
    .all();
  hardwares = database
    .prepare(
      "SELECT h.id, h.title, h.utility_id, u.title AS utility, h.type_id, t.title AS type, h.code_id, c.title AS code, h.rate, h.slider, h.lift, h.hanger_pipe, h.hanger_pipe_fitting, h.locks, h.drawer_handles FROM hardwares h LEFT JOIN utilities u ON u.id = h.utility_id LEFT JOIN types t ON t.id = h.type_id LEFT JOIN codes c ON c.id = h.code_id ORDER BY h.id"
    )
    .all();
  handlers = database
    .prepare(
      "SELECT h.id, h.title, h.utility_id, u.title AS utility, h.type_id, t.title AS type, h.code_id, c.title AS code, h.rate FROM handlers h LEFT JOIN utilities u ON u.id = h.utility_id LEFT JOIN types t ON t.id = h.type_id LEFT JOIN codes c ON c.id = h.code_id ORDER BY h.id"
    )
    .all();
  shelves = database
    .prepare(
      "SELECT s.id, s.title, s.utility_id, u.title AS utility, s.type_id, t.title AS type, s.code_id, c.title AS code, s.rate, s.pin, s.edging FROM shelves s LEFT JOIN utilities u ON u.id = s.utility_id LEFT JOIN types t ON t.id = s.type_id LEFT JOIN codes c ON c.id = s.code_id ORDER BY s.id"
    )
    .all();

  function toStr(v) {
    return v != null ? String(v) : "";
  }
  function toNumStr(v) {
    if (v == null) return "0";
    const n = Number(v);
    return isNaN(n) ? "0" : String(n);
  }

  const existingWB = (function() {
    try {
      if (fs.existsSync(targetPath)) return XLSX.readFile(targetPath);
    } catch (e) {}
    return null;
  })();

  function mergeExistingRows(sheetName, newHeader, idKey, newRows) {
    if (!existingWB) return newRows;
    const ws = existingWB.Sheets[sheetName];
    if (!ws) return newRows;
    const raw = XLSX.utils.sheet_to_json(ws, { header: 1 });
    if (!raw || raw.length < 2) return newRows;
    const existingHeader = raw[0].map(h => String(h != null ? h : "").trim().toLowerCase());
    const idKeyLower = String(idKey).trim().toLowerCase();
    const oldNameMap = { "description_id": "type_id", "description_title": "type", "utility_title": "utility", "code_title": "code" };
    let idIdx = existingHeader.indexOf(idKeyLower);
    if (idIdx === -1 && oldNameMap[idKeyLower]) idIdx = existingHeader.indexOf(oldNameMap[idKeyLower]);
    if (idIdx === -1) return newRows;
    const dbIdSet = new Set();
    for (let i = 0; i < newRows.length; i++) {
      const id = newRows[i] && newRows[i][idKey];
      if (id != null) dbIdSet.add(String(id).trim());
    }
    const colMap = newHeader.map(h => {
      const lower = String(h).trim().toLowerCase();
      let idx = existingHeader.indexOf(lower);
      if (idx === -1 && oldNameMap[lower]) idx = existingHeader.indexOf(oldNameMap[lower]);
      return idx;
    });
    const merged = newRows.slice();
    for (let r = 1; r < raw.length; r++) {
      const rowArr = raw[r];
      if (!rowArr || rowArr.length === 0) continue;
      const rowId = rowArr[idIdx] != null ? String(rowArr[idIdx]).trim() : null;
      if (rowId && !dbIdSet.has(rowId)) {
        const obj = {};
        for (let c = 0; c < newHeader.length; c++) {
          const srcIdx = colMap[c];
          obj[newHeader[c]] = srcIdx !== -1 && rowArr[srcIdx] != null ? String(rowArr[srcIdx]) : "";
        }
        merged.push(obj);
      }
    }
    return merged;
  }

  const wb = XLSX.utils.book_new();

  let utilRows = (utilities || []).map((r) => ({ "Utility Id": toStr(r.id), "Utility Title": toStr(r.title) }));
  utilRows = mergeExistingRows("Utilities", ["Utility Id", "Utility Title"], "Utility Id", utilRows);
  const wsUtil = XLSX.utils.json_to_sheet(utilRows, { header: ["Utility Id", "Utility Title"], skipHeader: false });
  applyColumnWidths(wsUtil);
  XLSX.utils.book_append_sheet(wb, wsUtil, "Utilities");

  let descRows = (types || []).map((r) => ({
    "Utility Id": toStr(r.utility_id),
    "Utility Title": toStr(r.utility),
    "Description Id": toStr(r.id),
    "Description Title": toStr(r.title),
  }));
  descRows = mergeExistingRows("Descriptions", ["Utility Id", "Utility Title", "Description Id", "Description Title"], "Description Id", descRows);
  const wsDesc = XLSX.utils.json_to_sheet(descRows, { header: ["Utility Id", "Utility Title", "Description Id", "Description Title"], skipHeader: false });
  applyColumnWidths(wsDesc, ["Utility Id", "Utility Title", "Description Id", "Description Title"]);
  XLSX.utils.book_append_sheet(wb, wsDesc, "Descriptions");

  let codeRows = (codes || []).map((r) => ({
    "Utility Id": toStr(r.utility_id),
    "Utility Title": toStr(r.utility),
    "Description Id": toStr(r.type_id),
    "Description Title": toStr(r.type),
    "Code Id": toStr(r.id),
    "Code Title": toStr(r.title),
    "Box Sheet": toNumStr(r.rate),
    "Back Sheet": toNumStr(r.back_area),
    Top: toNumStr(r.secondary_top),
    Edging: toNumStr(r.edging),
    Screws: toNumStr(r.screws),
    "Wall Bracket": toNumStr(r.wall_bracket),
  }));
  codeRows = mergeExistingRows("Codes", ["Utility Id", "Utility Title", "Description Id", "Description Title", "Code Id", "Code Title", "Box Sheet", "Back Sheet", "Top", "Edging", "Screws", "Wall Bracket"], "Code Id", codeRows);
  const wsCode = XLSX.utils.json_to_sheet(codeRows, { header: ["Utility Id", "Utility Title", "Description Id", "Description Title", "Code Id", "Code Title", "Box Sheet", "Back Sheet", "Top", "Edging", "Screws", "Wall Bracket"], skipHeader: false });
  applyColumnWidths(wsCode, ["Utility Id", "Utility Title", "Description Id", "Description Title", "Code Id", "Code Title", "Box Sheet", "Back Sheet", "Top", "Edging", "Screws", "Wall Bracket"]);
  XLSX.utils.book_append_sheet(wb, wsCode, "Codes");

  let doorRows = (doors || []).map((r) => ({
    "Utility Id": toStr(r.utility_id),
    "Utility Title": toStr(r.utility),
    "Description Id": toStr(r.type_id),
    "Description Title": toStr(r.type),
    "Code Id": toStr(r.code_id),
    "Code Title": toStr(r.code),
    "Finishing Id": toStr(r.id),
    "Finishing Title": toStr(r.title),
    "Panel Area": toNumStr(r.rate),
    Edging: toNumStr(r.edging),
  }));
  doorRows = mergeExistingRows("Finishing", ["Utility Id", "Utility Title", "Description Id", "Description Title", "Code Id", "Code Title", "Finishing Id", "Finishing Title", "Panel Area", "Edging"], "Finishing Id", doorRows);
  const wsDoor = XLSX.utils.json_to_sheet(doorRows, { header: ["Utility Id", "Utility Title", "Description Id", "Description Title", "Code Id", "Code Title", "Finishing Id", "Finishing Title", "Panel Area", "Edging"], skipHeader: false });
  applyColumnWidths(wsDoor, ["Utility Id", "Utility Title", "Description Id", "Description Title", "Code Id", "Code Title", "Finishing Id", "Finishing Title", "Panel Area", "Edging"]);
  XLSX.utils.book_append_sheet(wb, wsDoor, "Finishing");

  let hardRows = (hardwares || []).map((r) => ({
    "Utility Id": toStr(r.utility_id),
    "Utility Title": toStr(r.utility),
    "Description Id": toStr(r.type_id),
    "Description Title": toStr(r.type),
    "Code Id": toStr(r.code_id),
    "Code Title": toStr(r.code),
    "Hardware Id": toStr(r.id),
    "Hardware Title": toStr(r.title),
    "Hinges Set": toNumStr(r.rate),
    "Sliders Set": toNumStr(r.slider),
    "Lift Up Set": toNumStr(r.lift),
    "Hanger Pipe Length": toNumStr(r.hanger_pipe),
    "Pipe Fitting": toNumStr(r.hanger_pipe_fitting),
    Locks: toNumStr(r.locks),
    "Internal Handle": toNumStr(r.drawer_handles),
  }));
  hardRows = mergeExistingRows("Hardware", ["Utility Id", "Utility Title", "Description Id", "Description Title", "Code Id", "Code Title", "Hardware Id", "Hardware Title", "Hinges Set", "Sliders Set", "Lift Up Set", "Hanger Pipe Length", "Pipe Fitting", "Locks", "Internal Handle"], "Hardware Id", hardRows);
  const wsHard = XLSX.utils.json_to_sheet(hardRows, { header: ["Utility Id", "Utility Title", "Description Id", "Description Title", "Code Id", "Code Title", "Hardware Id", "Hardware Title", "Hinges Set", "Sliders Set", "Lift Up Set", "Hanger Pipe Length", "Pipe Fitting", "Locks", "Internal Handle"], skipHeader: false });
  applyColumnWidths(wsHard, ["Utility Id", "Utility Title", "Description Id", "Description Title", "Code Id", "Code Title", "Hardware Id", "Hardware Title", "Hinges Set", "Sliders Set", "Lift Up Set", "Hanger Pipe Length", "Pipe Fitting", "Locks", "Internal Handle"]);
  XLSX.utils.book_append_sheet(wb, wsHard, "Hardware");

  let handleRows = (handlers || []).map((r) => ({
    "Utility Id": toStr(r.utility_id),
    "Utility Title": toStr(r.utility),
    "Description Id": toStr(r.type_id),
    "Description Title": toStr(r.type),
    "Code Id": toStr(r.code_id),
    "Code Title": toStr(r.code),
    "Handle Id": toStr(r.id),
    "Handle Title": toStr(r.title),
    Quantity: toNumStr(r.rate),
  }));
  handleRows = mergeExistingRows("Handles", ["Utility Id", "Utility Title", "Description Id", "Description Title", "Code Id", "Code Title", "Handle Id", "Handle Title", "Quantity"], "Handle Id", handleRows);
  const wsHandle = XLSX.utils.json_to_sheet(handleRows, { header: ["Utility Id", "Utility Title", "Description Id", "Description Title", "Code Id", "Code Title", "Handle Id", "Handle Title", "Quantity"], skipHeader: false });
  applyColumnWidths(wsHandle, ["Utility Id", "Utility Title", "Description Id", "Description Title", "Code Id", "Code Title", "Handle Id", "Handle Title", "Quantity"]);
  XLSX.utils.book_append_sheet(wb, wsHandle, "Handles");

  let shelfRows = (shelves || []).map((r) => ({
    "Utility Id": toStr(r.utility_id),
    "Utility Title": toStr(r.utility),
    "Description Id": toStr(r.type_id),
    "Description Title": toStr(r.type),
    "Code Id": toStr(r.code_id),
    "Code Title": toStr(r.code),
    "Shelf Id": toStr(r.id),
    "Shelf Title": toStr(r.title),
    "Shelve Area": toNumStr(r.rate),
    "Pin Qty.": toNumStr(r.pin),
    Edging: toNumStr(r.edging),
  }));
  shelfRows = mergeExistingRows("Adjustable Shelves", ["Utility Id", "Utility Title", "Description Id", "Description Title", "Code Id", "Code Title", "Shelf Id", "Shelf Title", "Shelve Area", "Pin Qty.", "Edging"], "Shelf Id", shelfRows);
  const wsShelf = XLSX.utils.json_to_sheet(shelfRows, { header: ["Utility Id", "Utility Title", "Description Id", "Description Title", "Code Id", "Code Title", "Shelf Id", "Shelf Title", "Shelve Area", "Pin Qty.", "Edging"], skipHeader: false });
  applyColumnWidths(wsShelf, ["Utility Id", "Utility Title", "Description Id", "Description Title", "Code Id", "Code Title", "Shelf Id", "Shelf Title", "Shelve Area", "Pin Qty.", "Edging"]);
  XLSX.utils.book_append_sheet(wb, wsShelf, "Adjustable Shelves");

  XLSX.writeFile(wb, targetPath);

  try {
    const AdmZip = require("adm-zip");
    const zip = new AdmZip(targetPath);

    const colorToFontIdx = {};
    const colorToCellXfIdx = {};
    let nextFont = 1;
    let nextXf = 1;
    for (const key in TOOL_COLORS) {
      const c = TOOL_COLORS[key];
      if (colorToFontIdx[c] == null) {
        colorToFontIdx[c] = nextFont++;
        colorToCellXfIdx[c] = nextXf++;
      }
    }

    const headerNames = new Set(Object.keys(TOOL_COLORS));
    const colStyleBySheet = [
      { header: ["Utility Id", "Utility Title"], colStyles: {} },
      { header: ["Utility Id", "Utility Title", "Description Id", "Description Title"], colStyles: {} },
      { header: ["Utility Id", "Utility Title", "Description Id", "Description Title", "Code Id", "Code Title", "Box Sheet", "Back Sheet", "Top", "Edging", "Screws", "Wall Bracket"], colStyles: {} },
      { header: ["Utility Id", "Utility Title", "Description Id", "Description Title", "Code Id", "Code Title", "Finishing Id", "Finishing Title", "Panel Area", "Edging"], colStyles: {} },
      { header: ["Utility Id", "Utility Title", "Description Id", "Description Title", "Code Id", "Code Title", "Hardware Id", "Hardware Title", "Hinges Set", "Sliders Set", "Lift Up Set", "Hanger Pipe Length", "Pipe Fitting", "Locks", "Internal Handle"], colStyles: {} },
      { header: ["Utility Id", "Utility Title", "Description Id", "Description Title", "Code Id", "Code Title", "Handle Id", "Handle Title", "Quantity"], colStyles: {} },
      { header: ["Utility Id", "Utility Title", "Description Id", "Description Title", "Code Id", "Code Title", "Shelf Id", "Shelf Title", "Shelve Area", "Pin Qty.", "Edging"], colStyles: {} },
    ];
    for (let si = 0; si < colStyleBySheet.length; si++) {
      const h = colStyleBySheet[si].header;
      for (let ci = 0; ci < h.length; ci++) {
        const color = TOOL_COLORS[h[ci]];
        if (color) {
          colStyleBySheet[si].colStyles[ci] = colorToCellXfIdx[color];
        }
      }
    }

    const stylesEntry = zip.getEntry("xl/styles.xml");
    if (stylesEntry) {
      let stylesXml = stylesEntry.getData().toString("utf8");

      const uniqueColors = [...new Set(Object.values(TOOL_COLORS))];

      let fontsXml = "";
      for (const c of uniqueColors) {
        fontsXml += `<font><b/><sz val="12"/><color rgb="${c}"/><name val="Calibri"/></font>`;
      }
      stylesXml = stylesXml.replace(
        /(<\/fonts>)/,
        () => fontsXml + "</fonts>"
      );
      stylesXml = stylesXml.replace(
        /(<fonts count=")\d+(">)/,
        (match, p1, p2) => `${p1}${1 + uniqueColors.length}${p2}`
      );

      let cellXfsXml = "";
      for (const c of uniqueColors) {
        const fi = colorToFontIdx[c];
        cellXfsXml += `<xf numFmtId="0" fontId="${fi}" fillId="0" borderId="0" xfId="0"/>`;
      }
      stylesXml = stylesXml.replace(
        /(<\/cellXfs>)/,
        () => cellXfsXml + "</cellXfs>"
      );
      stylesXml = stylesXml.replace(
        /(<cellXfs count=")\d+(">)/,
        (match, p1, p2) => `${p1}${1 + uniqueColors.length}${p2}`
      );

      zip.addFile("xl/styles.xml", Buffer.from(stylesXml, "utf8"));
    }

    for (let si = 0; si < colStyleBySheet.length; si++) {
      const cs = colStyleBySheet[si].colStyles;
      const colKeys = Object.keys(cs);
      if (colKeys.length === 0) continue;
      const entryName = `xl/worksheets/sheet${si + 1}.xml`;
      const entry = zip.getEntry(entryName);
      if (!entry) continue;
      let sheetXml = entry.getData().toString("utf8");
      for (const ciStr of colKeys) {
        const ci = parseInt(ciStr, 10);
        const xfIdx = cs[ci];
        const colLetter = String.fromCharCode(65 + ci);
        const cellRef = colLetter + "1";
        sheetXml = sheetXml.replace(
          new RegExp(`<c r="${cellRef}"`, "g"),
          `<c r="${cellRef}" s="${xfIdx}"`
        );
      }
      zip.addFile(entryName, Buffer.from(sheetXml, "utf8"));
    }

    const tmpPath = targetPath + ".tmp." + Date.now();
    zip.writeZip(tmpPath);
    fs.renameSync(tmpPath, targetPath);
  } catch (e) {
    console.error("Style post-processing failed (non-fatal):", e && e.message ? e.message : e);
  }

  return targetPath;
}

let toolsExcelSyncTimer = null;
let toolsExcelSyncPending = false;
let toolsExcelLastSignature = "";
const toolsExcelHashByBase = {};

function cancelToolsExcelSync() {
  if (toolsExcelSyncTimer) {
    clearTimeout(toolsExcelSyncTimer);
    toolsExcelSyncTimer = null;
  }
  toolsExcelSyncPending = false;
}

function isValidExcelFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return false;
    const stat = fs.statSync(filePath);
    if (stat.size < 4000) return false;
    const fd = fs.openSync(filePath, "r");
    const buf = Buffer.alloc(4);
    fs.readSync(fd, buf, 0, buf.length, 0);
    fs.closeSync(fd);
    return buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04;
  } catch (e) {
    return false;
  }
}

function hashJsonPayload(data) {
  try {
    const raw = JSON.stringify(data);
    return crypto.createHash("sha1").update(raw).digest("hex");
  } catch (e) {
    return "";
  }
}

function scheduleToolsExcelSync(base, data) {
  if (!TOOLS_SYNC_BASENAMES.has(base)) return;

  const currentHash = hashJsonPayload(data);
  if (currentHash && toolsExcelHashByBase[base] === currentHash) {
    return;
  }
  toolsExcelHashByBase[base] = currentHash;

  toolsExcelSyncPending = true;
  if (toolsExcelSyncTimer) clearTimeout(toolsExcelSyncTimer);

  toolsExcelSyncTimer = setTimeout(() => {
    toolsExcelSyncTimer = null;
    if (!toolsExcelSyncPending) return;

    const keys = Object.keys(toolsExcelHashByBase).sort();
    const parts = [];
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      const h = toolsExcelHashByBase[k] != null ? String(toolsExcelHashByBase[k]) : "";
      parts.push(k + ":" + h);
    }
    const signature = parts.join("|");

    if (signature && signature === toolsExcelLastSignature) {
      toolsExcelSyncPending = false;
      return;
    }

    try {
      exportToolsExcel();
      toolsExcelLastSignature = signature;
    } catch (e) {
      console.error("Tools Excel sync failed:", e && e.message ? e.message : e);
    } finally {
      toolsExcelSyncPending = false;
    }
  }, 1500);
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
      wall_bracket REAL NOT NULL DEFAULT 0,
      FOREIGN KEY(type_id) REFERENCES types(id) ON DELETE CASCADE,
      FOREIGN KEY(utility_id) REFERENCES utilities(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS global_rates (
      rate_key TEXT PRIMARY KEY,
      rate_value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS system_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      master_excel_path TEXT,
      profit_margin_percentage REAL DEFAULT 0.0
    );

    INSERT INTO system_config (id, master_excel_path, profit_margin_percentage)
    VALUES (1, NULL, 0.0)
    ON CONFLICT(id) DO NOTHING;

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
      hanger_pipe REAL NOT NULL DEFAULT 0,
      hanger_pipe_fitting REAL NOT NULL DEFAULT 0,
      locks REAL NOT NULL DEFAULT 0,
      drawer_handles REAL NOT NULL DEFAULT 0,
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

  database
    .prepare(`
      INSERT INTO credentials (id, password, primary_password)
      VALUES (1, ?, ?)
      ON CONFLICT(id) DO NOTHING
    `)
    .run(DEFAULT_LOGIN_PASSWORD, DEFAULT_PRIMARY_PASSWORD);

  // ALTER TABLE migrations for existing databases — safe to run multiple times
  const hardwaresCols = database.prepare("PRAGMA table_info(hardwares)").all().map((c) => c.name);
  if (!hardwaresCols.includes("hanger_pipe")) database.exec("ALTER TABLE hardwares ADD COLUMN hanger_pipe REAL NOT NULL DEFAULT 0");
  if (!hardwaresCols.includes("hanger_pipe_fitting")) database.exec("ALTER TABLE hardwares ADD COLUMN hanger_pipe_fitting REAL NOT NULL DEFAULT 0");
  if (!hardwaresCols.includes("locks")) database.exec("ALTER TABLE hardwares ADD COLUMN locks REAL NOT NULL DEFAULT 0");
  if (!hardwaresCols.includes("drawer_handles")) database.exec("ALTER TABLE hardwares ADD COLUMN drawer_handles REAL NOT NULL DEFAULT 0");

  const codesCols = database.prepare("PRAGMA table_info(codes)").all().map((c) => c.name);
  if (!codesCols.includes("wall_bracket")) database.exec("ALTER TABLE codes ADD COLUMN wall_bracket REAL NOT NULL DEFAULT 0");
}

function normalizedToolTitle(value) {
  return value != null ? String(value).trim().toLowerCase() : "";
}

function scopedToolPart(value) {
  return value != null ? String(value).trim() : "";
}

function visibleCodeToolPart(row) {
  const code = row && row.code != null ? String(row.code).trim().toLowerCase() : "";
  if (code) return code;
  return scopedToolPart(row && row.code_id);
}

function duplicateToolKey(base, row) {
  const title = normalizedToolTitle(row && row.title);
  if (!title) return "";

  if (base === ".utilities.json") {
    return title;
  }

  if (base === ".types.json") {
    return `${scopedToolPart(row && row.utility_id)}::${title}`;
  }

  if (base === ".codes.json") {
    return `${scopedToolPart(row && row.utility_id)}::${scopedToolPart(row && row.type_id)}::${title}`;
  }

  if (
    base === ".doors.json" ||
    base === ".hardwares.json" ||
    base === ".handlers.json" ||
    base === ".shelves.json"
  ) {
    return `${scopedToolPart(row && row.utility_id)}::${visibleCodeToolPart(row)}::${title}`;
  }

  return "";
}

function hasDuplicateToolRows(base, data) {
  if (!Array.isArray(data)) return false;
  const seen = new Set();

  for (const row of data) {
    const key = duplicateToolKey(base, row);
    if (!key) continue;
    if (seen.has(key)) return true;
    seen.add(key);
  }

  return false;
}

function mergeDuplicateIds(database, table, groupByColumns, childRefs) {
  const groupExpr = groupByColumns.concat(["LOWER(TRIM(title))"]).join(", ");
  const rows = database
    .prepare(
      `
        SELECT MIN(id) AS keep_id, GROUP_CONCAT(id) AS ids
        FROM ${table}
        GROUP BY ${groupExpr}
        HAVING COUNT(*) > 1
      `
    )
    .all();

  if (!rows || rows.length === 0) return;

  const updates = (childRefs || []).map((ref) =>
    database.prepare(`UPDATE ${ref.table} SET ${ref.column} = ? WHERE ${ref.column} = ?`)
  );
  const del = database.prepare(`DELETE FROM ${table} WHERE id = ?`);

  for (const row of rows) {
    const keepId = row && row.keep_id != null ? Number(row.keep_id) : null;
    const ids = row && row.ids != null ? String(row.ids).split(",").map((v) => Number(v)) : [];
    if (keepId == null || !ids.length) continue;

    for (const id of ids) {
      if (id === keepId || Number.isNaN(id)) continue;
      for (const stmt of updates) stmt.run(keepId, id);
      del.run(id);
    }
  }
}

function remapPricingPayloadToolIds(database, fieldName, idMap) {
  if (!idMap || idMap.size === 0) return;

  const rows = database.prepare("SELECT id, payload_json FROM pricings").all();
  const update = database.prepare("UPDATE pricings SET payload_json = ? WHERE id = ?");

  for (const row of rows) {
    if (!row || row.payload_json == null) continue;

    let payload = null;
    try {
      payload = JSON.parse(row.payload_json);
    } catch (e) {
      continue;
    }

    if (!payload || typeof payload !== "object") continue;

    let changed = false;
    Object.keys(payload).forEach((key) => {
      if (key === "pinfo") return;
      const items = payload[key];
      if (!Array.isArray(items)) return;

      items.forEach((item) => {
        if (!item || item[fieldName] == null || item[fieldName] === "") return;
        const currentId = String(item[fieldName]);
        const mappedId = idMap.get(currentId);
        if (mappedId == null || String(mappedId) === currentId) return;
        item[fieldName] = String(mappedId);
        changed = true;
      });
    });

    if (changed) {
      update.run(JSON.stringify(payload), row.id);
    }
  }
}

function mergeVisibleCodeDuplicates(database, table, pricingField) {
  const rows = database
    .prepare(
      `
        SELECT MIN(t.id) AS keep_id, GROUP_CONCAT(t.id) AS ids
        FROM ${table} t
        LEFT JOIN codes c ON c.id = t.code_id
        GROUP BY
          COALESCE(t.utility_id, -1),
          LOWER(TRIM(t.title)),
          LOWER(TRIM(COALESCE(c.title, '')))
        HAVING COUNT(*) > 1
      `
    )
    .all();

  if (!rows || rows.length === 0) return;

  const idMap = new Map();
  const del = database.prepare(`DELETE FROM ${table} WHERE id = ?`);

  for (const row of rows) {
    const keepId = row && row.keep_id != null ? Number(row.keep_id) : null;
    const ids = row && row.ids != null ? String(row.ids).split(",").map((v) => Number(v)) : [];
    if (keepId == null || !ids.length) continue;

    for (const id of ids) {
      if (id === keepId || Number.isNaN(id)) continue;
      idMap.set(String(id), String(keepId));
      del.run(id);
    }
  }

  remapPricingPayloadToolIds(database, pricingField, idMap);
}

function createVisibleCodeUniquenessTriggers(database, table) {
  const insertTrigger = `trg_${table}_visible_code_unique_insert`;
  const updateTrigger = `trg_${table}_visible_code_unique_update`;

  database.exec(`
    DROP TRIGGER IF EXISTS ${insertTrigger};
    DROP TRIGGER IF EXISTS ${updateTrigger};

    CREATE TRIGGER ${insertTrigger}
    BEFORE INSERT ON ${table}
    FOR EACH ROW
    BEGIN
      SELECT CASE
        WHEN EXISTS (
          SELECT 1
          FROM ${table} existing
          LEFT JOIN codes existing_code ON existing_code.id = existing.code_id
          LEFT JOIN codes new_code ON new_code.id = NEW.code_id
          WHERE existing.id != NEW.id
            AND COALESCE(existing.utility_id, -1) = COALESCE(NEW.utility_id, -1)
            AND LOWER(TRIM(existing.title)) = LOWER(TRIM(NEW.title))
            AND LOWER(TRIM(COALESCE(existing_code.title, ''))) = LOWER(TRIM(COALESCE(new_code.title, '')))
        )
        THEN RAISE(ABORT, 'Duplicate title and code already exists.')
      END;
    END;

    CREATE TRIGGER ${updateTrigger}
    BEFORE UPDATE ON ${table}
    FOR EACH ROW
    BEGIN
      SELECT CASE
        WHEN EXISTS (
          SELECT 1
          FROM ${table} existing
          LEFT JOIN codes existing_code ON existing_code.id = existing.code_id
          LEFT JOIN codes new_code ON new_code.id = NEW.code_id
          WHERE existing.id != OLD.id
            AND COALESCE(existing.utility_id, -1) = COALESCE(NEW.utility_id, -1)
            AND LOWER(TRIM(existing.title)) = LOWER(TRIM(NEW.title))
            AND LOWER(TRIM(COALESCE(existing_code.title, ''))) = LOWER(TRIM(COALESCE(new_code.title, '')))
        )
        THEN RAISE(ABORT, 'Duplicate title and code already exists.')
      END;
    END;
  `);
}

function ensureToolUniqueness(database) {
  const tx = database.transaction(() => {
    mergeDuplicateIds(database, "utilities", [], [
      { table: "types", column: "utility_id" },
      { table: "codes", column: "utility_id" },
      { table: "doors", column: "utility_id" },
      { table: "hardwares", column: "utility_id" },
      { table: "handlers", column: "utility_id" },
      { table: "shelves", column: "utility_id" },
    ]);

    mergeDuplicateIds(database, "types", ["COALESCE(utility_id, -1)"], [
      { table: "codes", column: "type_id" },
      { table: "doors", column: "type_id" },
      { table: "hardwares", column: "type_id" },
      { table: "handlers", column: "type_id" },
      { table: "shelves", column: "type_id" },
    ]);

    mergeDuplicateIds(database, "codes", ["COALESCE(utility_id, -1)", "COALESCE(type_id, -1)"], [
      { table: "doors", column: "code_id" },
      { table: "hardwares", column: "code_id" },
      { table: "handlers", column: "code_id" },
      { table: "shelves", column: "code_id" },
    ]);

    mergeVisibleCodeDuplicates(database, "doors", "door_panel");
    mergeVisibleCodeDuplicates(database, "hardwares", "hardware");
    mergeVisibleCodeDuplicates(database, "handlers", "handler");
    mergeVisibleCodeDuplicates(database, "shelves", "shelves");

    database.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_utilities_unique_title_nocase
      ON utilities(LOWER(TRIM(title)));

      CREATE UNIQUE INDEX IF NOT EXISTS idx_types_unique_scope_title
      ON types(COALESCE(utility_id, -1), LOWER(TRIM(title)));

      CREATE UNIQUE INDEX IF NOT EXISTS idx_codes_unique_scope_title
      ON codes(COALESCE(utility_id, -1), COALESCE(type_id, -1), LOWER(TRIM(title)));

      DROP INDEX IF EXISTS idx_doors_unique_scope_title;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_doors_unique_scope_title
      ON doors(COALESCE(utility_id, -1), COALESCE(code_id, -1), LOWER(TRIM(title)));

      DROP INDEX IF EXISTS idx_hardwares_unique_scope_title;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_hardwares_unique_scope_title
      ON hardwares(COALESCE(utility_id, -1), COALESCE(code_id, -1), LOWER(TRIM(title)));

      DROP INDEX IF EXISTS idx_handlers_unique_scope_title;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_handlers_unique_scope_title
      ON handlers(COALESCE(utility_id, -1), COALESCE(code_id, -1), LOWER(TRIM(title)));

      DROP INDEX IF EXISTS idx_shelves_unique_scope_title;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_shelves_unique_scope_title
      ON shelves(COALESCE(utility_id, -1), COALESCE(code_id, -1), LOWER(TRIM(title)));
    `);

    createVisibleCodeUniquenessTriggers(database, "doors");
    createVisibleCodeUniquenessTriggers(database, "hardwares");
    createVisibleCodeUniquenessTriggers(database, "handlers");
    createVisibleCodeUniquenessTriggers(database, "shelves");
  });

  tx();
}

function getSystemConfig() {
  const database = requireDbOrThrow();

  const row = database.prepare("SELECT master_excel_path, profit_margin_percentage FROM system_config WHERE id = 1").get();
  return {
    master_excel_path: row && row.master_excel_path != null ? String(row.master_excel_path) : "",
    profit_margin_percentage: row && row.profit_margin_percentage != null ? Number(row.profit_margin_percentage) : 0,
  };
}

function setSystemConfig(data) {
  const database = requireDbOrThrow();

  const current = getSystemConfig();
  const masterExcelPath =
    data && data.master_excel_path != null ? String(data.master_excel_path) : current.master_excel_path;
  const profitMargin =
    data && data.profit_margin_percentage != null ? Number(data.profit_margin_percentage) : current.profit_margin_percentage;

  database
    .prepare(
      "INSERT INTO system_config (id, master_excel_path, profit_margin_percentage) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET master_excel_path=excluded.master_excel_path, profit_margin_percentage=excluded.profit_margin_percentage"
    )
    .run(masterExcelPath, profitMargin);

  return getSystemConfig();
}

function safeReadJsonFile(filePath) {
  const targetPath = fs.existsSync(filePath) ? filePath : `${filePath}.bak`;
  const raw = fs.readFileSync(targetPath, { encoding: "utf8" });
  return JSON.parse(raw);
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
    INSERT INTO codes (id, type_id, utility_id, title, rate, back_area, edging, screws, secondary_top, wall_bracket)
    VALUES (@id, @type_id, @utility_id, @title, @rate, @back_area, @edging, @screws, @secondary_top, @wall_bracket)
    ON CONFLICT(id) DO UPDATE SET
      type_id=excluded.type_id,
      utility_id=excluded.utility_id,
      title=excluded.title,
      rate=excluded.rate,
      back_area=excluded.back_area,
      edging=excluded.edging,
      screws=excluded.screws,
      secondary_top=excluded.secondary_top,
      wall_bracket=excluded.wall_bracket
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
      wall_bracket: c && c.wall_bracket != null ? Number(c.wall_bracket) : 0,
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
    INSERT INTO hardwares (id, title, rate, slider, lift, hanger_pipe, hanger_pipe_fitting, locks, drawer_handles, utility_id, type_id, code_id)
    VALUES (@id, @title, @rate, @slider, @lift, @hanger_pipe, @hanger_pipe_fitting, @locks, @drawer_handles, @utility_id, @type_id, @code_id)
    ON CONFLICT(id) DO UPDATE SET
      title=excluded.title,
      rate=excluded.rate,
      slider=excluded.slider,
      lift=excluded.lift,
      hanger_pipe=excluded.hanger_pipe,
      hanger_pipe_fitting=excluded.hanger_pipe_fitting,
      locks=excluded.locks,
      drawer_handles=excluded.drawer_handles,
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
      hanger_pipe: h && h.hanger_pipe != null ? Number(h.hanger_pipe) : 0,
      hanger_pipe_fitting: h && h.hanger_pipe_fitting != null ? Number(h.hanger_pipe_fitting) : 0,
      locks: h && h.locks != null ? Number(h.locks) : 0,
      drawer_handles: h && h.drawer_handles != null ? Number(h.drawer_handles) : 0,
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
        `SELECT c.id, c.title, c.rate, c.back_area, c.edging, c.screws, c.secondary_top, c.wall_bracket,
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
      wall_bracket: String(r.wall_bracket != null ? r.wall_bracket : 0),
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
                h.hanger_pipe, h.hanger_pipe_fitting, h.locks, h.drawer_handles,
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
      hanger_pipe: String(r.hanger_pipe != null ? r.hanger_pipe : 0),
      hanger_pipe_fitting: String(r.hanger_pipe_fitting != null ? r.hanger_pipe_fitting : 0),
      locks: String(r.locks != null ? r.locks : 0),
      drawer_handles: String(r.drawer_handles != null ? r.drawer_handles : 0),
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

  function findFirstDependentUtilityId(utilityIds) {
    if (!utilityIds || utilityIds.size === 0) return null;
    const dependencyTables = ["types", "codes", "doors", "hardwares", "handlers", "shelves"];
    for (const utilityId of utilityIds) {
      const numericId = Number(utilityId);
      if (Number.isNaN(numericId)) continue;
      for (const table of dependencyTables) {
        const row = database.prepare(`SELECT 1 AS found FROM ${table} WHERE utility_id = ? LIMIT 1`).get(numericId);
        if (row && row.found) {
          return String(utilityId);
        }
      }
    }
    return null;
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
      if (!Array.isArray(data)) {
        return;
      }

      const incomingIds = new Set();
      for (const u of data) {
        const id = u && u.id != null ? String(u.id) : null;
        if (id) incomingIds.add(id);
      }

      const existingIds = new Set(
        database.prepare("SELECT id FROM utilities").all().map((r) => (r && r.id != null ? String(r.id) : ""))
      );
      const removedIds = new Set();
      existingIds.forEach((id) => {
        if (id && !incomingIds.has(id)) removedIds.add(id);
      });

      if (findFirstDependentUtilityId(removedIds)) {
        throw new Error("UTILITY_IN_USE");
      }

      deleteMissingById("utilities", "id", incomingIds);
      migrateUtilities(database, data);
    });
    try {
      tx();
      return "success";
    } catch (e) {
      if (e && e.message === "UTILITY_IN_USE") {
        return "in_use";
      }
      throw e;
    }
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

  const database = requireDbOrThrow();
  const result = loadFromSqlite(database, base);
  if (result != null) return result;
  try {
    return safeReadJsonFile(filePath);
  } catch (e) {
    return null;
  }
}

function write(filePath, data) {
  const base = path.basename(filePath);
  if (hasDuplicateToolRows(base, data)) {
    return "duplicate";
  }
  if (!SQLITE_TARGET_BASENAMES.has(base)) {
    fs.writeFileSync(filePath, JSON.stringify(data));
    return "success";
  }

  const database = requireDbOrThrow();
  const res = writeToSqlite(database, base, data);
  if (res === "success" || res == null) scheduleToolsExcelSync(base, data);
  return res || "success";
}

function mergeTypes(data) {
  const database = requireDbOrThrow();
  const tx = database.transaction(() => {
    if (!Array.isArray(data) || data.length === 0) {
      return;
    }
    migrateTypes(database, data);
  });
  tx();
  scheduleToolsExcelSync(".types.json", data);
  return "success";
}

function mergeUtilities(data) {
  const database = requireDbOrThrow();
  const tx = database.transaction(() => {
    if (!Array.isArray(data) || data.length === 0) {
      return;
    }
    migrateUtilities(database, data);
  });
  tx();
  scheduleToolsExcelSync(".utilities.json", data);
  return "success";
}

function searchCodes(opts) {
  const query = opts && opts.query != null ? String(opts.query) : "";
  const utilityIdRaw = opts && opts.utility_id != null ? String(opts.utility_id) : "";
  const typeIdRaw = opts && opts.type_id != null ? String(opts.type_id) : "";
  const limitRaw = opts && opts.limit != null ? Number(opts.limit) : 300;
  const limit = limitRaw && limitRaw > 0 ? Math.min(limitRaw, 2000) : 300;

  const database = requireDbOrThrow();

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

  const database = requireDbOrThrow();

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

  const database = requireDbOrThrow();

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
      h.hanger_pipe, h.hanger_pipe_fitting, h.locks, h.drawer_handles,
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
      hanger_pipe: String(r.hanger_pipe != null ? r.hanger_pipe : 0),
      hanger_pipe_fitting: String(r.hanger_pipe_fitting != null ? r.hanger_pipe_fitting : 0),
      locks: String(r.locks != null ? r.locks : 0),
      drawer_handles: String(r.drawer_handles != null ? r.drawer_handles : 0),
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

  const database = requireDbOrThrow();

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

  const database = requireDbOrThrow();

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

  const database = requireDbOrThrow();
  const row = database.prepare(`SELECT MAX(id) AS max_id FROM ${table}`).get();
  const maxId = row && row.max_id != null ? Number(row.max_id) : 0;
  return maxId + 1;
}

module.exports = {
  load,
  write,
  mergeUtilities,
  mergeTypes,
  initializeDatabase,
  seedDatabaseFromBundledBackupIfNeeded,
  repairToolDatabases,
  backupDatabase,
  restoreDatabase,
  searchCodes,
  searchDoors,
  searchHardwares,
  searchHandlers,
  searchShelves,
  nextIdFor,
  getSystemConfig,
  setSystemConfig,
  exportToolsExcel,
  cancelToolsExcelSync,
  isValidExcelFile,
};
