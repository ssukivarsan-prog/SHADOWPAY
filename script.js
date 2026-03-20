/**
 * ShadowPay Core Logic
 * Handles interactive elements, mock routing visualization, and dynamic updates
 */

document.addEventListener("DOMContentLoaded", () => {
    
    // Simulate active path highlighting based on filename
    const path = window.location.pathname;
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.classList.remove('active');
        if (path.includes(item.getAttribute('href'))) {
            item.classList.add('active');
        } else if (path.endsWith('/') && item.getAttribute('href') === 'dashboard.html') {
            // Default edge case
        }
    });

    // Mock Live Data Updater for Dashboard
    const actualEarningsEl = document.getElementById('actual-earnings');
    const shadowEarningsEl = document.getElementById('shadow-earnings');
    const gapFill = document.querySelector('.progress-fill.actual');
    
    if (actualEarningsEl && shadowEarningsEl) {
        // Subtle fluctuation simulation
        setInterval(() => {
            let actual = parseInt(actualEarningsEl.innerText.replace('₹', ''));
            if (Math.random() > 0.5 && actual < 300) {
                actual += Math.floor(Math.random() * 5);
                actualEarningsEl.innerText = '₹' + actual;
                
                // Update Gap bar visually
                const shadow = parseInt(shadowEarningsEl.innerText.replace('₹', ''));
                const percent = (actual / shadow) * 100;
                gapFill.style.width = Math.min(percent, 85) + '%';
            }
        }, 3000);
    }

    // Mock Login Workflow
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const btn = loginForm.querySelector('.btn-primary');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="ph-bold ph-spinner ph-spin"></i> Verifying...';
            btn.style.opacity = '0.7';
            
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1200);
        });
    }

    // Interactive Pricing Selection
    const planBtns = document.querySelectorAll('.select-plan-btn');
    planBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const plan = e.target.getAttribute('data-plan');
            const price = e.target.getAttribute('data-price');
            
            // Revert all 
            document.querySelectorAll('.tier-card').forEach(c => c.style.borderColor = 'var(--glass-border)');
            
            // Highlight selected
            const card = e.target.closest('.tier-card');
            card.style.borderColor = 'var(--accent-primary)';
            
            e.target.innerHTML = '<i class="ph-bold ph-check"></i> Selected';
            e.target.style.background = 'var(--success)';
            
            // Give impression of connection
            setTimeout(() => {
                alert(`Setting up UPI Autopay for ShadowPay ${plan} at ₹${price}/week...`);
            }, 500);
        });
    });

    // Action button handlers
    const reportBtn = document.getElementById('btn-report');
    if (reportBtn) {
        reportBtn.addEventListener('click', () => {
            alert('Initiating Peer Consensus Check. Scanning for nearby delivery partners...');
        });
    }
});
