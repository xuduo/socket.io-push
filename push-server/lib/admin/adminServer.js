module.exports = function (config) {
    return new AdminServer(config);
};
const logger = require('winston-proxy')('AdminServer');
const express = require("express");
const request = require('request');

class AdminServer {

    constructor(config) {
        this.config = config;
        this.interval = 10 * 60 * 1000;
        setTimeout(()=> {
            this.onlineStatsJob();
        }, 10000);
        setInterval(()=> {
            this.onlineStatsJob();
        }, this.interval);

        const app = express();
        app.listen(config.port);
        console.log("serving static ", __dirname);
        app.use(express.static(__dirname + '/../../static', {
            setHeaders: (res) => {
                res.set('Set-Cookie', `api_url = ${config.api_url}`);
            }
        }));
    }

    onlineStatsJob() {
        request({
            method: "post",
            url: `${this.config.api_url}/api/stats/onlineJob`,
            form: {interval: this.interval}
        }, (error, response, body) => {
            if (error) {
                logger.error("onlineStatsJob ", error, body);
            }
        });
    }

}
