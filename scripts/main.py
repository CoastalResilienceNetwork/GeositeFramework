#!/usr/bin/env python

import os
import re
import codecs
import sys
import plugin_loader
from jinja2 import Environment, FileSystemLoader
from jsonschema import validate, exceptions
from script_helpers import (to_json,
                            BASE_DIR,
                            REGION_FILE,
                            extract_filepaths_from_dirs)

REGION_SCHEMA_FILE = os.path.join(BASE_DIR, 'App_Data/regionSchema.json')
TMPL_FILE = os.path.join(BASE_DIR, 'template_index.html')
IDX_FILE = os.path.join(BASE_DIR, 'index.html')
PARTIALS_DIR = os.path.join(BASE_DIR, 'Views/Shared')


def prepare_languages():
    # get app-wide translation files
    try:
        language_dir = os.path.join(BASE_DIR, 'locales')
        plugin_loader.verify_directories_exist([language_dir])
        app_json_files = [os.path.join(language_dir, file) for file in
                          os.listdir(language_dir) if file.endswith('.json')]
    except ValueError as e:
        msg = 'Failed! Check the app has JSON translation files. {}'.format(e)
        sys.exit(msg)

    # get plug-ins' translation files
    plugin_folder_paths = plugin_loader.get_plugin_folder_paths()
    plugin_locales = [str(path+'/locales') for path in plugin_folder_paths
                      if os.path.exists(path+'/locales')]
    plugin_json_files = extract_filepaths_from_dirs(plugin_locales)

    # merge app and plugin translation dicts keyed to language code
    # prefer app dict translations, if conflict
    # final format:
    # {
    #   "es": {
    #       "Start": "Comience",
    #   }
    # }
    all_json_files = plugin_json_files + app_json_files
    translations = {}

    for file in all_json_files:
        language = re.search(r'locales\/(.*?)\.json', file).group(1)
        if language in translations:
            translations[language].update(to_json(file))
        else:
            translations.update({language: to_json(file)})

    return translations


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
        plugin_folder_paths = plugin_loader.get_plugin_folder_paths(custom_base_path=base_path)

        # Generate plugin config data, folder names, and module names for use
        # in JS code
        plugin_config_data = plugin_loader.get_plugin_configuration_data(
                                plugin_folder_paths)
        plugin_folder_names = [plugin_loader.get_plugin_folder_path(
                                base_path, p) for p in plugin_folder_paths]
        plugin_module_names = [plugin_loader.get_plugin_module_name(
                                base_path, p) for p in plugin_folder_paths]


        # If single plugin mode is active, remove every plugin besides the
        # specified plugin from the plugin lists.
        if (region_json["singlePluginMode"] is not None and
           region_json["singlePluginMode"]["active"]):

            single_plugin_name = (
                    region_json["singlePluginMode"]["pluginFolderName"]
            )

            if single_plugin_name is None:
                msg = "Single plugin mode is active but no plugin is defined."
                sys.exit(msg)

            single_plugin_folder_name = [p for p in plugin_folder_names
                                         if single_plugin_name in p]
            single_plugin_module_name = [p for p in plugin_module_names
                                         if single_plugin_name in p]

            if len(single_plugin_folder_name) == 0:
                msg = "The specified plugin for single plugin " \
                      "mode was not found."
                sys.exit(msg)
            else:
                plugin_folder_names = single_plugin_folder_name
                plugin_module_names = single_plugin_module_name

        # Create plugin module identifiers, to be inserted in generated
        # JavaScript code. Example: "'plugins/layer_selector/main',
        # 'plugins/measure/main'"
        plugin_module_identifiers = "'" + "', '".join(plugin_module_names) + \
                                    "'"
        # Create plugin variable names, to be inserted in generated JavaScript
        # code. Example: "p0, p1"
        plugin_variable_names = ",".join(map(lambda i: 'p{}'.format(i),
                                         range(len(plugin_folder_names))))

        # Modify region file with plugin data
        region_json["pluginFolderNames"] = plugin_folder_names

        plugin_css_urls, config_for_use_js = (
                plugin_loader.merge_plugin_config_data(plugin_config_data))
    except ValueError as e:
        sys.exit(e)

    translations = prepare_languages()

    # TODO: Remove print statement. For testing only.
    print(translations)

    # rewrite partials in charset utf-8 for Jinja2 compatibility
    for file in os.listdir(PARTIALS_DIR):
        filename = os.path.join(PARTIALS_DIR, file)
        s = codecs.open(filename, mode='r', encoding='utf-8-sig').read()
        codecs.open(filename, mode='w', encoding='utf-8').write(s)

    # template HTML with validated custom JSON configs
    templated_idx = j2_env.get_template(TMPL_FILE).render({
        'region': region_json,
        'plugin_module_identifiers': plugin_module_identifiers,
        'plugin_variable_names': plugin_variable_names,
        'plugin_config_data': plugin_config_data,
        'plugin_css_urls': plugin_css_urls,
        'config_for_use_js': config_for_use_js,
    })

    # write jinja template to disk, to be used in geosite static assets build
    # as well as served from this project's development server
    with open(IDX_FILE, 'wb') as f:
        f.write(templated_idx)


if __name__ == '__main__':
    template_index()
