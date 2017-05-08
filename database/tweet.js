var When = require('when');

var s;
var tweetDB = {}; // user related collection
var fileDB = {}; // user related collection
var memcached;

const MEMCACHED_TWEETID = 'tweet_id=';


exports.initDatabase = function (singleton, readyList) {
    s = singleton;

    // user_info initialization
    var tweetDBPath = (s.tweetDBPath || s.dbPath) + 'tweet';
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
                tweetDB.tweetColl.createIndex({postedBy: 1});
                tweetDB.tweetColl.createIndex({content: "text"});
                tweetDB.tweetColl.createIndex({createdAt: -1});
                tweetDB.tweetColl.createIndex({parent:1});
                tweetDB.tweetColl.createIndex({interestValue:1});

                // tweetDB.mediaFileBucket = new s.mongodb.GridFSBucket(db, {bucketName: 'mediaFileBucket'});

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

    // file initialization
    var fileDBPath = (s.mediaDBPath || s.dbPath) + 'file';
    var fileDBReady = When.defer();
    readyList.push(fileDBReady.promise);
    console.log('try to connect to '+fileDBPath);
    s.mongodb.MongoClient.connect(fileDBPath, function (err, db) {
        function ready(db, err, result) {
            if (err) {
                console.error('MongodbClient connection ' + fileDBPath + ' failed');
                process.exit(1);
            } else {
                console.log('MongodbClient connection to ' + fileDBPath + ' has been established');

                fileDB.mediaFileBucket = new s.mongodb.GridFSBucket(db, {bucketName: 'mediaFileBucket'});

                fileDBReady.resolve();
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

    if(s.tweetConnMemcache) memcached = new Memcached(s.tweetConnMemcache);
};

exports.addTweet = function(param){
    var content = param.content;
    var postedBy = s.mongodb.ObjectId(param.postedBy);
    var parent = s.mongodb.ObjectId(param.parent);
    var media = param.media;

    var tweetDoc = {
        createdAt: new Date(),
        content,
        postedBy,
        parent,
        media,
        interestValue: Math.floor((new Date()).getTime()/1000),
        like:0
    };

    function addTweet(value) {
        return new When.promise(function (resolve, reject) {

            tweetDB.tweetColl.insertOne(tweetDoc, function (err, result) {
                if (!err) {
                    resolve(result);
                } else {
                    reject(new Error('database error'));
                }
            });
        });
    }

    return addTweet().then((result)=>{
        if(memcached) memcached.replace(MEMCACHED_TWEETID+result.insertedId, JSON.stringify(tweetDoc));
        return {insertedID: result.insertedId};
    });
};

exports.getTweet = function(param){
    var id = s.mongodb.ObjectId(param.id);

    function lookUpCache(){
        if(!memcached) return When.resolve(null);
        return new When.promise(function (resolve, reject) {
            if(!memcached) return resolve(null);
            memcached.get(MEMCACHED_TWEETID+id, (err, data)=>{
                if(err) return reject(new Error('memcached error'));
                if(data) return resolve(JSON.parse(data));
                else return resolve(null);
            });
        });
    }

    function getTweetDoc(value) {
        return new When.promise(function (resolve, reject) {
            tweetDB.tweetColl.findOne({_id: id}, function (err, result) {
                if(!err && result !== null) {
                    return resolve(result);
                }
                else return reject(new Error('tweet not found'));
            });
        });
    }

    return lookUpCache().then((cache)=>{return cache || getTweetDoc()});
};

exports.deleteTweet = function(param){
    var id = s.mongodb.ObjectId(param.id);

    function deleteTweetDoc(value) {
        return new When.promise(function (resolve, reject) {
            tweetDB.tweetColl.findOne({_id: id}, function (err, doc) {
                if(err) return reject(err);
                if(!doc) return reject(new Error('unable to delete'));
                if(doc.media) doc.media.forEach((m)=>{
                    s.tweetConn.getMediaFileBucket().delete(s.mongodb.ObjectID(m));
                });
                tweetDB.tweetColl.deleteMany({_id: id}, function (err, result) {
                    if(err) return reject(new Error('database error'));
                    if(result.result.n >= 1) {
                        return resolve(result);
                    }else{
                        return reject(new Error('unable to delete'));
                    }
                });
            });
        });
    }

    return deleteTweetDoc().then((result)=>{
        if(memcached) memcached.del(MEMCACHED_TWEETID+id);
        return result;
    });
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
    if(searchText) query.$text = {$search: searchText, $diacriticSensitive: true};
    if(parent) query.parent = s.mongodb.ObjectID(parent);
    if(replies != undefined && !replies) query.parent = {$exists: false};
    resolveFunction = function (resolve, reject) {
        if(param.beforeDate) query.createdAt = {$lte: beforeDate};
        var cursor = tweetDB.tweetColl.find(query);
        if(sortByInterest) cursor = cursor.sort({interestValue:-1});
        else cursor = cursor.sort({createdAt:-1});
        cursor.limit(limitDoc).toArray(function (err, array) {
            if(err) {
                reject(err);
            }else{
                resolve(array);
            }
        });
    };

    return new Promise(resolveFunction);
};

exports.getMediaFileBucket = function(){
    return fileDB.mediaFileBucket;
};

exports.modifyInterestValue = function(param){
    var _id = s.mongodb.ObjectID(param.tweetID);
    var value = param.value;

    function getTweetDoc() {
        return new When.promise(function (resolve, reject) {
            tweetDB.tweetColl.updateMany({_id}, {$inc:{interestValue:value}}, function (err, result) {
                if(err) return reject(err);
                if(memcached) memcached.del(MEMCACHED_TWEETID+_id);
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
                if(memcached) memcached.del(MEMCACHED_TWEETID+_id);
                return resolve();
            });
        });
    }

    return getTweetDoc();
};