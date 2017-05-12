const Dnode = require('dnode');

const CACHE_SIZE = 100;

Number.prototype.mod = function(n) {
    return ((this%n)+n)%n;
};

var list = [];
var nextIndex = 0;

for(let i=0; i<CACHE_SIZE; i++){
    list[i] = null;
}

var server = Dnode({
    add: (elem, res)=>{
        try {
            if(elem.createdAt) elem.createdAt = new Date();
            list[nextIndex++] = elem;
            if (nextIndex == CACHE_SIZE) nextIndex = 0;
            if (process.env.LOG) console.log('item received');
            if (res) res();
        }catch(e){
            console.error(e);
        }
    },
    get: (size, res)=>{
        try{
            var result = [];
            var counter = 0;
            for(let i=(nextIndex-1).mod(CACHE_SIZE); counter<size; i = (i-1).mod(CACHE_SIZE), counter++){
                if(list[i] == null) break;
                result.push(list[i]);
            }
            if(result.length != size) console.log(list);
            if(process.env.LOG) console.log('item returned: ' + result.length + ' wanted: '+size);
            if(!res) return;
            return res(result);
        }catch(e){
            console.error(e);
        }
    },
    clear: ()=>{
        try{
            for(let i=0; i<CACHE_SIZE; i++){
                list[i] = null;
            }
            if(process.env.LOG) console.log('list cleared');
            nextIndex = 0;
        }catch(e){
            console.error(e);
        }
    }
});
server.listen(5004);
