const { ipcRenderer } = require("electron");

let nextRequestId = 1;
const pending = {};

const cache = {};

ipcRenderer.on("store:rpc:reply", (event, message) => {
  const requestId = message && message.requestId;
  const handler = requestId != null ? pending[requestId] : null;
  if (!handler) return;

  delete pending[requestId];

  if (message && message.ok) handler.resolve(message.result);
  else handler.reject(new Error(message && message.error ? message.error : "Unknown error"));
});

function rpc(action, filePath, data) {
  const requestId = String(nextRequestId++);
  return new Promise((resolve, reject) => {
    pending[requestId] = { resolve, reject };
    ipcRenderer.send("store:rpc", { requestId, action, filePath, data });
  });
}

exports.loadFile = async (file) => {
  const key = String(file);
  const cached = cache[key];
  if (cached && cached.value !== undefined) {
    return cached.value;
  }
  if (cached && cached.inFlight) {
    return cached.inFlight;
  }

  const inFlight = rpc("load", key)
    .then((res) => {
      cache[key] = { value: res };
      return res;
    })
    .catch((err) => {
      if (cache[key] && cache[key].inFlight) delete cache[key].inFlight;
      throw err;
    });

  cache[key] = cache[key] || {};
  cache[key].inFlight = inFlight;
  return inFlight;
};

exports.writeFile = async (file, data) => {
  const key = String(file);
  const res = await rpc("write", key, data);
  if (res === "success") {
    cache[key] = { value: data };
  } else if (cache[key] && cache[key].inFlight) {
    delete cache[key].inFlight;
  }
  return res;
};

exports.searchCodes = async (query, utility_id, type_id, limit) => {
  const payload = {
    query: query != null ? String(query) : "",
    utility_id: utility_id != null ? String(utility_id) : "",
    type_id: type_id != null ? String(type_id) : "",
    limit: limit != null ? Number(limit) : 300,
  };
  return rpc("codes:search", "", payload);
};

exports.searchDoors = async (query, utility_id, type_id, code_id, limit) => {
  const payload = {
    query: query != null ? String(query) : "",
    utility_id: utility_id != null ? String(utility_id) : "",
    type_id: type_id != null ? String(type_id) : "",
    code_id: code_id != null ? String(code_id) : "",
    limit: limit != null ? Number(limit) : 300,
  };
  return rpc("doors:search", "", payload);
};

exports.searchHardwares = async (query, utility_id, type_id, code_id, limit) => {
  const payload = {
    query: query != null ? String(query) : "",
    utility_id: utility_id != null ? String(utility_id) : "",
    type_id: type_id != null ? String(type_id) : "",
    code_id: code_id != null ? String(code_id) : "",
    limit: limit != null ? Number(limit) : 300,
  };
  return rpc("hardwares:search", "", payload);
};

exports.searchHandlers = async (query, utility_id, type_id, code_id, limit) => {
  const payload = {
    query: query != null ? String(query) : "",
    utility_id: utility_id != null ? String(utility_id) : "",
    type_id: type_id != null ? String(type_id) : "",
    code_id: code_id != null ? String(code_id) : "",
    limit: limit != null ? Number(limit) : 300,
  };
  return rpc("handlers:search", "", payload);
};

exports.searchShelves = async (query, utility_id, type_id, code_id, limit) => {
  const payload = {
    query: query != null ? String(query) : "",
    utility_id: utility_id != null ? String(utility_id) : "",
    type_id: type_id != null ? String(type_id) : "",
    code_id: code_id != null ? String(code_id) : "",
    limit: limit != null ? Number(limit) : 300,
  };
  return rpc("shelves:search", "", payload);
};

exports.nextId = async (base) => {
  const payload = { base: base != null ? String(base) : "" };
  return rpc("nextId", "", payload);
};

exports.getSystemConfig = async () => {
  return rpc("config:get", "", {});
};

exports.setSystemConfig = async (data) => {
  const payload = data && typeof data === "object" ? data : {};
  return rpc("config:set", "", payload);
};

exports.exportToolsExcel = async (outPath) => {
  const payload = { outPath: outPath != null ? String(outPath) : "" };
  return rpc("tools:excel:export", "", payload);
};

exports.getProfitMarginPercentage = async () => {
  const cfg = await exports.getSystemConfig();
  const pct = cfg && cfg.profit_margin_percentage != null ? Number(cfg.profit_margin_percentage) : 0;
  return isNaN(pct) ? 0 : pct;
};

exports.parseTabularText = (text) => {
  const raw = text != null ? String(text) : "";
  const normalized = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n");
  const rows = [];

  for (let i = 0; i < lines.length; i++) {
    const line = String(lines[i] != null ? lines[i] : "").trim();
    if (!line) continue;

    const delimiter = line.indexOf("\t") !== -1 ? "\t" : line.indexOf(",") !== -1 ? "," : "\t";
    const parts = line.split(delimiter);
    const row = [];
    for (let j = 0; j < parts.length; j++) {
      let cell = String(parts[j] != null ? parts[j] : "").trim();
      if (cell.length >= 2 && cell[0] === '"' && cell[cell.length - 1] === '"') {
        cell = cell.slice(1, -1);
      }
      row.push(cell);
    }
    if (row.length > 0) rows.push(row);
  }

  return rows;
};

exports.normalizeHeader = (h) => {
  const s = h != null ? String(h).trim().toLowerCase() : "";
  return s.replace(/[\s\-]+/g, "_").replace(/[^a-z0-9_]/g, "");
};

exports.buildHeaderIndex = (headerRow) => {
  const map = {};
  if (!headerRow || !headerRow.length) return map;
  for (let i = 0; i < headerRow.length; i++) {
    const key = exports.normalizeHeader(headerRow[i]);
    if (key && map[key] == null) map[key] = i;
  }
  return map;
};

exports.listExcelSheets = async (filePath) => {
  const XLSX = require("xlsx");
  const p = filePath != null ? String(filePath) : "";
  if (!p) return [];
  const wb = XLSX.readFile(p);
  return wb && Array.isArray(wb.SheetNames) ? wb.SheetNames : [];
};

exports.readExcelSheetAsTabularText = async (filePath, sheetName) => {
  const XLSX = require("xlsx");
  const p = filePath != null ? String(filePath) : "";
  if (!p) return "";
  const wb = XLSX.readFile(p);
  const names = wb && Array.isArray(wb.SheetNames) ? wb.SheetNames : [];
  const target = sheetName != null && String(sheetName).trim() ? String(sheetName).trim() : names.length ? names[0] : "";
  if (!target) return "";
  const ws = wb.Sheets ? wb.Sheets[target] : null;
  if (!ws) return "";

  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) || [];
  const outLines = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] || [];
    const parts = [];
    for (let j = 0; j < row.length; j++) {
      const v = row[j] != null ? String(row[j]) : "";
      parts.push(v);
    }
    if (parts.length === 0) continue;
    outLines.push(parts.join("\t"));
  }
  return outLines.join("\n");
};

exports.bindExcelImportControls = (opts) => {
  if (typeof document === "undefined") return { reset: () => {}, isBound: false };

  const fileInputId = opts && opts.fileInputId != null ? String(opts.fileInputId) : "import-file";
  const sheetSelectId = opts && opts.sheetSelectId != null ? String(opts.sheetSelectId) : "import-sheet";
  const textAreaId = opts && opts.textAreaId != null ? String(opts.textAreaId) : "import-text";
  const preferredSheetName =
    opts && opts.preferredSheetName != null && String(opts.preferredSheetName).trim() ? String(opts.preferredSheetName).trim() : "";
  const afterTextSet = opts && typeof opts.afterTextSet === "function" ? opts.afterTextSet : null;
  const onError = opts && typeof opts.onError === "function" ? opts.onError : null;

  const fileEl = document.getElementById(fileInputId);
  const sheetEl = document.getElementById(sheetSelectId);
  const textEl = document.getElementById(textAreaId);

  if (!fileEl || !sheetEl || !textEl) return { reset: () => {}, isBound: false };

  let currentPath = "";

  function reportError(err) {
    const msg = err && err.message ? err.message : String(err);
    if (onError) onError(msg);
    else alert(msg);
  }

  function clearSheets() {
    sheetEl.innerHTML = "";
    sheetEl.disabled = true;
  }

  function setSheets(names) {
    sheetEl.innerHTML = "";
    const list = Array.isArray(names) ? names : [];
    for (let i = 0; i < list.length; i++) {
      const name = list[i] != null ? String(list[i]) : "";
      if (!name) continue;
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      sheetEl.appendChild(opt);
    }
    sheetEl.disabled = sheetEl.options.length === 0;
  }

  function pickInitialSheet() {
    if (!sheetEl || sheetEl.options.length === 0) return "";
    if (preferredSheetName) {
      for (let i = 0; i < sheetEl.options.length; i++) {
        const v = sheetEl.options[i] && sheetEl.options[i].value != null ? String(sheetEl.options[i].value) : "";
        if (v === preferredSheetName) return v;
      }
    }
    return sheetEl.options[0].value;
  }

  function loadSheet(name) {
    if (!currentPath) return Promise.resolve("");
    const sheetName = name != null ? String(name) : "";
    return exports.readExcelSheetAsTabularText(currentPath, sheetName).then((text) => {
      textEl.value = text;
      if (afterTextSet) afterTextSet();
      return text;
    });
  }

  function getFilePathFromInput() {
    const f = fileEl && fileEl.files && fileEl.files.length ? fileEl.files[0] : null;
    const p = f && f.path != null ? String(f.path) : "";
    return p;
  }

  clearSheets();

  fileEl.addEventListener("change", () => {
    currentPath = getFilePathFromInput();
    if (!currentPath) {
      clearSheets();
      return;
    }
    exports
      .listExcelSheets(currentPath)
      .then((names) => {
        setSheets(names);
        if (sheetEl.options.length > 0) {
          sheetEl.value = pickInitialSheet();
          return loadSheet(sheetEl.value);
        }
      })
      .catch(reportError);
  });

  sheetEl.addEventListener("change", () => {
    loadSheet(sheetEl.value).catch(reportError);
  });

  return {
    reset: () => {
      currentPath = "";
      if (fileEl) fileEl.value = "";
      clearSheets();
      if (textEl) textEl.value = "";
      if (afterTextSet) afterTextSet();
    },
    isBound: true,
  };
};
