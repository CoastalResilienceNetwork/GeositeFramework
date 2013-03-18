using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Web;

namespace GeositeFramework.Helpers
{

    /// <summary>
    /// Represents JSON configuration data for a Geosite (e.g. from a "region.json" file)
    /// </summary>
    public class JsonDataRegion : JsonData
    {
        public JsonDataRegion(string schemaFolderPath)
            : base(Path.Combine(schemaFolderPath, "regionSchema.json")) { }
    }

}