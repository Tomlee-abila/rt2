window.Messages = {
    async loadConversations() {
        try {
            const response = await fetch('/api/messages', { credentials: 'include' });
            if (response.ok) {
                const messages = await response.json();
                ForumApp.conversations = this.processConversations(messages);
                loadConversations();
            } else {
                showNotification('Failed to load conversations', 'error');
            }
        } catch (error) {
            console.error('Error loading conversations:', error);
            showNotification('Error loading conversations', 'error');
        }
    },

    processConversations(messages) {
        const conversations = {};
        messages.forEach(msg => {
            const otherUserId = msg.senderId === ForumApp.currentUser.id ? msg.recipientId : msg.senderId;
            const otherUser = ForumApp.onlineUsers.find(u => u.id === otherUserId) || {
                id: otherUserId,
                nickname: `User ${otherUserId}`,
                avatarColor: 'blue-500'
            };

            if (!conversations[otherUserId]) {
                conversations[otherUserId] = {
                    id: otherUserId,
                    with: otherUser.nickname,
                    withColor: otherUser.avatarColor,
                    withInitials: otherUser.nickname.substring(0, 2).toUpperCase(),
                    lastMessage: msg.content,
                    time: formatDate(msg.timestamp),
                    unread: msg.senderId !== ForumApp.currentUser.id,
                    messages: [],
                    userId: otherUserId
                };
            }
            conversations[otherUserId].messages.push(msg);
        });
        return Object.values(conversations);
    },

    async loadMessages(userId) {
        try {
            const response = await fetch(`/api/messages?user_id=${userId}`, { credentials: 'include' });
            if (response.ok) {
                const messages = await response.json();
                const conversation = ForumApp.conversations.find(c => c.userId === userId);
                if (conversation) {
                    conversation.messages = messages;
                    this.displayMessages(messages);
                }
            } else {
                showNotification('Failed to load messages', 'error');
            }
        } catch (error) {
            console.error('Error loading messages:', error);
            showNotification('Error loading messages', 'error');
        }
    },

    displayMessages(messages) {
        const chatMessages = document.getElementById('chat-messages');
        const mobileChatMessages = document.getElementById('mobile-chat-messages');
        if (!chatMessages || !mobileChatMessages) return;

        chatMessages.innerHTML = '';
        mobileChatMessages.innerHTML = '';

        messages.forEach(msg => {
            const isSent = msg.senderId === ForumApp.currentUser.id;
            const div = document.createElement('div');
            div.className = `flex ${isSent ? 'justify-end' : 'justify-start'} mb-2`;
            div.innerHTML = `
                <div class="${isSent ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'} p-3 rounded-lg max-w-xs">
                    <p class="text-sm">${escapeHtml(msg.content)}</p>
                    <p class="text-xs mt-1 opacity-75">${formatTime(msg.timestamp)}</p>
                </div>
            `;
            chatMessages.appendChild(div);
            mobileChatMessages.appendChild(div.cloneNode(true));
        });

        chatMessages.scrollTop = chatMessages.scrollHeight;
        mobileChatMessages.scrollTop = mobileChatMessages.scrollHeight;
    },

    async sendMessage(recipientId, content) {
        WebSocketClient.sendPrivateMessage(recipientId, content);
        const conversation = ForumApp.conversations.find(c => c.userId === recipientId);
        if (conversation) {
            conversation.messages.push({
                senderId: ForumApp.currentUser.id,
                recipientId,
                content,
                timestamp: new Date().toISOString()
            });
            conversation.lastMessage = content;
            conversation.time = formatDate(new Date());
            this.displayMessages(conversation.messages);
            loadConversations();
        }
    },

    handleNewMessage(data) {
        const conversation = ForumApp.conversations.find(c => c.userId === data.senderId || c.userId === data.recipientId);
        if (conversation) {
            conversation.messages.push(data);
            conversation.lastMessage = data.content;
            conversation.time = formatDate(data.timestamp);
            conversation.unread = data.senderId !== ForumApp.currentUser.id;
            if (ForumApp.currentChatUser?.userId === data.senderId || ForumApp.currentChatUser?.userId === data.recipientId) {
                this.displayMessages(conversation.messages);
            }
            loadConversations();
            if (data.senderId !== ForumApp.currentUser.id) {
                showNotification(`New message from ${data.sender}`);
            }
        } else {
            this.loadConversations();
        }
    },

    handleTyping(data) {
        if (ForumApp.currentChatUser?.userId === data.userId) {
            const typingIndicator = document.getElementById('typing-indicator');
            const mobileTypingIndicator = document.getElementById('mobile-typing-indicator');
            if (typingIndicator && mobileTypingIndicator) {
                typingIndicator.classList.remove('hidden');
                mobileTypingIndicator.classList.remove('hidden');
            }
        }
    },

    handleStopTyping(data) {
        if (ForumApp.currentChatUser?.userId === data.userId) {
            const typingIndicator = document.getElementById('typing-indicator');
            const mobileTypingIndicator = document.getElementById('mobile-typing-indicator');
            if (typingIndicator && mobileTypingIndicator) {
                typingIndicator.classList.add('hidden');
                mobileTypingIndicator.classList.add('hidden');
            }
        }
    },

    startChat(userId, nickname) {
        const user = ForumApp.onlineUsers.find(u => u.id === userId) || { id: userId, nickname, avatarColor: 'blue-500' };
        startPrivateChat(user);
    },

    setupEventListeners() {
        document.getElementById('new-message-btn')?.addEventListener('click', async () => {
            await this.populateRecipientList();
            DOM.newMessageModal.classList.remove('hidden');
        });

        document.getElementById('mobile-new-message-btn')?.addEventListener('click', async () => {
            await this.populateRecipientList();
            DOM.newMessageModal.classList.remove('hidden');
        });

        document.getElementById('send-message-btn')?.addEventListener('click', async () => {
            const recipientId = document.getElementById('message-recipient').value;
            const content = document.getElementById('message-content').value.trim();
            if (!recipientId || !content) {
                showNotification('Please select a recipient and enter a message', 'error');
                return;
            }
            await this.sendMessage(recipientId, content);
            DOM.newMessageModal.classList.add('hidden');
            document.getElementById('message-content').value = '';
            this.startChat(parseInt(recipientId), document.getElementById('message-recipient').selectedOptions[0].text);
        });

        document.getElementById('mobile-messages-btn')?.addEventListener('click', () => {
            DOM.mobileMessagesPanel.classList.remove('hidden');
            DOM.forumContent.classList.add('hidden');
            this.loadConversations();
        });

        document.getElementById('close-mobile-messages')?.addEventListener('click', () => {
            DOM.mobileMessagesPanel.classList.add('hidden');
            DOM.forumContent.classList.remove('hidden');
        });

        document.getElementById('close-chat')?.addEventListener('click', () => {
            DOM.chatWindow.classList.add('hidden');
            ForumApp.currentChatUser = null;
        });

        document.getElementById('close-mobile-chat')?.addEventListener('click', () => {
            DOM.mobileChatPanel.classList.add('hidden');
            DOM.forumContent.classList.remove('hidden');
            ForumApp.currentChatUser = null;
        });

        document.getElementById('chat-input')?.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                const content = e.target.value.trim();
                if (content && ForumApp.currentChatUser) {
                    await this.sendMessage(ForumApp.currentChatUser.userId, content);
                    e.target.value = '';
                    WebSocketClient.sendStopTyping(ForumApp.currentChatUser.userId);
                }
            }
        });

        document.getElementById('mobile-chat-input')?.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                const content = e.target.value.trim();
                if (content && ForumApp.currentChatUser) {
                    await this.sendMessage(ForumApp.currentChatUser.userId, content);
                    e.target.value = '';
                    WebSocketClient.sendStopTyping(ForumApp.currentChatUser.userId);
                }
            }
        });

        document.getElementById('chat-input')?.addEventListener('input', () => {
            if (ForumApp.currentChatUser) {
                WebSocketClient.sendTyping(ForumApp.currentChatUser.userId);
            }
        });

        document.getElementById('mobile-chat-input')?.addEventListener('input', () => {
            if (ForumApp.currentChatUser) {
                WebSocketClient.sendTyping(ForumApp.currentChatUser.userId);
            }
        });

        document.getElementById('send-chat-btn')?.addEventListener('click', async () => {
            const content = document.getElementById('chat-input').value.trim();
            if (content && ForumApp.currentChatUser) {
                await this.sendMessage(ForumApp.currentChatUser.userId, content);
                document.getElementById('chat-input').value = '';
                WebSocketClient.sendStopTyping(ForumApp.currentChatUser.userId);
            }
        });

        document.getElementById('mobile-send-chat-btn')?.addEventListener('click', async () => {
            const content = document.getElementById('mobile-chat-input').value.trim();
            if (content && ForumApp.currentChatUser) {
                await this.sendMessage(ForumApp.currentChatUser.userId, content);
                document.getElementById('mobile-chat-input').value = '';
                WebSocketClient.sendStopTyping(ForumApp.currentChatUser.userId);
            }
        });
    },

    async populateRecipientList() {
        try {
            const response = await fetch('/api/users', { credentials: 'include' });
            if (response.ok) {
                const users = await response.json();
                const recipientSelect = document.getElementById('message-recipient');
                if (recipientSelect) {
                    recipientSelect.innerHTML = '<option value="">Select a user</option>';
                    users.forEach(user => {
                        if (user.id !== ForumApp.currentUser.id) {
                            const option = document.createElement('option');
                            option.value = user.id;
                            option.textContent = user.nickname;
                            recipientSelect.appendChild(option);
                        }
                    });
                }
            } else {
                showNotification('Failed to load users', 'error');
            }
        } catch (error) {
            console.error('Error loading users:', error);
            showNotification('Error loading users', 'error');
        }
    }
};

document.addEventListener('DOMContentLoaded', function() {
    Messages.setupEventListeners();
});