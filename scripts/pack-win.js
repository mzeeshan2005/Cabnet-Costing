const path = require("path");
const { spawnSync } = require("child_process");

function isWindows() {
  return process.platform === "win32";
}

function bin(name) {
  const binDir = path.join(process.cwd(), "node_modules", ".bin");
  if (isWindows()) return path.join(binDir, `${name}.cmd`);
  return path.join(binDir, name);
}

function run(command, args) {
  const res = spawnSync(command, args, { stdio: "inherit" });
  if (res.status !== 0) process.exit(res.status || 1);
}

if (!isWindows()) {
  console.error("Windows packaging must run on a Windows machine for better-sqlite3.");
  console.error("Run this command on Windows: npm run pack:win");
  process.exit(1);
}

run(process.execPath, ["scripts/rebuild.js"]);

run(bin("electron-packager"), [
  ".",
  "CabinetCosting",
  "--platform=win32",
  "--arch=x64",
  "--overwrite",
  "--out=dist",
  "--prune=true",
  "--asar=false",
  "--ignore=^/dist($|/)",
  "--ignore=^/CabinetCosting-win32-x64($|/)",
  "--ignore=\\.db$",
  "--ignore=\\.db-wal$",
  "--ignore=\\.db-shm$",
]);
