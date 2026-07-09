const path = require("path");
const fs = require("fs");

const TOOL_COLORS = {
  "Utility Id": "FF2F5496", "Utility Title": "FF2F5496",
  "Description Id": "FF375623", "Description Title": "FF375623",
  "Code Id": "FFBF6000", "Code Title": "FFBF6000",
  "Finishing Id": "FF5B2C8E", "Finishing Title": "FF5B2C8E",
  "Hardware Id": "FF0070C0", "Hardware Title": "FF0070C0",
  "Handle Id": "FFC00000", "Handle Title": "FFC00000",
  "Shelf Id": "FF806000", "Shelf Title": "FF806000",
};

function applyColumnWidths(XLSX, ws) {
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
    "Utility Id": asString(r && r.id),
    "Utility Title": asString(r && r.title),
  }));
}

function toRowsTypes(rows) {
  return (rows || []).map((r) => ({
    "Utility Id": asString(r && r.utility_id),
    "Utility Title": asString(r && r.utility),
    "Description Id": asString(r && r.id),
    "Description Title": asString(r && r.title),
  }));
}

function toRowsCodes(rows) {
  return (rows || []).map((r) => ({
    "Utility Id": asString(r && r.utility_id),
    "Utility Title": asString(r && r.utility),
    "Description Id": asString(r && r.type_id),
    "Description Title": asString(r && r.type),
    "Code Id": asString(r && r.id),
    "Code Title": asString(r && r.title),
    "Box Sheet": asNumber(r && r.rate),
    "Back Sheet": asNumber(r && r.back_area),
    Top: asNumber(r && r.secondary_top),
    Edging: asNumber(r && r.edging),
    Screws: asNumber(r && r.screws),
    "Wall Bracket": asNumber(r && r.wall_bracket),
  }));
}

function toRowsDoors(rows) {
  return (rows || []).map((r) => ({
    "Utility Id": asString(r && r.utility_id),
    "Utility Title": asString(r && r.utility),
    "Description Id": asString(r && r.type_id),
    "Description Title": asString(r && r.type),
    "Code Id": asString(r && r.code_id),
    "Code Title": asString(r && r.code),
    "Finishing Id": asString(r && r.id),
    "Finishing Title": asString(r && r.title),
    "Panel Area": asNumber(r && r.rate),
    Edging: asNumber(r && r.edging),
  }));
}

function toRowsHardwares(rows) {
  return (rows || []).map((r) => ({
    "Utility Id": asString(r && r.utility_id),
    "Utility Title": asString(r && r.utility),
    "Description Id": asString(r && r.type_id),
    "Description Title": asString(r && r.type),
    "Code Id": asString(r && r.code_id),
    "Code Title": asString(r && r.code),
    "Hardware Id": asString(r && r.id),
    "Hardware Title": asString(r && r.title),
    "Hinges Set": asNumber(r && r.rate),
    "Sliders Set": asNumber(r && r.slider),
    "Lift Up Set": asNumber(r && r.lift),
    "Hanger Pipe Length": asNumber(r && r.hanger_pipe),
    "Pipe Fitting": asNumber(r && r.hanger_pipe_fitting),
    Locks: asNumber(r && r.locks),
    "Internal Handle": asNumber(r && r.drawer_handles),
  }));
}

function toRowsHandlers(rows) {
  return (rows || []).map((r) => ({
    "Utility Id": asString(r && r.utility_id),
    "Utility Title": asString(r && r.utility),
    "Description Id": asString(r && r.type_id),
    "Description Title": asString(r && r.type),
    "Code Id": asString(r && r.code_id),
    "Code Title": asString(r && r.code),
    "Handle Id": asString(r && r.id),
    "Handle Title": asString(r && r.title),
    Quantity: asNumber(r && r.rate),
  }));
}

function toRowsShelves(rows) {
  return (rows || []).map((r) => ({
    "Utility Id": asString(r && r.utility_id),
    "Utility Title": asString(r && r.utility),
    "Description Id": asString(r && r.type_id),
    "Description Title": asString(r && r.type),
    "Code Id": asString(r && r.code_id),
    "Code Title": asString(r && r.code),
    "Shelf Id": asString(r && r.id),
    "Shelf Title": asString(r && r.title),
    "Shelve Area": asNumber(r && r.rate),
    "Pin Qty.": asNumber(r && r.pin),
    Edging: asNumber(r && r.edging),
  }));
}

function jsonToSheet(XLSX, rows, header) {
  const sheet = XLSX.utils.json_to_sheet(rows || [], { header: header, skipHeader: false });
  applyColumnWidths(XLSX, sheet);
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
        "SELECT c.id, c.title, c.utility_id, u.title AS utility, c.type_id, t.title AS type, c.rate, c.back_area, c.secondary_top, c.edging, c.screws, c.wall_bracket FROM codes c LEFT JOIN utilities u ON u.id = c.utility_id LEFT JOIN types t ON t.id = c.type_id ORDER BY c.id"
      )
      .all();
    const doors = db
      .prepare(
        "SELECT d.id, d.title, d.utility_id, u.title AS utility, d.type_id, t.title AS type, d.code_id, c.title AS code, d.rate, d.edging FROM doors d LEFT JOIN utilities u ON u.id = d.utility_id LEFT JOIN types t ON t.id = d.type_id LEFT JOIN codes c ON c.id = d.code_id ORDER BY d.id"
      )
      .all();
    const hardwares = db
      .prepare(
        "SELECT h.id, h.title, h.utility_id, u.title AS utility, h.type_id, t.title AS type, h.code_id, c.title AS code, h.rate, h.slider, h.lift, h.hanger_pipe, h.hanger_pipe_fitting, h.locks, h.drawer_handles FROM hardwares h LEFT JOIN utilities u ON u.id = h.utility_id LEFT JOIN types t ON t.id = h.type_id LEFT JOIN codes c ON c.id = h.code_id ORDER BY h.id"
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

function getDefaultDbPath(app) {
  if (app && app.isPackaged) {
    const exeDir = path.dirname(process.execPath);
    return path.join(exeDir, "data", "cabinet_costing.db");
  }

  try {
    const electron = require("electron");
    if (electron && electron.app) {
      return path.join(electron.app.getPath("userData"), "cabinet_costing.db");
    }
  } catch (e) {}

  return "";
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

  const sqlitePath =
    getArgValue("--db") ||
    (process.env.CABINET_COSTING_DB_PATH ? String(process.env.CABINET_COSTING_DB_PATH) : "") ||
    getDefaultDbPath(app);
  const fromSqlite = tryReadFromSqlite(sqlitePath);

  const utilities = fromSqlite ? fromSqlite.utilities : await readJsonFile(paths.utilities);
  const types = fromSqlite ? fromSqlite.types : await readJsonFile(paths.types);
  const codes = fromSqlite ? fromSqlite.codes : await readJsonFile(paths.codes);
  const doors = fromSqlite ? fromSqlite.doors : await readJsonFile(paths.doors);
  const hardwares = fromSqlite ? fromSqlite.hardwares : await readJsonFile(paths.hardwares);
  const handlers = fromSqlite ? fromSqlite.handlers : await readJsonFile(paths.handlers);
  const shelves = fromSqlite ? fromSqlite.shelves : await readJsonFile(paths.shelves);

  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, jsonToSheet(XLSX, toRowsUtilities(utilities), ["Utility Id", "Utility Title"]), "Utilities");
  XLSX.utils.book_append_sheet(wb, jsonToSheet(XLSX, toRowsTypes(types), ["Utility Id", "Utility Title", "Description Id", "Description Title"]), "Descriptions");
  XLSX.utils.book_append_sheet(
    wb,
    jsonToSheet(XLSX, toRowsCodes(codes), ["Utility Id", "Utility Title", "Description Id", "Description Title", "Code Id", "Code Title", "Box Sheet", "Back Sheet", "Top", "Edging", "Screws", "Wall Bracket"]),
    "Codes"
  );
  XLSX.utils.book_append_sheet(
    wb,
    jsonToSheet(XLSX, toRowsDoors(doors), ["Utility Id", "Utility Title", "Description Id", "Description Title", "Code Id", "Code Title", "Finishing Id", "Finishing Title", "Panel Area", "Edging"]),
    "Finishing"
  );
  XLSX.utils.book_append_sheet(
    wb,
    jsonToSheet(XLSX, toRowsHardwares(hardwares), ["Utility Id", "Utility Title", "Description Id", "Description Title", "Code Id", "Code Title", "Hardware Id", "Hardware Title", "Hinges Set", "Sliders Set", "Lift Up Set", "Hanger Pipe Length", "Pipe Fitting", "Locks", "Internal Handle"]),
    "Hardware"
  );
  XLSX.utils.book_append_sheet(
    wb,
    jsonToSheet(XLSX, toRowsHandlers(handlers), ["Utility Id", "Utility Title", "Description Id", "Description Title", "Code Id", "Code Title", "Handle Id", "Handle Title", "Quantity"]),
    "Handles"
  );
  XLSX.utils.book_append_sheet(
    wb,
    jsonToSheet(XLSX, toRowsShelves(shelves), ["Utility Id", "Utility Title", "Description Id", "Description Title", "Code Id", "Code Title", "Shelf Id", "Shelf Title", "Shelve Area", "Pin Qty.", "Edging"]),
    "Adjustable Shelves"
  );

  await XLSX.writeFile(wb, outPath);

  try {
    const AdmZip = require("adm-zip");
    const zip = new AdmZip(outPath);

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
      stylesXml = stylesXml.replace(/(<\/cellXfs>)/, () => cellXfsXml + "</cellXfs>");
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

    const tmpPath = outPath + ".tmp." + Date.now();
    zip.writeZip(tmpPath);
    fs.renameSync(tmpPath, outPath);
  } catch (e) {
    console.error("Style post-processing failed (non-fatal):", e && e.message ? e.message : e);
  }

  return outPath;
}

module.exports = {
  getExcelPath,
  main
};
