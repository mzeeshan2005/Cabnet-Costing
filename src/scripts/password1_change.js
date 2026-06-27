const remote = require('electron').remote
const path = require('path')
const main = remote.require(path.join(__dirname, '../../../index.js'))
const file_manager = remote.require(path.join(__dirname, '../../scripts/file_manager.js'))

document.getElementById('form-1').addEventListener('submit', (event) => {
  event.preventDefault();
  const password = document.getElementById('current-password-1').value;
  const new_password = document.getElementById('new-password-1').value;
  file_manager.loadFile(path.join(__dirname, '../../db/.credentials.json'))
      .then(res => {
        if(res[1].pass.toString() === password)
        {
          file_manager.writeFile(path.join(__dirname, '../../db/.credentials.json'), [{"password": res[0].password}, {"pass": new_password}])
              .then(r => {
                if(r === 'success')
                {
                  alert("Saved Successfully!")
                  document.getElementById('current-password-1').value = '';
                  document.getElementById('new-password-1').value = '';
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
