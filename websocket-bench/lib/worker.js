/*global module, require, process*/

var logger = require('./logger'),
  server = process.argv[2],
  generatorFile = process.argv[3],
  verbose = process.argv[6] === 'true';

if (!generatorFile || generatorFile === 'undefined') {
  generatorFile = './generator.js';
}

var generator = require(generatorFile);
var BenchmarkWorker = require('./workers/socketioworker.js');

var worker = new BenchmarkWorker(server, generator, verbose);

process.on('message', function (message) {
  if (message.msg === 'close') {
    worker.close();
    process.exit();
  }

  if (message.msg === 'run') {
    worker.launch(message.number, message.nbMessage);
  }
});

// On ctrl+c
process.on('SIGINT', function () {
  worker.close();
  setTimeout(function () {
    process.exit();
  }, 3000);
});

