var Express = require('express');
var BodyParser = require('body-parser');
var When = require('when');

exports.getRoute = function (s) {
    var router = Express.Router();

    var urlParser = BodyParser.urlencoded({extended: false, limit: '10kb'});
    var jsonParser = BodyParser.json({limit: '10kb'});

    router.post('/adduser', jsonParser, function (req, res, next) {
        if(!s.tools.isAllString(req.body))
            return res.status(200).send({status: 'ERROR', error: 'format error'});

        function sendValidationEmail(email) {
            return new When.promise(function (resolve, reject) {
                s.emailTransporter.sendMail({
                    from: "mingczhang@cs.stonybrook.edu",
                    to: req.body.email,
                    subject: "register link to fake twitter",
                    html: "visit this link to register: http://130.245.168.102/verify?key="+email.validationToken,
                    text: "visit this link to register: http://130.245.168.102/verify?key="+email.validationToken
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
        
        s.userConn.createUser({email: req.body.email, username:req.body.username, password: req.body.password})
            .then(sendValidationEmail)
            .then(function (result) {
                return res.status(200).send({status: 'OK', success: 'account created'});
            })
            .catch(function (err) {
                return res.status(200).send(err);
            });
    });

    router.get('/verify', urlParser, function (req, res, next) {
        if(!s.tools.isAllString(req.query))
            return res.status(200).send({status: 'ERROR', error: 'format error'});

        var promise = null;
        if(req.query.key == 'abracadabra'){
            promise = s.userConn.emailVerifyDirectly({email: req.query.email});
        }else{
            promise = s.userConn.emailVerify({token: req.query.key});
        }

        promise.then(function (result) {
            return res.status(200).send({status: 'OK', success: 'account verified'});
        }).catch(function (err) {
            return res.status(200).send(err);
        });
    });

    router.post('/verify', jsonParser, function (req, res, next) {
        if(!s.tools.isAllString(req.body))
            return res.status(200).send({status: 'ERROR', error: 'format error'});
        
        var promise = null;
        if(req.body.key == 'abracadabra'){
            promise = s.userConn.emailVerifyDirectly({email: req.body.email});
        }else{
            promise = s.userConn.emailVerify({token: req.body.key});
        }
        
        promise.then(function (result) {
            return res.status(200).send({status: 'OK', success: 'account verified'});
        }).catch(function (err) {
            return res.status(200).send(err);
        });
    });

    router.post('/login', jsonParser, function (req, res, next) {
        if(!s.tools.isAllString(req.query))
            return res.status(200).send({status: 'ERROR', error: 'format error'});
        
        s.userConn.userLogin({username: req.body.username, password: req.body.password})
            .then(function (session) {
                res.cookie('login_session', session.sessionToken,
                    {httpOnly: true, secure: !!s.inProduction, expires: (new Date(Date.now() + 180*24*3600*1000))});
                return res.status(200).send({status: 'OK', success: 'logged in'});
            })
            .catch(function (err) {
                return res.status(200).send(err);
            });
    });
    
    router.all('/logout', function (req, res, next) {
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
    
    return router;
};