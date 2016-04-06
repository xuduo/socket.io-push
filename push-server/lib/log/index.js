var winston = require('winston-levelonly');
var fs = require('fs');

var dir = 'log';
var workerId = 1;
var foreground, debugLevel, verboseLevel, infoLevel, count;
var transports = [];
var formatter = function (options) {
    return options.timestamp() + " " + 'work:' + workerId + ' ' + options.level.substring(0, 1).toUpperCase() + '/'
        + options.tag + ' ' + (undefined !== options.message ? options.message : '');
}
var logger;

function setArgs(args) {
    if (args.workId) {
        workerId = args.workId;
    }
    if (args.dir) {
        dir = args.dir;
    }
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
    foreground = args.foreground;
    debugLevel = args.debug;
    verboseLevel = args.verbose;
    infoLevel = args.info;
    count = args.count;

    var level;

    if (args.debug) {
        level = 'debug';
    } else if (args.verbose) {
        level = 'verbose';
    } else {
        level = 'info';
    }
    if (args.foreground) {
        transports.push(new (winston.transports.Console)({
            name: 'console',
            json: false,
            level: level,
            datePattern: 'error_yyyy-MM-dd.log',
            filename: dir + "/" + "log",
            timestamp: function () {
                return new Date().toLocaleString();
            },
            tag: 'test',
            formatter: formatter
        }));
    }

    logger = new (winston.Logger)({
        transports: transports
    });

}

function formatWorkId(workId) {
    if (count >= 10) {
        if (workId < 10) {
            workId = '0' + workId;
        }
    }
    return workId;
}

var LogProxy = function (logger, tag) {
    this.logger = logger;
    this.tag = tag;
};

var meta = {};

['debug', 'verbose', 'info', 'error'].forEach(function (command) {

    LogProxy.prototype[command] = function (key, arg, callback) {
        arguments[0] = this.tag + ' ' + arguments[0];
        var mainArguments = Array.prototype.slice.call(arguments);
        mainArguments.push(meta);
        this.logger[command].apply(this, mainArguments);
    }

});

var Logger = function Logger(tag, args) {
    if (args) {
        setArgs(args);
        return;
    }

    var fileTag = tag;
    var opts = {
        name: 'error',
        json: false,
        level: 'error',
        datePattern: 'yyyy-MM-dd_error.log',
        filename: dir + "/" + "log",
        timestamp: function () {
            return new Date().toLocaleString();
        },
        formatter: function (options) {
            return options.timestamp() + " " + 'work:' + formatWorkId(workerId) + ' ' + options.level.substring(0, 1).toUpperCase() + '/'
                + fileTag + ' ' + (undefined !== options.message ? options.message : '');
        }
    };

    return new LogProxy(logger, tag);

    //logger.add(winston.transports.DailyRotateFile, opts);
    //
    //opts.name = 'info';
    //opts.level = 'info';
    //opts.filename = dir + "/" + "log";
    //opts.datePattern = 'yyyy-MM-dd_info.log';
    //logger.add(winston.transports.DailyRotateFile, opts);
    //
    //opts.name = 'console';
    //opts.level = 'debug';
    //opts.levelOnly = false;
    //delete opts.filename;
    //delete opts.datePattern;
    //
    //if (foreground) {
    //    if (debugLevel) {
    //        opts.level = 'debug';
    //    } else if (verboseLevel) {
    //        opts.level = 'verbose';
    //    } else if (infoLevel) {
    //        opts.level = 'info';
    //    }
    //    logger.add(winston.transports.Console, opts);
    //}
    return logger;
};

module.exports = Logger;