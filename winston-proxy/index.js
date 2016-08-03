const winston = require('winston');
const rotatefile = require('winston-daily-rotate-file');
const fs = require('fs');

function createLogger(opts) {
    let level = opts.level;
    let dir = opts.dir;
    fs.access(dir, err => {
        if (err) {
            fs.mkdirSync(dir);
        }
    });
    let transports = [];
    let fileOpt = {
        name: 'file',
        json: false,
        level: level,
        showLevel: false,
        datePattern: 'yyyy-MM-dd.log',
        filename: dir + '/' + level + '_',
        timestamp: timestamp,
        formatter: formatter
    };
    transports.push(new rotatefile(fileOpt));
    fileOpt.name = 'error';
    fileOpt.level = 'error';
    fileOpt.filename = dir + '/error_';
    transports.push(new rotatefile(fileOpt));
    if (opts.foreground) {
        let consoleOpt = {
            name: 'console',
            json: false,
            level: 'debug',
            showLevel: false,
            timestamp: timestamp,
            formatter: formatter,
            colorize: 'all',
            align: true
        };
        transports.push(new winston.transports.Console(consoleOpt));
    }
    return new winston.Logger({
        transports: transports
    });

    function timestamp() {
        return new Date().toLocaleString();
    }

    function formatter(args) {
        return args.timestamp() + " work:" + workId + " "
            + args.level.substring(0, 1).toUpperCase() + "/"
            + (undefined !== args.message ? args.message : '');
    }
}

let logger;
let workId = '01';

function LogProxy(module) {
    this.module = module;
    this.logger = logger;
}

['debug', 'info', 'error'].forEach(function (command) {
    LogProxy.prototype[command] = function (key, arg, callback) {
        if (this.logger) {
            arguments[0] = this.module + ' ' + arguments[0];
            const mainArguments = Array.prototype.slice.call(arguments);
            mainArguments.push({}); //this is a trick of winston
            this.logger[command].apply(this, mainArguments);
        }
    }
});

deleteOutdatedLog = function (dir, days = 7) {
    const msPerDay = 24 * 60 * 60 * 1000;
    fs.readdir(dir, (err, files) => {
        if (err) {
            return;
        }
        let now = new Date();
        files.forEach((filename) => {
            let stat = fs.statSync(dir + '/' + filename);
            let time_diff = now - stat.mtime;
            if (time_diff > days * msPerDay) {
                fs.unlinkSync(dir + '/' + filename);
            }
        });
    });
};

function init(opts) {
    opts = opts || {};
    opts.dir = opts.dir || 'log';
    opts.level = opts.debug ? 'debug' : 'info';
    logger = createLogger(opts);
    workId = opts.workId || 1;
    workId = workId < 10 ? '0' + workId : workId;
    const msPerDel = 24 * 60 * 60 * 1000;
    if (workId == 1) {
        deleteOutdatedLog(opts.dir);
        setInterval(() => {
            deleteOutdatedLog(opts.dir);
        }, msPerDel);
    }
}

const Logger = function (optsOrLabel) {
    if (typeof optsOrLabel == 'object') {
        if (logger) {
            throw Error("can't init twice");
        }
        init(optsOrLabel);
    } else if (typeof optsOrLabel == 'string') {
        if (!logger) {
            init();
        }
        return new LogProxy(optsOrLabel);
    }
};

module.exports = Logger;
