const fs = require("fs");
const { event } = require('jquery');
const path = require('path')
const { pathToFileURL } = require('url');
const file_manager = require(path.join(__dirname, "../scripts/file_manager.js"));

let pricing = {}
let item = null
let items = []
let code_rate = 0
let door = 0
let handler = 0
let hardware = 0
let shelve = 0
let check_list = []
let check_list2 = []
let custom_val = 0.0
let profitMarginPercentage = 0;
let baseGrossAmount = 0;
let breakdownRefreshToken = 0;
let editSavedRawBaseCost = null;
let editSavedAdditional = null;

function isProfitMarginApplied() {
  const el = document.getElementById('apply-profit-margin');
  return el ? !!el.checked : true;
}

function getProfitMarginFactor() {
  const pct = profitMarginPercentage != null ? Number(profitMarginPercentage) : 0;
  if (!isProfitMarginApplied()) return 1;
  if (!pct || isNaN(pct)) return 1;
  return 1 + (pct / 100);
}

function getCurrentAdditionalValue() {
  const el = document.getElementById('additional');
  return el ? numValue(el.value) : 0;
}

function getCurrentFormBaseUnit() {
  return (
    numValue(code_rate) +
    numValue(door) +
    numValue(handler) +
    numValue(hardware) +
    numValue(shelve) +
    getCurrentAdditionalValue()
  );
}

function updateCurrentItemUnitAndTotal() {
  const unitEl = document.getElementById('unit');
  const totalEl = document.getElementById('total');
  const qtyEl = document.getElementById('qty');
  if (!unitEl || !totalEl || !totalEl) return;

  custom_val = getCurrentAdditionalValue();
  let baseUnit;
  if (editSavedRawBaseCost != null) {
    const currentAdditional = getCurrentAdditionalValue();
    const additionalDelta = currentAdditional - (editSavedAdditional != null ? editSavedAdditional : 0);
    baseUnit = editSavedRawBaseCost + additionalDelta;
  } else {
    baseUnit = getCurrentFormBaseUnit();
  }
  const unit = Number((baseUnit * getProfitMarginFactor()).toFixed(2));
  const qty = numValue(qtyEl.value);

  unitEl.value = unit === 0 ? "0" : unit.toFixed(2);
  totalEl.innerHTML = String(Math.round(unit * qty));
}

function recalcGrossFromItems() {
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (it && it.total != null) {
      total += Number(it.total);
    }
  }
  baseGrossAmount = total;
  refreshGrossAmount();
  discount_and_tax();
}

function recomputeQuotationPricesFromBase() {
  const factor = getProfitMarginFactor();
  for (let idx = 0; idx < items.length; idx++) {
    const it = items[idx];
    if (!it) continue;

    const qty = it.qty != null ? Number(it.qty) : 0;
    const qtyNum = !isNaN(qty) ? qty : 0;

    let base = it.raw_base_cost != null ? Number(it.raw_base_cost) : null;
    if (base == null || isNaN(base)) {
      base = it.unit != null ? Number(it.unit) : 0;
    }
    const baseNum = !isNaN(base) ? base : 0;
    it.raw_base_cost = baseNum;

    const unit = baseNum * factor;
    const unitNum = !isNaN(unit) ? Number(unit.toFixed(2)) : 0;
    it.unit = unitNum;
    it.total = Math.round(unitNum * qtyNum);
  }
}

function setProfitMarginLabel() {
  const lbl = document.getElementById('profit-margin-label');
  if (!lbl) return;
  lbl.textContent = String(profitMarginPercentage != null ? profitMarginPercentage : 0);
}

function refreshGrossAmount() {
  const grossEl = document.getElementById('gross-amount');
  if (!grossEl) return;

  const base = baseGrossAmount != null ? Number(baseGrossAmount) : 0;
  grossEl.value = Math.round(!isNaN(base) ? base : 0);
  setProfitMarginLabel();
}

function numValue(v) {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

function shouldShowDiscountOnOutput() {
  const el = document.getElementById('show-discount');
  return el ? !!el.checked : true;
}

function isQuotationMode() {
  const el = document.getElementById('is_quotation');
  return el ? !!el.checked : false;
}

function syncDiscountFieldVisibility() {
  const showEl = document.getElementById('show-discount');
  const wrapper = document.getElementById('discount-wrapper');
  const discountEl = document.getElementById('discount');
  if (!showEl || !discountEl) return;

  const show = !!showEl.checked;
  const disableForQuotation = isQuotationMode();
  if (wrapper) wrapper.style.display = true;
  discountEl.disabled = !show || disableForQuotation;
  discountEl.required = show && !disableForQuotation;

  if (!show || disableForQuotation) {
    discountEl.value = 0;
    discount_and_tax();
  }
}

function setDiscountVisibilityToggle(value) {
  const el = document.getElementById('show-discount');
  if (!el) return;
  el.checked = value !== false;
  syncDiscountFieldVisibility();
}

function ensurePricingTotalsEnabled() {
  ['gross-amount', 'tax', 'calculated-tax', 'delivery-charges', 'net'].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.disabled = false;
    el.readOnly = false;
    el.removeAttribute('readonly');
  });
  syncDiscountFieldVisibility();
}

function rateValue(rates, key) {
  if (!rates || rates[key] == null || rates[key] === "") return 0;
  return numValue(rates[key]);
}

function formatBreakdownNumber(v) {
  const n = numValue(v);
  return Intl.NumberFormat('en-US', {
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function setBreakdownCard(baseId, qty, rate, amount) {
  const card = document.getElementById(baseId);
  const formula = document.getElementById(baseId + '-formula');
  const value = document.getElementById(baseId + '-value');
  if (!card || !formula || !value) return false;

  const qtyNum = numValue(qty);
  const rateNum = numValue(rate);
  const amountNum = numValue(amount);
  const shouldShow = qtyNum !== 0 || rateNum !== 0 || amountNum !== 0;

  if (shouldShow) {
    card.classList.remove('d-none');
    formula.textContent = formatBreakdownNumber(qtyNum) + ' x ' + formatBreakdownNumber(rateNum);
    value.textContent = formatBreakdownNumber(amountNum);
  } else {
    card.classList.add('d-none');
    formula.textContent = '0 x 0';
    value.textContent = '0';
  }

  return shouldShow;
}

function renderNewCostBreakdown(data) {
  const totalEl = document.getElementById('new-cost-breakdown-total');
  const emptyEl = document.getElementById('new-cost-breakdown-empty');
  if (!totalEl || !emptyEl) return;

  const entries = data || {};
  let visibleCount = 0;

  if (setBreakdownCard('breakdown-wall-bracket', entries.wall_bracket_qty, entries.wall_bracket_rate, entries.wall_bracket_amount)) visibleCount += 1;
  if (setBreakdownCard('breakdown-hanger-pipe', entries.hanger_pipe_qty, entries.hanger_pipe_rate, entries.hanger_pipe_amount)) visibleCount += 1;
  if (setBreakdownCard('breakdown-hanger-pipe-fitting', entries.hanger_pipe_fitting_qty, entries.hanger_pipe_fitting_rate, entries.hanger_pipe_fitting_amount)) visibleCount += 1;
  if (setBreakdownCard('breakdown-locks', entries.locks_qty, entries.locks_rate, entries.locks_amount)) visibleCount += 1;
  if (setBreakdownCard('breakdown-drawer-handles', entries.drawer_handles_qty, entries.drawer_handles_rate, entries.drawer_handles_amount)) visibleCount += 1;

  const total =
    numValue(entries.wall_bracket_amount) +
    numValue(entries.hanger_pipe_amount) +
    numValue(entries.hanger_pipe_fitting_amount) +
    numValue(entries.locks_amount) +
    numValue(entries.drawer_handles_amount);

  totalEl.textContent = formatBreakdownNumber(total);
  emptyEl.style.display = visibleCount === 0 ? 'block' : 'none';
}

function refreshNewCostBreakdown() {
  const token = ++breakdownRefreshToken;
  const codeId = document.getElementById('code') ? document.getElementById('code').value : '';
  const hardwareId = document.getElementById('hardware') ? document.getElementById('hardware').value : '';

  return Promise.all([
    file_manager.loadFile(path.join(__dirname, `../db/.rates.json`)),
    codeId ? file_manager.loadFile(path.join(__dirname, `../db/.codes.json`)) : Promise.resolve([]),
    hardwareId ? file_manager.loadFile(path.join(__dirname, `../db/.hardwares.json`)) : Promise.resolve([]),
  ])
    .then((results) => {
      if (token !== breakdownRefreshToken) return;

      const rates = results[0] || {};
      const codes = Array.isArray(results[1]) ? results[1] : [];
      const hardwares = Array.isArray(results[2]) ? results[2] : [];
      const codeRow = codeId ? codes.find((row) => row && row.id === codeId) : null;
      const hardwareRow = hardwareId ? hardwares.find((row) => row && row.id === hardwareId) : null;

      const wallBracketQty = codeRow ? numValue(codeRow.wall_bracket) : 0;
      const wallBracketRate = rateValue(rates, 'wall_bracket_codes');
      const hangerPipeQty = hardwareRow ? numValue(hardwareRow.hanger_pipe) : 0;
      const hangerPipeRate = rateValue(rates, 'hanger_pipe_hardware');
      const hangerPipeFittingQty = hardwareRow ? numValue(hardwareRow.hanger_pipe_fitting) : 0;
      const hangerPipeFittingRate = rateValue(rates, 'hanger_pipe_fitting_hardware');
      const locksQty = hardwareRow ? numValue(hardwareRow.locks) : 0;
      const locksRate = rateValue(rates, 'locks_hardware');
      const drawerHandlesQty = hardwareRow ? numValue(hardwareRow.drawer_handles) : 0;
      const drawerHandlesRate = rateValue(rates, 'drawer_handle_rate');

      renderNewCostBreakdown({
        wall_bracket_qty: wallBracketQty,
        wall_bracket_rate: wallBracketRate,
        wall_bracket_amount: wallBracketQty * wallBracketRate,
        hanger_pipe_qty: hangerPipeQty,
        hanger_pipe_rate: hangerPipeRate,
        hanger_pipe_amount: hangerPipeQty * hangerPipeRate,
        hanger_pipe_fitting_qty: hangerPipeFittingQty,
        hanger_pipe_fitting_rate: hangerPipeFittingRate,
        hanger_pipe_fitting_amount: hangerPipeFittingQty * hangerPipeFittingRate,
        locks_qty: locksQty,
        locks_rate: locksRate,
        locks_amount: locksQty * locksRate,
        drawer_handles_qty: drawerHandlesQty,
        drawer_handles_rate: drawerHandlesRate,
        drawer_handles_amount: drawerHandlesQty * drawerHandlesRate,
      });
    })
    .catch(() => {
      if (token !== breakdownRefreshToken) return;
      renderNewCostBreakdown({});
    });
}

function computeCodeContribution(codeRow, rates, selectedType, customRateValue) {
  if (!codeRow) return 0;
  const primaryType = selectedType || "Box Sheet Price/PC";
  const primaryRate = numValue(customRateValue);

  if (primaryType === "Box Back Sheet Price/PC") {
    return (numValue(codeRow.rate) * rateValue(rates, "rate_codes"))
      + (numValue(codeRow.back_area) * primaryRate)
      + (numValue(codeRow.secondary_top) * rateValue(rates, "secondary_top_codes"))
      + (numValue(codeRow.edging) * rateValue(rates, "edging_codes"))
      + (numValue(codeRow.screws) * rateValue(rates, "screws_codes"))
      + (numValue(codeRow.wall_bracket) * rateValue(rates, "wall_bracket_codes"));
  }

  if (primaryType === "Secondary Top Sheet Price/PC") {
    return (numValue(codeRow.rate) * rateValue(rates, "rate_codes"))
      + (numValue(codeRow.back_area) * rateValue(rates, "back_area_codes"))
      + (numValue(codeRow.secondary_top) * primaryRate)
      + (numValue(codeRow.edging) * rateValue(rates, "edging_codes"))
      + (numValue(codeRow.screws) * rateValue(rates, "screws_codes"))
      + (numValue(codeRow.wall_bracket) * rateValue(rates, "wall_bracket_codes"));
  }

  return (numValue(codeRow.rate) * primaryRate)
    + (numValue(codeRow.back_area) * rateValue(rates, "back_area_codes"))
    + (numValue(codeRow.secondary_top) * rateValue(rates, "secondary_top_codes"))
    + (numValue(codeRow.edging) * rateValue(rates, "edging_codes"))
    + (numValue(codeRow.screws) * rateValue(rates, "screws_codes"))
    + (numValue(codeRow.wall_bracket) * rateValue(rates, "wall_bracket_codes"));
}

function computeHardwareContribution(hardwareRow, rates, selectedType, customRateValue) {
  if (!hardwareRow) return 0;
  const primaryType = selectedType || "Hinges Price/SET";
  const primaryRate = numValue(customRateValue);

  if (primaryType === "Slider Price/SET") {
    return (numValue(hardwareRow.rate) * rateValue(rates, "rate_hardware"))
      + (numValue(hardwareRow.slider) * primaryRate)
      + (numValue(hardwareRow.lift) * rateValue(rates, "lift_hardware"))
      + (numValue(hardwareRow.hanger_pipe) * rateValue(rates, "hanger_pipe_hardware"))
      + (numValue(hardwareRow.hanger_pipe_fitting) * rateValue(rates, "hanger_pipe_fitting_hardware"))
      + (numValue(hardwareRow.locks) * rateValue(rates, "locks_hardware"))
      + (numValue(hardwareRow.drawer_handles) * rateValue(rates, "drawer_handle_rate"));
  }

  if (primaryType === "Lift Up Price/SET") {
    return (numValue(hardwareRow.rate) * rateValue(rates, "rate_hardware"))
      + (numValue(hardwareRow.slider) * rateValue(rates, "slider_hardware"))
      + (numValue(hardwareRow.lift) * primaryRate)
      + (numValue(hardwareRow.hanger_pipe) * rateValue(rates, "hanger_pipe_hardware"))
      + (numValue(hardwareRow.hanger_pipe_fitting) * rateValue(rates, "hanger_pipe_fitting_hardware"))
      + (numValue(hardwareRow.locks) * rateValue(rates, "locks_hardware"))
      + (numValue(hardwareRow.drawer_handles) * rateValue(rates, "drawer_handle_rate"));
  }

  return (numValue(hardwareRow.rate) * primaryRate)
    + (numValue(hardwareRow.slider) * rateValue(rates, "slider_hardware"))
    + (numValue(hardwareRow.lift) * rateValue(rates, "lift_hardware"))
    + (numValue(hardwareRow.hanger_pipe) * rateValue(rates, "hanger_pipe_hardware"))
    + (numValue(hardwareRow.hanger_pipe_fitting) * rateValue(rates, "hanger_pipe_fitting_hardware"))
    + (numValue(hardwareRow.locks) * rateValue(rates, "locks_hardware"))
    + (numValue(hardwareRow.drawer_handles) * rateValue(rates, "drawer_handle_rate"));
}

file_manager
  .getSystemConfig()
  .then((cfg) => {
    const pct = cfg && cfg.profit_margin_percentage != null ? Number(cfg.profit_margin_percentage) : 0;
    profitMarginPercentage = isNaN(pct) ? 0 : pct;
    setProfitMarginLabel();
    updateCurrentItemUnitAndTotal();
  })
  .catch(() => {
    profitMarginPercentage = 0;
    setProfitMarginLabel();
    updateCurrentItemUnitAndTotal();
  });


function toggle(event) {
  const elevation = event.target.id.split('~')[0]
  const my_item_id = event.target.id.split('~')[1]
  const elevation_items = pricing[elevation]
  if (event.target.checked) {
    document.getElementById('print').disabled = true;
    elevation_items.forEach(i => {
      if (i.item_id.toString() === my_item_id) {
        check_list.push(i)
        document.getElementById('delete').disabled = false;
        if (check_list.length >= 2) {
          clear_dropdowns()
          item = null
          document.getElementById('edit').disabled = true
          if (check_list.length === items.length) {
            document.getElementById('checkbox-all').checked = true;
          }
        }
        else {
          item = i;
          document.getElementById('edit').disabled = false
        }
      }
    })
  }
  else {
    elevation_items.forEach(i => {
      if (i.item_id.toString() === my_item_id) {
        const ind = check_list.indexOf(i)
        check_list.splice(ind, 1)
      }
    })
    if (check_list.length === 1) {
      item = check_list[0];
      document.getElementById('edit').disabled = false
      document.getElementById('delete').disabled = false;
    }
    else {
      document.getElementById('checkbox-all').checked = false
      document.getElementById('edit').disabled = true
      document.getElementById('delete').disabled = false;

      if (check_list.length === 0) {
        document.getElementById('print').disabled = false;
        document.getElementById('delete').disabled = true;
      }
      clear_dropdowns();

    }
  }
}

document.getElementById('delete').addEventListener('click', (event) => {
  event.preventDefault();
  check_list.forEach(i => {
    const ind = items.indexOf(i);
    items.splice(ind, 1);
  })
  const pinfo = pricing['pinfo']
  pricing = {}
  items.forEach(i => {
    if (!(i.elevation in pricing)) {
      pricing[i.elevation] = [i]
    }
    else {
      pricing[i.elevation].push(i)
    }
  })
  pricing["pinfo"] = pinfo
  check_list = []
  clear_dropdowns();
  document.getElementById('delete').disabled = true;
  document.getElementById('edit').disabled = true
  if (document.getElementById('checkbox-all').checked)
    document.getElementById('checkbox-all').click()
  populate_table();
  recalcGrossFromItems();
})


function change_code_rate(event) {
  if (event.which === 13) {
    event.preventDefault();
    recalculateCodeContributionFromCurrentSelection();
  }
}

function recalculateCodeContributionFromCurrentSelection() {
  const selectedCodeId = document.getElementById('code').value;
  if (!selectedCodeId) {
    code_rate = 0;
    updateCurrentItemUnitAndTotal();
    return;
  }

  file_manager.loadFile(path.join(__dirname, `../db/.codes.json`))
    .then(res => {
      file_manager.loadFile(path.join(__dirname, `../db/.rates.json`))
        .then(rates => {
          res.forEach(i => {
            if (i.id === selectedCodeId) {
              try {
                const select = document.getElementById("code-price");
                const selectedIndex = select.selectedIndex;
                const selectedText = select.options[selectedIndex].text;
                code_rate = computeCodeContribution(i, rates, selectedText, document.getElementById('code-new-rate').value);
              }
              catch (e) {
                code_rate = numValue(i.rate)
              }
              updateCurrentItemUnitAndTotal();
            }
          })
        })
    })
}


function change_finishing_rate(event) {
  if (event.which === 13) {
    event.preventDefault();
    file_manager.loadFile(path.join(__dirname, `../db/.doors.json`))
      .then(res => {
        file_manager.loadFile(path.join(__dirname, `../db/.rates.json`))
          .then(rates => {
            res.forEach(i => {
              if (i.id === document.getElementById('door-panel').value) {
                try {
                  door = parseFloat(i.rate)
                  door = door * parseFloat(document.getElementById('finishing-new-rate').value);
                  const edging = parseFloat(i.edging) * parseFloat(rates.edging_doors);
                  door = door + edging;
                }
                catch (e) {
                  door = i.rate
                }
                updateCurrentItemUnitAndTotal();
              }
            })
          })

      })
  }
}


function change_handles_rate(event) {
  if (event.which === 13) {
    event.preventDefault();
    file_manager.loadFile(path.join(__dirname, `../db/.handlers.json`))
      .then(res => {
        file_manager.loadFile(path.join(__dirname, `../db/.rates.json`))
          .then(rates => {
            res.forEach(i => {
              if (i.id === document.getElementById('handler').value) {
                try {
                  handler = parseFloat(i.rate)
                  handler = handler * parseFloat(document.getElementById('handle-new-rate').value);
                }
                catch (e) {
                  handler = i.rate
                }
                updateCurrentItemUnitAndTotal();
              }
            })
          })

      })
  }
}


function change_hardware_rate(event) {
  if (event.which === 13) {
    event.preventDefault();
    recalculateHardwareContributionFromCurrentSelection();
  }
}

function recalculateHardwareContributionFromCurrentSelection() {
  const selectedHardwareId = document.getElementById('hardware').value;
  if (!selectedHardwareId) {
    hardware = 0;
    updateCurrentItemUnitAndTotal();
    return;
  }

  file_manager.loadFile(path.join(__dirname, `../db/.hardwares.json`))
    .then(res => {
      file_manager.loadFile(path.join(__dirname, `../db/.rates.json`))
        .then(rates => {
          res.forEach(i => {
            if (i.id === selectedHardwareId) {
              try {
                const select = document.getElementById("hardware-price");
                const selectedIndex = select.selectedIndex;
                const selectedText = select.options[selectedIndex].text;
                hardware = computeHardwareContribution(i, rates, selectedText, document.getElementById('harware-new-rate').value);
              }
              catch (e) {
                hardware = numValue(i.rate)
              }
              updateCurrentItemUnitAndTotal();
            }
          })
        })
    })
}


function change_shelve_rate(event) {
  if (event.which === 13) {
    event.preventDefault();
    file_manager.loadFile(path.join(__dirname, `../db/.shelves.json`))
      .then(res => {
        file_manager.loadFile(path.join(__dirname, `../db/.rates.json`))
          .then(rates => {
            res.forEach(i => {
              if (i.id === document.getElementById("shelves").value) {
                try {
                  shelve = parseFloat(i.rate)
                  shelve = shelve * parseFloat(document.getElementById('shelve-new-rate').value);
                  const edging = parseFloat(i.edging) * parseFloat(rates.edging_shelve);
                  const pins = parseFloat(i.pin) * parseFloat(rates.pin_shelve);
                  shelve = shelve + edging + pins;
                }
                catch (e) {
                  shelve = i.rate
                }
                updateCurrentItemUnitAndTotal();
              }
            })
          })

      })
  }
}


document.getElementById('edit').addEventListener('click', (event) => {
  event.preventDefault()

  document.getElementById('elevation-input').value = item.elevation;
  document.getElementById('utility').value = item.utility;

  file_manager.loadFile(path.join(__dirname, `../db/.types.json`))
    .then(res => {
      const types = document.getElementById('type')
      types.innerHTML = ""
      const opt = document.createElement('option')
      opt.value = "";
      opt.text = "Select"
      opt.classList.add('d-none')
      types.options.add(opt)
      res.forEach(iter => {
        if (iter.utility_id === item.utility) {
          const opt = document.createElement('option')
          opt.value = iter.id;
          opt.text = iter.title
          types.options.add(opt)
        }
      })
      document.getElementById('type').value = item.type;
    })

  file_manager.loadFile(path.join(__dirname, `../db/.codes.json`))
    .then(res => {
      const codes = document.getElementById('code')
      codes.innerHTML = ""
      const opt = document.createElement('option')
      opt.value = "";
      opt.text = "Select"
      opt.classList.add('d-none')
      codes.options.add(opt)
      res.forEach(iter => {
        if (iter.utility_id === document.getElementById('utility').value && iter.type_id === item.type) {
          const opt = document.createElement('option')
          opt.value = iter.id;
          opt.text = iter.title
          codes.options.add(opt)
        }
      })
      document.getElementById('code').value = item.code;
      refreshNewCostBreakdown();
      file_manager.loadFile(path.join(__dirname, `../db/.codes.json`))
        .then(res => {
          file_manager.loadFile(path.join(__dirname, `../db/.rates.json`))
            .then(rates => {
              res.forEach(i => {
                if (i.id === item.code) {
                  try {
                    if (item.code_rate_type === "Box Back Sheet Price/PC") {
                      document.getElementById("code-price").selectedIndex = 1;
                    }
                    else if (item.code_rate_type === "Secondary Top Sheet Price/PC") {
                      document.getElementById("code-price").selectedIndex = 2;
                    } else {
                      document.getElementById("code-price").selectedIndex = 0;
                    }
                    document.getElementById('code-new-rate').value = item.code_rate;
                    code_rate = computeCodeContribution(i, rates, item.code_rate_type, item.code_rate);
                  }
                  catch (e) {
                    code_rate = numValue(i.rate)
                  }
                }
              })
            })
        })
    })

  document.getElementById('qty').value = item.qty;

  file_manager.loadFile(path.join(__dirname, `../db/.doors.json`))
    .then(res => {
      const doors = document.getElementById('door-panel')
      doors.innerHTML = ""
      const opt = document.createElement('option')
      opt.value = "";
      opt.text = "Select"
      opt.classList.add('d-none')
      doors.options.add(opt)
      res.forEach(iter => {
        if (iter.utility_id === document.getElementById('utility').value && iter.type_id === document.getElementById('type').value && iter.code_id === item.code) {
          const opt = document.createElement('option')
          opt.value = iter.id;
          opt.text = iter.title
          doors.options.add(opt)
        }
      })
      document.getElementById('door-panel').value = item.door_panel;
      file_manager.loadFile(path.join(__dirname, `../db/.doors.json`))
        .then(res => {
          file_manager.loadFile(path.join(__dirname, `../db/.rates.json`))
            .then(rates => {
              res.forEach(i => {
                if (i.id === item.door_panel) {
                  try {
                    door = parseFloat(i.rate)
                    document.getElementById('finishing-new-rate').value = item.finishing_rate;
                    door = door * parseFloat(item.finishing_rate);
                    const edging = parseFloat(i.edging) * parseFloat(rates.edging_doors);
                    door = door + edging;
                  }
                  catch (e) {
                    door = i.rate
                  }

                }
              })
            })

        })
    })

  file_manager.loadFile(path.join(__dirname, `../db/.handlers.json`))
    .then(res => {
      const doors = document.getElementById('handler')
      doors.innerHTML = ""
      const opt = document.createElement('option')
      opt.value = "";
      opt.text = "Select"
      opt.classList.add('d-none')
      doors.options.add(opt)
      res.forEach(i => {
        if (document.getElementById('utility').value && i.type_id === document.getElementById('type').value && i.code_id === item.code) {
          const opt = document.createElement('option')
          opt.value = i.id;
          opt.text = i.title
          doors.options.add(opt)
        }
      })
      document.getElementById('handler').value = item.handler;
      file_manager.loadFile(path.join(__dirname, `../db/.handlers.json`))
        .then(res => {
          file_manager.loadFile(path.join(__dirname, `../db/.rates.json`))
            .then(rates => {
              res.forEach(i => {
                if (i.id === item.handler) {
                  try {
                    handler = parseFloat(i.rate)
                    document.getElementById('handle-new-rate').value = item.handle_rate;
                    handler = handler * parseFloat(item.handle_rate);
                  }
                  catch (e) {
                    handler = i.rate
                  }
                }
              })
            })

        })
    })

  file_manager.loadFile(path.join(__dirname, `../db/.hardwares.json`))
    .then(res => {
      const doors = document.getElementById('hardware')
      doors.innerHTML = ""
      const opt = document.createElement('option')
      opt.value = "";
      opt.text = "Select"
      opt.classList.add('d-none')
      doors.options.add(opt)
      res.forEach(i => {
        if (i.utility_id === document.getElementById('utility').value && i.type_id === document.getElementById('type').value && i.code_id === item.code) {
          const opt = document.createElement('option')
          opt.value = i.id;
          opt.text = i.title
          doors.options.add(opt)
        }
      })
      document.getElementById('hardware').value = item.hardware;
      refreshNewCostBreakdown();
      file_manager.loadFile(path.join(__dirname, `../db/.hardwares.json`))
        .then(res => {
          file_manager.loadFile(path.join(__dirname, `../db/.rates.json`))
            .then(rates => {
              res.forEach(i => {
                if (i.id === item.hardware) {
                  try {

                    if (item.hardware_rate_type === "Slider Price/SET") {
                      document.getElementById("hardware-price").selectedIndex = 1;
                    }
                    else if (item.hardware_rate_type === "Lift Up Price/SET") {
                      document.getElementById("hardware-price").selectedIndex = 2;
                    } else {
                      document.getElementById("hardware-price").selectedIndex = 0;
                    }
                    document.getElementById('harware-new-rate').value = item.hardware_rate
                    hardware = computeHardwareContribution(i, rates, item.hardware_rate_type, item.hardware_rate);
                  }
                  catch (e) {
                    hardware = numValue(i.rate)
                  }

                }
              })
            })

        })
    })

  file_manager.loadFile(path.join(__dirname, `../db/.shelves.json`))
    .then(res => {
      const doors = document.getElementById('shelves')
      doors.innerHTML = ""
      const opt = document.createElement('option')
      opt.value = "";
      opt.text = "Select"
      opt.classList.add('d-none')
      doors.options.add(opt)
      res.forEach(i => {
        if (i.utility_id === document.getElementById('utility').value && i.type_id === document.getElementById('type').value && i.code_id === item.code) {
          const opt = document.createElement('option')
          opt.value = i.id;
          opt.text = i.title
          doors.options.add(opt)
        }
        if (i.id === item.shelves)
          shelve = parseFloat(i.rate);
      })
      document.getElementById('shelves').value = item.shelves;
      file_manager.loadFile(path.join(__dirname, `../db/.shelves.json`))
        .then(res => {
          file_manager.loadFile(path.join(__dirname, `../db/.rates.json`))
            .then(rates => {
              res.forEach(i => {
                if (i.id === item.shelves) {
                  try {
                    shelve = parseFloat(i.rate)
                    document.getElementById('shelve-new-rate').value = item.shelve_rate;
                    shelve = shelve * parseFloat(item.shelve_rate);
                    const edging = parseFloat(i.edging) * parseFloat(rates.edging_shelve);
                    const pins = parseFloat(i.pin) * parseFloat(rates.pin_shelve);
                    shelve = shelve + edging + pins;
                  }
                  catch (e) {
                    shelve = i.rate
                  }
                }
              })
            })

        })
    })

  document.getElementById('is_shelve').value = item.is_shelve;
  document.getElementById('additional').value = item.additional;
  document.getElementById('unit').value = item.unit;
  document.getElementById('total').innerHTML = item.total;
  editSavedRawBaseCost = item.raw_base_cost != null ? Number(item.raw_base_cost) : null;
  editSavedAdditional = getCurrentAdditionalValue();
  refreshNewCostBreakdown();

  // item = {
  //   "item_id": items.length + 1,
  //   "elevation": document.getElementById('elevation-input').value,
  //   "utility": document.getElementById('utility').value,
  //   "utility_text": document.getElementById('utility').options[document.getElementById('utility').selectedIndex].text,
  //   "type": document.getElementById('type').value,
  //   "type_text": document.getElementById('type').options[document.getElementById('type').selectedIndex].text,
  //   "code": document.getElementById('code').value,
  //   "code_text": document.getElementById('code').options[document.getElementById('code').selectedIndex].text,
  //   "qty": document.getElementById('qty').value,
  //   "door_panel": document.getElementById('door-panel').value,
  //   "door_panel_text": document.getElementById('door-panel').options[document.getElementById('door-panel').selectedIndex].text,
  //   "handler": document.getElementById('handler').value,
  //   "handler_text": document.getElementById('handler').options[document.getElementById('handler').selectedIndex].text,
  //   "hardware": document.getElementById('hardware').value,
  //   "hardware_text": document.getElementById('hardware').options[document.getElementById('hardware').selectedIndex].text,
  //   "shelves": document.getElementById('shelves').value,
  //   "shelves_text": document.getElementById('shelves').options[document.getElementById('shelves').selectedIndex].text === "Select" ? "no" : document.getElementById('shelves').options[document.getElementById('shelves').selectedIndex].text,
  //   "is_shelve": document.getElementById('is_shelve').value,
  //   "custom": document.getElementById('custom').value,
  //   "unit": parseFloat(document.getElementById('unit').value),
  //   "total": parseFloat(document.getElementById('total').innerHTML)
  // }
  //
  //   item.item_id = check_list[0].item_id;
  //   items.forEach((ii, ind) => {
  //     if(ii.item_id === item.item_id)
  //       items[ind] = item
  //   })
  //
  // let pinfo = ""
  // if("pinfo" in pricing)
  // {
  //   pinfo = pricing["pinfo"]
  // }
  // pricing = {}
  // items.forEach(kk => {
  //   if(!(kk.elevation in pricing)){
  //     pricing[kk.elevation] = [kk]
  //   }
  //   else
  //   {
  //     pricing[kk.elevation].push(kk)
  //   }
  //   if(pinfo !== "")
  //     pricing["pinfo"] = pinfo
  //   check_list = []
  // })
  // document.getElementById('edit').disabled = true;
  // document.getElementById('delete').disabled = true;
  // document.getElementById('save').disabled = false;
  // populate_table()
  // clear_dropdowns()
})

function clear_dropdowns() {
  document.getElementById('elevation-input').value = "";
  document.getElementById('utility').value = "";
  document.getElementById('type').innerHTML = "";
  document.getElementById('code').innerHTML = "";
  document.getElementById('qty').value = "1";
  document.getElementById('door-panel').innerHTML = "";
  document.getElementById('handler').innerHTML = "";
  document.getElementById('hardware').innerHTML = "";
  document.getElementById('shelves').innerHTML = "";
  document.getElementById('is_shelve').value = "yes";
  document.getElementById('additional').value = "0";
  item = null;
  code_rate = 0;
  door = 0;
  handler = 0;
  hardware = 0;
  shelve = 0;
  custom_val = 0;
  document.getElementById('code-new-rate').value = 0;
  document.getElementById('finishing-new-rate').value = 0;
  document.getElementById('harware-new-rate').value = 0;
  document.getElementById("hardware-price").selectedIndex = 0;
  document.getElementById("code-price").selectedIndex = 0;
  document.getElementById('handle-new-rate').value = 0;
  document.getElementById('shelve-new-rate').value = 0;
  updateCurrentItemUnitAndTotal();
  document.getElementById('unit').readOnly = true;
  refreshNewCostBreakdown();
}

document.getElementById('clear').addEventListener('click', (event) => {
  event.preventDefault();
  clear_dropdowns();
  // file_manager.loadFile(path.join(__dirname, `../db/.pricings.json`))
  //     .then(res => {
  //       document.getElementById('pricing-no').value = res.length + 1;
  //       document.getElementById("entry-date").valueAsDate = new Date();
  //       document.getElementById('delivery-days').value = "";
  //       document.getElementById('manual-input').value = "";
  //       document.getElementById('client-input').value = "";
  //       document.getElementById('product-input').value = "";
  //       document.getElementById('sales-input').value = "";
  //       document.getElementById('carcass-input').value = "";
  //       if (document.getElementById('is_quotation').checked)
  //         document.getElementById('is_quotation').click()
  //       document.getElementById('elevation-input').value = "";
  //       document.getElementById('utility').value = "";
  //       document.getElementById('type').innerHTML = "";
  //       document.getElementById('code').innerHTML = "";
  //       document.getElementById('qty').value = "1";
  //       document.getElementById('door-panel').innerHTML = "";
  //       document.getElementById('handler').innerHTML = "";
  //       document.getElementById('hardware').innerHTML = "";
  //       document.getElementById('shelves').innerHTML = "";
  //       document.getElementById('is_shelve').value = "yes";
  //       document.getElementById('custom').value = "no";
  //       document.getElementById('unit').value = "0";
  //       document.getElementById('total').innerHTML = "0";
  //       item = null;
  //       code_rate = 0;
  //       door = 0;
  //       handler = 0;
  //       hardware = 0;
  //       shelve = 0;
  //     })
})

function all_clear() {
  file_manager.loadFile(path.join(__dirname, `../db/.pricings.json`))
    .then(res => {
      if (res.length === 0) {
        document.getElementById('pricing-no').value = "1"
      }
      else {
        document.getElementById('pricing-no').value = parseFloat(res[res.length - 1]["pinfo"].pricing_no) + 1;
      }
      document.getElementById("entry-date").valueAsDate = new Date();
      document.getElementById('entry-date-backup').value = '';
      document.getElementById('pricing-type').value = ''
      document.getElementById('delivery-days').value = "";
      document.getElementById('manual-input').value = "";
      document.getElementById('category-input').value = "";
      document.getElementById('client-input').value = "";
      document.getElementById('product-input').value = "";
      document.getElementById('sales-input').value = "";
      document.getElementById('carcass-input').value = "";
      if (document.getElementById('is_quotation').checked)
        document.getElementById('is_quotation').click()
      document.getElementById('elevation-input').value = "";
      document.getElementById('utility').value = "";
      document.getElementById('type').innerHTML = "";
      document.getElementById('code').innerHTML = "";
      document.getElementById('qty').value = "1";
      document.getElementById('door-panel').innerHTML = "";
      document.getElementById('handler').innerHTML = "";
      document.getElementById('hardware').innerHTML = "";
      document.getElementById('shelves').innerHTML = "";
      document.getElementById('is_shelve').value = "yes";
      document.getElementById('additional').value = "0";
      updateCurrentItemUnitAndTotal();
      document.getElementById('table-body-div').innerHTML = "";
      document.getElementById('save').disabled = true;
      document.getElementById('edit').disabled = true;
      document.getElementById('save').innerHTML = 'Save'
      document.getElementById('delete').disabled = true;
      document.getElementById('print').disabled = true;
      document.getElementById('open').disabled = false;
      document.getElementById('gross-amount').value = 0;
      document.getElementById('discount').value = 0;
      setDiscountVisibilityToggle(true);
      document.getElementById('tax').value = 0;
      document.getElementById('calculated-tax').value = 0;
      document.getElementById('delivery-charges').value = 0;
      document.getElementById('net').value = 0;
      document.getElementById('is_quotation').checked = true;
      ensurePricingTotalsEnabled();
      pricing = {}
      item = null
      items = []
      code_rate = 0
      door = 0
      handler = 0
      hardware = 0
      shelve = 0
      custom_val = 0
      check_list = []
      check_list2 = []
      refreshNewCostBreakdown();
    })
}

function save_func(event) {
  event.preventDefault();
}

function clonePricingRecord(record) {
  return JSON.parse(JSON.stringify(record));
}

function normalizeEntryDateValue(value) {
  if (value == null || value === "") return "";
  const str = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  const parsed = new Date(str);
  if (isNaN(parsed.getTime())) {
    const isoPart = str.split('T')[0];
    return isoPart || str;
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getEntryDateFieldValue() {
  const el = document.getElementById("entry-date");
  return normalizeEntryDateValue(el ? el.value : "");
}

function normalizeClientLookupValue(value) {
  return String(value == null ? "" : value).trim().toLowerCase();
}

function getSelectedClientDisplayName() {
  const el = document.getElementById('client-input');
  if (!el) return "";
  const option = el.options && el.selectedIndex >= 0 ? el.options[el.selectedIndex] : null;
  return option && option.text != null ? String(option.text) : "";
}

function sanitizePdfFilename(value, fallback) {
  const base = String(value == null ? "" : value);
  const cleaned = base
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/g, "");
  return cleaned || fallback || "document.pdf";
}

function buildPricingPinfo(idValue) {
  return {
    "id": idValue,
    "pricing_no": document.getElementById('pricing-no').value,
    "entry_date": getEntryDateFieldValue(),
    "delivery_days": document.getElementById('delivery-days').value,
    "manual_no": document.getElementById('manual-input').value,
    "client": document.getElementById('client-input').value,
    "client_name": document.getElementById('client-input').options[document.getElementById('client-input').selectedIndex].text,
    "product_type": document.getElementById('product-input').value,
    "sales_rp": document.getElementById('sales-input').value,
    "carcass": document.getElementById('carcass-input').value,
    "is_quotation": document.getElementById('is_quotation').checked,
    "gross_amount": document.getElementById('gross-amount').value,
    "discount": document.getElementById('discount').value,
    "show_discount": shouldShowDiscountOnOutput(),
    "tax": document.getElementById('tax').value,
    "calculated_tax": document.getElementById('calculated-tax').value,
    "delivery_charges": document.getElementById('delivery-charges').value,
    "net": document.getElementById('net').value,
    "profit_margin_percentage": profitMarginPercentage,
    "profit_margin_applied": isProfitMarginApplied(),
    "category": document.getElementById('category-input').value,
  };
}

function getPricingSortTime(pricingRow) {
  if (!pricingRow || !pricingRow.pinfo) return 0;
  const entryDate = normalizeEntryDateValue(pricingRow.pinfo.entry_date);
  const parsed = entryDate ? new Date(entryDate).getTime() : NaN;
  if (!isNaN(parsed)) return parsed;

  const idNum = Number(pricingRow.pinfo.id);
  return !isNaN(idNum) ? idNum : 0;
}

function sortSavedPricings(pricings) {
  const rows = Array.isArray(pricings) ? pricings.slice() : [];
  rows.sort((a, b) => {
    const dateDiff = getPricingSortTime(a) - getPricingSortTime(b);
    if (dateDiff !== 0) return dateDiff;

    const pricingNoDiff = numValue(a && a.pinfo ? a.pinfo.pricing_no : 0) - numValue(b && b.pinfo ? b.pinfo.pricing_no : 0);
    if (pricingNoDiff !== 0) return pricingNoDiff;

    const idA = a && a.pinfo && a.pinfo.id != null ? String(a.pinfo.id) : "";
    const idB = b && b.pinfo && b.pinfo.id != null ? String(b.pinfo.id) : "";
    return idA.localeCompare(idB);
  });
  return rows;
}

function renderOpenPricingTable(pricings, filterValue) {
  const tb = document.getElementById('load-pricing-table');
  if (!tb) return;

  const normalizedFilter = filterValue || "";
  const sorted = sortSavedPricings(pricings);
  tb.innerHTML = "";

  let visibleIndex = 0;
  sorted.forEach((i) => {
    if (!i || !i.pinfo) return;
    if (normalizedFilter === "qou" && !i.pinfo.is_quotation) return;
    if (normalizedFilter === "inv" && i.pinfo.is_quotation) return;

    visibleIndex += 1;
    const col = i.pinfo.is_quotation ? 'red' : 'black';
    const entryDate = normalizeEntryDateValue(i.pinfo.entry_date);
    tb.innerHTML += `
            <tr style="text-align: center">
                <td>
                    <label class="au-checkbox">
                       <input type="checkbox" id="${i.pinfo.id}" onclick="toggle_open(event)" style="border: 1px solid green"/>
                       <span class="au-checkmark" style="border: 1px solid green"></span>
                    </label>
                </td>
                <td>${visibleIndex}</td>
                <td class="d-none">${i.pinfo.id}</td>
                <td>${i.pinfo.pricing_no}</td>
                <td>${entryDate}</td>
                <td>${i.pinfo.client_name}</td>
                <td>${i.pinfo.manual_no}</td>
                <td style="color: ${col}">${i.pinfo.is_quotation ? "Quotation" : "Invoice"}</td>
            </tr>
          `;
  });
}

function refreshOpenPricingList() {
  return file_manager.loadFile(path.join(__dirname, '../db/.pricings.json'))
    .then((res) => {
      renderOpenPricingTable(res, document.getElementById('filter-pricing').value);
      return res;
    });
}

function load_pricing_dropdown() {
  const files = ['manuals', 'products', 'sales', 'carcass', 'elevations', 'category']
  files.forEach(i => {
    file_manager
      .loadFile(path.join(__dirname, `../db/.${i}.json`))
      .then((res) => {
        const manual = document.getElementById(i);
        res.forEach(i => {
          const opt = document.createElement('option')
          opt.value = i
          opt.style.color = 'black'
          manual.appendChild(opt)
        })
      })
  })
  file_manager
    .loadFile(path.join(__dirname, `../db/.utilities.json`))
    .then((res) => {
      const utilities = document.getElementById('utility');
      utilities.innerHTML = ""
      const opt = document.createElement('option')
      opt.value = ""
      opt.text = "Select"
      opt.style.color = 'black'
      opt.classList.add('d-none')
      utilities.appendChild(opt)
      res.forEach(i => {
        const opt = document.createElement('option')
        opt.value = i.id
        opt.text = i.title
        opt.style.color = 'black'
        utilities.options.add(opt)
      })
    })
  file_manager
    .loadFile(path.join(__dirname, `../db/.clients.json`))
    .then((res) => {
      const utilities = document.getElementById('client-input');
      utilities.innerHTML = ""
      const opt = document.createElement('option')
      opt.value = ""
      opt.text = "Select"
      opt.style.color = 'black'
      opt.classList.add("d-none")
      utilities.appendChild(opt)
      res.forEach(i => {
        const opt = document.createElement('option')
        opt.value = i.id
        opt.text = i.name
        opt.style.color = 'black'
        utilities.appendChild(opt)
      })
    })
  const qty = document.getElementById('qty')
  for (let i = 1; i < 100; i++) {
    const opt = document.createElement('option')
    opt.value = i
    opt.text = i
    opt.style.color = 'black'
    qty.options.add(opt)
  }

  file_manager
    .loadFile(path.join(__dirname, `../db/.rates.json`))
    .then((res) => {
      const hardwarePrice = document.getElementById('hardware-price')
      hardwarePrice.innerHTML = "";
      [["Hinges Price/SET", "rate_hardware"], ["Slider Price/SET", "slider_hardware"], ["Lift Up Price/SET", "lift_hardware"]].forEach(i => {
        const opt = document.createElement('option')
        opt.value = res[i[1]]
        opt.text = i[0]
        opt.style.color = 'black'
        hardwarePrice.options.add(opt)
      })
      const codePrice = document.getElementById('code-price')
      codePrice.innerHTML = "";
      [["Box Sheet Price/PC", "rate_codes"], ["Box Back Sheet Price/PC", "back_area_codes"], ["Secondary Top Sheet Price/PC", "secondary_top_codes"]].forEach(i => {
        const opt = document.createElement('option')
        opt.value = res[i[1]]
        opt.text = i[0]
        opt.style.color = 'black'
        codePrice.options.add(opt)
      })
      refreshNewCostBreakdown();
    })
}

function delete_dropdown(drp, inp) {
  const val = document.getElementById(inp).value;
  file_manager
    .loadFile(path.join(__dirname, `../db/.${drp}.json`))
    .then((res) => {
      ittems = []
      res.forEach(i => {
        if (i !== val)
          ittems.push(i)
      })
      file_manager
        .writeFile(path.join(__dirname, `../db/.${drp}.json`), ittems)
        .then((ress) => {
          file_manager
            .loadFile(path.join(__dirname, `../db/.${drp}.json`))
            .then((res) => {
              const manual = document.getElementById(drp);
              manual.innerHTML = ""
              res.forEach(i => {
                const opt = document.createElement('option')
                opt.value = i
                opt.style.color = 'black'
                manual.appendChild(opt)
              })
              document.getElementById(inp).value = ""
            })
        })
    })
}

function update_dropdown_del(event, drp, inp) {
  const val = document.getElementById(inp).value;
  if (val !== '' && event.key === "Delete") {
    delete_dropdown(drp, inp)
  }
}

function save_dropdown(event, drp, drp_text) {
  if (event.which === 13) {
    event.preventDefault();
    const new_val = document.getElementById(drp_text).value
    let values = new Set();
    const ddl = document.getElementById(drp);
    for (let i = 0; i < ddl.options.length; i++) {
      values.add(ddl.options[i].value);
    }
    const manual = document.getElementById(drp);
    manual.innerHTML = ""
    values.add(new_val)
    values.forEach(i => {
      const opt = document.createElement('option')
      opt.value = i
      manual.appendChild(opt)
    })
    manual.value = new_val
    file_manager
      .writeFile(path.join(__dirname, `../db/.${drp}.json`), Array.from(values))
      .then((res) => {
      })
  }
}

function utility_change(event) {
  editSavedRawBaseCost = null;
  event.preventDefault();
  const utility = event.target.value;
  document.getElementById('type').innerHTML = ""
  document.getElementById('code').innerHTML = ""
  document.getElementById('door-panel').innerHTML = ''
  document.getElementById('handler').innerHTML = ''
  document.getElementById('hardware').innerHTML = ''
  document.getElementById('shelves').innerHTML = ''
  document.getElementById('code-new-rate').value = 0;
  document.getElementById('finishing-new-rate').value = 0;
  document.getElementById('harware-new-rate').value = 0;
  document.getElementById("hardware-price").selectedIndex = 0;
  document.getElementById("code-price").selectedIndex = 0;
  document.getElementById('handle-new-rate').value = 0;
  document.getElementById('shelve-new-rate').value = 0;
  code_rate = 0
  door = 0
  handler = 0
  hardware = 0
  shelve = 0
      updateCurrentItemUnitAndTotal()
  if (utility !== "") {
    file_manager.loadFile(path.join(__dirname, `../db/.types.json`))
      .then(res => {
        const types = document.getElementById('type')
        types.innerHTML = ""
        const opt = document.createElement('option')
        opt.value = "";
        opt.text = "Select"
        opt.classList.add('d-none')
        types.options.add(opt)
        res.forEach(i => {
          if (i.utility_id === utility) {
            const opt = document.createElement('option')
            opt.value = i.id;
            opt.text = i.title
            types.options.add(opt)
          }
        })
      })
  }
  refreshNewCostBreakdown();
}

function type_change(event) {
  editSavedRawBaseCost = null;
  event.preventDefault();
  const type = event.target.value;
  document.getElementById('door-panel').innerHTML = ''
  document.getElementById('handler').innerHTML = ''
  document.getElementById('hardware').innerHTML = ''
  document.getElementById('shelves').innerHTML = ''
  document.getElementById('code').innerHTML = ''
  document.getElementById('code-new-rate').value = 0;
  document.getElementById('finishing-new-rate').value = 0;
  document.getElementById('harware-new-rate').value = 0;
  document.getElementById("hardware-price").selectedIndex = 0;
  document.getElementById("code-price").selectedIndex = 0;
  document.getElementById('handle-new-rate').value = 0;
  document.getElementById('shelve-new-rate').value = 0;
  code_rate = 0
  door = 0
  handler = 0
  hardware = 0
  shelve = 0
  updateCurrentItemUnitAndTotal()
  if (type !== "") {
    file_manager.loadFile(path.join(__dirname, `../db/.codes.json`))
      .then(res => {
        const codes = document.getElementById('code')
        codes.innerHTML = ""
        const opt = document.createElement('option')
        opt.value = "";
        opt.text = "Select"
        opt.classList.add('d-none')
        codes.options.add(opt)
        res.forEach(i => {
          if (i.utility_id === document.getElementById('utility').value && i.type_id === type) {
            const opt = document.createElement('option')
            opt.value = i.id;
            opt.text = i.title
            codes.options.add(opt)
          }
        })
      })
  }
  refreshNewCostBreakdown();
}

function code_change(event) {
  editSavedRawBaseCost = null;
  event.preventDefault();
  const code = event.target.value;
  if (code === '') {
    document.getElementById('additional').value = 0;
    custom_val = 0
    code_rate = 0
    door = 0
    handler = 0
    hardware = 0
    shelve = 0
    document.getElementById('door-panel').innerHTML = '';
    document.getElementById('handler').innerHTML = '';
    document.getElementById('hardware').innerHTML = '';
    document.getElementById('shelves').innerHTML = '';
    document.getElementById('code-new-rate').value = 0;
    document.getElementById('finishing-new-rate').value = 0;
    document.getElementById('harware-new-rate').value = 0;
    document.getElementById("hardware-price").selectedIndex = 0;
    document.getElementById('handle-new-rate').value = 0;
    document.getElementById('shelve-new-rate').value = 0;
    updateCurrentItemUnitAndTotal();
  }
  else {
    file_manager.loadFile(path.join(__dirname, `../db/.codes.json`))
      .then(res => {
        file_manager.loadFile(path.join(__dirname, `../db/.rates.json`))
          .then(rates => {
            res.forEach(i => {
              if (i.id === code) {
                try {
                  document.getElementById("code-price").selectedIndex = 0;
                  document.getElementById('code-new-rate').value = rates.rate_codes
                  code_rate = computeCodeContribution(i, rates, "Box Sheet Price/PC", rates.rate_codes);
                }
                catch (e) {
                  code_rate = numValue(i.rate)
                }
                updateCurrentItemUnitAndTotal();
              }
            })
          })
      })
    door = 0
    handler = 0
    hardware = 0
    shelve = 0
    document.getElementById('door-panel').value = ''
    document.getElementById('handler').value = ''
    document.getElementById('hardware').value = ''
    document.getElementById('shelves').value = ''
    file_manager.loadFile(path.join(__dirname, `../db/.doors.json`))
      .then(res => {
        const doors = document.getElementById('door-panel')
        doors.innerHTML = ""
        const opt = document.createElement('option')
        opt.value = "";
        opt.text = "Select"
        opt.classList.add('d-none')
        doors.options.add(opt)
        res.forEach(i => {
          if (i.utility_id === document.getElementById('utility').value && i.type_id === document.getElementById('type').value && i.code_id === code) {
            const opt = document.createElement('option')
            opt.value = i.id;
            opt.text = i.title
            doors.options.add(opt)
          }
        })
      })

    file_manager.loadFile(path.join(__dirname, `../db/.handlers.json`))
      .then(res => {
        const doors = document.getElementById('handler')
        doors.innerHTML = ""
        const opt = document.createElement('option')
        opt.value = "";
        opt.text = "Select"
        opt.classList.add('d-none')
        doors.options.add(opt)
        res.forEach(i => {
          if (document.getElementById('utility').value && i.type_id === document.getElementById('type').value && i.code_id === code) {
            const opt = document.createElement('option')
            opt.value = i.id;
            opt.text = i.title
            doors.options.add(opt)
          }
        })
      })

    file_manager.loadFile(path.join(__dirname, `../db/.hardwares.json`))
      .then(res => {
        const doors = document.getElementById('hardware')
        doors.innerHTML = ""
        const opt = document.createElement('option')
        opt.value = "";
        opt.text = "Select"
        opt.classList.add('d-none')
        doors.options.add(opt)
        res.forEach(i => {
          if (i.utility_id === document.getElementById('utility').value && i.type_id === document.getElementById('type').value && i.code_id === code) {
            const opt = document.createElement('option')
            opt.value = i.id;
            opt.text = i.title
            doors.options.add(opt)
          }
        })
      })

    file_manager.loadFile(path.join(__dirname, `../db/.shelves.json`))
      .then(res => {
        const doors = document.getElementById('shelves')
        doors.innerHTML = ""
        const opt = document.createElement('option')
        opt.value = "";
        opt.text = "Select"
        opt.classList.add('d-none')
        doors.options.add(opt)
        res.forEach(i => {
          if (i.utility_id === document.getElementById('utility').value && i.type_id === document.getElementById('type').value && i.code_id === code) {
            const opt = document.createElement('option')
            opt.value = i.id;
            opt.text = i.title
            doors.options.add(opt)
          }
        })
      })
  }
  refreshNewCostBreakdown();
}

document.getElementById("hardware-price").addEventListener("change", (event) => {
  document.getElementById("harware-new-rate").value = event.target.value;
  recalculateHardwareContributionFromCurrentSelection();
})

document.getElementById("code-price").addEventListener("change", (event) => {
  document.getElementById("code-new-rate").value = event.target.value;
  recalculateCodeContributionFromCurrentSelection();
})

document.getElementById("harware-new-rate").addEventListener("change", () => {
  recalculateHardwareContributionFromCurrentSelection();
})

document.getElementById("code-new-rate").addEventListener("change", () => {
  recalculateCodeContributionFromCurrentSelection();
})

function recalcNetFromEnteredTotals() {
  const gross = Math.round(Number(document.getElementById('gross-amount').value) || 0);
  const showDiscount = shouldShowDiscountOnOutput();
  const disc = showDiscount
    ? Math.round(Number(document.getElementById('discount').value) || 0)
    : 0;
  const taxAmount = Math.round(Number(document.getElementById('calculated-tax').value) || 0);
  const delivery = Math.round(Number(document.getElementById('delivery-charges').value) || 0);
  document.getElementById('net').value = Math.round(Math.max(0, gross - disc) + taxAmount + delivery);
}

function discount_and_tax() {
  const gross = Math.round(Number(document.getElementById('gross-amount').value) || 0);
  const showDiscount = shouldShowDiscountOnOutput();
  const disc = showDiscount
    ? Math.round(Number(document.getElementById('discount').value) || 0)
    : 0;
  const taxPct = Math.round(Number(document.getElementById('tax').value) || 0);
  const delivery = Math.round(Number(document.getElementById('delivery-charges').value) || 0);

  if (!showDiscount) {
    document.getElementById('discount').value = 0;
  }

  if (gross === 0) {
    document.getElementById('calculated-tax').value = 0;
    document.getElementById('net').value = delivery;
    return;
  }

  const discounted_value = gross - disc;
  const taxAmount = (discounted_value * taxPct) / 100;
  document.getElementById('calculated-tax').value = Math.round(taxAmount);
  document.getElementById('net').value = Math.round(discounted_value + taxAmount + delivery);
}

function populate_table() {
  const table = document.getElementById('table-body-div')
  table.innerHTML = ""
  const keys = Object.keys(pricing)
  let count = 1
  keys.forEach(i => {
    if (pricing[i].length > 0 && i !== "pinfo") {
      table.innerHTML += `<tr class="elevation-row-pricing"><td style=" font-size: large; text-align: center; padding: 0px; color: black; font-weight: bold; border-bottom: 1px solid black" colspan="12">${i}</td></tr>`;
      pricing[i].forEach((j, ind) => {
        table.innerHTML += `
          <tr class="tr-shadow" style=" ">
            <td class="p-1" style="width: 60px; border-right: 1px solid black; border-bottom: 1px solid black;">
              <label class="au-checkbox" style="margin-top: 2.5px"> 
                <input type="checkbox" id="${i + '~' + j.item_id.toString()}" onchange="toggle(event);">
                <span class="au-checkmark" style="border: 1px solid green; width: 20px; height: 20px"></span>
              </label>
            </td>
            <td style="width: 40px; color: black; border-right: 1px solid black; border-bottom: 1px solid black;" class="p-1">${count}</td>
            <td class="p-1 might-overflow" style="width: 150px; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; color: black; border-right: 1px solid black; border-bottom: 1px solid black;">${j.utility_text}</td>
            <td class="p-1" style="width: 185px; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; color: black;  border-right: 1px solid black; border-bottom: 1px solid black;">${j.type_text}</td>
            <td class="p-1" style="width: 70px; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; color: black; border-right: 1px solid black; border-bottom: 1px solid black;">${j.code_text}</td>
            <td class="p-1" style="text-overflow: ellipsis; white-space: nowrap; overflow: hidden; color: black; width: 35px; border-right: 1px solid black; border-bottom: 1px solid black;">${j.qty}</td>
            <td class="p-1" style="width: 175px; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; color: black; border-right: 1px solid black; border-bottom: 1px solid black;">${j.door_panel_text}</td>
            <td class="p-1" style="width: 100px; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; color: black; border-right: 1px solid black; border-bottom: 1px solid black;">${j.handler_text}</td>
            <td class="p-1" style="width: 120px; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; color: black; border-right: 1px solid black; border-bottom: 1px solid black;">${j.hardware_text}</td>
            <td class="p-1" style="width: 105px; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; color: black; border-right: 1px solid black; border-bottom: 1px solid black;">${j.shelves_text}</td>
            <td class="p-1" style="width: 85px; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; color: black; border-right: 1px solid black; border-bottom: 1px solid black;">${Intl.NumberFormat('en-US').format(j && j.unit != null ? j.unit : 0)}</td>
            <td class="p-1" style="width: 70px; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; color: black; border-bottom: 1px solid black; ">${Intl.NumberFormat('en-US').format(j && j.total != null ? j.total : 0)}</td>
          </tr>`;
        count += 1
      });
    }
  })
  ensurePricingTotalsEnabled();
}

document.getElementById('form-pricing').addEventListener('submit', (event) => {
  event.preventDefault();
  document.getElementById('open').disabled = true;
  const select = document.getElementById("hardware-price");
  const selectedIndex = select.selectedIndex;
  const selectedText = select.options[selectedIndex].text;
  const select1 = document.getElementById("code-price");
  const selectedIndex1 = select1.selectedIndex;
  const selectedText1 = select1.options[selectedIndex1].text;
  item = {
    "item_id": items.length + 1,
    "elevation": document.getElementById('elevation-input').value,
    "utility": document.getElementById('utility').value,
    "utility_text": document.getElementById('utility').options[document.getElementById('utility').selectedIndex].text,
    "type": document.getElementById('type').value,
    "type_text": document.getElementById('type').options[document.getElementById('type').selectedIndex].text,
    "code": document.getElementById('code').value,
    "code_text": document.getElementById('code').options[document.getElementById('code').selectedIndex].text,
    "qty": document.getElementById('qty').value,
    "door_panel": document.getElementById('door-panel').value,
    "door_panel_text": document.getElementById('door-panel').options[document.getElementById('door-panel').selectedIndex].text === "Select" ? "" : document.getElementById('door-panel').options[document.getElementById('door-panel').selectedIndex].text,
    "handler": document.getElementById('handler').value,
    "handler_text": document.getElementById('handler').options[document.getElementById('handler').selectedIndex].text === "Select" ? "" : document.getElementById('handler').options[document.getElementById('handler').selectedIndex].text,
    "hardware": document.getElementById('hardware').value,
    "hardware_text": document.getElementById('hardware').options[document.getElementById('hardware').selectedIndex].text === "Select" ? "" : document.getElementById('hardware').options[document.getElementById('hardware').selectedIndex].text,
    "shelves": document.getElementById('shelves').value,
    "shelves_text": document.getElementById('shelves').options[document.getElementById('shelves').selectedIndex].text === "Select" ? "" : document.getElementById('shelves').options[document.getElementById('shelves').selectedIndex].text,
    "is_shelve": document.getElementById('is_shelve').value,
    "additional": document.getElementById('additional').value,
    "raw_base_cost": getCurrentFormBaseUnit(),
    "unit": parseFloat(document.getElementById('unit').value),
    "total": Math.round(parseFloat(document.getElementById('total').innerHTML), 0),
    "code_rate": document.getElementById('code-new-rate').value,
    "finishing_rate": document.getElementById('finishing-new-rate').value,
    "handle_rate": document.getElementById('handle-new-rate').value,
    "hardware_rate": document.getElementById('harware-new-rate').value,
    "hardware_rate_type": selectedText,
    "code_rate_type": selectedText1,
    "shelve_rate": document.getElementById('shelve-new-rate').value,
  }
  if (document.getElementById('is_shelve').value === 'no') {
    item.shelves_text = ''
  }
  if (check_list.length === 0) {
    items.push(item);
  }
  else {
    item.item_id = check_list[0].item_id;
    items.forEach((ii, ind) => {
      if (ii.item_id === item.item_id)
        items[ind] = item
    })
  }

  let pinfo = ""
  if ("pinfo" in pricing) {
    pinfo = pricing["pinfo"]
  }
  pricing = {}
  items.forEach(kk => {
    if (!(kk.elevation in pricing)) {
      pricing[kk.elevation] = [kk]
    }
    else {
      pricing[kk.elevation].push(kk)
    }
    if (pinfo !== "")
      pricing["pinfo"] = pinfo
    check_list = []
  })
  document.getElementById('delete').disabled = true;
  document.getElementById('save').disabled = false;
  document.getElementById('unit').readOnly = true;
  populate_table()
  recalcGrossFromItems()
  clear_dropdowns()
  document.getElementById('edit').disabled = true;
})

document.getElementById('additional').addEventListener('input', () => {
  updateCurrentItemUnitAndTotal();
})

document.getElementById('is_shelve').addEventListener('change', (event) => {
  editSavedRawBaseCost = null;
  const val = event.target.value;
  if (val === "yes" && shelve === 0) {
    // document.getElementById('unit').value = parseFloat(document.getElementById('unit').value) - shelve;
    // document.getElementById('total').innerHTML = (parseFloat(document.getElementById('qty').value) * parseFloat(document.getElementById('unit').value)).toFixed(2);
    file_manager.loadFile(path.join(__dirname, `../db/.shelves.json`))
      .then(res => {
        file_manager.loadFile(path.join(__dirname, `../db/.rates.json`))
          .then(rates => {
            res.forEach(i => {
              const selectedShelveId = document.getElementById("shelves").value;
              if (selectedShelveId && i.id === selectedShelveId) {
                try {
                  shelve = parseFloat(i.rate)
                  document.getElementById('shelve-new-rate').value = rates.rate_shelve;
                  shelve = shelve * parseFloat(rates.rate_shelve);
                  const edging = parseFloat(i.edging) * parseFloat(rates.edging_shelve);
                  const pins = parseFloat(i.pin) * parseFloat(rates.pin_shelve);
                  shelve = shelve + edging + pins;
                }
                catch (e) {
                  shelve = i.rate
                }
                updateCurrentItemUnitAndTotal();
              }
            })
          })
      })
  }
  else if (val === "no" && shelve !== 0) {
    document.getElementById('shelves').value = ""
    shelve = 0
    updateCurrentItemUnitAndTotal();
  }
})

document.getElementById('qty').addEventListener('change', (event) => {
  editSavedRawBaseCost = null;
  updateCurrentItemUnitAndTotal();
})

document.getElementById('door-panel').addEventListener('change', (event) => {
  editSavedRawBaseCost = null;
  const val = event.target.value;
  document.getElementById('additional').value = 0;
  custom_val = 0;
  if (val === '') {
    door = 0
    updateCurrentItemUnitAndTotal();
  }
  else {
    file_manager.loadFile(path.join(__dirname, `../db/.doors.json`))
      .then(res => {
        file_manager.loadFile(path.join(__dirname, `../db/.rates.json`))
          .then(rates => {
            res.forEach(i => {
              if (i.id === val) {
                try {
                  door = parseFloat(i.rate)
                  document.getElementById('finishing-new-rate').value = rates.rate_doors;
                  door = door * parseFloat(rates.rate_doors);
                  const edging = parseFloat(i.edging) * parseFloat(rates.edging_doors);
                  door = door + edging;
                }
                catch (e) {
                  door = i.rate
                }
                updateCurrentItemUnitAndTotal();
              }
            })
          })

      })
  }
  refreshNewCostBreakdown();
})

document.getElementById('handler').addEventListener('change', (event) => {
  editSavedRawBaseCost = null;
  const val = event.target.value;
  document.getElementById('additional').value = 0;
  custom_val = 0;
  if (val === '') {
    handler = 0
    updateCurrentItemUnitAndTotal();
  }
  else {
    file_manager.loadFile(path.join(__dirname, `../db/.handlers.json`))
      .then(res => {
        file_manager.loadFile(path.join(__dirname, `../db/.rates.json`))
          .then(rates => {
            res.forEach(i => {
              if (i.id === val) {
                try {
                  handler = parseFloat(i.rate)
                  document.getElementById('handle-new-rate').value = rates.rate_handles;
                  handler = handler * parseFloat(rates.rate_handles);
                }
                catch (e) {
                  handler = i.rate
                }
                updateCurrentItemUnitAndTotal();
              }
            })
          })

      })
  }
})

document.getElementById('hardware').addEventListener('change', (event) => {
  editSavedRawBaseCost = null;
  const val = event.target.value;
  document.getElementById('additional').value = 0;
  custom_val = 0;
  if (val === '') {
    hardware = 0
    updateCurrentItemUnitAndTotal();
  }
  else {
    file_manager.loadFile(path.join(__dirname, `../db/.hardwares.json`))
      .then(res => {
        file_manager.loadFile(path.join(__dirname, `../db/.rates.json`))
          .then(rates => {
            res.forEach(i => {
              if (i.id === val) {
                try {
                  document.getElementById("hardware-price").selectedIndex = 0;
                  document.getElementById('harware-new-rate').value = rates.rate_hardware;
                  hardware = computeHardwareContribution(i, rates, "Hinges Price/SET", rates.rate_hardware);
                }
                catch (e) {
                  hardware = numValue(i.rate);
                }
                updateCurrentItemUnitAndTotal();
              }
            })
          })

      })
  }
})

document.getElementById('shelves').addEventListener('change', (event) => {
  editSavedRawBaseCost = null;
  const val = event.target.value;
  if (val === '') {
    shelve = 0
    updateCurrentItemUnitAndTotal();
  }
  else {
    file_manager.loadFile(path.join(__dirname, `../db/.shelves.json`))
      .then(res => {
        file_manager.loadFile(path.join(__dirname, `../db/.rates.json`))
          .then(rates => {
            res.forEach(i => {
              if (i.id === val) {
                try {
                  shelve = parseFloat(i.rate)
                  document.getElementById('shelve-new-rate').value = rates.rate_shelve;
                  shelve = shelve * parseFloat(rates.rate_shelve);
                  const edging = parseFloat(i.edging) * parseFloat(rates.edging_shelve);
                  const pins = parseFloat(i.pin) * parseFloat(rates.pin_shelve);
                  shelve = shelve + edging + pins;
                }
                catch (e) {
                  shelve = i.rate
                }
                document.getElementById('is_shelve').value = 'yes';
                updateCurrentItemUnitAndTotal();
              }
            })
          })

      })
  }
})

document.getElementById('tax').addEventListener('keyup', () => {
  discount_and_tax();
})
document.getElementById('tax').addEventListener('change', () => {
  discount_and_tax();
})

document.getElementById('gross-amount').addEventListener('keyup', () => {
  discount_and_tax();
})
document.getElementById('gross-amount').addEventListener('change', () => {
  discount_and_tax();
})

document.getElementById('discount').addEventListener('keyup', () => {
  discount_and_tax();
})
document.getElementById('discount').addEventListener('change', () => {
  discount_and_tax();
})

document.getElementById('calculated-tax').addEventListener('keyup', () => {
  recalcNetFromEnteredTotals();
})
document.getElementById('calculated-tax').addEventListener('change', () => {
  recalcNetFromEnteredTotals();
})

document.getElementById('delivery-charges').addEventListener('keyup', () => {
  discount_and_tax();
})
document.getElementById('delivery-charges').addEventListener('change', () => {
  discount_and_tax();
})

document.getElementById('apply-profit-margin').addEventListener('change', (event) => {
  editSavedRawBaseCost = null;
  updateCurrentItemUnitAndTotal();
})

document.getElementById('confirm').addEventListener('click', (event) => {
  event.preventDefault();
  file_manager
    .loadFile(path.join(__dirname, "../db/.credentials.json"))
    .then((res) => {
      if (res[0].password === document.getElementById("pass").value) {
        file_manager.loadFile(path.join(__dirname, '../db/.pricings.json'))
          .then(res => {
            const old_pricing = res;
            const loadedPinfo = pricing["pinfo"] || null;
            const refNoChanged = !!(loadedPinfo && String(loadedPinfo.manual_no || '') !== String(document.getElementById('manual-input').value || ''));
            const shouldUpdateExisting = !!(loadedPinfo && loadedPinfo.id && loadedPinfo.is_quotation === document.getElementById('is_quotation').checked) && !refNoChanged;
            const refNo = document.getElementById('manual-input').value;
            const doSave = () => {
              if (shouldUpdateExisting) {
                old_pricing.forEach((l, ind) => {
                  if (l['pinfo'].id == loadedPinfo.id) {
                    pricing["pinfo"] = buildPricingPinfo(l['pinfo'].id);
                    old_pricing[ind] = clonePricingRecord(pricing)
                  }
                })
                file_manager.writeFile(path.join(__dirname, '../db/.pricings.json'), old_pricing)
                  .then(res => {
                    document.getElementById('cancel').click();
                    if (res === 'success') {
                      refreshOpenPricingList();
                      alert("Pricing Saved Successfully!")
                      all_clear()
                      document.getElementById('save').disabled = true;
                      document.getElementById('print').classList.add("d-none");
                      document.getElementById('delete').disabled = true;
                    }
                    else {
                      alert("An Error Occurred While Saving!")
                    }
                  })
              }
              else {
                pricing["pinfo"] = buildPricingPinfo(Date.now().toString())
                old_pricing.push(clonePricingRecord(pricing));
                file_manager.writeFile(path.join(__dirname, '../db/.pricings.json'), old_pricing)
                  .then(res => {
                    document.getElementById('cancel').click();
                    if (res === 'success') {
                      refreshOpenPricingList();
                      alert("Pricing Saved Successfully!")
                      all_clear()
                      document.getElementById('save').disabled = true;
                      document.getElementById('print').classList.add("d-none");
                      document.getElementById('delete').disabled = true;
                    }
                    else {
                      alert("An Error Occurred While Saving!")
                    }
                  })
              }
            };
            if (refNo) {
              const loadedId = loadedPinfo && loadedPinfo.id && shouldUpdateExisting ? String(loadedPinfo.id) : null;
              const duplicateRef = old_pricing.some(p => {
                const otherId = p && p.pinfo && p.pinfo.id != null ? String(p.pinfo.id) : null;
                return otherId !== loadedId && String(p.pinfo.manual_no || '') === refNo;
              });
              if (duplicateRef || shouldUpdateExisting) {
                document.getElementById('ref-confirm-message').textContent = duplicateRef
                  ? 'Reference number "' + refNo + '" already exists in another pricing. Do you want to save with the same reference number?'
                  : 'You are updating quotation "' + refNo + '". Do you want to continue?';
                document.getElementById('ref-confirm-save').onclick = () => {
                  window.jQuery('#ref-confirm-modal').modal('hide');
                  doSave();
                };
                document.getElementById('ref-confirm-cancel').onclick = () => {
                  window.jQuery('#ref-confirm-modal').modal('hide');
                };
                if (window.modalInputFix) window.modalInputFix.hideModal('#staticModal');
                else window.jQuery('#staticModal').modal('hide');
                if (window.modalInputFix) window.modalInputFix.showModal('#ref-confirm-modal');
                else window.jQuery('#ref-confirm-modal').modal('show');
                return;
              }
            }
            doSave();
          })
      }
      else {
        window.modalInputFix.showInvalid('pass', 'Invalid Password, Try Again!');
      }
    })
  if (document.getElementById('checkbox-all-open').checked)
    document.getElementById('checkbox-all-open').checked = false
})

function toggle_open(event) {
  const val = event.target.id
  if (event.target.checked) {
    file_manager.loadFile(path.join(__dirname, `../db/.pricings.json`))
      .then(res => {
        res.forEach(i => {
          if (i["pinfo"].id.toString() === val) {
            check_list2.push(i)
            document.getElementById('delete-1').disabled = false;
            document.getElementById('confirm-1').disabled = false;
          }
        })
        if (check_list2.length === res.length) {
          if (!document.getElementById('checkbox-all-open').checked)
            document.getElementById('checkbox-all-open').checked = true
        }
        if (check_list2.length > 1) {
          document.getElementById('confirm-1').disabled = true;
        }
      })

  }
  else {
    file_manager.loadFile(path.join(__dirname, `../db/.pricings.json`))
      .then(res => {
        res.forEach(i => {
          if (i["pinfo"].id.toString() === val) {
            const ind = check_list2.indexOf(i)
            check_list2.splice(ind, 1)
          }
        })
        if (check_list2.length === 0) {
          document.getElementById('confirm-1').disabled = true;
          document.getElementById('delete-1').disabled = true;
          if (document.getElementById('checkbox-all-open').checked)
            document.getElementById('checkbox-all-open').checked = false
        }
        if (check_list2.length === 1) {
          document.getElementById('confirm-1').disabled = false;
          document.getElementById('delete-1').disabled = false;
          if (document.getElementById('checkbox-all-open').checked)
            document.getElementById('checkbox-all-open').checked = false
        }
        if (check_list2.length > 1) {
          document.getElementById('confirm-1').disabled = true;
          document.getElementById('delete-1').disabled = false;
        }
        if (check_list2.length !== res.length) {
          if (document.getElementById('checkbox-all-open').checked)
            document.getElementById('checkbox-all-open').checked = false
        }


      })
  }
}

document.getElementById('open').addEventListener('click', (event) => {
  refreshOpenPricingList()
    .then(() => {
      check_list2 = []
      document.getElementById('checkbox-all-open').checked = false;
      document.getElementById('confirm-1').disabled = true;
    })
})

document.getElementById('form-pricing').addEventListener('input', (event) => {
  if (items.length > 0) {
    document.getElementById('save').disabled = false;
    document.getElementById('print').classList.add('d-none')
  }
})

document.getElementById('confirm-1').addEventListener('click', (event) => {
  event.preventDefault();
  document.getElementById('cancel-1').click();
  file_manager.loadFile(path.join(__dirname, '../db/.pricings.json'))
    .then(res => {
      document.getElementById('print').classList.remove('d-none')
      res.forEach(i => {
        if (document.getElementById(i["pinfo"].id) && document.getElementById(i["pinfo"].id).checked) {
          document.getElementById('save').innerHTML = "Update";
          document.getElementById('pricing-no').value = i["pinfo"].pricing_no;
          document.getElementById("entry-date").value = normalizeEntryDateValue(i["pinfo"].entry_date);
          document.getElementById('entry-date-backup').value = '';
          document.getElementById('pricing-type').value = ''
          document.getElementById('delivery-days').value = i["pinfo"].delivery_days;
          document.getElementById('manual-input').value = i["pinfo"].manual_no;
          document.getElementById('client-input').value = i["pinfo"].client;
          document.getElementById('product-input').value = i["pinfo"].product_type;
          document.getElementById('sales-input').value = i["pinfo"].sales_rp;
          document.getElementById('carcass-input').value = i["pinfo"].carcass;
          document.getElementById('is_quotation').checked = i["pinfo"].is_quotation;

          if (i["pinfo"].profit_margin_percentage != null) {
            const pct = Number(i["pinfo"].profit_margin_percentage);
            profitMarginPercentage = isNaN(pct) ? profitMarginPercentage : pct;
            setProfitMarginLabel();
          }
          if (i["pinfo"].profit_margin_applied != null) {
            document.getElementById('apply-profit-margin').checked = !!i["pinfo"].profit_margin_applied;
          }

          document.getElementById('gross-amount').value = i["pinfo"].gross_amount;
          document.getElementById('discount').value = i["pinfo"].discount;
          setDiscountVisibilityToggle(i["pinfo"].show_discount);
          document.getElementById('tax').value = i["pinfo"].tax;
          document.getElementById('calculated-tax').value = i["pinfo"].calculated_tax;
          document.getElementById('delivery-charges').value = i["pinfo"].delivery_charges || 0;
          document.getElementById('net').value = i["pinfo"].net;
          document.getElementById('category-input').value = i["pinfo"].category;
          document.getElementById('open').disabled = true
          document.getElementById('confirm-1').disabled = true;
          document.getElementById('print').disabled = false;
          document.getElementById('delete-1').disabled = true;
          check_list2 = []
          item = null;
          code_rate = 0;
          door = 0;
          handler = 0;
          hardware = 0;
          shelve = 0;
          pricing = clonePricingRecord(i)
          const keys = Object.keys(pricing)
          keys.forEach(i => {
            if (pricing[i].length > 0 && i !== "pinfo") {
              pricing[i].forEach(j => {
                if (j && j.raw_base_cost == null) {
                  const unitRaw = j.unit != null ? Number(j.unit) : 0;
                  j.raw_base_cost = !isNaN(unitRaw) ? unitRaw : 0;
                }
                items.push(clonePricingRecord(j))
              });
            }
          })
          ensurePricingTotalsEnabled();
          populate_table();
          recalcGrossFromItems();
        }
      })
    })
})

document.getElementById('show-discount').addEventListener('change', () => {
  syncDiscountFieldVisibility();
});

document.getElementById('is_quotation').addEventListener('change', (event) => {
  ensurePricingTotalsEnabled();

  if (event.target.checked) {
    const backupDate = document.getElementById('entry-date-backup').value;
    if (backupDate != '') {
      document.getElementById("entry-date").value = backupDate;
    }
  }
  else {
    document.getElementById("entry-date-backup").value = document.getElementById("entry-date").value;
    var date = new Date();
    var day = date.getDate();
    var month = date.getMonth() + 1;
    var year = date.getFullYear();
    if (month < 10) month = "0" + month;
    if (day < 10) day = "0" + day;
    document.getElementById("entry-date").value = year + "-" + month + "-" + day;
  }
})

function close_modal(event) {
  event.preventDefault();
  document.getElementById('del-pass').value = '';
  // document.getElementById('load-pricing-table').innerHTML = ''
  // document.getElementById('checkbox-all-open').checked = false;
  // document.getElementById('confirm-1').disabled = true;
}

document.getElementById('print').addEventListener('click', async function (event) {
  let element = document.getElementById('my-table');
  // #region debug-point A:print-click-entry
  reportPrintDebug('A', 'pricing.js:print-click', '[DEBUG] Print clicked', {
    isQuotation: !!document.getElementById('is_quotation').checked,
    pricingNo: String(document.getElementById('pricing-no').value || ''),
    clientId: String(document.getElementById('client-input').value || ''),
    clientNameInput: String(document.getElementById('client-input').value || ''),
    entryDateRaw: String(document.getElementById('entry-date').value || ''),
    hasValueAsDate: !!document.getElementById('entry-date').valueAsDate,
    itemsCount: Array.isArray(items) ? items.length : -1,
    hasHtml2Pdf: typeof html2pdf !== 'undefined'
  });
  // #endregion
  if (window.modalInputFix && typeof window.modalInputFix.forceReleaseUiLocks === 'function') {
    window.modalInputFix.forceReleaseUiLocks();
  }
  var opt = {
    margin: 0.5,
    filename: 'invoice.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 5 },
    jsPDF: { unit: 'in', format: 'A4', orientation: 'portrait' }
  };
  file_manager.loadFile(path.join(__dirname, '../db/.firm.json'))
      .then(res => {
        // #region debug-point B:print-firm-loaded
        reportPrintDebug('B', 'pricing.js:firm-loaded', '[DEBUG] Firm data loaded for print', {
          firmCount: Array.isArray(res) ? res.length : -1,
          firmName: res && res[0] && res[0].name != null ? String(res[0].name) : '',
          hasLogo: !!(res && res[0] && res[0].logo)
        });
        // #endregion

        if (!res || !Array.isArray(res) || res.length === 0) {
          res = [{ name: "", logo: "", address: "", contact: "" }];
        }
        let logoSrc = "";
        if (res[0].logo) {
          try {
            const logoBuffer = fs.readFileSync(res[0].logo);
            const ext = path.extname(res[0].logo).toLowerCase();
            const mime = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.gif' ? 'image/gif' : ext === '.webp' ? 'image/webp' : ext === '.bmp' ? 'image/bmp' : 'image/png';
            logoSrc = `data:${mime};base64,${logoBuffer.toString('base64')}`;
          } catch (e) {
            logoSrc = "";
          }
        }
        if (!logoSrc) {
          try {
            const defaultLogoPath = path.join(__dirname, '../images/logo.png');
            const logoBuffer = fs.readFileSync(defaultLogoPath);
            logoSrc = `data:image/png;base64,${logoBuffer.toString('base64')}`;
          } catch (e) {
            logoSrc = "";
          }
        }

        // const header = element.rows[0]
        // for (var i = 0; i < element.rows[0].cells.length; i++) {
        //
        //   // Getting the text of columnName
        //   var str = element.rows[0].cells[i].innerHTML;
        //
        //   // If 'Geek_id' matches with the columnName 
        //   if (str.search("All") != -1) {
        //     for (var j = 0; j < element.rows.length; j++) {
        //       if(element.rows[j].classList[0] !== "elevation-row-pricing")
        //         element.rows[j].deleteCell(i);
        //     }
        //   }
        // }
        file_manager.loadFile(path.join(__dirname, '../db/.clients.json'))
          .then(ress => {
            // #region debug-point B:print-clients-loaded
            reportPrintDebug('B', 'pricing.js:clients-loaded', '[DEBUG] Clients loaded for print lookup', {
              clientsCount: Array.isArray(ress) ? ress.length : -1,
              selectedClientId: String(document.getElementById('client-input').value || '')
            });
            // #endregion
            const selectedClientId = String(document.getElementById('client-input').value || '');
            const selectedClientName = getSelectedClientDisplayName();
            const savedClientName = pricing && pricing.pinfo && pricing.pinfo.client_name != null ? String(pricing.pinfo.client_name) : '';
            let matchedClient = false;
            ress.forEach(k => {
              let qout = ""
              let total = ""
              let name = ""
              let days_notice = ``;
              const showDiscountInOutput = shouldShowDiscountOnOutput();
              const totalRows = [
                {
                  label: 'Total:',
                  value: Math.round(numValue(document.getElementById('gross-amount').value)),
                }
              ];

              if (showDiscountInOutput) {
                totalRows.push({
                  label: 'Discount:',
                  value: Math.round(numValue(document.getElementById('discount').value)),
                });
              }

              totalRows.push({
                label: 'Taxes:',
                value: Math.round(numValue(document.getElementById('calculated-tax').value)),
              });

              const deliveryVal = Math.round(numValue(document.getElementById('delivery-charges').value));
              totalRows.push({
                label: 'Delivery Charges:',
                value: deliveryVal,
              });

              totalRows.push({
                label: 'Net Value:',
                value: Math.round(numValue(document.getElementById('net').value)),
                isNet: true,
              });

              total = `
                            <div style="color: black; width: 180px;">
                              ${totalRows.map((row, index) => {
                                const isBeforeNet = !row.isNet && totalRows[index + 1] && totalRows[index + 1].isNet;
                                const labelBorder = row.isNet ? 'border-top: 1px solid black;' : '';
                                const valueBorder = row.isNet
                                  ? 'border-top: 1px solid black; border-bottom: 1px double black; font-weight: 700;'
                                  : (isBeforeNet ? 'border-bottom: 1px solid black;' : '');
                                return `
                                  <div style="font-size: 0; white-space: nowrap; margin: 0; padding: 0;">
                                    <span style="display: inline-block; width: 100px; font-size: 10px; font-weight: 700; text-align: right; padding: 2px 10px 2px 0; box-sizing: border-box; ${labelBorder}">${row.label}</span>
                                    <span style="display: inline-block; width: 80px; font-size: 10px; font-weight: 500; text-align: right; padding: 2px 0; box-sizing: border-box; ${valueBorder}">${formatBreakdownNumber(row.value)}</span>
                                  </div>
                                `;
                              }).join('')}
                            </div>
                        `;

              if (document.getElementById('is_quotation').checked) {
                days_notice = `<div style="position: absolute; right: 0;"><p style="color: red; font-size: 9px;"><b>Notice: </b>This Quotation is valid for 7 days only.</p></div>`
                qout = `
                          <div style="display: flex; flex-direction: row; justify-content: space-between">
                                <h3 style="color: black">${res[0].name}</h3>
                                <div style="background-color: black; height: 30px; width: 100px; text-align: center; align-items: center; position: absolute; right: 0; border-radius: 20px">
                                    <p style="color: white; font-size: 13px; text-align: center; margin-top: 5px"><b>QUOTATION</b></p>
                                </div>
                            </div>
                        `
                name = " Quotation.pdf"
              }
              else {
                qout = `<h3 style="color: black">${res[0].name}</h3>`
                name = " Invoice.pdf"
              }
              if (
                String(k.id) === selectedClientId ||
                normalizeClientLookupValue(k.name) === normalizeClientLookupValue(selectedClientName) ||
                normalizeClientLookupValue(k.name) === normalizeClientLookupValue(savedClientName)
              ) {
                matchedClient = true;
                // #region debug-point C:print-client-match
                reportPrintDebug('C', 'pricing.js:client-match', '[DEBUG] Matched client for print', {
                  clientId: String(k.id || ''),
                  clientName: String(k.name || ''),
                  quotation: !!document.getElementById('is_quotation').checked
                });
                // #endregion
                file_manager.loadFile(path.join(__dirname, '../db/terms.json'))
                  .then(obj => {
                    // #region debug-point C:print-terms-loaded
                    reportPrintDebug('C', 'pricing.js:terms-loaded', '[DEBUG] Terms loaded for print', {
                      termSections: obj && typeof obj === 'object' ? Object.keys(obj).length : -1
                    });
                    // #endregion
                    if (!obj || typeof obj !== 'object') obj = {};
                    let terms = ``;
                    for (const key in obj) {
                      terms += `
                            <p style="color: black; font-size: 10px"><b>${key}</b></p>
                          `
                      obj[key].forEach(term => {
                        terms += `
                              <ul>
                                <li style="font-size: 8px; color: black">&#8226; ${term}</li>
                              </ul>
                            `
                      })
                    }
                    let body = ``
                    const keys = Object.keys(pricing)
                    let count = 1
                    keys.forEach(i => {
                      if (pricing[i].length > 0 && i !== "pinfo") {
                        body += `<tr><td style="font-size: 11px; text-align: center; padding: 0px; color: black; font-weight: bold;" colspan="12">${i}</td></tr>`;
                        pricing[i].forEach((j, ind) => {
                          body += `
                                <tr style="padding-top: 3px; padding-bottom: 3px; font-weight: 500">
                                  <td style="text-align: center;width: 40px; color: black; font-size: 9px; padding-left: 3px; padding-top: 2.5px; padding-bottom: 2.5px;" >${count}</td>
                                  <td style="text-align: center;padding-left: 3px; width: 170px; text-overflow: ellipsis; white-space: nowrap; font-size: 9px; overflow: hidden; color: black; ">${j.utility_text}</td>
                                  <td  style="text-align: center; padding-left: 3px;width: 150px; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; color: black; font-size: 9px;">${j.type_text}</td>
                                  <td  style="text-align: center; padding-left: 3px;width: 70px; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; font-size: 9px; color: black; ">${j.code_text}</td>
                                  <td  style="text-align: center; padding-left: 3px;text-overflow: ellipsis; white-space: nowrap; overflow: hidden; color: black; font-size: 9px; width: 35px; ">${j.qty}</td>
                                  <td  style="text-align: center;padding-left: 3px;width: 120px; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; font-size: 9px; color: black; ">${j.door_panel_text}</td>
                                  <td  style="text-align: center;width: 80px; padding-left: 3px; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; font-size: 9px; color: black;">${j.handler_text}</td>
                                  <td  style="text-align: center;width: 140px; padding-left: 3px; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; font-size: 9px; color: black;">${j.hardware_text}</td>
                                  <td  style="text-align: center;width: 110px; padding-left: 3px; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; font-size: 9px; color: black;">${j.shelves_text}</td>
                                  <td  style="text-align: center;width: 95px; padding-left: 3px; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; font-size: 9px; color: black;">${Intl.NumberFormat('en-US').format(j.unit)}</td>
                                  <td style="text-align: right; padding-right: 3px;width: 100px; padding-left: 3px; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; color: black; font-size: 9px;">${Intl.NumberFormat('en-US').format(j.total)}</td>
                                </tr>`;
                          count += 1
                        });
                      }
                    })
                    let table = `
                                    <table style="font-size: 12px; color: black;">
                                        <thead style="background-color: #C0C0C0; padding-top: 2px; padding-bottom: 2px">
                                            <tr style="padding-top: 2.5px; padding-bottom: 2.5px; ">
                                                <th style="font-weight: bold; font-size: 9px; text-align: center; border: 0.5px solid black; padding-top: 2.5px; padding-bottom: 2.5px;">No.</th>
                                                <th style="font-weight: bold; font-size: 9px; text-align: center; border: 0.5px solid black; padding-top: 2px; padding-bottom: 2px;">UTILITY</th>
                                                <th style="font-weight: bold; font-size: 9px; text-align: center; border: 0.5px solid black;">DESCRIPTION</th>
                                                <th style="font-weight: bold; font-size: 9px; text-align: center; border: 0.5px solid black;">CODE</th>
                                                <th style="font-weight: bold; font-size: 9px; text-align: center; border: 0.5px solid black;">QTY</th>
                                                <th style="font-weight: bold; font-size: 9px; text-align: center; border: 0.5px solid black;">FINISHING</th>
                                                <th style="font-weight: bold; font-size: 9px; text-align: center; border: 0.5px solid black;">HANDLES</th>
                                                <th style="font-weight: bold; font-size: 9px; text-align: center; border: 0.5px solid black;">HARDWARE</th>
                                                <th style="font-weight: bold; font-size: 9px; text-align: center; border: 0.5px solid black;">ADJ. SHELVES</th>
                                                <th style="font-weight: bold; font-size: 9px; text-align: center; border: 0.5px solid black;">UNIT PRICE</th>
                                                <th style="font-weight: bold; font-size: 9px; text-align: center; border: 0.5px solid black;">TOTAL</th>
                                            </tr>
                                        </thead>
                                        <tbody style="border: 0.5px solid black">${body}</tbody>
                                    </table>
                                    `

                    let html = `
                   <div style="display: flex; flex-direction: row; margin-bottom: 5px">
                        <img alt="img" src="${logoSrc}" style="height: 100px; width: 80px; margin-right: 10px" />
                        <div style="display: flex; flex-direction: column;">
                            ${qout}
                            <div style="display: flex; flex-direction: row; justify-content: space-between">
                                <p style="color: black; font-size: 12px;">${res[0].address}, Ph # ${res[0].contact}</p>
                                <p style="color: black; font-size: 13px; position: absolute; right: 0;">Date: ${document.getElementById('entry-date').valueAsDate.getDate()}-${document.getElementById('entry-date').valueAsDate.getMonth() + 1}-${document.getElementById('entry-date').valueAsDate.getFullYear()}</p>
                            </div>
                           
                            <div style="width: 100%; border-bottom: 2px solid grey; padding-bottom: 10px; margin-bottom: 10px"></div>
                            <div style="display: flex; flex-direction: row; justify-content: space-between; margin-top: 1px; font-weight: 500">
                                <p style="color: black; width: 200px; font-size: 11px; "><b>Client Name: &nbsp;</b>${k.name}</p>
                                <p style="color: black; width: 170px; font-size: 11px;"><b>Contact: &nbsp;</b> ${k.contact}</p>
                                <p style="color: black; width: 230px; font-size: 11px;"><b>Address: &nbsp;</b> ${k.address}</p>
                            </div>
                            <div style="display: flex; flex-direction: row; justify-content: space-between; margin-top: 1px; font-weight: 500">
                                <p style="color: black; width: 200px; font-size: 11px;"><b>Pricing No: &nbsp;</b>${document.getElementById('pricing-no').value}</p>
                                <p style="color: black; width: 170px; font-size: 11px;"><b>Reference No. &nbsp;</b>${document.getElementById('manual-input').value}</p>
                                <p style="color: black; font-size: 11px; width: 230px;"><b>Sales RP: &nbsp;</b>${document.getElementById('sales-input').value}</p>
                                
                            </div>
                            <div style="display: flex; flex-direction: row; justify-content: space-between; margin-top: 1px; font-weight: 500">
                                <p style="color: black; width: 200px; font-size: 11px;"><b>Product Type: &nbsp;</b>${document.getElementById('product-input').value}</p>
                                <p style="color: black; width: 170px; font-size: 11px;"><b>Carcass: &nbsp;</b> ${document.getElementById('carcass-input').value}</p>
                                <p style="color: black; width: 230px; font-size: 11px;"><b>Category: &nbsp;</b>${document.getElementById('category-input').value}</p>
                            </div>
                        </div>
                    </div>
                    ${table}
                    ${days_notice}
                    <div style="display: flex; flex-direction: row; justify-content: space-between; align-items: flex-start; gap: 20px;">
                        <div style="display: flex; flex: 1 1 auto; flex-direction: row; justify-content: space-between; align-items: flex-end; padding-top: 60px; min-width: 0; max-width: 420px; gap: 18px;">
                            <div style="display: flex; align-items: flex-end; width: 190px; color: black; font-size: 10px; font-weight: bold;">
                                <span style="white-space: nowrap;">Authorized By:</span>
                                <span style="display: inline-block; flex: 1 1 auto; min-width: 70px; border-bottom: 1px solid black; margin-left: 8px; transform: translateY(-2px);"></span>
                            </div>
                            <div style="display: flex; align-items: flex-end; width: 210px; color: black; font-size: 10px; font-weight: bold;">
                                <span style="white-space: nowrap;">Customer Signature:</span>
                                <span style="display: inline-block; flex: 1 1 auto; min-width: 80px; border-bottom: 1px solid black; margin-left: 8px; transform: translateY(-2px);"></span>
                            </div>
                        </div>
                          <div style="display: flex; flex: 0 0 180px; flex-direction: row; justify-content: flex-end; width: 180px; margin-top: 15px">
                              ${total}
                          </div>
                    </div>
                    <p style="color: black; font-size: 10px; border-bottom: 1px solid black; width: 105px; margin-top: 10px"><b>Terms & Conditions:</b></p>
                    <p style="color: black; font-size: 10px; width: 230px; margin-top: 10px; margin-bottom: 5px;"><b>Delivery Time: &nbsp;</b><span style="font-size: 10px; font-weight: 500">${document.getElementById('delivery-days').value} Working Days.<span/></p>
                    ${terms}     
                    <p style="color: red; font-size: 8px"><b>Please Note:</b></p>
                    <p style="color: red; font-size: 8px">Any electrical / plumbing and gas connections for Hob, Hood, Oven & Sink is excluded from our scope of work. To avoid any possible damage to plumbing pipes / electrical wiring, we request you to mark such areas with dotted lines failing which; we accept no responsibility for any such incident, occurred while drilling holes for fixing the cabinets.</p>         
                    <div style="display: flex; flex-direction: row; justify-content: space-between; align-items: flex-end; margin-top: 60px; gap: 24px">
                            <div style="display: flex; align-items: flex-end; width: 230px; color: black; font-size: 10px; font-weight: bold;">
                                <span style="white-space: nowrap;">Authorized By:</span>
                                <span style="display: inline-block; flex: 1 1 auto; min-width: 100px; border-bottom: 1px solid black; margin-left: 8px; transform: translateY(-2px);"></span>
                            </div>
                            <div style="display: flex; align-items: flex-end; width: 260px; color: black; font-size: 10px; font-weight: bold;">
                                <span style="white-space: nowrap;">Customer Signature:</span>
                                <span style="display: inline-block; flex: 1 1 auto; min-width: 120px; border-bottom: 1px solid black; margin-left: 8px; transform: translateY(-2px);"></span>
                            </div>
                    </div>
                    `
                    // #region debug-point E:print-before-html2pdf
                    const generatedFilename = `${k.name}'s${name}`;
                    const safeFilename = sanitizePdfFilename(generatedFilename, document.getElementById('is_quotation').checked ? 'Quotation.pdf' : 'Invoice.pdf');
                    opt.filename = safeFilename;
                    reportPrintDebug('E', 'pricing.js:before-html2pdf', '[DEBUG] Invoking html2pdf save', {
                      clientName: String(k.name || ''),
                      generatedName: generatedFilename,
                      safeGeneratedName: safeFilename,
                      containsWindowsInvalidChars: /[<>:"/\\|?*]/.test(generatedFilename),
                      htmlLength: html.length,
                      hasHtml2Pdf: typeof html2pdf !== 'undefined',
                      entryDateRaw: String(document.getElementById('entry-date').value || ''),
                      hasValueAsDate: !!document.getElementById('entry-date').valueAsDate,
                      pricingNo: String(document.getElementById('pricing-no').value || ''),
                      referenceNo: String(document.getElementById('manual-input').value || '')
                    });
                    // #endregion
                    // #region debug-point E:print-save-promise
                    Promise.resolve(html2pdf().set(opt).from(html).to('pdf').save(safeFilename))
                      .then(() => {
                        reportPrintDebug('E', 'pricing.js:html2pdf-save-resolved', '[DEBUG] html2pdf save resolved', {
                          generatedName: generatedFilename,
                          safeGeneratedName: safeFilename
                        });
                      })
                      .catch((err) => {
                        reportPrintDebug('D', 'pricing.js:html2pdf-save-rejected', '[DEBUG] html2pdf save rejected', {
                          generatedName: generatedFilename,
                          safeGeneratedName: safeFilename,
                          message: err && err.message ? String(err.message) : String(err)
                        });
                        window.appUi.notify("PDF generation failed. Check client name / filename and try again.");
                      });
                    // #endregion

                  })
              }
            })
            if (!matchedClient) {
              // #region debug-point C:print-client-not-found
              reportPrintDebug('C', 'pricing.js:client-not-found', '[DEBUG] No matched client found for print', {
                selectedClientId: String(document.getElementById('client-input').value || ''),
                selectedClientName: selectedClientName,
                savedClientName: savedClientName,
                clientsCount: Array.isArray(ress) ? ress.length : -1
              });
              // #endregion
              window.appUi.notify("Client record not found for this pricing. Re-select client and try print again.");
            }
          })
      })
  window.setTimeout(function () {
    if (window.modalInputFix && typeof window.modalInputFix.forceReleaseUiLocks === 'function') {
      window.modalInputFix.forceReleaseUiLocks();
    }
  }, 0);
  window.setTimeout(function () {
    if (window.modalInputFix && typeof window.modalInputFix.forceReleaseUiLocks === 'function') {
      window.modalInputFix.forceReleaseUiLocks();
    }
  }, 300);

})

document.getElementById('filter-pricing').addEventListener('change', (event) => {
  refreshOpenPricingList();
})

function delete_pricing() {
  file_manager.loadFile(path.join(__dirname, '../db/.pricings.json'))
    .then(res => {
      let my_data = []
      check_list2.forEach(i => {
        res.forEach((j, ind) => {
          if (j["pinfo"].id === i["pinfo"].id) {
            res.splice(ind, 1)
            return
          }
        })
      })
      file_manager.writeFile(path.join(__dirname, '../db/.pricings.json'), res)
        .then(res => {
          document.getElementById('cancel-1').click();
          document.getElementById('delete-1').disabled = true
          if (document.getElementById('checkbox-all-open').checked)
            document.getElementById('checkbox-all-open').click()
          document.getElementById('filter-pricing').value = ""
          document.getElementById('del-pass').value = ""
          refreshOpenPricingList();
          alert("Pricing Deleted!");
          all_clear();
        })
    })
  all_clear();
}

document.getElementById('checkbox-all-open').addEventListener('change', (event) => {
  if (event.target.checked) {
    file_manager.loadFile(path.join(__dirname, `../db/.pricings.json`))
      .then(res => {
        res.forEach(i => {
          if (document.getElementById(i["pinfo"].id) && !document.getElementById(i["pinfo"].id).checked)
            document.getElementById(i["pinfo"].id).click()
        })
      })
  }
  else {
    file_manager.loadFile(path.join(__dirname, `../db/.pricings.json`))
      .then(res => {
        res.forEach(i => {
          if (document.getElementById(i["pinfo"].id) && document.getElementById(i["pinfo"].id).checked)
            document.getElementById(i["pinfo"].id).click()
        })
      })
  }
})

// #region debug-point A:print-debug-helper
const printDebugConfig = (() => {
  const defaults = {
    url: "http://127.0.0.1:7777/event",
    sessionId: "pricing-print-save",
    runId: "pre-fix"
  };
  const candidates = [
    path.join(__dirname, "../../.dbg/pricing-print-save.env"),
    path.join(__dirname, "../../.dbg/print-build-failure.env")
  ];
  for (let i = 0; i < candidates.length; i++) {
    try {
      if (!fs.existsSync(candidates[i])) continue;
      const raw = fs.readFileSync(candidates[i], "utf8");
      raw.split(/\r?\n/).forEach((line) => {
        const idx = line.indexOf("=");
        if (idx === -1) return;
        const key = line.slice(0, idx).trim();
        const value = line.slice(idx + 1).trim();
        if (key === "DEBUG_SERVER_URL" && value) defaults.url = value;
        if (key === "DEBUG_SESSION_ID" && value) defaults.sessionId = value;
      });
      break;
    } catch (_) {}
  }
  return defaults;
})();

function reportPrintDebug(hypothesisId, location, msg, data) {
  fetch(printDebugConfig.url, {
    method: "POST",
    body: JSON.stringify({
      sessionId: printDebugConfig.sessionId,
      runId: printDebugConfig.runId,
      hypothesisId: hypothesisId,
      location: location,
      msg: msg,
      data: data || {},
      ts: Date.now()
    })
  }).catch(() => {});
}
// #endregion

// #region debug-point D:print-unhandled-errors
window.addEventListener('error', function (event) {
  reportPrintDebug('D', 'pricing.js:window-error', '[DEBUG] Window error during print runtime', {
    message: event && event.message ? String(event.message) : '',
    filename: event && event.filename ? String(event.filename) : '',
    lineno: event && event.lineno != null ? Number(event.lineno) : null,
    colno: event && event.colno != null ? Number(event.colno) : null
  });
});
window.addEventListener('unhandledrejection', function (event) {
  const reason = event && event.reason;
  reportPrintDebug('D', 'pricing.js:unhandledrejection', '[DEBUG] Unhandled rejection during print runtime', {
    reason: reason && reason.message ? String(reason.message) : String(reason)
  });
});
// #endregion

document.getElementById('delete-form').addEventListener('submit', (event) => {
  event.preventDefault();
  file_manager
    .loadFile(path.join(__dirname, "../db/.credentials.json"))
    .then((res) => {
      if (res[1].pass === document.getElementById("del-pass").value) {
        delete_pricing()
      }
      else {
        alert("Wrong Password!")
      }
    })
})

document.getElementById('checkbox-all').addEventListener('change', (event) => {
  if (document.getElementById('checkbox-all').checked) {
    items.forEach(i => {
      if (!(document.getElementById(`${i.elevation}~${i.item_id.toString()}`).checked))
        document.getElementById(`${i.elevation}~${i.item_id.toString()}`).click()
    })
  }
  else {
    items.forEach(i => {
      if (document.getElementById(`${i.elevation}~${i.item_id.toString()}`).checked)
        document.getElementById(`${i.elevation}~${i.item_id.toString()}`).click()
    })
  }
})

$(document).ready(() => {
  var date = new Date();

  var day = date.getDate();
  var month = date.getMonth() + 1;
  var year = date.getFullYear();

  if (month < 10) month = "0" + month;
  if (day < 10) day = "0" + day;

  var today = year + "-" + month + "-" + day;
  document.getElementById("entry-date").value = today;
  load_pricing_dropdown();
  updateCurrentItemUnitAndTotal();
  document.getElementById('gross-amount').value = 0;
  document.getElementById('discount').value = 0;
  setDiscountVisibilityToggle(true);
  document.getElementById('net').value = 0;
  document.getElementById('tax').value = 0;
  document.getElementById('delivery-charges').value = 0;
  refreshNewCostBreakdown();
  document.getElementById('is_quotation').checked = true;
  ensurePricingTotalsEnabled();
  document.getElementById('calculated-tax').value = 0;
  document.getElementById('code-new-rate').value = 0;
  document.getElementById('finishing-new-rate').value = 0;
  document.getElementById('harware-new-rate').value = 0;
  document.getElementById('handle-new-rate').value = 0;
  document.getElementById('shelve-new-rate').value = 0;
  file_manager.loadFile(path.join(__dirname, `../db/.pricings.json`))
    .then(res => {
      if (res.length === 0) {
        document.getElementById('pricing-no').value = "1"
      }
      else {
        document.getElementById('pricing-no').value = parseFloat(res[res.length - 1]["pinfo"].pricing_no) + 1;
      }
    })
});
