const remote = require('electron').remote
const path = require('path')
const main = remote.require(path.join(__dirname, '../../../index.js'))
const file_manager = remote.require(path.join(__dirname, '../../scripts/file_manager.js'))

document.getElementById('form').addEventListener('submit', (event) => {
  event.preventDefault();
  const password = document.getElementById('current-password').value;
  const new_password = document.getElementById('new-password').value;
  file_manager.loadFile(path.join(__dirname, '../../db/.credentials.json'))
      .then(res => {
        if(res[0].password.toString() === password)
        {
          file_manager.writeFile(path.join(__dirname, '../../db/.credentials.json'), [{"password": new_password}, {"pass": res[1].pass}])
              .then(r => {
                if(r === 'success')
                {
                  alert("Saved Successfully!")
                  document.getElementById('current-password').value = '';
                  document.getElementById('new-password').value = '';
                }
                else
                {
                  alert("Error Occurred!")
                }
              })
        }
        else
        {
          alert("Password Not Matched!")
        }
      })

})
