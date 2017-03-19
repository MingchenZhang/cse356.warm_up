$(document).ready(function(){
$('#adduser-btn').click(function () {
    $.ajax({
        url: '/adduser',
        type: 'post',
        data: JSON.stringify({username: $("#adduser-form input[name='username']").val(),password: $("#adduser-form input[name='password']").val(), email: $("#adduser-form input[name='email']").val()}),
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