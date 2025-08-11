window.WebSocketClient = {
    socket: null,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,
    reconnectInterval: 5000,

    connect() {
        if (!ForumApp.currentUser) return;

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        this.socket = new WebSocket(`${protocol}//${host}/ws`);

        this.socket.onopen = () => {
            console.log('WebSocket connected');
            this.reconnectAttempts = 0;
            showNotification('Connected to real-time updates');
        };

        this.socket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this.handleMessage(message);
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };

        this.socket.onclose = (event) => {
            console.log('WebSocket closed:', event);
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                setTimeout(() => {
                    this.reconnectAttempts++;
                    console.log(`Reconnecting attempt ${this.reconnectAttempts}...`);
                    this.connect();
                }, this.reconnectInterval);
            } else {
                showNotification('Lost connection to server', 'error');
            }
        };

        this.socket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    },

    disconnect() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
    },

    sendMessage(type, data) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ type, data }));
        } else {
            console.error('WebSocket is not connected');
            showNotification('Cannot send message: Not connected', 'error');
        }
    },

    handleMessage(message) {
        switch (message.type) {
            case 'online_users':
                this.handleOnlineUsers(message.data);
                break;
            case 'new_message':
                Messages.handleNewMessage(message.data);
                break;
            case 'typing':
                Messages.handleTyping(message.data);
                break;
            case 'stop_typing':
                Messages.handleStopTyping(message.data);
                break;
            default:
                console.warn('Unknown WebSocket message type:', message.type);
        }
    },

    handleOnlineUsers(data) {
        ForumApp.onlineUsers = data.users || [];
        updateOnlineCount();
    },

    sendPrivateMessage(recipientId, content) {
        this.sendMessage('private_message', {
            recipientId: parseInt(recipientId),
            content
        });
    },

    sendTyping(recipientId) {
        this.sendMessage('typing', {
            chatWith: parseInt(recipientId)
        });
    },

    sendStopTyping(recipientId) {
        this.sendMessage('stop_typing', {
            chatWith: parseInt(recipientId)
        });
    }
};