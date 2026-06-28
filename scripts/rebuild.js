const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

function isWindows() {
  return process.platform === "win32";
}

function npmCommand() {
  return isWindows() ? "npm.cmd" : "npm";
}

function electronRebuildCommand(binDir) {
  const base = path.join(binDir, "electron-rebuild");
  return isWindows() ? `${base}.cmd` : base;
}

function makeTempDir() {
  const prefix = path.join(os.tmpdir(), "cabinet_costing_native_");
  return fs.mkdtempSync(prefix);
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function copyFileSync(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function collectNativeBinaries(projectDir) {
  const out = [];
  const root = path.join(projectDir, "node_modules");
  const targets = new Set(["better-sqlite3", "integer"]);

  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.isFile() && e.name.endsWith(".node")) out.push(p);
    }
  }

  for (const pkg of targets) {
    const pkgDir = path.join(root, pkg);
    if (fs.existsSync(pkgDir)) walk(pkgDir);
  }

  return out;
}

function run() {
  const realCwd = process.cwd();
  const realPkg = require(path.join(realCwd, "package.json"));

  const betterSqlite3Version =
    realPkg && realPkg.dependencies && realPkg.dependencies["better-sqlite3"]
      ? realPkg.dependencies["better-sqlite3"]
      : "6.0.1";

  const tempDir = makeTempDir();
  const workDir = path.join(tempDir, "work");
  ensureDir(workDir);

  writeJson(path.join(workDir, "package.json"), {
    name: "cabinet_costing_native_build",
    private: true,
    version: "0.0.0",
    dependencies: {
      "better-sqlite3": betterSqlite3Version,
    },
    devDependencies: {
      electron: "4.2.12",
      "@electron/rebuild": "^3.7.2",
    },
  });

  const env = {
    ...process.env,
    GYP_DEFINES: "openssl_fips=",
    npm_config_ignore_scripts: "true",
  };

  const install = spawnSync(npmCommand(), ["install", "--ignore-scripts"], {
    cwd: workDir,
    stdio: "inherit",
    env,
  });
  if (install.status !== 0) process.exit(install.status || 1);

  const rebuildBin = electronRebuildCommand(path.join(workDir, "node_modules", ".bin"));
  const result = spawnSync(rebuildBin, ["-f", "-w", "better-sqlite3", "-v", "4.2.12"], {
    cwd: workDir,
    stdio: "inherit",
    env,
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }

  const nativeFiles = collectNativeBinaries(workDir);
  if (nativeFiles.length === 0) {
    console.error("No native .node binaries found after rebuild.");
    process.exit(2);
  }

  for (const src of nativeFiles) {
    const rel = path.relative(workDir, src);
    const dest = path.join(realCwd, rel);
    copyFileSync(src, dest);
  }
}

run();
