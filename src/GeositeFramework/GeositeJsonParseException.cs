using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace GeositeFramework
{
    public class GeositeJsonParseException : Exception
    {
        public IList<string> ParseMessages;

        public GeositeJsonParseException(IList<string> parseMessages, string message, params object[] arguments)
            : base(String.Format(message, arguments))
        {
            ParseMessages = parseMessages;
        }
    }
}