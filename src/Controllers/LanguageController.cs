using System;
using System.Web;
using System.Web.Mvc;
using log4net;

namespace GeositeFramework.Controllers
{
    public class LanguageController : Controller
    {
        private static readonly ILog _log =
            LogManager.GetLogger(System.Reflection.MethodBase.GetCurrentMethod().DeclaringType);

        /// <summary>
        /// Returns the translation JSON representation for a particular locale
        /// </summary>
        /// <returns></returns>
        public ActionResult GetLocale(string locale)
        {
            try {
                return Json(MvcApplication.Languages[locale], JsonRequestBehavior.AllowGet);
            } catch(Exception ex) {
                _log.Error(ex);
                throw new HttpException(500, String.Format("Invalid locale setting: {0}", locale));
            }
        }
    }
}
