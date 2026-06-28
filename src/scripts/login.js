const { ipcRenderer } = require("electron");
const path = require("path");
const file_manager = require(path.join(__dirname, "../scripts/file_manager.js"));
const login = document.getElementById("login-btn");

login.addEventListener("click", (e) => {
  e.preventDefault();
  const password = document.getElementById("login-password").value;
  file_manager
    .loadFile(path.join(__dirname, "../db/.credentials.json"))
    .then((res) => {
      if (res[0].password.toString() === password) {
        ipcRenderer.send("window:open", "index.html");
      } else {
        $(".toast").toast({
          animation: false,
          delay: 2000,
        });
        $(".toast").toast("show");
      }
    })
    .catch((err) => {
      alert(err && err.message ? err.message : String(err));
    });

})
