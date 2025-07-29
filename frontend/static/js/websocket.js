// WebSocket client: connection management, heartbeat, reconnection

window.WebSocketClient = {
    ws: null,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,
    reconnectInterval: 3000,

    connect() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            return;
        }

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        this.ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

        this.ws.onopen = () => {
            console.log('WebSocket connected');
            this.reconnectAttempts = 0;
            showNotification('Connected to real-time updates');
        };

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleMessage(data);
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };

        this.ws.onclose = (event) => {
            console.log('WebSocket disconnected');
            
            if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
                this.reconnectAttempts++;
                console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
                setTimeout(() => this.connect(), this.reconnectInterval);
            } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                showNotification('Connection lost. Please refresh the page.', 'error');
            }
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    },

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    },

    send(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
            return true;
        } else {
            console.error('WebSocket is not connected');
            return false;
        }
    },

    handleMessage(data) {
        switch (data.type) {
            case 'online_users':
                this.handleOnlineUsers(data.data);
                break;
            case 'new_message':
                Messages.handleNewMessage(data.data);
                break;
            case 'user_joined':
                this.handleUserJoined(data.data);
                break;
            case 'user_left':
                this.handleUserLeft(data.data);
                break;
            case 'typing':
                Messages.handleTyping(data.data);
                break;
            case 'stop_typing':
                Messages.handleStopTyping(data.data);
                break;
            default:
                console.log('Unknown message type:', data.type);
        }
    },

    handleOnlineUsers(data) {
        ForumApp.onlineUsers = data.users || [];
        updateOnlineCount();
    },

    handleUserJoined(data) {
        showNotification(`${data.username} joined the forum`);
    },

    handleUserLeft(data) {
        showNotification(`${data.username} left the forum`);
    },

    updateOnlineUsersList() {
        const onlineUsersContainer = document.getElementById('online-users-list');
        if (!onlineUsersContainer) return;

        onlineUsersContainer.innerHTML = '';

        ForumApp.onlineUsers.forEach(user => {
            const userElement = document.createElement('div');
            userElement.className = 'flex items-center p-2 hover:bg-gray-100 rounded cursor-pointer';
            userElement.onclick = () => Messages.startChat(user.id, user.nickname);

            userElement.innerHTML = `
                <div class="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium mr-3"
                     style="background-color: var(--${user.avatarColor})">
                    ${user.nickname.charAt(0).toUpperCase()}
                </div>
                <div class="flex-1">
                    <div class="font-medium text-gray-900">${escapeHtml(user.nickname)}</div>
                    <div class="text-xs text-green-500">Online</div>
                </div>
            `;

            onlineUsersContainer.appendChild(userElement);
        });
    },

    updateOnlineCount() {
        const onlineCountElement = document.getElementById('online-count');
        if (onlineCountElement) {
            onlineCountElement.textContent = ForumApp.onlineUsers.length;
        }
    },

    sendPrivateMessage(recipientId, content) {
        return this.send({
            type: 'private_message',
            recipientId: recipientId,
            content: content
        });
    },

    sendTyping(chatWith) {
        return this.send({
            type: 'typing',
            chatWith: chatWith
        });
    },

    sendStopTyping(chatWith) {
        return this.send({
            type: 'stop_typing',
            chatWith: chatWith
        });
    }
};
