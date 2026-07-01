const path = require("path");
const file_manager = require(path.join(__dirname, "../../scripts/file_manager.js"));


function save_func(event) {
  event.preventDefault();
}

function readProfitMarginPercentageFromInput() {
  const marginEl = document.getElementById('profit-margin-percentage');
  const marginRaw = marginEl ? String(marginEl.value) : "";
  const marginPct = marginRaw !== "" ? parseFloat(marginRaw) : 0;
  return isNaN(marginPct) ? 0 : marginPct;
}

function persistProfitMarginPercentage(pct) {
  return file_manager.setSystemConfig({ profit_margin_percentage: pct });
}

function rateValue(obj, key) {
  if (!obj || obj[key] == null || obj[key] === "") return 0;
  return obj[key];
}

$(document).ready(() => {
  file_manager
      .loadFile(path.join(__dirname, "../../db/.rates.json"))
      .then((res) => {
        document.getElementById('rate-codes').value = res.rate_codes;
        document.getElementById('back-area-codes').value = res.back_area_codes;
        document.getElementById('secondary-top-codes').value = res.secondary_top_codes;
        document.getElementById('edging-codes').value = res.edging_codes;
        document.getElementById('screws-codes').value = res.screws_codes;
        document.getElementById('wall-bracket-codes').value = rateValue(res, 'wall_bracket_codes');
        document.getElementById('rate-doors').value = res.rate_doors;
        document.getElementById('edging-doors').value = res.edging_doors;
        document.getElementById('rate-hardware').value = res.rate_hardware;
        document.getElementById('slider-hardware').value = res.slider_hardware;
        document.getElementById('lift-hardware').value = res.lift_hardware;
        document.getElementById('hanger-pipe-hardware').value = rateValue(res, 'hanger_pipe_hardware');
        document.getElementById('hanger-pipe-fitting-hardware').value = rateValue(res, 'hanger_pipe_fitting_hardware');
        document.getElementById('locks-hardware').value = rateValue(res, 'locks_hardware');
        document.getElementById('rate-handles').value = res.rate_handles;
        document.getElementById('drawer-handle-rate').value = rateValue(res, 'drawer_handle_rate');
        document.getElementById('rate-shelve').value = res.rate_shelve;
        document.getElementById('pin-shelve').value = res.pin_shelve;
        document.getElementById('edging-shelve').value = res.edging_shelve;
      });

  file_manager.getSystemConfig().then((cfg) => {
    const pct = cfg && cfg.profit_margin_percentage != null ? Number(cfg.profit_margin_percentage) : 0;
    const el = document.getElementById('profit-margin-percentage');
    if (el) el.value = isNaN(pct) ? 0 : pct;
  });

  const marginEl = document.getElementById('profit-margin-percentage');
  if (marginEl) {
    let persistTimer = null;
    const schedulePersist = () => {
      if (persistTimer) clearTimeout(persistTimer);
      persistTimer = setTimeout(() => {
        const pct = readProfitMarginPercentageFromInput();
        persistProfitMarginPercentage(pct);
      }, 300);
    };
    marginEl.addEventListener('input', schedulePersist);
    marginEl.addEventListener('change', schedulePersist);
  }
});

document.getElementById('cancel').addEventListener('click', (event) => {
  document.getElementById('pass').value = '';
})

document.getElementById("confirm").addEventListener("click", (event) => {
  event.preventDefault();
  file_manager
      .loadFile(path.join(__dirname, "../../db/.credentials.json"))
      .then((res) => {
        if (res[1].pass === document.getElementById("pass").value) {
          const prices = {
            "rate_codes": "10",
            "back_area_codes": "10",
            "edging_codes": "10",
            "screws_codes": "10",
            "wall_bracket_codes": "10",
            "secondary_top_codes": "10",
            "rate_doors": "10",
            "edging_doors": "10",
            "rate_hardware": "10",
            "slider_hardware": "10",
            "lift_hardware": "10",
            "hanger_pipe_hardware": "10",
            "hanger_pipe_fitting_hardware": "10",
            "locks_hardware": "10",
            "rate_handles": "10",
            "drawer_handle_rate": "10",
            "rate_shelve": "10",
            "edging_shelve": "10",
            "pin_shelve": "10"
          };
          prices.rate_codes = document.getElementById('rate-codes').value;
          prices.back_area_codes = document.getElementById('back-area-codes').value;
          prices.secondary_top_codes = document.getElementById('secondary-top-codes').value;
          prices.edging_codes = document.getElementById('edging-codes').value;
          prices.screws_codes = document.getElementById('screws-codes').value;
          prices.wall_bracket_codes = document.getElementById('wall-bracket-codes').value;
          prices.rate_doors = document.getElementById('rate-doors').value;
          prices.edging_doors = document.getElementById('edging-doors').value;
          prices.rate_hardware = document.getElementById('rate-hardware').value;
          prices.slider_hardware =  document.getElementById('slider-hardware').value;
          prices.lift_hardware = document.getElementById('lift-hardware').value;
          prices.hanger_pipe_hardware = document.getElementById('hanger-pipe-hardware').value;
          prices.hanger_pipe_fitting_hardware = document.getElementById('hanger-pipe-fitting-hardware').value;
          prices.locks_hardware = document.getElementById('locks-hardware').value;
          prices.rate_handles = document.getElementById('rate-handles').value;
          prices.drawer_handle_rate = document.getElementById('drawer-handle-rate').value;
          prices.rate_shelve = document.getElementById('rate-shelve').value;
          prices.pin_shelve = document.getElementById('pin-shelve').value;
          prices.edging_shelve = document.getElementById('edging-shelve').value;

          const marginPct = readProfitMarginPercentageFromInput();

          file_manager
              .writeFile(path.join(__dirname, `../../db/.rates.json`), prices)
              .then((res) => {
                return persistProfitMarginPercentage(marginPct).then(() => res);
              })
              .then((res) => {
                alert("Prices Updates Sucessfully!");
                document.getElementById("cancel").click();
                document.getElementById("pass").value = "";
              });
        } else {
          alert("Password Not Matched!");
          document.getElementById("cancel").click();
          document.getElementById("pass").value = "";
        }
      });
});

document.getElementById("confirm3").addEventListener("click", (event) => {
  event.preventDefault();
  file_manager
      .loadFile(path.join(__dirname, "../../db/.credentials.json"))
      .then((ress) => {
        if (ress[1].pass === document.getElementById("passs").value) {
          const res = {
            "rate_codes": "0",
            "back_area_codes": "0",
            "edging_codes": "0",
            "screws_codes": "0",
            "wall_bracket_codes": "0",
            "secondary_top_codes": "0",
            "rate_doors": "0",
            "edging_doors": "0",
            "rate_hardware": "0",
            "slider_hardware": "0",
            "lift_hardware": "0",
            "hanger_pipe_hardware": "0",
            "hanger_pipe_fitting_hardware": "0",
            "locks_hardware": "0",
            "rate_handles": "0",
            "drawer_handle_rate": "0",
            "rate_shelve": "0",
            "edging_shelve": "0",
            "pin_shelve": "0"
          };
          document.getElementById('rate-codes').value = res.rate_codes;
          document.getElementById('back-area-codes').value = res.back_area_codes;
          document.getElementById('secondary-top-codes').value = res.secondary_top_codes;
          document.getElementById('edging-codes').value = res.edging_codes;
          document.getElementById('screws-codes').value = res.screws_codes;
          document.getElementById('wall-bracket-codes').value = res.wall_bracket_codes;
          document.getElementById('rate-doors').value = res.rate_doors;
          document.getElementById('edging-doors').value = res.edging_doors;
          document.getElementById('rate-hardware').value = res.rate_hardware;
          document.getElementById('slider-hardware').value = res.slider_hardware;
          document.getElementById('lift-hardware').value = res.lift_hardware;
          document.getElementById('hanger-pipe-hardware').value = res.hanger_pipe_hardware;
          document.getElementById('hanger-pipe-fitting-hardware').value = res.hanger_pipe_fitting_hardware;
          document.getElementById('locks-hardware').value = res.locks_hardware;
          document.getElementById('rate-handles').value = res.rate_handles;
          document.getElementById('drawer-handle-rate').value = res.drawer_handle_rate;
          document.getElementById('rate-shelve').value = res.rate_shelve;
          document.getElementById('pin-shelve').value = res.pin_shelve;
          document.getElementById('edging-shelve').value = res.edging_shelve;
            file_manager
                .writeFile(path.join(__dirname, `../../db/.rates.json`), res)
                .then((result) => {
                  const el = document.getElementById('profit-margin-percentage');
                  if (el) el.value = 0;
                  return file_manager.setSystemConfig({ profit_margin_percentage: 0 }).then(() => result);
                })
                .then((res) => {
                  alert("Prices Reset To \"0\" Sucessfully!");
                  document.getElementById("cancell").click();
                  document.getElementById("passs").value = "";
                });
        } else {
          alert("Password Not Matched!");
          document.getElementById("cancell").click();
          document.getElementById("passs").value = "";
        }
      });
});
