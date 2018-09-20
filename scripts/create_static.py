#!/usr/bin/env python

"""
Compile static assets via script

Usage: python ./scripts/create_static.py [OPTIONS]

"""

import argparse
import subprocess
import main

parser = argparse.ArgumentParser()
parser.add_argument('-d',
                    help='Run from within python docker container.',
                    action='store_true')
args = parser.parse_args()

if args.d:
    commands = ['docker-compose start server',
                'echo "Compiling static assets..."',
                'docker-compose exec server sh -c ./scripts/main.py',
                'echo "Finished compiling static assets...shutting down container"',
                'docker-compose kill server']
    for command in commands:
        subprocess.call(command, shell=True)
else:
    main.template_index()
