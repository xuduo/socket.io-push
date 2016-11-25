let cluster = require('./cluster');

if(cluster.isMaster){
    console.log('im master');
    cluster.fork();
    cluster.fork();
    cluster.fork();
} else {
    let net = require('net');
    console.log('worker(' + cluster.worker.id + ') start.');
    net.createServer((s) => {
        s.on('data', (data) => {
            console.log('in worker(' + cluster.worker.id + '): ' + data);
        });
        s.on('end', () => {
            console.log('in worker(' + cluster.worker.id + '): rec FIN');
        })
    }).on('listening', () => {console.log('worker(%d) listening...', cluster.worker.id)}).listen(8090);

}