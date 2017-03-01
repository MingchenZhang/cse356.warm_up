$("#user-form").hide();
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
        $("#section1").hide();
        $("#user-form").show();
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
        $("#section1").show();
        $("#user-form").hide();
        //window.alert(result.success);
    }).fail(function (err) {
        console.error(err);
    });
});

$('#submit-btn2').click(function () {
    $.ajax({
        url: '/eliza/DOCTOR',
        type: 'post',
        data: JSON.stringify({name: '',human: $('#name-text2').val()}),
        contentType: "application/json; charset=utf-8",
        dataType: 'json'
    }).done(function (result) {
        var area = $("#result-area2");
        area.val( area.val() + "\n\nEliza: " + result.eliza);
        if(area.length)
            area.scrollTop(area[0].scrollHeight - area.height());
    }).fail(function (err) {
        console.error(err);
    });
});

function listconv(){
    
}

function getconv(){
    
}
