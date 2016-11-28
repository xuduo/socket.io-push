module.exports = function (config) {
    return new Admin(config);
}

class Admin {

    constructor(config) {
        console.log(`start admin on port  ${config.port} #${process.pid}`);
        this.admin = require('./admin/adminServer')(config);
    }

    close() {
        this.admin.close();
    }
}