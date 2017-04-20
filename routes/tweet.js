var Express = require('express');
var BodyParser = require('body-parser');
var When = require('when');
var Busboy = require('busboy');

exports.getRoute = function (s) {
    var router = Express.Router();

    var jsonParser = BodyParser.json({limit: '10kb'});

    router.post('/additem', jsonParser, function (req, res, next) {
        if (!req.userLoginInfo)
            return res.status(500).send({status: 'error', error: "user has not logged in"});

        if (req.body.media) {
            for (let i = 0; i < req.body.media.length; i++) {
                req.body.media[i] = s.mongodb.ObjectId(req.body.media[i]);
            }
        }

        s.tweetConn.addTweet({
            content: req.body.content,
            postedBy: req.userLoginInfo.userID,
            parent: req.body.parent,
            media: req.body.media
        }).then(function (result) {
            s.tweetConn.modifyInterestValue({tweetID: req.body.parent, value:1});
            return res.status(200).send({status: 'OK', success: 'post created', id: result.insertedID});
        }).catch(function (err) {
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
                    parent: tweetDoc.parent,
                    media: tweetDoc.media,
                };
                return res.status(200).send({status: 'OK', item: item});
            })
            .catch(function (err) {
                return res.status(500).send({status: 'error', error: err});
            });
    });

    router.delete('/item/:id', function (req, res, next) {
        var tweetDoc = null;
        var uname = null;
        s.tweetConn.getTweet({id: req.params.id})
            .then((result)=>{
                tweetDoc = result;
                return {userID: result.postedBy};
            })
            .then(s.userConn.getUserBasicInfo)
            .then((result)=>{
                uname = result.username;
                if(uname !== req.userLoginInfo.info.username){
                    return res.status(400).send({status: 'error', error: "cannot delete this tweet"});
                }

                s.tweetConn.deleteTweet({id: req.params.id})
                    .then(()=>{
                        return res.status(200).send({status: 'OK'});
                    })
                    .catch((err)=>{
                        return res.status(400).send({status: 'error', error: err?err.result:'unknown error'});
                    });
            })
            .catch(function (err) {
                return res.status(400).send({status: 'error', error: err.result});
            });

    });

    router.post('/search', jsonParser, function (req, res, next) {
        if(!req.userLoginInfo) return res.status(400).send({status: 'error', error: "please login first"});
        var searchCondition = {};
        if(req.body.timestamp) searchCondition.beforeDate = new Date(req.body.timestamp*1000+999);
        searchCondition.limitDoc = req.body.limit;
        searchCondition.parent = req.body.parent;
        searchCondition.replies = req.body.replies;
        searchCondition.sortByInterest = req.body.rank!='time';

        var prequeryPromise = When.resolve();
        if(req.body.following === false && typeof req.body.username != 'string'){
        }else if(typeof req.body.username == 'string'){
            prequeryPromise = s.userConn.getUserBasicInfoByUsername({username: req.body.username}).then((userInfo)=>{
                searchCondition.userIDList = [userInfo._id];
            });
        }else{
            prequeryPromise = s.userConn.listFollowed({follower: req.userLoginInfo.userID}).then((followedList)=>{
                searchCondition.userIDList = followedList.map((e)=>{return e.followed});
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

    router.post('/addmedia', function (req, res, next) {
        var ended = false; // flag for output finish
        function writeError(status, err){
            if(ended) return;
            res.status(status).send({status:'error', error:err});
            ended = true;
        }

        var fields = {};
        fields.attachmentList = [];
        var boy = new Busboy({
            headers: req.headers,
            limits:{fields:50, fieldSize:40*1024, files:1, fileSize: 10*1024*1024, headerPairs:1}
        });
        boy.on('file', function(fieldname, file, filename, encoding, mimetype) {
            if(filename.length == 0) return file.pipe(BlackHole());
            var fileID = s.mongodb.ObjectID();
            var uploadStream = s.tweetConn.getMediaFileBucket().openUploadStreamWithId(fileID, filename, {metadata:{}});
            file.on('end', function () {
                if(ended) console.error('WTF: ended!!');
                fields.attachmentList.push({name:filename, id:fileID});
            });
            file.on('limit', function(){
                writeError(400, 'file is too large');
                uploadStream.abort(function () {});
            });
            file.pipe(uploadStream).once('finish', function () {
                if(ended) return s.tweetConn.getMediaFileBucket().delete(fileID); // in case the dropFiles() failed to delete file because the file is not ready
                function dropFiles(){
                    for(var file of fields.attachmentList){
                        s.orderFileBucket.delete(file.id);
                    }
                    fields.attachmentList = [];
                    ended = true;
                }
                res.send({status:'OK', id: fields.attachmentList[0].id});
            });
        }); // TODO: might leak some files to database that belongs to a rejected order
        boy.on('filesLimit', function() {
            writeError(400, 'too many files')
        });
        boy.on('field', function(fieldname, val, fieldnameTruncated, valTruncated, encoding, mimetype) {
            fields[fieldname] = val;
        });
        boy.on('fieldsLimit', function() {
            writeError(400, 'too many fields')
        });
        //boy.once('finish', function() {});

        req.pipe(boy);
    });

    router.get('/media/:id', function (req, res, next) {
        var cursor = s.tweetConn.getMediaFileBucket().find({_id:s.mongodb.ObjectID(req.params.id)}, {}).limit(1);
        cursor.next(function (err, doc) {
            if(err) return res.status(400).send({status:'error', error:'database error', detail: err.toString()});
            if(doc == null) return res.status(400).send({status:'error', error:'file not found'});

            var outStream = s.tweetConn.getMediaFileBucket().openDownloadStream(doc._id);
            res.setHeader('Content-disposition', 'attachment; filename=' + doc.filename);
            res.setHeader('Content-length', doc.length.toString());
            outStream.pipe(res);
            cursor.close();
        });
    });

    router.post('/item/:tweetID/like', jsonParser, function (req, res, next) {
        s.tweetConn.modifyLikeValue({tweetID: req.params.tweetID, value: req.body.like?1:-1});
        return res.send({status: 'OK'});
    });

    return router;
};