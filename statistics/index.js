var restify = require('restify');
var config = require('./config.js');

var server = restify.createServer({
   name: 'statistics_api',
   version: '1.0.0'
});

server.on('uncaughtException', function (req, res, route, err) {
    try {
        res.statusCode = 500;
        res.send({code: "error", message: "exception " + err.stack});
    } catch (err) {
    }
});

server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
server.use(restify.bodyParser());

var staticConfig = restify.serveStatic({
    directory: __dirname + '/node_modules/socket.io-push/static',
    default: 'index.html'
});

server.get(/^\/stats\/?.*/, staticConfig);
server.get(/^\/js\/?.*/, staticConfig);
server.get("/", staticConfig);

var MochaTest = require('./lib/process/mochaTest.js');
var mochaTest = new MochaTest();

require('./lib/api/restApi.js')(server);

server.listen(config.servicePort, function() {
  console.log('%s listening at %s', server.name, server.url);
});