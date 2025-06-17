$(document).ready(function() {
    // Smooth scrolling for navigation links
    $('nav a').on('click', function(event) {
        if (this.hash !== "") {
            event.preventDefault();
            var hash = this.hash;
            $('html, body').animate({
                scrollTop: $(hash).offset().top
            }, 800, function(){
                window.location.hash = hash;
            });
        }
    });

    // Animate progress bars and show only the percentage inside
    $('.progress-bar').each(function() {
        var percentage = $(this).data('percentage');
        $(this).css('width', percentage + '%');
        $(this).text(percentage + '%');
    });

    // Set current year in footer
    $('#current-year').text(new Date().getFullYear());
});
