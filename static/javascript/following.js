var isOdd = true;
$(document).ready(function(){
    var FollowingNumber = 11;
    for (var i = 0; i < FollowingNumber; i++) {
        createCollectionItemFollowing("1111",false);
    };
    if(FollowingNumber%2!=0){
        createCollectionItemFollowing("1",true);
    }
    $('#limit-btn').click(function () {
        window.alert(3333);
    });
});

function createCollectionItemFollowing(name,isPlaceHolder){
    var tweet_list = document.getElementById("following-collection");
    var list_item = document.createElement('li');
    var icon = document.createElement('i');
    var title = document.createElement('span');
    //var button = document.createElement('button');
    list_item.className = "collection-item avatar";
    if(isPlaceHolder){
        list_item.className = "collection-item avatar hiden-item";
    }
    icon.className = "material-icons circle";
    title.className = "title";
    //button.className = "btn blue darken-1 secondary-content";
    icon.innerHTML = "face";
    title.innerHTML = name;
    //button.innerHTML = "Unfollow";
    list_item.appendChild(icon);
    list_item.appendChild(title);
    //list_item.appendChild(button);
    tweet_list.appendChild(list_item);
}


function removeCollectionItemFollowing(){
    var tweet_list = document.getElementById("following-collection");
    while(tweet_list.hasChildNodes()){
        tweet_list.removeChild(tweet_list.lastChild);
    }
}

function iterateItemListFollowing(itemlist){
    for(var i = 0; i<itemlist.length; i++) {
        var item = itemlist[i];
        createCollectionItemFollowing(item,false);
    }
    if(itemlist.length%2!=0){
        createCollectionItemFollowing("1",true);
    }
}

function getItemListFollowing(){
    var name1 = $('#name').html();
    var limit1 = getLimit();
    $.ajax({
        url: '/user/'+name1+'/following',
        type: 'get',
        data: JSON.stringify({limit: limit1}),
        contentType: "application/json; charset=utf-8",
        dataType: 'json'
    }).done(function (result) {
        //Materialize.toast(result.error, 2500, "red");
        if(result.status === "OK"){
            removeCollectionItemFollowing();
            var itemlist = result.users;
            iterateItemListFollowing(itemlist);
        }
    }).fail(function (err) {
        console.error(err);
    });
}

function getLimit(){
    var num = parseInt(document.getElementById("limit").value);
    if(!num || !Number.isInteger(num) || num<1 || num>200){
        document.getElementById("limit").value=50;
        num = 50;
    }
    return num;
}

