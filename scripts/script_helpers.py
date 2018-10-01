import os
import json

BASE_DIR = os.path.join('src', 'GeositeFramework')


def to_json(file):
    """Opens a JSON file and converts it to JSON"""
    with open(file) as f:
        return json.load(f)
