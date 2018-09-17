#! /usr/bin/env python

import os
import json
from jinja2 import Environment, FileSystemLoader

def convert_region_json():
    with open('./GeositeFramework/region.json') as f:
        data = json.load(f)
        return data

def template_index():
    j2_env = Environment(loader=FileSystemLoader(''),
                         trim_blocks=True)
    region_json = convert_region_json()
    templated = j2_env.get_template('./GeositeFramework/templates/index.html').render(region_json)
    return templated

if __name__ == '__main__':
    template_index()
