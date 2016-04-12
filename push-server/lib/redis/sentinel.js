'use strict';
module.exports = Sentinel;

var redis = require('redis');
var Promise = require('bluebird');
var util = require('util');
var events = require("events");
var logger = require('../log/index.js')('Sentinel');
var _ipMap = [];

function Sentinel(sentinelAddrs, masterNames, ipMap) {
    events.EventEmitter.call(this);
    this.sentinelList = sentinelAddrs;
    this.masterNames = masterNames;
    _ipMap = ipMap;
    this.masters = [];
    this.curSentinel = 0;
    this.completeEmit = false;
    var _this = this;

    this.monitorInitCallback = function () {
        logger.debug("[sentinel/%s] ready", _logAddr(_this.getSentinelAddr()));
        _this.monitorInitCallback = null;
        var addr = _this.getSentinelAddr();

        masterNames.forEach(function (masterName, i) {
            var session = new SentinelQuery(addr);
            var index = i;
            session.queryMastrAndSlave(masterName).then(function (data) {
                var masterConKeeper = new ConnectionKeeper(_this,masterName, data.master,'master');
                var slaveConKeeper = new ConnectionKeeper(_this,masterName, data.slave,'slave');
                _this.masters[index] = {masterName:masterName,master:masterConKeeper,slave:slaveConKeeper};
                masterConKeeper.on('connect',_this._on_connect.bind(_this));
                masterConKeeper.on('ready',_this._on_ready.bind(_this));
                slaveConKeeper.on('connect',_this._on_connect.bind(_this));
                slaveConKeeper.on('ready',_this._on_ready.bind(_this));
            }).catch(function (err) {
                logger.error("[sentinel/%s][%s] %s", _logAddr(addr), masterName, err);
                _this.emit("error",err);
            });
        });
    }
    this._startMonitor();
}
util.inherits(Sentinel, events.EventEmitter);

Sentinel.prototype._on_connect =function(conKeeper){
    var sentinelAddr = this.getSentinelAddr();
    logger.debug("[%s][%s][%s][%s] on_connect",_logAddr(sentinelAddr), conKeeper.masterName, conKeeper.clientType, conKeeper._logThisAddr());

    var _this = this;
    this.masters.forEach(function (m) {
        if (m.masterName == conKeeper.masterName){
            _this.emit("create_client",conKeeper.masterName,conKeeper.clientType,conKeeper.redisClient);
        }
        return;
    });
}
Sentinel.prototype._on_ready =function(conKeeper){
    var sentinelAddr = this.getSentinelAddr();
    logger.debug("[%s][%s][%s][%s] on_ready",_logAddr(sentinelAddr), conKeeper.masterName, conKeeper.clientType, conKeeper._logThisAddr());
    // check sentinel init complete
    if(!this.completeEmit){
        var initCnt = 0;
        this.masters.forEach(function(m){
            if (m.master && m.master.ready() &&  m.slave && m.slave.ready()){
                initCnt += 1;
            }
        });
        if (initCnt == this.masters.length){
            this.completeEmit = true;
            logger.debug("[sentinel/%s] init complete",_logAddr(sentinelAddr));
            this.emit("complete", this.getSentinelAddr());
        }
    }
}

Sentinel.prototype._switchSentinel =function(){
    this.curSentinel += 1;
    if (this.curSentinel >= this.sentinelList.length){
        this.curSentinel = 0;
    }
}

Sentinel.prototype.getSentinelAddr = function(){
    return this.sentinelList[this.curSentinel];
}

Sentinel.prototype._startMonitor = function (){
    var _this = this;
    var sentinelAddr = _this.getSentinelAddr();
    var monitor = new SentinelMonitor(sentinelAddr);
    this.monitor = monitor;
    monitor.on('connect', function(){
            logger.info("[sentinel/%s]: monitor start", _logAddr(sentinelAddr));
            if(_this.monitorInitCallback){
                _this.monitorInitCallback.bind(_this).apply();
            }
        });
    monitor.on('switch-master',function(masterName,newMaster){
        logger.info("[sentinel/%s][%s] switcs-master to [%s]",_logAddr(sentinelAddr),masterName,_logAddr(newMaster));
        _this._switchMaster(masterName,newMaster);
    });
    monitor.on('close', function(){
        logger.error("[sentinel/%s]: monitor ... connection close", _logAddr(sentinelAddr));
        monitor.close();
        _this._switchSentinel();
        setTimeout(_this._startMonitor.bind(_this),1000);
    });
}

Sentinel.prototype._switchMaster = function(masterName,newMaster){
    var _this = this;
    var sentinelAddr = _this.getSentinelAddr();
    this.masters.forEach(function (m) {
        if (masterName === m.masterName){
            logger.info("[sentinel/%s][%s]: switch master to %j", _logAddr(sentinelAddr), masterName, _logAddr(newMaster));
            m.master.reconnect(newMaster);
            return;
        }
    });
}

//----------------------------------------------------------------------------------------------------------------------
// ConnectionKeeper
function ConnectionKeeper(sentinel,masterName, addr,clientType){
    events.EventEmitter.call(this);
    this.sentinel = sentinel;
    this.masterName = masterName;
    this.redisAddr = addr;
    this.clientType = clientType;
    this.connect(addr);
}
util.inherits(ConnectionKeeper, events.EventEmitter);

ConnectionKeeper.prototype.connect = function(newAddr){
    if (newAddr){
        this.redisAddr = newAddr;
    }
    var addr = this.getRedisAddr();
    var client = redis.createClient({
        host: addr.host,
        port: addr.port,
        return_buffers: true,
        retry_max_delay: 5000,
        max_attempts: 0,
        connect_timeout: 300000
    });
    client.on("error", this._on_error.bind(this));
    client.on('end', this._on_end.bind(this));
    client.on('connect', this._on_connect.bind(this));
    client.on('ready', this._on_ready.bind(this));
    this.redisClient = client;
}

ConnectionKeeper.prototype.redisClient = function(){
    return this.redisClient;
}

ConnectionKeeper.prototype.ready = function(){
    return this.redisClient.ready;
}

ConnectionKeeper.prototype.isMaster = function(){
    return this.clientType === 'master';
}

ConnectionKeeper.prototype.getRedisAddr = function(){
    return this.redisAddr;
}

ConnectionKeeper.prototype._logSentinelAddr = function(){
    return _logAddr(this.sentinel.getSentinelAddr());
}
ConnectionKeeper.prototype._logThisAddr = function(){
    return _logAddr(this.redisAddr);
}

ConnectionKeeper.prototype._on_error = function(err){
    logger.error("[sentinel/%s][%s][%s][%j] %s", this._logSentinelAddr(),this.masterName, this.clientType, this._logThisAddr(), err);
}

ConnectionKeeper.prototype._on_end = function(){
    logger.info("[sentinel/%s][%s][%s][%j] connection close", this._logSentinelAddr(),this.masterName, this.clientType, this._logThisAddr());
    this.resume_waiting = true;
    var _this = this;
    this.resumeTimeout  = setTimeout(function(){
        _this.reconnect();
    }, this.isMaster() ? 120000 : 60000);
}

ConnectionKeeper.prototype._on_connect = function(){
    if(this.resumeTimeout){
        clearTimeout(this.resumeTimeout);
        this.resumeTimeout = null;
    }
    if(this.resume_waiting){
        logger.debug("[sentinel/%s][%s][%s][%s] resume",this._logSentinelAddr(), this.masterName, this.clientType, this._logThisAddr());
    }else{
        logger.debug("[sentinel/%s][%s][%s][%s] connect",this._logSentinelAddr(), this.masterName, this.clientType, this._logThisAddr());
        this.emit("connect",this);
    }
    this.resume_waiting = false;
}

ConnectionKeeper.prototype._on_ready = function(){
    this.emit('ready',this);
}

ConnectionKeeper.prototype.close =
    ConnectionKeeper.prototype.end = function(){
        if(this.resumeTimeout){
            clearTimeout(this.resumeTimeout);
            this.resumeTimeout = null;
        }
        this.redisClient.removeAllListeners("connect");
        this.redisClient.removeAllListeners("end");
        this.redisClient.removeAllListeners("ready");
        this.redisClient.end(true);
        this.redisClient.removeAllListeners("error");
    }

ConnectionKeeper.prototype.reconnect = function(newAddr){
    this.resume_waiting = false;
    this.close();
    if (newAddr){
        this.connect(newAddr);
        return ;
    }
    this._do_reconnect();
}

ConnectionKeeper.prototype._do_reconnect = function(){
    if(this.reconnecting){
        return;
    }
    var _this = this;
    this.reconnecting = true;
    if (this.clientType === 'master'){
        var sentinelAddr = this.sentinel.getSentinelAddr();
        var session = new SentinelQuery(sentinelAddr);
        session.queryMaster(this.masterName).then(function(newMaster){
            logger.info("[sentinel/%s][%s][%s][%s]: reconnect to [%s]", _this._logSentinelAddr(), _this.masterName, _this.clientType, _this._logThisAddr(), _logAddr(newMaster));
            _this.reconnecting = false;
            _this.reconnect(newMaster);
        }).catch(function(err){
            _this.reconnecting = false;
            logger.info("[sentinel/%s][%s][%s][%s]: reconnect error", _this._logSentinelAddr(), _this.masterName, _this.clientType, _this._logThisAddr(), err);
            setTimeout(function(){
                _this._do_reconnect();
            },3000);
        });
    }

    if (this.clientType === 'slave'){
        var sentinelAddr = this.sentinel.getSentinelAddr();
        var session = new SentinelQuery(sentinelAddr);
        session.querySlave(this.masterName).then(function(newSlave){
            logger.info("[sentinel/%s][%s][%s][%s]: reconnect to [%s]", _this._logSentinelAddr(), _this.masterName, _this.clientType, _this._logThisAddr(), _logAddr(newSlave));
            _this.reconnecting = false;
            _this.reconnect(newSlave);
        }).catch(function(err){
            _this.reconnecting = false;
            logger.info("[sentinel/%s][%s][%s][%s]: reconnect %s", _this._logSentinelAddr(), _this.masterName, _this.clientType, _this._logThisAddr(), err);
            setTimeout(function(){
                _this._do_reconnect();
            },3000);
        });
    }
}

//----------------------------------------------------------------------------------------------------------------------
function SentinelMonitor(addr) {
    events.EventEmitter.call(this);
    var client = redis.createClient({
        host: addr.host,
        port: addr.port,
        max_attempts: 1,
        connect_timeout: 10000
    });
    var errMsg = null;
    client.on("error",function(err){
        logger.error("[sentinel monitor %s] %s",_logAddr(addr),err);
    });
    client.once("connect",this._on_connect.bind(this));
    client.once('end',this._on_end.bind(this));
    client.on("message",this._on_message.bind(this));
    client.subscribe("+switch-master");
    this.sentinelAddr = addr;
    this.redisClient = client;
}
util.inherits(SentinelMonitor, events.EventEmitter);

SentinelMonitor.prototype._on_connect = function(){
    this.emit("connect");
}
SentinelMonitor.prototype._on_end = function(){
    this.emit("close");
}
SentinelMonitor.prototype._on_message = function(channel, message){
    if (channel == "+switch-master") {
        var lines = message.split(" ");
        var name = lines[0];
        var master = {host:lines[3],port:parseInt(lines[4])};
        logger.info("[sentinel/%s] +switch-master [%s][%s] \n", _logAddr(this.sentinelAddr), name, _logAddr(master));
        this.emit('switch-master',name,master)
    };
}

SentinelMonitor.prototype.close =
SentinelMonitor.prototype.end = function(){
    this.redisClient.removeAllListeners("connect");
    this.redisClient.removeAllListeners("end");
    this.redisClient.removeAllListeners("message");
    this.redisClient.end(true);
}

//----------------------------------------------------------------------------------------------------------------------
function SentinelQuery(sentinelAddr){
    this.sentinelAddr = sentinelAddr;
}

SentinelQuery.prototype.queryMastrAndSlave = function(masterName){
    var _this = this;
    return new Promise(function (resolve, reject) {
        var _masterAddr = null;
        _redisConnect(_this.sentinelAddr).then(function(client){
            _queryMaster(client,masterName)
                .then(function(masterAddr){
                    _masterAddr = masterAddr;
                    return _querySlave(client,masterName);
                }).then(function(slaveAddr){
                    client.quit();
                    resolve({master:_masterAddr,slave:slaveAddr});
                }).catch(function (err) {
                    client.quit();
                    reject(err);
                });
        }).catch(function(err){
            reject(err);
        })
    }.bind(_this));
}

SentinelQuery.prototype.queryMaster = function(masterName){
    var _this = this;
    return new Promise(function (resolve, reject) {
        _redisConnect(_this.sentinelAddr).then(function(client){
            _queryMaster(client,masterName).then(function(masterAddr){
                client.quit();
                resolve(masterAddr);
            }).catch(function (err) {
                client.quit();
                reject(err);
            });
        }).catch(function(err){
            reject(err);
        })
    }.bind(_this));
}

SentinelQuery.prototype.querySlave = function(masterName){
    var _this = this;
    return new Promise(function (resolve, reject) {
        _redisConnect(_this.sentinelAddr).then(function(client){
            _querySlave(client,masterName).then(function(slaveAddr){
                client.quit();
                resolve(slaveAddr);
            }).catch(function (err) {
                client.quit();
                reject(err);
            });
        }).catch(function(err){
            reject(err);
        })
    }.bind(_this));
}

function _redisConnect(addr){
    return new Promise(function (resolve, reject) {
        var client = redis.createClient({
            host: addr.host,
            port: addr.port,
            max_attempts: 1,
            connect_timeout: 10000
        });
        var errMsg = null;
        client.on("error", function (err) {
            logger.error("[sentinel/%s] connect fail  %s", _logAddr(addr), err);
            errMsg = err;
        });
        client.once('end',function(){
            reject(errMsg ? errMsg : "connect fail");
        });
        client.once("connect", function() {
            resolve(client);
        })
    })
}

function _queryMaster(client, masterName){
    return new Promise(function (resolve, reject) {
        client.send_command("SENTINEL", ['get-master-addr-by-name', masterName], function (err, replies) {
            if (Array.isArray(replies)) {
                logger.debug("get-master-addr-by-name [%s]%j", masterName, replies);
                var a = _getIp(replies[0]);
                var p = parseInt(replies[1]);
                resolve({host:a,port:p})
            }else{
                logger.error("get-master-addr-by-name %s %s",masterName, err);
                reject(err)
            }
        });
    });
}

function _querySlave(client, masterName){
    return new Promise(function (resolve, reject) {
        client.send_command("SENTINEL", ['slaves', masterName], function (err, result) {
            if (Array.isArray(result)){
                var availableSlaves = [];
                for (var i = 0; i < result.length; ++i) {
                    var slave = _packObject(result[i]);
                    if (slave.flags && !slave.flags.match(/(disconnected|s_down|o_down)/)) {
                        availableSlaves.push(slave);
                    }
                }
                if (availableSlaves.length > 0){
                    var n=parseInt(Math.random() * availableSlaves.length);
                    var selectedSlave = availableSlaves[n];
                    var a = _getIp(selectedSlave.ip);
                    var p = parseInt(selectedSlave.port);
                    resolve({host:a,port:p});
                }else{
                    logger.error("[%s] there is no availbale slaves", masterName);
                    reject(new Error("no available slaves"));
                }
            }else{
                logger.error("sentinel slaves %s %s",masterName,err);
                reject(err);
            }
        });
    });
}

function _packObject(array) {
    var result = {};
    var length = array.length;
    for (var i = 1; i < length; i += 2) {
        result[array[i - 1]] = array[i];
    }
    return result;
};

function _getIp(fromSentinel) {
    if (_ipMap && _ipMap[fromSentinel]) {
        logger.info('getIp %s -> %s', fromSentinel, _ipMap[fromSentinel]);
        return _ipMap[fromSentinel];
    } else {
        return fromSentinel;
    }
}

function _logAddr(addr){
    if(typeof addr === "object"){
        return addr.host + ":" + addr.port;
    }
    return addr;
}