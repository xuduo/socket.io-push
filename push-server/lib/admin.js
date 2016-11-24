module.exports = function (httpServer, config) {
    return new Admin(httpServer, config);
}

class Admin {

    constructor(httpServer, config) {
        console.log(`start admin on port  ${config.port} #${process.pid}`);
        this.admin = require('./admin/adminServer')(httpServer, config);
    }

    close() {
        this.admin.close();
    }
}