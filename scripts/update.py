#!/usr/bin/env python

"""
Update python dependencies via script

Usage: python ./scripts/update.py [OPTIONS]
"""
import argparse
import subprocess
import logging

logging.basicConfig(level=logging.INFO)

parser = argparse.ArgumentParser()
parser.add_argument('-d',
                    help='Update dependencies within ' +
                         'the python docker container.',
                    action='store_true')
args = parser.parse_args()

logging.info('Updating python dependencies...')
if args.d:
    subprocess.call('docker-compose build', shell=True)
else:
    subprocess.call('pip install -r src/GeositeFramework/requirements.txt',
                    shell=True)
