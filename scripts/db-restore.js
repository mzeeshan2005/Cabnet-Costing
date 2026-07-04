const { app } = require("electron");
const path = require("path");
const storage = require(path.join(__dirname, "../src/main/storage.js"));

function getOptionalPathArg() {
  const currentScriptPath = path.resolve(__filename);
  const args = process.argv.slice(2);

  for (let i = args.length - 1; i >= 0; i -= 1) {
    const value = args[i] != null ? String(args[i]).trim() : "";
    if (!value) continue;
    if (path.resolve(value) === currentScriptPath) continue;
    return value;
  }

  return "";
}

const sourcePath = getOptionalPathArg();

app.whenReady().then(() => {
  try {
    const result = storage.restoreDatabase(sourcePath);
    console.log(`SQLite database restored from ${result.backupPath}`);
  } catch (e) {
    console.error("SQLite restore failed:", e && e.message ? e.message : e);
    process.exitCode = 1;
  } finally {
    app.exit(process.exitCode || 0);
  }
});

app.on("window-all-closed", () => {});
