var Express = require('express');
var BodyParser = require('body-parser');
var When = require('when');

exports.getRoute = function (s) {
    var router = Express.Router();

    var urlParser = BodyParser.urlencoded({extended: false, limit: '10kb'});
    var jsonParser = BodyParser.json({limit: '10kb'});

    router.post(['/eliza/DOCTOR', '/DOCTOR'], jsonParser, function (req, res, next) {
        
        function generateText(name){
            var num = Math.floor(Math.random()*3);
            if(num == 0){
                return 'Your condition is final and there is no existed treatment';
            }else if(num == 1){
                return 'I have a bad news to tell you. You only have 2 days left. ';
            }else if(num == 2){
                return 'I wanna play a game. ';
            }
        }
        
        if(!req.body.human) return res.status(200).send('bad request');
        
        var response = generateText(req.body.human)+"(id="+Math.floor(Math.random()*9999)+")";

        if(!req.userLoginInfo) return res.status(200).send(Object.assign({eliza: response}, {status:"OK"}));

        s.convConn.addConversation({
            sessionToken:req.userLoginInfo.sessionToken,
            sender: req.body.name || req.userLoginInfo.info.username,
            text: req.body.human,
            userID: req.userLoginInfo.userID,
        }).then(()=>{
            return s.convConn.addConversation({
                sessionToken:req.userLoginInfo.sessionToken,
                sender: 'Eliza',
                text: response,
                userID: req.userLoginInfo.userID,
            });
        }).then(()=>{
            return res.status(200).send(Object.assign({eliza: response}, {status:"OK"}));
        }).catch((err)=>{
            return res.status(200).send(Object.assign(err, {status:"ERROR"}));
        });
    });

    router.get('/', function (req, res, next) {
        if(req.userLoginInfo){
            res.redirect('/user');
        }else{
            res.render('eliza', {});
        }
    });

    router.get('/adduser', function (req, res, next) {
        res.render('adduser', {});
    });

    router.get('/verify', function (req, res, next) {
        res.render('verify', {});
    });

	/*router.post('/eliza', urlParser, function (req, res, next) {
        if(!req.body.name) return res.status(200).send(Object.assign({error:'bad request'}, {status:"ERROR"}));
        res.render('eliza', {
			name: req.body.name,
			date: new Date().toString(),
		});
    });*/
    
    router.all('/listconv', jsonParser, function (req, res, next) {
        if(!req.userLoginInfo) return res.status(200).send({status: 'ERROR', error: 'bad request'});
        
        s.convConn.listConversation({sessionToken: req.userLoginInfo.sessionToken, userID: req.userLoginInfo.userID})
            .then(function (result) {
                return res.status(200).send(Object.assign(result, {status:"OK"}));
            }).catch(function (err) {
                return res.status(200).send(Object.assign(err, {status:"ERROR"}));
            });
    });
    
    router.post('/getconv', jsonParser, function (req, res, next) {
        if(!req.userLoginInfo) return res.status(200).send({status: 'ERROR', error: 'bad request'});
        
        s.convConn.showConversation({id: req.body.id})
            .then(function (result) {
                return res.status(200).send(Object.assign(result, {status:"OK"}));
            }).catch(function (err) {
                return res.status(200).send(Object.assign(err, {status:"ERROR"}));
            });
    });

    return router;
};