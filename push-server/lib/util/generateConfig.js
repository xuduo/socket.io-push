const fs = require('fs');
const ncp = require('ncp');

fs.createReadStream(__dirname + '/../../config-proxy.js').pipe(fs.createWriteStream('config-proxy.js'));
fs.createReadStream(__dirname + '/../../config-api.js').pipe(fs.createWriteStream('config-api.js'));
fs.createReadStream(__dirname + '/../../config-admin.js').pipe(fs.createWriteStream('config-admin.js'));
fs.createReadStream(__dirname + '/../../config-log.js').pipe(fs.createWriteStream('config-log.js'));

ncp(__dirname + '/../../cert', "./cert", function (err) {
    if (err) {
        return console.error(err);
    }
    console.log('done!');
});