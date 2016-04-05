var loggerSingleton;

var winston = require('winston-levelonly');
var fs = require('fs');

var Logger = function Logger(index, dir) {
    console.log("new singleton");
    var dir =  'log';
    var workerId =  1;
    var foreground, debugLevel, verboseLevel;
    this.getLogger = function (tag, args) {
        var fileTag = tag;
        if(args) {
            setArgs(args);
            return;
        }
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
                return options.timestamp() + " " + options.level.toUpperCase() + ' ' + ' ' + 'instance:' + workerId + ' '
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

        var consoleOpts = {
            level: 'info',
            levelOnly: false,//if true, will only log the specified level, if false will log from the specified level and above
            timestamp: function () {
                return new Date().toLocaleString();
            },
            formatter: function (options) {
                return options.timestamp() + " " + options.level.toUpperCase() + ' ' + ' ' + 'instance:' + workerId + ' '
                    + fileTag + ' ' + (undefined !== options.message ? options.message : '');
            }
        };

        if(foreground){
            if(debugLevel){
                consoleOpts.level = 'debug';
            }else if(verboseLevel){
                consoleOpts.level = 'verbose';
            }
            logger.add(winston.transports.Console, consoleOpts);
        }
        return logger;
    };

    var setArgs = function (args) {
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
    }
}

Logger.getInstance = function () {
    if (!loggerSingleton) {
        loggerSingleton = new Logger();
    }
    return loggerSingleton;
};

module.exports = Logger.getInstance().getLogger;