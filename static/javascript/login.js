$(document).ready(function(){
$('#login-btn').click(function () {
    $.ajax({
        url: '/login',
        type: 'post',
        data: JSON.stringify({username: $("#login-form input[name='username']").val(),password: $("#login-form input[name='password']").val()}),
        contentType: "application/json; charset=utf-8",
        dataType: 'json'
    }).done(function (result) {
        Materialize.toast(result.error, 2500, "red");
        //Materialize.toast(result.success, 2500, "green");
        if(typeof result.success!=="undefined"){
            location.reload();
        }
    }).fail(function (err) {
        console.error(err);
    });
});
});