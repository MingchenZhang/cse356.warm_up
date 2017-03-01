$('#submit-btn').click(function () {
    $.ajax({
        url: '/eliza/DOCTOR',
        type: 'post',
        data: JSON.stringify({name: '',human: $('#name-text').val()}),
        contentType: "application/json; charset=utf-8",
        dataType: 'json'
    }).done(function (result) {
        var area = $("#result-area");
        area.val( area.val() + "Eliza: " + result.eliza + "\n\n");
        if(area.length)
            area.scrollTop(area[0].scrollHeight - area.height());
    }).fail(function (err) {
        console.error(err);
    });
});