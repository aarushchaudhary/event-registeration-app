document.addEventListener("DOMContentLoaded", function() {
    // --- Load Header ---
    fetch('/header.html')
        .then(response => response.text())
        .then(data => {
            document.getElementById('header-placeholder').innerHTML = data;
            // Signal that the header is now in the DOM
            document.dispatchEvent(new Event('headerLoaded'));
        });

    // --- Load Footer ---
    fetch('/footer.html')
        .then(response => response.text())
        .then(data => {
            document.getElementById('footer-placeholder').innerHTML = data;
        });
});