const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const storage = require(path.join(__dirname, "src/main/storage.js"));
const { getExcelPath } = require(path.join(__dirname, "scripts/export-tools-excel.js"));
const fs = require("fs");

const windows = new Set();

function createWindow(loadPath) {
  const win = new BrowserWindow({
    zoomToPageWidth: true,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      sandbox: false,
    },
  });
  windows.add(win);
  win.on("closed", () => {
    windows.delete(win);
  });
  win.maximize();
  win.show();
  win.loadURL(`file://${__dirname}/src/${loadPath}`);
  return win;
}

function openWindow(file) {
  return createWindow(file);
}

exports.openWindow = openWindow;

ipcMain.on("window:open", (event, file) => {
  console.log("window:open", file);
  openWindow(file);
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.close();
});

ipcMain.on("store:rpc", (event, message) => {
  const requestId = message && message.requestId;
  const action = message && message.action;
  const filePath = message && message.filePath;
  const data = message && message.data;

  try {
    let result = null;
    if (action === "load") result = storage.load(filePath);
    else if (action === "write") result = storage.write(filePath, data);
    else if (action === "utilities:merge") result = storage.mergeUtilities(data);
    else if (action === "types:merge") result = storage.mergeTypes(data);
    else if (action === "codes:search") result = storage.searchCodes(data);
    else if (action === "doors:search") result = storage.searchDoors(data);
    else if (action === "hardwares:search") result = storage.searchHardwares(data);
    else if (action === "handlers:search") result = storage.searchHandlers(data);
    else if (action === "shelves:search") result = storage.searchShelves(data);
    else if (action === "nextId") result = storage.nextIdFor(data);
    else if (action === "config:get") result = storage.getSystemConfig();
    else if (action === "config:set") result = storage.setSystemConfig(data);
    else if (action === "tools:excel:export") result = storage.exportToolsExcel(data && data.outPath ? data.outPath : "");
    else if (action === "db:backup") result = storage.backupDatabase(data && data.outPath ? data.outPath : "");
    else if (action === "db:restore") result = storage.restoreDatabase(data && data.inPath ? data.inPath : "");
    else throw new Error("Unknown action");

    event.sender.send("store:rpc:reply", { requestId, ok: true, result });
  } catch (e) {
    event.sender.send("store:rpc:reply", {
      requestId,
      ok: false,
      error: e && e.message ? e.message : String(e),
    });
  }
});

ipcMain.handle("dialog:openExcelFile", async (event) => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Excel Files', extensions: ['xlsx', 'xls'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  if (canceled) {
    return null;
  } else {
    return { filePaths };
  }
});

app.on("ready", async () => {
  try {
    storage.initializeDatabase();
  } catch (e) {
    console.error("Failed to initialize SQLite database:", e && e.message ? e.message : e);
    app.quit();
    return;
  }

  const excelPath = getExcelPath(app);
  if (!fs.existsSync(excelPath)) {
    console.log(`Tools_Data.xlsx not found at ${excelPath}. Generating...`);
    try {
      storage.exportToolsExcel("");
      console.log("Tools_Data.xlsx generated successfully.");
    } catch (e) {
      console.error("Failed to generate Tools_Data.xlsx:", e);
    }
  } else {
    console.log(`Tools_Data.xlsx found at ${excelPath}.`);
  }

  createWindow("screens/login.html");
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow("screens/login.html");
  }
});
