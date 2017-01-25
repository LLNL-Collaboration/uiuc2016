// Get the packages we need
var express = require('express');
var bodyParser = require('body-parser');
var router = express.Router();

// Create our Express application
var app = express();

// Use environment defined port or 4000
var port = process.env.PORT || 4000;

//Allow CORS so that backend and frontend could pe put on different servers
var allowCrossDomain = function(req, res, next) {
    res.header("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE");
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept");
    next();
};
app.use(allowCrossDomain);

// Use the body-parser package in our application
app.use(bodyParser.urlencoded({
  extended: true
}));

app.get('/', function(req, res) {
    res.json({ message: 'All our routes start with /api' });
});

// All our routes will start with /api
app.use('/api', router);

//Default route here
var homeRoute = router.route('/');

homeRoute.get(function(req, res) {
  res.json({ message: 'Hello World!' });
});


// fake database
var meshesArray = [ ];

//mesh route
var meshRoute = router.route('/meshes');

meshRoute.get(function(req, res) {
    if (meshesArray.length == 0) {
	return res.status(200).json({
	    message: "OK",	
	    "data": 'no available data'
	});
    } else {
	return res.status(200).json({
	    message: "OK",
	    "data": meshesArray
	});
    }
});

meshRoute.post(function(req, res) {
    if (req.query.meshname == undefined || req.query.meshdata == undefined) {
        return res.status(500).json({
            message: "Validation Error: A mesh name and  mesh data are required!",
        })
    }
    
    meshesArray.push({"meshnama": req.query.meshname, "meshdata": req.query.meshdata});
    
    return res.status(201).json({
        message: "mesh added",
        "data": [
	    {
		"meshnama": req.query.meshname,
		"meshdata": req.query.meshdata
	    }
	]
    });
});

//meshes/:id route

//var meshIdRoute = router.route('/meshs/:mesh_id');

//meshIdRoute.get(function(req, res) { });

app.get('*', function(req, res, next) {
    var err = new Error();
    err.status = 404;
    next(err);
});

// handling 404 errors
app.use(function(err, req, res, next) {
    if(err.status !== 404) {
	return next();
    }   

    res.json({ message: '404 not found, the url is incorrect' });
});

// Start the server
app.listen(port);
console.log('Server running on port ' + port); 
