#!/bin/bash

pidFile="server_master_pid"

pid=`cat $pidFile`;
if [ -z "$pid" ];then
   echo "push-server not running";
else
   kill $pid;
   echo "kill push-server, master pid:" $pid;
fi;