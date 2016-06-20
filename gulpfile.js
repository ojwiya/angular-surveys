var gulp = require('gulp');
var del = require('del');
var merge = require('merge-stream');
var plugins = require('gulp-load-plugins')();
var Server = require('karma').Server;
var browserSync = require('browser-sync').create();

gulp.task('clean', function (cb) {
    return del(['tmp', 'dist'], cb);
});

gulp.task('build-css', ['clean'], function () {
    return gulp.src('./styles/*')
        .pipe(plugins.plumber({ errorHandler: onError }))
        .pipe(plugins.sass())
        .pipe(plugins.minifyCss())
        .pipe(plugins.rename({
            extname: '.min.css'
        }))
        .pipe(gulp.dest('./dist'));
});

gulp.task('build-tmp', ['build-css'], function () {
    var builderStream = buildTemp('src/builder/', 'mwFormBuilder');
    var viewerStream = buildTemp('src/viewer/', 'mwFormViewer');
    var utilsStream = buildTemp('src/utils/', 'mwFormUtils');
    return merge(builderStream, viewerStream, utilsStream);
});

gulp.task('default', ['build-tmp'], function () {
    var i18n = gulp.src('i18n/**/*.json').pipe(plugins.jsonminify()).pipe(gulp.dest('dist/i18n/'));

    var builderStream = buildModuleStream('form-builder', 'mwFormBuilder');
    var viewerStream = buildModuleStream('form-viewer', 'mwFormViewer');
    var utilsStream = buildModuleStream('form-utils', 'mwFormUtils');
    return merge(builderStream, viewerStream, utilsStream, i18n);
});

gulp.task('watch', function() {
    return gulp.watch(['i18n/**/*.json','./src/**/*.html', './styles/*.*css', 'src/**/*.js'], ['default']);
});

function buildTemp(src, moduleName) {

    var tmpDir = 'tmp/'+moduleName;

    var copy = gulp.src(src + '**/*').pipe(gulp.dest(tmpDir));



    return merge(copy);
}

function buildTemplates(src, moduleName, dest, filePrefix){
    return gulp.src(src + '**/*.html')
        .pipe(plugins.minifyHtml())
        .pipe(plugins.angularTemplatecache({
            module: moduleName,
            filename: filePrefix+'-tpls.min.js'
        }))
        .pipe(plugins.uglify())
        .pipe(gulp.dest(dest));
}

function buildModuleStream(destPrefix, moduleName) {

    var tmpDir = 'tmp/'+moduleName;

    var bootstrapTemplates = buildTemplates(tmpDir+'/templates/bootstrap/', moduleName, 'dist', destPrefix+'-bootstrap');
    var materialTemplates = buildTemplates(tmpDir+'/templates/material/', moduleName, 'dist', destPrefix+'-material');

    var module =  gulp.src(tmpDir + '/**/*.js')
        .pipe(plugins.plumber({ errorHandler: onError }))
        .pipe(plugins.angularFilesort())
        .pipe(plugins.ngAnnotate())
        .pipe(plugins.uglify())
        .pipe(plugins.stripDebug())
        .pipe(plugins.concat(destPrefix+'.min.js'))
        .pipe(gulp.dest('dist'));

    return merge(module, bootstrapTemplates, materialTemplates);
}

gulp.task('test', function (done) {
    new Server({
        configFile: __dirname + '/karma.conf.js',
        singleRun: true
    }, function() {
        done();
    }).start();
});

/**
 * Serve
 */

// error function for plumber
var onError = function (err) {
  console.log(err);
  this.emit('end');
};

gulp.task('default-watch', ['default'], ()=>{ browserSync.reload() });

// process.env.PORT lets the port be set by Heroku
var port = process.env.PORT || 8080;

gulp.task('serve', ['default'], ()=>{
        browserSync.init({
            server: {
                baseDir: "demo-material",
                index: "demo.html",
                routes: {
                    "/bower_components": "bower_components",
                    "/dist": "dist",
                    "/i18n": "i18n"
                }
            },
            port:  port,
            open: false,
            browser: "google-chrome"
        });
    gulp.watch(['i18n/**/*.json', './src/**/*.html', './styles/*.*css', 'src/**/*.js'], ['default-watch']); 
});