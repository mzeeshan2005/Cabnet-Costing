# Tools Management — Full Reference

## Hierarchy

```
Utilities (e.g. "Kitchen", "Wardrobe", "Bathroom")
  └── Types/Descriptions (e.g. "Wall Cabinet", "Base Unit", "Pull-out")
        ├── Codes (box carcass components)
        ├── Doors/Finishing (door panel options)
        ├── Hardwares (hinges, sliders, lift-up, etc.)
        ├── Handlers (handle/knob options)
        └── Shelves (adjustable shelf options)
```

Each tool is a self-contained CRUD screen + script under `src/screens/tools/`.

---

## Tool Screens

| Screen | File | Data File | Description |
|--------|------|-----------|-------------|
| Utilities | `tools/utility.html` → `utility.js` | `.utilities.json` | Top-level categories |
| Descriptions | `tools/type.html` → `type.js` | `.types.json` | Sub-categories per utility |
| Codes | `tools/code.html` → `code.js` | `.codes.json` | Cabinet box codes with material coefficients |
| Finishing | `tools/door-panel.html` → `door-panel.js` | `.doors.json` | Door/panel finishing options |
| Hardware | `tools/hardware.html` → `hardware.js` | `.hardwares.json` | Hardware items |
| Handles | `tools/handler.html` → `handler.js` | `.handlers.json` | Handle styles |
| Shelves | `tools/adjustable-shelve.html` → `adjustable_shelve.js` | `.shelves.json` | Adjustable shelves |

---

## Shared CRUD Pattern

All tool scripts follow the same pattern:

1. **`listData` array** — in-memory staging buffer
2. **Table display** — renders all rows with checkboxes
3. **Add** — push new row to `listData`
4. **Select → Edit** — populate form fields from selected row
5. **Multi-select → Delete** — remove from `listData`
6. **Save** — password confirmation → write to DB

### Key Functions (common across tools)

```
populateTable()     — Render listData to HTML table
add()               — Add new row to listData
selectOnly(id)      — Select single row for editing
del() / del_selected() — Remove from listData
save_func()         — Password modal → write
```

---

## Code Record Fields

```json
{
  "id": "1",
  "title": "B15",
  "rate": "0.72",          // Box sheet coefficient
  "back_area": "0.08",     // Back panel coefficient
  "edging": "17",          // Edging length
  "screws": "80",          // Screws count
  "secondary_top": "0.07", // Secondary top coefficient
  "wall_bracket": "2",     // Wall brackets count
  "utility_id": "1",
  "utility": "Base Unit",
  "type_id": "1",
  "type": "Pull out Basket Cabinet"
}
```

## Hardware Record Fields

```json
{
  "id": "1",
  "title": "Soft-close Hinge Set",
  "rate": "2",           // Hinges quantity per unit
  "slider": "0",
  "lift": "0",
  "hanger_pipe": "1",
  "hanger_pipe_fitting": "1",
  "locks": "0",
  "drawer_handles": "2",
  "utility_id": "1",
  "type_id": "1",
  "code_id": "1"
}
```

## Door / Handle / Shelf Record Fields

- **Door:** id, title, rate (panel area), edging, utility/type/code references
- **Handle:** id, title, rate (quantity), utility/type/code references
- **Shelf:** id, title, rate (area), pin, edging, utility/type/code references

---

## Global Rates (`global_rates` table / `.rates.json`)

Key-value pairs that multiply with tool quantities to produce costs:

| Key | Used For |
|---|---|
| `rate_codes` | Box sheet price/PC |
| `back_area_codes` | Back sheet price/PC |
| `secondary_top_codes` | Secondary top sheet price/PC |
| `edging_codes` | Edging trimming price/RFT (codes) |
| `screws_codes` | Screws price/PC |
| `wall_bracket_codes` | Wall bracket price/PC |
| `rate_doors` | Front panel sheet price/PC |
| `edging_doors` | Edging trimming price/RFT (doors) |
| `rate_hardware` | Hinges price/SET |
| `slider_hardware` | Slider price/SET |
| `lift_hardware` | Lift up price/SET |
| `hanger_pipe_hardware` | Hanger pipe price/PC |
| `hanger_pipe_fitting_hardware` | Pipe fitting price/PC |
| `locks_hardware` | Locks price/PC |
| `drawer_handle_rate` | Internal handle price/PC |
| `rate_handles` | Handles price/PC/length |
| `rate_shelve` | Shelves sheet price/SFT |
| `edging_shelve` | Edging trimming price/RFT (shelves) |
| `pin_shelve` | Shelve pin price/PC |

Rates are managed via **Settings → Price Update** screen (`price_change.js`).

---

## Excel Export Integration

### Auto-Sync

Every write to tools data triggers a debounced (1.5s) sync to `Tools_Data.xlsx`:

```js
scheduleToolsExcelSync(base, data)
```

### Workbook Structure (7 sheets)

| Sheet | Data Source | Columns |
|---|---|---|
| Utilities | `utilities` table | Utility Id, Utility Title |
| Descriptions | `types` table | Utility Id, Utility Title, Description Id, Description Title |
| Codes | `codes` table | Utility, Type, Code Id, Code Title, Box Sheet, Back Sheet, Top, Edging, Screws, Wall Bracket |
| Finishing | `doors` table | Utility, Type, Code, Finishing Id, Finishing Title, Panel Area, Edging |
| Hardware | `hardwares` table | Utility, Type, Code, Hardware Id, Hardware Title, Hinges, Sliders, Lift Up, Hanger Pipe, Pipe Fitting, Locks, Internal Handle |
| Handles | `handlers` table | Utility, Type, Code, Handle Id, Handle Title, Quantity |
| Adjustable Shelves | `shelves` table | Utility, Type, Code, Shelf Id, Shelf Title, Shelve Area, Pin Qty., Edging |

### Header Coloring

Headers are color-coded via XML post-processing with `adm-zip`:

| Column Prefix | Color |
|---|---|
| Utility | Blue (#2F5496) |
| Description | Green (#375623) |
| Code | Orange (#BF6000) |
| Finishing | Purple (#5B2C8E) |
| Hardware | Blue (#0070C0) |
| Handle | Red (#C00000) |
| Shelf | Brown (#806000) |

### Merge Behavior

On export, existing rows not present in the DB are preserved (user-added rows are kept). Only deleted DB entities are removed.
