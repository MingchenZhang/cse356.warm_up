var When = require('when');
var RandomString = require('randomstring');
var SHA256 = require("crypto-js/sha256");
var CryptoJS = require('crypto-js');

var s;
var loggingDB = {}; // user related collection

exports.initDatabase = function (singleton, readyList) {
    s = singleton;

    // user_info initialization
    var loggingDBPath = s.dbPath + 'eliza_logging';
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
        method: request.method
    };

    loggingDB.requestsColl.insertOne(record);
};