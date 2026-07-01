const path = require("path");
const fs = require("fs");

function asString(v) {
  if (v == null) return "";
  return String(v);
}

function asNumber(v) {
  if (v == null) return 0;
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function toRowsUtilities(rows) {
  return (rows || []).map((r) => ({
    id: asString(r && r.id),
    title: asString(r && r.title),
  }));
}

function toRowsTypes(rows) {
  return (rows || []).map((r) => ({
    id: asString(r && r.id),
    utility_id: asString(r && r.utility_id),
    title: asString(r && r.title),
    utility: asString(r && r.utility),
  }));
}

function toRowsCodes(rows) {
  return (rows || []).map((r) => ({
    id: asString(r && r.id),
    utility_id: asString(r && r.utility_id),
    type_id: asString(r && r.type_id),
    title: asString(r && r.title),
    utility: asString(r && r.utility),
    type: asString(r && r.type),
    rate: asNumber(r && r.rate),
    back_area: asNumber(r && r.back_area),
    secondary_top: asNumber(r && r.secondary_top),
    edging: asNumber(r && r.edging),
    screws: asNumber(r && r.screws),
    wall_bracket: asNumber(r && r.wall_bracket),
  }));
}

function toRowsDoors(rows) {
  return (rows || []).map((r) => ({
    id: asString(r && r.id),
    utility_id: asString(r && r.utility_id),
    type_id: asString(r && r.type_id),
    code_id: asString(r && r.code_id),
    title: asString(r && r.title),
    utility: asString(r && r.utility),
    type: asString(r && r.type),
    code: asString(r && r.code),
    rate: asNumber(r && r.rate),
    edging: asNumber(r && r.edging),
  }));
}

function toRowsHardwares(rows) {
  return (rows || []).map((r) => ({
    id: asString(r && r.id),
    utility_id: asString(r && r.utility_id),
    type_id: asString(r && r.type_id),
    code_id: asString(r && r.code_id),
    title: asString(r && r.title),
    utility: asString(r && r.utility),
    type: asString(r && r.type),
    code: asString(r && r.code),
    rate: asNumber(r && r.rate),
    slider: asNumber(r && r.slider),
    lift: asNumber(r && r.lift),
    hanger_pipe: asNumber(r && r.hanger_pipe),
    hanger_pipe_fitting: asNumber(r && r.hanger_pipe_fitting),
    locks: asNumber(r && r.locks),
    drawer_handles: asNumber(r && r.drawer_handles),
  }));
}

function toRowsHandlers(rows) {
  return (rows || []).map((r) => ({
    id: asString(r && r.id),
    utility_id: asString(r && r.utility_id),
    type_id: asString(r && r.type_id),
    code_id: asString(r && r.code_id),
    title: asString(r && r.title),
    utility: asString(r && r.utility),
    type: asString(r && r.type),
    code: asString(r && r.code),
    rate: asNumber(r && r.rate),
  }));
}

function toRowsShelves(rows) {
  return (rows || []).map((r) => ({
    id: asString(r && r.id),
    utility_id: asString(r && r.utility_id),
    type_id: asString(r && r.type_id),
    code_id: asString(r && r.code_id),
    title: asString(r && r.title),
    utility: asString(r && r.utility),
    type: asString(r && r.type),
    code: asString(r && r.code),
    rate: asNumber(r && r.rate),
    pin: asNumber(r && r.pin),
    edging: asNumber(r && r.edging),
  }));
}

function jsonToSheet(XLSX, rows, header) {
  const sheet = XLSX.utils.json_to_sheet(rows || [], { header: header, skipHeader: false });
  return sheet;
}

async function readJsonFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return [];
    const raw = await fs.promises.readFile(filePath, { encoding: "utf8" });
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

function tryReadFromSqlite(dbPath) {
  if (!dbPath) return null;
  const p = String(dbPath);
  if (!fs.existsSync(p)) return null;

  let Database;
  try {
    Database = require("better-sqlite3");
  } catch (e) {
    return null;
  }

  const db = new Database(p, { readonly: true });
  try {
    const utilities = db.prepare("SELECT id, title FROM utilities ORDER BY id").all();
    const types = db
      .prepare(
        "SELECT t.id, t.title, t.utility_id, u.title AS utility FROM types t LEFT JOIN utilities u ON u.id = t.utility_id ORDER BY t.id"
      )
      .all();
    const codes = db
      .prepare(
        "SELECT c.id, c.title, c.utility_id, u.title AS utility, c.type_id, t.title AS type, c.rate, c.back_area, c.secondary_top, c.edging, c.screws FROM codes c LEFT JOIN utilities u ON u.id = c.utility_id LEFT JOIN types t ON t.id = c.type_id ORDER BY c.id"
      )
      .all();
    const doors = db
      .prepare(
        "SELECT d.id, d.title, d.utility_id, u.title AS utility, d.type_id, t.title AS type, d.code_id, c.title AS code, d.rate, d.edging FROM doors d LEFT JOIN utilities u ON u.id = d.utility_id LEFT JOIN types t ON t.id = d.type_id LEFT JOIN codes c ON c.id = d.code_id ORDER BY d.id"
      )
      .all();
    const hardwares = db
      .prepare(
        "SELECT h.id, h.title, h.utility_id, u.title AS utility, h.type_id, t.title AS type, h.code_id, c.title AS code, h.rate, h.slider, h.lift FROM hardwares h LEFT JOIN utilities u ON u.id = h.utility_id LEFT JOIN types t ON t.id = h.type_id LEFT JOIN codes c ON c.id = h.code_id ORDER BY h.id"
      )
      .all();
    const handlers = db
      .prepare(
        "SELECT h.id, h.title, h.utility_id, u.title AS utility, h.type_id, t.title AS type, h.code_id, c.title AS code, h.rate FROM handlers h LEFT JOIN utilities u ON u.id = h.utility_id LEFT JOIN types t ON t.id = h.type_id LEFT JOIN codes c ON c.id = h.code_id ORDER BY h.id"
      )
      .all();
    const shelves = db
      .prepare(
        "SELECT s.id, s.title, s.utility_id, u.title AS utility, s.type_id, t.title AS type, s.code_id, c.title AS code, s.rate, s.pin, s.edging FROM shelves s LEFT JOIN utilities u ON u.id = s.utility_id LEFT JOIN types t ON t.id = s.type_id LEFT JOIN codes c ON c.id = s.code_id ORDER BY s.id"
      )
      .all();

    return { utilities: utilities, types: types, codes: codes, doors: doors, hardwares: hardwares, handlers: handlers, shelves: shelves };
  } finally {
    try {
      db.close();
    } catch (e) {}
  }
}

function getArgValue(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return "";
  const v = process.argv[idx + 1];
  return v != null ? String(v) : "";
}

function getExcelPath(app) {
  if (app && app.isPackaged) {
    const exeDir = path.dirname(process.execPath);
    return path.join(exeDir, "data", "Tools_Data.xlsx");
  }
  // Dev mode: place next to index.js (project root)
  return path.join(__dirname, "../Tools_Data.xlsx");
}

async function main(app) {
  const XLSX = require("xlsx");

  const dbDir = path.join(__dirname, "../src/db");
  const paths = {
    utilities: path.join(dbDir, ".utilities.json"),
    types: path.join(dbDir, ".types.json"),
    codes: path.join(dbDir, ".codes.json"),
    doors: path.join(dbDir, ".doors.json"),
    hardwares: path.join(dbDir, ".hardwares.json"),
    handlers: path.join(dbDir, ".handlers.json"),
    shelves: path.join(dbDir, ".shelves.json"),
  };

  const outPath = getExcelPath(app);

  const sqlitePath = getArgValue("--db") || (process.env.CABINET_COSTING_DB_PATH ? String(process.env.CABINET_COSTING_DB_PATH) : "");
  const fromSqlite = tryReadFromSqlite(sqlitePath);

  const utilities = fromSqlite ? fromSqlite.utilities : await readJsonFile(paths.utilities);
  const types = fromSqlite ? fromSqlite.types : await readJsonFile(paths.types);
  const codes = fromSqlite ? fromSqlite.codes : await readJsonFile(paths.codes);
  const doors = fromSqlite ? fromSqlite.doors : await readJsonFile(paths.doors);
  const hardwares = fromSqlite ? fromSqlite.hardwares : await readJsonFile(paths.hardwares);
  const handlers = fromSqlite ? fromSqlite.handlers : await readJsonFile(paths.handlers);
  const shelves = fromSqlite ? fromSqlite.shelves : await readJsonFile(paths.shelves);

  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, jsonToSheet(XLSX, toRowsUtilities(utilities), ["id", "title"]), "Utilities");
  XLSX.utils.book_append_sheet(wb, jsonToSheet(XLSX, toRowsTypes(types), ["id", "title", "utility_id", "utility"]), "Descriptions");
  XLSX.utils.book_append_sheet(
    wb,
    jsonToSheet(XLSX, toRowsCodes(codes), ["id", "title", "utility_id", "utility", "type_id", "type", "rate", "back_area", "secondary_top", "edging", "screws", "wall_bracket"]),
    "Codes"
  );
  XLSX.utils.book_append_sheet(
    wb,
    jsonToSheet(XLSX, toRowsDoors(doors), ["id", "title", "utility_id", "utility", "type_id", "type", "code_id", "code", "rate", "edging"]),
    "Finishing"
  );
  XLSX.utils.book_append_sheet(
    wb,
    jsonToSheet(XLSX, toRowsHardwares(hardwares), ["id", "title", "utility_id", "utility", "type_id", "type", "code_id", "code", "rate", "slider", "lift", "hanger_pipe", "hanger_pipe_fitting", "locks", "drawer_handles"]),
    "Hardware"
  );
  XLSX.utils.book_append_sheet(
    wb,
    jsonToSheet(XLSX, toRowsHandlers(handlers), ["id", "title", "utility_id", "utility", "type_id", "type", "code_id", "code", "rate"]),
    "Handles"
  );
  XLSX.utils.book_append_sheet(
    wb,
    jsonToSheet(XLSX, toRowsShelves(shelves), ["id", "title", "utility_id", "utility", "type_id", "type", "code_id", "code", "rate", "pin", "edging"]),
    "Adjustable Shelves"
  );

  await XLSX.writeFile(wb, outPath);
  return outPath;
}

module.exports = {
  getExcelPath,
  main
};