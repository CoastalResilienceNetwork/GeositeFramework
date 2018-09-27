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
    return_code = subprocess.call(command, stderr=subprocess.STDOUT,
                                  shell=True)
else:
    command = ('./scripts/main.py')
    return_code = subprocess.call(command, stderr=subprocess.STDOUT,
                                  shell=True)

if return_code == 1:
    msg = 'Failed! Check that your JSON config files are properly formatted.'
    logging.warn(msg)
    sys.exit()
if return_code == 2:
    msg = 'Failed! Check that your JSON config files match their schemas.'
    logging.warn(msg)
    sys.exit()

logging.info('Finished compiling static assets.')
