// Auto-generated Theme Configuration from Environment
// Generated on: Fri, Sep 19, 2025  4:49:54 PM
// Theme: cigroup-theme
// Company: C.I.Group PCL.

window.ThemeConfig = {
  companyName: 'C.I.Group PCL.',
  companyShortName: 'C.I.Group',
  themeName: 'cigroup-theme',
  logoUrl: '',
  logoWidth: '120px',
  logoHeight: '60px',
  showEmojiPlaceholder: true,
  emojiPlaceholder: '🏢',
  colors: {
    primary: '#1e40af',
    primaryHover: '#1d4ed8',
    secondary: '#64748b',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444'
  }
};

// Apply dynamic configuration
document.addEventListener('DOMContentLoaded', function() {
  console.log('🏢 Theme Configuration Loaded:', window.ThemeConfig);

  // Update page title with company name
  const pageTitle = document.querySelector('#kc-page-title, .kc-page-title');
  if (pageTitle && !pageTitle.textContent.includes(window.ThemeConfig.companyShortName)) {
    const hour = new Date().getHours();
    let greeting = 'สวัสดี';

    if (hour < 12) {
      greeting = 'สวัสดีตอนเช้า';
    } else if (hour < 17) {
      greeting = 'สวัสดีตอนบ่าย';
    } else {
      greeting = 'สวัสดีตอนเย็น';
    }

    pageTitle.textContent = greeting + '! เข้าสู่ระบบ ' + window.ThemeConfig.companyShortName;
  }

  // Update logo if URL is provided
  if (window.ThemeConfig.logoUrl) {
    const brandElement = document.querySelector('.login-pf-brand');
    if (brandElement) {
      // Remove emoji placeholder
      brandElement.style.setProperty('--show-emoji', 'none');

      // Add logo image
      const logoImg = document.createElement('img');
      logoImg.src = window.ThemeConfig.logoUrl;
      logoImg.style.width = window.ThemeConfig.logoWidth;
      logoImg.style.height = window.ThemeConfig.logoHeight;
      logoImg.style.objectFit = 'contain';
      logoImg.alt = window.ThemeConfig.companyName + ' Logo';

      brandElement.insertBefore(logoImg, brandElement.firstChild);
    }
  }
});
