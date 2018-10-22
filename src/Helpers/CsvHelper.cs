using System;
using System.Collections.Generic;
using System.Linq;
using Newtonsoft.Json.Linq;

namespace GeositeFramework.Helpers
{
    public class CsvHelper
    {
        /// <summary>
        /// Takes valid JSON array and returns simple CSV representation of the data.
        /// Leans on the fact that any escapable characters are already quoted within
        /// the json as strings.
        /// </summary>
        /// <param name="json">String representation of an Array [file] of Arrays [rows]</param>
        /// <returns></returns>
        public static string JsonToCsv(string json)
        {
            var csvJson = JArray.Parse(json);
            return csvJson.Aggregate("", (current, row) => current + ArrayToRow(row));
        }

        private static string ArrayToRow(IEnumerable<JToken> rowValues)
        {
            return String.Join(",", rowValues.Select(GetFormattedValue)) + Environment.NewLine;
        }

        private static string GetFormattedValue(JToken val)
        {
            var output = val.ToString();
 
            if (val.Type == JTokenType.String)
            {
                // Replace quotes (") as escaped quotes ("")
                var escaped = val.ToString().Replace("\"", "\"\"");

                // All string are quoted 
                output = String.Format("\"{0}\"", escaped);
            }
            return output;
        }
    }
}