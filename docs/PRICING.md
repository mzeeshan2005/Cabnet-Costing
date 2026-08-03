# Pricing Engine — Full Reference

**File:** `src/scripts/pricing.js` (~3171 lines)

---

## In-Memory State

| Variable | Purpose |
|---|---|
| `pricing` | Object keyed by elevation name → items array |
| `items` | Flat array of all line items across elevations |
| `pricing` also has `.pinfo` | Metadata (pricing_no, client, dates, totals) |
| `check_list`, `check_list2` | Selected rows for edit/delete |
| `code_rate`, `door`, `handler`, `hardware`, `shelve` | Running component costs for current line being edited |
| `custom_val` | Additional cost input for current line |
| `profitMarginPercentage` | Global profit margin % from system_config |
| `baseGrossAmount` | Sum of all items' totals (before discount/tax) |
| `editSavedRawBaseCost` | When editing, stores the original raw base cost |
| `editSavedAdditional` | When editing, stores the original additional cost |
| `savedRates` | `{ "code-new-rate:{id}:{subType}": value, "harware-new-rate:{id}:{subType}": value }` |

---

## Line Item Object Structure

```js
{
  id: "elevation_timestamp",
  elevation: "Kitchen",
  code: "B15",
  code_id: "1",
  hardware: "Hinge Set A",
  hardware_id: "1",
  door: "Panel Style B",
  door_id: "1",
  handler: "Handle C",
  handler_id: "1",
  shelve: "Shelf D",
  shelve_id: "1",
  qty: 2,
  unit: 4500.50,
  total: 9001,
  raw_base_cost: 4000,           // Base before any profit margin
  additional: 200,               // Additional cost
}
```

---

## Unit Price Calculation

### Base Unit Price

```
Base = Code_Contribution + Door_Contribution + Handle_Contribution
       + Hardware_Contribution + Shelve_Contribution + Additional
```

### With Profit Margin

```
If PM checkbox checked:
  Unit Price = (Base - Additional) × (1 + ProfitMargin%/100) + Additional
```

### Total

```
Total = round(Unit Price × Quantity)
```

---

## Component Calculations

### Code Contribution

```
Code = (box_sheet_qty × box_sheet_rate)
     + (back_area_qty × back_area_rate)
     + (secondary_top_qty × secondary_top_rate)
     + (edging_qty × edging_rate)
     + (screws_qty × screws_rate)
     + (wall_bracket_qty × wall_bracket_rate)
```

The primary type dropdown lets you override one component's rate with a custom value. Non-primary components use saved custom rates (from `savedRates`) or fall back to DB rates.

### Hardware Contribution

```
Hardware = (hinges_qty × hinges_rate)
         + (slider_qty × slider_rate)
         + (lift_qty × lift_rate)
         + (hanger_pipe_qty × hanger_pipe_rate)
         + (pipe_fitting_qty × pipe_fitting_rate)
         + (locks_qty × locks_rate)
         + (drawer_handles_qty × drawer_handles_rate)
```

Same primary type override logic as code.

### Door / Handle / Shelve Contribution

Simpler — each multiplies quantity column(s) by corresponding global rates.

---

## Profit Margin System

- Stored in `system_config.profit_margin_percentage`
- Default loaded at app init via `file_manager.getSystemConfig()`
- Applied as factor `1 + (percentage/100)`
- Toggleable per-session via "Apply Profit Margin" checkbox
- When toggled off, `getProfitMarginFactor()` returns `1`

---

## Sub-Type Rate Overrides

Users can set custom rates per sub-type per item via dropdowns + Enter key.

**Storage format in `savedRates`:**
- Code: `"code-new-rate:{codeId}:{subTypeLabel}"` → value
- Hardware: `"harware-new-rate:{hardwareId}:{subTypeLabel}"` → value

Where `subTypeLabel` is one of:
- `"Box Sheet Price/PC"` / `"Box Back Sheet Price/PC"` / `"Secondary Top Sheet Price/PC"`
- `"Hinges Price/SET"` / `"Slider Price/SET"` / `"Lift Up Price/SET"`

---

## New Cost Breakdown (5 components)

Shown below the item form. Computed from code + hardware selections:

| Component | Source |
|---|---|
| Wall Bracket | codeRow.wall_bracket × rates.wall_bracket_codes |
| Hanger Pipe | hardwareRow.hanger_pipe × rates.hanger_pipe_hardware |
| Pipe Fitting | hardwareRow.hanger_pipe_fitting × rates.hanger_pipe_fitting_hardware |
| Locks | hardwareRow.locks × rates.locks_hardware |
| Drawer Handles | hardwareRow.drawer_handles × rates.drawer_handle_rate |

---

## Totals Calculation

```
Gross Amount = sum of all items' totals

If Discount visible and mode is Invoice:
  After Discount = Gross - Discount%
  Otherwise: After Discount = Gross

After Tax = After Discount + Tax%

Net = After Tax + Delivery Charges
```

---

## Invoice vs Quotation Mode

- **Invoice:** discount field enabled, tax applied
- **Quotation:** discount field disabled (set to 0), different PDF header

Toggled by "Is Quotation" checkbox.

---

## PDF Generation

Uses `html2pdf.js`. Builds an HTML table with:

- **`table-layout: auto`** — fully dynamic column widths
- **Borders:** `0.5px solid rgba(23, 23, 22, 0.7)`
- **`page-break-inside: avoid`** on data rows
- **`page-break-after: avoid`** on category header rows
- **Print margin:** `0.4in`

Columns printed: Sr#, Item, Code, Qty, Rate, Unit, Total, Category Header merges across 11 cols.

---

## Save Flow

1. Validate required fields (client, items)
2. Prompt for login password
3. Build `pinfo` + items by elevation
4. Load existing pricings → append/update by `pinfo.id`
5. Write back via `file_manager.writeFile`
6. `all_clear()` resets all summary fields including `add-item-cost` to `0`

### Delivery Charges

The `delivery-charges` field allows clearing to empty (backspace works). Calculation code uses `Number(el.value) || 0` to safely treat empty as zero.

---

## Load for Edit

1. Load `.pricings.json` via file_manager
2. Find by id → populate all fields
3. Populate dropdown selections, quantities, totals
4. Restore `savedRates` for sub-type overrides
5. Set `editSavedRawBaseCost` and `editSavedAdditional`

## Dirty Detection (Update Button)

When a saved pricing is loaded, the Save button reads "Update". Any edit to any field enables it:

| Scope | Event type | Elements |
|---|---|---|
| `#form-pricing` (item area) | `input`, `change` | All form controls inside the form |
| Bottom summary fields | `input`, `change` | `discount`, `tax`, `delivery-charges`, `show-discount` |

Checkboxes (`is_quotation`, `show-discount`) fire `change` events — these are caught by the `change` listener, unlike an `input`-only handler.
