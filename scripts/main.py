#!/usr/bin/env python

import os
import json
from jinja2 import Environment, FileSystemLoader

BASE_DIR = os.path.join('src', 'GeositeFramework')
REGION_FILE = os.path.join(BASE_DIR, 'region.json')
TMPL_FILE = os.path.join(BASE_DIR, 'template_index.html')
IDX_FILE = os.path.join(BASE_DIR, 'index.html')

def convert_region_json():
    with open(REGION_FILE) as f:
        data = json.load(f)
        return data

def template_index():
    j2_env = Environment(loader=FileSystemLoader(''),
                         trim_blocks=True)
    region_json = convert_region_json()
    templated = j2_env.get_template(TMPL_FILE).render(region_json)

    # write jinja template to disk, to be used in geosite static assets build
    # as well as served from this project's development server
    with open(IDX_FILE, 'wb') as f:
        f.write(templated)

if __name__ == '__main__':
    template_index()
