const path = require("path");
const { spawnSync } = require("child_process");

process.on("uncaughtException", (err) => {
  try {
    console.error("Uncaught exception in pack-win.js");
    console.error(err && err.stack ? err.stack : err);
  } finally {
    process.exit(1);
  }
});

process.on("unhandledRejection", (err) => {
  try {
    console.error("Unhandled rejection in pack-win.js");
    console.error(err && err.stack ? err.stack : err);
  } finally {
    process.exit(1);
  }
});

function isWindows() {
  return process.platform === "win32";
}

function bin(name) {
  const binDir = path.join(process.cwd(), "node_modules", ".bin");
  if (isWindows()) return path.join(binDir, `${name}.cmd`);
  return path.join(binDir, name);
}

function quoteCmdArg(arg) {
  const s = String(arg);
  if (s.length === 0) return '""';
  if (!/[ \t&|<>()^"]/.test(s)) return s;
  return `"${s.replace(/"/g, '""')}"`;
}

function runOnWindowsCmd(command, args) {
  const cmdArgs = ["/d", "/s", "/c", `"${String(command).replace(/"/g, '""')}"`].concat(
    (args || []).map(quoteCmdArg)
  );
  const res = spawnSync("cmd.exe", cmdArgs, {
    stdio: "inherit",
  });
  return res;
}

function run(command, args) {
  console.log(`> ${command} ${args.join(" ")}`);
  const res =
    isWindows() && (String(command).endsWith(".cmd") || String(command).endsWith(".bat"))
      ? runOnWindowsCmd(command, args)
      : spawnSync(command, args, { stdio: "inherit" });
  if (res.error) {
    console.error(res.error);
    process.exit(1);
  }
  if (res.status !== 0) process.exit(res.status || 1);
}

if (!isWindows()) {
  console.error("Windows packaging must run on a Windows machine for better-sqlite3.");
  console.error("Run this command on Windows: npm run pack:win");
  process.exit(1);
}

console.log(`pack-win.js: node=${process.version} cwd=${process.cwd()}`);

run(process.execPath, ["scripts/rebuild.js"]);

run(bin("electron-packager"), [
  ".",
  "CabinetCosting",
  "--platform=win32",
  "--arch=x64",
  "--overwrite",
  "--out=dist",
  "--prune=false",
  "--asar=false",
  "--ignore=^/dist($|/)",
  "--ignore=^/CabinetCosting-win32-x64($|/)",
  "--ignore=\\.db$",
  "--ignore=\\.db-wal$",
  "--ignore=\\.db-shm$",
]);
