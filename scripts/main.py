#! /usr/bin/env python

import os
import json
from jinja2 import Environment, FileSystemLoader

def convert_region_json():
    with open('./src/GeositeFramework/region.json') as f:
        data = json.load(f)
        return data

def template_index():
    j2_env = Environment(loader=FileSystemLoader(''),
                         trim_blocks=True)
    region_json = convert_region_json()
    templated = j2_env.get_template('./src/GeositeFramework/template_index.html').render(region_json)

    # write jinja template to disk, to be used in geosite static assets build
    # as well as served the this project's development server
    with open("./src/GeositeFramework/index.html", "wb") as f:
        f.write(templated)

if __name__ == '__main__':
    template_index()
