using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Web.Mvc;
using log4net;

namespace GeositeFramework.Controllers
{
    public class LogController : Controller
    {
        private static readonly ILog _log = LogManager.GetLogger(System.Reflection.MethodBase.GetCurrentMethod().DeclaringType);
        
        public class LogData
        {
            public string Url { get; set; }
            public string TriedTo { get; set; }
            public string Message { get; set; }
            public string Logger { get; set; }
            public string Level { get; set; }
        }
        
        // Handle log posts from client (to url "/Log")

        [HttpPost, ActionName("Index")]
        public string Log(LogData data)
        {
            // Get the appropriate logger.
            ILog logger = _log;
            if (IsNonBlank(data.Logger))
            {
                logger = LogManager.GetLogger(data.Logger);
            }

            // Construct the log message.
            StringBuilder sb = new StringBuilder("ClientLog: ").Append(data.Message);
            if (IsNonBlank(data.TriedTo))
            {
                sb.Append(Environment.NewLine).Append(" - While attempting to ").Append(data.TriedTo);
            }
            var level = (IsNonBlank(data.Level) ? data.Level.ToUpper() : "INFO");
            if (level != "DEBUG" && level != "INFO")
            {
                // Add user agent for more severe messages
                var userAgent = ControllerContext.HttpContext.Request.UserAgent;
                sb.Append(Environment.NewLine).Append(" - UserAgent: ").Append(userAgent);
            }

            // Now log it at the appropriate level.
            var message = sb.ToString();
            switch (level)
            {
                case "DEBUG": logger.Debug(message); break;
                case "INFO" : logger.Info(message); break;
                case "WARN" : logger.Warn(message); break;
                case "ERROR": logger.Error(message); break;
                default:
                case "FATAL": logger.Fatal(message); break;
            }
            return "OK";
        }

        private static bool IsNonBlank(string input)
        {
            return (input != null) && (input.Trim() != "");
        }

    }
}
