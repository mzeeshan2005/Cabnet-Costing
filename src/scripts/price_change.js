const remote = require('electron').remote
const path = require('path')
const file_manager = remote.require(path.join(__dirname, '../../scripts/file_manager.js'))


function save_func(event) {
  event.preventDefault();
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
        document.getElementById('rate-doors').value = res.rate_doors;
        document.getElementById('edging-doors').value = res.edging_doors;
        document.getElementById('rate-hardware').value = res.rate_hardware;
        document.getElementById('slider-hardware').value = res.slider_hardware;
        document.getElementById('lift-hardware').value = res.lift_hardware;
        document.getElementById('rate-handles').value = res.rate_handles;
        document.getElementById('rate-shelve').value = res.rate_shelve;
        document.getElementById('pin-shelve').value = res.pin_shelve;
        document.getElementById('edging-shelve').value = res.edging_shelve;
      });
});

document.getElementById('cancel').addEventListener('click', (event) => {
  event.preventDefault();
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
            "secondary_top_codes": "10",
            "rate_doors": "10",
            "edging_doors": "10",
            "rate_hardware": "10",
            "slider_hardware": "10",
            "lift_hardware": "10",
            "rate_handles": "10",
            "rate_shelve": "10",
            "edging_shelve": "10",
            "pin_shelve": "10"
          };
          prices.rate_codes = document.getElementById('rate-codes').value;
          prices.back_area_codes = document.getElementById('back-area-codes').value;
          prices.secondary_top_codes = document.getElementById('secondary-top-codes').value;
          prices.edging_codes = document.getElementById('edging-codes').value;
          prices.screws_codes = document.getElementById('screws-codes').value;
          prices.rate_doors = document.getElementById('rate-doors').value;
          prices.edging_doors = document.getElementById('edging-doors').value;
          prices.rate_hardware = document.getElementById('rate-hardware').value;
          prices.slider_hardware =  document.getElementById('slider-hardware').value;
          prices.lift_hardware = document.getElementById('lift-hardware').value;
          prices.rate_handles = document.getElementById('rate-handles').value;
          prices.rate_shelve = document.getElementById('rate-shelve').value;
          prices.pin_shelve = document.getElementById('pin-shelve').value;
          prices.edging_shelve = document.getElementById('edging-shelve').value;
            file_manager
                .writeFile(path.join(__dirname, `../../db/.rates.json`), prices)
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
            "secondary_top_codes": "0",
            "rate_doors": "0",
            "edging_doors": "0",
            "rate_hardware": "0",
            "slider_hardware": "0",
            "lift_hardware": "0",
            "rate_handles": "0",
            "rate_shelve": "0",
            "edging_shelve": "0",
            "pin_shelve": "0"
          };
          document.getElementById('rate-codes').value = res.rate_codes;
          document.getElementById('back-area-codes').value = res.back_area_codes;
          document.getElementById('secondary-top-codes').value = res.secondary_top_codes;
          document.getElementById('edging-codes').value = res.edging_codes;
          document.getElementById('screws-codes').value = res.screws_codes;
          document.getElementById('rate-doors').value = res.rate_doors;
          document.getElementById('edging-doors').value = res.edging_doors;
          document.getElementById('rate-hardware').value = res.rate_hardware;
          document.getElementById('slider-hardware').value = res.slider_hardware;
          document.getElementById('lift-hardware').value = res.lift_hardware;
          document.getElementById('rate-handles').value = res.rate_handles;
          document.getElementById('rate-shelve').value = res.rate_shelve;
          document.getElementById('pin-shelve').value = res.pin_shelve;
          document.getElementById('edging-shelve').value = res.edging_shelve;
            file_manager
                .writeFile(path.join(__dirname, `../../db/.rates.json`), res)
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