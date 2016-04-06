var winston = require('winston-levelonly');
var fs = require('fs');

var dir = 'log';
var workerId = 1;
var foreground, debugLevel, verboseLevel, infoLevel, count;

function setArgs (args) {
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
}

function formatWorkId(workId){
    if(count >= 10){
        if(workId < 10){
            workId = '0' + workId;
        }
    }
    return workId;
}

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
            return options.timestamp() + " " + 'work:' + formatWorkId(workerId) + ' ' + options.level.substring(0,1).toUpperCase()  + '/'
                + fileTag + ' ' + (undefined !== options.message ? options.message : '');
        }
    };
    var logger = new (winston.Logger)({
        transports: []
    });

    logger.add(winston.transports.DailyRotateFile, opts);

    opts.name = 'info';
    opts.level = 'info';
    opts.filename = dir + "/" + "log";
    opts.datePattern = 'yyyy-MM-dd_info.log';
    logger.add(winston.transports.DailyRotateFile, opts);

    opts.name = 'console';
    opts.level = 'debug';
    opts.levelOnly = false;
    delete opts.filename;
    delete opts.datePattern;

    if (foreground) {
        if (debugLevel) {
            opts.level = 'debug';
        } else if (verboseLevel) {
            opts.level = 'verbose';
        } else if(infoLevel) {
            opts.level = 'info';
        }
        logger.add(winston.transports.Console, opts);
    }
    return logger;
};

module.exports = Logger;