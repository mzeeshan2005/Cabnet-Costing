# IPC Protocol — Renderer ↔ Main Process

## Overview

Communication uses Electron's `ipcRenderer` / `ipcMain` (not the deprecated `remote` module). The protocol is a simple RPC system.

---

## Channel: `store:rpc`

### Request (renderer → main)

```js
ipcRenderer.send("store:rpc", {
  requestId: "1",       // Auto-incrementing string
  action: "load",        // Action name
  filePath: "...",       // Target file path (for load/write)
  data: { ... }          // Payload (for write/search/etc.)
});
```

### Reply (main → renderer)

```js
ipcRenderer.on("store:rpc:reply", (event, message) => {
  message = {
    requestId: "1",
    ok: true,
    result: { ... }       // Response data
    // OR on error:
    // ok: false,
    // error: "Error message"
  }
});
```

---

## Actions

| Action | Input | Output | Description |
|---|---|---|---|
| `load` | `filePath` | Parsed JSON | Load a data file from SQLite or JSON fallback |
| `write` | `filePath`, `data` | `"success"` | Write data to SQLite or JSON |
| `utilities:merge` | `data` (array) | `"success"` | Merge utility rows |
| `types:merge` | `data` (array) | `"success"` | Merge type rows |
| `codes:search` | `{ query, utility_id, type_id, limit }` | Array | Search codes |
| `doors:search` | `{ query, utility_id, type_id, code_id, limit }` | Array | Search doors |
| `hardwares:search` | `{ query, utility_id, type_id, code_id, limit }` | Array | Search hardwares |
| `handlers:search` | `{ query, utility_id, type_id, code_id, limit }` | Array | Search handlers |
| `shelves:search` | `{ query, utility_id, type_id, code_id, limit }` | Array | Search shelves |
| `nextId` | `{ base }` | Number | Next available ID for a table |
| `config:get` | `{}` | `{ master_excel_path, profit_margin_percentage }` | Get system config |
| `config:set` | `{ master_excel_path?, profit_margin_percentage? }` | Updated config | Set system config |
| `tools:excel:export` | `{ outPath? }` | Path | Export Tools_Data.xlsx |
| `db:backup` | `{ outPath? }` | `{ dbPath, backupPath }` | Backup SQLite DB |
| `db:restore` | `{ inPath }` | `{ dbPath, backupPath }` | Restore SQLite from backup |

---

## Channel: `window:open`

Open a new window (and close the current one):

```js
ipcRenderer.send("window:open", "screens/pricing.html");
```

Main process creates a new `BrowserWindow`, loads the URL, and closes the sender's window.

---

## Channel: `dialog:openExcelFile`

Opens native file dialog for Excel files (invoke/handle pattern):

```js
const result = await ipcRenderer.invoke("dialog:openExcelFile");
// result = { filePaths: [...] } or null
```

---

## file_manager.js — Renderer-Side API

**File:** `src/scripts/file_manager.js` (428 lines)

Wraps IPC calls with:
- **In-memory cache** — stores loaded data, returns clone on subsequent calls
- **Request dedup** — if a file is already being loaded, new callers share the same in-flight promise
- **Cache invalidation** — on write, cache is updated; on restore, full cache is cleared

### Public API

```js
loadFile(file)                    → Promise<data>
writeFile(file, data)             → Promise<"success"|"in_use">
mergeTypes(rows)                  → Promise<"success">
mergeUtilities(rows)              → Promise<"success">
searchCodes(query, util, type)    → Promise<array>
searchDoors(query, util, type, code) → Promise<array>
searchHardwares(...)              → Promise<array>
searchHandlers(...)               → Promise<array>
searchShelves(...)                → Promise<array>
nextId(base)                      → Promise<number>
getSystemConfig()                 → Promise<config>
setSystemConfig(data)             → Promise<config>
exportToolsExcel(outPath?)        → Promise<path>
backupDatabase(outPath?)          → Promise<{dbPath, backupPath}>
restoreDatabase(inPath)           → Promise<{dbPath, backupPath}>
isInUseWriteResult(res)           → boolean
getInUseToolMessage()             → string
```

### Excel Import Helpers

```js
listExcelSheets(filePath)                    → Promise<[sheetNames]>
readExcelSheetAsTabularText(filePath, name)   → Promise<tabSeparatedText>
bindExcelImportControls(opts)                → { reset, isBound }
parseTabularText(text)                       → [[cells]]
normalizeHeader(str)                         → normalizedKey
buildHeaderIndex(headerRow)                  → { key: index }
```

### Cache Behavior

```js
cache = {
  "/path/to/.clients.json": {
    value: [ ... ],      // Stored data (set after load/write)
    inFlight: Promise    // Pending request (dedup)
  }
}
```
