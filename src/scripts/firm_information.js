const path = require("path");
const fs = require("fs");
const file_manager = require(path.join(__dirname, "../../scripts/file_manager.js"));

const DEFAULT_LOGO_PATH = path.join(__dirname, "../images/logo.png");

function getDefaultLogoSrc() {
  try {
    const buf = fs.readFileSync(DEFAULT_LOGO_PATH);
    return `data:image/png;base64,${buf.toString('base64')}`;
  } catch (_) {
    return '';
  }
}

function fileToDataUri(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result || '');
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

function load() {
  file_manager.loadFile(path.join(__dirname, '../../db/.firm.json'))
      .then(res => {
        const firm = res && Array.isArray(res) && res.length !== 0 ? res[0] : {};
        if (firm.name != null) document.getElementById('firm-name').value = firm.name;
        if (firm.contact != null) document.getElementById('contact').value = firm.contact;
        if (firm.email != null) document.getElementById('email').value = firm.email;
        if (firm.address != null) document.getElementById('address').value = firm.address;

        let logoSrc = '';
        if (firm.logo && firm.logo.startsWith('data:')) {
          logoSrc = firm.logo;
        } else if (firm.logo && typeof firm.logo === 'string') {
          try {
            const buf = fs.readFileSync(firm.logo);
            const ext = path.extname(firm.logo).toLowerCase();
            const mime = ext === '.png' ? 'image/png'
              : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg'
              : ext === '.gif' ? 'image/gif'
              : ext === '.webp' ? 'image/webp'
              : ext === '.bmp' ? 'image/bmp'
              : 'image/png';
            logoSrc = `data:${mime};base64,${buf.toString('base64')}`;
          } catch (_) {
            logoSrc = getDefaultLogoSrc();
          }
        } else {
          logoSrc = getDefaultLogoSrc();
        }
        document.getElementById('logo').src = logoSrc;
        document.getElementById('logo').style.display = '';
      })
}

$(document).ready(() => {
  load();
})

document.getElementById('form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const name = document.getElementById('firm-name').value;
  const contact = document.getElementById('contact').value;
  const email = document.getElementById('email').value;
  const address = document.getElementById('address').value;
  const fileInput = document.getElementById('file-input');

  const logo = fileInput && fileInput.files && fileInput.files[0]
    ? await fileToDataUri(fileInput.files[0])
    : '';

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