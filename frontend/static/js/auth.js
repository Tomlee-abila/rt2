// Authentication: login, logout, session management, user stats

window.Auth = {
    async checkAuthStatus() {
        try {
            const response = await fetch('/api/users');
            if (response.ok) {
                // If we can fetch users, we're authenticated
                showLoggedInUI();
                Posts.loadPosts();
                WebSocketClient.connect();
            } else {
                showLoggedOutUI();
            }
        } catch (error) {
            showLoggedOutUI();
        }
    },

    async login(identifier, password) {
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ identifier, password }),
            });

            if (response.ok) {
                const user = await response.json();
                ForumApp.currentUser = user;
                DOM.loginModal.classList.add('hidden');
                showLoggedInUI();
                Posts.loadPosts();
                WebSocketClient.connect();
                showNotification('Login successful!');
                return true;
            } else {
                showNotification('Invalid credentials', 'error');
                return false;
            }
        } catch (error) {
            showNotification('Login failed', 'error');
            return false;
        }
    },

    async register(formData, password) {
        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ...formData, password }),
            });

            if (response.ok) {
                const user = await response.json();
                ForumApp.currentUser = user;
                DOM.registerModal.classList.add('hidden');
                showLoggedInUI();
                Posts.loadPosts();
                WebSocketClient.connect();
                showNotification('Registration successful!');
                return true;
            } else {
                const error = await response.text();
                showNotification(error, 'error');
                return false;
            }
        } catch (error) {
            showNotification('Registration failed', 'error');
            return false;
        }
    },

    async logout() {
        try {
            await fetch('/api/logout', { method: 'POST' });
            ForumApp.currentUser = null;
            WebSocketClient.disconnect();
            showLoggedOutUI();
            showNotification('Logged out successfully');
            return true;
        } catch (error) {
            showNotification('Logout failed', 'error');
            return false;
        }
    },

    setupEventListeners() {
        // Auth buttons
        document.getElementById('login-button')?.addEventListener('click', () => {
            DOM.loginModal.classList.remove('hidden');
        });

        document.getElementById('register-button')?.addEventListener('click', () => {
            DOM.registerModal.classList.remove('hidden');
        });

        // Modal switches
        document.getElementById('switch-to-register')?.addEventListener('click', () => {
            DOM.loginModal.classList.add('hidden');
            DOM.registerModal.classList.remove('hidden');
        });

        document.getElementById('switch-to-login')?.addEventListener('click', () => {
            DOM.registerModal.classList.add('hidden');
            DOM.loginModal.classList.remove('hidden');
        });

        // Login form
        document.getElementById('login-btn')?.addEventListener('click', this.handleLogin);

        // Register form
        document.getElementById('register-btn')?.addEventListener('click', this.handleRegister);

        // Logout buttons
        document.getElementById('logout-btn')?.addEventListener('click', this.handleLogout);
        document.getElementById('floating-logout-btn')?.addEventListener('click', this.handleLogout);

        // Profile edit
        document.getElementById('edit-profile-btn')?.addEventListener('click', () => {
            DOM.profileModal.classList.remove('hidden');
        });

        // Avatar color selection
        document.querySelectorAll('[data-color]').forEach(button => {
            button.addEventListener('click', (e) => {
                document.querySelectorAll('[data-color]').forEach(b => b.classList.remove('ring-2', 'ring-offset-2', 'ring-blue-500'));
                e.target.classList.add('ring-2', 'ring-offset-2', 'ring-blue-500');
            });
        });

        // Enter key support for forms
        document.getElementById('login-password')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleLogin();
            }
        });

        document.getElementById('register-confirm-password')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleRegister();
            }
        });
    },

    handleLogin() {
        const identifier = document.getElementById('login-identifier').value;
        const password = document.getElementById('login-password').value;
        const errorDiv = document.getElementById('login-error');

        if (!identifier || !password) {
            errorDiv.textContent = 'Please fill in all fields';
            errorDiv.classList.remove('hidden');
            return;
        }

        errorDiv.classList.add('hidden');
        Auth.login(identifier, password);
    },

    handleRegister() {
        const formData = {
            nickname: document.getElementById('register-nickname').value,
            email: document.getElementById('register-email').value,
            firstName: document.getElementById('register-firstname').value,
            lastName: document.getElementById('register-lastname').value,
            age: parseInt(document.getElementById('register-age').value),
            gender: document.getElementById('register-gender').value,
            avatarColor: getSelectedAvatarColor(),
        };

        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm-password').value;
        const errorDiv = document.getElementById('register-error');

        // Validation
        if (!formData.nickname || !formData.email || !formData.firstName ||
            !formData.lastName || !formData.age || !formData.gender || !password) {
            errorDiv.textContent = 'Please fill in all fields';
            errorDiv.classList.remove('hidden');
            return;
        }

        if (formData.age < 13) {
            errorDiv.textContent = 'You must be at least 13 years old';
            errorDiv.classList.remove('hidden');
            return;
        }

        if (password.length < 8) {
            errorDiv.textContent = 'Password must be at least 8 characters';
            errorDiv.classList.remove('hidden');
            return;
        }

        if (password !== confirmPassword) {
            errorDiv.textContent = 'Passwords do not match';
            errorDiv.classList.remove('hidden');
            return;
        }

        errorDiv.classList.add('hidden');
        Auth.register(formData, password);
    },

    handleLogout() {
        Auth.logout();
    }
};

// Initialize auth event listeners when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    Auth.setupEventListeners();
});
