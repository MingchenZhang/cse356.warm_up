$("#user-form").hide();
$('#adduser-btn').click(function () {
    $.ajax({
        url: '/adduser',
        type: 'post',
        data: JSON.stringify({username: $("#adduser-form input[name='username']").val(),password: $("#adduser-form input[name='password']").val(), email: $("#adduser-form input[name='email']").val()}),
        contentType: "application/json; charset=utf-8",
        dataType: 'json',
        error: function (data) {
            createAlert(data);
        }
    }).done(function (result) {
        Materialize.toast(result.success, 2500, "green");
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
        Materialize.toast(result.success, 2500, "green");
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
        dataType: 'json',
        error: function (data) {
            createAlert(data);
        }
    }).done(function (result) {
        $("#section1").hide();
        $("#user-form").show();
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
        emptyInputAndTextarea();
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
        area.val( area.val() + "Human: " + $('#name-text2').val() + "\n");
        area.val( area.val() + "Eliza: " + result.eliza + "\n\n");
        if(area.length)
            area.scrollTop(area[0].scrollHeight - area.height());
    }).fail(function (err) {
        console.error(err);
    });
});


$('#listconv-btn').click(function () {
    $.ajax({
        url: '/listconv',
        type: 'post',
        contentType: "application/json; charset=utf-8",
        dataType: 'json',
        success: function (data) {
            var area = $("#result-area3");
            area.val("");
            $.each(data, function(key, val){
                area.val( area.val() + "ID: " + val.id + "\n");
                area.val( area.val() + "Start Date: " + val.start_date + "\n\n");
                if(area.length)
                    area.scrollTop(area[0].scrollHeight - area.height());
            });
        }
    }).done(function (result) {
        //Materialize.toast(result.success, 2500, "green");
    }).fail(function (err) {
        console.error(err);
    });
});


$('#getconv-btn').click(function () {
    $.ajax({
        url: '/getconv',
        type: 'post',
        data: JSON.stringify({id: $('#id').val()}),
        contentType: "application/json; charset=utf-8",
        dataType: 'json',
        error: function (data) {
            //createAlert(data);
        },
        success: function (data) {
            var area = $("#result-area3");
            area.val("");
            $.each(data, function(key, val){
                area.val( area.val() + "Time Stamp: " + val.timestamp + "\n");
                area.val( area.val() + "Name: " + val.name + "\n");
                area.val( area.val() + "Text: " + val.text + "\n\n");
                if(area.length)
                    area.scrollTop(area[0].scrollHeight - area.height());
            });
        }
    }).done(function (result) {
        
    }).fail(function (err) {
        console.error(err);
    });
});


function createAlert(data){
    var temp = JSON.parse(data.responseText);
    Materialize.toast(temp.error, 2500, "red");
}

function emptyInputAndTextarea(){
    $('#adduser-form input').val("");
    $('#verify-form input').val("");
    $('#login-form input').val("");
    $('#user-form input').val("");
    $('#user-form textarea').val("");
}