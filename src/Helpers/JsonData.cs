using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Web;
using Newtonsoft.Json.Linq;
using Newtonsoft.Json.Schema;

namespace GeositeFramework.Helpers
{
    /// <summary>
    /// Abstract class representing JSON data, which may be loaded from a string or a file.
    /// Subclasses supply a JSON schema, used to validate the data.
    /// </summary>
    public abstract class JsonData
    {
        private string _jsonText;
        private string _jsonFilePath;
        private JsonSchema _schema;

        protected JsonData(string schemaFilePath)
        {
            _schema = JsonSchema.Parse(File.ReadAllText(schemaFilePath));
        }

        /// <summary>
        /// Load JSON data from a text string
        /// </summary>
        /// <param name="jsonText">JSON text to load</param>
        public JsonData LoadText(string jsonText)
        {
            _jsonText = jsonText;
            _jsonFilePath = "";
            return this;
        }

        /// <summary>
        /// Load JSON data from a file
        /// </summary>
        /// <param name="jsonFilePath">Path to JSON file</param>
        public JsonData LoadFile(string jsonFilePath)
        {
            _jsonText = File.ReadAllText(jsonFilePath);
            _jsonFilePath = jsonFilePath;
            return this;
        }

        /// <summary>
        /// Validate loaded JSON data
        /// </summary>
        /// <returns>An object representing the JSON data</returns>
        public JObject Validate()
        {
            IList<string> validationMessages;
            try
            {
                var jsonData = JObject.Parse(_jsonText);
                if (jsonData.IsValid(_schema, out validationMessages))
                {
                    return jsonData;
                }
            }
            catch (Exception ex)
            {
                validationMessages = new List<string> { ex.Message };
            }
            if (string.IsNullOrEmpty(_jsonFilePath))
            {
                throw new JsonValidationException(validationMessages, "Error(s) in JSON text");
            }
            else
            {
                throw new JsonValidationException(validationMessages, "Error(s) in JSON file '{0}'", _jsonFilePath);
            }
        }
    }

    public class JsonValidationException : Exception
    {
        public IList<string> ParseMessages;

        public JsonValidationException(IList<string> parseMessages, string message, params object[] arguments)
            : base(String.Format(message, arguments))
        {
            ParseMessages = parseMessages;
        }
    }

}