#!/usr/bin/env python

import os
import codecs
import sys
import plugin_loader
from jinja2 import Environment, FileSystemLoader
from jsonschema import validate, exceptions
from script_helpers import to_json, BASE_DIR

REGION_FILE = os.path.join(BASE_DIR, 'region.json')
REGION_SCHEMA_FILE = os.path.join(BASE_DIR, 'App_Data/regionSchema.json')
TMPL_FILE = os.path.join(BASE_DIR, 'template_index.html')
IDX_FILE = os.path.join(BASE_DIR, 'index.html')

PARTIALS_DIR= os.path.join(BASE_DIR, 'Views/Shared')

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

    # assemble and validate plugins
    try:
        base_path = os.path.join(os.path.dirname(
                        os.path.dirname(os.path.realpath(__file__))), BASE_DIR)
        plugin_directories = plugin_loader.get_plugin_directories(region_json,
                                                                  base_path)
        plugin_loader.verify_directories_exist(plugin_directories)
        plugin_folder_paths = [d + '/' + r for d in plugin_directories
                               for r in os.listdir(d)]

        # Generate plugin config data, folder names, and module names for use
        # in JS code
        plugin_config_data = plugin_loader.get_plugin_configuration_data(
                                plugin_folder_paths)
        plugin_folder_names = [plugin_loader.get_plugin_folder_path(
                                base_path, p) for p in plugin_folder_paths]
        plugin_module_names = [plugin_loader.get_plugin_module_name(
                                base_path, p) for p in plugin_folder_paths]

        # TODO: Temporary
        print(plugin_config_data, plugin_folder_names, plugin_module_names)
    except ValueError as e:
        sys.exit(e)

    # rewrite partials in charset utf-8 for Jinja2 compatibility
    for file in os.listdir(PARTIALS_DIR):
        filename = os.path.join(PARTIALS_DIR, file)
        s = codecs.open(filename, mode='r', encoding='utf-8-sig').read()
        codecs.open(filename, mode='w', encoding='utf-8').write(s)

    # template HTML with validated custom JSON configs
    templated_idx = j2_env.get_template(TMPL_FILE).render(region_json)

    # write jinja template to disk, to be used in geosite static assets build
    # as well as served from this project's development server
    with open(IDX_FILE, 'wb') as f:
        f.write(templated_idx)


if __name__ == '__main__':
    template_index()
