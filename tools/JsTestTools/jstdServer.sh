#!/bin/bash
# This script was adapted from server.sh in https://github.com/ibolmo/jasmine-jstd-adapter
while getopts  "j:p:" flag
do
    if [ $flag == "j" ]; then
        JSTD=$OPTARG
    elif [ $flag == "p" ]; then
        PORT=$OPTARG
    fi
done

if [ -z "$PORT" ]; then
    PORT=9876
fi

if [ -z "$JSTD" ]; then
    JSTD=`ls jstestdriver/[jJ]s[tT]est[dD]river-1.3.1.jar`
fi
echo "Using $JSTD"
echo "Launching JsTestDriver server on port $PORT"
java -jar $JSTD --port $PORT

