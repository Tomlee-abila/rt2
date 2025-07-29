document.addEventListener('DOMContentLoaded', function() {
    let currentUser = null;
    let currentCategory = 'general';
    let currentThreadId = null;
    let currentChatUser = null;
    let conversations = [];
    let ws = null;
    let onlineUsers = [];

    // DOM Elements
    const welcomeScreen = document.getElementById('welcome-screen');
    const forumContent = document.getElementById('forum-content');
    const loginModal = document.getElementById('login-modal');
    const registerModal = document.getElementById('register-modal');
    const authButtons = document.getElementById('auth-buttons');
    const userMenuContainer = document.getElementById('user-menu-container');
    const usernameDisplay = document.getElementById('username-display');
    const userAvatar = document.getElementById('user-avatar');
    const onlineCount = document.getElementById('online-count');

    // Initialize
    init();

    function init() {
        checkAuthStatus();
        setupEventListeners();
    }

    async function checkAuthStatus() {
        try {
            const response = await fetch('/api/users');
            if (response.ok) {
                const users = await response.json();
                showLoggedInUI();
                loadPosts();
                connectWebSocket();
            } else {
                showLoggedOutUI();
            }
        } catch (error) {
            showLoggedOutUI();
        }
    }

    function setupEventListeners() {
        // Auth buttons
        document.getElementById('login-button').addEventListener('click', () => {
            loginModal.classList.remove('hidden');
        });

        document.getElementById('register-button').addEventListener('click', () => {
            registerModal.classList.remove('hidden');
        });

        // Login form
        document.getElementById('login-btn').addEventListener('click', handleLogin);
        
        // Register form
        document.getElementById('register-btn').addEventListener('click', handleRegister);

        // Logout
        document.getElementById('logout-btn').addEventListener('click', handleLogout);

        // Category navigation
        document.querySelectorAll('[data-category]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                currentCategory = e.target.dataset.category;
                loadPosts();
            });
        });

        // Post creation
        document.getElementById('post-thread-btn').addEventListener('click', createPost);

        // Comment creation
        document.getElementById('post-reply-btn').addEventListener('click', createComment);

        // Message sending
        document.getElementById('send-message-btn').addEventListener('click', sendPrivateMessage);
        document.getElementById('send-chat-btn').addEventListener('click', sendChatMessage);
    }

    async function handleLogin() {
        const identifier = document.getElementById('login-identifier').value;
        const password = document.getElementById('login-password').value;

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
                currentUser = user;
                loginModal.classList.add('hidden');
                showLoggedInUI();
                loadPosts();
                connectWebSocket();
                showNotification('Login successful!');
            } else {
                showNotification('Invalid credentials', 'error');
            }
        } catch (error) {
            showNotification('Login failed', 'error');
        }
    }

    async function handleRegister() {
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

        if (password !== confirmPassword) {
            showNotification('Passwords do not match', 'error');
            return;
        }

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
                currentUser = user;
                registerModal.classList.add('hidden');
                showLoggedInUI();
                loadPosts();
                connectWebSocket();
                showNotification('Registration successful!');
            } else {
                const error = await response.text();
                showNotification(error, 'error');
            }
        } catch (error) {
            showNotification('Registration failed', 'error');
        }
    }

    async function handleLogout() {
        try {
            await fetch('/api/logout', { method: 'POST' });
            currentUser = null;
            if (ws) {
                ws.close();
                ws = null;
            }
            showLoggedOutUI();
            showNotification('Logged out successfully');
        } catch (error) {
            showNotification('Logout failed', 'error');
        }
    }

    function connectWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

        ws.onopen = function() {
            console.log('WebSocket connected');
        };

        ws.onmessage = function(event) {
            const data = JSON.parse(event.data);
            handleWebSocketMessage(data);
        };

        ws.onclose = function() {
            console.log('WebSocket disconnected');
            // Attempt to reconnect after 3 seconds
            setTimeout(connectWebSocket, 3000);
        };
    }

    function handleWebSocketMessage(data) {
        switch (data.type) {
            case 'online_users':
                onlineUsers = data.users;
                updateOnlineUsersList();
                break;
            case 'new_message':
                handleNewMessage(data);
                break;
        }
    }

    function handleNewMessage(data) {
        // Update conversations list
        updateConversationsList();
        
        // If chat is open with sender, add message to chat
        if (currentChatUser === data.sender) {
            addMessageToChat(data);
        }
        
        showNotification(`New message from ${data.sender}`);
    }

    async function loadPosts() {
        try {
            const response = await fetch(`/api/posts?category=${currentCategory}`);
            if (response.ok) {
                const posts = await response.json();
                renderPosts(posts);
            }
        } catch (error) {
            console.error('Error loading posts:', error);
        }
    }

    async function createPost() {
        const title = document.getElementById('thread-title').value;
        const content = document.getElementById('thread-content').value;

        if (!title || !content) {
            showNotification('Please fill in all fields', 'error');
            return;
        }

        try {
            const response = await fetch('/api/posts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title,
                    content,
                    category: currentCategory,
                }),
            });

            if (response.ok) {
                document.getElementById('thread-title').value = '';
                document.getElementById('thread-content').value = '';
                loadPosts();
                showNotification('Post created successfully!');
            }
        } catch (error) {
            showNotification('Error creating post', 'error');
        }
    }

    async function createComment() {
        const content = document.getElementById('reply-content').value;

        if (!content || !currentThreadId) {
            showNotification('Please enter a comment', 'error');
            return;
        }

        try {
            const response = await fetch('/api/comments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    postId: currentThreadId,
                    content,
                }),
            });

            if (response.ok) {
                document.getElementById('reply-content').value = '';
                loadComments(currentThreadId);
                showNotification('Comment posted successfully!');
            }
        } catch (error) {
            showNotification('Error posting comment', 'error');
        }
    }

    function sendPrivateMessage() {
        const recipientId = document.getElementById('message-recipient').value;
        const content = document.getElementById('message-content').value;

        if (!recipientId || !content) {
            showNotification('Please select recipient and enter message', 'error');
            return;
        }

        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'private_message',
                recipientId: parseInt(recipientId),
                content,
            }));

            document.getElementById('message-content').value = '';
            document.getElementById('message-recipient').value = '';
            showNotification('Message sent!');
        }
    }

    function sendChatMessage() {
        const content = document.getElementById('chat-input').value;

        if (!content || !currentChatUser) return;

        const recipientId = onlineUsers.find(u => u.nickname === currentChatUser)?.id;
        if (!recipientId) return;

        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'private_message',
                recipientId,
                content,
            }));

            document.getElementById('chat-input').value = '';
        }
    }

    function showLoggedInUI() {
        welcomeScreen.classList.add('hidden');
        forumContent.classList.remove('hidden');
        authButtons.classList.add('hidden');
        userMenuContainer.classList.remove('hidden');
    }

    function showLoggedOutUI() {
        welcomeScreen.classList.remove('hidden');
        forumContent.classList.add('hidden');
        authButtons.classList.remove('hidden');
        userMenuContainer.classList.add('hidden');
    }

    function renderPosts(posts) {
        const container = document.getElementById('threads-list');
        container.innerHTML = '';

        posts.forEach(post => {
            const postEl = document.createElement('div');
            postEl.className = 'bg-white p-4 rounded-lg shadow hover:shadow-md transition cursor-pointer';
            postEl.innerHTML = `
                <h3 class="font-semibold text-gray-800 mb-2">${post.title}</h3>
                <p class="text-gray-600 text-sm mb-2">${post.content.substring(0, 100)}...</p>
                <div class="flex items-center justify-between text-xs text-gray-500">
                    <span>By ${post.author}</span>
                    <span>${formatDate(post.createdAt)}</span>
                </div>
            `;
            
            postEl.addEventListener('click', () => openThread(post));
            container.appendChild(postEl);
        });
    }

    async function openThread(post) {
        currentThreadId = post.id;
        document.getElementById('thread-detail-title').textContent = post.title;
        document.getElementById('thread-detail-author').textContent = post.author;
        document.getElementById('thread-detail-time').textContent = formatDate(post.createdAt);
        document.getElementById('thread-detail-content').textContent = post.content;
        
        // Show thread detail view
        document.getElementById('threads-view').classList.add('hidden');
        document.getElementById('thread-detail').classList.remove('hidden');
        
        loadComments(post.id);
    }

    async function loadComments(postId) {
        try {
            const response = await fetch(`/api/comments?post_id=${postId}`);
            if (response.ok) {
                const comments = await response.json();
                renderComments(comments);
            }
        } catch (error) {
            console.error('Error loading comments:', error);
        }
    }

    function renderComments(comments) {
        const container = document.getElementById('thread-replies');
        container.innerHTML = '';

        comments.forEach(comment => {
            const commentEl = document.createElement('div');
            commentEl.className = 'border-b border-gray-100 pb-4';
            commentEl.innerHTML = `
                <div class="flex items-center space-x-2 mb-2">
                    <span class="font-medium text-gray-800">${comment.author}</span>
                    <span class="text-sm text-gray-500">• ${formatDate(comment.createdAt)}</span>
                </div>
                <p class="text-gray-700">${comment.content}</p>
            `;
            container.appendChild(commentEl);
        });
    }

    function updateOnlineUsersList() {
        const container = document.getElementById('online-users-list');
        container.innerHTML = '';

        onlineUsers.forEach(user => {
            const userEl = document.createElement('div');
            userEl.className = 'flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer';
            userEl.innerHTML = `
                <div class="w-8 h-8 rounded-full bg-${user.avatarColor} flex items-center justify-center text-white text-sm">
                    ${getInitials(user.firstName + ' ' + user.lastName)}
                </div>
                <span class="text-sm">${user.nickname}</span>
                <div class="w-2 h-2 bg-green-500 rounded-full ml-auto"></div>
            `;
            
            userEl.addEventListener('click', () => openChat(user.nickname));
            container.appendChild(userEl);
        });

        onlineCount.textContent = `${onlineUsers.length} online`;
    }

    function openChat(nickname) {
        currentChatUser = nickname;
        document.getElementById('chat-header-name').textContent = nickname;
        document.getElementById('chat-window').classList.remove('hidden');
        loadChatHistory(nickname);
    }

    async function loadChatHistory(nickname) {
        const user = onlineUsers.find(u => u.nickname === nickname);
        if (!user) return;

        try {
            const response = await fetch(`/api/messages?user_id=${user.id}&offset=0`);
            if (response.ok) {
                const messages = await response.json();
                renderChatMessages(messages.reverse());
            }
        } catch (error) {
            console.error('Error loading chat history:', error);
        }
    }

    function renderChatMessages(messages) {
        const container = document.getElementById('chat-messages');
        container.innerHTML = '';

        messages.forEach(message => {
            addMessageToChat(message);
        });
    }

    function addMessageToChat(message) {
        const container = document.getElementById('chat-messages');
        const messageEl = document.createElement('div');
        const isOwn = message.sender === currentUser?.nickname;
        
        messageEl.className = `flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`;
        messageEl.innerHTML = `
            <div class="max-w-xs px-3 py-2 rounded-lg ${isOwn ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}">
                <p class="text-sm">${message.content}</p>
                <p class="text-xs opacity-75 mt-1">${message.timestamp || formatDate(message.createdAt)}</p>
            </div>
        `;
        
        container.appendChild(messageEl);
        container.scrollTop = container.scrollHeight;
    }

    // Utility functions
    function getSelectedAvatarColor() {
        const selected = document.querySelector('[data-color].ring-2');
        return selected ? selected.dataset.color : 'blue-500';
    }

    function getInitials(name) {
        return name.split(' ').map(n => n[0]).join('').toUpperCase();
    }

    function formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return `${Math.floor(diff / 86400000)}d ago`;
    }

    function showNotification(message, type = 'success') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 px-4 py-2 rounded-md text-white z-50 ${
            type === 'error' ? 'bg-red-500' : 'bg-green-500'
        }`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
});