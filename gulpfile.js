// OR Capacity
var gulp         = require('gulp'),
    autoprefixer = require('gulp-autoprefixer'),
    cachebust    = require('gulp-cache-bust'),
    connect      = require('gulp-connect'),
    cssnano      = require('gulp-cssnano'),
    logger       = require('gulp-logger'),
    plumber      = require('gulp-plumber'),
    rename       = require('gulp-rename'),
    rucksack     = require('gulp-rucksack'),
    sass         = require('gulp-sass'),
    sourcemaps   = require('gulp-sourcemaps'),
    del          = require('del');

// Clean the build directory
gulp.task('clean:build', function () {
    return del.sync([
        './build/'
    ]);
});

// Compile Sass and move to build folder
gulp.task('css:build', function () {
    gulp.src('./scss/**/*.scss')
        .pipe(logger({
            before: 'Building CSS...',
            after: 'CSS Complete!',
            showChange: false
        }))
        // Watch for pipe errors and output to console
        .pipe(plumber())
        // Start SourceMaps
        .pipe(sourcemaps.init())
        // Run Sass
        .pipe(sass({
            outputStyle: 'nested',
            sync: true
        }))
        // PostCSS Toolkit
        .pipe(rucksack({
            fallbacks: true
        }))
        // Parse CSS and add vendor prefixes
        .pipe(autoprefixer({
            browsers: ['last 4 versions'],
            cascade: false
        }))
        //Remove ALL Comments and minify CSS if needed
        .pipe(cssnano({
            core: true, // set to true for minify
            discardComments: {
                removeAll: true
            }
        }))
        .pipe(rename({
            suffix: ".min"
        }))
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('./content/css'))
});

// Copy files to build folder
gulp.task('copy:core', function () {
    gulp.src(['./index.html', './content/templates/**/*','./favicon.ico'], {
            base: '.'
        })
        .pipe(cachebust({type: 'MD5'})) // Options are MD5 or Timestamp
        .pipe(gulp.dest('./build'));
    gulp.src([
        './content/**/*'], {
            base: '.'
        })
        .pipe(gulp.dest('./build'))
});

// Copy 3rd Party Dependencies to build folder - not needed for local dev
gulp.task('copy:build', function () {
    gulp.src('./lib/**/*').pipe(gulp.dest('./build/lib/'));
    gulp.src('./bower_components/**/*').pipe(gulp.dest('./build/bower_components/'))
});

// Start web server and watch for file changes with LiveReload
gulp.task('connect',['clean:build'], function () {
    connect.server({
        port: 8079,
        host: 'localhost',
        fallback: 'index.html',
        livereload: true
    })
    // Watch directories for changes and reload browser
    gulp.watch('./scss/**/*.scss',['css:build']);
    gulp.watch([
        'index.html',
        './content/**/*.html',
        './content/**/*.js',
        './content/**/*.css'],['reload']);
});

gulp.task('reload', function () {
    gulp.src(['./'])
        .pipe(connect.reload());
});


// Gulp run tasks
// Run this for local - local web server & watcher
gulp.task('app:dev',['clean:build','css:build','connect']);
// Run this for deployment - does not run local web server & watcher
gulp.task('app:build',['clean:build','css:build','copy:core','copy:build']);