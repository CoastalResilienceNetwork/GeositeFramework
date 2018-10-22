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
                // Add trailing slash if omitted (otherwise css/js refs break)
                // (See discussion at http://forums.asp.net/t/1897093.aspx/1?Trailing+Slash+Nightmare)
                if (!Request.Path.EndsWith("/"))
                {
                    return RedirectPermanent(Request.Url.ToString() + "/");
                }
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
