$(document).ready(function(){
    $.ajax({
        url: '/verify',
        type: 'post',
        data: JSON.stringify({email: document.getElementById("email").innerHTML, key: document.getElementById("key").innerHTML}),
        contentType: "application/json; charset=utf-8",
        dataType: 'json'
    }).done(function (result) {
        Materialize.toast(result.success, 2500, "green");
        document.getElementById("status").innerHTML = "Account Verified";
    }).fail(function (err) {
        console.error(err);
    });
});