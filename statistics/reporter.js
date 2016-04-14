module.exports = MyReporter;
var redis = require('./lib/redis/redis.js');
function MyReporter(runner) {
    var passes = 0;
    var failures = 0;
    var result =[];
  /*  runner.on('test end', function (test) {
        if (test.state == 'failed') {
            failures++;
        }
        if (test.state == 'passed') {
            passes++;
        }
        var ok = {state: test.state, title: JSON.parse(test.title), duration: test.duration};
        result.push(ok);
    });
*/
    runner.on('pass', function(test){
        passes++;
        var ok = {state: test.state, title: JSON.parse(test.title), duration: test.duration};
        result.push(ok);
    });

    runner.on('fail', function(test, err){
        failures++;
        console.log('fail: %s -- error: %s', test.title, err.message);
        //filter api fail
        if((err.message).indexOf('to be null') == -1) {
            var ok = {state: test.state, title: JSON.parse(test.title), duration: test.duration};
            result.push(ok);
        }
    });

    runner.on('end', function () {
        console.log('mocha result: %d/%d', passes, passes + failures);
        redis.handleResult(result);
        process.exit(0);
    });
}
