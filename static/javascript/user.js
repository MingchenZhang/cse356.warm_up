/*
 *Javascript for the Twitter clone
 *Authors: Mingchen Zhang and Haozhi Qu
 */
$(document).ready(function(){
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

