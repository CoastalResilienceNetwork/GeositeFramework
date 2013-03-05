using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using log4net;

namespace GeositeFramework.Controllers
{
    public class HomeController : Controller
    {
        private static readonly ILog _log = LogManager.GetLogger(System.Reflection.MethodBase.GetCurrentMethod().DeclaringType);

        //
        // GET: /Home/

        public ActionResult Index()
        {
            var app = HttpContext.ApplicationInstance as MvcApplication;
            try
            {
                return View(app.GeositeData);
            }
            catch (GeositeJsonParseException ex)
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

    }
}
