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
        if(process.env.LOG) console.log('item received: '+JSON.stringify(elem));
        res();
    },
    get: (size, res)=>{
        var result = [];
        var counter = 0;
        for(let i=(nextIndex-1)%CACHE_SIZE; counter<size; i = (i-1) % CACHE_SIZE, counter++){
            if(list[i] = null) return res(result);
            result.push(list[i]);
        }
        if(process.env.LOG) console.log('item returned: ' + result.length);
        return res(result);
    },
    clear: ()=>{
        for(let i=0; i<CACHE_SIZE; i++){
            list[i] = null;
        }
        if(process.env.LOG) console.log('list cleared');
        nextIndex = 0;
    }
});
server.listen(5004);