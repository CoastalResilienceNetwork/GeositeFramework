using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Web;
using Newtonsoft.Json.Linq;

namespace GeositeFramework.Models
{
    /// <summary>
    /// View model for creating the main geosite view (Views/Home/Index.cshtml).
    /// </summary>
    public class Geosite
    {
        public class Link
        {
            public string Text;
            public string Url;
        }

        // Properties used in View rendering
        public string Organization { get; private set; }
        public string Title { get; private set; }
        public List<Link> HeaderLinks { get; private set; }
        public string RegionDataJson { get; private set; }
        public string PluginModuleIdentifiers { get; private set; }
        public string PluginVariableNames { get; private set; }

        /// <summary>
        /// Create a Geosite object by loading the "region.json" file and enumerating plug-ins, using the specified paths.
        /// </summary>
        public static Geosite LoadSiteData(string regionJsonFilePath, string pluginsFolderPath)
        {
            using (var sr = new StreamReader(regionJsonFilePath))
            {
                string regionJson = sr.ReadToEnd();
                var pluginFolderPaths = Directory.EnumerateDirectories(pluginsFolderPath);
                ValidatePlugins(pluginFolderPaths);
                var pluginFolderNames = pluginFolderPaths.Select(p => Path.GetFileName(p)).ToList();
                return new Geosite(regionJson, pluginFolderNames);
            }
        }

        private static void ValidatePlugins(IEnumerable<string> pluginFolderPaths)
        {
            foreach (var path in pluginFolderPaths)
            {
                if (!File.Exists(Path.Combine(path, "main.js")))
                {
                    throw new ApplicationException("Missing 'main.js' file in plugin folder: " + path);
                }
            }
        }

        /// <summary>
        /// Make a Geosite object given the specified configuration info.
        /// </summary>
        /// <param name="regionJson">A JSON configuration string (e.g. contents of the "region.json" configuration file)</param>
        /// <param name="existingPluginFolderNames">A list of plugin folder names (not full paths -- relative to the site "plugins" folder)</param>
        public Geosite(string regionJson, List<string> existingPluginFolderNames)
        {
            var jsonObj = JObject.Parse(regionJson);

            // Get plugin folder names, in the specified order
            var specifiedFolderNames = jsonObj["pluginOrder"].Select(t => (string)t).ToList();
            var pluginFolderNames = GetOrderedPluginFolderNames(existingPluginFolderNames, specifiedFolderNames);

            // Augment the JSON so the client will have the full list of folder names
            jsonObj.Add("pluginFolderNames", new JArray(pluginFolderNames.ToArray()));

            // Set public properties needed for View rendering
            Organization = (string)jsonObj["title"];
            Title = (string)jsonObj["title"];
            
            HeaderLinks = jsonObj["headerLinks"]
                .Select(j => new Link
                {
                    Text = (string)j["text"],
                    Url = (string)j["url"]
                }).ToList();

            // JSON to be inserted in generated JavaScript code
            RegionDataJson = jsonObj.ToString();

            // Create plugin module identifiers, to be inserted in generated JavaScript code. Example:
            //     "'plugins/layer_selector/main', 'plugins/measure/main'"
            PluginModuleIdentifiers = string.Join(", ", pluginFolderNames.Select(name => string.Format("'plugins/{0}/main'", name)));

            // Create plugin variable names, to be inserted in generated JavaScript code. Example:
            //     "p0, p1"
            PluginVariableNames = string.Join(", ", pluginFolderNames.Select((name, i) => string.Format("p{0}", i)));
        }

        private static List<string> GetOrderedPluginFolderNames(List<string> existingFolderNames, List<string> specifiedFolderNames)
        {
            var retVal = new List<string>();
            var existingNames = new List<string>(existingFolderNames); // copy input argument so we don't modify it

            // The "specified" folder names are in the desired order. 
            // Make sure each exists and remove it from the list of existing folder names.
            foreach (var folderName in specifiedFolderNames)
            {
                if (existingFolderNames.Contains(folderName))
                {
                    retVal.Add(folderName);
                    existingNames.Remove(folderName);
                }
                else
                {
                    //TODO: log it using log4net
                    throw new ApplicationException("Specified plugin folder not found: " + folderName);
                }
            }
            // Append any existing folder names that weren't specified
            retVal.AddRange(existingNames);
            return retVal;
        }

    }
}
