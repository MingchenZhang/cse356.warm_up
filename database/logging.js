var When = require('when');

var s;
var loggingDB = {}; // user related collection

exports.initDatabase = function (singleton, readyList) {
    s = singleton;

    // user_info initialization
    var loggingDBPath = (s.logDBPath || s.dbPath) + 'eliza_logging';
    var loggingDBReady = When.defer();
    readyList.push(loggingDBReady.promise);
    console.log('try to connect to '+loggingDBPath);
    s.mongodb.MongoClient.connect(loggingDBPath, function (err, db) {
        function ready(db, err, result) {
            if (err) {
                console.error('MongodbClient connection ' + loggingDBPath + ' failed');
                process.exit(1);
            } else {
                console.log('MongodbClient connection to ' + loggingDBPath + ' has been established');

                loggingDB.requestsColl = db.collection('requests');
                loggingDB.requestsColl.createIndex({time: 1});
                loggingDB.perfLofColl = db.collection('perfLog');

                loggingDBReady.resolve();
            }
        }

        if (s.dbAuth.username && s.dbAuth.password) {
            db.admin().authenticate(s.dbAuth.username, s.dbAuth.password, function (err, result) {
                ready(db, err, result);
            });
        } else {
            ready(db, err, null);
        }
    });
};

exports.logRequest = function(request){

    var record = {
        time: new Date(),
        ip: request.ip,
        url: request.originalUrl,
        method: request.method,
        body: request.body
    };

    return loggingDB.requestsColl.insertOne(record);
};

exports.perfLog = function (info) {
    if(info.totalTime && info.totalTime[0] >= 1)
        return loggingDB.perfLofColl.insertOne(Object.assign(info, {time: new Date()}));
    else
        return When.resolve();
};