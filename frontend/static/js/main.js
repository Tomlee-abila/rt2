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
    profileModal: null,
    authButtons: null,
    userMenuContainer: null,
    usernameDisplay: null,
    userAvatar: null,
    onlineCount: null,
    mobileMenu: null,
    threadsContainer: null,
    threadDetail: null,
    threadForm: null,
    chatWindow: null,
    newMessageModal: null,
    mobileMessagesPanel: null,
    mobileChatPanel: null
};

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    initializeDOM();
    setupGlobalEventListeners();
    initializeCategories();
    Auth.checkAuthStatus();
});

function initializeDOM() {
    DOM.welcomeScreen = document.getElementById('welcome-screen');
    DOM.forumContent = document.getElementById('forum-content');
    DOM.loginModal = document.getElementById('login-modal');
    DOM.registerModal = document.getElementById('register-modal');
    DOM.profileModal = document.getElementById('profile-modal');
    DOM.authButtons = document.getElementById('auth-buttons');
    DOM.userMenuContainer = document.getElementById('user-menu-container');
    DOM.usernameDisplay = document.getElementById('username-display');
    DOM.userAvatar = document.getElementById('user-avatar');
    DOM.onlineCount = document.getElementById('online-count');
    DOM.mobileMenu = document.getElementById('mobile-menu');
    DOM.threadsContainer = document.getElementById('threads-container');
    DOM.threadDetail = document.getElementById('thread-detail');
    DOM.threadForm = document.getElementById('thread-form');
    DOM.chatWindow = document.getElementById('chat-window');
    DOM.newMessageModal = document.getElementById('new-message-modal');
    DOM.mobileMessagesPanel = document.getElementById('mobile-messages-panel');
    DOM.mobileChatPanel = document.getElementById('mobile-chat-panel');
}

function setupGlobalEventListeners() {
    // Modal close buttons
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal-close') ||
            e.target.id.includes('close-') ||
            e.target.closest('[id*="close-"]')) {
            closeModals();
        }
    });

    // Escape key to close modals
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeModals();
        }
    });

    // Mobile menu toggle
    document.getElementById('mobile-menu-button')?.addEventListener('click', toggleMobileMenu);

    // Welcome screen buttons
    document.getElementById('welcome-login-btn')?.addEventListener('click', () => {
        DOM.loginModal?.classList.remove('hidden');
    });

    document.getElementById('welcome-register-btn')?.addEventListener('click', () => {
        DOM.registerModal?.classList.remove('hidden');
    });

    // User menu dropdown
    document.getElementById('user-menu-button')?.addEventListener('click', () => {
        const dropdown = document.getElementById('user-dropdown');
        dropdown?.classList.toggle('hidden');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        const userMenu = document.getElementById('user-menu-container');
        const dropdown = document.getElementById('user-dropdown');
        if (userMenu && !userMenu.contains(e.target)) {
            dropdown?.classList.add('hidden');
        }
    });

    // Mobile bottom navigation
    document.getElementById('mobile-categories-btn')?.addEventListener('click', toggleMobileMenu);
    document.getElementById('mobile-home-btn')?.addEventListener('click', () => {
        // Show main forum content
        document.getElementById('mobile-messages-panel')?.classList.add('hidden');
        document.getElementById('mobile-chat-panel')?.classList.add('hidden');
    });

    document.getElementById('mobile-profile-btn')?.addEventListener('click', () => {
        if (ForumApp.currentUser) {
            DOM.profileModal?.classList.remove('hidden');
        } else {
            DOM.loginModal?.classList.remove('hidden');
        }
    });
}

function closeModals() {
    DOM.loginModal?.classList.add('hidden');
    DOM.registerModal?.classList.add('hidden');
    DOM.profileModal?.classList.add('hidden');
    DOM.newMessageModal?.classList.add('hidden');
}

function toggleMobileMenu() {
    DOM.mobileMenu?.classList.toggle('hidden');
}

// UI state management
function showLoggedInUI() {
    DOM.welcomeScreen?.classList.add('hidden');
    DOM.forumContent?.classList.remove('hidden');
    DOM.authButtons?.classList.add('hidden');
    DOM.userMenuContainer?.classList.remove('hidden');
    document.getElementById('floating-logout')?.classList.remove('hidden');

    if (ForumApp.currentUser) {
        DOM.usernameDisplay.textContent = ForumApp.currentUser.nickname;
        const initials = ForumApp.currentUser.nickname.substring(0, 2).toUpperCase();
        DOM.userAvatar.textContent = initials;
        DOM.userAvatar.className = `w-8 h-8 rounded-full bg-${ForumApp.currentUser.avatarColor || 'blue-500'} flex items-center justify-center text-sm font-semibold text-white`;

        // Update online count and load conversations
        updateOnlineCount();
        loadConversations();
    }
}

function showLoggedOutUI() {
    DOM.welcomeScreen?.classList.remove('hidden');
    DOM.forumContent?.classList.add('hidden');
    DOM.authButtons?.classList.remove('hidden');
    DOM.userMenuContainer?.classList.add('hidden');
    document.getElementById('floating-logout')?.classList.add('hidden');
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
    const selected = document.querySelector('[data-color].ring-2, [data-edit-color].ring-2');
    return selected ? (selected.dataset.color || selected.dataset.editColor) : 'blue-500';
}

// Sample data for development
window.SampleData = {
    categories: [
        { id: 'all', name: 'All Posts', threadCount: 0 },
        { id: 'general', name: 'General Discussion', threadCount: 0 },
        { id: 'technology', name: 'Technology', threadCount: 0 },
        { id: 'random', name: 'Random', threadCount: 0 },
        { id: 'help', name: 'Help & Support', threadCount: 0 }
    ],

    users: [
        {
            id: 1,
            firstName: 'John',
            lastName: 'Doe',
            nickname: 'JohnD',
            email: 'john@example.com',
            age: 28,
            gender: 'male',
            avatarColor: 'green-500'
        },
        {
            id: 2,
            firstName: 'Alice',
            lastName: 'Smith',
            nickname: 'AliceS',
            email: 'alice@example.com',
            age: 32,
            gender: 'female',
            avatarColor: 'blue-500'
        }
    ]
};

// Initialize categories
function initializeCategories() {
    const categoryList = document.getElementById('category-list');
    const mobileCategoryList = document.getElementById('mobile-category-list');
    const threadCategory = document.getElementById('thread-category');
    const popularCategories = document.getElementById('popular-categories');

    if (categoryList) {
        SampleData.categories.forEach(category => {
            const li = document.createElement('li');
            li.innerHTML = `
                <button data-category="${category.id}"
                        class="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 transition-colors ${category.id === 'all' ? 'bg-blue-100 text-blue-700' : 'text-gray-700'}">
                    ${category.name}
                </button>
            `;
            categoryList.appendChild(li);
        });
    }

    if (mobileCategoryList) {
        SampleData.categories.forEach(category => {
            const button = document.createElement('button');
            button.setAttribute('data-category', category.id);
            button.className = 'block w-full text-left px-3 py-2 text-white hover:bg-indigo-700 rounded';
            button.textContent = category.name;
            mobileCategoryList.appendChild(button);
        });
    }

    if (threadCategory) {
        SampleData.categories.slice(1).forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            threadCategory.appendChild(option);
        });
    }

    if (popularCategories) {
        SampleData.categories.slice(1, 5).forEach(category => {
            const div = document.createElement('div');
            div.className = 'bg-gray-100 hover:bg-gray-200 p-3 rounded-md cursor-pointer transition-colors';
            div.innerHTML = `
                <h3 class="font-medium text-gray-800">${category.name}</h3>
                <p class="text-sm text-gray-600">${category.threadCount} posts</p>
            `;
            popularCategories.appendChild(div);
        });
    }
}

// Online users management
function updateOnlineCount() {
    const count = ForumApp.onlineUsers?.length || 0;
    const onlineCountElement = document.getElementById('online-count');
    if (onlineCountElement) {
        onlineCountElement.textContent = `${count} online`;
        onlineCountElement.classList.toggle('hidden', count === 0);
    }

    // Update online users list
    const onlineUsersList = document.getElementById('online-users-list');
    if (onlineUsersList) {
        onlineUsersList.innerHTML = '';
        ForumApp.onlineUsers?.forEach(user => {
            const li = document.createElement('li');
            li.className = 'flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer';
            li.innerHTML = `
                <div class="w-6 h-6 rounded-full bg-${user.avatarColor || 'blue-500'} flex items-center justify-center text-xs text-white">
                    ${user.nickname?.substring(0, 2).toUpperCase() || 'U'}
                </div>
                <span class="text-sm text-gray-700">${user.nickname}</span>
                <div class="w-2 h-2 bg-green-500 rounded-full ml-auto"></div>
            `;
            li.addEventListener('click', () => startPrivateChat(user));
            onlineUsersList.appendChild(li);
        });
    }
}

// Conversations management
function loadConversations() {
    const conversationsList = document.getElementById('conversations-list');
    const mobileConversationsList = document.getElementById('mobile-conversations-list');

    if (conversationsList) {
        conversationsList.innerHTML = '';
        ForumApp.conversations?.forEach(conversation => {
            const div = document.createElement('div');
            div.className = `p-3 hover:bg-gray-50 rounded cursor-pointer border-l-2 ${conversation.unread ? 'border-blue-500 bg-blue-50' : 'border-transparent'}`;
            div.innerHTML = `
                <div class="flex items-center space-x-2 mb-1">
                    <div class="w-6 h-6 rounded-full bg-${conversation.withColor} flex items-center justify-center text-xs text-white">
                        ${conversation.withInitials}
                    </div>
                    <span class="font-medium text-sm">${conversation.with}</span>
                    <span class="text-xs text-gray-500 ml-auto">${conversation.time}</span>
                </div>
                <p class="text-sm text-gray-600 truncate">${conversation.lastMessage}</p>
            `;
            div.addEventListener('click', () => openChat(conversation));
            conversationsList.appendChild(div);
        });
    }

    // Update mobile conversations list similarly
    if (mobileConversationsList) {
        mobileConversationsList.innerHTML = conversationsList?.innerHTML || '';
    }
}

function startPrivateChat(user) {
    // Find existing conversation or create new one
    let conversation = ForumApp.conversations?.find(c => c.with === user.nickname);
    if (!conversation) {
        conversation = {
            id: Date.now(),
            with: user.nickname,
            withColor: user.avatarColor,
            withInitials: user.nickname.substring(0, 2).toUpperCase(),
            lastMessage: '',
            time: 'now',
            unread: false,
            messages: []
        };
        ForumApp.conversations = ForumApp.conversations || [];
        ForumApp.conversations.push(conversation);
    }
    openChat(conversation);
}

function openChat(conversation) {
    ForumApp.currentChatUser = conversation;

    // Update chat window
    const chatWindow = document.getElementById('chat-window');
    const chatAvatar = document.getElementById('chat-avatar');
    const chatUsername = document.getElementById('chat-username');

    if (chatWindow && chatAvatar && chatUsername) {
        chatAvatar.className = `w-8 h-8 rounded-full bg-${conversation.withColor} flex items-center justify-center text-white`;
        chatAvatar.textContent = conversation.withInitials;
        chatUsername.textContent = conversation.with;
        chatWindow.classList.remove('hidden');

        // Load messages for this conversation
        Messages.displayMessages(conversation.messages || []);
    }

    // Update mobile chat panel similarly
    const mobileChatPanel = document.getElementById('mobile-chat-panel');
    const mobileChatAvatar = document.getElementById('mobile-chat-avatar');
    const mobileChatUsername = document.getElementById('mobile-chat-username');

    if (mobileChatPanel && mobileChatAvatar && mobileChatUsername) {
        mobileChatAvatar.className = `w-8 h-8 rounded-full bg-${conversation.withColor} flex items-center justify-center text-white`;
        mobileChatAvatar.textContent = conversation.withInitials;
        mobileChatUsername.textContent = conversation.with;
    }
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
window.closeModals = closeModals;
window.toggleMobileMenu = toggleMobileMenu;
window.updateOnlineCount = updateOnlineCount;
window.loadConversations = loadConversations;
window.startPrivateChat = startPrivateChat;
window.openChat = openChat;
