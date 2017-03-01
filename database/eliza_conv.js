var When = require('when');
var RandomString = require('randomstring');
var SHA256 = require("crypto-js/sha256");
var CryptoJS = require('crypto-js');

var s;
var convDB = {}; // user related collection

exports.initDatabase = function (singleton, readyList) {
    var s = singleton;
    
    // user_info initialization
    var convDBPath = s.dbPath + 'eliza_user_conv';
    var convDBReady = When.defer();
    readyList.push(convDBReady.promise);
    console.log('try to connect to '+convDBPath);
    s.mongodb.MongoClient.connect(convDBPath, function (err, db) {
        function ready(db, err, result) {
            if (err) {
                console.error('MongodbClient connection ' + convDBPath + ' failed');
                process.exit(1);
            } else {
                console.log('MongodbClient connection to ' + convDBPath + ' has been established');
    
                convDB.convColl = db.collection('eliza_conv');
                convDB.sessionColl = db.collection('eliza_session');
                
                convDBReady.resolve();
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

exports.addConversation = function (param) {
    var sessionToken = param.sessionToken;
    var sender = param.sender;
    var text = param.text;
    
    if(typeof sessionToken != 'string') return When.reject({status:"ERROR", error: 'session not recognized'});
    if(typeof sender != 'string') sender = 'undefined';
    if(typeof text != 'string') return When.reject({status:"ERROR", error: 'text not recognized'});
    
    function addConv(value) {
        return new When.promise(function (resolve, reject) {
            var convDoc = {
                createdAt: new Date(),
                sessionToken: sessionToken,
                sender: sender,
                text: text,
            };
            convDB.convColl.insertOne(convDoc, function (err, result) {
                if (!err) {
                    resolve(result);
                } else {
                    reject(err);
                }
            });
        });
    }
    
    function addSession() {
        return new When.promise(function (resolve, reject) {
            var convDoc = {
                createdAt: new Date(),
                sessionToken: sessionToken,
            };
            convDB.sessionColl.findOneAndUpdate(
                {sessionToken:sessionToken},
                {$set: {sessionToken:sessionToken}},
                {upsert:true},
                function (err, result) {
                if (!err) {
                    resolve(result);
                } else {
                    reject(err);
                }
            });
        });
    }
    
    return addConv().then(addSession);
};

exports.listConversation = function (param) {
    var sessionToken = param.sessionToken;
    
    if(typeof sessionToken != 'string') return When.reject({status:"ERROR", error: 'session not recognized'});
    
    function list(value) {
        return new When.promise(function (resolve, reject) {
            convDB.sessionColl.find().toArray(function (err, docs) {
                if(err) return reject({status:"ERROR", error: 'database error'});
                var results = [];
                docs.forEach(function(doc){
                    results.push({id:doc.sessionToken, start_date:doc._id.getTimestamp().toISOString()});
                });
                resolve(results);
            });
        })
    }
    
    return list();
};

exports.showConversation = function (param) {
    var id = param.id;
    
    if(typeof id != 'string') return When.reject({status:"ERROR", error: 'id not recognized'});
    
    function list(value) {
        return new When.promise(function (resolve, reject) {
            convDB.convColl.find({sessionToken: id}).sort(['createdAt', 1]).toArray(function (err, docs) {
                if (err) return reject({status:"ERROR", error: 'database error'});
                var results = [];
                docs.forEach(function (doc) {
                    results.push({timestamp: doc.createdAt, name: doc.sender, text: doc.text});
                });
                resolve(results);
            });
        });
    }
    
    return list();
};