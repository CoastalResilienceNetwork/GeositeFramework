# A collection of tools and scripts for testing JavaScript #

The repository contains these third-party tools:

1. The [Jasmine][] javascript assertion framework.
2. A JUnit compatible XML generator for Jasmine from the [Jasmine Reporters][]
project.
3. The [PhantomJS][] headless webkit browser.
4. The [JsTestDriver][] remote JavaScript console.
5. The [Jasmine JsTestDriver Adapter][].

I chose Jasmine as the assertion framework because:

1. I like the readability of the expect(thing).toHaveSomeProperty()
syntax.
2. It plays nicely with the DOM, but it is not dependant on running in a
browser, so it can also be used for NodeJS testing.
3. It is under active development.
4. The maintainer spoke at Philly ETE 2011 and seemed like a sharp,
pragmatic guy.

JavaScript tests written using the Jasmine framework can be run on
the command line using one of the two included tool chains:

1. By building a Jasmine standard HTML test page and using the included
scripts to load that page into PhantomJS.
2. By writing a JsTestDriver config file and using the included scripts
to launch a JsTestDriver server, and run the tests in one or more captured
browsers.

The runPhantom.py script takes a directory as a command line
paramter. The script searches the directory recursively for any HTML
file that contains the line "jasmin.getEnv.execute()" then opens those
HTML files, one at a time, in the Python implementation of PhantomJS.
Loading the page in PhantomJS triggers the execution of the Jasmine
tests.

The runPhantom.bat and runPhantom shell scripts are
'bootloaders' that execute the runPhantom.py assuming
that JsTestTools repository is checked out in a subdirectory of the root
of the project being tested.

The jstdServer.sh shell script handles launching a JSTestDriver server.

The runJstd.py script takes a directory as a command line
paramter. The script searches the directory recursively for any .conf
file that contains "server:" then passes those JSTestDriver
configuration files, one at a time, as the --config option in a new
JSTestDriver test session.

The runJstd.bat and runJstd shell scripts are
'bootloaders' that execute the runJstd.py assuming that JsTestTools
repository is checked out in a subdirectory of the root of the project being
tested.

[Jasmine]: http://pivotal.github.com/jasmine/
[Jasmine Reporters]: https://github.com/easel/jasmine-reporters
[PhantomJS]: http://www.phantomjs.org/
[JsTestDriver]: http://code.google.com/p/js-test-driver/
[Jasmine JsTestDriver Adapter]: https://github.com/ibolmo/jasmine-jstd-adapter
