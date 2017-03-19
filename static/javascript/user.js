$(document).ready(function(){

var name = document.getElementById("name").innerHTML;
var text = "This is a Test Tweet. This is a Test Tweet. This is a Test Tweet";

for(var i = 0; i<10; i++){
    createCollectionItem(name,text);
}
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
        //Materialize.toast(result.success, 2500, "green");
        if(typeof result.success!=="undefined"){
            document.location.href = "/";
        }
    }).fail(function (err) {
        console.error(err);
    });
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