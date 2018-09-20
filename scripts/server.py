#!/usr/bin/env python

"""
Static site server script

Usage: python ./scripts/server.py [OPTIONS]

"""
import argparse
import subprocess
import py_server
import signal

def handler(signum, frame):
    subprocess.call('docker-compose stop server', shell=True)

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('-d',
                        help='Start server within a python docker container.',
                        action='store_true')
    args = parser.parse_args()

    if args.d:
        subprocess.call('docker-compose -f docker-compose.yml up',
                        shell=True)
        signal.signal(signal.SIGINT, handler) # kill docker container when script is stopped
    else:
        py_server.serve()
