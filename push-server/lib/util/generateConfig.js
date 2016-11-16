var fs = require('fs');

fs.createReadStream(__dirname + '/../../config-proxy.js').pipe(fs.createWriteStream('config-proxy.js'));
fs.createReadStream(__dirname + '/../../config-api.js').pipe(fs.createWriteStream('config-api.js'));
fs.createReadStream(__dirname + '/../../config-admin.js').pipe(fs.createWriteStream('config-admin.js'));