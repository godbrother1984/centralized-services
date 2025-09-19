// C.I.Group Corporate Theme JavaScript
// File: keycloak-themes/cigroup-theme/login/resources/js/custom.js
// Version: 2.0.0
// Date: 2025-09-19

document.addEventListener('DOMContentLoaded', function() {
    console.log('🏢 C.I.Group Theme Loaded');

    // Add loading states to forms
    addLoadingStates();

    // Add interactive animations
    addInteractiveAnimations();

    // Add form validation
    addFormValidation();

    // Add password visibility toggle
    addPasswordToggle();

    // Add welcome message
    addWelcomeMessage();
});

/**
 * Add loading states to form submissions
 */
function addLoadingStates() {
    const forms = document.querySelectorAll('form');

    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            const submitBtn = form.querySelector('input[type="submit"], button[type="submit"]');

            if (submitBtn && !submitBtn.disabled) {
                // Add loading spinner
                const originalText = submitBtn.value || submitBtn.textContent;
                const loadingHTML = '<span class="loading-spinner"></span>กำลังดำเนินการ...';

                if (submitBtn.tagName === 'INPUT') {
                    submitBtn.value = 'กำลังดำเนินการ...';
                } else {
                    submitBtn.innerHTML = loadingHTML;
                }

                submitBtn.disabled = true;

                // Re-enable after 10 seconds (fallback)
                setTimeout(() => {
                    if (submitBtn.tagName === 'INPUT') {
                        submitBtn.value = originalText;
                    } else {
                        submitBtn.textContent = originalText;
                    }
                    submitBtn.disabled = false;
                }, 10000);
            }
        });
    });
}

/**
 * Add interactive animations
 */
function addInteractiveAnimations() {
    // Add focus effects to inputs
    const inputs = document.querySelectorAll('.form-control');

    inputs.forEach(input => {
        // Add floating label effect
        const label = input.previousElementSibling;
        if (label && label.tagName === 'LABEL') {
            input.addEventListener('focus', () => {
                label.style.transform = 'translateY(-20px) scale(0.85)';
                label.style.color = 'var(--primary-color)';
            });

            input.addEventListener('blur', () => {
                if (!input.value) {
                    label.style.transform = '';
                    label.style.color = '';
                }
            });
        }

        // Add ripple effect
        input.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;

            ripple.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                left: ${x}px;
                top: ${y}px;
                background: rgba(59, 130, 246, 0.3);
                border-radius: 50%;
                transform: scale(0);
                animation: rippleEffect 0.6s ease-out;
                pointer-events: none;
                z-index: 1;
            `;

            this.style.position = 'relative';
            this.style.overflow = 'hidden';
            this.appendChild(ripple);

            setTimeout(() => {
                if (ripple.parentNode) {
                    ripple.parentNode.removeChild(ripple);
                }
            }, 600);
        });
    });
}

/**
 * Add form validation
 */
function addFormValidation() {
    const emailInputs = document.querySelectorAll('input[type="email"], input[name="username"]');
    const passwordInputs = document.querySelectorAll('input[type="password"]');

    // Email validation
    emailInputs.forEach(input => {
        input.addEventListener('blur', function() {
            validateEmail(this);
        });

        input.addEventListener('input', function() {
            clearValidationError(this);
        });
    });

    // Password validation
    passwordInputs.forEach(input => {
        input.addEventListener('blur', function() {
            validatePassword(this);
        });

        input.addEventListener('input', function() {
            clearValidationError(this);
        });
    });
}

/**
 * Validate email format
 */
function validateEmail(input) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const value = input.value.trim();

    if (value && !emailRegex.test(value)) {
        showValidationError(input, 'กรุณาใส่อีเมลที่ถูกต้อง');
        return false;
    }

    clearValidationError(input);
    return true;
}

/**
 * Validate password strength
 */
function validatePassword(input) {
    const value = input.value;
    const minLength = 6;

    if (value && value.length < minLength) {
        showValidationError(input, `รหัสผ่านต้องมีอย่างน้อย ${minLength} ตัวอักษร`);
        return false;
    }

    clearValidationError(input);
    return true;
}

/**
 * Show validation error
 */
function showValidationError(input, message) {
    clearValidationError(input);

    const errorDiv = document.createElement('div');
    errorDiv.className = 'validation-error';
    errorDiv.style.cssText = `
        color: var(--error-color);
        font-size: 0.875rem;
        margin-top: 0.25rem;
        padding: 0.25rem 0;
        animation: slideInDown 0.3s ease-out;
    `;
    errorDiv.textContent = message;

    input.style.borderColor = 'var(--error-color)';
    input.parentNode.appendChild(errorDiv);
}

/**
 * Clear validation error
 */
function clearValidationError(input) {
    const existingError = input.parentNode.querySelector('.validation-error');
    if (existingError) {
        existingError.remove();
    }
    input.style.borderColor = '';
}

/**
 * Add password visibility toggle
 */
function addPasswordToggle() {
    const passwordInputs = document.querySelectorAll('input[type="password"]');

    passwordInputs.forEach(input => {
        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.innerHTML = '👁️';
        toggleBtn.style.cssText = `
            position: absolute;
            right: 12px;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            font-size: 1.2rem;
            cursor: pointer;
            z-index: 2;
            opacity: 0.6;
            transition: opacity 0.3s ease;
        `;

        toggleBtn.addEventListener('mouseenter', () => {
            toggleBtn.style.opacity = '1';
        });

        toggleBtn.addEventListener('mouseleave', () => {
            toggleBtn.style.opacity = '0.6';
        });

        toggleBtn.addEventListener('click', () => {
            const isPassword = input.type === 'password';
            input.type = isPassword ? 'text' : 'password';
            toggleBtn.innerHTML = isPassword ? '🙈' : '👁️';
        });

        // Make parent position relative
        input.parentNode.style.position = 'relative';
        input.style.paddingRight = '45px';
        input.parentNode.appendChild(toggleBtn);
    });
}

/**
 * Add welcome message based on time
 */
function addWelcomeMessage() {
    const hour = new Date().getHours();
    let greeting;

    if (hour < 12) {
        greeting = 'สวัสดีตอนเช้า';
    } else if (hour < 17) {
        greeting = 'สวัสดีตอนบ่าย';
    } else {
        greeting = 'สวัสดีตอนเย็น';
    }

    const titleElement = document.querySelector('.kc-page-title, .login-pf-header h1');
    if (titleElement && !titleElement.textContent.includes('สวัสดี')) {
        titleElement.textContent = `${greeting}! เข้าสู่ระบบ C.I.Group`;
    }
}

// Add CSS animations to head
const style = document.createElement('style');
style.textContent = `
    @keyframes rippleEffect {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }

    .validation-error {
        animation: slideInDown 0.3s ease-out;
    }

    @keyframes slideInDown {
        from {
            opacity: 0;
            transform: translateY(-10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;
document.head.appendChild(style);

// Add keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + Enter to submit form
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        const form = document.querySelector('form');
        if (form) {
            form.dispatchEvent(new Event('submit', { cancelable: true }));
        }
    }
});

// Add system theme detection
function updateTheme() {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
}

updateTheme();
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateTheme);