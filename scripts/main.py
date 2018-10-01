#!/usr/bin/env python

import os
import sys
from jinja2 import Environment, FileSystemLoader
from jsonschema import validate, exceptions
from script_helpers import to_json, BASE_DIR

REGION_FILE = os.path.join(BASE_DIR, 'region.json')
REGION_SCHEMA_FILE = os.path.join(BASE_DIR, 'App_Data/regionSchema.json')
TMPL_FILE = os.path.join(BASE_DIR, 'template_index.html')
IDX_FILE = os.path.join(BASE_DIR, 'index.html')


def template_index():
    # create a jinja environment
    j2_env = Environment(loader=FileSystemLoader(''),
                         trim_blocks=True)

    # extract json from their files
    try:
        region_json = to_json(REGION_FILE)
        region_schema_json = to_json(REGION_SCHEMA_FILE)
    except ValueError as e:
        msg = 'Failed! Check that your region.json ' \
              'config file is properly formatted. {}'.format(e)
        sys.exit(msg)

    # validate the json against their JSON schema spec
    try:
        validate(region_json, region_schema_json)
    except exceptions.ValidationError as e:
        msg = 'Failed! Check that your region.json ' \
              'config file matches the schema. {}'.format(e.message)
        sys.exit(msg)

    # template HTML with validated custom JSON configs
    templated_idx = j2_env.get_template(TMPL_FILE).render(region_json)

    # write jinja template to disk, to be used in geosite static assets build
    # as well as served from this project's development server
    with open(IDX_FILE, 'wb') as f:
        f.write(templated_idx)


if __name__ == '__main__':
    template_index()
