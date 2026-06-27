const path = require("path");
const fs = require('fs');

exports.loadFile = async (file) => {
  return await new Promise((resolve, reject) => {
    fs.readFile(file, { encoding: 'utf8' }, (err, data) => {
      if (err) {
        return reject(err);
      }
      return resolve(JSON.parse(data));
    });
  });
}

exports.writeFile = async (file, data) => {
  return await new Promise((resolve, reject) => {
    fs.writeFile(file, JSON.stringify(data), (err) => {
      if (err) {
        return reject(err.message);
      }
      return resolve('success');
    });
  });
}