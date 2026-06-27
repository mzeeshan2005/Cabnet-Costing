const remote = require('electron').remote
const path = require('path')
const main = remote.require(path.join(__dirname, '../../index.js'))
const file_manager = remote.require(path.join(__dirname, '../scripts/file_manager.js'))

let user = [];

function clearFields(){
  document.getElementById('client-name').value = "";
  document.getElementById('client-cnic').value = "";
  document.getElementById('client-contact').value = "";
  document.getElementById('client-email').value = "";
  document.getElementById('client-ntn').value = "";
  document.getElementById('client-city').value = "";
  document.getElementById('client-address').value = "";
  file_manager.loadFile(path.join(__dirname, '../db/.clients.json'))
      .then(res => {
        const id = document.getElementById('id')
        id.innerHTML = res.length + 1
      })
  if(user.length !== 0)
    alert("Client Removed From Memory!")
  user = [];
  document.getElementById('save').disabled = true;

}


function populateTable(){
  file_manager.loadFile(path.join(__dirname, '../db/.clients.json'))
      .then(res => {
        const id = document.getElementById('id')
        if(res.length === 0)
          id.innerHTML = res.length+1
        else
        {
          id.innerHTML = parseInt(res[res.length -1].id) + 1
        }
      })
}


$(document).ready(() => {
  populateTable();
})


function save_func(event) {
  event.preventDefault();
}

document.getElementById('confirm').addEventListener('click', (event) => {
  event.preventDefault();
  file_manager
      .loadFile(path.join(__dirname, "../db/.credentials.json"))
      .then((res) => {
        if (res[0].password === document.getElementById("pass").value) {
          file_manager.loadFile(path.join(__dirname, '../db/.clients.json'))
              .then(res => {
                const clients = res;
                user.forEach(u => {
                  clients.push(u)
                })
                  // clients.push(user);
                file_manager.writeFile(path.join(__dirname, '../db/.clients.json'), clients)
                    .then(res => {
                      if (res === 'success') {
                        alert("Saved Successfully!")
                        document.getElementById('cancel').click();
                        document.getElementById('client-name').value = "";
                        document.getElementById('client-cnic').value = "";
                        document.getElementById('client-contact').value = "";
                        document.getElementById('client-email').value = "";
                        document.getElementById('client-ntn').value = "";
                        document.getElementById('client-city').value = "";
                        document.getElementById('client-address').value = "";
                        populateTable()
                        // user = null;
                        document.getElementById('save').disabled = true;

                      }
                    })
              })
        }
      })
})
document.getElementById('form').addEventListener('submit', (event) => {
  event.preventDefault();
  const id = document.getElementById('id').innerHTML;
  const name = document.getElementById('client-name').value;
  const cnic = document.getElementById('client-cnic').value;
  const contact = document.getElementById('client-contact').value;
  const email = document.getElementById('client-email').value;
  const ntn = document.getElementById('client-ntn').value;
  const city = document.getElementById('client-city').value;
  const address = document.getElementById('client-address').value;
  user.push({
    'id': id,
    'name': name,
    'cnic': cnic,
    'contact': contact,
    'email': email,
    'ntn': ntn,
    'city': city,
    'address': address
  });
  alert("Client Added Successfully!")
  document.getElementById('save').disabled = false;
  document.getElementById('client-name').value = "";
  document.getElementById('client-cnic').value = "";
  document.getElementById('client-contact').value = "";
  document.getElementById('client-email').value = "";
  document.getElementById('client-ntn').value = "";
  document.getElementById('client-city').value = "";
  document.getElementById('client-address').value = "";
  const cid = document.getElementById('id')
  cid.innerHTML = parseInt(cid.innerHTML) + 1
})


document.getElementById('clear').addEventListener('click', (event) => {
  event.preventDefault();
  clearFields();
})

document.getElementById('cancel').addEventListener('click', (event) => {
  event.preventDefault();
  document.getElementById('pass').value = '';
})