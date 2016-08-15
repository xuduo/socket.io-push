module.exports = function (config) {
    return new AdminServer(config);
}
const express = require("express");

class AdminServer {

    constructor(config) {
        const app = express();
        app.listen(config.port);
        console.log("serving static ", __dirname);
        app.use(express.static(__dirname + '/../../static', {
            setHeaders: (res) => {
                res.set('Set-Cookie', `api_url = ${config.api_url}`);
            }
        }));
    }

}
