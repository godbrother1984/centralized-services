<#-- C.I.Group Corporate Login Template -->
<#-- File: keycloak-themes/cigroup-theme/login/login.ftl -->
<#-- Version: 2.1.0 -->
<#-- Date: 2025-09-19 -->

<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('username','password') displayInfo=realm.password && realm.registrationAllowed && !registrationDisabled??; section>
    <#if section = "header">
        ${msg("doLogIn")}
    <#elseif section = "form">
        <div id="kc-form">
            <div id="kc-form-wrapper">
                <div class="login-container">
                    <!-- Company Logo and Title -->
                    <div class="login-header">
                        <div class="company-logo">
                            <div class="logo-placeholder">🏢</div>
                        </div>
                        <h1 class="company-title">C.I.Group PCL.</h1>
                        <p class="company-subtitle">ระบบบริการส่วนกลางสำหรับองค์กร</p>
                    </div>

                    <!-- Error Messages -->
                    <#if messagesPerField.existsError('username','password')>
                        <div class="error-banner">
                            <div class="error-icon">⚠️</div>
                            <div class="error-content">
                                <p class="error-title">เกิดข้อผิดพลาดในการเข้าสู่ระบบ</p>
                                <p class="error-message">${kcSanitize(messagesPerField.getFirstError('username','password'))?no_esc}</p>
                            </div>
                        </div>
                    </#if>

                    <!-- Login Form -->
                    <#if realm.password>
                        <form id="kc-form-login" onsubmit="login.disabled = true; return true;" action="${url.loginAction}" method="post">
                            <div class="form-group">
                                <label for="username" class="form-label">
                                    <#if !realm.loginWithEmailAllowed>
                                        ${msg("username")}
                                    <#elseif !realm.registrationEmailAsUsername>
                                        ${msg("usernameOrEmail")}
                                    <#else>
                                        ${msg("email")}
                                    </#if>
                                </label>
                                <#if usernameEditDisabled??>
                                    <input tabindex="1"
                                           id="username"
                                           class="form-input disabled"
                                           name="username"
                                           value="${(login.username!'')}"
                                           type="text"
                                           disabled
                                           placeholder="<#if !realm.loginWithEmailAllowed>ชื่อผู้ใช้<#elseif !realm.registrationEmailAsUsername>ชื่อผู้ใช้หรืออีเมล<#else>อีเมล</#if>"
                                    />
                                <#else>
                                    <input tabindex="1"
                                           id="username"
                                           class="form-input <#if messagesPerField.existsError('username','password')>error</#if>"
                                           name="username"
                                           value="${(login.username!'')}"
                                           type="text"
                                           autofocus
                                           autocomplete="off"
                                           placeholder="<#if !realm.loginWithEmailAllowed>ชื่อผู้ใช้<#elseif !realm.registrationEmailAsUsername>ชื่อผู้ใช้หรืออีเมล<#else>อีเมล</#if>"
                                           aria-invalid="<#if messagesPerField.existsError('username','password')>true</#if>"
                                    />
                                </#if>
                                <#if messagesPerField.existsError('username')>
                                    <span id="input-error-username" class="field-error" aria-live="polite">
                                        ${kcSanitize(messagesPerField.getFirstError('username'))?no_esc}
                                    </span>
                                </#if>
                            </div>

                            <div class="form-group">
                                <label for="password" class="form-label">${msg("password")}</label>
                                <div class="password-input-wrapper">
                                    <input tabindex="2"
                                           id="password"
                                           class="form-input password-input <#if messagesPerField.existsError('username','password')>error</#if>"
                                           name="password"
                                           type="password"
                                           autocomplete="off"
                                           placeholder="รหัสผ่าน"
                                           aria-invalid="<#if messagesPerField.existsError('username','password')>true</#if>"
                                    />
                                    <button type="button" class="password-toggle" tabindex="-1">
                                        <span class="password-show">👁️</span>
                                        <span class="password-hide">🙈</span>
                                    </button>
                                </div>
                                <#if messagesPerField.existsError('password')>
                                    <span id="input-error-password" class="field-error" aria-live="polite">
                                        ${kcSanitize(messagesPerField.getFirstError('password'))?no_esc}
                                    </span>
                                </#if>
                            </div>

                            <!-- Remember Me & Forgot Password -->
                            <div class="form-options">
                                <#if realm.rememberMe && !usernameEditDisabled??>
                                    <div class="checkbox-group">
                                        <input tabindex="3"
                                               id="rememberMe"
                                               name="rememberMe"
                                               type="checkbox"
                                               class="form-checkbox"
                                               <#if login.rememberMe??>checked</#if>
                                        />
                                        <label class="checkbox-label" for="rememberMe">
                                            ${msg("rememberMe")}
                                        </label>
                                    </div>
                                </#if>

                                <#if realm.resetPasswordAllowed>
                                    <div class="forgot-password">
                                        <a tabindex="5" href="${url.loginResetCredentialsUrl}" class="forgot-link">
                                            ${msg("doForgotPassword")}
                                        </a>
                                    </div>
                                </#if>
                            </div>

                            <!-- Login Button -->
                            <div class="form-group">
                                <input type="hidden" id="id-hidden-input" name="credentialId" <#if auth.selectedCredential?has_content>value="${auth.selectedCredential}"</#if>/>
                                <input tabindex="4"
                                       class="btn-login"
                                       name="login"
                                       id="kc-login"
                                       type="submit"
                                       value="${msg("doLogIn")}"
                                />
                            </div>
                        </form>
                    </#if>

                    <!-- Social Login -->
                    <#if realm.password && social.providers??>
                        <div class="social-login">
                            <div class="social-divider">
                                <span class="social-divider-text">หรือเข้าสู่ระบบด้วย</span>
                            </div>

                            <div class="social-providers">
                                <#list social.providers as p>
                                    <a id="social-${p.alias}"
                                       class="social-link social-${p.alias}"
                                       href="${p.loginUrl}"
                                       title="${p.displayName}">
                                        <#switch p.alias>
                                            <#case "google">
                                                <span class="social-icon">🔍</span>
                                                <span class="social-text">Google</span>
                                                <#break>
                                            <#case "facebook">
                                                <span class="social-icon">📘</span>
                                                <span class="social-text">Facebook</span>
                                                <#break>
                                            <#case "github">
                                                <span class="social-icon">🐙</span>
                                                <span class="social-text">GitHub</span>
                                                <#break>
                                            <#case "microsoft">
                                                <span class="social-icon">🪟</span>
                                                <span class="social-text">Microsoft</span>
                                                <#break>
                                            <#case "line">
                                                <span class="social-icon">💬</span>
                                                <span class="social-text">LINE</span>
                                                <#break>
                                            <#default>
                                                <span class="social-icon">🔗</span>
                                                <span class="social-text">${p.displayName}</span>
                                        </#switch>
                                    </a>
                                </#list>
                            </div>
                        </div>
                    </#if>

                    <!-- Registration Link -->
                    <#if realm.password && realm.registrationAllowed && !registrationDisabled??>
                        <div class="registration-section">
                            <p class="registration-text">
                                ยังไม่มีบัญชี?
                                <a tabindex="6" href="${url.registrationUrl}" class="registration-link">
                                    สมัครสมาชิก
                                </a>
                            </p>
                        </div>
                    </#if>

                </div>
            </div>
        </div>

        <!-- Basic JavaScript for essential features -->
        <script>
        document.addEventListener('DOMContentLoaded', function() {
            // Password toggle functionality
            var passwordInput = document.getElementById('password');
            var passwordToggle = document.querySelector('.password-toggle');
            var showIcon = document.querySelector('.password-show');
            var hideIcon = document.querySelector('.password-hide');

            if (passwordToggle && passwordInput) {
                hideIcon.style.display = 'none';

                passwordToggle.addEventListener('click', function() {
                    if (passwordInput.type === 'password') {
                        passwordInput.type = 'text';
                        showIcon.style.display = 'none';
                        hideIcon.style.display = 'inline';
                    } else {
                        passwordInput.type = 'password';
                        showIcon.style.display = 'inline';
                        hideIcon.style.display = 'none';
                    }
                });
            }

            // Loading state for login button
            var loginForm = document.getElementById('kc-form-login');
            var loginButton = document.getElementById('kc-login');

            if (loginForm && loginButton) {
                loginForm.addEventListener('submit', function() {
                    loginButton.value = 'กำลังเข้าสู่ระบบ...';
                    loginButton.disabled = true;
                    loginButton.style.opacity = '0.7';
                });
            }

            // Auto-focus on username field
            var usernameField = document.getElementById('username');
            if (usernameField && !usernameField.value && !usernameField.disabled) {
                usernameField.focus();
            }

            // Time-based greeting
            var companyTitle = document.querySelector('.company-title');
            if (companyTitle) {
                var hour = new Date().getHours();
                var greeting = 'สวัสดี';

                if (hour < 12) {
                    greeting = 'สวัสดีตอนเช้า';
                } else if (hour < 17) {
                    greeting = 'สวัสดีตอนบ่าย';
                } else {
                    greeting = 'สวัสดีตอนเย็น';
                }

                var originalTitle = companyTitle.textContent.trim();
                if (originalTitle.indexOf('สวัสดี') === -1) {
                    companyTitle.textContent = greeting + '! เข้าสู่ระบบ ' + originalTitle;
                }
            }
        });
        </script>

    <#elseif section = "info" >
        <#-- This section is now integrated into the main form above -->
    </#if>

</@layout.registrationLayout>