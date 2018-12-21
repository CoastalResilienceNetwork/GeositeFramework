#!/usr/bin/env python

"""
Compile static assets via script

Usage: python ./scripts/create_static.py [OPTIONS]

"""

import argparse
import sys
import subprocess
import logging

logging.basicConfig(level=logging.INFO)

parser = argparse.ArgumentParser()
parser.add_argument('-d',
                    help='Run from within python docker container.',
                    action='store_true')
args = parser.parse_args()

logging.info('Attempting to compile static assets...')

if args.d:
    command = ('docker-compose run --rm server ./scripts/main.py')
    return_value = subprocess.call(command, stderr=subprocess.STDOUT,
                                   shell=True)
else:
    command = ('./scripts/main.py')
    return_value = subprocess.call(command, stderr=subprocess.STDOUT,
                                   shell=True)

if return_value != 0:
    logging.error('Exiting before compiling static assets.')
    sys.exit()

logging.info('Finished compiling static assets.')
