// Real-time messaging: WebSocket events, chat UI, conversations

window.Messages = {
    typingTimer: null,
    typingUsers: new Set(),

    async loadMessages(userId, offset = 0) {
        try {
            const response = await fetch(`/api/messages?user_id=${userId}&offset=${offset}`);
            if (response.ok) {
                const messages = await response.json();
                this.displayMessages(messages);
                return messages;
            } else {
                showNotification('Failed to load messages', 'error');
                return [];
            }
        } catch (error) {
            showNotification('Error loading messages', 'error');
            return [];
        }
    },

    displayMessages(messages) {
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) return;

        // Clear existing messages
        messagesContainer.innerHTML = '';

        if (messages.length === 0) {
            messagesContainer.innerHTML = `
                <div class="text-center py-4 text-gray-500">
                    <p>No messages yet. Start the conversation!</p>
                </div>
            `;
            return;
        }

        // Reverse messages to show oldest first
        messages.reverse().forEach(message => {
            const messageElement = this.createMessageElement(message);
            messagesContainer.appendChild(messageElement);
        });

        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    },

    createMessageElement(message) {
        const messageDiv = document.createElement('div');
        const isOwnMessage = message.senderId === ForumApp.currentUser?.id;
        
        messageDiv.className = `flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-3`;

        const messageContent = `
            <div class="max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                isOwnMessage 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-900'
            }">
                <p class="text-sm">${escapeHtml(message.content)}</p>
                <p class="text-xs mt-1 ${
                    isOwnMessage ? 'text-blue-100' : 'text-gray-500'
                }">
                    ${formatTime(message.createdAt)}
                </p>
            </div>
        `;

        messageDiv.innerHTML = messageContent;
        return messageDiv;
    },

    startChat(userId, username) {
        ForumApp.currentChatUser = { id: userId, nickname: username };
        
        // Update chat header
        const chatHeader = document.getElementById('chat-header');
        if (chatHeader) {
            chatHeader.innerHTML = `
                <h3 class="font-semibold">Chat with ${escapeHtml(username)}</h3>
                <button id="close-chat" class="text-gray-500 hover:text-gray-700">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            `;
        }

        // Show chat panel
        const chatPanel = document.getElementById('chat-panel');
        if (chatPanel) {
            chatPanel.classList.remove('hidden');
        }

        // Load messages
        this.loadMessages(userId);

        // Setup close button
        document.getElementById('close-chat')?.addEventListener('click', this.closeChat);
    },

    closeChat() {
        ForumApp.currentChatUser = null;
        const chatPanel = document.getElementById('chat-panel');
        if (chatPanel) {
            chatPanel.classList.add('hidden');
        }
    },

    async sendMessage() {
        const messageInput = document.getElementById('chat-input');
        const content = messageInput?.value.trim();

        if (!content || !ForumApp.currentChatUser) {
            return;
        }

        // Send via WebSocket
        const success = WebSocketClient.sendPrivateMessage(ForumApp.currentChatUser.id, content);
        
        if (success) {
            messageInput.value = '';
            this.stopTyping();
        } else {
            showNotification('Failed to send message', 'error');
        }
    },

    handleNewMessage(messageData) {
        // Add message to chat if it's for the current conversation
        if (ForumApp.currentChatUser && 
            (messageData.senderId === ForumApp.currentChatUser.id || 
             messageData.recipientId === ForumApp.currentChatUser.id)) {
            
            const messagesContainer = document.getElementById('chat-messages');
            if (messagesContainer) {
                const messageElement = this.createMessageElement({
                    id: messageData.id,
                    senderId: messageData.senderId,
                    recipientId: messageData.recipientId,
                    content: messageData.content,
                    createdAt: messageData.timestamp,
                    sender: messageData.sender
                });
                
                messagesContainer.appendChild(messageElement);
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
        }

        // Show notification if not in current chat
        if (!ForumApp.currentChatUser || messageData.senderId !== ForumApp.currentChatUser.id) {
            showNotification(`New message from ${messageData.sender}`);
        }
    },

    handleTyping(data) {
        if (ForumApp.currentChatUser && data.userId === ForumApp.currentChatUser.id) {
            this.showTypingIndicator(data.username);
        }
    },

    handleStopTyping(data) {
        if (ForumApp.currentChatUser && data.userId === ForumApp.currentChatUser.id) {
            this.hideTypingIndicator();
        }
    },

    showTypingIndicator(username) {
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) return;

        // Remove existing typing indicator
        const existingIndicator = messagesContainer.querySelector('.typing-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }

        // Add new typing indicator
        const typingDiv = document.createElement('div');
        typingDiv.className = 'typing-indicator flex justify-start mb-3';
        typingDiv.innerHTML = `
            <div class="bg-gray-200 text-gray-900 max-w-xs lg:max-w-md px-4 py-2 rounded-lg">
                <p class="text-sm">${escapeHtml(username)} is typing...</p>
            </div>
        `;

        messagesContainer.appendChild(typingDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    },

    hideTypingIndicator() {
        const typingIndicator = document.querySelector('.typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    },

    startTyping() {
        if (ForumApp.currentChatUser) {
            WebSocketClient.sendTyping(ForumApp.currentChatUser.id);
        }
    },

    stopTyping() {
        if (ForumApp.currentChatUser) {
            WebSocketClient.sendStopTyping(ForumApp.currentChatUser.id);
        }
    },

    setupEventListeners() {
        // Send message button
        document.getElementById('send-chat-btn')?.addEventListener('click', () => this.sendMessage());
        document.getElementById('mobile-send-chat-btn')?.addEventListener('click', () => this.sendMessage());

        // Enter key to send message
        document.getElementById('chat-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        document.getElementById('mobile-chat-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // New message modal
        document.getElementById('new-message-btn')?.addEventListener('click', () => {
            document.getElementById('new-message-modal')?.classList.remove('hidden');
            this.loadUsersForMessaging();
        });

        document.getElementById('mobile-new-message-btn')?.addEventListener('click', () => {
            document.getElementById('new-message-modal')?.classList.remove('hidden');
            this.loadUsersForMessaging();
        });

        // Send new message
        document.getElementById('send-message-btn')?.addEventListener('click', () => this.sendNewMessage());

        // Close chat
        document.getElementById('close-chat')?.addEventListener('click', () => {
            document.getElementById('chat-window')?.classList.add('hidden');
        });

        document.getElementById('close-mobile-chat')?.addEventListener('click', () => {
            document.getElementById('mobile-chat-panel')?.classList.add('hidden');
        });

        // Mobile messages panel
        document.getElementById('mobile-messages-btn')?.addEventListener('click', () => {
            document.getElementById('mobile-messages-panel')?.classList.remove('hidden');
        });

        document.getElementById('close-mobile-messages')?.addEventListener('click', () => {
            document.getElementById('mobile-messages-panel')?.classList.add('hidden');
        });

        // Typing indicators
        document.getElementById('chat-input')?.addEventListener('input', (e) => {
            if (e.target.value.trim()) {
                this.startTyping();

                // Clear existing timer
                if (this.typingTimer) {
                    clearTimeout(this.typingTimer);
                }

                // Set timer to stop typing after 2 seconds of inactivity
                this.typingTimer = setTimeout(() => {
                    this.stopTyping();
                }, 2000);
            } else {
                this.stopTyping();
            }
        });
    },

    async loadUsersForMessaging() {
        try {
            const response = await fetch('/api/users');
            if (response.ok) {
                const users = await response.json();
                const select = document.getElementById('message-recipient');
                if (select) {
                    select.innerHTML = '<option value="">Select a user</option>';
                    users.forEach(user => {
                        const option = document.createElement('option');
                        option.value = user.id;
                        option.textContent = user.nickname;
                        select.appendChild(option);
                    });
                }
            }
        } catch (error) {
            console.error('Error loading users:', error);
        }
    },

    async sendNewMessage() {
        const recipientId = document.getElementById('message-recipient').value;
        const content = document.getElementById('message-content').value;

        if (!recipientId || !content) {
            showNotification('Please select a recipient and enter a message', 'error');
            return;
        }

        try {
            const response = await fetch('/api/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    recipientId: parseInt(recipientId),
                    content
                }),
            });

            if (response.ok) {
                document.getElementById('message-content').value = '';
                document.getElementById('new-message-modal')?.classList.add('hidden');
                showNotification('Message sent successfully!');
                this.loadConversations();
            } else {
                showNotification('Failed to send message', 'error');
            }
        } catch (error) {
            showNotification('Error sending message', 'error');
        }
    },

    async loadConversations() {
        // This would load the conversation list
        // Implementation depends on your backend API structure
    }
};

// Initialize messages event listeners when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    Messages.setupEventListeners();
});
