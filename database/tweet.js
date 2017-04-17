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

                tweetDB.mediaFileBucket = new s.mongodb.GridFSBucket(db, {bucketName: 'mediaFileBucket'});

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
    var parent = s.mongodb.ObjectId(param.postedBy);
    var media = param.media;

    function addTweet(value) {
        return new When.promise(function (resolve, reject) {
            var tweetDoc = {
                createdAt: new Date(),
                content,
                postedBy,
                parent,
                media,
                interestValue: Math.floor((new Date()).getTime()/1000),
                like:0
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
            tweetDB.tweetColl.find({_id: id}).forEach(function (doc) {
                if(doc.media) s.tweetConn.getMediaFileBucket().delete(s.mongodb.ObjectID(doc.media));
                tweetDB.tweetColl.deleteOne({_id: id}, function (err, result) {
                    if(err) return reject({error: 'database error'});
                    if(result.result.n == 1) {
                        return resolve(result);
                    }
                    else return reject({error: 'tweet not found'});
                });
            }, function (err) {
                console.error(err);
                reject(err);
            });

        });
    }

    return deleteTweetDoc();
};

exports.searchTweet = function(param){
    if (param.beforeDate) var beforeDate = new Date(param.beforeDate);
    var limitDoc = 25;
    if(typeof param.limitDoc == 'number' && param.limitDoc<=100 && param.limitDoc>0 ) limitDoc = param.limitDoc;
    var userIDList = param.userIDList; // filter by userID array
    var searchText = param.searchText;
    var parent = param.parent;
    var replies = param.replies;
    var sortByInterest = param.sortByInterest;

    var resolveFunction;
    var query = {};
    /*if(!userIDList || userIDList.length == 0){}else{
        query.postedBy = {$in: userIDList};
    }*/
    if(userIDList){
        query.postedBy = {$in: userIDList};
    }
    if(searchText) query.$text = {$search: searchText};
    if(parent) query.parent = s.mongodb.ObjectID(parent);
    if(replies != undefined && !replies) query.parent = {$exists: false};
    resolveFunction = function (resolve, reject) {
        if(param.beforeDate) query.createdAt = {$lte: beforeDate};
        var cursor = tweetDB.tweetColl.find(query);
        if(sortByInterest) cursor = cursor.sort({interestValue:-1});
        else cursor = cursor.sort({createdAt:-1});
        cursor.limit(limitDoc).toArray(function (err, array) {
            if(err) {
                reject({error: err});
            }else{
                resolve(array);
            }
        });
    };

    return new Promise(resolveFunction);
};

exports.getMediaFileBucket = function(){
    return tweetDB.mediaFileBucket;
};

exports.modifyInterestValue = function(param){
    var _id = s.mongodb.ObjectID(param.tweetID);
    var value = param.value;

    function getTweetDoc() {
        return new When.promise(function (resolve, reject) {
            tweetDB.tweetColl.updateMany({_id}, {$inc:{interestValue:value}}, function (err, result) {
                if(err) return reject(err);
                return resolve();
            });
        });
    }

    return getTweetDoc();
};
exports.modifyLikeValue = function(param){
    var _id = s.mongodb.ObjectID(param.tweetID);
    var value = param.value;

    function getTweetDoc() {
        return new When.promise(function (resolve, reject) {
            tweetDB.tweetColl.updateMany({_id}, {$inc:{like:value}}, function (err, result) {
                if(err) return reject(err);
                return resolve();
            });
        });
    }

    return getTweetDoc();
};