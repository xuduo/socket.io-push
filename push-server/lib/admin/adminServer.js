module.exports = function (config) {
    return new AdminServer(config);
}
const express = require("express");

class AdminServer {

    constructor(config) {
        const app = express();
        app.listen(config.port);
        app.use(express.static('static', {
            setHeaders: (res) => {
                res.set('Set-Cookie', `api_url = ${config.api_url}`);
            }
        }));
    }

}
