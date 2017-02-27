var Express = require('express');
var BodyParser = require('body-parser');
var When = require('when');

exports.getRoute = function (s) {
    var router = Express.Router();

    var urlParser = BodyParser.urlencoded({extended: false, limit: '10kb'});
    var jsonParser = BodyParser.json({limit: '10kb'});

    router.get('/', function (req, res, next) {
        res.render('home-page');
    });

    router.post('/eliza/DOCTOR', jsonParser, function (req, res, next) {
        if(!req.userLoginInfo) return res.status(400).send({error: 'bad request'});
        
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
        
        if(!req.body.human) return res.status(400).send('bad request');
        
        var response = generateText(req.body.human)+"(id="+Math.floor(Math.random()*9999)+")";
        
        s.convConn.addConversation({
            sessionToken:req.userLoginInfo.sessionToken,
            sender: req.body.name,
            text: req.body.human
        }).then(()=>{
            return s.convConn.addConversation({
                sessionToken:req.userLoginInfo.sessionToken,
                sender: 'eliza',
                text: response
            });
        }).then(()=>{
            return res.status(200).send({eliza: response});
        }).catch((err)=>{
            return res.status(400).send(err);
        });
    });

    router.get('/eliza', function (req, res, next) {
        res.render('eliza', {});
    });

	router.post('/eliza', urlParser, function (req, res, next) {
        if(!req.body.name) return res.status(400).send('bad request');
        res.render('eliza', {
			name: req.body.name,
			date: new Date().toString(),
		});
    });
    
    router.all('/listconv', jsonParser, function (req, res, next) {
        if(!req.userLoginInfo) return res.status(400).send({error: 'bad request'});
        
        s.convConn.listConversation({sessionToken: req.userLoginInfo.sessionToken})
            .then(function (result) {
                return res.status(200).send(result);
            }).catch(function (err) {
                return res.status(400).send(err);
            });
    });
    
    router.post('/getconv', jsonParser, function (req, res, next) {
        if(!req.userLoginInfo) return res.status(400).send({error: 'bad request'});
        
        s.convConn.showConversation({id: req.body.id})
            .then(function (result) {
                return res.status(200).send(result);
            }).catch(function (err) {
                return res.status(400).send(err);
            });
    });

    return router;
};