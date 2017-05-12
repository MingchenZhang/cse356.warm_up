const Dnode = require('dnode');

const CACHE_SIZE = 100;

var list = [];
var nextIndex = 0;

for(let i=0; i<CACHE_SIZE; i++){
    list[i] = null;
}

var server = Dnode({
    add: (elem, res)=>{
        list[nextIndex] = elem;
        if(nextIndex == CACHE_SIZE) nextIndex = 0;
        res();
    },
    get: (size, res)=>{
        var result = [];
        var counter = 0;
        for(let i=(nextIndex-1)%CACHE_SIZE; counter<size; i = (i-1) % CACHE_SIZE, counter++){
            if(list[i] = null) return res(result);
            result.push(list[i]);
        }
        return res(result);
    },
    clear: ()=>{
        for(let i=0; i<CACHE_SIZE; i++){
            list[i] = null;
        }
        nextIndex = 0;
    }
});
server.listen(5004);