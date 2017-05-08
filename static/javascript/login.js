/*
 *Javascript for the Twitter clone
 *Authors: Mingchen Zhang and Haozhi Qu
 */
$(document).ready(function(){
$('#loginDB-btn').click(function () {
    $.ajax({
        url: '/loginDB',
        type: 'post',
        data: JSON.stringify({username: $("#loginDB-form input[name='username']").val(),password: $("#loginDB-form input[name='password']").val()}),
        contentType: "application/json; charset=utf-8",
        dataType: 'json'
    }).done(function (result) {
        Materialize.toast(result.error, 2500, "red");
        if(typeof result.success!=="undefined"){
            location.reload();
        }
    }).fail(function (err) {
        console.error(err);
    });
});
});