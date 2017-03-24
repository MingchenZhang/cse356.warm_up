$(document).ready(function(){
var date = new Date();
var year = date.getFullYear();
var month = date.getMonth() + 1;
var day = date.getDate();
if(day<10){
    day = "0"+day;
}
if(month<10){
    month = "0"+month;
}
document.getElementById("dpicker").value = year+"-"+month+"-"+day;

getItemList(25,true);
$(document).scroll(function(){
    scrollEffect();
});

$('#logout-btn').click(function () {
    $.ajax({
        url: '/logout',
        type: 'post',
        contentType: "application/json; charset=utf-8",
        dataType: 'json'
    }).done(function (result) {
        Materialize.toast(result.error, 2500, "red");
        if(typeof result.success!=="undefined"){
            document.location.href = "/";
        }
    }).fail(function (err) {
        console.error(err);
    });
});

$('#tweet-btn').click(function () {
    $.ajax({
        url: '/additem',
        type: 'post',
        data: JSON.stringify({content: $('#textarea1').val()}),
        contentType: "application/json; charset=utf-8",
        dataType: 'json'
    }).done(function (result) {
        Materialize.toast(result.error, 2500, "red");
        Materialize.toast(result.success, 2500, "green");
        if(typeof result.success!=="undefined"){
            getItemList(0,false);
        }
    }).fail(function (err) {
        console.error(err);
    });
});



$('#search-btn').click(function () {
    getItemList(0,false);
});
/*var y_value = $("#textarea-container").offset().top;
window.alert(y_value);*/
});

var tweet_list = document.getElementById("tweet-collection");
function createCollectionItem(name,text){
    var list_item = document.createElement('li');
    var icon = document.createElement('i');
    var title = document.createElement('span');
    var content_text = document.createElement('p');
    list_item.className = "collection-item avatar";
    icon.className = "material-icons circle";
    title.className = "title";
    icon.innerHTML = "face";
    title.innerHTML = name;
    content_text.innerHTML = text;
    list_item.appendChild(icon);
    list_item.appendChild(title);
    list_item.appendChild(content_text);
    tweet_list.appendChild(list_item);
}

function removeCollectionItem(){
    while(tweet_list.hasChildNodes()){
        tweet_list.removeChild(tweet_list.lastChild);
    }
}


function getTimeStamp(){
    var list = document.getElementById("dpicker").value.split("-");
    var date = new Date(list[0], list[1]-1, list[2]);
    var today = new Date();
    var result = date.getTime()/1000;
    if(today.setHours(0,0,0,0) == date.setHours(0,0,0,0)){
        result = new Date().getTime()/1000;
    }
    return result;
}

function iterateItemList(itemlist){
    //window.alert(itemlist.length);
    for(var i = 0; i<itemlist.length; i++) {
        var item = itemlist[i];
        createCollectionItem(item.username,item.content);
    }
}

var top_nav = $("#top-nav");
function scrollEffect(){
    var y_value = $(document).scrollTop();
    if(y_value==0 && !top_nav.hasClass("noShadow")){
        top_nav.addClass("noShadow");
    }
    else if(top_nav.hasClass("noShadow")){
        top_nav.removeClass("noShadow");
    }
}


function getItemList(num1,isStart){
    var num= parseInt(document.getElementById("npicker").value);
    if(isStart){
        num = num1;
    }
    if(num<1 || num>100 || !Number.isInteger(num)){
        Materialize.toast("invalid input", 2500, "red");
    }
    else{
    var result = getTimeStamp();
    $.ajax({
        url: '/search',
        type: 'post',
        data: JSON.stringify({timestamp: result, limit: num}),
        contentType: "application/json; charset=utf-8",
        dataType: 'json'
    }).done(function (result) {
        Materialize.toast(result.error, 2500, "red");
        //Materialize.toast(result.status, 2500, "green");
        removeCollectionItem();
        if(result.status === "OK"){
            var itemlist = result.items;
            iterateItemList(itemlist);
        }
    }).fail(function (err) {
        console.error(err);
    });
    }
}