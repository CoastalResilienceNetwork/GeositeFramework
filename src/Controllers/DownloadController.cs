using System;
using System.Text;
using System.Web;
using System.Web.Mvc;
using GeositeFramework.Helpers;
using log4net;

namespace GeositeFramework.Controllers
{
    public class DownloadController : Controller
    {
        private static readonly ILog _log = LogManager.GetLogger(System.Reflection.MethodBase.GetCurrentMethod().DeclaringType);

        /// <summary>
        /// Echos a JSON Array of Arrays as a CSV
        /// </summary>
        /// <returns></returns>
        public ActionResult Csv()
        {
            var fileInfo = GetParameters(Request);

            try
            {
                var output = CsvHelper.JsonToCsv(fileInfo.Content);
                return File(Encoding.Unicode.GetBytes(output), "text/csv", fileInfo.Filename);
            }
            catch (Exception ex)
            {
                _log.Error(ex);
                throw new HttpException(400, "Could not parse JSON.  Must be an array of arrays.");
            }
        }
        
        /// <summary>
        /// Echo posted text payload as a text file.  To be used as an arbitrary structured file
        /// downloader for plugins.
        /// </summary>
        /// <returns></returns>
        public ActionResult Text()
        {
            var fileInfo = GetParameters(Request);
            return File(Encoding.Unicode.GetBytes(fileInfo.Content), "text/plain", fileInfo.Filename);
        }

        private DownloadInfo GetParameters(HttpRequestBase request)
        {
            if (request.Form["content"] == null)
            {
                throw new HttpException(400, "Content parameter is required.");
            }

            return new DownloadInfo
                {
                    Content = request.Form["content"],
                    Filename = Request.Form["filename"] ?? "download.csv"
                };
        }

        private struct DownloadInfo
        {
            public string Content;
            public string Filename;
        }
    }
}
