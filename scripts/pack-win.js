const path = require("path");
const fs = require("fs");
const os = require("os");
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

function existsFile(p) {
  try {
    return fs.existsSync(p);
  } catch (e) {
    return false;
  }
}

function quoteCmdArg(arg) {
  const s = String(arg);
  if (s.length === 0) return '""';
  if (!/[ \t&|<>()^"]/.test(s)) return s;
  return `"${s.replace(/"/g, '""')}"`;
}

function runOnWindowsCmd(command, args, options) {
  const rawCmd = String(command);
  const escapedCmd = rawCmd.replace(/"/g, '""');
  const needsCmdQuoting = /[ \t]/.test(rawCmd) || /[\\/]/.test(rawCmd);
  const cmdPart = needsCmdQuoting ? `"${escapedCmd}"` : escapedCmd;
  const cmdLine = [cmdPart].concat((args || []).map(quoteCmdArg)).join(" ");
  const res = spawnSync("cmd.exe", ["/d", "/s", "/c", cmdLine], {
    stdio: "inherit",
    ...options,
  });
  return res;
}

function run(command, args, options) {
  console.log(`> ${command} ${args.join(" ")}`);
  const res =
    isWindows() && (String(command).endsWith(".cmd") || String(command).endsWith(".bat"))
      ? runOnWindowsCmd(command, args, options)
      : spawnSync(command, args, { stdio: "inherit", ...options });
  if (res.error) {
    console.error(res.error);
    process.exit(1);
  }
  if (res.status !== 0) process.exit(res.status || 1);
}

function packagerCommand() {
  const local = bin("electron-packager");
  if (existsFile(local)) return { cmd: local, baseArgs: [] };

  const npxCmd = isWindows() ? "npx.cmd" : "npx";
  if (isWindows()) {
    return { cmd: npxCmd, baseArgs: ["-p", "electron-packager@10.1.2", "electron-packager"] };
  }
  return { cmd: npxCmd, baseArgs: ["--yes", "-p", "@electron/packager@18.3.0", "electron-packager"] };
}

function ensureDir(dirPath) {
  try {
    fs.mkdirSync(dirPath, { recursive: true });
  } catch (e) {}
}

function rmDirRecursive(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  const entries = fs.readdirSync(dirPath);
  for (let i = 0; i < entries.length; i++) {
    const p = path.join(dirPath, entries[i]);
    const st = fs.lstatSync(p);
    if (st.isDirectory()) rmDirRecursive(p);
    else fs.unlinkSync(p);
  }
  fs.rmdirSync(dirPath);
}

function shouldIgnore(relPath) {
  const p = relPath.replace(/\\/g, "/");
  if (!p) return false;
  if (p === "dist" || p.indexOf("dist/") === 0) return true;
  if (p === "node_modules" || p.indexOf("node_modules/") === 0) return true;
  if (p === ".git" || p.indexOf(".git/") === 0) return true;
  if (p.endsWith(".db") || p.endsWith(".db-wal") || p.endsWith(".db-shm")) return true;
  return false;
}

function copyRecursive(srcDir, destDir, relBase) {
  ensureDir(destDir);
  const entries = fs.readdirSync(srcDir);
  for (let i = 0; i < entries.length; i++) {
    const name = entries[i];
    const srcPath = path.join(srcDir, name);
    const relPath = relBase ? path.join(relBase, name) : name;
    if (shouldIgnore(relPath)) continue;
    const st = fs.lstatSync(srcPath);
    const destPath = path.join(destDir, name);
    if (st.isDirectory()) copyRecursive(srcPath, destPath, relPath);
    else if (st.isFile()) {
      ensureDir(path.dirname(destPath));
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function npmCommand() {
  return isWindows() ? "npm.cmd" : "npm";
}

console.log(`pack-win.js: node=${process.version} platform=${process.platform} cwd=${process.cwd()}`);

if (isWindows()) {
  run(process.execPath, ["scripts/rebuild.js"]);

  const packager = packagerCommand();
  run(packager.cmd, packager.baseArgs.concat([
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
  ]));
  process.exit(0);
}

console.log("Non-Windows host detected. Attempting cross-pack for win32-x64 using prebuilt native modules.");
console.log("This requires that better-sqlite3/integer prebuilt binaries exist for Electron 4.2.12 win32-x64.");

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cabinet_costing_winpack_"));
const stageDir = path.join(tempRoot, "app");
ensureDir(stageDir);
copyRecursive(process.cwd(), stageDir, "");

const installEnv = {
  ...process.env,
  npm_config_platform: "win32",
  npm_config_arch: "x64",
  npm_config_runtime: "electron",
  npm_config_target: "4.2.12",
  npm_config_disturl: "https://electronjs.org/headers",
  npm_config_build_from_source: "false",
};

run(npmCommand(), ["install", "--production", "--no-audit", "--no-fund"], { cwd: stageDir, env: installEnv });

const packager = packagerCommand();
run(packager.cmd, packager.baseArgs.concat([
  stageDir,
  "CabinetCosting",
  "--platform=win32",
  "--arch=x64",
  "--electron-version=4.2.12",
  "--overwrite",
  "--out=dist",
  "--prune=false",
  "--asar=false",
  "--ignore=^/dist($|/)",
  "--ignore=^/CabinetCosting-win32-x64($|/)",
  "--ignore=\\.db$",
  "--ignore=\\.db-wal$",
  "--ignore=\\.db-shm$",
]));

try {
  rmDirRecursive(tempRoot);
} catch (e) {}
