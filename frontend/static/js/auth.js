window.Auth = {
    async checkAuthStatus() {
        try {
            const response = await fetch('/api/users/me', { credentials: 'include' });
            if (response.ok) {
                const user = await response.json();
                ForumApp.currentUser = user;
                showLoggedInUI();
                Posts.loadPosts();
                WebSocketClient.connect();
                console.log('User is authenticated:', user);
            } else if (response.status === 401) {
                // User is not authenticated, this is expected for first visit
                showLoggedOutUI();
                console.log('User is not authenticated');
            } else {
                // Other error occurred
                console.error('Auth check failed with status:', response.status);
                showLoggedOutUI();
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            showLoggedOutUI();
        }
    },

    async login(identifier, password) {
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier, password }),
                credentials: 'include'
            });

            if (response.ok) {
                const user = await response.json();
                ForumApp.currentUser = user;

                // Clear any previous error messages
                const errorDiv = document.getElementById('login-error');
                if (errorDiv) {
                    errorDiv.textContent = '';
                    errorDiv.classList.add('hidden');
                }

                DOM.loginModal.classList.add('hidden');
                showLoggedInUI();
                Posts.loadPosts();
                WebSocketClient.connect();
                showNotification('Login successful!');
                return true;
            } else {
                const error = await response.text();

                // Show specific error message in the login modal
                const errorDiv = document.getElementById('login-error');
                if (errorDiv) {
                    errorDiv.textContent = error || 'Login failed';
                    errorDiv.classList.remove('hidden');
                }

                // Also show notification for consistency
                showNotification(error || 'Login failed', 'error');
                return false;
            }
        } catch (error) {
            console.error('Login error:', error);

            // Show network error in the login modal
            const errorDiv = document.getElementById('login-error');
            if (errorDiv) {
                errorDiv.textContent = 'Network error. Please try again.';
                errorDiv.classList.remove('hidden');
            }

            showNotification('Login failed: Network error', 'error');
            return false;
        }
    },

    async register(formData, password) {
        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, password }),
                credentials: 'include'
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
                const errorDiv = document.getElementById('register-error');
                errorDiv.textContent = error || 'Registration failed';
                errorDiv.classList.remove('hidden');
                console.error(error ,'Registration failed with status:', response.status);
                return false;
            }
        } catch (error) {
            console.error('Registration error:', error);
            showNotification('Registration failed: Network error', 'error');
            return false;
        }
    },

    async logout() {
        try {
            await fetch('/api/logout', { method: 'POST', credentials: 'include' });
            ForumApp.currentUser = null;
            WebSocketClient.disconnect();
            showLoggedOutUI();
            showNotification('Logged out successfully');
            return true;
        } catch (error) {
            console.error('Logout error:', error);
            showNotification('Logout failed', 'error');
            return false;
        }
    },

    setupEventListeners() {
        document.getElementById('login-button')?.addEventListener('click', () => {
            DOM.loginModal.classList.remove('hidden');
        });

        document.getElementById('register-button')?.addEventListener('click', () => {
            DOM.registerModal.classList.remove('hidden');
        });

        document.getElementById('welcome-login-btn')?.addEventListener('click', () => {
            DOM.loginModal.classList.remove('hidden');
        });

        document.getElementById('welcome-register-btn')?.addEventListener('click', () => {
            DOM.registerModal.classList.remove('hidden');
        });

        document.getElementById('switch-to-register')?.addEventListener('click', () => {
            DOM.loginModal.classList.add('hidden');
            DOM.registerModal.classList.remove('hidden');
        });

        document.getElementById('switch-to-login')?.addEventListener('click', () => {
            DOM.registerModal.classList.add('hidden');
            DOM.loginModal.classList.remove('hidden');
        });

        document.getElementById('close-login-modal')?.addEventListener('click', () => {
            DOM.loginModal.classList.add('hidden');
        });

        document.getElementById('close-register-modal')?.addEventListener('click', () => {
            DOM.registerModal.classList.add('hidden');
        });

        document.getElementById('login-btn')?.addEventListener('click', this.handleLogin);

        document.getElementById('register-btn')?.addEventListener('click', this.handleRegister);

        document.getElementById('logout-btn')?.addEventListener('click', this.handleLogout);
        document.getElementById('floating-logout-btn')?.addEventListener('click', this.handleLogout);

        document.getElementById('edit-profile-btn')?.addEventListener('click', () => {
            this.loadProfileData();
            DOM.profileModal.classList.remove('hidden');
        });

        document.getElementById('save-profile-btn')?.addEventListener('click', this.handleSaveProfile);

        document.querySelectorAll('[data-edit-color]').forEach(button => {
            button.addEventListener('click', (e) => {
                document.querySelectorAll('[data-edit-color]').forEach(b => b.classList.remove('ring-2', 'ring-offset-2', 'ring-blue-500'));
                e.target.classList.add('ring-2', 'ring-offset-2', 'ring-blue-500');
            });
        });

        document.querySelectorAll('[data-color]').forEach(button => {
            button.addEventListener('click', (e) => {
                document.querySelectorAll('[data-color]').forEach(b => b.classList.remove('ring-2', 'ring-offset-2', 'ring-blue-500'));
                e.target.classList.add('ring-2', 'ring-offset-2', 'ring-blue-500');
            });
        });

        document.getElementById('login-password')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleLogin();
        });

        // Clear login error when user starts typing
        document.getElementById('login-identifier')?.addEventListener('input', () => {
            const errorDiv = document.getElementById('login-error');
            if (errorDiv) {
                errorDiv.textContent = '';
                errorDiv.classList.add('hidden');
            }
        });

        document.getElementById('login-password')?.addEventListener('input', () => {
            const errorDiv = document.getElementById('login-error');
            if (errorDiv) {
                errorDiv.textContent = '';
                errorDiv.classList.add('hidden');
            }
        });

        document.getElementById('register-confirm-password')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleRegister();
        });
    },

    handleLogin() {
        const identifier = document.getElementById('login-identifier').value.trim();
        const password = document.getElementById('login-password').value;
        const errorDiv = document.getElementById('login-error');

        if (!identifier) {
            errorDiv.textContent = 'Email or nickname is required';
            errorDiv.classList.remove('hidden');
            return;
        }
        if (!password) {
            errorDiv.textContent = 'Password is required';
            errorDiv.classList.remove('hidden');
            return;
        }

        errorDiv.classList.add('hidden');
        Auth.login(identifier, password);
    },

    handleRegister() {
        const formData = {
            nickname: document.getElementById('register-nickname').value.trim(),
            email: document.getElementById('register-email').value.trim(),
            firstName: document.getElementById('register-firstname').value.trim(),
            lastName: document.getElementById('register-lastname').value.trim(),
            age: parseInt(document.getElementById('register-age').value) || 0,
            gender: document.getElementById('register-gender').value,
            avatarColor: getSelectedAvatarColor()
        };

        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm-password').value;
        const errorDiv = document.getElementById('register-error');

        if (!formData.nickname) {
            errorDiv.textContent = 'Nickname is required';
            errorDiv.classList.remove('hidden');
            return;
        }
        if (!formData.email) {
            errorDiv.textContent = 'Email is required';
            errorDiv.classList.remove('hidden');
            return;
        }
        if (!formData.firstName || !formData.lastName) {
            errorDiv.textContent = 'First and last name are required';
            errorDiv.classList.remove('hidden');
            return;
        }
        if (!formData.age || formData.age < 13) {
            errorDiv.textContent = 'You must be at least 13 years old';
            errorDiv.classList.remove('hidden');
            return;
        }
        if (!formData.gender) {
            errorDiv.textContent = 'Gender is required';
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

    loadProfileData() {
        if (!ForumApp.currentUser) return;

        const user = ForumApp.currentUser;
        document.getElementById('edit-firstname').value = user.firstName || '';
        document.getElementById('edit-lastname').value = user.lastName || '';
        document.getElementById('edit-nickname').value = user.nickname || '';
        document.getElementById('edit-age').value = user.age || '';
        document.getElementById('edit-gender').value = user.gender || '';

        document.querySelectorAll('[data-edit-color]').forEach(button => {
            button.classList.remove('ring-2', 'ring-offset-2', 'ring-blue-500');
            if (button.dataset.editColor === user.avatarColor) {
                button.classList.add('ring-2', 'ring-offset-2', 'ring-blue-500');
            }
        });
    },

    handleSaveProfile() {
        const formData = {
            firstName: document.getElementById('edit-firstname').value.trim(),
            lastName: document.getElementById('edit-lastname').value.trim(),
            nickname: document.getElementById('edit-nickname').value.trim(),
            age: parseInt(document.getElementById('edit-age').value) || 0,
            gender: document.getElementById('edit-gender').value,
            avatarColor: document.querySelector('[data-edit-color].ring-2')?.dataset.editColor || ForumApp.currentUser.avatarColor
        };

        if (!formData.firstName || !formData.lastName || !formData.nickname) {
            showNotification('Please fill in all required fields', 'error');
            return;
        }

        if (formData.age && (formData.age < 13 || formData.age > 120)) {
            showNotification('Age must be between 13 and 120', 'error');
            return;
        }

        Auth.updateProfile(formData);
    },

    async updateProfile(profileData) {
        try {
            const response = await fetch('/api/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(profileData),
                credentials: 'include'
            });

            if (response.ok) {
                const updatedUser = await response.json();
                ForumApp.currentUser = { ...ForumApp.currentUser, ...updatedUser };
                showLoggedInUI();
                DOM.profileModal?.classList.add('hidden');
                showNotification('Profile updated successfully!');
            } else {
                const error = await response.text();
                showNotification(error || 'Failed to update profile', 'error');
            }
        } catch (error) {
            console.error('Profile update error:', error);
            showNotification('Error updating profile', 'error');
        }
    },

    handleLogout() {
        Auth.logout();
    }
};

document.addEventListener('DOMContentLoaded', function() {
    Auth.setupEventListeners();
});