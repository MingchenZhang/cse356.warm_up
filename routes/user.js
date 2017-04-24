var Express = require('express');
var BodyParser = require('body-parser');
var When = require('when');

exports.getRoute = function (s) {
    var router = Express.Router();

    var urlParser = BodyParser.urlencoded({extended: false, limit: '10kb'});
    var jsonParser = BodyParser.json({limit: '10kb'});

    router.post('/adduser', jsonParser, function (req, res, next) {
        if (!s.tools.isAllString(req.body))
            return res.status(200).send({status: 'ERROR', error: 'format error'});

        function sendValidationEmail(email) {
            if(!s.sendEmail) return When.resolve();
            return new When.promise(function (resolve, reject) {
                s.emailTransporter.sendMail({
                    from: "mingczhang@cs.stonybrook.edu",
                    to: req.body.email,
                    subject: "register link to fake twitter",
                    html: "visit this link to register: http://130.245.168.102/verify?key=" + email.validationToken,
                    text: "visit this link to register: http://130.245.168.102/verify?key=" + email.validationToken
                }, function (error, info) {
                    //s.emailTransport.close();
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        resolve(email);
                    }
                });
            });
        }

        if(s.perfTest){
            var createUserTime = process.hrtime();
        }
        s.userConn.createUser({email: req.body.email, username: req.body.username, password: req.body.password})
            .then(sendValidationEmail)
            .then(function (result) {
                if(s.perfTest){
                    s.logConn.perfLog({type: 'add user', createUserTime, totalTime: process.hrtime(req.startTime)});
                }
                return res.status(200).send({status: 'OK', success: 'account created'});
            })
            .catch(function (err) {
                console.error(err);
                return res.status(200).send({status: 'error', error: err});
            });
    });

    router.get('/verify', urlParser, function (req, res, next) {
        if (!s.tools.isAllString(req.query))
            return res.status(200).send({status: 'ERROR', error: 'format error'});

        var promise = null;
        if (req.query.key == 'abracadabra') {
            promise = s.userConn.emailVerifyDirectly({email: req.query.email});
        } else {
            promise = s.userConn.emailVerify({token: req.query.key});
        }

        promise.then(function (result) {
            return res.status(200).send({status: 'OK', success: 'account verified'});
        }).catch(function (err) {
            return res.status(200).send(err);
        });
    });

    router.post('/verify', jsonParser, function (req, res, next) {
        if (!s.tools.isAllString(req.body))
            return res.status(200).send({status: 'ERROR', error: 'format error'});

        var promise = null;
        if (req.body.key == 'abracadabra') {
            promise = s.userConn.emailVerifyDirectly({email: req.body.email});
        } else {
            promise = s.userConn.emailVerify({token: req.body.key});
        }

        promise.then(function (result) {
            return res.status(200).send({status: 'OK', success: 'account verified'});
        }).catch(function (err) {
            return res.status(200).send(err);
        });
    });

    router.post('/login', jsonParser, function (req, res, next) {
        if (!s.tools.isAllString(req.query))
            return res.status(200).send({status: 'ERROR', error: 'format error'});

        if(s.perfTest){
            var userLoginTime = process.hrtime();
        }
        s.userConn.userLogin({username: req.body.username, password: req.body.password})
            .then(function (session) {
                res.cookie('login_session', session.sessionToken, {
                    httpOnly: true,
                    secure: !!s.inProduction,
                    expires: (new Date(Date.now() + 180 * 24 * 3600 * 1000))
                });
                if(s.perfTest){
                    userLoginTime = process.hrtime(userLoginTime);
                    s.logConn.perfLog({type: 'login', userLoginTime, totalTime: process.hrtime(req.startTime)});
                }
                return res.status(200).send({status: 'OK', success: 'logged in'});
            })
            .catch(function (err) {
                return res.status(200).send({status: 'error', error: err.message});
            });
    });

    router.all('/logout', function (req, res, next) {
        if(!req.userLoginInfo) return res.send({status: 'OK', success: 'logged out'});
        s.userConn.logoutSession({sessionToken: req.userLoginInfo.sessionToken})
            .then(function (result) {
                res.clearCookie('login_session');
                return res.status(200).send({status: 'OK', success: 'logged out'});
            })
            .catch(function (err) {
                return res.status(200).send(err);
            });
    });
    router.get('/following', urlParser, function (req, res, next) {
        res.render('following', {username: req.userLoginInfo.info.username});
    });
    router.get('/followers', urlParser, function (req, res, next) {
        res.render('followers', {username: req.userLoginInfo.info.username});
    });
    router.get('/manage', urlParser, function (req, res, next) {
        res.render('manage', {username: req.userLoginInfo.info.username});
    });
    router.get('/user', urlParser, function (req, res, next) {
        res.render('user', {username: req.userLoginInfo.info.username});
    });

    router.post('/follow', jsonParser, function (req, res, next) {
        if (!req.userLoginInfo)
            return res.status(401).send({status: 'error', error: 'login first'});
        s.userConn.getUserBasicInfoByUsername({username: req.body.username}).then((userInfo)=> {
            if (req.body.follow) {
                return s.userConn.follow({follower: req.userLoginInfo.userID, followed: userInfo._id});
            } else {
                return s.userConn.unfollow({follower: req.userLoginInfo.userID, followed: userInfo._id});
            }
        }).then(()=> {
            return res.status(200).send({status: 'OK'});
        }).catch((err)=> {
            return res.status(400).send({status: 'error', error: err});
        });
    });

    router.get('/user/:username/followers', function (req, res, next) {
        var requestUser;
        var resultList = [];
        s.userConn.getUserBasicInfoByUsername({username: req.params.username}).then((user)=>{
            requestUser = user;
            return s.userConn.listFollower({followed: user._id, limit: req.query.limit});
        }).then((follower)=>{
            //console.log(JSON.stringify(follower));
            var resultPromise = [];
            var index = follower.length;
            if(follower.length>req.query.limit){
                index = req.query.limit;
            }
            for(let i=0; i<index; i++){
                let index = i;
                let promise = s.userConn.getUserBasicInfo({userID: follower[i].follower}).then((follower)=>{
                    resultList[index] = follower.username;
                });
                resultPromise.push(promise);
            }
            return When.all(resultPromise);
        }).then(()=>{
            res.send({status: 'OK', users: resultList});
        }).catch((err)=>{
            res.status(400).send({status: 'error', error: err});
        });
    });

    router.get('/user/:username/following', function (req, res, next) {
        var requestUser;
        var resultList = [];
        s.userConn.getUserBasicInfoByUsername({username: req.params.username}).then((user)=>{
            requestUser = user;
            return s.userConn.listFollowed({follower: user._id, limit: req.query.limit});
        }).then((followed)=>{
            var resultPromise = [];
            var index = followed.length;
            if(followed.length>req.query.limit){
                index = req.query.limit;
            }
            for(let i=0; i<index; i++){
                let index = i;
                let promise = s.userConn.getUserBasicInfo({userID: followed[i].followed}).then((followed)=>{
                    resultList[index] = followed.username;
                });
                resultPromise.push(promise);
            }
            return When.all(resultPromise);
        }).then(()=>{
            res.send({status: 'OK', users: resultList});
        }).catch((err)=>{
            res.status(400).send({status: 'error', error: err});
        });
    });

    router.get('/user/:username', function (req, res, next) {
        var userInfo;
        var followedList;
        var followerList;
        s.userConn.getUserBasicInfoByUsername({username: req.params.username}).then((user)=>{
            userInfo = user;
            return s.userConn.listFollowed({follower: userInfo._id});
        }).then((followed)=>{
            followedList = followed;
            return s.userConn.listFollower({followed: userInfo._id});// TODO: use count instead
        }).then((follower)=>{
            followerList = follower;
            return res.status(200).send({
                status: 'OK',
                user: {email:userInfo.email, followers:followerList.length, following: followedList.length}
            });
        }).catch((err)=>{
            return res.status(400).send({status: 'error', error: err});
        });

    });

    return router;
};