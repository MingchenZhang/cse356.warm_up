var When = require('when');
var RandomString = require('randomstring');
var SHA256 = require("crypto-js/sha256");
var CryptoJS = require('crypto-js');
var Memcached = require('memcached');

const MEMCACHED_USERID = 'user_id=';
const MEMCACHED_USERNAME = 'user_username=';
const MEMCACHED_SESSION = 'user_session=';

var s;
var userDB = {}; // user related collection
var loginDB = {}; // login related collection
var memcached = null;

exports.initDatabase = function (singleton, readyList) {
    s = singleton;

    // user_info initialization
    var userDBPath = (s.userDBPath || s.dbPath) + 'eliza_user_info';
    var userDBReady = When.defer();
    readyList.push(userDBReady.promise);
    console.log('try to connect to '+userDBPath);
    s.mongodb.MongoClient.connect(userDBPath, function (err, db) {
        function ready(db, err, result) {
            if (err) {
                console.error('MongodbClient connection ' + userDBPath + ' failed');
                process.exit(1);
            } else {
                console.log('MongodbClient connection to ' + userDBPath + ' has been established');

                userDB.userBasicColl = db.collection('basic_info');
                userDB.userBasicColl.createIndex({username:1});

                userDB.followColl = db.collection('follow');
                userDB.followColl.createIndex({follower: 1});
                userDB.followColl.createIndex({followed: 1});

                userDB.userEmailVeriColl = db.collection('email_pending_list');

                userDB.userForgetPassColl = db.collection('password_recovery_list');

                userDBReady.resolve();
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

    s.loginSession = {};
    // login_session initialization
    var loginDBPath = (s.userDBPath || s.dbPath) + 'eliza_login_session';
    var loginDBReady = When.defer();
    readyList.push(loginDBReady.promise);
    console.log('try to connect to '+loginDBPath);
    s.mongodb.MongoClient.connect(loginDBPath, function (err, db) {
        function ready(db, err, result) {
            if (err) {
                console.error('MongodbClient connection ' + loginDBPath + ' failed');
                process.exit(1);
            } else {
                console.log('MongodbClient connection to ' + loginDBPath + ' has been established');

                loginDB.sessionColl = db.collection('sessions');
                loginDB.sessionColl.createIndex({sessionToken: 1});

                loginDBReady.resolve();
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

    if(s.userConnMemcache) memcached = new Memcached(s.userConnMemcache);
};

function calculateHashedPassword(password, salt) {
    var v = password + salt;
    for (var i = 0; i < 1; i++) {
        v = SHA256(v).toString(CryptoJS.enc.Hex);
    }
    return v;
}

exports.createUser = function(param){
    var username = param.username;
    var email = param.email;
    var password = param.password;
    var emailVerified = param.emailVerified || false;

    function paramCheck() {
        return new When.promise(function (resolve, reject) {
            if (typeof email !== 'string' || email.match('^([a-z0-9_\\.-]+)@([\\da-z\\.-]+)\\.([a-z\\.]{2,6})$') === null)
                reject(new Error('email format error'));
            else if (typeof password !== 'string')// || password.match('^.{4,}$') === null
                reject(new Error('password format error'));
            else if (typeof username !== 'string')// || username.match('^.{4,}$') === null
                reject(new Error('username format error'));
            else resolve();
        });
    }

    function usernameNotExist() {
        return new When.promise(function (resolve, reject) {
            userDB.userBasicColl.findOne({username: username, emailVerified:true}, function (err, result) {
                if(err) return reject(new Error('database error'));
                if (result === null) resolve();
                else reject(new Error('username existed'));
            });
        });
    }

    function createUser() {
        return new When.promise(function (resolve, reject) {
            var userDoc = {};
            userDoc.username = username;
            userDoc.email = email;
            userDoc.passwordSalt = RandomString.generate({
                length: 12,
                charset: 'alphabetic'
            });
            userDoc.hashedPassword = calculateHashedPassword(password, userDoc.passwordSalt);
            userDoc.emailVerified = emailVerified;
            userDoc.createdAt = new Date();
            userDB.userBasicColl.updateMany({username: username}, {$set: userDoc}, {
                upsert: true,
                w: 1,
                new: true
            }, function (err, result) {
                if (!err) {
                    if(result.upsertedId && result.upsertedId._id){
                        if(memcached) memcached.replace(MEMCACHED_USERID+result.upsertedId._id, JSON.stringify(userDoc), 3600);
                    }
                    if(memcached) memcached.replace(MEMCACHED_USERNAME+username, JSON.stringify(userDoc), 3600);
                    resolve();
                } else {
                    reject(err);
                }
            });
        });
    }

    function generateEmailTokenInDB(userDoc) {
        return new When.promise(function (resolve, reject) {
            var email = {};
            email.userID = userDoc._id;
            email.validationToken = RandomString.generate({
                length: 30,
                charset: 'alphabetic'
            });
            email.createdAt = new Date();
            userDB.userEmailVeriColl.insertOne(email, function (err, result) {
                if (!err) {
                    resolve(email);
                } else {
                    reject(err);
                }
            });
        });
    }

    return paramCheck()
            .then(usernameNotExist)
            .then(createUser)
            .then(()=>{
                return userDB.userBasicColl.findOne({username:username})
            }).then((value)=>{
                if(emailVerified) return value; else return generateEmailTokenInDB(value)
            });
};

exports.emailVerify = function (param) {
    var token = param.token;

    function paramCheck(){
        return new When.promise(function (resolve, reject) {
            if (typeof token !== 'string') return reject(new Error('format error'));
            else return resolve();
        });
    }

    function getUserID(value) {
        return new When.promise(function (resolve, reject) {
            userDB.userEmailVeriColl.findOne({validationToken: token}, function (err, result) { // NOTE: findOne will not produce an err if it does not found
                if(err) reject(new Error('database error'));
                else if (!result) reject(new Error('token not found'));
                else resolve(result.userID);
            });
        });
    }

    function verifyEmail(userID) {
        return new When.promise(function (resolve, reject) {
            userDB.userBasicColl.updateMany({
                _id: userID
            }, {$set: {emailVerified: true}}, function (err, result) {
                if (result.matchedCount == 0) {
                    reject(new Error('user not found'));
                } else {
                    resolve(result.value);
                }
            });
        });
    }

    return paramCheck()
        .then(getUserID)
        .then(verifyEmail)
};

exports.emailVerifyDirectly = function (param) {
    var email = param.email;
    
    if(typeof email != 'string') return When.reject(new Error('format error'));
    
    function verifyEmail(userID) {
        return new When.promise(function (resolve, reject) {
            userDB.userBasicColl.updateMany({
                email: email
            }, {$set: {emailVerified: true}}, function (err, result) {
                if(err) {console.error(err); reject(new Error('format error'));}
                if (result.matchedCount == 0) {
                    reject(new Error('user not found'));
                } else {

                    resolve(result.value);
                }
            });
        });
    }
    
    return verifyEmail();
};

exports.userLogin = function (param) {
    var username = param.username;
    var password = param.password;
    
    function paramCheck(){
        return new When.promise(function (resolve, reject) {
            if (typeof username !== 'string')
                return reject(new Error('format error'));
            if (typeof password !== 'string')
                return reject(new Error('format error'));
            else return resolve();
        });
    }
    
    function getUserBasic(value) {
        return new When.promise(function (resolve, reject) {
            userDB.userBasicColl.findOne({username: username}, function (err, result) {
                if(!err && result !== null) {
                    if(!result.emailVerified) return reject(new Error('email not verified'));
                    if(memcached) memcached.replace(MEMCACHED_USERID+result._id, JSON.stringify(result), 3600);
                    if(memcached) memcached.replace(MEMCACHED_USERNAME+result.username, JSON.stringify(result), 3600);
                    return resolve(result);
                }
                else return reject(new Error('account not found'));
            });
        });
    }
    
    function comparePassword(userBasic) {
        return new When.promise(function (resolve, reject) {
            var userGivenHP = calculateHashedPassword(password, userBasic.passwordSalt);
            if(userGivenHP === userBasic.hashedPassword) return resolve(userBasic);
            else return reject(new Error('password incorrect'));
        });
    }
    
    function createSession(userBasic){
        return new When.promise(function (resolve, reject) {
            var sessionToken = RandomString.generate({
                length: 128,
                charset: 'alphabetic'
            });
            var session = {
                sessionToken: sessionToken,
                userID: userBasic._id,
                info:{
                    username: userBasic.username,
                    email: userBasic.email,
                }
            };
            loginDB.sessionColl.insertOne(session, function (err, result) {
                if(err) return reject(err);
                if(memcached) memcached.replace(MEMCACHED_SESSION+sessionToken, JSON.stringify(session), 3600);
                resolve(session);
            });
        });
    }
    
    return paramCheck()
        .then(getUserBasic)
        .then(comparePassword)
        .then(createSession)
};

exports.logoutSession = (param)=>{
    var sessionToken = param.sessionToken;

    function removeSession(value) {
        return new When.promise(function (resolve, reject) {
            loginDB.sessionColl.deleteMany({sessionToken: sessionToken},
                function (err, result) {
                    if(err) return reject(new Error('database error'));
                    if(memcached) memcached.del(MEMCACHED_SESSION+sessionToken);
                    return resolve();
                });
        });
    }
    
    return removeSession();
};

exports.getSession = (param) => {
    var sessionToken = param.sessionToken;

    function lookUpCache(){
        if(!memcached) return When.resolve(null);
        return new When.promise(function (resolve, reject) {
            if(!memcached) return resolve(null);
            memcached.get(MEMCACHED_SESSION+sessionToken, (err, data)=>{
                if(err) return reject(new Error('memcached error'));
                if(data) return resolve(JSON.parse(data));
                else return resolve(null);
            });
        });
    }

    function getSession() {
        return new When.promise(function (resolve, reject) {
            loginDB.sessionColl.findOne({sessionToken: sessionToken}, function (err, result) {
                if (err) {
                    console.error(err);
                    reject(new Error('database error'));
                }
                if (result !== null) {
                    if(memcached) memcached.replace(MEMCACHED_SESSION+sessionToken, JSON.stringify(result));
                    return resolve(result);
                }
                else return reject(new Error('session not found'));
            });
        });
    }

    return lookUpCache().then((cache)=>{return cache || getSession()});
};

exports.getUserBasicInfo = function(param){
    var userID = param.userID;

    function lookUpCache(){
        if(!memcached) return When.resolve(null);
        return new When.promise(function (resolve, reject) {
            if(!memcached) return resolve(null);
            memcached.get(MEMCACHED_USERID+userID, (err, data)=>{
                if(err) return reject(new Error('memcached error'));
                if(data) return resolve(JSON.parse(data));
                else return resolve(null);
            });
        });
    }

    function getUserBasic() {
        return new When.promise(function (resolve, reject) {
            userDB.userBasicColl.findOne({_id: userID}, function (err, result) {
                if(err) return reject(new Error('database error'));
                if(result !== null) {
                    if(memcached) memcached.replace(MEMCACHED_USERID+result._id, JSON.stringify(result));
                    if(memcached) memcached.replace(MEMCACHED_USERNAME+result.username, JSON.stringify(result));
                    return resolve(result);
                }else{
                    return reject(new Error('account not found'));
                }
            });
        });
    }

    return lookUpCache().then((cache)=>{return cache || getUserBasic()});
};

exports.getUserBasicInfoByUsername = function(param){
    var username = param.username;

    function lookUpCache(){
        if(!memcached) return When.resolve(null);
        return new When.promise(function (resolve, reject) {
            if(!memcached) return resolve(null);
            memcached.get(MEMCACHED_USERNAME+username, (err, data)=>{
                if(err) return reject(new Error('memcached error'));
                if(data) return resolve(JSON.parse(data));
                else return resolve(null);
            });
        });
    }

    function getUserBasic(value) {
        return new When.promise(function (resolve, reject) {
            userDB.userBasicColl.findOne({username}, function (err, result) {
                if(err) return reject(new Error('database error'));
                if(result !== null) {
                    if(memcached) memcached.replace(MEMCACHED_USERID+result._id, JSON.stringify(result));
                    if(memcached) memcached.replace(MEMCACHED_USERNAME+result.username, JSON.stringify(result));
                    return resolve(result);
                }else{
                    return reject(new Error('account not found'));
                }
            });
        });
    }

    return lookUpCache().then((cache)=>{return cache || getUserBasic()});
};

exports.follow = function (param) {
    var follower = s.mongodb.ObjectId(param.follower);
    var followed = s.mongodb.ObjectId(param.followed);// both are ID

    // return userDB.followColl.count({follower, followed}).then((count)=>{
    //     if(count == 0) return userDB.followColl.insertOne({follower, followed});
    //     else throw new {error:"followed already"};
    // });
    return userDB.followColl.updateMany({follower, followed}, {$set: {follower, followed}}, {upsert: true});
};

exports.unfollow = function(param){
    var follower = s.mongodb.ObjectId(param.follower);
    var followed = s.mongodb.ObjectId(param.followed);// both are ID

    return userDB.followColl.deleteMany({follower, followed});
};

exports.listFollowed = function (param) {
    var follower = s.mongodb.ObjectId(param.follower);
    var limit = param.limit;

    if(typeof limit == 'number') return userDB.followColl.find({follower}).limit(limit).toArray();
    else return userDB.followColl.find({follower}).limit(200).toArray();
};

exports.listFollower = function (param) {
    var followed = s.mongodb.ObjectId(param.followed);
    var limit = parseInt(param.limit);

    if(typeof limit == 'number') return userDB.followColl.find({followed}).limit(limit).toArray();
    else return userDB.followColl.find({followed}).limit(200).toArray();
};

