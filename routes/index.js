var Express = require('express');

function generateRouter(s) {
    var router = Express.Router();

    router.use('/', require('./eliza').getRoute(s));
    router.use('/', require('./user').getRoute(s));

    return router;
}

exports.generateRouter = generateRouter;
