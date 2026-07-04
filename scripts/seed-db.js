const { app } = require("electron");
const path = require("path");
const storage = require(path.join(__dirname, "../src/main/storage.js"));

app.whenReady().then(() => {
  try {
    const result = storage.repairToolDatabases();
    console.log(`SQLite tool duplicate repair completed for: ${result.repaired.join(", ")}`);
  } catch (e) {
    console.error("Database repair failed:", e && e.message ? e.message : e);
    app.exitCode = 1;
  } finally {
    app.exit(app.exitCode || 0);
  }
});

app.on("window-all-closed", () => {});
