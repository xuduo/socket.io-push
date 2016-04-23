/**
 * Created by Administrator on 2016/4/11.
 */
var childProcess   = require('child_process');
var config = require('../../config.js');
var cmdStr = config.cmdStr;

function State() {
    test();
    setInterval(function () {
        test();
    }, config.mochaInterval);
}

function test(){
    childProcess.exec(cmdStr, function(err,stdout,stderr){
        if(err) {
            console.log(err);
        } else {
            console.log(stdout);
        }
    });
}

module.exports = State;