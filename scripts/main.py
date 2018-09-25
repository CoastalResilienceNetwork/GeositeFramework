#!/usr/bin/env python

import os
import json
from jinja2 import Environment, FileSystemLoader
from jsonschema import validate

BASE_DIR = os.path.join('src', 'GeositeFramework')
REGION_FILE = os.path.join(BASE_DIR, 'region.json')
REGION_SCHEMA_FILE = os.path.join(BASE_DIR, 'App_Data/regionSchema.json')
TMPL_FILE = os.path.join(BASE_DIR, 'template_index.html')
IDX_FILE = os.path.join(BASE_DIR, 'index.html')

def convert_json(file):
    with open(file) as f:
        return json.load(f)

def template_index():
    j2_env = Environment(loader=FileSystemLoader(''),
                         trim_blocks=True)

    region_json = convert_json(REGION_FILE)
    region_schema_json = convert_json(REGION_SCHEMA_FILE)
    
    validate(region_json, region_schema_json)

    templated_idx = j2_env.get_template(TMPL_FILE).render(region_json)

    # write jinja template to disk, to be used in geosite static assets build
    # as well as served from this project's development server
    with open(IDX_FILE, 'wb') as f:
        f.write(templated_idx)

if __name__ == '__main__':
    template_index()
