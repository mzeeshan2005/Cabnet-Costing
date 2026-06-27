const remote = require('electron').remote
const path = require('path')
const {parse} = require("@fortawesome/fontawesome");
const main = remote.require(path.join(__dirname, '../../../index.js'))
const file_manager = remote.require(path.join(__dirname, '../../scripts/file_manager.js'))

let file = 'codes'
let utility = ''
let type = ''
let code = ''
let ct = ''
let title = ''


function save_func(event) {
  event.preventDefault();
}

function toggle(event) {
  if (event.target.checked) {
    file_manager
        .loadFile(path.join(__dirname, `../../db/.${file}.json`))
        .then((res) => {
          res.forEach((data) => {
            if(file !== 'codes')
            {
              if((data.utility_id === utility || utility === '') && (data.type_id === type || type === '') && (data.code_id === code || code === ''))
              {
                if (data.id === event.target.id.toString()) {
                  document.getElementById("save").disabled = false;
                }
              }

            }
            else
            {
              if((data.utility_id === utility || utility === '') && (data.type_id === type || type === ''))
              {
                if (data.id === event.target.id.toString()) {
                  document.getElementById("save").disabled = false;
                }
              }
            }
          });
        });
  } else {
    file_manager
        .loadFile(path.join(__dirname, `../../db/.${file}.json`))
        .then((res) => {
          if(file === 'codes')
          {
            let count = 0;
            res.forEach((data) => {
              if((data.utility_id === utility || utility === '') && (data.type_id === type || type === '') && (data.title === ct || ct === ''))
              {
                if (
                    document.getElementById(data.id) != null &&
                    document.getElementById(data.id).checked
                ) {
                  count += 1;
                }
              }
            });
            if (count === 0) {
              document.getElementById("save").disabled = true;
              if(document.getElementById('checkbox-all').checked)
                document.getElementById('checkbox-all').click();
            } else {
              document.getElementById("save").disabled = false;
            }
          }
          else
          {
            let count = 0;
            res.forEach((data) => {
              if((data.utility_id === utility || utility === '') && (data.type_id === type || type === '') && (data.code_id === code || code === ''))
              {
                if (
                    document.getElementById(data.id) != null &&
                    document.getElementById(data.id).checked
                ) {
                  count += 1;
                }
              }
            });
            if (count === 0) {
              document.getElementById("save").disabled = true;
              if(document.getElementById('checkbox-all').checked)
                document.getElementById('checkbox-all').click();
            } else {
              document.getElementById("save").disabled = false;
            }
          }
        });
  }
}

document.getElementById('form').addEventListener('submit', (event) => {
  event.preventDefault();
  document.getElementById('modal-opener').click();
})

document.getElementById("selectUtil").addEventListener("click", (event) => {
  document.getElementById("select").value = "";
  document.getElementById("select-1").innerHTML = "";
  document.getElementById("select-2").innerHTML = "";
  document.getElementById("select-3").innerHTML = "";
  document.getElementById('select-4').innerHTML = "";
  document.getElementById('client-table').innerHTML = ""
  file = ''
  utility = ''
  type = ''
  code = ''
  ct = ''
  title = ''
  document.getElementById('client-table').innerHTML = '';
  document.getElementById('title-label').style.visibility = "hidden"
  document.getElementById('title-dropdown').style.visibility = "hidden"
  document.getElementById('save').disabled = true;
  if(document.getElementById('checkbox-all').checked)
    document.getElementById('checkbox-all').checked = false
});

document.getElementById("selectUtil1").addEventListener("click", (event) => {
  document.getElementById("select-1").value = "";
  utility = ''
  type = ''
  code = ''
  ct = ''
  title = ''
  document.getElementById("select-2").innerHTML = "";
  document.getElementById("select-3").innerHTML = "";
  document.getElementById("select-4").innerHTML = "";
  if(document.getElementById('checkbox-all').checked)
    document.getElementById('checkbox-all').checked = false
  filter_by_dropdown(file, '', type, code);
});

document.getElementById("selectUtil2").addEventListener("click", (event) => {
  document.getElementById("select-2").value = "";
  type = ''
  code = ''
  ct = ''
  title = ''
  document.getElementById("select-3").innerHTML = "";
  document.getElementById("select-4").innerHTML = "";
  if(document.getElementById('checkbox-all').checked)
    document.getElementById('checkbox-all').checked = false
  filter_by_dropdown(file, utility, '', code);
});

document.getElementById("selectUtil3").addEventListener("click", (event) => {
  document.getElementById("select-3").value = "";
  code = '';
  ct = ''
  title = ''
  document.getElementById("select-4").innerHTML = "";
  if(document.getElementById('checkbox-all').checked)
    document.getElementById('checkbox-all').checked = false
  filter_by_dropdown(file, utility, type, '');
});

document.getElementById("selectUtil4").addEventListener("click", (event) => {
  document.getElementById("select-4").value = "";
  title = ''
  if(document.getElementById('checkbox-all').checked)
    document.getElementById('checkbox-all').checked = false
  filter_by_dropdown(file, utility, type, code);
});

function populateTable() {
  document.getElementById("client-table").innerHTML = "";
  document.getElementById("save").disabled = true;
  file_manager
      .loadFile(path.join(__dirname, "../../db/.utilities.json"))
      .then((res) => {
        const select = document.getElementById("select-1");
        select.innerHTML = "";
        let option = document.createElement("option");
        option.text = "Please Select";
        option.value = "";
        option.classList.add('d-none')
        select.options.add(option);
        res.forEach((data) => {
          let option = document.createElement("option");
          option.text = data.title;
          option.value = data.id;
          select.add(option);
        });
      });
  file_manager
      .loadFile(path.join(__dirname, "../../db/.types.json"))
      .then((res) => {
        const select = document.getElementById("select-2");
        select.innerHTML = "";
        let option = document.createElement("option");
        option.text = "Please Select";
        option.value = "";
        select.options.add(option);
        res.forEach((data) => {
          let option = document.createElement("option");
          option.text = data.title;
          option.value = data.id;
          select.add(option);
        });
      });
  file_manager
      .loadFile(path.join(__dirname, "../../db/.codes.json"))
      .then((res) => {
        const select = document.getElementById("select-3");
        select.innerHTML = "";
        let option = document.createElement("option");
        option.text = "Please Select";
        option.value = "";
        select.options.add(option);
        res.forEach((data) => {
          let option = document.createElement("option");
          option.text = data.title;
          option.value = data.id;
          select.add(option);
        });
      });
}

$(document).ready(() => {
  document.getElementById('save').disabled = true;
  document.getElementById('title-label').style.visibility = "hidden"
  document.getElementById('title-dropdown').style.visibility = "hidden"
  // populateTable();
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
            file_manager
                .loadFile(path.join(__dirname, `../../db/.${file}.json`))
                .then((res) => {
                  const clients = [];
                  res.forEach((data) => {
                    if((data.utility_id === utility || utility === '') && (data.type_id === type || type === '') && (data.code_id === code || code === '' || file === "codes") && (data.title === title || title === '') && (document.getElementById(data.id) !== null && document.getElementById(data.id).checked))
                    {
                      let val = document.getElementById('percentage').value;
                      val = parseInt(val)
                      res = parseInt(((parseInt(data.rate) * val) / 100).toString());
                      if(document.querySelector('input[name="inlineRadioOptions"]:checked').value === 'inc')
                      {
                        data.rate = parseInt(data.rate) + res ;
                      }
                      else
                      {
                        data.rate = parseInt(data.rate) - res ;
                      }
                    }
                    clients.push(data);
                  });

                  file_manager
                      .writeFile(
                          path.join(__dirname, `../../db/.${file}.json`),
                          clients
                      )
                      .then((res) => {
                        if (res === "success") {
                          alert("Saved Successfully!");
                          document.getElementById("cancel").click();
                          document.getElementById("pass").value = "";
                          document.getElementById("save").disabled = true;
                          file = '';
                          type = '';
                          code = '';
                          utility = '';
                          title = ''
                          ct = ''
                          document.getElementById('title-label').style.visibility = "hidden"
                          document.getElementById('title-dropdown').style.visibility = "hidden"
                          if(document.getElementById('checkbox-all').checked)
                          {
                            document.getElementById('checkbox-all').click();
                          }
                          document.getElementById('client-table').innerHTML = '';
                          document.getElementById('select').value = '';
                          document.getElementById('select-1').innerHTML = ''
                          document.getElementById('select-2').innerHTML = ''
                          document.getElementById('select-3').innerHTML = ''
                          document.getElementById('select-4').innerHTML = ''
                          document.getElementById('percentage').value = '';
                          // populateTable();
                        } else {
                          alert("Could Not Saved!");
                          document.getElementById("cancel").click();
                          document.getElementById("pass").value = "";
                        }
                      });
                });

        } else {
          alert("Password Not Matched!");
          document.getElementById("cancel").click();
          document.getElementById("pass").value = "";
        }
      });
});

document.getElementById("select").addEventListener("change", function (event) {
  event.preventDefault();
  file = event.target.value;
  utility = ''
  type = ''
  code = ''
  ct = ''
  title = ''
  document.getElementById('select-1').value = ''
  document.getElementById('select-2').innerHTML = ''
  document.getElementById('select-3').innerHTML = ''
  document.getElementById('select-4').innerHTML = "";
  file_manager
      .loadFile(path.join(__dirname, "../../db/.utilities.json"))
      .then((res) => {
        const select = document.getElementById("select-1");
        select.innerHTML = "";
        let option = document.createElement("option");
        option.text = "Please Select";
        option.value = "";
        option.classList.add('d-none')
        select.options.add(option);
        res.forEach((data) => {
          let option = document.createElement("option");
          option.text = data.title;
          option.value = data.id;
          select.add(option);
        });
      });
  filter_by_dropdown(event.target.value, utility, type, code);
  if(file !== 'codes')
  {
    document.getElementById('title-label').style.visibility = "visible"
    document.getElementById('title-dropdown').style.visibility = "visible"
  }
  else{
    document.getElementById('title-label').style.visibility = "hidden"
    document.getElementById('title-dropdown').style.visibility = "hidden"
  }
});

document.getElementById("select-1").addEventListener("change", function (event) {
  event.preventDefault();
  utility = event.target.value;
  type = ''
  code = ''
  ct = ''
  title = ''
  document.getElementById('select-2').value = ''
  document.getElementById('select-3').innerHTML = ''
  document.getElementById('select-4').innerHTML = ''
  filter_by_dropdown(file, event.target.value, type, code);
  file_manager
      .loadFile(path.join(__dirname, "../../db/.types.json"))
      .then((res) => {
        const select = document.getElementById("select-2");
        select.innerHTML = "";
        let option = document.createElement("option");
        option.text = "Please Select";
        option.value = "";
        option.classList.add('d-none')
        select.options.add(option);
        res.forEach((data) => {
          if(data.utility_id === utility)
          {
            let option = document.createElement("option");
            option.text = data.title;
            option.value = data.id;
            select.add(option);
          }
        });
      });
});

document.getElementById("select-2").addEventListener("change", function (event) {
  event.preventDefault();
  type = event.target.value;
  code = ''
  ct = ''
  title = ''
  document.getElementById('select-3').value = ''
  document.getElementById('select-4').innerHTML = ''
  filter_by_dropdown(file, utility, event.target.value, code);
    file_manager
        .loadFile(path.join(__dirname, "../../db/.codes.json"))
        .then((res) => {
          const select = document.getElementById("select-3");
          select.innerHTML = "";
          let option = document.createElement("option");
          option.text = "Please Select";
          option.value = "";
          option.classList.add('d-none')
          select.options.add(option);
          res.forEach((data) => {
            if(data.type_id === type)
            {
              let option = document.createElement("option");
              option.text = data.title;
              option.value = data.id;
              select.add(option);
            }
          });
        });
});

document.getElementById('select-3').addEventListener('change', (event) => {
  event.preventDefault();
  code = event.target.value;
  title = ''
  document.getElementById('select-4').innerHTML = ''
  let skillsSelect = document.getElementById("select-3");
  ct = skillsSelect.options[skillsSelect.selectedIndex].text;
  filter_by_dropdown(file, utility, type, code);
  if(file !== 'codes')
  {
    file_manager
        .loadFile(path.join(__dirname, `../../db/.${file}.json`))
        .then((res) => {
          let items = new Set()
          res.forEach((data) => {
            if(data.code_id === code)
            {
              items.add(data.title)
            }
          });
          let opt = document.createElement('option')
          opt.value = ''
          opt.text = 'Please Select'
          opt.classList.add('d-none')
          document.getElementById('select-4').options.add(opt)
          items.forEach((i, ind) => {
            let opt1 = document.createElement('option')
            opt1.value = ind
            opt1.text = i
            document.getElementById('select-4').options.add(opt1)
          })
        });
  }
})

document.getElementById('select-4').addEventListener('change', (event) => {
  event.preventDefault();
  title = event.target.options[event.target.selectedIndex].text
  filter_by_dropdown(file, utility, type, code)
})

document.getElementById("checkbox-all").addEventListener("change", (event) => {
  if(file === 'codes')
  {
    if (event.target.checked) {
      file_manager
          .loadFile(path.join(__dirname, `../../db/.${file}.json`))
          .then((res) => {
            res.forEach((i) => {
              if((i.utility_id === utility || utility === '') && (i.type_id === type || type === '') && (i.title === ct || ct === '') )
              {
                const tag = document.getElementById(i.id);
                if (tag != null && !tag.checked) {
                  tag.click();
                }
              }
            });
          });
      document.getElementById("save").disabled = false;
    } else {
      file_manager
          .loadFile(path.join(__dirname, `../../db/.${file}.json`))
          .then((res) => {
            res.forEach((i) => {
              if((i.utility_id === utility || utility === '') && (i.type_id === type || type === '') && (i.title === ct || ct === '') )
              {
                const tag = document.getElementById(i.id);
                if (tag != null && tag.checked) {
                  tag.click();
                }
              }
            });
          });
      document.getElementById("save").disabled = true;
    }
  }
  else
  {
    if (event.target.checked) {
      file_manager
          .loadFile(path.join(__dirname, `../../db/.${file}.json`))
          .then((res) => {
            res.forEach((i) => {
              if((i.utility_id === utility || utility === '') && (i.type_id === type || type === '') && (i.code_id === code || code === '') && (i.title === title || title === ''))
              {
                const tag = document.getElementById(i.id);
                if (tag != null && !tag.checked) {
                  tag.click();
                }
              }
            });
          });
      document.getElementById("save").disabled = false;
    } else {
      file_manager
          .loadFile(path.join(__dirname, `../../db/.${file}.json`))
          .then((res) => {
            res.forEach((i) => {
              if((i.utility_id === utility || utility === '') && (i.type_id === type || type === '') && (i.code_id === code || code === '') && (i.title === title || title === ''))
              {
                const tag = document.getElementById(i.id);
                if (tag != null && tag.checked) {
                  tag.click();
                }
              }
            });
          });
      document.getElementById("save").disabled = true;
    }
  }
});

function filter_by_dropdown(file, utility, type, code) {
  file_manager
      .loadFile(path.join(__dirname, `../../db/.${file}.json`))
      .then((res) => {
        document.getElementById("client-table").innerHTML = "";
        if(file === 'codes')
        {
          res.forEach((data, index) => {
            if((data.utility_id === utility || utility === '') && (data.type_id === type || type === '') && (data.title === ct || code === ''))
            {
                document.getElementById("client-table").innerHTML += `
                <tr class="tr-shadow" style="border-bottom: 2px solid grey">
                  <td style="border-right: 1px solid black">
                    <label class="au-checkbox">
                      <input type="checkbox" id="${data.id}" onchange="toggle(event)">
                      <span class="au-checkmark" style="border: 1px solid green"></span>
                    </label>
                  </td>
                  <td  style="border-right: 1px solid black">${data.id}</td>
                  <td style="border-right: 1px solid black">${data.title}</td>
                  <td style="border-right: 1px solid black">--</td>
                  <td>${data.rate}</td>
                </tr>`;
            }
          });
        }
        else
        {
          res.forEach((data, index) => {
            if((data.utility_id === utility || utility === '') && (data.type_id === type || type === '') && (data.code_id === code || code === '') && (data.title === title || title === ''))
            {
                document.getElementById("client-table").innerHTML += `
                <tr class="tr-shadow" style="border-bottom: 2px solid grey">
                  <td style="border-right: 1px solid black">
                    <label class="au-checkbox">
                      <input type="checkbox" id="${data.id}" onchange="toggle(event)">
                      <span class="au-checkmark" style="border: 1px solid green"></span>
                    </label>
                  </td>
                  <td style="border-right: 1px solid black">${data.id}</td>
                  <td style="border-right: 1px solid black">${data.title}</td>
                  <td style="border-right: 1px solid black">${data.code}</td>
                  <td>${data.rate}</td>
                </tr>`;
            }
          });

        }

      });
}