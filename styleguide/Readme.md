# Mantle
version: 0.1.0
A front end framework for use with GIS applications developed and maintained by Azavea.

---

## Getting Started
To get up and running, run `npm install` in your CLI in the project directory. Then run `grunt`. Your browser should automatically open `localhost:3000`. That's it. You are good to go.

## Upgrade the styleguide for GeositeFramework
* Get Started, from above
* Copy `app/assets/css/main.css` to `src/GeositeFramework/css/styleguide.css`
* Move the contents of `app/` to the branch `gh-pages` and push to origin
---

## Grunt
### Grunt Plugins
* [Grunt Browser Sync](https://www.npmjs.com/package/grunt-browser-sync)
* [Grunt Contrib Watch](https://www.npmjs.com/package/grunt-contrib-watch)
* [Grunt Postcss](https://www.npmjs.com/package/grunt-postcss)
	* Autoprefixer
	* cssnano
* [Grunt Sass](https://www.npmjs.com/package/grunt-sass)
* [Load Grunt Config](https://www.npmjs.com/package/load-grunt-config)
* [Load Grunt Tasks](https://www.npmjs.com/package/load-grunt-tasks)
* [Time Grunt](https://www.npmjs.com/package/time-grunt)
* [Grunt Newer](https://www.npmjs.com/package/grunt-newer)
	* Not currently in use
* Grunt Concurrent
	* Under consideration

---

#### Grunt Browser Sync
Live reload and browser syncing. This will automatically open `localhost:3000` and you can access broswesync settings at `localhost:3001`

#### Grunt Contrib Watch
Run predefined tasks whenever watched file patterns are added, changed or deleted. Currently this will compile sass and run postcss tasks

#### Grunt Postcss
Applies several post-processors to your CSS using PostCSS. Currently will run Autoprfixer and cssnano immediately after sass compiling

#### Grunt Sass
Compile Sass to CSS using node-sass/libsass

#### Load Grunt Config
Allows us to break up the Gruntfile config by task. Makes for a cleaner Gruntfile

#### Load Grunt Tasks
Load multiple grunt tasks using globbing patterns.

#### Time Grunt
Display the elapsed execution time of grunt tasks

#### Grunt Newer
*Not Currently In Use* Run Grunt tasks with only those source files modified since the last successful run.

#### Grunt Concurrent
*Under Consideration* Run grunt tasks concurrently

#### grunt-html-build
*Consider*
