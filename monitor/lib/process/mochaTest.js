/**
 * Created by Administrator on 2016/4/11.
 */
var childProcess   = require('child_process');
var config = require('../../config.js');
var cmdStr = config.cmdStr;

function State() {
    setInterval(function () {
        childProcess.exec(cmdStr, function(err,stdout,stderr){
            if(err) {
                console.log(err);
            } else {
                console.log(stdout);
            }
        });
    }, config.mochaInterval);
}

module.exports = State;