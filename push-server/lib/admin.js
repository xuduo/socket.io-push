'use strict';

class Admin {

    constructor(config) {
        console.log(`start admin on port  ${config.port}`);
        this.admin = require('./admin/adminServer')(config);
    }

    close() {
        this.admin.close();
    }
}

module.exports = Admin;