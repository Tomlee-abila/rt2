const DOM = {
    welcomeScreen: document.getElementById('welcome-screen'),
    forumContent: document.getElementById('forum-content'),
    loginModal: document.getElementById('login-modal'),
    registerModal: document.getElementById('register-modal'),
    profileModal: document.getElementById('profile-modal'),
    newMessageModal: document.getElementById('new-message-modal'),
    threadsContainer: document.getElementById('threads'),
    threadForm: document.getElementById('thread-form'),
    threadDetail: document.getElementById('thread-detail'),
    mobileMenu: document.getElementById('mobile-menu'),
    mobileMessagesPanel: document.getElementById('mobile-messages-panel'),
    mobileChatPanel: document.getElementById('mobile-chat-panel'),
    chatWindow: document.getElementById('chat-window'),
    authButtons: document.getElementById('auth-buttons'),
    userMenuContainer: document.getElementById('user-menu-container'),
    notification: document.getElementById('notification')
};

const ForumApp = {
    currentUser: null,
    currentCategory: 'all',
    currentThreadId: null,
    conversations: [],
    onlineUsers: [],
    currentChatUser: null
};

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true 
    });
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', { 
        hour: 'numeric',
        minute: '2-digit',
        hour12: true 
    });
}

function showNotification(message, type = 'success') {
    if (!DOM.notification) return;
    
    DOM.notification.textContent = message;
    DOM.notification.className = `fixed bottom-4 right-4 px-4 py-2 rounded-md shadow-lg ${
        type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
    }`;
    
    DOM.notification.classList.remove('hidden');
    
    setTimeout(() => {
        DOM.notification.classList.add('hidden');
    }, 3000);
}

function getSelectedAvatarColor() {
    return document.querySelector('[data-color].ring-2')?.dataset.color || 'blue-500';
}

function showLoggedInUI() {
    if (!DOM.welcomeScreen || !DOM.forumContent || !DOM.authButtons || !DOM.userMenuContainer) return;

    DOM.welcomeScreen.classList.add('hidden');
    DOM.forumContent.classList.remove('hidden');
    DOM.authButtons.classList.add('hidden');
    DOM.userMenuContainer.classList.remove('hidden');
    document.getElementById('username-display').textContent = ForumApp.currentUser?.nickname || 'User';
    document.getElementById('floating-username').textContent = ForumApp.currentUser?.nickname || 'User';
    document.getElementById('floating-logout')?.classList.remove('hidden');
    const avatar = document.getElementById('user-avatar');
    if (avatar) {
        avatar.className = `w-8 h-8 rounded-full bg-${ForumApp.currentUser?.avatarColor || 'blue-500'} flex items-center justify-center text-white`;
        avatar.textContent = ForumApp.currentUser?.nickname?.substring(0, 2).toUpperCase() || 'U';
    }
}

function showLoggedOutUI() {
    if (!DOM.welcomeScreen || !DOM.forumContent || !DOM.authButtons || !DOM.userMenuContainer) return;

    DOM.welcomeScreen.classList.remove('hidden');
    DOM.forumContent.classList.add('hidden');
    DOM.authButtons.classList.remove('hidden');
    DOM.userMenuContainer.classList.add('hidden');
    document.getElementById('floating-logout')?.classList.add('hidden');
    document.getElementById('username-display').textContent = 'Guest';
    document.getElementById('floating-username').textContent = 'Guest';
}

function toggleMobileMenu() {
    if (DOM.mobileMenu) {
        DOM.mobileMenu.classList.toggle('hidden');
    }
}

function updateOnlineCount() {
    const count = ForumApp.onlineUsers.filter(u => u.isOnline).length;
    const onlineCountElements = [
        document.getElementById('online-count'),
        document.getElementById('mobile-online-count')
    ];
    onlineCountElements.forEach(el => {
        if (el) el.textContent = count;
    });
}

function loadConversations() {
    const conversationList = document.getElementById('conversation-list');
    const mobileConversationList = document.getElementById('mobile-conversation-list');
    if (!conversationList || !mobileConversationList) return;

    conversationList.innerHTML = '';
    mobileConversationList.innerHTML = '';

    ForumApp.conversations.forEach(conv => {
        const div = document.createElement('div');
        div.className = `p-3 hover:bg-gray-100 cursor-pointer rounded-md ${conv.unread ? 'font-semibold' : ''}`;
        div.innerHTML = `
            <div class="flex items-center space-x-3">
                <div class="w-8 h-8 rounded-full bg-${conv.withColor} flex items-center justify-center text-white text-sm">${conv.withInitials}</div>
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-900 truncate">${escapeHtml(conv.with)}</p>
                    <p class="text-xs text-gray-500 truncate">${escapeHtml(conv.lastMessage)}</p>
                </div>
                <div class="text-xs text-gray-500">${conv.time}</div>
            </div>
        `;
        div.addEventListener('click', () => {
            if (!ForumApp.currentUser) {
                DOM.loginModal.classList.remove('hidden');
                return;
            }
            startPrivateChat(conv);
        });
        conversationList.appendChild(div);
        mobileConversationList.appendChild(div.cloneNode(true));
    });
}

function startPrivateChat(conversation) {
    ForumApp.currentChatUser = conversation;
    document.getElementById('chat-with').textContent = conversation.with;
    document.getElementById('mobile-chat-with').textContent = conversation.with;
    const avatar = document.getElementById('chat-avatar');
    const mobileAvatar = document.getElementById('mobile-chat-avatar');
    if (avatar && mobileAvatar) {
        avatar.className = `w-8 h-8 rounded-full bg-${conversation.withColor} flex items-center justify-center text-white text-sm`;
        avatar.textContent = conversation.withInitials;
        mobileAvatar.className = avatar.className;
        mobileAvatar.textContent = conversation.withInitials;
    }
    DOM.chatWindow.classList.remove('hidden');
    DOM.mobileChatPanel.classList.remove('hidden');
    DOM.mobileMessagesPanel.classList.add('hidden');
    Messages.loadMessages(conversation.userId);
}

async function populatePopularCategories() {
    const popularCategories = document.getElementById('popular-categories');
    if (!popularCategories) return;

    try {
        const response = await fetch('/api/categories', { credentials: 'include' });
        if (response.ok) {
            const categories = await response.json();
            popularCategories.innerHTML = '';
            categories.forEach(category => {
                const div = document.createElement('div');
                div.className = 'bg-gray-100 p-3 rounded-md text-sm text-gray-700';
                div.textContent = category.name;
                popularCategories.appendChild(div);
            });
        } else {
            throw new Error('Failed to load categories');
        }
    } catch (error) {
        console.error('Error loading categories:', error);
        // Fallback to static categories
        const categories = [
            { id: 1, name: 'General Discussion' },
            { id: 2, name: 'Technology' },
            { id: 3, name: 'Random' },
            { id: 4, name: 'Help' }
        ];
        popularCategories.innerHTML = '';
        categories.forEach(category => {
            const div = document.createElement('div');
            div.className = 'bg-gray-100 p-3 rounded-md text-sm text-gray-700';
            div.textContent = category.name;
            popularCategories.appendChild(div);
        });
    }
}

document.addEventListener('DOMContentLoaded', function() {
    Auth.checkAuthStatus();
    document.getElementById('mobile-menu-btn')?.addEventListener('click', toggleMobileMenu);
    document.getElementById('close-mobile-menu')?.addEventListener('click', toggleMobileMenu);
    populatePopularCategories();
});