$(document).ready(function(){
	
	$('#finduser-btn').click(function () {
        /*$.ajax({
            url: '/user/'+$('#username2').val(),
            type: 'get',
        }).done(function (result) {
            if(result.status === "OK"){
            	updateCard("ss","ss","ss","ss");
            }
        }).fail(function (err) {
            console.error(err);
        });*/
		window.alert(222);
    });


	$('#follow-btn').click(function () {
        /*$.ajax({
            url: '/follow',
            type: 'post',
            data: JSON.stringify({username: $('#username3').val(), follow: true}),
            contentType: "application/json; charset=utf-8",
            dataType: 'json'
        }).done(function (result) {
            Materialize.toast(result.error, 2500, "red");
            Materialize.toast(result.success, 2500, "green");
        }).fail(function (err) {
            console.error(err);
        });*/
        window.alert(333);
    });

	$('#unfollow-btn').click(function () {
        /*$.ajax({
            url: '/follow',
            type: 'post',
            data: JSON.stringify({username: $('#username4').val(), follow: false}),
            contentType: "application/json; charset=utf-8",
            dataType: 'json'
        }).done(function (result) {
            Materialize.toast(result.error, 2500, "red");
            Materialize.toast(result.success, 2500, "green");
        }).fail(function (err) {
            console.error(err);
        });*/
        window.alert(444);
    });

});



function updateCard(username,email,following,followers){
	$('.card-title').html(username);
	$('#manage-email').html(email);
	$('#manage-following').html(following);
	$('#manage-followers').html(followers);
}