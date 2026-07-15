# Excel Import Code Shuffle — Root Cause & Fix

## Issue

When importing tool data (Hardware, Handles, Door Panels, Adjustable Shelves, Codes, Types) from an Excel file exported from an **old database**, the CODE column (and Utility/Type columns) displayed wrong values while numerical columns were correct.

## Root Cause

The import code preferred `*_id` columns (e.g. `code_id`, `type_id`, `utility_id`) over title columns. These IDs came from the **old database** and did not match the **new database** IDs, causing:

1. Code ID looked up a **different** code in the new DB → wrong text displayed
2. Utility/Type IDs similarly resolved to wrong entries

Numerical columns were unaffected because they're read directly from the spreadsheet without any ID lookup.

## Fix

**Priority swap:** match by **title** first (stable across databases), fall back to `_id` columns when title is missing.

**Before (broken):**
```
if (id column has value) → use old ID directly
else if (title column has value) → match by title
```

**After (fixed):**
```
if (title column has value) → match by title, get correct ID in new DB
else if (id column has value) → use ID as fallback
```

## Files Changed (7 files, 12 import blocks)

| File | Function | Columns |
|---|---|---|
| `src/scripts/hardware.js` | `importHardwaresFromText` | utility_id, type_id, code_id |
| `src/scripts/handler.js` | `importHandlersFromText` | utility_id, type_id, code_id |
| `src/scripts/door-panel.js` | `importDoorsFromText` | utility_id, type_id, code_id |
| `src/scripts/adjustable_shelve.js` | `importShelvesFromText` | utility_id, type_id, code_id |
| `src/scripts/code.js` | `importCodesFromText` | utility_id, type_id |
| `src/scripts/type.js` | `importTypesFromText` | utility_id |
| `src/scripts/code.js` | `depImportTypesFromText` | utility_id |
| `src/scripts/door-panel.js` | `depImportTypesFromText` | utility_id |
| `src/scripts/adjustable_shelve.js` | `depImportTypesFromText` | utility_id |
| `src/scripts/hardware.js` | `depImportTypesFromText` | utility_id |
| `src/scripts/handler.js` | `depImportTypesFromText` | utility_id |
