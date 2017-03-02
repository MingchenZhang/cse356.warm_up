var Express = require('express');
var CookieParser = require('cookie-parser');
var Helmet = require('helmet');
var Mongodb = require('mongodb');
var Cluster = require('cluster');
var When = require('when');
var Ejs = require('ejs');
var BodyParser = require('body-parser');

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
    var s = {
        dbPath: (process.env.DB_PATH || 'mongodb://localhost:27017/'),
        dbAuth: {username: process.env.DB_USERNAME || null, password: process.env.DB_PASSWORD || null},
        mongodb: Mongodb,
        userConn: null,
        tools: require('./tools').getToolSet(s)
    };

    var startupPromises = []; // wait for all initialization to finish

    // DB initialization ---------------------------
    s.userConn = require('./database/user_db');
    s.userConn.initDatabase(s, startupPromises);
    s.convConn = require('./database/eliza_conv');
    s.convConn.initDatabase(s, startupPromises);
    s.logConn = require('./database/logging');
    s.logConn.initDatabase(s, startupPromises);

    // web server initialization
    var app = Express();

    // debug logging
    var jsonParser = BodyParser.json({limit: '10kb'});
    app.use(jsonParser, (req, res, next)=>{
        s.logConn.logRequest(req);
        next();
    });

    // secure with Helmet
    app.use(Helmet());
    // set default template engine
    app.set('view engine', 'ejs');

    // process static request directly
    app.use('/static', Express.static(__dirname + '/static'));

    // cookie parser
    app.use(CookieParser());

    // reinitialize ejs variable
    // LOADER: ejs include record
    app.use((req, res, next) => {
        res.locals = {
            LOADER:{},
            loginToHome: false
        };
        next();
    });

    // Add user login session lookup
    app.use((req, res, next) => {
        req.userLoginInfo = null;
        res.locals.userLoginInfo = null;
        if(typeof req.cookies.login_session == 'string'){
            s.userConn.getSession({lan:s.lanCN, sessionToken:req.cookies.login_session})
                .then((session)=>{
                    req.userLoginInfo = session;
                    res.locals.userLoginInfo = session;
                    next();
                })
                .catch((err)=>{
                    res.clearCookie('login_session');
                    next();
                })
        }else next();
    });

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
    When.all(startupPromises).then(function () {
        var httpPort = process.env.HTTP_PORT || 3000;
        app.listen(httpPort, function () {
            console.log(('app (' + process.pid + ') is listening on port ' + httpPort));
        });
    });
}


