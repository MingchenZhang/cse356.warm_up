/*
 *Javascript for the Twitter clone
 *Authors: Mingchen Zhang and Haozhi Qu
 */
$(document).ready(function(){
	
        $('#finduser-btn').click(function () {
            $.ajax({
                url: '/user/'+$('#username2').val(),
                type: 'get',
            }).done(function (result) {
            if(result.status === "OK"){
                Materialize.toast("find successfully", 2500, "green");
                updateCard($('#username2').val(),result.user.email,result.user.following,result.user.followers);
            }
            }).fail(function (err) {
                Materialize.toast("find error", 2500, "red");
                console.error(err);
            });
        });


	$('#follow-btn').click(function () {
        $.ajax({
            url: '/follow',
            type: 'post',
            data: JSON.stringify({username: $('#username3').val(), follow: true}),
            contentType: "application/json; charset=utf-8",
            dataType: 'json'
        }).done(function (result) {
            if(result.status === "OK"){
                Materialize.toast("follow successfully", 2500, "green");
            }
        }).fail(function (err) {
            Materialize.toast("follow error", 2500, "red");
            console.error(err);
        });
    });

	$('#unfollow-btn').click(function () {
        $.ajax({
            url: '/follow',
            type: 'post',
            data: JSON.stringify({username: $('#username4').val(), follow: false}),
            contentType: "application/json; charset=utf-8",
            dataType: 'json'
        }).done(function (result) {
            if(result.status === "OK"){
                Materialize.toast("unfollow successfully", 2500, "green");
            }
        }).fail(function (err) {
            Materialize.toast("unfollow error", 2500, "red");
            console.error(err);
        });
    });

});



function updateCard(username,email,following,followers){
	$('.card-title').html(username);
	$('#manage-email').html(email);
	$('#manage-following').html(following);
	$('#manage-followers').html(followers);
}