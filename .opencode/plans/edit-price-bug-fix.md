# Fix: Price recalculates during editing without user input

## Problem

When clicking "Edit" on an existing row, the form population triggers `input`/`change` events on rate fields and component dropdowns. These handlers set `editSavedRawBaseCost = null`, causing `updateCurrentItemUnitAndTotal()` to recompute from current form values instead of using the stored base cost. The displayed unit price then changes unexpectedly (e.g., 12,712 → 8,504).

## Fix Steps

### Step 1: Move `editSavedRawBaseCost` and add `editSavedAdditional` to top of edit handler

File: `src/scripts/pricing.js`, line ~618

Replace:
```js
  clearSavedRates();
  editingItem = true;
```

With:
```js
  clearSavedRates();
  editingItem = true;
  editSavedRawBaseCost = item.raw_base_cost != null ? Number(item.raw_base_cost) : null;
  editSavedAdditional = item.additional != null ? Number(item.additional) : 0;
```

### Step 2: Add `if (editingItem) return;` guard to 14 handlers

Insert `if (editingItem) return;` right after the opening `{` or after `event.preventDefault()` in each handler below:

| # | Line ~ | Handler | Code to add before |
|---|--------|---------|-------------------|
| 1 | 1634 | `harware-new-rate` input | `editSavedRawBaseCost = null;` |
| 2 | 1648 | `code-new-rate` input | `editSavedRawBaseCost = null;` |
| 3 | 1660 | `finishing-new-rate` input | `editSavedRawBaseCost = null;` |
| 4 | 1693 | `handle-new-rate` input | `editSavedRawBaseCost = null;` |
| 5 | 1724 | `shelve-new-rate` input | `editSavedRawBaseCost = null;` |
| 6 | 1902 | `additional` input handler | The function body |
| 7 | 1906 | `is_shelve` change handler | `editSavedRawBaseCost = null;` |
| 8 | 1944/1949 | `door-panel` change handler | Inside `addEventListener` callback |
| 9 | 1986 | `handler` change handler | Inside `addEventListener` callback |
| 10 | 2020 | `hardware` change handler | Inside `addEventListener` callback |
| 11 | 2056 | `shelves` change handler | Inside `addEventListener` callback |
| 12 | 2127 | `apply-profit-margin` change handler | `editSavedRawBaseCost = null;` |
| 13 | 1902 | `additional` input handler (already listed) | `updateCurrentItemUnitAndTotal();` |

For each handler, add after the arrow/callback opening:

```js
  if (editingItem) return;
```

Example for rate input handler (line ~1634):
```js
document.getElementById("harware-new-rate").addEventListener("input", () => {
  if (editingItem) return;
  editSavedRawBaseCost = null;
  recalculateHardwareContributionFromCurrentSelection();
})
```

Example for PM checkbox handler (line ~2127):
```js
document.getElementById('apply-profit-margin').addEventListener('change', (event) => {
  if (editingItem) return;
  editSavedRawBaseCost = null;
  updateCurrentItemUnitAndTotal();
})
```

### Step 3: Verify the fix

1. Click "Edit" on any existing row
2. The unit price and total should display exactly the stored values without changing
3. Make a change to a field (e.g., change qty, select different component)
4. The price should recalculate correctly based on the new values

## Notes

- `utility_change`, `type_change`, `code_change` already have `if (editingItem) return;` — no change needed
- `clear_dropdowns()` and other cleanup functions are not called during editing — no change needed
- The stored `item.unit` and `item.total` at lines 868-869 will display correctly since no handler overwrites them during form population
