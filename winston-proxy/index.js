const winston = require('winston');
const rotatefile = require('winston-daily-rotate-file');
const fs = require('fs');
const path = require('path');
const uuid = require('node-uuid');

function readableFormatter(args) {
    return new Date().toLocaleString() + " work:" + workId + " "
        + args.level.substring(0, 1).toUpperCase() + "/"
        + (undefined !== args.message ? args.message : '');
}

function createFileRotateTransport(dir, level, formatter = readableFormatter) {
    fs.mkdir(dir, err => {
        if (err && err.code != 'EEXIST') {
            console.log('mkdir dir error, %s', dir);
        }
    });
    let opt = {
        name: 'rotate-file-' + level,
        json: false,
        level: level,
        showLevel: false,
        datePattern: 'yyyy-MM-dd.log',
        filename: dir + '/' + level + '_',
        formatter: formatter
    };
    return new rotatefile(opt);
}

function createFileTransport(file, level, formatter = readableFormatter) {
    fs.mkdir(path.dirname(file), err => {
        if (err && err.code != 'EEXIST') {
            console.log('mkdir dir error, %s', path.dirname(file));
        }
    });
    let opt = {
        name: 'file-' + level,
        json: false,
        level: level,
        showLevel: false,
        filename: file,
        formatter: formatter
    };
    return new winston.transports.File(opt);
}
function createConsoleTransport(level, formatter = readableFormatter) {
    let opt = {
        name: 'console',
        json: false,
        level: level,
        showLevel: false,
        formatter: formatter,
        colorize: 'all',
        align: true
    };
    return new winston.transports.Console(opt);
}

function createLogger(opts) {
    let transports = [];
    if (opts.rotate_dir) {
        transports.push(createFileRotateTransport(opts.rotate_dir, opts.level, opts.formatter));
        transports.push(createFileRotateTransport(opts.rotate_dir, "error", opts.formatter));
    }
    if (opts.filename) {
        transports.push(createFileTransport(opts.filename, opts.level, opts.formatter))
    }
    if (opts.console) {
        transports.push(createConsoleTransport('debug'));
    }
    return new winston.Logger({
        transports: transports
    });
}

let logger;
let workId;

function LogProxy(moduleName) {
    this.module = moduleName;
    this.logger = logger;
}

['debug', 'info', 'warn', 'error'].forEach(function (command) {
    LogProxy.prototype[command] = function (key, arg, callback) {
        if (this.logger) {
            const mainArguments = Array.prototype.slice.call(arguments);
            mainArguments.push({id: uuid.v4(), module: this.module});
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

function init() {
    let opts = {};
    try {
        opts = require(process.cwd() + '/config-log');
    }
    catch (ex) {
        console.log(ex);
    }

    opts.level = opts.level ? 'debug' : 'info';
    logger = createLogger(opts);
    try {
        workId = require('cluster').workder.id;
    }
    catch (ex) {
        workId = 1;
    }
    workId = workId < 10 ? '0' + workId : workId;
    const msPerDel = 24 * 60 * 60 * 1000;
    if (workId == 1 && opts.rotate_dir) {
        deleteOutdatedLog(opts.rotate_dir);
        setInterval(() => {
            deleteOutdatedLog(opts.rotate_dir);
        }, msPerDel);
    }
}

const Logger = function (moduleName) {
    if (typeof moduleName == 'string') {
        if (!logger) {
            init();
        }
        return new LogProxy(moduleName);
    }
};

module.exports = Logger;
