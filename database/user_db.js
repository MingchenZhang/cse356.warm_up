var When = require('when');
var RandomString = require('randomstring');
var SHA256 = require("crypto-js/sha256");
var CryptoJS = require('crypto-js');

var s;
var userDB = {}; // user related collection
var login = {}; // login related collection

exports.initDatabase = function (singleton, readyList) {
    var s = singleton;

    // user_info initialization
    var userDBPath = s.dbPath + 'eliza_user_info';
    var userDBReady = When.defer();
    readyList.push(userDBReady.promise);
    s.mongodb.MongoClient.connect(userDBPath, function (err, db) {
        function ready(db, err, result) {
            if (err) {
                console.error('MongodbClient connection ' + userDBPath + ' failed');
                process.exit(1);
            } else {
                console.log('MongodbClient connection to ' + userDBPath + ' has been established');

                userDB.userBasicColl = db.collection('basic_info');

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
    var loginDBPath = s.dbPath + 'eliza_login_session';
    var loginDBReady = When.defer();
    readyList.push(loginDBReady.promise);
    s.mongodb.MongoClient.connect(loginDBPath, function (err, db) {
        function ready(db, err, result) {
            if (err) {
                console.error('MongodbClient connection ' + loginDBPath + ' failed');
                process.exit(1);
            } else {
                console.log('MongodbClient connection to ' + loginDBPath + ' has been established');

                login.sessionColl = db.collection('sessions');

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
};

function calculateHashedPassword(password, salt) {
    var v = password + salt;
    for (var i = 0; i < 100; i++) {
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
                reject({error: 'email format error'});
            else if (typeof password !== 'string' || password.match('^.{4,}$') === null)
                reject({error: 'password format error'});
            else if (typeof username !== 'string' || username.match('^.{4,}$') === null)
                reject({error: 'username format error'});
            else resolve();
        });
    }

    function usernameNotExist() {
        return function (value) {
            return new When.promise(function (resolve, reject) {
                userDB.userBasicColl.findOne({username: username}, function (err, result) {
                    if(err) return reject({error: 'database error'});
                    if (result === null) resolve();
                    else reject({error: 'username existed'});
                });
            });
        };
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
            userDB.userBasicColl.findAndModify({email: email}, [['email', 1]], userDoc, {
                upsert: true,
                w: 1,
                new: true
            }, function (err, result) {
                if (!err) {
                    resolve(result.value);
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
            .then((value)=>{if(emailVerified) return value; else return generateEmailTokenInDB(value)});
};

exports.emailVerify = function (param) {
    var token = param.token;

    function paramCheck(){
        return new When.promise(function (resolve, reject) {
            if (typeof token !== 'string') return reject({error: 'format error'});
            else return resolve();
        });
    }

    function getUserID(value) {
        return new When.promise(function (resolve, reject) {
            userDB.userEmailVeriColl.findOne({validationToken: token}, function (err, result) { // NOTE: findOne will not produce an err if it does not found
                if(err) reject({error: 'database error'});
                else if (!result) reject({error: 'token not found'});
                else resolve(result.userID);
            });
        });
    }

    function verifyEmail(userID) {
        return new When.promise(function (resolve, reject) {
            userDB.userBasicColl.findAndModify({
                _id: userID
            }, {_id: 1}, {$set: {emailVerified: true}}, function (err, result) {
                if (result.lastErrorObject.n == 0) {
                    reject({error: 'user not found'});
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
    
    if(typeof email != 'string') return When.reject({error: 'format error'});
    
    function verifyEmail(userID) {
        return new When.promise(function (resolve, reject) {
            userDB.userBasicColl.findAndModify({
                email: email
            }, {_id: 1}, {$set: {emailVerified: true}}, function (err, result) {
                if (result.lastErrorObject.n == 0) {
                    reject({error: 'user not found'});
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
                return reject({error: 'format error'});
            if (typeof password !== 'string')
                return reject({error: 'format error'});
            else return resolve();
        });
    }
    
    function getUserBasic(value) {
        return new When.promise(function (resolve, reject) {
            userDB.userBasicColl.findOne({username: username}, function (err, result) {
                if(!err && result !== null) {
                    if(!result.emailVerified) return reject({error: 'email not verified'});
                    return resolve(result);
                }
                else return reject({error: 'account not found'});
            });
        });
    }
    
    function comparePassword(userBasic) {
        return new When.promise(function (resolve, reject) {
            var userGivenHP = calculateHashedPassword(password, userBasic.passwordSalt);
            if(userGivenHP === userBasic.hashedPassword) return resolve(userBasic);
            else return reject({error: 'password incorrect'});
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
            login.sessionColl.insertOne(session, function (err, result) {
                if (!err) resolve(session);
                else reject(err);
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
            login.sessionColl.findAndModify({sessionToken: sessionToken}, [['sessionToken', 1]],
                null,
                {remove: true, w: 1},
                function (err, result) {
                    if(err) return reject({error: 'database error'});
                    return resolve();
                });
        });
    }
    
    return removeSession();
};

exports.getSession = (param) => {
    var sessionToken = param.sessionToken;

    function getSession(value) {
        return new When.promise(function (resolve, reject) {
            login.sessionColl.findOne({sessionToken: sessionToken}, function (err, result) {
                if (err) {
                    console.error(err);
                    reject({error: 'database error'})
                }
                if (result !== null) {
                    return resolve(result);
                }
                else return reject({error: 'session not found'});
            });
        });
    }

    return getSession();
};