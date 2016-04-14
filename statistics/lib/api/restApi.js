
var redis = require('../redis/redis.js');
var Stats = require('../../node_modules/socket.io-push/lib/stats/stats.js');
var stats = new Stats(redis.client, 123);
module.exports = function(server) {

    server.get('/getDatas', function (req, res, next) {
        var key = req.params.key;
        key = '*stats#socketConnect#totalCount*'
        redis.getData(key, function(result){
            if(!result){
                result = {};
            }
            res.send(result);
        })
        return next();
    });

    var handleStates = function(req, res, next){
        var key =  req.params.key;
        if(!key){
            res.send({code:'error', msg:'key is null'});
            return next();
        }
        stats.find(key, function(result){
            if(!result){
                result = {};
            }
            res.send(result);
            return next();
        })
    }

    var handleStatsBase = function (req, res, next) {
        stats.getSessionCount(function (count) {
            res.send(count);
        });
        return next();
    };

    var handleChartStats = function (req, res, next) {
        var key = req.params.key;
        stats.find(key, function (result) {
            res.send(result);
        });
        return next();
    };

    var handleQueryDataKeys = function (req, res, next) {
        stats.getQueryDataKeys(function (result) {
            res.send({"result": result});
        });
        return next();
    }

    server.get('api/state/getQueryDataKeys', handleQueryDataKeys);
    server.get('/api/stats/base', handleStatsBase);
    server.get('/api/stats/chart', handleChartStats);
    server.get('/api/getStatesData', handleStates);
}