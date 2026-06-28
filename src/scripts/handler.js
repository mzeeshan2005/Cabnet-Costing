const path = require("path");
const {faInfoCircle} = require("@fortawesome/fontawesome-free-solid");
const file_manager = require(path.join(__dirname, "../../scripts/file_manager.js"));

let listData = [];
let opt = '';


function save_func(event, op) {
  event.preventDefault();
  opt = op;
}

function clearFields() {
  document.getElementById("client-name").value = "";
  document.getElementById("select").value = "";
  document.getElementById("select-1").value = "";
  document.getElementById("select-2").value = "";
  document.getElementById("rate").value = "0";
  file_manager
    .loadFile(path.join(__dirname, "../../db/.handlers.json"))
    .then((res) => {
      const id = document.getElementById("id");
      if (res.length === 0 && listData.length === 0) {
        id.innerHTML = "1";
      } else if (listData.length === 0) {
        id.innerHTML = Number(res[res.length - 1].id) + 1;
      } else if (res.length === 0) {
        id.innerHTML = Number(listData[listData.length - 1].id) + 1;
      } else {
        id.innerHTML = Number(listData[listData.length - 1].id) + 1;
      }
    });
}

function toggle(event) {
  if (event.target.checked) {
    document.getElementById("delete-selected").disabled = false;
    document.getElementById("delete-selected-1").disabled = false;
    file_manager
      .loadFile(path.join(__dirname, "../../db/.handlers.json"))
      .then((res) => {
        const data1 = res.concat(listData);
        data1.forEach((data) => {
          if (data.id === event.target.id.toString()) {
            const id = document.getElementById("id");
            // id.innerHTML = data.id;
            // file_manager
            //     .loadFile(path.join(__dirname, "../../db/.types.json"))
            //     .then((res) => {
            //       const select = document.getElementById("select-1");
            //       select.innerHTML = "";
            //       let option = document.createElement("option");
            //       option.text = "Please Select";
            //       option.value = "";
            //       option.classList.add('d-none');
            //       select.add(option);
            //       res.forEach((dat) => {
            //         if(data.utility_id === dat.utility_id)
            //         {
            //           let option = document.createElement("option");
            //           option.text = dat.title;
            //           option.value = dat.id;
            //           select.add(option);
            //         }
            //       });
            //       document.getElementById("select-1").value = data.type_id;
            //     });
            // file_manager
            //     .loadFile(path.join(__dirname, "../../db/.codes.json"))
            //     .then((res) => {
            //       const select = document.getElementById("select-2");
            //       select.innerHTML = "";
            //       let option = document.createElement("option");
            //       option.text = "Please Select";
            //       option.value = "";
            //       option.classList.add('d-none');
            //       select.add(option);
            //       res.forEach((da) => {
            //         if(data.code_id === da.id)
            //         {
            //           let option = document.createElement("option");
            //           option.text = da.title;
            //           option.value = da.id;
            //           select.add(option);
            //         }
            //       });
            //       document.getElementById("select-2").value = data.code_id;
            //     });
            // document.getElementById("client-name").value = data.title;
            // document.getElementById("select").value = data.utility_id;
            // document.getElementById("select-1").value = data.type_id;
            // document.getElementById("select-2").value = data.code_id;
            // document.getElementById("rate").value = data.rate;
            document.getElementById("fieldset").disabled = true;
            document.getElementById("update").disabled = true;
            document.getElementById("save").disabled = true;
            document.getElementById("clear").disabled = true;
            document.getElementById("add").disabled = true;
            document.getElementById('edit').disabled = false
          }
        });
        file_manager
          .loadFile(path.join(__dirname, "../../db/.handlers.json"))
          .then((res) => {
            let count = 0;
            const data1 = res.concat(listData);
            data1.forEach((data) => {
              if (
                document.getElementById(data.id) &&
                document.getElementById(data.id).checked
              ) {
                count += 1;
              }
            });
            if (count > 1) {
              const id = document.getElementById("id");
              // id.innerHTML = data1.length + 1;
              clearFields();
              document.getElementById("fieldset").disabled = true;
              document.getElementById("save").disabled = true;
              document.getElementById("add").disabled = true;
              document.getElementById("update").disabled = true;
              document.getElementById("clear").disabled = true;
              document.getElementById('edit').disabled = true
            }
            if(count === data1.length)
            {
              document.getElementById("checkbox-all").checked = true;
            }
          });
      });
  } else {
    clearFields();
    file_manager
      .loadFile(path.join(__dirname, "../../db/.handlers.json"))
      .then((res) => {
        let count = 0;
        const data1 = res.concat(listData);
        data1.forEach((data) => {
          if (
            document.getElementById(data.id) &&
            document.getElementById(data.id).checked
          ) {
            count += 1;
          }
        });
        if(count < data1.length){
          document.getElementById("checkbox-all").checked = false;
        }
        if (count === 0) {
          clearFields();
          populateTable();
          document.getElementById("delete-selected").disabled = true;
          document.getElementById("delete-selected-1").disabled = true;
          document.getElementById("fieldset").disabled = false;
          document.getElementById("update").disabled = true;
          document.getElementById("add").disabled = false;
          document.getElementById('edit').disabled = true
          document.getElementById("clear").disabled = false;
          if (listData.length === 0) {
            document.getElementById("save").disabled = true;
          } else {
            document.getElementById("save").disabled = false;
          }
        } else if (count === 1) {
          document.getElementById("fieldset").disabled = true;
          file_manager
            .loadFile(path.join(__dirname, "../../db/.handlers.json"))
            .then((res) => {
              const data1 = res.concat(listData);
              data1.forEach((data) => {
                if (
                  document.getElementById(data.id) &&
                  document.getElementById(data.id).checked
                ) {
                  const id = document.getElementById("id");
                  // id.innerHTML = data.id;
                  // file_manager
                  //     .loadFile(path.join(__dirname, "../../db/.types.json"))
                  //     .then((res) => {
                  //       const select = document.getElementById("select-1");
                  //       select.innerHTML = "";
                  //       let option = document.createElement("option");
                  //       option.text = "Please Select";
                  //       option.value = "";
                  //       option.classList.add('d-none');
                  //       select.add(option);
                  //       res.forEach((dat) => {
                  //         if(data.utility_id === dat.utility_id)
                  //         {
                  //           let option = document.createElement("option");
                  //           option.text = dat.title;
                  //           option.value = dat.id;
                  //           select.add(option);
                  //         }
                  //       });
                  //       document.getElementById("select-1").value = data.type_id;
                  //     });
                  // file_manager
                  //     .loadFile(path.join(__dirname, "../../db/.codes.json"))
                  //     .then((res) => {
                  //       const select = document.getElementById("select-2");
                  //       select.innerHTML = "";
                  //       let option = document.createElement("option");
                  //       option.text = "Please Select";
                  //       option.value = "";
                  //       option.classList.add('d-none');
                  //       select.add(option);
                  //       res.forEach((da) => {
                  //         if(data.code_id === da.id)
                  //         {
                  //           let option = document.createElement("option");
                  //           option.text = da.title;
                  //           option.value = da.id;
                  //           select.add(option);
                  //         }
                  //       });
                  //       document.getElementById("select-2").value = data.code_id;
                  //     });
                  // document.getElementById("client-name").value = data.title;
                  // document.getElementById("select").value = data.utility_id;
                  // document.getElementById("select-1").value = data.type_id;
                  // document.getElementById("select-2").value = data.code_id;
                  // document.getElementById("rate").value = data.rate;
                  document.getElementById("fieldset").disabled = true;
                  document.getElementById("update").disabled = true;
                  document.getElementById("save").disabled = true;
                  document.getElementById("add").disabled = true;
                  document.getElementById('edit').disabled = false
                  document.getElementById("clear").disabled = true;
                }
              });
            });
        } else {
          document.getElementById("fieldset").disabled = true;
          document.getElementById("update").disabled = true;
          document.getElementById("save").disabled = true;
          document.getElementById("add").disabled = true;
          document.getElementById("clear").disabled = true;
          document.getElementById('edit').disabled = true
        }
      });
  }
}

function edit(event){
  document.getElementById("fieldset").disabled = false;
  file_manager
      .loadFile(path.join(__dirname, "../../db/.handlers.json"))
      .then((res) => {
        const data1 = res.concat(listData);
        data1.forEach((data) => {
          if (
              document.getElementById(data.id) &&
              document.getElementById(data.id).checked
          ) {
            const id = document.getElementById("id");
            id.innerHTML = data.id;
            file_manager
                .loadFile(path.join(__dirname, "../../db/.types.json"))
                .then((res) => {
                  const select = document.getElementById("select-1");
                  select.innerHTML = "";
                  let option = document.createElement("option");
                  option.text = "Please Select";
                  option.value = "";
                  option.classList.add('d-none');
                  select.add(option);
                  res.forEach((dat) => {
                    if(data.utility_id === dat.utility_id)
                    {
                      let option = document.createElement("option");
                      option.text = dat.title;
                      option.value = dat.id;
                      select.add(option);
                    }
                  });
                  document.getElementById("select-1").value = data.type_id;
                });
            file_manager
                .loadFile(path.join(__dirname, "../../db/.codes.json"))
                .then((res) => {
                  const select = document.getElementById("select-2");
                  select.innerHTML = "";
                  let option = document.createElement("option");
                  option.text = "Please Select";
                  option.value = "";
                  option.classList.add('d-none');
                  select.add(option);
                  res.forEach((da) => {
                    if(data.type_id === da.type_id)
                    {
                      let option = document.createElement("option");
                      option.text = da.title;
                      option.value = da.id;
                      select.add(option);
                    }
                  });
                  document.getElementById("select-2").value = data.code_id;
                });
            document.getElementById("client-name").value = data.title;
            document.getElementById("select").value = data.utility_id;
            document.getElementById("select-1").value = data.type_id;
            document.getElementById("select-2").value = data.code_id;
            document.getElementById("rate").value = data.rate;
            document.getElementById("update").disabled = false;
            document.getElementById("save").disabled = true;
            document.getElementById("add").disabled = true;
            document.getElementById('edit').disabled = false
            document.getElementById("clear").disabled = false;
          }
        });
      });
}
function populateTable() {
  document.getElementById("client-table").innerHTML = "";
  document.getElementById("delete-selected").disabled = true;
  document.getElementById("delete-selected-1").disabled = true;
  document.getElementById("update").disabled = true;
  document.getElementById("save").disabled = true;
  file_manager.nextId(".handlers.json").then((nextId) => {
    document.getElementById("id").innerHTML = String(nextId);
  });
  refreshHandlersTable();
  file_manager
    .loadFile(path.join(__dirname, "../../db/.utilities.json"))
    .then((res) => {
      const select = document.getElementById("select");
      select.innerHTML = "";
      let option = document.createElement("option");
      option.text = "Please Select";
      option.value = "";
      option.classList.add('d-none');
      select.add(option);
      res.forEach((data) => {
        let option = document.createElement("option");
        option.text = data.title;
        option.value = data.id;
        select.add(option);
      });
    });
  let select = document.getElementById("select-1");
  select.innerHTML = "";
  let option = document.createElement("option");
  option.text = "Please Select";
  option.value = "";
  option.classList.add('d-none');
  select.add(option);
   select = document.getElementById("select-2");
  select.innerHTML = "";
   option = document.createElement("option");
  option.text = "Please Select";
  option.value = "";
  option.classList.add('d-none');
  select.add(option);
  // file_manager
  //   .loadFile(path.join(__dirname, "../../db/.types.json"))
  //   .then((res) => {
  //     const select = document.getElementById("select-1");
  //     select.innerHTML = "";
  //     let option = document.createElement("option");
  //     option.text = "Please Select";
  //     option.value = "";
  //     option.classList.add('d-none');
  //     select.add(option);
  //     res.forEach((data) => {
  //       let option = document.createElement("option");
  //       option.text = data.title;
  //       option.value = data.id;
  //       select.add(option);
  //     });
  //   });
  // file_manager
  //   .loadFile(path.join(__dirname, "../../db/.codes.json"))
  //   .then((res) => {
  //     const select = document.getElementById("select-2");
  //     select.innerHTML = "";
  //     let option = document.createElement("option");
  //     option.text = "Please Select";
  //     option.value = "";
  //     option.classList.add('d-none');
  //     select.add(option);
  //     res.forEach((data) => {
  //       let option = document.createElement("option");
  //       option.text = data.title;
  //       option.value = data.id;
  //       select.add(option);
  //     });
  //   });
}

function renderHandlersTable(rows) {
  const tb = document.getElementById("client-table");
  if (!rows || rows.length === 0) {
    tb.innerHTML = `
      <tr class="tr-shadow" style="border-bottom: 2px solid grey">
        <td style="border: 1px solid black" colspan="5">No Data Added.</td>
      </tr>`;
    document.getElementById("checkbox-all-box").style.display = "none";
    return;
  }

  document.getElementById("checkbox-all-box").style.display = "block";
  tb.innerHTML = rows
    .map(
      (data) => `
        <tr class="tr-shadow" style="border-bottom: 2px solid grey">
          <td style="border: 1px solid black">
            <label class="au-checkbox">
              <input type="checkbox" id="${data.id}" onchange="toggle(event)">
              <span class="au-checkmark" style="border: 1px solid green"></span>
            </label>
          </td>
          <td style="border: 1px solid black">${data.id}</td>
          <td style="border: 1px solid black">${data.title}</td>
          <td style="border: 1px solid black">${data.code}</td>
          <td style="border: 1px solid black">${data.rate}</td>
        </tr>`
    )
    .join("");
}

function currentHandlerQuery() {
  const el = document.getElementById("search");
  return el && el.value != null ? String(el.value) : "";
}

function currentHandlerFilters() {
  return {
    utility_id: document.getElementById("select") ? document.getElementById("select").value : "",
    type_id: document.getElementById("select-1") ? document.getElementById("select-1").value : "",
    code_id: document.getElementById("select-2") ? document.getElementById("select-2").value : "",
  };
}

function listDataHandlersFiltered(query, utility_id, type_id, code_id) {
  let out = listData.slice();
  if (utility_id) out = out.filter((r) => r && String(r.utility_id) === String(utility_id));
  if (type_id) out = out.filter((r) => r && String(r.type_id) === String(type_id));
  if (code_id) out = out.filter((r) => r && String(r.code_id) === String(code_id));

  if (query) {
    const q = String(query).toLowerCase();
    out = out.filter((r) => {
      const id = r && r.id != null ? String(r.id) : "";
      const title = r && r.title != null ? String(r.title).toLowerCase() : "";
      const code = r && r.code != null ? String(r.code).toLowerCase() : "";
      return id.indexOf(query) !== -1 || title.indexOf(q) !== -1 || code.indexOf(q) !== -1;
    });
  }
  return out;
}

function mergeById(a, b) {
  const map = {};
  for (const r of a || []) {
    if (r && r.id != null) map[String(r.id)] = r;
  }
  for (const r of b || []) {
    if (r && r.id != null) map[String(r.id)] = r;
  }
  return Object.keys(map)
    .sort((x, y) => Number(x) - Number(y))
    .map((k) => map[k]);
}

function refreshHandlersTable() {
  const query = currentHandlerQuery();
  const f = currentHandlerFilters();
  return file_manager
    .searchHandlers(query, f.utility_id, f.type_id, f.code_id, 800)
    .then((rows) => {
      const merged = mergeById(rows || [], listDataHandlersFiltered(query, f.utility_id, f.type_id, f.code_id));
      renderHandlersTable(merged);
    });
}

let handlerSearchTimer = null;
function scheduleRefreshHandlersTable() {
  if (handlerSearchTimer) clearTimeout(handlerSearchTimer);
  handlerSearchTimer = setTimeout(() => {
    refreshHandlersTable();
  }, 150);
}

function del() {
  const selected = [];
  file_manager
    .loadFile(path.join(__dirname, "../../db/.handlers.json"))
    .then((res) => {
      res.forEach((data) => {
        if (
          document.getElementById(data.id) &&
          document.getElementById(data.id).checked
        ) {
          selected.push(data);
        }
      });
      res = res.filter(function (el) {
        return !selected.includes(el);
      });
      file_manager
        .writeFile(path.join(__dirname, "../../db/.handlers.json"), res)
        .then((res) => {
          if (res === "success") {
            clearFields();
            alert("Deleted Successfully!");
            document.getElementById("checkbox-all").checked = false;
            const selected1 = [];

            listData.forEach((data) => {
              if (
                document.getElementById(data.id) &&
                document.getElementById(data.id).checked
              ) {
                selected1.push(data);
              }
            });
            if (selected1.length > 0) {
              listData = listData.filter(function (el) {
                return !selected1.includes(el);
              });
            }
            clearFields();
            populateTable();
            document.getElementById("fieldset").disabled = false;
            document.getElementById("add").disabled = false;
            document.getElementById("save").disabled = false;
            document.getElementById("clear").disabled = false;
            if (listData.length === 0) {
              document.getElementById("save").disabled = true;
            } else {
              document.getElementById("save").disabled = false;
            }
          }
        });
    });
}

$(document).ready(() => {
  populateTable();
});

document.getElementById("form").addEventListener("submit", (event) => {
  event.preventDefault();
  const id = document.getElementById("id").innerHTML;
  const name = document.getElementById("client-name").value;
  const select = document.getElementById("select");
  const select_1 = document.getElementById("select-1");
  const select_2 = document.getElementById("select-2");
  const value = select.value;
  const text = select.options[select.selectedIndex].text;
  const value1 = select_1.value;
  const text1 = select_1.options[select_1.selectedIndex].text;
  const value2 = select_2.value;
  const text2 = select_2.options[select_2.selectedIndex].text;
  const rate = document.getElementById("rate").value;
  const data = {
    id: id,
    title: name,
    rate: rate,
    utility_id: value,
    utility: text,
    type_id: value1,
    type: text1,
    code_id: value2,
    code: text2,
  };
  listData.push(data);
  file_manager
    .loadFile(path.join(__dirname, "../../db/.handlers.json"))
    .then((res) => {
      if (res.length === 0 && listData.length === 1) {
        document.getElementById("client-table").innerHTML = "";
      }
      clearFields();
      populateTable();
      if (listData.length === 0) {
        document.getElementById("save").disabled = true;
      } else {
        document.getElementById("save").disabled = false;
      }
    });
});

document.getElementById("clear").addEventListener("click", (event) => {
  event.preventDefault();
  clearFields();
  populateTable();
  document.getElementById("add").disabled = false;
  document.getElementById("edit").disabled = true;
});

document.getElementById('cancel').addEventListener('click', (event) => {
  event.preventDefault();
  document.getElementById('pass').value = '';
})

document.getElementById("confirm").addEventListener("click", (event) => {
  event.preventDefault();
  let dd = {}
  const select = document.getElementById("select");
  dd.utility_id = select.value;
  dd.utility = select.options[select.selectedIndex].text;
  const select_1 = document.getElementById("select-1");
  dd.type_id = select_1.value;
  dd.type = select_1.options[select_1.selectedIndex].text;
  const select_2 = document.getElementById("select-2");
  dd.code_id = select_2.value;
  dd.code = select_2.options[select_2.selectedIndex].text;
  file_manager
    .loadFile(path.join(__dirname, "../../db/.credentials.json"))
    .then((res) => {
      if(opt === 'save')
      {
        if(res[0].password === document.getElementById('pass').value)
        {
          file_manager
              .loadFile(path.join(__dirname, "../../db/.handlers.json"))
              .then((res) => {
                const clients = res;
                listData.forEach((r) => {
                  clients.push(r);
                });

                file_manager
                    .writeFile(
                        path.join(__dirname, "../../db/.handlers.json"),
                        clients
                    )
                    .then((res) => {
                      if (res === "success") {
                        alert("Saved Successfully!");
                        document.getElementById("cancel").click();
                        document.getElementById("pass").value = "";
                        listData = [];
                        document.getElementById("save").disabled = true;
                        populateTable();
                      } else {
                        alert("Could Not Saved!");
                        document.getElementById("cancel").click();
                        document.getElementById("pass").value = "";
                      }
                    });
              });
        }
        else
        {
          alert("Password Not Matched!");
          document.getElementById("cancel").click();
          document.getElementById("pass").value = "";
        }
      }
      else if(opt === 'update')
      {
        if(document.getElementById('select').value.trim().length !== 0 &&
            document.getElementById('select-1').value.trim().length !== 0 &&
            document.getElementById('select-2').value.trim().length !== 0 &&
            document.getElementById('client-name').value.trim().length !== 0 &&
            document.getElementById('rate').value.trim().length !== 0 )
        {
          if(res[1].pass === document.getElementById('pass').value)
          {
            file_manager
                .loadFile(path.join(__dirname, "../../db/.handlers.json"))
                .then((res) => {
                  res.forEach((d) => {
                    if (d.id === document.getElementById("id").innerHTML) {
                      d.title = document.getElementById("client-name").value;
                      d.utility_id = dd.utility_id;
                      d.utility = dd.utility;
                      d.type_id = dd.type_id;
                      d.type = dd.type;
                      d.code_id = dd.code_id;
                      d.code = dd.code;
                      d.rate = document.getElementById("rate").value;
                    }
                  });
                  file_manager
                      .writeFile(path.join(__dirname, "../../db/.handlers.json"), res)
                      .then((res) => {
                        populateTable();
                        document.getElementById('edit').disabled = true
                        clearFields();
                        document.getElementById("add").disabled = false;
                        if (listData.length === 0) {
                          document.getElementById("save").disabled = true;
                        } else {
                          document.getElementById("save").disabled = false;
                        }
                      });
                });
            listData.forEach((d) => {
              if (d.id === document.getElementById("id").innerHTML) {
                d.title = document.getElementById("client-name").value;
                d.utility_id = dd.utility_id;
                d.utility = dd.utility;
                d.type_id = dd.type_id;
                d.type = dd.type;
                d.code_id = dd.code_id;
                d.code = dd.code;
                d.rate = document.getElementById("rate").value;
              }
            });
            populateTable();
            document.getElementById("cancel").click();
            document.getElementById("pass").value = "";
          }
          else
          {
            alert("Password Not Matched!");
            document.getElementById("cancel").click();
            document.getElementById("pass").value = "";
          }
        }
        else {
          alert("Incomplete Data! Please fill all fields.")
          document.getElementById('cancel').click();
        }

      }
      else
      {
        if(res[1].pass === document.getElementById('pass').value)
        {
          del();
          document.getElementById('edit').disabled = true
          document.getElementById('cancel').click();
        }
        else
        {
          alert("Password Not Matched!");
          document.getElementById("cancel").click();
          document.getElementById("pass").value = "";
        }
      }
    });
});

document.getElementById("checkbox-all").addEventListener("change", (event) => {
  if (event.target.checked) {
    file_manager
      .loadFile(path.join(__dirname, "../../db/.handlers.json"))
      .then((res) => {
        const data1 = res.concat(listData);
        data1.forEach((i) => {
          const tag = document.getElementById(i.id);
          if (tag && !tag.checked) {
            tag.click();
          }
        });
      });
    document.getElementById("delete-selected").disabled = false;
    document.getElementById("delete-selected-1").disabled = false;
    document.getElementById("fieldset").disabled = true;
    document.getElementById("save").disabled = true;
    document.getElementById("clear").disabled = true;
    document.getElementById("update").disabled = true;
    document.getElementById("add").disabled = true;
    clearFields();
  } else {
    file_manager
      .loadFile(path.join(__dirname, "../../db/.handlers.json"))
      .then((res) => {
        const data1 = res.concat(listData);
        data1.forEach((i) => {
          const tag = document.getElementById(i.id);
          if (tag && tag.checked) {
            tag.click();
          }
        });
      });
    clearFields();
    populateTable();
    document.getElementById("delete-selected").disabled = true;
    document.getElementById("delete-selected-1").disabled = true;
    document.getElementById("fieldset").disabled = false;
    if (listData.length === 0) {
      document.getElementById("save").disabled = true;
    } else {
      document.getElementById("save").disabled = false;
    }
    document.getElementById("clear").disabled = false;
    document.getElementById("update").disabled = true;
    document.getElementById("add").disabled = false;
  }
});

document.getElementById("select").addEventListener("change", (event) => {
  event.preventDefault();
  document.getElementById('select-1').value = ''
  document.getElementById('select-2').innerHTML = ''
  filter_by_dropdown(
    '',
    '',
    event.target.value
  );
  file_manager
    .loadFile(path.join(__dirname, "../../db/.types.json"))
    .then((res) => {
      const select = document.getElementById("select-1");
      select.innerHTML = "";
      let option = document.createElement("option");
      option.text = "Please Select";
      option.value = "";
      option.classList.add('d-none');
      select.add(option);
      res.forEach((data) => {
        let option = document.createElement("option");
        option.text = data.title;
        option.value = data.id;
        if (event.target.value === "" || data.utility_id === event.target.value)
          select.add(option);
      });
    });
});

document.getElementById("select-1").addEventListener("change", (event) => {
  event.preventDefault();
  document.getElementById('select-2').innerHTML = ''
  filter_by_dropdown_1(
    '',
    document.getElementById("select").value,
    event.target.value
  );

  file_manager
    .loadFile(path.join(__dirname, "../../db/.codes.json"))
    .then((res) => {
      const select = document.getElementById("select-2");
      select.innerHTML = "";
      let option = document.createElement("option");
      option.text = "Please Select";
      option.value = "";
      option.classList.add('d-none');
      select.add(option);
      res.forEach((data) => {
        let option = document.createElement("option");
        option.text = data.title;
        option.value = data.id;
        if (
          event.target.value === "" ||
          (data.type_id === event.target.value &&
            data.utility_id === document.getElementById("select").value)
        )
          select.add(option);
      });
    });
});

document.getElementById("select-2").addEventListener("change", (event) => {
  event.preventDefault();
  filter_by_dropdown_2(
    document.getElementById("select").value,
    document.getElementById("select-1").value,
    event.target.value
  );
});

// document
//   .getElementById("delete-selected")
//   .addEventListener("click", (event) => {
//     event.preventDefault();
//     del();
//   });
//
// document
//   .getElementById("delete-selected-1")
//   .addEventListener("click", (event) => {
//     event.preventDefault();
//     del();
//   });

document.getElementById("selectUtil").addEventListener("click", (event) => {
  document.getElementById("select").value = "";
  document.getElementById('select-1').innerHTML = ''
  document.getElementById('select-2').innerHTML = ''
  if(document.getElementById('checkbox-all').checked)
    document.getElementById('checkbox-all').checked = false
  document.getElementById('delete-selected-1').disabled = true
  document.getElementById('edit').disabled = true
  filter_by_dropdown(
      '',
      '',
      ''
  );
});

document.getElementById("selectTyp").addEventListener("click", (event) => {
  document.getElementById("select-1").value = "";
  document.getElementById('select-2').innerHTML = ''
  if(document.getElementById('checkbox-all').checked)
    document.getElementById('checkbox-all').checked = false
  document.getElementById('delete-selected-1').disabled = true
  document.getElementById('edit').disabled = true
  filter_by_dropdown_1(
      '',
      document.getElementById("select").value,
      ''
  );
});

document.getElementById("selectCod").addEventListener("click", (event) => {
  document.getElementById("select-2").value = "";
  if(document.getElementById('checkbox-all').checked)
    document.getElementById('checkbox-all').checked = false
  document.getElementById('delete-selected-1').disabled = true
  document.getElementById('edit').disabled = true
  filter_by_dropdown_2(
      document.getElementById("select").value,
      document.getElementById("select-1").value,
      ''
  );
});
function filter(query) {
  if (document.getElementById("search")) {
    document.getElementById("search").value = query != null ? String(query) : "";
  }
  scheduleRefreshHandlersTable();
}


function filter_by_dropdown(query, query1, query2) {
  if (document.getElementById("select-2") && query != null) {
    document.getElementById("select-2").value = String(query);
  }
  if (document.getElementById("select-1") && query1 != null) {
    document.getElementById("select-1").value = String(query1);
  }
  if (document.getElementById("select") && query2 != null) {
    document.getElementById("select").value = String(query2);
  }
  scheduleRefreshHandlersTable();
}

function filter_by_dropdown_1(query, query1, query2) {
  if (document.getElementById("select-2") && query != null) {
    document.getElementById("select-2").value = String(query);
  }
  if (document.getElementById("select") && query1 != null) {
    document.getElementById("select").value = String(query1);
  }
  if (document.getElementById("select-1") && query2 != null) {
    document.getElementById("select-1").value = String(query2);
  }
  scheduleRefreshHandlersTable();
}

function filter_by_dropdown_2(query, query1, query2) {
  if (document.getElementById("select") && query != null) {
    document.getElementById("select").value = String(query);
  }
  if (document.getElementById("select-1") && query1 != null) {
    document.getElementById("select-1").value = String(query1);
  }
  if (document.getElementById("select-2") && query2 != null) {
    document.getElementById("select-2").value = String(query2);
  }
  scheduleRefreshHandlersTable();
}


// function filter_by_dropdown(query, query1, query2) {
//   file_manager
//     .loadFile(path.join(__dirname, "../../db/.handlers.json"))
//     .then((res) => {
//       const result = [];
//       const result1 = [];
//       const result2 = [];
//       const data1 = res.concat(listData);
//       data1.forEach((data) => {
//         if (data.code_id.includes(query)) {
//           result.push(data);
//         }
//       });
//       result.forEach((data) => {
//         if (data.type_id.includes(query1)) {
//           result1.push(data);
//         }
//       });
//       result1.forEach((data) => {
//         if (data.utility_id.includes(query2)) {
//           result2.push(data);
//         }
//       });
//       document.getElementById("client-table").innerHTML = "";
//       result2.forEach((data, index) => {
//         document.getElementById("client-table").innerHTML += `
//           <tr class="tr-shadow" style="border-bottom: 2px solid grey">
//             <td style="border: 1px solid black">
//               <label class="au-checkbox">
//                 <input type="checkbox" id="${data.id}" onchange="toggle(event)">
//                 <span class="au-checkmark" style="border: 1px solid green"></span>
//               </label>
//             </td>
//             <td style="border: 1px solid black">${data.id}</td>
//             <td style="border: 1px solid black">${data.title}</td>
//             <td style="border: 1px solid black">${data.code}</td>
//             <td style="border: 1px solid black">${data.rate}</td>
//           </tr>`;
//       });
//     });
// }
//
// function filter_by_dropdown_1(query, query1, query2) {
//   file_manager
//     .loadFile(path.join(__dirname, "../../db/.handlers.json"))
//     .then((res) => {
//       const result = [];
//       const result1 = [];
//       const result2 = [];
//       const data1 = res.concat(listData);
//       data1.forEach((data) => {
//         if (data.code_id.includes(query)) {
//           result.push(data);
//         }
//       });
//       result.forEach((data) => {
//         if (data.utility_id.includes(query1)) {
//           result1.push(data);
//         }
//       });
//       result1.forEach((data) => {
//         if (data.type_id.includes(query2)) {
//           result2.push(data);
//         }
//       });
//       document.getElementById("client-table").innerHTML = "";
//       result2.forEach((data, index) => {
//         document.getElementById("client-table").innerHTML += `
//           <tr class="tr-shadow" style="border-bottom: 2px solid grey">
//             <td style="border: 1px solid black">
//               <label class="au-checkbox">
//                 <input type="checkbox" id="${data.id}" onchange="toggle(event)">
//                 <span class="au-checkmark" style="border: 1px solid green"></span>
//               </label>
//             </td>
//             <td style="border: 1px solid black">${data.id}</td>
//             <td style="border: 1px solid black">${data.title}</td>
//             <td style="border: 1px solid black">${data.code}</td>
//             <td style="border: 1px solid black">${data.rate}</td>
//           </tr>`;
//       });
//     });
// }
//
// function filter_by_dropdown_2(query, query1, query2) {
//   file_manager
//     .loadFile(path.join(__dirname, "../../db/.handlers.json"))
//     .then((res) => {
//       const result = [];
//       const result1 = [];
//       const result2 = [];
//       const data1 = res.concat(listData);
//       data1.forEach((data) => {
//         if (data.utility_id.includes(query)) {
//           result.push(data);
//         }
//       });
//       result.forEach((data) => {
//         if (data.type_id.includes(query1)) {
//           result1.push(data);
//         }
//       });
//       result1.forEach((data) => {
//         if (data.code_id.includes(query2)) {
//           result2.push(data);
//         }
//       });
//       document.getElementById("client-table").innerHTML = "";
//       result2.forEach((data, index) => {
//         document.getElementById("client-table").innerHTML += `
//           <tr class="tr-shadow" style="border-bottom: 2px solid grey">
//             <td style="border: 1px solid black">
//               <label class="au-checkbox">
//                 <input type="checkbox" id="${data.id}" onchange="toggle(event)">
//                 <span class="au-checkmark" style="border: 1px solid green"></span>
//               </label>
//             </td>
//             <td style="border: 1px solid black">${data.id}</td>
//             <td style="border: 1px solid black">${data.title}</td>
//             <td style="border: 1px solid black">${data.code}</td>
//             <td style="border: 1px solid black">${data.rate}</td>
//           </tr>`;
//       });
//     });
// }

document.getElementById("search").addEventListener("input", (event) => {
  scheduleRefreshHandlersTable();
});
