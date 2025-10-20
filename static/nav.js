document.addEventListener('DOMContentLoaded', () => {
    // --- Mobile Navbar Toggle ---
    const navToggle = document.querySelector('.nav-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (navToggle) {
        navToggle.addEventListener('click', () => {
            navLinks.classList.toggle('nav-active');
            navToggle.classList.toggle('nav-active');
        });
    }
});