/*
 *Javascript for the Twitter clone
 *Authors: Mingchen Zhang and Haozhi Qu
 */
var loadMoreTimestamp;
var numFromNumberPicker;
$(document).ready(function(){
    setDefaultDate();
    loadMoreTimestamp = getTimeStampFromDatePicker();
    numFromNumberPicker = 25;
    getItemList(getTimeStampFromDatePicker(),25,false,false);
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
                getItemList(getTimeStampFromDatePicker(),numFromNumberPicker,false,false);
            }
        }).fail(function (err) {
            console.error(err);
        });
    });


    $('#search-btn').click(function () {
        var num = parseInt(document.getElementById("npicker").value);
        if(!num || !Number.isInteger(num) || num<1 || num>100){
            document.getElementById("npicker").value=25;
        }
        getItemList(getTimeStampFromDatePicker(),num,false,true);
    });

    $('#search2-btn').click(function () {
        $.ajax({
            url: '/item/'+$('#itemid').val(),
            type: 'get',
        }).done(function (result) {
            //Materialize.toast(result.error, 2500, "red");
            //Materialize.toast(result.success, 2500, "green");
            if(result.status === "OK"){
                removeCollectionItem();
                var item = result.item;
                createCollectionItem(item.username,item.content,item.timestamp);
                $("#loadmore-btn").hide();
            }
        }).fail(function (err) {
            console.error(err);
        });
    });

    $('#loadmore-btn').click(function () {
        getItemList(loadMoreTimestamp,25,true,false);
    });

    $('.datepicker').pickadate({
        selectMonths: false,
        selectYears: 10,
        max: new Date(),
        format: 'yyyy-mm-dd',
        onClose: function(){
            $('.datepicker').blur();
            $('.picker').blur();
        }
    });
/*var y_value = $("#textarea-container").offset().top;
window.alert(y_value);*/
});


function scrollEffect(){
    var top_nav = $("#top-nav");
    var y_value = $(document).scrollTop();
    if(y_value==0 && !top_nav.hasClass("noShadow")){
        top_nav.addClass("noShadow");
    }
    else if(top_nav.hasClass("noShadow")){
        top_nav.removeClass("noShadow");
    }
}


function setDefaultDate(){
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
}


function getTimeStampFromDatePicker(){
    if(!document.getElementById("dpicker").value){
        setDefaultDate();
    }
    var list = document.getElementById("dpicker").value.split("-");
    var date = new Date(list[0], list[1]-1, list[2]);
    var today = new Date();
    var result;
    if(today.setHours(0,0,0,0) == date.setHours(0,0,0,0)){
        result = new Date().getTime()/1000;
    }
    else{
        date.setHours(23,59,59,999);
        result = date.getTime()/1000;
    }
    return result;
}

function removeCollectionItem(){
    var tweet_list = document.getElementById("tweet-collection");
    while(tweet_list.hasChildNodes()){
        tweet_list.removeChild(tweet_list.lastChild);
    }
}


function iterateItemList(itemlist){
    for(var i = 0; i<itemlist.length; i++) {
        var item = itemlist[i];
        createCollectionItem(item.username,item.content,item.timestamp);
        if(i==itemlist.length-1){
            loadMoreTimestamp = item.timestamp;
        }
    }
}

function createCollectionItem(name,text,time){
    var tweet_list = document.getElementById("tweet-collection");
    var list_item = document.createElement('li');
    var icon = document.createElement('i');
    var title = document.createElement('span');
    var content_text = document.createElement('p');
    var time_text = document.createElement('div');
    list_item.className = "collection-item avatar";
    icon.className = "material-icons circle";
    title.className = "title";
    icon.innerHTML = "face";
    title.innerHTML = name;
    content_text.innerHTML = text;
    time_text.innerHTML = new Date(time*1000);
    list_item.appendChild(icon);
    list_item.appendChild(title);
    list_item.appendChild(content_text);
    list_item.appendChild(time_text);
    tweet_list.appendChild(list_item);
}

function getItemList(time,num,isLoadMore,isRearch){
    $.ajax({
        url: '/search',
        type: 'post',
        data: JSON.stringify({timestamp: time, limit: num}),
        contentType: "application/json; charset=utf-8",
        dataType: 'json'
    }).done(function (result) {
        Materialize.toast(result.error, 2500, "red");
        if(result.status === "OK"){
            if(!isLoadMore){
                removeCollectionItem();
            }
            if(isRearch&&numFromNumberPicker!=num){
                numFromNumberPicker = num;
            }
            var itemlist = result.items;
            if(itemlist.length<num){
                $("#loadmore-btn").hide();
            }
            else{
                $("#loadmore-btn").show();
            }
            iterateItemList(itemlist);
        }
    }).fail(function (err) {
        console.error(err);
    });
}

