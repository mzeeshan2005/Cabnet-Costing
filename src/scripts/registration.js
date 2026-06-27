const remote = require("electron").remote;
const path = require("path");
const {faUserCheck} = require("@fortawesome/fontawesome-free-solid");
const main = remote.require(path.join(__dirname, "../../index.js"));
const file_manager = remote.require(
  path.join(__dirname, "../scripts/file_manager.js")
);

let opt = '';


function clearFields() {
  document.getElementById("client-name").value = "";
  document.getElementById("client-cnic").value = "";
  document.getElementById("client-contact").value = "";
  document.getElementById("client-email").value = "";
  document.getElementById("client-ntn").value = "";
  document.getElementById("client-city").value = "";
  document.getElementById("client-address").value = "";
  document.getElementById("id").innerHTML = "";
  // file_manager.loadFile(path.join(__dirname, '../db/.clients.json'))
  //     .then(res => {
  //       const id = document.getElementById('id')
  //       id.innerHTML = res.length + 1
  //     })
}

function toggle(event) {
  if (event.target.checked) {
    document.getElementById("delete-selected").disabled = false;
    document.getElementById("delete-selected-1").disabled = false;
    file_manager
      .loadFile(path.join(__dirname, "../db/.clients.json"))
      .then((res) => {
        res.forEach((data) => {
          if (data.id === event.target.id.toString()) {
            const id = document.getElementById("id");
            // id.innerHTML = data.id;
            // document.getElementById("client-name").value = data.name;
            // document.getElementById("client-cnic").value = data.cnic;
            // document.getElementById("client-contact").value = data.contact;
            // document.getElementById("client-email").value = data.email;
            // document.getElementById("client-ntn").value = data.ntn;
            // document.getElementById("client-city").value = data.city;
            // document.getElementById("client-address").value = data.address;
            document.getElementById("fieldset").disabled = true;
            document.getElementById("save").disabled = true;
            document.getElementById("clear").disabled = true;
            document.getElementById('edit').disabled = false;
          }
        });
        file_manager
          .loadFile(path.join(__dirname, "../db/.clients.json"))
          .then((res) => {
            let count = 0;
            res.forEach((data) => {
              if (document.getElementById(data.id).checked) {
                count += 1;
              }
            });
            if (count > 1) {
              // const id = document.getElementById('id')
              // id.innerHTML = res.length+1
              clearFields();
              document.getElementById("fieldset").disabled = true;
              document.getElementById("save").disabled = true;
              document.getElementById("clear").disabled = true;
              document.getElementById('edit').disabled = true;
            }
          });
      });
  } else {
    clearFields();
    file_manager
      .loadFile(path.join(__dirname, "../db/.clients.json"))
      .then((res) => {
        let count = 0;
        res.forEach((data) => {
          if (document.getElementById(data.id).checked) {
            count += 1;
          }
        });
        if (count === 0) {
          document.getElementById('edit').disabled = true;
          document.getElementById("delete-selected").disabled = true;
          document.getElementById("delete-selected-1").disabled = true;
          document.getElementById("fieldset").disabled = true;
          document.getElementById("save").disabled = true;
          document.getElementById("clear").disabled = true;
          clearFields();
          // file_manager.loadFile(path.join(__dirname, '../db/.clients.json'))
          //     .then(res => {
          //       const id = document.getElementById('id')
          //       id.innerHTML = res.length + 1
          //     })
        } else if (count === 1) {
          document.getElementById("fieldset").disabled = false;
          file_manager
            .loadFile(path.join(__dirname, "../db/.clients.json"))
            .then((res) => {
              res.forEach((data) => {
                if (document.getElementById(data.id).checked) {
                  const id = document.getElementById("id");
                  // id.innerHTML = data.id;
                  // document.getElementById("client-name").value = data.name;
                  // document.getElementById("client-cnic").value = data.cnic;
                  // document.getElementById("client-contact").value =
                  //   data.contact;
                  // document.getElementById("client-email").value = data.email;
                  // document.getElementById("client-ntn").value = data.ntn;
                  // document.getElementById("client-city").value = data.city;
                  // document.getElementById("client-address").value =
                  //   data.address;
                  document.getElementById("fieldset").disabled = true;
                  document.getElementById("save").disabled = true;
                  document.getElementById("clear").disabled = false;
                  document.getElementById('edit').disabled = true;
                }
              });
            });
        } else {
          document.getElementById('edit').disabled = true;
          document.getElementById("fieldset").disabled = true;
          document.getElementById("save").disabled = true;
          document.getElementById("clear").disabled = true;
          clearFields();
        }
      });
  }
}

function edit(event){
  document.getElementById("fieldset").disabled = false;
  file_manager
      .loadFile(path.join(__dirname, "../db/.clients.json"))
      .then((res) => {
        res.forEach((data) => {
          if (document.getElementById(data.id).checked) {
            const id = document.getElementById("id");
            id.innerHTML = data.id;
            document.getElementById("client-name").value = data.name;
            document.getElementById("client-cnic").value = data.cnic;
            document.getElementById("client-contact").value =
              data.contact;
            document.getElementById("client-email").value = data.email;
            document.getElementById("client-ntn").value = data.ntn;
            document.getElementById("client-city").value = data.city;
            document.getElementById("client-address").value =
              data.address;
            // document.getElementById("fieldset").disabled = true;
            document.getElementById("save").disabled = false;
            document.getElementById("clear").disabled = false;
            document.getElementById('edit').disabled = false;
          }
        });
      });
}

function save_func(event, op) {
  event.preventDefault();
  opt = op;

}

function populateTable() {
  document.getElementById("fieldset").disabled = true;
  document.getElementById("client-table").innerHTML = "";
  // document.getElementById("delete-selected").disabled = true;
  document.getElementById("delete-selected-1").disabled = true;
  document.getElementById("save").disabled = true;
  document.getElementById("clear").disabled = true;
  file_manager
    .loadFile(path.join(__dirname, "../db/.clients.json"))
    .then((res) => {
      if (res.length === 0) {
        document.getElementById("checkbox-all-box").style.display = "none";
        document.getElementById("client-table").innerHTML += `
          <tr class="tr-shadow" style="border-bottom: 2px solid grey">
            <td >
              <label class="au-checkbox">
                <input type="checkbox" id="${data.id}" onchange="toggle(event)">
                <span class="au-checkmark" style="border: 1px solid green"></span>
              </label>
            </td>
            <td>No Clients Added</td>
            <td></td>
            <td></td>
            <td></td>
          </tr>`;
      } else {
        document.getElementById("checkbox-all-box").style.display = "block";
        res.forEach((data, index) => {
          document.getElementById("client-table").innerHTML += `
          <tr class="tr-shadow" style="border-bottom: 2px solid grey">
            <td style="border: 1px solid black">
              <label class="au-checkbox">
                <input type="checkbox" id="${data.id}" onchange="toggle(event)">
                <span class="au-checkmark" style="border: 1px solid green"></span>
              </label>
            </td>
            <td style="border: 1px solid black">${data.id}</td>
            <td style="border: 1px solid black">${data.name}</td>
            <td style="border: 1px solid black">${data.contact}</td>
            <td style="border: 1px solid black">${data.address}</td>
          </tr>`;
        });
      }

      // const id = document.getElementById('id')
      // id.innerHTML = res.length+1
    });
}

$(document).ready(() => {
  populateTable();
});

document.getElementById('cancel').addEventListener('click', (event) => {
  event.preventDefault();
  document.getElementById('pass').value = '';
})

document.getElementById('confirm').addEventListener('click', (event) => {
  event.preventDefault();
  file_manager
      .loadFile(path.join(__dirname, "../db/.credentials.json"))
      .then((res) => {
        if (res[1].pass === document.getElementById("pass").value) {
          if(opt === 'save')
          {
            const id = document.getElementById("id").innerHTML;
            const name = document.getElementById("client-name").value;
            const cnic = document.getElementById("client-cnic").value;
            const contact = document.getElementById("client-contact").value;
            const email = document.getElementById("client-email").value;
            const ntn = document.getElementById("client-ntn").value;
            const city = document.getElementById("client-city").value;
            const address = document.getElementById("client-address").value;
            if(name.trim().length!==0 && contact.trim().length!==0 && city.trim().length!==0)
            {
              file_manager
                  .loadFile(path.join(__dirname, "../db/.clients.json"))
                  .then((res) => {
                    const clients = res;
                    const data = {
                      id: id,
                      name: name,
                      cnic: cnic,
                      contact: contact,
                      email: email,
                      ntn: ntn,
                      city: city,
                      address: address,
                    };
                    let stat = false;
                    let ind = 0;
                    clients.forEach((r, i) => {
                      if (r.id === data.id) {
                        stat = true;
                        ind = i;
                      }
                    });

                    if (stat) {
                      clients[ind] = data;
                    } else {
                      clients.push(data);
                    }

                    file_manager
                        .writeFile(path.join(__dirname, "../db/.clients.json"), clients)
                        .then((res) => {
                          if (res === "success") {
                            document.getElementById('edit').disabled = true;
                            alert("Saved Successfully!");
                            clearFields();
                            document.getElementById('cancel').click();
                            populateTable();
                          } else {
                            alert("Not Saved!")
                          }
                        });
                  });
            }
            else {
              alert("Incomplete Data! Please fill all required fields.")
              document.getElementById('cancel').click();
            }

          }
          else
          {
            del();
            document.getElementById('edit').disabled = true;
            document.getElementById('cancel').click();
          }

        }
        else
        {
          alert("Password Not Matched!");
          document.getElementById("cancel").click();
          document.getElementById("pass").value = "";
        }
      })
})

document.getElementById("clear").addEventListener("click", (event) => {
  event.preventDefault();
  clearFields();
  populateTable();
  document.getElementById("edit").disabled = true;
});

document.getElementById("checkbox-all").addEventListener("change", (event) => {
  if (event.target.checked) {
    file_manager
      .loadFile(path.join(__dirname, "../db/.clients.json"))
      .then((res) => {
        res.forEach((i) => {
          const tag = document.getElementById(i.id);
          if (!tag.checked) {
            tag.click();
          }
        });
      });
    // document.getElementById("delete-selected").disabled = false;
    document.getElementById("delete-selected-1").disabled = false;
    document.getElementById("fieldset").disabled = true;
    document.getElementById("save").disabled = true;
    document.getElementById("clear").disabled = true;
    clearFields();
  } else {
    file_manager
      .loadFile(path.join(__dirname, "../db/.clients.json"))
      .then((res) => {
        res.forEach((i) => {
          const tag = document.getElementById(i.id);
          if (tag.checked) {
            tag.click();
          }
        });
      });
    // document.getElementById("delete-selected").disabled = true;
    document.getElementById("delete-selected-1").disabled = true;
    document.getElementById("fieldset").disabled = false;
    document.getElementById("save").disabled = false;
    document.getElementById("clear").disabled = false;
    clearFields();
  }
});

function del() {
  const selected = [];
  file_manager
    .loadFile(path.join(__dirname, "../db/.clients.json"))
    .then((res) => {
      res.forEach((data) => {
        if (!document.getElementById(data.id).checked) {
          selected.push(data);
        }
      });
      file_manager
        .writeFile(path.join(__dirname, "../db/.clients.json"), selected)
        .then((res) => {
          if (res === "success") {
            clearFields();
            alert(
              "Deleted Successfully!");
            populateTable();
          } else {
            alert("Not Deleted!")
          }
        });
    });
}

function filter(query) {
  file_manager
    .loadFile(path.join(__dirname, "../db/.clients.json"))
    .then((res) => {
      const result = [];
      res.forEach((data) => {
        if (
          data.id.includes(query) ||
          data.name.toLowerCase().includes(query.toLowerCase()) ||
          data.city.toLowerCase().includes(query.toLowerCase()) ||
          data.contact.includes(query)
        ) {
          result.push(data);
        }
      });
      document.getElementById("client-table").innerHTML = "";
      result.forEach((data, index) => {
        document.getElementById("client-table").innerHTML += `
          <tr class="tr-shadow" style="border-bottom: 2px solid grey">
            <td style="">
              <label class="au-checkbox" ">
                <input type="checkbox" id="${data.id}"  onchange="toggle(event)">
                <span class="au-checkmark" style="border: 1px solid green;"></span>
              </label>
            </td>
            <td>${data.id}</td>
            <td>${data.name}</td>
            <td>${data.contact}</td>
            <td>${data.address}</td>
          </tr>`;
      });
    });
}

document.getElementById("search").addEventListener("keypress", (event) => {
  filter(event.target.value);
});

document.getElementById("search").addEventListener("keydown", (event) => {
  console.log(event.target.value);
  if (event.target.value !== "") {
    filter(event.target.value);
  } else {
    populateTable();
  }
});

document.getElementById("search").addEventListener("keyup", (event) => {
  console.log(event.target.value);
  filter(event.target.value);
});
