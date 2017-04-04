var Express = require('express');
var BodyParser = require('body-parser');
var When = require('when');

exports.getRoute = function (s) {
    var router = Express.Router();

    var jsonParser = BodyParser.json({limit: '10kb'});

    router.post('/additem', jsonParser, function (req, res, next) {
        if(!req.userLoginInfo)
            return res.status(500).send({status: 'error', error: "user has not logged in"});

        s.tweetConn.addTweet({content: req.body.content, postedBy: req.userLoginInfo.userID})
            .then(function (result) {
                return res.status(200).send({status: 'OK', success: 'post created', id: result.insertedID});
            })
            .catch(function (err) {
                return res.status(500).send({status: 'error', error: err});
            });
    });

    router.get('/item/:id', function (req, res, next) {
        var tweetDoc = null;
        s.tweetConn.getTweet({id: req.params.id})
            .then((result)=>{
                tweetDoc = result;
                return {userID: result.postedBy};
            })
            .then(s.userConn.getUserBasicInfo)
            .then(function (posterInfo) {
                var item = {
                    id: tweetDoc._id,
                    username: posterInfo.username,
                    content: tweetDoc.content,
                    timestamp: Math.floor(tweetDoc.createdAt.getTime()/1000),
                };
                return res.status(200).send({status: 'OK', item: item});
            })
            .catch(function (err) {
                return res.status(500).send({status: 'error', error: err});
            });
    });

    router.delete('/item/:id', function (req, res, next) {
        var tweetDoc = null;
        s.tweetConn.deleteTweet({id: req.params.id})
            .then(()=>{
                return res.status(200).send({status: 'OK'});
            })
            .catch((err)=>{
                return res.status(400).send({status: 'error', error: err.result});
            });
    });

    router.post('/search', jsonParser, function (req, res, next) {
        var searchCondition = {};
        if(req.body.timestamp) searchCondition.beforeDate = new Date(req.body.timestamp*1000+999);
        searchCondition.limitDoc = req.body.limit;

        var prequeryPromise;
        if(req.body.following){
            prequeryPromise = s.userConn.listFollower({follower: req.userLoginInfo.userID}).then((followedList)=>{
                searchCondition.userIDList = followedList.map((e)=>{return e.followed});
            });
        }else if(typeof req.body.username == 'string'){
            prequeryPromise = s.userConn.getUserBasicInfoByUsername({username: req.body.username}).then((userInfo)=>{
                searchCondition.userIDList = [userInfo._id];
            });
        }

        if(typeof req.body.q == 'string') {
            searchCondition.searchText = req.body.q;
        }

        var resultList = [];
        prequeryPromise.then(()=>{
            return s.tweetConn.searchTweet(searchCondition);
        }).then((tweetArray)=>{
            var userInfoRetrivalPromises = [];
            for(let i=0; i<tweetArray.length; i++) {
                let index = i;
                let tweet = tweetArray[i];
                let promise = s.userConn.getUserBasicInfo({userID: tweet.postedBy}).then((userInfo)=>{
                    resultList[index] = {
                        username: userInfo.username,
                        id: tweet._id,
                        content: tweet.content,
                        timestamp: Math.floor(tweet.createdAt.getTime() / 1000),
                    };
                });
                userInfoRetrivalPromises.push(promise);
            }
            return When.all(userInfoRetrivalPromises);
        }).then((result)=>{
            return res.status(200).send({status: 'OK', items: resultList});
        }).catch((err)=>{
            return res.status(400).send({status: 'error', error: err});
        });
    });

    return router;
};