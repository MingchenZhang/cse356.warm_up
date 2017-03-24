/*
 *Javascript for the Twitter clone
 *Authors: Mingchen Zhang and Haozhi Qu
 */
$(document).ready(function(){
$('#verify-btn').click(function () {
    $.ajax({
        url: '/verify',
        type: 'post',
        data: JSON.stringify({email: $("#verify-form input[name='email']").val(), key: $("#verify-form input[name='key']").val()}),
        contentType: "application/json; charset=utf-8",
        dataType: 'json'
    }).done(function (result) {
        Materialize.toast(result.error, 2500, "red");
        Materialize.toast(result.success, 2500, "green");
    }).fail(function (err) {
        console.error(err);
    });
});
});