module.exports = function (config) {
    return new AdminServer(config);
};
const logger = require('winston-proxy')('AdminServer');
const express = require("express");
const request = require('request');
const fs = require('fs');

class AdminServer {

    constructor(config) {
        this.config = config;
        this.interval = 10 * 60 * 1000;
        setInterval(()=> {
            this.onlineStatsJob();
        }, this.interval);
        const app = express();
        let options = {
            key: fs.readFileSync(config.https_key),
            cert: fs.readFileSync(config.https_cert)
        };
        require('spdy').createServer(options, app).listen(config.https_port, (error) => {
            if (error) {
                console.error(error)
                return process.exit(1)
            } else {
                console.log('Listening on port: ' + config.https_port + '.')
            }
        });

        console.log("serving static ", __dirname);
        let proxy = {};
        try {
            proxy = require(process.cwd() + "/config-proxy");
        } catch (ex) {
            logger.warn('config-proxy exception: ' + ex);
        }
        let api = {};
        try {
            api = require(process.cwd() + "/config-api");
        } catch (ex) {
            logger.warn('config-proxy exception: ' + ex);
        }
        app.use(express.static(__dirname + '/../../static', {
            setHeaders: (res) => {
                res.set('Set-Cookie', [`api_url = ${config.api_url}`, `proxy_port = ${proxy.https_port}`, `api_port = ${api.https_port}`]);
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
