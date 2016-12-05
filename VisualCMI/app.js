var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var router = express.Router();

// import mesh view javascript
var MeshViewer = require('./meshviewer');

// import test mesh
// var testmesh = require('./testmesh.json');
var blueprintmesh = require('../convertor/blueprint_mesh.json');

// import js dom
var window = require('jsdom').jsdom().defaultView;

var app = express();

// Use environment defined port or 4000
var port = process.env.PORT || 4000;

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

var fs = require('fs');

var jsdom = require("jsdom");

var data = fs.readFileSync("./index.html", "utf8");

var document = jsdom.jsdom(data);

var viewer = new MeshViewer("meshdiv", document);
// viewer.loadData("rz", testmesh, document);
viewer.loadBlueprintData(blueprintmesh, document);
window.onresize = function() { viewer.updateViewBox(); }

/* GET home page. */
router.get('/', function(req, res, next) {
  res.send(document.documentElement.outerHTML);
});

app.use('/', router);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

module.exports = app;
