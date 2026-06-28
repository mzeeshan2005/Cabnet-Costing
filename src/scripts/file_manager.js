const { ipcRenderer } = require("electron");

let nextRequestId = 1;
const pending = {};

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
  return rpc("load", file);
};

exports.writeFile = async (file, data) => {
  return rpc("write", file, data);
};
