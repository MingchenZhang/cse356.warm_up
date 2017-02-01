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
        return res.status(200).send({eliza: generateText(req.body.human)});
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

    return router;
};