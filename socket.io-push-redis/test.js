// const IoRedis = require('ioredis');
//
// const redis = new IoRedis();
//
// function test_handle(){
//     redis.call.apply(redis, ['set', 'mmtest', '111']);
// }
//
// // test_handle();
//
// console.log('hisdfsd');

const redis = require('./cluster.js')({write: [
    {host:"127.0.0.1", port: 6379},
    {host:"127.0.0.1", port: 6380},
    {host:"127.0.0.1", port: 6380}]});

redis.hhincrby("conninfo-test", "eiwuqroesda1903", 1);
redis.hhincrby("conninfo-test", "eiwuqroesda1904", 1);
redis.hhincrby("conninfo-test", "eiwuqroesda1905", 1);
redis.hhincrby("conninfo-test", "eiwuqroesda1906", 1);
redis.hhincrby("conninfo-test", "eiwuqroesda1907", 1);
redis.hhincrby("conninfo-test", "eiwuqroesda1908", 1);
redis.hhincrby("conninfo-test", "eiwuqroesda1909", 1);
redis.hhget("conninfo-test", "eiwuqroesda1909", (err, result) => {
    console.log('conninfo-test: eiwuq..1903', result);
});

const ss = redis.hhscanStream("conninfo-test");
ss.on('data', function (resultKeys) {
    for (let i = 0; i < resultKeys.length; i++) {
        console.log(resultKeys[i]);
        // if (i % 2 == 0) {
        //     callback(resultKeys[i]);
        // }
    }
});
ss.on('end', function () {
    console.log("end");
});

