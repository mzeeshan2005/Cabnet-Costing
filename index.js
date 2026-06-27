const { app, BrowserWindow } = require("electron");
const path = require("path");

app.on("ready", () => {
  let win = new BrowserWindow({
    zoomToPageWidth: true,
    show: false,
    autoHideMenuBar: true,
  });
  win.maximize();
  win.show();
  win.loadURL(`file://${__dirname}/src/screens/login.html`);
});

exports.openWindow = (file) => {
  let win = new BrowserWindow({
    zoomToPageWidth: true,
    show: false,
    autoHideMenuBar: true,
  });
  win.maximize();
  win.show();
  // win.webContents.openDevTools();
  win.loadURL(`file://${__dirname}/src/${file}`);
};

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    let win = new BrowserWindow({
      zoomToPageWidth: true,
      show: false,
      autoHideMenuBar: true,
    });
    win.maximize();
    win.show();
    win.loadURL(`file://${__dirname}/src/screens/login.html`);
  }
});
