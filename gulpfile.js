/*
Need to:
  - Load a web server
  - Watch changes in files
  - Reload browser when changes are made
  - Compile scss to css and serve to dist
*/

// -----------------------------------------------------------------------------
// Required libs
// -----------------------------------------------------------------------------

var gulp = require('gulp'),
  size = require('gulp-size'),
  plumber = require('gulp-plumber'),
  notify = require('gulp-notify'),
  sassLint = require('gulp-sass-lint'),
  del = require('del'),
  vinylPaths = require('vinyl-paths'),
  sourcemaps = require('gulp-sourcemaps'),
  colors = require('colors'),
  // Temporary solution until gulp 4
  // https://github.com/gulpjs/gulp/issues/355
  runSequence = require('run-sequence'),
  strip = require('gulp-strip-comments');
var rename = require('gulp-rename');
var sass = require('gulp-sass');
var cleanCSS = require('gulp-clean-css');
var postcss = require('gulp-postcss');
var autoprefixer = require('autoprefixer');
var browserSync = require('browser-sync');
var reload = browserSync.reload;

// -----------------------------------------------------------------------------
// Folder structure
// -----------------------------------------------------------------------------

var bases = {
  app: 'src/',
  dist: 'dist/'
};

// -----------------------------------------------------------------------------
// Minify HTML settings
// -----------------------------------------------------------------------------

var settings = {
  minHtml: false,
  removeHtmlComment: true
};

// -----------------------------------------------------------------------------
// Gulp error handling
// -----------------------------------------------------------------------------

colors.setTheme({
  silly: 'rainbow',
  input: 'grey',
  verbose: 'cyan',
  prompt: 'grey',
  info: 'green',
  data: 'grey',
  help: 'cyan',
  warn: 'yellow',
  debug: 'blue',
  error: 'red'
});

var displayError = function(error) {
  // Initial building up of the error
  var errorString = '[' + error.plugin.error.bold + ']';
  errorString += ' ' + error.message.replace('\n', ''); // Removes new line at the end

  // If the error contains the filename or line number add it to the string
  if (error.fileName) errorString += ' in ' + error.fileName;

  if (error.lineNumber) errorString += ' on line ' + error.lineNumber.bold;

  // This will output an error like the following:
  // [gulp-sass] error message in file_name on line 1
  console.error(errorString);
};

var onError = function(err) {
  notify.onError({
    title: 'Gulp',
    subtitle: 'Failure!',
    message: 'Error: <%= error.message %>',
    sound: 'Basso'
  })(err);
  this.emit('end');
};

var sassOptions = {
  outputStyle: 'expanded'
};

// -----------------------------------------------------------------------------
// Clean dist folder
// -----------------------------------------------------------------------------

gulp.task('clean:dist', function() {
  return gulp.src(bases.dist).pipe(vinylPaths(del));
});

// -----------------------------------------------------------------------------
// Style Compiling
// -----------------------------------------------------------------------------

gulp.task('styles', function() {
  return gulp
    .src(bases.app + 'scss/styles.scss')
    .pipe(plumber({ errorHandler: onError }))
    .pipe(sourcemaps.init())
    .pipe(sass(sassOptions))
    .pipe(size({ gzip: true, showFiles: true }))
    .pipe(postcss([autoprefixer()]))
    .pipe(rename('styles.css'))
    .pipe(gulp.dest(bases.dist + 'css'))
    .pipe(reload({ stream: true }))
    .pipe(
      cleanCSS({ debug: true }, function(details) {
        console.log(details.name + ': ' + details.stats.originalSize);
        console.log(details.name + ': ' + details.stats.minifiedSize);
      })
    )
    .pipe(size({ gzip: true, showFiles: true }))
    .pipe(rename({ suffix: '.min' }))
    .pipe(gulp.dest(bases.dist + 'css'));
});

// -----------------------------------------------------------------------------
// Sass/SCSS linting
// -----------------------------------------------------------------------------

gulp.task('sass-lint', function() {
  gulp
    .src([
      bases.app + 'scss/**/*.scss',
      '!' + bases.app + 'scss/libs/**/*.scss',
      '!' + bases.app + 'scss/libs/bootstrap4/_print.scss'
    ])
    .pipe(sassLint())
    .pipe(sassLint.format())
    .pipe(sassLint.failOnError());
});

// -----------------------------------------------------------------------------
// HTML Minification - Default setting: HTML not minified but comments removed
// -----------------------------------------------------------------------------

gulp.task('minify-html', function() {
  var pipelin = gulp.src(bases.app + './*.html');
  if (settings.removeHtmlComment) {
    pipelin.pipe(strip());
  }
  if (settings.minHtml) {
    pipelin.pipe(htmlmin({ collapseWhitespace: true }));
  }

  pipelin.pipe(gulp.dest(bases.dist)).pipe(reload({ stream: true }));
});

// -----------------------------------------------------------------------------
// Deploy HTML files to dist folder
// -----------------------------------------------------------------------------

gulp.task('html-deploy', function() {
  // Gets .html in pages
  return (
    gulp
      .src(bases.app + 'pages/**/*.html')
      // output files to dist folder
      .pipe(gulp.dest(bases.dist))
      .pipe(reload({ stream: true }))
  );
});

// -----------------------------------------------------------------------------
// Local server
// -----------------------------------------------------------------------------

gulp.task('browser-sync', function() {
  browserSync({
    server: {
      baseDir: bases.dist
    }
  });
});

// -----------------------------------------------------------------------------
// Watchers
// -----------------------------------------------------------------------------

gulp.task('watch', function() {
  gulp
    .watch(bases.app + 'scss/**/*.scss', ['styles'])
    .on('change', browserSync.reload);
  gulp
    .watch(bases.app + 'pages/*.html', ['minify-html', 'html-deploy'])
    .on('change', browserSync.reload);
});

gulp.task('default', function(done) {
  runSequence(
    'clean:dist',
    'styles',
    'minify-html',
    'html-deploy',
    'browser-sync',
    'watch',
    done
  );
});
