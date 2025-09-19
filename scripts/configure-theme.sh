#!/bin/bash
# Theme Configuration Script
# File: scripts/configure-theme.sh
# Version: 1.0.0
# Date: 2025-09-18
# Description: Script to configure Keycloak theme from environment variables

set -e

# Load environment variables from .env file
if [ -f .env ]; then
    echo "Loading environment variables from .env..."
    set -a
    source .env
    set +a
else
    echo "Warning: .env file not found. Using .env.example values..."
    if [ -f .env.example ]; then
        set -a
        source .env.example
        set +a
    else
        echo "Error: Neither .env nor .env.example found!"
        exit 1
    fi
fi

# Set default values if not provided
THEME_NAME=${THEME_NAME:-"cigroup-theme"}
COMPANY_NAME=${COMPANY_NAME:-"C.I.Group PCL."}
COMPANY_SHORT_NAME=${COMPANY_SHORT_NAME:-"C.I.Group"}
THEME_PRIMARY_COLOR=${THEME_PRIMARY_COLOR:-"#1e40af"}
THEME_PRIMARY_HOVER=${THEME_PRIMARY_HOVER:-"#1d4ed8"}
THEME_SECONDARY_COLOR=${THEME_SECONDARY_COLOR:-"#64748b"}
THEME_SUCCESS_COLOR=${THEME_SUCCESS_COLOR:-"#10b981"}
THEME_WARNING_COLOR=${THEME_WARNING_COLOR:-"#f59e0b"}
THEME_ERROR_COLOR=${THEME_ERROR_COLOR:-"#ef4444"}
THEME_BACKGROUND_GRADIENT=${THEME_BACKGROUND_GRADIENT:-"linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)"}
THEME_LOGO_URL=${THEME_LOGO_URL:-""}
THEME_LOGO_WIDTH=${THEME_LOGO_WIDTH:-"120px"}
THEME_LOGO_HEIGHT=${THEME_LOGO_HEIGHT:-"60px"}
THEME_SHOW_EMOJI_PLACEHOLDER=${THEME_SHOW_EMOJI_PLACEHOLDER:-"true"}
THEME_EMOJI_PLACEHOLDER=${THEME_EMOJI_PLACEHOLDER:-"🏢"}
THEME_DEBUG_MODE=${THEME_DEBUG_MODE:-"false"}

echo "Configuring theme: $THEME_NAME for $COMPANY_NAME"

# Create theme directory if it doesn't exist
THEME_DIR="keycloak-themes/${THEME_NAME}"
mkdir -p "${THEME_DIR}/login/resources/css"
mkdir -p "${THEME_DIR}/login/resources/js"
mkdir -p "${THEME_DIR}/login/resources/img"
mkdir -p "${THEME_DIR}/login/messages"

# Generate CSS variables file
echo "Generating CSS variables..."
cat > "${THEME_DIR}/login/resources/css/variables.css" << EOF
/* Auto-generated CSS Variables from Environment Configuration */
/* Generated on: $(date) */
/* Theme: ${THEME_NAME} */
/* Company: ${COMPANY_NAME} */

:root {
  /* Brand Colors */
  --primary-color: ${THEME_PRIMARY_COLOR};
  --primary-hover: ${THEME_PRIMARY_HOVER};
  --secondary-color: ${THEME_SECONDARY_COLOR};
  --success-color: ${THEME_SUCCESS_COLOR};
  --warning-color: ${THEME_WARNING_COLOR};
  --error-color: ${THEME_ERROR_COLOR};

  /* Background */
  --background-gradient: ${THEME_BACKGROUND_GRADIENT};

  /* Logo */
  --logo-width: ${THEME_LOGO_WIDTH};
  --logo-height: ${THEME_LOGO_HEIGHT};

  /* Common Variables */
  --text-primary: #1e293b;
  --text-secondary: #64748b;
  --card-background: rgba(255, 255, 255, 0.95);
  --border-radius: 12px;
  --shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  --transition: all 0.3s ease;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  :root {
    --card-background: rgba(30, 41, 59, 0.95);
    --text-primary: #f1f5f9;
    --text-secondary: #94a3b8;
  }
}
EOF

# Generate JavaScript configuration
echo "Generating JavaScript configuration..."
cat > "${THEME_DIR}/login/resources/js/config.js" << EOF
// Auto-generated Theme Configuration from Environment
// Generated on: $(date)
// Theme: ${THEME_NAME}
// Company: ${COMPANY_NAME}

window.ThemeConfig = {
  companyName: '${COMPANY_NAME}',
  companyShortName: '${COMPANY_SHORT_NAME}',
  themeName: '${THEME_NAME}',
  logoUrl: '${THEME_LOGO_URL}',
  logoWidth: '${THEME_LOGO_WIDTH}',
  logoHeight: '${THEME_LOGO_HEIGHT}',
  showEmojiPlaceholder: ${THEME_SHOW_EMOJI_PLACEHOLDER},
  emojiPlaceholder: '${THEME_EMOJI_PLACEHOLDER}',
  colors: {
    primary: '${THEME_PRIMARY_COLOR}',
    primaryHover: '${THEME_PRIMARY_HOVER}',
    secondary: '${THEME_SECONDARY_COLOR}',
    success: '${THEME_SUCCESS_COLOR}',
    warning: '${THEME_WARNING_COLOR}',
    error: '${THEME_ERROR_COLOR}'
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
EOF

# Update theme.properties with environment values
echo "Updating theme.properties..."
cat > "${THEME_DIR}/login/theme.properties" << EOF
# ${COMPANY_NAME} Corporate Theme
# File: keycloak-themes/${THEME_NAME}/login/theme.properties
# Version: 2.0.0
# Date: $(date +%Y-%m-%d)

parent=keycloak
import=common/keycloak

# Stylesheets
styles=css/login.css css/variables.css css/custom.css

# Scripts
scripts=js/config.js js/custom.js

# Locales
locales=en,th

# Social providers
social.google=true
social.facebook=true
social.github=true
social.line=true
social.microsoft=true

# Theme info
theme.displayName=${COMPANY_NAME} Corporate Theme
theme.description=Beautiful customizable theme for ${COMPANY_NAME} organizations

# Theme properties
companyName=${COMPANY_NAME}
systemDescription=${SYSTEM_DESCRIPTION}
logoUrl=${THEME_LOGO_URL}
debugMode=${THEME_DEBUG_MODE}
EOF

# Update Thai messages with company name
echo "Updating Thai messages..."
sed -i.bak "s/C\.I\.Group/${COMPANY_SHORT_NAME}/g" "${THEME_DIR}/login/messages/messages_th.properties"

echo "✅ Theme configuration completed successfully!"
echo "Theme: ${THEME_NAME}"
echo "Company: ${COMPANY_NAME}"
echo "Colors: Primary=${THEME_PRIMARY_COLOR}, Secondary=${THEME_SECONDARY_COLOR}"
echo ""
echo "Next steps:"
echo "1. Restart Keycloak: docker-compose restart keycloak"
echo "2. Configure theme in Keycloak Admin Console"
echo "3. Set Login theme to: ${THEME_NAME}"
echo ""
echo "Theme files location: ${THEME_DIR}/"