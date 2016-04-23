module.exports = MyReporter;
var redis = require('./lib/redis/redis.js');
function MyReporter(runner) {
    var passes = 0;
    var failures = 0;
    var result = [];

    runner.on('pass', function (test) {
        passes++;
        var ok = {state: test.state, title: JSON.parse(test.title), duration: test.duration};
        result.push(ok);
    });

    runner.on('fail', function (test, err) {
        failures++;
        var testContent = JSON.parse(test.title);
        console.log('fail: %s %s -- error: %s %j', new Date().toLocaleString(), test.title, err.message, testContent);
        //filter api fail
        if ((err.message).indexOf('to be null') == -1) {
            var ok = {state: test.state, title: testContent, duration: test.duration};
            result.push(ok);
        }
    });

    runner.on('end', function () {
        console.log('mocha result: %d/%d', passes, passes + failures);
        redis.handleResult(result);
    });
}
