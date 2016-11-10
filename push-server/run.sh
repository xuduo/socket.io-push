#!/bin/bash

pidFile="server_master_pid"
pNumFile="num_process"

# delete info file before run
rm $pidFile -rf;
rm $pNumFile -rf;

# run
nohup node index.js >> /dev/null 2>&1 &
sleep 2

# check
if [ ! -f "$pidFile" ];then
    echo "run push-server failed"
    exit 255
else
    echo "run push-server success"
fi

