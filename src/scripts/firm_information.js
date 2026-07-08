const path = require("path");
const { pathToFileURL } = require("url");
const file_manager = require(path.join(__dirname, "../../scripts/file_manager.js"));

const LOGO_PATH = path.join(__dirname, "../../images/logo.png");

function load() {
  file_manager.loadFile(path.join(__dirname, '../../db/.firm.json'))
      .then(res => {
        const firm = res && Array.isArray(res) && res.length !== 0 ? res[0] : {};
        if (firm.name != null) document.getElementById('firm-name').value = firm.name;
        if (firm.contact != null) document.getElementById('contact').value = firm.contact;
        if (firm.email != null) document.getElementById('email').value = firm.email;
        if (firm.address != null) document.getElementById('address').value = firm.address;
        document.getElementById('logo').src = firm.logo ? pathToFileURL(firm.logo).href : pathToFileURL(LOGO_PATH).href;
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
  const fileInput = document.getElementById('file-input');
  const logo = fileInput && fileInput.files && fileInput.files[0] ? fileInput.files[0].path : LOGO_PATH;
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
          load();
        }
        else
        {
          alert("An Error Occurred!")
        }
      })
})