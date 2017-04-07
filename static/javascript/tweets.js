/*
 *Javascript for the Twitter clone
 *Authors: Mingchen Zhang and Haozhi Qu
 */
var loadMoreTimestamp;
var numFromNumberPicker;
$(document).ready(function(){
    setDefaultDate();
    var currenttime = new Date().getTime()/1000;
    loadMoreTimestamp = currenttime;
    numFromNumberPicker = 25;
    getItemList(currenttime,25,false,false);

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
                var currenttime2 = new Date().getTime()/1000;
                getItemList(currenttime2,25,false,false);
            }
        }).fail(function (err) {
            console.error(err);
        });
    });


    $('#search-btn').click(function () {
        var num = parseInt(document.getElementById("npicker").value);
        if(!num || !Number.isInteger(num) || num<1 || num>100){
            document.getElementById("npicker").value=25;
            num = 25;
        }
        getItemList(getTimeStampFromDatePicker(),num,false,true);
    });

    $('#search2-btn').click(function () {
        $.ajax({
            url: '/item/'+$('#itemid').val(),
            type: 'get',
        }).done(function (result) {
            if(result.status === "OK"){
                removeCollectionItem();
                var item = result.item;
                createCollectionItem(item.username,item.content,item.timestamp,item.id);
                $("#loadmore-btn").hide();
            }
        }).fail(function (err) {
            console.error(err);
        });
    });

    $('#loadmore-btn').click(function () {
        getItemList(loadMoreTimestamp,25,true,false);
    });

    $('#deletebyid-btn').click(function () {
        $.ajax({
            url: '/item/'+$('#itemiddelete').val(),
            type: 'delete',
        }).done(function (result) {
            if(result.status === "OK"){
                Materialize.toast("delete successfully", 2500, "green");
                var currenttime2 = new Date().getTime()/1000;
                getItemList(currenttime2,25,false,false);
            }
        }).fail(function (err) {
            Materialize.toast("delete error", 2500, "red");
            console.error(err);
        });
        /*var uname1 = document.getElementById("usernamepicker").value;
        var query1 = document.getElementById("querypicker").value;
        if(!uname1 && !query1){
            window.alert(uname1);
            window.alert(query1);
        }
        window.alert(uname1);
        window.alert(query1);*/
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

    $('#tpicker').pickatime({
        autoclose: false,
        twelvehour: true,
        ampmclickable: false,
    });
/*var y_value = $("#textarea-container").offset().top;
window.alert(y_value);*/
});

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
    var datetemp = year+"-"+month+"-"+day;
    //document.getElementById("dpicker").value = year+"-"+month+"-"+day;
    return datetemp;
}

function getDefaultTime(date1){
    var date = date1;
    var hour = date.getHours();
    var min = date.getMinutes();
    var sec = date.getSeconds();
    if(hour<10){
        hour = "0"+hour;
    }
    if(min<10){
        min = "0"+min;
    }
    if(sec<10){
        sec = "0"+sec;
    }
    var t = hour+":"+min+":"+sec;
    return t;
}

function convertAMPMTime(time1){
    var part1 = time1.slice(0,5);
    var part2 = time1.slice(5,7);
    var part1 = part1.split(":");
    var hour = parseInt(part1[0]);
    var min = part1[1];
    if(part2 === "PM"){
        hour = hour+12;
    }
    if(hour<10){
        hour = "0"+hour;
    }
    return hour+":"+min;
}

function getTimeStampFromDatePicker(){
    var list = document.getElementById("dpicker").value;
    if(!list){
        list = setDefaultDate();
    }
    var list2 = document.getElementById("tpicker").value;
    if(!list2){
        list2 = getDefaultTime(new Date());
    }
    else{
        list2 = convertAMPMTime(list2);
    }
    list = list.split("-");
    list2 = list2.split(":");
    var date = new Date(list[0], list[1]-1, list[2]);
    date.setHours(list2[0],list2[1],59,999);
    var result = date.getTime()/1000;
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
        createCollectionItem(item.username,item.content,item.timestamp,item.id);
        if(i==itemlist.length-1){
            loadMoreTimestamp = item.timestamp;
        }
    }
}

function createCollectionItem(name,text,time,id){
    var tweet_list = document.getElementById("tweet-collection");
    var list_item = document.createElement('li');
    var icon = document.createElement('i');
    var title = document.createElement('span');
    var content_text = document.createElement('p');
    var time_text = document.createElement('span');
    var id_text = document.createElement('span');
    list_item.className = "collection-item avatar";
    icon.className = "material-icons circle";
    title.className = "title";
    time_text.className = "secondary-content";
    icon.innerHTML = "face";
    title.innerHTML = name;
    content_text.innerHTML = text;
    id_text.innerHTML = "ID: "+id;
    time_text.innerHTML = new Date(time*1000).toLocaleString();
    list_item.appendChild(icon);
    list_item.appendChild(title);
    list_item.appendChild(content_text);
    list_item.appendChild(time_text);
    list_item.appendChild(id_text);
    tweet_list.appendChild(list_item);
}

function getItemList(time,num,isLoadMore,isRearch){
    var uname1 = document.getElementById("usernamepicker").value;
    var query1 = document.getElementById("querypicker").value;
    var isFollowingOnly = document.getElementById("following-checkbox").checked;
    var requestParam = {timestamp: time, limit: num, following: isFollowingOnly};
    if(uname1){
        requestParam.username = uname1;
    }
    if(query1){
        requestParam.q = query1;
    }
    $.ajax({
        url: '/search',
        type: 'post',
        data: JSON.stringify(requestParam),
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
        Materialize.toast("search error", 2500, "red");
        console.error(err);
    });
}

