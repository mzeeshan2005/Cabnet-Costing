const remote = require("electron").remote;
const path = require("path");
const file_manager = remote.require(
  path.join(__dirname, "../../scripts/file_manager.js")
);

let listData = [];
let opt = '';


function clearFields() {
  document.getElementById("client-name").value = "";
  file_manager
    .loadFile(path.join(__dirname, "../../db/.utilities.json"))
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
      .loadFile(path.join(__dirname, "../../db/.utilities.json"))
      .then((res) => {
        const data1 = res.concat(listData);
        data1.forEach((data) => {
          if (data.id === event.target.id.toString()) {
            // const id = document.getElementById("id");
            // id.innerHTML = data.id;
            // document.getElementById("client-name").value = data.title;
            document.getElementById("fieldset").disabled = true;
            document.getElementById("update").disabled = true;
            document.getElementById("edit").disabled = false;
            document.getElementById("save").disabled = true;
            document.getElementById("clear").disabled = true;
            document.getElementById("add").disabled = true;
          }
        });

        file_manager
          .loadFile(path.join(__dirname, "../../db/.utilities.json"))
          .then((res) => {
            let count = 0;
            var data1 = res.concat(listData);
            data1.forEach((data) => {
              if (document.getElementById(data.id).checked) {
                count += 1;
              }
            });
            if (count > 1) {
              // const id = document.getElementById("id");
              // id.innerHTML = data1.length + 1;
              clearFields();
              document.getElementById("fieldset").disabled = true;
              document.getElementById("save").disabled = true;
              document.getElementById("add").disabled = true;
              document.getElementById("update").disabled = true;
              document.getElementById("edit").disabled = true;
              document.getElementById("clear").disabled = true;
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
      .loadFile(path.join(__dirname, "../../db/.utilities.json"))
      .then((res) => {
        let count = 0;
        const data1 = res.concat(listData);
        data1.forEach((data) => {
          if (document.getElementById(data.id).checked) {
            count += 1;
          }
        });
        if(count < data1.length){
          document.getElementById("checkbox-all").checked = false;
        }
        if (count === 0) {
          document.getElementById("delete-selected").disabled = true;
          document.getElementById("delete-selected-1").disabled = true;
          document.getElementById("fieldset").disabled = false;
          document.getElementById("edit").disabled = true;
          if(listData.length === 0)
          {
            document.getElementById("save").disabled = true;
          }
          else
          {
            document.getElementById("save").disabled = false;
          }
          document.getElementById("update").disabled = true;
          document.getElementById("add").disabled = false;
          document.getElementById("clear").disabled = false;
        } else if (count === 1) {
          file_manager
            .loadFile(path.join(__dirname, "../../db/.utilities.json"))
            .then((res) => {
              const data1 = res.concat(listData);
              data1.forEach((data) => {
                if (document.getElementById(data.id).checked) {
                  // const id = document.getElementById("id");
                  // id.innerHTML = data.id;
                  document.getElementById("edit").disabled = false;
                  // document.getElementById("client-name").value = data.title;
                  document.getElementById("fieldset").disabled = true;
                  document.getElementById("update").disabled = true;
                  document.getElementById("save").disabled = true;
                  document.getElementById("add").disabled = true;
                  document.getElementById("clear").disabled = true;
                }
              });
            });
        } else {
          document.getElementById("edit").disabled = true;
          document.getElementById("fieldset").disabled = true;
          document.getElementById("update").disabled = true;
          document.getElementById("save").disabled = true;
          document.getElementById("add").disabled = true;
          document.getElementById("clear").disabled = true;
          // clearFields();
        }
      });
  }
}

function edit(event) {
  file_manager
      .loadFile(path.join(__dirname, "../../db/.utilities.json"))
      .then((res) => {
        const data1 = res.concat(listData);
        data1.forEach((data) => {
          if (document.getElementById(data.id).checked) {
            const id = document.getElementById("id");
            id.innerHTML = data.id;
            document.getElementById("edit").disabled = false;
            document.getElementById("client-name").value = data.title;
            document.getElementById("fieldset").disabled = false;
            document.getElementById("update").disabled = false;
            document.getElementById("save").disabled = true;
            document.getElementById("add").disabled = true;
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
  file_manager
    .loadFile(path.join(__dirname, "../../db/.utilities.json"))
    .then((res) => {
      const data1 = res.concat(listData);
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
      if (data1.length === 0) {
        document.getElementById("client-table").innerHTML += `
          <tr class="tr-shadow" style="border-bottom: 2px solid grey">
            <td style="border: 1px solid black" colspan="3">
              No Data Added
            </td>
          </tr>`;
        document.getElementById("checkbox-all-box").style.display = "none";
      } else {
        document.getElementById("checkbox-all-box").style.display = "block";
        data1.forEach((data, index) => {
          document.getElementById("client-table").innerHTML += `
          <tr class="tr-shadow" style="border-bottom: 2px solid grey">
            <td style="border: 1px solid black">
              <label class="au-checkbox">
                <input type="checkbox" id="${data.id}" onchange="toggle(event)">
                <span class="au-checkmark" style="border: 1px solid green"></span>
              </label>
            </td>
            <td style="border: 1px solid black">${data.id}</td> 
            <td style="border: 1px solid black">${data.title}</td>
          </tr>`;
        });
      }
    });
}

function save_func(event, op) {
  event.preventDefault();
  opt = op;
}

$(document).ready(() => {
  populateTable();
});

document.getElementById("form").addEventListener("submit", (event) => {
  event.preventDefault();
  const id = document.getElementById("id").innerHTML;
  const name = document.getElementById("client-name").value;
  const data = {
    id: id,
    title: name,
  };
  listData.push(data);
  file_manager
    .loadFile(path.join(__dirname, "../../db/.utilities.json"))
    .then((res) => {
      if (res.length === 0 && listData.length === 1) {
        document.getElementById("save").disabled = false;
        document.getElementById("client-table").innerHTML = "";
        document.getElementById("client-table").innerHTML += `
          <tr class="tr-shadow" style="border-bottom: 2px solid grey">
            <td style="border: 1px solid black">
              <label class="au-checkbox">
                <input type="checkbox" id="${data.id}" onchange="toggle(event)">
                <span class="au-checkmark" style="border: 1px solid green"></span>
              </label>
            </td>
            <td style="border: 1px solid black">${data.id}</td>
            <td style="border: 1px solid black">${data.title}</td>
          </tr>`;
        clearFields();
      } else {
        document.getElementById("save").disabled = false;
        document.getElementById("client-table").innerHTML += `
          <tr class="tr-shadow" style="border-bottom: 2px solid grey">
            <td style="border: 1px solid black">
              <label class="au-checkbox">
                <input type="checkbox" id="${data.id}" onchange="toggle(event)">
                <span class="au-checkmark" style="border: 1px solid green"></span>
              </label>
            </td>
            <td style="border: 1px solid black">${data.id}</td>
            <td style="border: 1px solid black">${data.title}</td>
          </tr>`;
        clearFields();
      }
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
      if(opt === 'save')
      {
        if(res[0].password === document.getElementById('pass').value)
        {
          file_manager
              .loadFile(path.join(__dirname, "../../db/.utilities.json"))
              .then((res) => {
                const clients = res;
                listData.forEach((r) => {
                  clients.push(r);
                });

                file_manager
                    .writeFile(
                        path.join(__dirname, "../../db/.utilities.json"),
                        clients
                    )
                    .then((res) => {
                      if (res === "success") {
                        alert("Saved Successfully!")
                        document.getElementById("cancel").click();
                        document.getElementById("pass").value = "";
                        listData = [];
                        document.getElementById("save").disabled = true;
                        populateTable();
                      } else {
                        document.getElementById("cancel").click();
                        document.getElementById("pass").value = "";
                        alert("Not Saved!")
                      }
                    });
              });
        }
        else
        {
          alert("Password Not Matched!")
          document.getElementById("cancel").click();
          document.getElementById("pass").value = "";
        }
      }
      else if(opt === 'update')
      {
        if(document.getElementById('client-name').value.trim().length !== 0)
        {
          if(res[1].pass === document.getElementById('pass').value)
          {
            file_manager
                .loadFile(path.join(__dirname, "../../db/.utilities.json"))
                .then((res) => {
                  res.forEach((d) => {
                    if (d.id === document.getElementById("id").innerHTML) {
                      d.title = document.getElementById("client-name").value;
                    }
                  });
                  file_manager
                      .writeFile(path.join(__dirname, "../../db/.utilities.json"), res)
                      .then((res) => {
                        populateTable();
                        clearFields();
                        if(listData.length === 0)
                        {
                          document.getElementById("save").disabled = true;
                        }
                        else
                        {
                          document.getElementById("save").disabled = false;
                        }
                        document.getElementById("add").disabled = false;
                        document.getElementById("edit").disabled = true;
                      });
                });
            listData.forEach((d) => {
              if (d.id === document.getElementById("id").innerHTML) {
                d.title = document.getElementById("client-name").value;
              }
            });
            document.getElementById("cancel").click();
            document.getElementById("pass").value = "";
            populateTable();
          }
          else
          {
            document.getElementById("cancel").click();
            document.getElementById("pass").value = "";
            alert("Password Not Matched");
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
          document.getElementById('cancel').click();
        }
        else
        {
          document.getElementById("cancel").click();
          document.getElementById("pass").value = "";
          alert("Password Not Matched!")
        }
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

document.getElementById("checkbox-all").addEventListener("change", (event) => {
  if (event.target.checked) {
    file_manager
      .loadFile(path.join(__dirname, "../../db/.utilities.json"))
      .then((res) => {
        const data = res.concat(listData);
        data.forEach((i) => {
          const tag = document.getElementById(i.id);
          if (!tag.checked) {
            tag.click();
          }
        });
      });
    document.getElementById("delete-selected").disabled = false;
    document.getElementById("delete-selected-1").disabled = false;
    document.getElementById("fieldset").disabled = true;
    document.getElementById("save").disabled = true;
    document.getElementById("update").disabled = true;
    document.getElementById("add").disabled = true;
    document.getElementById("clear").disabled = true;
    clearFields();
  } else {
    file_manager
      .loadFile(path.join(__dirname, "../../db/.utilities.json"))
      .then((res) => {
        const data = res.concat(listData);
        data.forEach((i) => {
          const tag = document.getElementById(i.id);
          if (tag.checked) {
            tag.click();
          }
        });
      });
    document.getElementById("delete-selected").disabled = true;
    document.getElementById("delete-selected-1").disabled = true;
    document.getElementById("fieldset").disabled = false;
    document.getElementById("save").disabled = false;
    document.getElementById("update").disabled = true;
    document.getElementById("add").disabled = false;
    document.getElementById("clear").disabled = false;
    clearFields();
  }
});

function del_from_other(selected)
{
  file_manager
      .loadFile(path.join(__dirname, "../../db/.types.json"))
      .then((res) => {
        res.forEach(d => {
          selected.forEach(i => {
            res = res.filter(item => item.utility_id !== i.id);
          })
        })
        file_manager
            .writeFile(path.join(__dirname, "../../db/.types.json"), res)
            .then((res) => {})
      })

  file_manager
      .loadFile(path.join(__dirname, "../../db/.codes.json"))
      .then((res) => {
        res.forEach(d => {
          selected.forEach(i => {
            res = res.filter(item => item.utility_id !== i.id);
          })
        })
        file_manager
            .writeFile(path.join(__dirname, "../../db/.codes.json"), res)
            .then((res) => {})
      })

  file_manager
      .loadFile(path.join(__dirname, "../../db/.doors.json"))
      .then((res) => {
        res.forEach(d => {
          selected.forEach(i => {
            res = res.filter(item => item.utility_id !== i.id);
          })
        })
        file_manager
            .writeFile(path.join(__dirname, "../../db/.doors.json"), res)
            .then((res) => {})
      })

  file_manager
      .loadFile(path.join(__dirname, "../../db/.hardwares.json"))
      .then((res) => {
        res.forEach(d => {
          selected.forEach(i => {
            res = res.filter(item => item.utility_id !== i.id);
          })
        })
        file_manager
            .writeFile(path.join(__dirname, "../../db/.hardwares.json"), res)
            .then((res) => {})
      })

  file_manager
      .loadFile(path.join(__dirname, "../../db/.handlers.json"))
      .then((res) => {
        res.forEach(d => {
          selected.forEach(i => {
            res = res.filter(item => item.utility_id !== i.id);
          })
        })
        file_manager
            .writeFile(path.join(__dirname, "../../db/.handlers.json"), res)
            .then((res) => {})
      })

  file_manager
      .loadFile(path.join(__dirname, "../../db/.shelves.json"))
      .then((res) => {
        res.forEach(d => {
          selected.forEach(i => {
            res = res.filter(item => item.utility_id !== i.id);
          })
        })
        file_manager
            .writeFile(path.join(__dirname, "../../db/.shelves.json"), res)
            .then((res) => {})
      })
}

function del() {
  const selected = [];
  const s = [];
  file_manager
    .loadFile(path.join(__dirname, "../../db/.utilities.json"))
    .then((res) => {
      res.forEach((data) => {
        console.log(data);
        if (!document.getElementById(data.id).checked) {
          selected.push(data);
        }
        else
        {
          s.push(data);
        }
      });
      file_manager
        .writeFile(path.join(__dirname, "../../db/.utilities.json"), selected)
        .then((res) => {
          if (res === "success") {
            document.getElementById('edit').disabled = true
            alert("Deleted Successfully!")
            document.getElementById("checkbox-all").checked = false;
            // populateTable();
            const selected1 = [];

            listData.forEach((data) => {
              if (!document.getElementById(data.id).checked) {
                selected1.push(data);
              }
              else
              {
                s.push(data);
              }
            });
            listData = selected1;
            del_from_other(s);
            clearFields();
            populateTable();
            document.getElementById("fieldset").disabled = false;
            document.getElementById("add").disabled = false;
            if (listData.length === 0) {
              document.getElementById("save").disabled = true;
            } else {
              document.getElementById("save").disabled = false;
            }
            document.getElementById("clear").disabled = false;
          } else {
            alert("Error Occurred!")
          }
        });
    });
}

function filter(query) {
  file_manager
    .loadFile(path.join(__dirname, "../../db/.utilities.json"))
    .then((res) => {
      const result = [];
      const data1 = res.concat(listData);
      data1.forEach((data) => {
        if (
          data.id.includes(query) ||
          data.title.toLowerCase().includes(query.toLowerCase())
        ) {
          result.push(data);
        }
      });
      document.getElementById("client-table").innerHTML = "";
      result.forEach((data, index) => {
        document.getElementById("client-table").innerHTML += `
          <tr class="tr-shadow" style="border-bottom: 2px solid grey ">
            <td style="border: 1px solid black">
              <label class="au-checkbox">
                <input type="checkbox" id="${data.id}" onchange="toggle(event)">
                <span class="au-checkmark" style="border: 1px solid green"></span>
              </label>
            </td>
            <td style="border: 1px solid black">${data.id}</td>
            <td style="border: 1px solid black">${data.title}</td>
          </tr>`;
      });
    });
}

document.getElementById("search").addEventListener("keypress", (event) => {
  filter(event.target.value);
});

document.getElementById("search").addEventListener("keydown", (event) => {
  if (event.target.value !== "") {
    filter(event.target.value);
  } else {
    populateTable();
  }
});

document.getElementById("search").addEventListener("keyup", (event) => {
  filter(event.target.value);
});
