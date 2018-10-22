using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Web;

namespace GeositeFramework.Helpers
{

    /// <summary>
    /// Represents JSON configuration data for a Geosite plugin (e.g. from a "plugin.json" file)
    /// </summary>
    public class JsonDataPlugin : JsonData
    {
        public JsonDataPlugin(string schemaFolderPath)
            : base(Path.Combine(schemaFolderPath, "pluginSchema.json")) { }
    }

}