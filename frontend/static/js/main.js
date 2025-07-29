// Application initialization and global utilities

// Global state
window.ForumApp = {
    currentUser: null,
    currentCategory: 'general',
    currentThreadId: null,
    currentChatUser: null,
    conversations: [],
    onlineUsers: []
};

// DOM Elements cache
const DOM = {
    welcomeScreen: null,
    forumContent: null,
    loginModal: null,
    registerModal: null,
    authButtons: null,
    userMenuContainer: null,
    usernameDisplay: null,
    userAvatar: null,
    onlineCount: null
};

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    initializeDOM();
    setupGlobalEventListeners();
    Auth.checkAuthStatus();
});

function initializeDOM() {
    DOM.welcomeScreen = document.getElementById('welcome-screen');
    DOM.forumContent = document.getElementById('forum-content');
    DOM.loginModal = document.getElementById('login-modal');
    DOM.registerModal = document.getElementById('register-modal');
    DOM.authButtons = document.getElementById('auth-buttons');
    DOM.userMenuContainer = document.getElementById('user-menu-container');
    DOM.usernameDisplay = document.getElementById('username-display');
    DOM.userAvatar = document.getElementById('user-avatar');
    DOM.onlineCount = document.getElementById('online-count');
}

function setupGlobalEventListeners() {
    // Modal close buttons
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal-close')) {
            closeModals();
        }
    });

    // Escape key to close modals
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeModals();
        }
    });
}

function closeModals() {
    DOM.loginModal?.classList.add('hidden');
    DOM.registerModal?.classList.add('hidden');
}

// UI state management
function showLoggedInUI() {
    DOM.welcomeScreen?.classList.add('hidden');
    DOM.forumContent?.classList.remove('hidden');
    DOM.authButtons?.classList.add('hidden');
    DOM.userMenuContainer?.classList.remove('hidden');
    
    if (ForumApp.currentUser) {
        DOM.usernameDisplay.textContent = ForumApp.currentUser.nickname;
        DOM.userAvatar.style.backgroundColor = `var(--${ForumApp.currentUser.avatarColor})`;
    }
}

function showLoggedOutUI() {
    DOM.welcomeScreen?.classList.remove('hidden');
    DOM.forumContent?.classList.add('hidden');
    DOM.authButtons?.classList.remove('hidden');
    DOM.userMenuContainer?.classList.add('hidden');
}

// Notification system
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type} fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50`;
    notification.style.backgroundColor = type === 'error' ? '#ef4444' : '#10b981';
    notification.style.color = 'white';
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(0)';
    }, 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
}

function formatTime(dateString) {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getSelectedAvatarColor() {
    const selected = document.querySelector('input[name="avatar-color"]:checked');
    return selected ? selected.value : 'blue-500';
}

// Export DOM and utility functions for other modules
window.DOM = DOM;
window.showNotification = showNotification;
window.showLoggedInUI = showLoggedInUI;
window.showLoggedOutUI = showLoggedOutUI;
window.formatDate = formatDate;
window.formatTime = formatTime;
window.escapeHtml = escapeHtml;
window.getSelectedAvatarColor = getSelectedAvatarColor;
