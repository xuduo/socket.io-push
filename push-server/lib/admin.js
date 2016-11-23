module.exports = function (httpServer, config) {
    return new Admin(httpServer, config);
}

class Admin {

    constructor(httpServer, config) {
        console.log(`start admin on port  ${config.port}`);
        this.admin = require('./admin/adminServer')(httpServer, config);
    }

    close() {
        this.admin.close();
    }
}