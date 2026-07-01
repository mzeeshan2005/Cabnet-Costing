const fs = require("fs");
const path = require("path");

let app = null;
try {
  ({ app } = require("electron"));
} catch (e) {
  app = null;
}

function getDbPath() {
  if (app && app.isPackaged) {
    const exeDir = path.dirname(process.execPath);
    return path.join(exeDir, "data", "cabinet_costing.db");
  }
  if (app && typeof app.getPath === "function") {
    return path.join(app.getPath("userData"), "cabinet_costing.db");
  }
  return "";
}

function mergeDuplicateIds(database, table, groupByColumns, childRefs) {
  const groupExpr = groupByColumns.concat(["LOWER(TRIM(title))"]).join(", ");
  const rows = database
    .prepare(
      `
        SELECT MIN(id) AS keep_id, GROUP_CONCAT(id) AS ids, COUNT(*) AS dup_count
        FROM ${table}
        GROUP BY ${groupExpr}
        HAVING COUNT(*) > 1
      `
    )
    .all();

  if (!rows.length) return { groups: 0, removed: 0 };

  const updates = (childRefs || []).map((ref) =>
    database.prepare(`UPDATE ${ref.table} SET ${ref.column} = ? WHERE ${ref.column} = ?`)
  );
  const del = database.prepare(`DELETE FROM ${table} WHERE id = ?`);
  let removed = 0;

  for (const row of rows) {
    const keepId = row && row.keep_id != null ? Number(row.keep_id) : null;
    const ids = row && row.ids != null ? String(row.ids).split(",").map((v) => Number(v)) : [];
    if (keepId == null || !ids.length) continue;

    for (const id of ids) {
      if (id === keepId || Number.isNaN(id)) continue;
      for (const stmt of updates) stmt.run(keepId, id);
      del.run(id);
      removed += 1;
    }
  }

  return { groups: rows.length, removed };
}

function countDuplicateGroupsSqlite(database, table, groupByColumns) {
  const groupExpr = groupByColumns.concat(["LOWER(TRIM(title))"]).join(", ");
  const row = database
    .prepare(
      `
        SELECT COUNT(*) AS total
        FROM (
          SELECT 1
          FROM ${table}
          GROUP BY ${groupExpr}
          HAVING COUNT(*) > 1
        )
      `
    )
    .get();
  return row && row.total != null ? Number(row.total) : 0;
}

const plans = [
    {
      table: "utilities",
      groupBy: [],
      childRefs: [
        { table: "types", column: "utility_id" },
        { table: "codes", column: "utility_id" },
        { table: "doors", column: "utility_id" },
        { table: "hardwares", column: "utility_id" },
        { table: "handlers", column: "utility_id" },
        { table: "shelves", column: "utility_id" },
      ],
    },
    {
      table: "types",
      groupBy: ["COALESCE(utility_id, -1)"],
      childRefs: [
        { table: "codes", column: "type_id" },
        { table: "doors", column: "type_id" },
        { table: "hardwares", column: "type_id" },
        { table: "handlers", column: "type_id" },
        { table: "shelves", column: "type_id" },
      ],
    },
    {
      table: "codes",
      groupBy: ["COALESCE(utility_id, -1)", "COALESCE(type_id, -1)"],
      childRefs: [
        { table: "doors", column: "code_id" },
        { table: "hardwares", column: "code_id" },
        { table: "handlers", column: "code_id" },
        { table: "shelves", column: "code_id" },
      ],
    },
    {
      table: "doors",
      groupBy: ["COALESCE(utility_id, -1)", "COALESCE(type_id, -1)", "COALESCE(code_id, -1)"],
      childRefs: [],
    },
    {
      table: "hardwares",
      groupBy: ["COALESCE(utility_id, -1)", "COALESCE(type_id, -1)", "COALESCE(code_id, -1)"],
      childRefs: [],
    },
    {
      table: "handlers",
      groupBy: ["COALESCE(utility_id, -1)", "COALESCE(type_id, -1)", "COALESCE(code_id, -1)"],
      childRefs: [],
    },
    {
      table: "shelves",
      groupBy: ["COALESCE(utility_id, -1)", "COALESCE(type_id, -1)", "COALESCE(code_id, -1)"],
      childRefs: [],
    },
];

function normalizedTitle(value) {
  return value != null ? String(value).trim().toLowerCase() : "";
}

function readJsonArray(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const data = JSON.parse(raw);
  return Array.isArray(data) ? data : [];
}

function writeJsonArray(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data));
}

function jsonDuplicateKey(plan, row) {
  const title = normalizedTitle(row && row.title);
  if (!title) return "";

  if (plan.table === "utilities") return title;
  if (plan.table === "types") return `${row && row.utility_id != null ? String(row.utility_id) : ""}::${title}`;

  // For tables with a 'code' field (doors, hardwares, handlers, shelves)
  if (["doors", "hardwares", "handlers", "shelves"].includes(plan.table)) {
    const code = normalizedTitle(row && row.code);
    // Special case for 'doors': uniqueness is utility_id, code, and title (type_id is excluded)
    if (plan.table === "doors") {
      return `${row && row.utility_id != null ? String(row.utility_id) : ""}::${code}::${title}`;
    }
    return `${row && row.utility_id != null ? String(row.utility_id) : ""}::${row && row.type_id != null ? String(row.type_id) : ""}::${code}::${title}`;
  }

  // For 'codes' table, the uniqueness is utility_id, type_id, and title.
  if (plan.table === "codes") {
      return `${row && row.utility_id != null ? String(row.utility_id) : ""}::${row && row.type_id != null ? String(row.type_id) : ""}::${title}`;
  }

  return "";
}

function countDuplicateGroupsJson(rows, plan) {
  const counts = new Map();
  for (const row of rows || []) {
    const key = jsonDuplicateKey(plan, row);
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  let total = 0;
  for (const count of counts.values()) {
    if (count > 1) total += 1;
  }
  return total;
}

function runJsonCleanup() {
  const dbDir = path.join(__dirname, "../src/db");
  const fileByTable = {
    utilities: path.join(dbDir, ".utilities.json"),
    types: path.join(dbDir, ".types.json"),
    codes: path.join(dbDir, ".codes.json"),
    doors: path.join(dbDir, ".doors.json"),
    hardwares: path.join(dbDir, ".hardwares.json"),
    handlers: path.join(dbDir, ".handlers.json"),
    shelves: path.join(dbDir, ".shelves.json"),
  };

  const datasets = {};
  for (const plan of plans) {
    datasets[plan.table] = readJsonArray(fileByTable[plan.table]);
  }

  const before = {};
  for (const plan of plans) {
    before[plan.table] = countDuplicateGroupsJson(datasets[plan.table], plan);
  }

  const results = [];
  for (const plan of plans) {
    const rows = datasets[plan.table];
    const groups = new Map();
    for (const row of rows) {
      const key = jsonDuplicateKey(plan, row);

      if (!key) continue;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    }

    const keepIds = new Set();
    const remap = new Map();
    let removed = 0;
    let dupGroups = 0;

    for (const groupRows of groups.values()) {
      if (!groupRows || groupRows.length === 0) continue;
      groupRows.sort((a, b) => {
        const aId = a && a.id != null ? Number(a.id) : Number.MAX_SAFE_INTEGER;
        const bId = b && b.id != null ? Number(b.id) : Number.MAX_SAFE_INTEGER;
        return aId - bId;
      });

      const keep = groupRows[0];
      keepIds.add(String(keep.id));
      if (groupRows.length > 1) {
        dupGroups += 1;
        for (let i = 1; i < groupRows.length; i++) {
          const dup = groupRows[i];
          remap.set(String(dup.id), String(keep.id));
          removed += 1;
        }
      }
    }

    datasets[plan.table] = rows.filter((row) => {
      const id = row && row.id != null ? String(row.id) : "";
      return !remap.has(id);
    });

    for (const ref of plan.childRefs) {
      const targetRows = datasets[ref.table] || [];
      targetRows.forEach((row) => {
        const current = row && row[ref.column] != null ? String(row[ref.column]) : "";
        if (remap.has(current)) row[ref.column] = remap.get(current);
      });
    }

    results.push({ table: plan.table, groups: dupGroups, removed });
  }

  for (const plan of plans) {
    writeJsonArray(fileByTable[plan.table], datasets[plan.table]);
  }

  const after = {};
  for (const plan of plans) {
    after[plan.table] = countDuplicateGroupsJson(datasets[plan.table], plan);
  }

  console.log(JSON.stringify({ mode: "json", dbDir, before, results, after }, null, 2));
}

function runSqliteCleanup() {
  const dbPath = getDbPath();
  const Database = require("better-sqlite3");
  const db = new Database(dbPath);
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");

  const before = {};
  for (const plan of plans) {
    before[plan.table] = countDuplicateGroupsSqlite(db, plan.table, plan.groupBy);
  }

  const tx = db.transaction(() => {
    return plans.map((plan) => ({
      table: plan.table,
      ...mergeDuplicateIds(db, plan.table, plan.groupBy, plan.childRefs),
    }));
  });

  const results = tx();
  const after = {};
  for (const plan of plans) {
    after[plan.table] = countDuplicateGroupsSqlite(db, plan.table, plan.groupBy);
  }

  console.log(JSON.stringify({ mode: "sqlite", dbPath, before, results, after }, null, 2));
  db.close();
}

function main() {
  try {
    runSqliteCleanup();
    if (app && typeof app.quit === "function") app.quit();
  } catch (err) {
    runJsonCleanup();
    if (app && typeof app.quit === "function") app.quit();
  }
}

if (app && typeof app.whenReady === "function") {
  app.whenReady()
    .then(main)
    .catch((err) => {
      console.error(err && err.stack ? err.stack : String(err));
      process.exit(1);
    });
} else {
  main();
}
