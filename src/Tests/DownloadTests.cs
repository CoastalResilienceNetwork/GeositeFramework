using System;
using GeositeFramework.Helpers;
using NUnit.Framework;

namespace GeositeFramework.Tests
{
    public class DownloadTests
    {
        private const string jsonStrings = "[\"a\", \"b\", \"c\"]";
        readonly string jsonStringsExpected = "\"a\",\"b\",\"c\"" + Environment.NewLine;

        private const string jsonMixed = "[\"a\", \"b\", 33]";
        readonly string jsonMixedExpected = "\"a\",\"b\",33" + Environment.NewLine;

        private static string Wrap(String[] lines)
        {
            return "[" + String.Join(",", lines) + "]";
        }

        [Test]
        public void TestStrings()
        {
            var result = CsvHelper.JsonToCsv(Wrap(new [] {jsonStrings}));
            Assert.AreEqual(jsonStringsExpected, result, "Did not format string CSV correctly");
        }

        [Test]
        public void TestMixed()
        {
            var result = CsvHelper.JsonToCsv(Wrap(new [] {jsonMixed}));
            Assert.AreEqual(jsonMixedExpected, result, "Did not format mixed string and non-string CSV correctly");
        }

        [Test]
        public void TestMultiline()
        {
            var result = CsvHelper.JsonToCsv(Wrap( new [] {jsonStrings, jsonMixed }));
            var expected = jsonStringsExpected + jsonMixedExpected;
            Assert.AreEqual(expected, result, "Did not format mixed multiline CSV correctly");
        }

        [Test]
        public void TestEscaped()
        {
            var withQuotes = "[\"\\\"hi\\\", he said\",2,4]";
            var escapedExpected = "\"\"\"hi\"\", he said\",2,4" + Environment.NewLine;
            
            var result = CsvHelper.JsonToCsv(Wrap(new [] {withQuotes}));
            Assert.AreEqual(escapedExpected, result, "Did not escape quoted string CSV correctly");
        }
    }
}