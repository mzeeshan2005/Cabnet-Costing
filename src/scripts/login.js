const remote = require('electron').remote
const path = require('path')
const main = remote.require(path.join(__dirname, '../../index.js'))
const file_manager = remote.require(path.join(__dirname, '../scripts/file_manager.js'))
const login = document.getElementById('login-btn')

login.addEventListener('click', (e) => {
  e.preventDefault();
  const window = remote.getCurrentWindow();
  const password = document.getElementById('login-password').value;
  file_manager.loadFile(path.join(__dirname, '../db/.credentials.json'))
  .then(res => {
    if(res[0].password.toString() === password)
    {
      main.openWindow('index.html')
      window.close();
    }
    else
    {
          $('.toast').toast({
            animation: false,
            delay: 2000
          });
          $('.toast').toast('show');

      console.log('no')
    }
  })

})
