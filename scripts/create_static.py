#!/usr/bin/env python

"""
Compile static assets via script

Usage: python ./scripts/create_static.py [OPTIONS]

"""

import argparse
import subprocess
import main
import logging

logging.basicConfig(level=logging.INFO)

parser = argparse.ArgumentParser()
parser.add_argument('-d',
                    help='Run from within python docker container.',
                    action='store_true')
args = parser.parse_args()

logging.info('Attempting to compile static assets...')

if args.d:
    command = ('docker-compose run --rm server -c'
                '''"import subprocess;subprocess.call('./scripts/main.py')"''')
    subprocess.call(command, stderr=subprocess.STDOUT, shell=True)
else:
    main.template_index()

logging.info('Finished compiling static assets.')
