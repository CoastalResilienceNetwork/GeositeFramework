#!/usr/bin/env python

import os
import sys
from jsonschema import validate, exceptions
from script_helpers import to_json, BASE_DIR, REGION_FILE

PLUGIN_SCHEMA_FILE = os.path.join(BASE_DIR, 'App_Data/pluginSchema.json')


def get_plugin_folder_path(basePath, pluginPath):
    """Return pluginPath relative to basePath.
    For example, if basePath is "~/www" and pluginPath is "~/www/plugins/xyz"
    then return "plugins/xyz".
    """
    return pluginPath.replace(basePath, "").replace("\\", "/")


def get_plugin_module_name(basePath, pluginPath):
    """Convert pluginPath to relative module path.
    For example, if basePath is "~/www" and pluginPath is "~/www/plugins/xyz"
    then return "tnc/plugins/xyz/main". Assuming "tnc" prefix is a package
    configured to point to your basePath.
    """
    return "tnc{}/main".format(get_plugin_folder_path(basePath, pluginPath))


def strip_plugin_module(pluginModule):
    """Given a module name like "tnc/plugins/layer_selector/main"
    return "layer_selector".
    """
    result = pluginModule.replace("tnc/", "") \
                         .replace("/main", "") \
                         .split("/")[-1]

    return result


def sort_plugin_names(pluginNames, keyFunc):
    """Sort pluginNames by specified keyFunc.
    Items for which keyFunc returns -1 (not found) will be sorted
    towards the end of the list in no particular order.
    """
    return sorted(pluginNames, key=keyFunc)


def get_plugin_order(region_json):
    """Get the configured plugin order, ensuring that the
    launchpad plugin is always first

    Return ordered list of plugins
    """
    launchpad_name = "launchpad"
    plugin_order = region_json["pluginOrder"]

    if launchpad_name in plugin_order:
        plugin_order.remove(launchpad_name)

    plugin_order.insert(0, launchpad_name)

    return plugin_order


def get_plugin_directories(regionData, basePath):
    """Return pluginFolders array from region.json.
    Default value is ["plugins"]
    """
    pluginFolders = ["plugins"]

    if ("pluginFolders" in regionData):
        pluginFolders = regionData["pluginFolders"]

    return map(lambda p: os.path.join(basePath, p), pluginFolders)


def verify_directories_exist(dirs):
    """Throw exception if folder does not exist."""
    for path in dirs:
        if not os.path.exists(path):
            raise ValueError("{} does not exist".format(path))


def get_plugin_folder_paths(base_path=BASE_DIR):
    """Returns paths to all plugin directories.

    Accepts a custom base path.
    """
    region_json = to_json(REGION_FILE)
    plugin_directories = get_plugin_directories(region_json,
                                                base_path)
    verify_directories_exist(plugin_directories)
    return [d + '/' + r for d in plugin_directories for r in os.listdir(d)]


def get_plugin_configuration_data(plugin_folder_paths):
    plugin_json_filename = "plugin.json"
    plugin_config_data = []

    for path in plugin_folder_paths:
        if not os.path.exists(os.path.join(path, "main.js")):
            msg = "Missing 'main.js' file in plugin folder: {}".format(path)
            sys.exit(msg)

        # Get plugin.json data if present
        plugin_json_path = os.path.join(path, plugin_json_filename)
        if os.path.exists(plugin_json_path):

            # extract json from their files
            try:
                plugin_json = to_json(plugin_json_path)
                plugin_schema_json = to_json(PLUGIN_SCHEMA_FILE)
            except ValueError as e:
                msg = 'Failed! Check that the plugin JSON ' \
                      'config file located at {} is properly ' \
                      'formatted. {}'.format(plugin_json_path, e)
                sys.exit(msg)

            # validate the json against their JSON schema spec
            try:
                validate(plugin_json, plugin_schema_json)
            except exceptions.ValidationError as e:
                msg = 'Failed! Check that the plugin JSON ' \
                      'config file located at {} matches the ' \
                      'required schema. {}'.format(plugin_json_path, e.message)
                sys.exit(msg)

            plugin_config_data.append(plugin_json)

        # Generate plugin module names for use in JS code
    return plugin_config_data


def merge_plugin_config_data(plugin_config_data):
    css_urls = []
    use_clause_dict = {}

    for data in plugin_config_data:
        if "css" in data:
            # This config has CSS urls - add them to the list
            css_urls.append(data["css"])

        if "use" in data:
            # This config has "use" clauses - add unique ones to the list
            for lib, config in data["use"].items():
                lib = lib.replace(" ", "")  # remove whitespace

                if lib in use_clause_dict and use_clause_dict[lib] != config:
                    msg = "Plugins define 'use' clause '{0}' " \
                          "differently: '{1}' vs. '{2}'".format(
                            lib, config, use_clause_dict[lib])
                    sys.exit(msg)
                else:
                    use_clause_dict[lib] = config

    return css_urls, use_clause_dict
