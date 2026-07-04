const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const ELECTRON_VERSION = "40.0.0";

function npmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function run(command, args, options) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: false,
    ...options,
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(" ")}`);
  }
}

function findBetterSqliteBinary(rootDir) {
  const candidate = path.join(
    rootDir,
    "node_modules",
    "better-sqlite3",
    "build",
    "Release",
    "better_sqlite3.node"
  );
  return fs.existsSync(candidate) ? candidate : "";
}

async function installWindowsElectronBinary(projectDir) {
  const packageJson = require(path.join(projectDir, "package.json"));
  const betterSqlite3Version =
    packageJson &&
    packageJson.dependencies &&
    packageJson.dependencies["better-sqlite3"]
      ? packageJson.dependencies["better-sqlite3"]
      : "^12.0.0";

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cabinet_costing_win_native_"));
  const workDir = path.join(tempRoot, "work");
  ensureDir(workDir);

  writeJson(path.join(workDir, "package.json"), {
    name: "cabinet-costing-win-native",
    private: true,
    version: "0.0.0",
    dependencies: {
      "better-sqlite3": betterSqlite3Version,
    },
  });

  const env = {
    ...process.env,
    npm_config_platform: "win32",
    npm_config_arch: "x64",
    npm_config_runtime: "electron",
    npm_config_target: ELECTRON_VERSION,
    npm_config_disturl: "https://electronjs.org/headers",
    npm_config_build_from_source: "false",
  };

  run(npmCommand(), ["install", "--no-audit", "--no-fund"], {
    cwd: workDir,
    env,
  });

  const binaryPath = findBetterSqliteBinary(workDir);
  if (!binaryPath) {
    throw new Error("Unable to locate Windows better-sqlite3 binary after temp install.");
  }

  return {
    tempRoot,
    binaryPath,
  };
}

module.exports = async function afterPack(context) {
  if (!context || context.electronPlatformName !== "win32") return;

  const appOutDir = context.appOutDir;
  const targetBinary = path.join(
    appOutDir,
    "resources",
    "app.asar.unpacked",
    "node_modules",
    "better-sqlite3",
    "build",
    "Release",
    "better_sqlite3.node"
  );

  if (!fs.existsSync(path.dirname(targetBinary))) {
    throw new Error(`better-sqlite3 unpacked target directory not found: ${path.dirname(targetBinary)}`);
  }

  const { tempRoot, binaryPath } = await installWindowsElectronBinary(context.packager.projectDir);
  try {
    fs.copyFileSync(binaryPath, targetBinary);
    console.log(`after-pack: replaced packaged better_sqlite3.node with Windows Electron binary at ${targetBinary}`);
  } finally {
    try {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    } catch (e) {}
  }
};
