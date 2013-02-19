#!/usr/bin/env python

# This script searches for HTML files that run Jasmine unit test suites and
# opens them using PyPhantomJS
import os
import sys
import shutil
from subprocess import call

if len(sys.argv) > 1:
    root_dir = sys.argv[1]
else:
    root_dir = ".." # The default assumes that this script is in a subdirectory
                    # of the project root

detect = "jasmine.getEnv().execute()"
script_path = os.path.dirname(os.path.abspath(__file__))
output_path = os.path.join(script_path, "output")

# Clean the ouput from a previous run
if os.path.exists(output_path):
    shutil.rmtree(output_path)
os.mkdir(output_path)

matched_files = []
print "Searching for html files that launch Jasmine test suites..."
for dname, dirs, files in os.walk(root_dir):
    if not '.git' in dname:
        for fname in files:
            if fname.endswith(".html"):
                if fname.lower() != "specrunnertemplate.html":
                    fpath = os.path.join(dname, fname)
                    for line in open(fpath):
                        if detect in line:
                            matched_files.append(fpath)
                            break

# The XML file output seems to only work when pyphantomjs.py is launched
# from the directory in which it is saved.
os.chdir(os.path.join(script_path, "phantomjs", "python"))

for matched_file in matched_files:
    print "Running tests in " + matched_file
    return_code = call(['python', 'pyphantomjs.py', os.path.join('..', '..', 'phantomjs-testrunner.js'), os.path.join('..', '..', matched_file)])
