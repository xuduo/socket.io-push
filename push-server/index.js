let logger = require('winston-proxy')('Index');
let cluster = require('cluster');
let net = require('net');
let fs = require('fs');
let proxy = {};
try {
  proxy = require(process.cwd() + "/config-proxy");
} catch (ex) {
  logger.warn('config-proxy exception: ' + ex);
}
proxy.instances = proxy.instances || 0;


let api = {};
try {
  api = require(process.cwd() + "/config-api");
} catch (ex) {
  logger.warn('config-api exception: ' + ex);
}
api.instances = api.instances || 0;

let apnProxy = {};
try {
  apnProxy = require(process.cwd() + "/config-apn-proxy");
} catch (ex) {
  logger.warn('config-apn-proxy exception: ' + ex);
}
apnProxy.instances = apnProxy.instances || 0;

let admin = {};
try {
  admin = require(process.cwd() + "/config-admin");
  if (admin.https_port && admin.https_cert && admin.https_key) {
    admin.instances = 1;
  }
} catch (ex) {
  logger.warn('config-admin exception: ' + ex);
}
admin.instances = admin.instances || 0;

if (cluster.isMaster) {
  let totalWorker = proxy.instances + api.instances + admin.instances + apnProxy.instances;
  require('fs').writeFile(process.cwd() + '/num_processes', totalWorker, (err) => {
    if (err) {
      logger.error("fail to write num of processes");
    }
  });
  logger.info('total worker: ' + totalWorker);

  let ip;
  let spawn = (processType, count) => {
    if (count > 0) {
      const env = {
        processType,
        ip
      };
      for (let i = 0; i < count; i++) {
        const worker = cluster.fork(env);
        worker.on('exit', (code, signal) => {
          logger.error('worker(%s) exit, code:%s, signal:%s', worker.id, code, signal);
          setTimeout(() => {
            logger.info('respawn worker');
            spawn(processType, 1);
          }, 5000);
        });
      }
    }
  }

  ip = require('./lib/util/ip')();
  logger.info('master get ip', ip);
  spawn('proxy', proxy.instances);
  spawn('api', api.instances);
  spawn('admin', admin.instances);
  spawn('apnProxy', apnProxy.instances);

} else {
  let createServers = (config, httpsType) => {
    let httpServer;
    if (config.http_port) {
      httpServer = require('http').createServer();
      if (config.host) {
        httpServer.listen(config.http_port, config.host);
      } else {
        httpServer.listen(config.http_port);
      }
    }
    let httpsServer;
    if (config.https_port && config.https_key && config.https_cert) {
      try {
        let https_key = fs.readFileSync(config.https_key);
        let https_cert = fs.readFileSync(config.https_cert);
        httpsServer = require(httpsType).createServer({
          key: https_key,
          cert: https_cert
        });
        if (config.host) {
          httpsServer.listen(config.https_port, config.host);
        } else {
          httpsServer.listen(config.https_port);
        }
      } catch (e) {
        logger.error('error happened when start https ', config, e);
        process.exit(-1);
      }
    }
    return {
      httpServer,
      httpsServer
    };
  };
  if (process.env.processType) {
    let socketTimeout = 0;
    if (process.env.processType == 'proxy') {
      let IoServer = require('socket.io');
      socketTimeout = proxy.pingTimeout + proxy.pingInterval + 10 * 1000;
      let io = new IoServer();
      const opts = {
        pingTimeout: proxy.pingTimeout,
        pingInterval: proxy.pingInterval,
        transports: ['websocket', 'polling']
      }
      const servers = createServers(proxy, 'https');
      if (servers.httpServer) {
        io.attach(servers.httpServer, opts);
      }
      if (servers.httpsServer) {
        io.attach(servers.httpsServer, opts);
      }
      require('./lib/proxy')(io, proxy);
    } else if (process.env.processType == 'api') {
      const servers = createServers(api, 'spdy');
      require('./lib/api')(servers.httpServer, servers.httpsServer, api);
    } else if (process.env.processType == 'apnProxy') {
      const servers = createServers(apnProxy, 'spdy');
      require('./lib/apnProxy')(servers.httpServer, servers.httpsServer, apnProxy);
    } else if (process.env.processType == 'admin') {
      require('./lib/admin')(admin);
    }
  }
}
