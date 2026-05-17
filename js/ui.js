/* ============================================================
   LAMBANG_STUDIO — UI Controller (Navbar, Menu, Alerts, Scroll)
   File: js/ui.js
   ============================================================ */

// ── Global Element References ──
const navbar       = document.getElementById('navbar');
const navContainer = document.getElementById('nav-container');
const heroContent  = document.getElementById('hero-content');
const menuToggle   = document.getElementById('menu-toggle');
const menuOverlay  = document.getElementById('mobile-overlay');
const iconMenu     = document.getElementById('icon-menu');
const iconClose    = document.getElementById('icon-close');
const alertBox     = document.getElementById('alert-box');

// ── Mobile Menu State ──
let isMenuOpen = false;

function toggleMenu() {
    isMenuOpen = !isMenuOpen;
    if (isMenuOpen) {
        menuOverlay.classList.add('open', 'pointer-events-auto');
        document.body.classList.add('no-scroll');
        iconMenu.style.opacity   = '0';
        iconMenu.style.transform = 'scale(0.75)';
        iconClose.style.opacity  = '1';
        iconClose.style.transform = 'scale(1)';
    } else {
        menuOverlay.classList.remove('open', 'pointer-events-auto');
        document.body.classList.remove('no-scroll');
        iconMenu.style.opacity   = '1';
        iconMenu.style.transform = 'scale(1)';
        iconClose.style.opacity  = '0';
        iconClose.style.transform = 'scale(0.75)';
    }
}

if (menuToggle) {
    menuToggle.addEventListener('click', toggleMenu);
}

// ── Alert Toast System ──
function showAlert(msg) {
    if (!alertBox) return;
    alertBox.innerText = msg;
    alertBox.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-4');
    alertBox.classList.add('opacity-100', 'translate-y-0');
    setTimeout(() => {
        alertBox.classList.add('opacity-0', 'pointer-events-none', 'translate-y-4');
        alertBox.classList.remove('opacity-100', 'translate-y-0');
    }, 3000);
}

// ── Showreel Overlay ──
function openShowreel() {
    const overlay = document.getElementById('showreel-overlay');
    const video   = document.getElementById('reel-video');
    if (overlay && video) {
        overlay.classList.remove('pointer-events-none');
        overlay.classList.add('opacity-100');
        video.play();
        document.body.classList.add('no-scroll');
    }
}

function closeShowreel() {
    const overlay = document.getElementById('showreel-overlay');
    const video   = document.getElementById('reel-video');
    if (overlay && video) {
        overlay.classList.add('pointer-events-none');
        overlay.classList.remove('opacity-100');
        video.pause();
        document.body.classList.remove('no-scroll');
    }
}

// ── Contact Modal ──
function openContact() {
    const modal = document.getElementById('contact-modal');
    if (modal) {
        modal.classList.remove('pointer-events-none');
        modal.classList.add('opacity-100');
        document.body.classList.add('no-scroll');
    }
}

function closeContact() {
    const modal = document.getElementById('contact-modal');
    if (modal) {
        modal.classList.add('pointer-events-none');
        modal.classList.remove('opacity-100');
        document.body.classList.remove('no-scroll');
    }
}

function handleContactSubmit(e) {
    e.preventDefault();
    closeContact();
    showAlert('Proposal sent successfully!');
    e.target.reset();
}

// ── Scroll Behaviors ──
let ticking = false;
window.addEventListener('scroll', () => {
    if (!ticking) {
        requestAnimationFrame(() => {
            const scrolled = window.scrollY > 50;
            if (scrolled) {
                navbar.style.paddingTop = 'max(0.75rem, calc(0.5rem + env(safe-area-inset-top)))';
                navContainer.classList.add('bg-black/60','backdrop-blur-xl','rounded-full','border','border-white/5','mx-4','md:mx-12','py-3','pr-4','pl-8');
            } else {
                navbar.style.paddingTop = 'max(1.5rem, calc(1rem + env(safe-area-inset-top)))';
                navContainer.classList.remove('bg-black/60','backdrop-blur-xl','rounded-full','border','border-white/5','mx-4','md:mx-12','py-3','pr-4','pl-8');
            }
            if (window.innerWidth >= 768 && heroContent) {
                const yPos    = window.scrollY * 0.3;
                const opacity = Math.max(0, 1 - window.scrollY / 600);
                heroContent.style.transform = `translateY(${yPos}px)`;
                heroContent.style.opacity   = opacity;
            }
            ticking = false;
        });
        ticking = true;
    }
});

// ── Scroll Reveal Observer ──
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('visible');
    });
}, { threshold: 0.15 });

document.querySelectorAll('.reveal-on-scroll, .project-card').forEach(el => revealObserver.observe(el));

// ── Global Backdrop Dismiss ──
document.getElementById('contact-modal').addEventListener('click', function(e) {
    if (e.target === this) closeContact();
});

document.getElementById('showreel-overlay').addEventListener('click', function(e) {
    if (e.target === this || e.target.tagName === 'VIDEO') closeShowreel();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeContact();
        closeShowreel();
        closeVortexModal();
        closeEtherealRemoverModal();
        if (isMenuOpen) toggleMenu();
    }
});

// ── Hero Title Letter Scatter FX ──
function initHeroScatterFX() {
    const title = document.getElementById("galaxyTitle");
    if (!title) return;

    const text = title.innerText.replace(/\n/g, " ");
    title.innerHTML = "";
    text.split("").forEach((char) => {
        const span = document.createElement("span");
        span.innerText = char === " " ? "\u00A0" : char;
        span.className = "inline-block transition-all duration-700";
        title.appendChild(span);
    });

    const letters = title.querySelectorAll("span");

    title.parentElement.addEventListener("mouseenter", () => {
        letters.forEach((el) => {
            const x   = (Math.random() - 0.5) * 120;
            const y   = (Math.random() - 0.5) * 120;
            const rot = (Math.random() - 0.5) * 360;
            el.style.transform = `translate(${x}px, ${y}px) rotate(${rot}deg)`;
            el.style.opacity   = "0.2";
            el.style.filter    = "blur(2px)";
        });
    });

    title.parentElement.addEventListener("mouseleave", () => {
        letters.forEach((el) => {
            el.style.transform = "translate(0,0) rotate(0deg)";
            el.style.opacity   = "1";
            el.style.filter    = "blur(0)";
        });
    });
}
