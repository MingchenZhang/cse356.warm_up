$("#logout-btn").hide();
$('#adduser-btn').click(function () {
    $.ajax({
        url: '/adduser',
        type: 'post',
        data: JSON.stringify({username: $("#adduser-form input[name='username']").val(),password: $("#adduser-form input[name='password']").val(), email: $("#adduser-form input[name='email']").val()}),
        contentType: "application/json; charset=utf-8",
        dataType: 'json'
    }).done(function (result) {
        //window.alert(result.success);
    }).fail(function (err) {
        console.error(err);
    });
});

$('#verify-btn').click(function () {
    $.ajax({
        url: '/verify',
        type: 'post',
        data: JSON.stringify({email: $("#verify-form input[name='email']").val(), key: $("#verify-form input[name='key']").val()}),
        contentType: "application/json; charset=utf-8",
        dataType: 'json'
    }).done(function (result) {
        //window.alert(result.success);
    }).fail(function (err) {
        console.error(err);
    });
});

$('#login-btn').click(function () {
    $.ajax({
        url: '/login',
        type: 'post',
        data: JSON.stringify({username: $("#login-form input[name='username']").val(),password: $("#login-form input[name='password']").val()}),
        contentType: "application/json; charset=utf-8",
        dataType: 'json'
    }).done(function (result) {
        $("#verify-form").hide();
        $("#adduser-form").hide();
        $("#login-form").hide();
        $("#logout-btn").show();
        //window.alert(result.success);
    }).fail(function (err) {
        console.error(err);
    });
});


$('#logout-btn').click(function () {
    $.ajax({
        url: '/logout',
        type: 'post',
        contentType: "application/json; charset=utf-8",
        dataType: 'json'
    }).done(function (result) {
        $("#verify-form").show();
        $("#adduser-form").show();
        $("#login-form").show();
        $("#logout-btn").hide();
        //window.alert(result.success);
    }).fail(function (err) {
        console.error(err);
    });
});


function listconv(){
    
}

function getconv(){
    
}
