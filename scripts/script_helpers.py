import os
import json

BASE_DIR = os.path.join('src', 'GeositeFramework')
REGION_FILE = os.path.join(BASE_DIR, 'region.json')


def to_json(file):
    """Opens a JSON file and converts it to JSON"""
    with open(file) as f:
        return json.load(f)


def extract_filepaths_from_dirs(directory_list):
    """Returns the full paths of all files in a list of directories"""
    f = []
    for dir in directory_list:
        f.append([os.path.join(dir, file)
                  for (path, dirs, files) in os.walk(dir)
                  for file in files])
    return f[0]
