const { spawnSync } = require("child_process");
const path = require("path");

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    cwd: path.join(__dirname, ".."),
    shell: false,
  });

  if (result.error) throw result.error;
  process.exit(result.status == null ? 1 : result.status);
}

if (process.platform === "win32") {
  run(process.platform === "win32" ? "npx.cmd" : "npx", ["electron-builder", "--win", "--x64"]);
} else {
  run(process.execPath, [path.join(__dirname, "pack-win.js")]);
}
