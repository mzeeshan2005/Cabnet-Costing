# Excel Integration Strategy (Tools Section)

## Goal (What the client actually wants)

The client wants a fast “data feeding” workflow for the **Tools** pages. Instead of entering items one-by-one, they want to **copy from Excel and import in bulk** so the dropdown options and tool tables are populated automatically.

Key points from the requirement:
- Import must exist for **every Tools dataset** (Utilities, Descriptions/Types, Codes, Finishing, Hardware, Handles, Adjustable Shelves, etc.).
- Each dataset has a **different structure**, so import must support **dataset-specific columns**.
- They prefer Excel as the “source of truth” and want a consistent import flow (“same process everywhere”).


## Strategy Summary

### Recommended Primary Strategy (Phase 1)

**Copy/Paste Import (Excel → App):**
- Add an **Import** button to each Tools page (and optionally near dependent dropdowns).
- User copies a range from Excel and pastes into a modal.
- The app parses tab-separated rows and inserts/updates data.

Why this fits the current app:
- No new dependencies are required.
- Works regardless of whether persistence is SQLite or JSON fallback because Tools already read/write through the same data targets.

### Optional Upgrade (Phase 2)

**Single Excel Workbook with Multiple Sheets (Tools_Data.xlsx):**
- One workbook with one sheet per dataset (Utilities, Types, Codes, …).
- Support:
  - Export: DB → Excel workbook (generate or refresh)
  - Import: Excel workbook → DB

Important note:
- Continuous “sync on startup” is risky on Windows because Excel locks files; prefer explicit **Export**/**Import** buttons and optional user-controlled sync.


## Workbook Format (If/When we use .xlsx)

Use **one workbook** with **multiple sheets**, not multiple files. This matches the “no data fragmentation” intent while respecting that each tool has different columns.

Example workbook name:
- `Tools_Data.xlsx`

Sheets (tabs):
- `Utilities`
- `Descriptions` (Types)
- `Codes`
- `Finishing` (Door Panel)
- `Hardware`
- `Handles`
- `Adjustable Shelves`


## Import Locations in the UI (What “import button on every field” means)

There are two interpretations; implement both safely:

### A) Import per Tools dataset (must-have)
Each Tools screen gets an Import button for its own dataset:
- Utilities page imports Utilities
- Hardware page imports Hardware
- etc.

### B) Import beside dependent dropdowns (nice-to-have)
On pages where the user is blocked by missing dropdown options (e.g., Finishing uses Utility/Type/Code filters), add small Import buttons near:
- Select Utility → imports Utilities
- Select Type/Description → imports Types
- Select Code → imports Codes

This avoids forcing the user to leave the screen to add missing “master” options.


## Data Source & Persistence (How this works with current code)

Current architecture already uses a stable boundary for Tools data:
- Renderer reads/writes `src/db/*.json` style targets via file_manager.
- Main process `storage.js` maps these “virtual JSON files” to SQLite tables when SQLite is available, otherwise falls back to JSON.

Therefore:
- Import should target the same dataset endpoints (the same targets Tools pages already use).
- This automatically supports SQLite (fast) and JSON fallback (compatibility).


## Import Behavior (Rules)

### Supported Input Modes
1) Copy/Paste (tab-separated): recommended first implementation.
2) Excel file import (.xlsx): optional later.

### Insert/Update Semantics
For each row:
- If `id` is provided and exists → update.
- If `id` is missing:
  - create a new row using next available id (max+1).

### Sanitization
- Trim strings.
- Convert numeric fields with `parseFloat(value) || 0`.
- Skip empty rows.

### Validation
- Require the minimum fields per dataset:
  - Utilities: title
  - Types: title, utility_id (or utility title mapping)
  - Codes: title, utility_id, type_id
  - Hardware: title, rate (+ optional slider/lift), utility/type/code references
  - Shelves: title, rate (+ optional pin/edging), utility/type/code references


## Column Mapping (How Excel columns map to app fields)

We should support two modes:

### Mode 1: Header-based (preferred)
First row contains headers, e.g.:
- `id`, `title`, `rate`, `utility_id`, `type_id`, `code_id`

### Mode 2: Position-based (fallback)
If no recognizable header row is detected, treat columns by position.

For “reference fields” (utility/type/code):
- Accept either ids (`utility_id`) or names (`utility`).
- If names are provided, map them to ids by looking up existing Utilities/Types/Codes.


## Export Behavior (DB → Excel) (Optional Phase 2)

When exporting the Tools workbook:
- Generate one sheet per dataset with consistent headers.
- Sort by id for stable diffs.
- Prefer “Replace whole sheet” export for simplicity and correctness.

File locking:
- If Excel has the file open, Windows may lock it; show a user-friendly message: “Close Tools_Data.xlsx and try again.”


## Rollout Plan

### Phase 1 (Fast, minimal risk)
- Implement copy/paste import modal.
- Add Import button on each Tools dataset page.
- Implement dataset-specific parsers/mappers.

### Phase 2 (Excel workbook support)
- Reintroduce `xlsx` dependency (if needed).
- Add “Export Tools Excel” and “Import Tools Excel”.

### Phase 3 (Optional convenience)
- “Import next to dropdowns” in multi-step screens (Finishing/Hardware/Handles/Shelves filters).
- Optional background sync toggle (OFF by default).


## Acceptance Criteria

- User can copy rows from Excel and paste into Tools import modal.
- Data inserts/updates correctly and appears immediately in dropdowns/tables.
- IDs are auto-generated when missing.
- Import flow is consistent across Tools pages (same modal UX).
- Works with SQLite enabled and also works in JSON fallback mode.

