document.addEventListener("DOMContentLoaded", () => {
    
    // Intersection Observer for scroll animations (fade-up elements)
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.15
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Optional: stop observing once it has become visible
                // observer.unobserve(entry.target); 
            }
        });
    }, observerOptions);

    const fadeElements = document.querySelectorAll('.fade-up');
    fadeElements.forEach(el => observer.observe(el));

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if(targetId === '#') return;
            
            const targetNode = document.querySelector(targetId);
            if(targetNode) {
                targetNode.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    // Optional: Add interactivity to pricing buttons
    const pricingBtns = document.querySelectorAll('.pricing-card .btn');
    pricingBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tier = e.target.closest('.pricing-card').querySelector('.tier-name').innerText;
            alert(`Simulated Action: Selected the ${tier} Tier for ShadowPay onboarding.`);
        });
    });

});
