const remote = require('electron').remote
const path = require('path')
const main = remote.require(path.join(__dirname, '../../../index.js'))
const file_manager = remote.require(path.join(__dirname, '../../scripts/file_manager.js'))

function load() {
  file_manager.loadFile(path.join(__dirname, '../../db/.firm.json'))
      .then(res => {
        if(res.length!== 0)
        {
          document.getElementById('firm-name').value = res[0].name;
          document.getElementById('contact').value = res[0].contact;
          document.getElementById('email').value = res[0].email;
          document.getElementById('address').value = res[0].address;
          document.getElementById('logo').src = res[0].logo;
        }
        else
        {
          alert("An Error Occurred!")
        }
      })

}

$(document).ready(() => {
  load();
})


document.getElementById('form').addEventListener('submit', (event) => {
  event.preventDefault();
  const name = document.getElementById('firm-name').value;
  const contact = document.getElementById('contact').value;
  const email = document.getElementById('email').value;
  const address = document.getElementById('address').value;
  const logo = document.getElementById('file-input').files[0].path;
  const data = [
    {
      "name": name,
      "contact": contact,
      "email": email,
      "address": address,
      "logo": logo
    }
  ];
  file_manager.writeFile(path.join(__dirname, '../../db/.firm.json'), data)
      .then(r => {
        if(r === 'success')
        {
          alert("Saved Successfully!")
          // document.getElementById('firm-name').value = '';
          // document.getElementById('contact').value = '';
          // document.getElementById('email').value = '';
          // document.getElementById('address').value = '';
          // document.getElementById('file-input').files = [];
          load();
        }
        else
        {
          alert("An Error Occurred!")
        }
      })
})