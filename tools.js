var Stringifier = require('stringifier');


exports.getToolSet = function (s) {
    var tools = {};

    tools.isAllString = function (obj) {
        for(var key in obj){
            if (!obj.hasOwnProperty(key)) continue;
            if(typeof obj[key] !== 'string') return false;
        }
        return true;
    };

    tools.stringify = function(obj, param){
        var maxDepth = param.maxDepth;
        return Stringifier({maxDepth: maxDepth})(obj);
    };

    return tools;
};