var Express = require('express');
var Helmet = require('helmet');
var Cluster = require('cluster');
var When = require('when');
var Ejs = require('ejs');

if (Cluster.isMaster) {
    var numWorkers = process.env.WORKERS || 1;
    console.log('Master cluster setting up ' + numWorkers + ' workers...');
    for (var i = 0; i < numWorkers; i++) {
        Cluster.fork();
    }
    Cluster.on('online', function (worker) {
        console.log('Worker ' + worker.process.pid + ' is online');
    });
    Cluster.on('exit', function (worker, code, signal) {
        console.log('Worker ' + worker.process.pid + ' died with code: ' + code + ', and signal: ' + signal);
        console.log('Starting a new worker');
        Cluster.fork();
    });
} else {
    var s = {};

    // web server initialization
    var app = Express();

    // secure with Helmet
    app.use(Helmet());
    // set default template engine
    app.set('view engine', 'ejs');

    // process static request directly
    app.use('/static', Express.static(__dirname + '/static'));

    // --------------------routes section-------------------
    app.use('/', require('./routes').generateRouter(s));

    // ---------------error handling section ---------------
    // 404 error
    app.all('*', function (req, res, next) {
        res.status(404).send('404 Not Found');
    });
    // default error handling
    app.use(function (err, req, res, next) {
        console.error(err.stack);
        res.status(500).send('server error');
    });
	
	// start up server
	var httpPort = process.env.HTTP_PORT || 3000;
	app.listen(httpPort, function () {
		console.log(('app (' + process.pid + ') is listening on port ' + httpPort).green);
	});
}


