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

        if(s.perfTest){
            var addTweetTime = process.hrtime();
            var addInterestTime;
        }

        var _id = s.mongodb.ObjectID();
        var tweetDoc = {
            content: req.body.content,
            postedBy: req.userLoginInfo.userID,
            parent: req.body.parent,
            media: req.body.media,
            createdAt: new Date(),
            _id,
        };

        if(s.listCache) s.listCache.add(JSON.stringify(tweetDoc));
        if(s.skipAddTweetWait){
            s.tweetConn.addTweet(tweetDoc).catch((err)=>{console.error(err);});
            if (s.perfTest) {
                s.logConn.perfLog({type: 'add tweet', totalTime: process.hrtime(req.startTime)});
            }
            return res.status(200).send({status: 'OK', success: 'post created', id: _id.toString()});
        }
        s.tweetConn.addTweet(tweetDoc).then(function (result) {
            if(s.perfTest){
                addTweetTime = process.hrtime(addTweetTime);
                addInterestTime = process.hrtime();
            }
            if (req.body.parent)
                s.tweetConn.modifyInterestValue({tweetID: req.body.parent, value: 1}).then(()=> {
                    if (s.perfTest) {
                        addInterestTime = process.hrtime(addInterestTime);
                        s.logConn.perfLog({type: 'add tweet', addTweetTime, addInterestTime, totalTime: process.hrtime(req.startTime)});
                    }
                });
            else{
                addInterestTime = process.hrtime(addInterestTime);
                s.logConn.perfLog({type: 'add tweet', addTweetTime, totalTime: process.hrtime(req.startTime)});
            }
            return res.status(200).send({status: 'OK', success: 'post created', id: result.insertedID});
        }).catch(function (err) {
            console.error(err);
            return res.status(500).send({status: 'error', error: err.message});
        });
    });

    router.get('/item/:id', function (req, res, next) {
        if(s.perfTest){
            var getTweetTime = process.hrtime();
            var getUserTime;
        }
        var tweetDoc = null;
        s.tweetConn.getTweet({id: req.params.id}).then((result)=> {
            if (s.perfTest) {
                getTweetTime = process.hrtime(getTweetTime);
                getUserTime = process.hrtime();
            }
            tweetDoc = result;
            return {userID: result.postedBy};
        }).then(s.userConn.getUserBasicInfo).then(function (posterInfo) {
            if (s.perfTest) {
                getUserTime = process.hrtime(getUserTime);
                s.logConn.perfLog({
                    type: 'get tweet by id',
                    getTweetTime,
                    getUserTime,
                    totalTime: process.hrtime(req.startTime)
                });
            }
            var item = {
                id: tweetDoc._id,
                username: posterInfo.username,
                content: tweetDoc.content,
                timestamp: Math.floor((new Date(tweetDoc.createdAt)).getTime() / 1000),
                parent: tweetDoc.parent,
                media: tweetDoc.media,
            };
            return res.status(200).send({status: 'OK', item: item});
        }).catch(function (err) {
            console.error(err);
            return res.status(400).send({status: 'error', error: err.message});
        });
    });

    router.delete('/item/:id', function (req, res, next) {
        var tweetDoc = null;
        var uname = null;
        s.tweetConn.getTweet({id: req.params.id}).then((result)=> {
            tweetDoc = result;
            return {userID: result.postedBy};
        }).then(s.userConn.getUserBasicInfo).then((result)=> {
            uname = result.username;
            if (uname !== req.userLoginInfo.info.username) {
                return res.status(400).send({status: 'error', error: "cannot delete this tweet"});
            }

            return s.tweetConn.deleteTweet({id: req.params.id}).then(()=> {
                return res.status(200).send({status: 'OK'});
            }).catch((err)=> {
                return res.status(400).send({status: 'error', error: err ? err : 'unknown error'});
            });
        }).catch(function (err) {
            console.error(err);
            return res.status(400).send({status: 'error', error: err.message});
        });
    });

    router.post('/search', jsonParser, function (req, res, next) {
        if(!req.userLoginInfo) return res.status(400).send({status: 'error', error: "please login first"});
        var searchCondition = {};
        if(req.body.timestamp) searchCondition.beforeDate = new Date(req.body.timestamp*1000+999);
        searchCondition.limitDoc = req.body.limit;
        searchCondition.parent = req.body.parent;
        searchCondition.replies = req.body.replies;
        searchCondition.sortByInterest = req.body.rank!='time'; // true: sortByInterest, false: sortByCreatedAt

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

        if(s.perfTest){
            var searchTime = process.hrtime();
            var userRetrievalTime;
            var userCacheHit = 0;
        }
        var resultList = [];
        prequeryPromise.then(()=>{
            if(searchCondition.parent == null &&
                searchCondition.replies &&
                !searchCondition.sortByInterest){
                return new Promise((resolve, reject)=>{
                    s.listCache.get(searchCondition.limitDoc || 25, (tweetArray)=>{
                        for(let i=0; i<tweetArray.length; i++){
                            tweetArray[i] = JSON.parse(tweetArray[i]);
                        }
                        resolve(tweetArray);
                    });
                });
            }
            return s.tweetConn.searchTweet(searchCondition);
        }).then((tweetArray)=>{
            if(s.perfTest){
                searchTime = process.hrtime(searchTime);
                userRetrievalTime = process.hrtime();
            }
            var userInfoRetrivalPromises = [];
            var previousTimestamp = Number.MAX_SAFE_INTEGER;
            for(let i=0; i<tweetArray.length; i++) {
                let index = i;
                let tweet = tweetArray[i];
                let promise = s.userConn.getUserBasicInfo({userID: tweet.postedBy}).then((userInfo)=>{
                    if(s.perfTest) if(userInfo.cacheHit) userCacheHit++;
                    var timestamp = Math.floor((new Date(tweet.createdAt)).getTime() / 1000);
                    if(!searchCondition.sortByInterest && (timestamp>previousTimestamp))
                        timestamp = previousTimestamp;
                    else
                        previousTimestamp = timestamp;
                    resultList[index] = {
                        username: userInfo.username,
                        id: tweet._id,
                        content: tweet.content,
                        timestamp: timestamp,
                    };
                });
                userInfoRetrivalPromises.push(promise);
            }
            return When.all(userInfoRetrivalPromises);
        }).then((result)=>{
            if(s.perfTest){
                userRetrievalTime = process.hrtime(userRetrievalTime);
                s.logConn.perfLog({type: 'search', searchCondition, searchTime, userRetrievalTime, userCacheHit, totalTime: process.hrtime(req.startTime)});
            }
            return res.status(200).send({status: 'OK', items: resultList});
        }).catch((err)=>{
            console.error(err);
            return res.status(400).send({status: 'error', error: err.message});
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
            if(filename.length == 0) {
                writeError(400, 'file is zero byte');
                return file.pipe(BlackHole());
            }
            var fileID = s.mongodb.ObjectID();
            var uploadStream = s.tweetConn.getMediaFileBucket().openUploadStreamWithId(fileID, filename, {metadata:{}, contentType:mimetype});
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
            res.setHeader('Content-Type', 'image/jpeg');
            outStream.pipe(res);
            cursor.close();
        });
    });

    router.post('/item/:tweetID/like', jsonParser, function (req, res, next) {
        s.tweetConn.modifyLikeValue({tweetID: req.params.tweetID, value: req.body.like?1:-1});
        s.tweetConn.modifyInterestValue({tweetID: req.params.tweetID, value: req.body.like?1:-1});
        return res.send({status: 'OK'});
    });

    return router;
};