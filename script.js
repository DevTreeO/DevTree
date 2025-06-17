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
        var $bar = $(this);
        var percentage = $bar.data('percentage');
        $bar.text(percentage + '%');
        $bar.css('width', '0%'); // Ensure starting at 0%
        setTimeout(function() {
            $bar.css('width', percentage + '%');
        }, 150); // Small delay ensures animation triggers
    });

    // Set current year in footer
    $('#current-year').text(new Date().getFullYear());
});
