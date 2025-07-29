// Authentication: login, logout, session management, user stats

window.Auth = {
    async checkAuthStatus() {
        try {
            const response = await fetch('/api/users');
            if (response.ok) {
                const users = await response.json();
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

        // Login form
        document.getElementById('login-btn')?.addEventListener('click', this.handleLogin);
        
        // Register form
        document.getElementById('register-btn')?.addEventListener('click', this.handleRegister);

        // Logout
        document.getElementById('logout-btn')?.addEventListener('click', this.handleLogout);

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

        if (!identifier || !password) {
            showNotification('Please fill in all fields', 'error');
            return;
        }

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

        // Validation
        if (!formData.nickname || !formData.email || !formData.firstName || 
            !formData.lastName || !formData.age || !formData.gender || !password) {
            showNotification('Please fill in all fields', 'error');
            return;
        }

        if (formData.age < 13) {
            showNotification('You must be at least 13 years old', 'error');
            return;
        }

        if (password.length < 8) {
            showNotification('Password must be at least 8 characters', 'error');
            return;
        }

        if (password !== confirmPassword) {
            showNotification('Passwords do not match', 'error');
            return;
        }

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
