using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using GeositeFramework.Helpers;
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
            try
            {
                return View(MvcApplication.GeositeData);
            }
            catch (Exception ex)
            {
                _log.Error(ex.Message);
                throw;   // Will display /Error.html
            }
        }

    }
}
