using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using Newtonsoft.Json.Linq;

namespace GeositeFramework.Helpers
{
    public class PluginLoader
    {
        /// <summary>
        /// Return pluginPath relative to basePath.
        /// For example, if basePath is "~/www" and pluginPath is "~/www/plugins/xyz"
        /// then return "plugins/xyz".
        /// </summary>
        public static string GetPluginFolderPath(string basePath, string pluginPath)
        {
            return pluginPath.Replace(basePath, "").Replace("\\", "/");
        }

        /// <summary>
        /// Convert pluginPath to relative module path.
        /// For example, if basePath is "~/www" and pluginPath is "~/www/plugins/xyz"
        /// then return "tnc/plugins/xyz/main". Assuming "tnc" prefix is a package
        /// configured to point to your basePath.
        /// </summary>
        public static string GetPluginModuleName(string basePath, string pluginPath)
        {
            return string.Format("tnc/{0}/main", pluginPath.Replace(basePath, "").Replace("\\", "/"));
        }

        /// <summary>
        /// Given a module name like "tnc/plugins/layer_selector/main" return "layer_selector".
        /// </summary>
        public static string StripPluginModule(string pluginModule)
        {
            string result = pluginModule.Replace("tnc/", "");
            result = result.Replace("/main", "");
            result = result.Split('/').Last();
            return result;
        }

        /// <summary>
        /// Sort pluginNames by specified keyFunc.
        /// Items for which keyFunc returns -1 (not found) will be sorted
        /// towards the end of the list in no particular order.
        /// </summary>
        public static void SortPluginNames(List<string> pluginNames, Func<string, int> keyFunc)
        {
            pluginNames.Sort((a, b) =>
            {
                int ai = keyFunc(a);
                int bi = keyFunc(b);
                if (ai == -1) return 1;
                if (bi == -1) return -1;
                return ai.CompareTo(bi);
            });
        }

        /// <summary>
        /// Return pluginFolders array from region.json.
        /// Default value is ["plugins"]
        /// </summary>
        public static IEnumerable<string> GetPluginDirectories(JsonData jsonDataRegion, string basePath)
        {
            JObject regionData = jsonDataRegion.Validate();
            JToken token;
            if (regionData.TryGetValue("pluginFolders", out token))
            {
                return (token as JArray).Select(folderPath => Path.Combine(basePath, folderPath.ToString()));
            }
            return new string[] { Path.Combine(basePath, "plugins") };
        }

        /// <summary>
        /// Throw exception if folder does not exist.
        /// </summary>
        public static void VerifyDirectoriesExist(IEnumerable<string> dirs)
        {
            foreach (string path in dirs)
            {
                if (!Directory.Exists(path))
                {
                    throw new FileNotFoundException("Plugin folder not found: " + path);
                }
            }
        }
    }
}
