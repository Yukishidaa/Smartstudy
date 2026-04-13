// Parallax effect
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const box = document.querySelector('.login-box, .register-box');
    if (box && scrolled < window.innerHeight) {
        box.style.transform = `translateY(${scrolled * 0.15}px)`;
    }
});
