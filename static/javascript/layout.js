/*
 *Javascript for the Twitter clone
 *Authors: Mingchen Zhang and Haozhi Qu
 */
$(document).ready(function(){
    var width = document.body.clientWidth;
    changeWidth(width);
    $(window).resize(function(){
        width = document.body.clientWidth;
        changeWidth(width);
    });
});

function changeWidth(width){
    if(width<815){
        document.getElementById("container-left").className = "col s12 m12 l12";
        document.getElementById("container-right").className = "col s12 m12 l12";
    }
    else{
        document.getElementById("container-left").className = "col s12 m5 l4";
        document.getElementById("container-right").className = "col s12 m7 l8";
    }
}


