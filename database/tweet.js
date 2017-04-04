var When = require('when');
var RandomString = require('randomstring');
var SHA256 = require("crypto-js/sha256");
var CryptoJS = require('crypto-js');

var s;
var tweetDB = {}; // user related collection

exports.initDatabase = function (singleton, readyList) {
    s = singleton;

    // user_info initialization
    var tweetDBPath = s.dbPath + 'tweet';
    var tweetDBReady = When.defer();
    readyList.push(tweetDBReady.promise);
    console.log('try to connect to '+tweetDBPath);
    s.mongodb.MongoClient.connect(tweetDBPath, function (err, db) {
        function ready(db, err, result) {
            if (err) {
                console.error('MongodbClient connection ' + tweetDBPath + ' failed');
                process.exit(1);
            } else {
                console.log('MongodbClient connection to ' + tweetDBPath + ' has been established');

                tweetDB.tweetColl = db.collection('tweets');
                tweetDB.tweetColl.ensureIndex({createdAt: 1}, {background: true, w: 1});

                tweetDBReady.resolve();
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

exports.addTweet = function(param){
    var content = param.content;
    var postedBy = s.mongodb.ObjectId(param.postedBy);

    function addTweet(value) {
        return new When.promise(function (resolve, reject) {
            var tweetDoc = {
                createdAt: new Date(),
                content: content,
                postedBy: postedBy,
            };
            tweetDB.tweetColl.insertOne(tweetDoc, function (err, result) {
                if (!err) {
                    resolve(result);
                } else {
                    reject({error: 'database error'});
                }
            });
        });
    }

    return addTweet().then((result)=>{
        return {insertedID: result.insertedId};
    });
};

exports.getTweet = function(param){
    var id = s.mongodb.ObjectId(param.id);

    function getTweetDoc(value) {
        return new When.promise(function (resolve, reject) {
            tweetDB.tweetColl.findOne({_id: id}, function (err, result) {
                if(!err && result !== null) {
                    return resolve(result);
                }
                else return reject({error: 'tweet not found'});
            });
        });
    }

    return getTweetDoc();
};

exports.deleteTweet = function(param){
    var id = s.mongodb.ObjectId(param.id);

    function deleteTweetDoc(value) {
        return new When.promise(function (resolve, reject) {
            tweetDB.tweetColl.deleteOne({_id: id}, function (err, result) {
                if(err) return reject({error: 'database error'});
                if(result.result.n == 1) {
                    return resolve(result);
                }
                else return reject({error: 'tweet not found'});
            });
        });
    }

    return deleteTweetDoc();
};

exports.searchTweet = function(param){
    if (param.beforeDate) var beforeDate = new Date(param.beforeDate);
    var limitDoc = 25;
    if(typeof param.limitDoc == 'number' && param.limitDoc<=100 && param.limitDoc>0 ) limitDoc = param.limitDoc;

    function getTweetArray() {
        return new When.promise(function (resolve, reject) {
            var query = {};
            if(param.beforeDate) query.createdAt = {$lte: beforeDate};
            tweetDB.tweetColl.find(query).sort({createdAt:-1}).limit(limitDoc).toArray(function (err, array) {
                if(err) {
                    reject({error: err});
                }else{
                    resolve(array);
                }
            });
        });
    }

    return getTweetArray();
};