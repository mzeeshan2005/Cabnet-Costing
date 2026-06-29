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

exports.getProfitMarginPercentage = async () => {
  const cfg = await exports.getSystemConfig();
  const pct = cfg && cfg.profit_margin_percentage != null ? Number(cfg.profit_margin_percentage) : 0;
  return isNaN(pct) ? 0 : pct;
};
