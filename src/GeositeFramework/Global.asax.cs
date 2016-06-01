using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Web.Hosting;
using System.Web.Http;
using System.Web.Mvc;
using System.Web.Routing;
using GeositeFramework.Helpers;
using GeositeFramework.Models;
using log4net;
using log4net.Appender;
using log4net.Layout;
using log4net.Repository.Hierarchy;
using Newtonsoft.Json;

namespace GeositeFramework
{
    // Translation dictionary where key is language and value is a dictionary of translations for that language
    using Translations = Dictionary<string, Dictionary<string, string>>;

    public class MvcApplication : System.Web.HttpApplication
    {
        public static Geosite GeositeData { get; private set; }
        public static Translations Languages { get; private set; }

        private static readonly string _geositeFrameworkVersion = "0.1.0";
        private static readonly ILog _log = LogManager.GetLogger(System.Reflection.MethodBase.GetCurrentMethod().DeclaringType);

        protected void Application_Start()
        {
            AreaRegistration.RegisterAllAreas();

            WebApiConfig.Register(GlobalConfiguration.Configuration);
            FilterConfig.RegisterGlobalFilters(GlobalFilters.Filters);
            RouteConfig.RegisterRoutes(RouteTable.Routes);

            // Configure log4net from the info in Web.config
            log4net.Config.XmlConfigurator.Configure();
            _log.Info("Initializing GeositeFramework, version " + _geositeFrameworkVersion);

            // Load geosite configuration data (which loads and validates all config files)
            GeositeData = LoadGeositeData();

            // Create a logger for each plugin
            foreach (string pluginName in GeositeData.PluginFolderNames)
            {
                CreateLogger(pluginName);
            }

            // Prepare Languages for Internationalization
            Languages = PrepareLanguages(GeositeData);
        }

        private Geosite LoadGeositeData()
        {
            // Load geosite data from "region.json" file
            string basePath = HostingEnvironment.MapPath("~/");
            string configFilePath = HostingEnvironment.MapPath("~/region.json");
            string appDataFolderPath = HostingEnvironment.MapPath("~/App_Data");
            if (!File.Exists(configFilePath))
            {
                throw new FileNotFoundException("Site configuration file not found: " + configFilePath);
            }
            if (!Directory.Exists(appDataFolderPath))
            {
                throw new FileNotFoundException("App_Data folder not found: " + appDataFolderPath);
            }
            try
            {
                var geositeData = Geosite.LoadSiteData(configFilePath, basePath, appDataFolderPath);
                geositeData.GeositeFrameworkVersion = _geositeFrameworkVersion;
                return geositeData;
            }
            catch (JsonValidationException ex)
            {
                _log.Error(ex.Message);
                foreach (var message in ex.ParseMessages)
                {
                    _log.Error(message);
                }
                throw;   // Will display /Error.html
            }
            catch (Exception ex)
            {
                _log.Error(ex.Message);
                throw;   // Will display /Error.html
            }
        }

        private void CreateLogger(string loggerName)
        {
            var hierarchy = (Hierarchy)LogManager.GetRepository();
            var logger = (Logger)hierarchy.GetLogger(loggerName);
            if (logger.Appenders.Count == 0)
            {
                var fileAppender = new RollingFileAppender();
                fileAppender.File = Path.Combine(@".\logs", loggerName + ".log");
                fileAppender.Layout = new PatternLayout("%date %-5level - %message%newline");
                fileAppender.ImmediateFlush = true;
                fileAppender.RollingStyle = RollingFileAppender.RollingMode.Size;
                fileAppender.MaximumFileSize = "10MB";
                fileAppender.AppendToFile = true;
                fileAppender.MaxSizeRollBackups = 10;
                fileAppender.ActivateOptions();

                logger.Additivity = false; // don't also log to root logger
                logger.AddAppender(fileAppender);
            }
        }

        private Translations PrepareLanguages(Geosite data)
        {
            var translations = new Translations();

            // Add all plugin translation files
            foreach (var plugin in data.PluginFolderNames)
            {
                var pluginLocalesPath = HostingEnvironment.MapPath(String.Format("~/{0}/locales", plugin));

                if (Directory.Exists(pluginLocalesPath))
                {
                    var pluginTranslations = Directory
                        .GetFiles(pluginLocalesPath, "*.json")
                        .ToDictionary(Path.GetFileNameWithoutExtension, toTranslationDictionary);

                    translations = mergeTranslations(pluginTranslations, translations);
                }
            }

            // Add core translation files
            var coreLocalesPath = HostingEnvironment.MapPath("~/locales");
            var coreTranslations = Directory
                .GetFiles(coreLocalesPath, "*.json")
                .ToDictionary(Path.GetFileNameWithoutExtension, toTranslationDictionary);

            translations = mergeTranslations(coreTranslations, translations);

            return translations;
        }

        /// <summary>
        /// Reads a translation JSON file and returns a dictionary where
        /// key is original phrase and value is translated phrase.
        /// </summary>
        /// <param name="filename">Translation File</param>
        /// <returns>Dictionary of phrases and their translations</returns>
        private Dictionary<string, string> toTranslationDictionary(string filename)
        {
            return JsonConvert.DeserializeObject<Dictionary<string, string>>(File.ReadAllText(filename));
        }

        /// <summary>
        /// Merges translations from ts1 into ts2 and returns the result.
        /// Source translations will overwrite target ones if there is a collision.
        /// </summary>
        /// <param name="ts1">Source Translations</param>
        /// <param name="ts2">Target Translations</param>
        /// <returns>Merged Translations</returns>
        private Translations mergeTranslations(Translations ts1, Translations ts2)
        {
            ts1.ToList().ForEach(t =>
            {
                if (ts2.ContainsKey(t.Key))
                {
                    t.Value.ToList().ForEach(kv => ts2[t.Key][kv.Key] = kv.Value);
                }
                else
                {
                    ts2[t.Key] = t.Value;
                }
            });

            return ts2;
        }
    }
}
