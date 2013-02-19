#!/usr/bin/env python

# This script searches for JsTestDriver config files and launches them using
# with the --tests "all" option
import os
import sys
import shutil
import time
from subprocess import call

if len(sys.argv) > 1:
    root_dir = sys.argv[1]
else:
    root_dir = ".." # The default assumes that this script is in a subdirectory
                    # of the project root

if len(sys.argv) > 2:
	browsers = sys.argv[2]
else:
    browsers = "NO_BROWSERS_SPECIFIED"
					
detect = "server:"
script_path = os.path.dirname(os.path.abspath(__file__))
output_path = os.path.join(script_path, "output")

# Clean the ouput from a previous run
if os.path.exists(output_path):
    shutil.rmtree(output_path)
os.mkdir(output_path)

matched_files = []
print "Searching for JsTestDriver conf files..."
for dname, dirs, files in os.walk(root_dir):
    if not '.git' in dname:
        for fname in files:
            if fname.endswith(".conf"):
                fpath = os.path.join(dname, fname)
                for line in open(fpath):
                    if detect in line:
                        matched_files.append(fpath)
                        break

if len(matched_files) > 0:
    for matched_file in matched_files:
        print "Running configuration " + matched_file
        return_code = call(['java', '-jar', os.path.join(script_path, 'jstestdriver', 'JsTestDriver-1.3.1.jar'), 
            '--reset', '--port', '9876', '--browser', browsers, '--tests', 'all', '--config', matched_file, '--testOutput', output_path])
        # running JSTD jobs too close together sometimes causes a failure because
        # the browser is not yet available for a new job.
        time.sleep(0.5)
else:
    print "No JSTestDriver conf files found in " + root_dir
