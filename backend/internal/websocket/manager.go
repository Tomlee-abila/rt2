package websocket

import (
	"encoding/json"
	"log"
	"real-time-forum/backend/internal/database"
	"real-time-forum/backend/internal/models"
	"sync"
	"time"
)

// Hub manages WebSocket clients, broadcasting, and user tracking
type Hub struct {
	clients     map[*Client]bool
	broadcast   chan []byte
	register    chan *Client
	unregister  chan *Client
	userClients map[int]*Client
	mu          sync.RWMutex
}

// NewHub creates a new WebSocket hub
func NewHub() *Hub {
	return &Hub{
		clients:     make(map[*Client]bool),
		broadcast:   make(chan []byte),
		register:    make(chan *Client),
		unregister:  make(chan *Client),
		userClients: make(map[int]*Client),
	}
}

// Run starts the hub's main loop
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.registerClient(client)

		case client := <-h.unregister:
			h.unregisterClient(client)

		case message := <-h.broadcast:
			h.broadcastMessage(message)
		}
	}
}

// registerClient registers a new client
func (h *Hub) registerClient(client *Client) {
	h.mu.Lock()
	h.clients[client] = true
	h.userClients[client.userID] = client
	h.mu.Unlock()

	// Update user online status
	database.UpdateUserOnlineStatus(client.userID, true)

	// Broadcast online status update
	h.broadcastOnlineUsers()

	log.Printf("Client registered: user %d", client.userID)
}

// unregisterClient unregisters a client
func (h *Hub) unregisterClient(client *Client) {
	h.mu.Lock()
	if _, ok := h.clients[client]; ok {
		delete(h.clients, client)
		delete(h.userClients, client.userID)
		close(client.send)
	}
	h.mu.Unlock()

	// Update user offline status
	database.UpdateUserOnlineStatus(client.userID, false)

	// Broadcast online status update
	h.broadcastOnlineUsers()

	log.Printf("Client unregistered: user %d", client.userID)
}

// broadcastMessage sends a message to all connected clients
func (h *Hub) broadcastMessage(message []byte) {
	h.mu.RLock()
	for client := range h.clients {
		select {
		case client.send <- message:
		default:
			close(client.send)
			delete(h.clients, client)
			delete(h.userClients, client.userID)
		}
	}
	h.mu.RUnlock()
}

// broadcastOnlineUsers broadcasts the list of online users
func (h *Hub) broadcastOnlineUsers() {
	users, err := database.GetOnlineUsers()
	if err != nil {
		log.Printf("Error getting online users: %v", err)
		return
	}

	var userStatuses []UserStatus
	for _, user := range users {
		userStatuses = append(userStatuses, UserStatus{
			ID:          user.ID,
			Nickname:    user.Nickname,
			AvatarColor: user.AvatarColor,
			IsOnline:    user.IsOnline,
			LastSeen:    user.LastSeen,
		})
	}

	message := WebSocketMessage{
		Type: EventTypeOnlineUsers,
		Data: OnlineUsersEvent{Users: userStatuses},
	}

	data, _ := json.Marshal(message)
	h.broadcast <- data
}

// RegisterClient registers a new client with the hub
func (h *Hub) RegisterClient(client *Client) {
	h.register <- client
}

// UnregisterClient unregisters a client from the hub
func (h *Hub) UnregisterClient(client *Client) {
	h.unregister <- client
}

// BroadcastMessage broadcasts a message to all clients
func (h *Hub) BroadcastMessage(message []byte) {
	h.broadcast <- message
}

// SendToUser sends a message to a specific user
func (h *Hub) SendToUser(userID int, message interface{}) error {
	h.mu.RLock()
	client, ok := h.userClients[userID]
	h.mu.RUnlock()

	if !ok {
		return ErrClientDisconnected
	}

	return client.SendMessage(message)
}

// handlePrivateMessage handles private message events
func (h *Hub) handlePrivateMessage(client *Client, msg map[string]interface{}) {
	recipientID, ok := msg["recipientId"].(float64)
	if !ok {
		return
	}

	content, ok := msg["content"].(string)
	if !ok {
		return
	}

	// Create and save message
	message := &models.Message{
		SenderID:    client.userID,
		RecipientID: int(recipientID),
		Content:     content,
		CreatedAt:   time.Now(),
	}

	if err := database.CreateMessage(message); err != nil {
		log.Printf("Error saving message: %v", err)
		return
	}

	// Get sender info
	sender, err := database.GetUserByID(client.userID)
	if err != nil {
		log.Printf("Error getting sender info: %v", err)
		return
	}

	// Create response
	response := WebSocketMessage{
		Type: EventTypeNewMessage,
		Data: NewMessageEvent{
			ID:          message.ID,
			SenderID:    client.userID,
			RecipientID: int(recipientID),
			Content:     content,
			Sender:      sender.Nickname,
			Timestamp:   message.CreatedAt,
		},
	}

	// Send to recipient if online
	h.SendToUser(int(recipientID), response)

	// Send confirmation to sender
	client.SendMessage(response)
}

// handleTyping handles typing indicator events
func (h *Hub) handleTyping(client *Client, msg map[string]interface{}) {
	chatWith, ok := msg["chatWith"].(float64)
	if !ok {
		return
	}

	sender, err := database.GetUserByID(client.userID)
	if err != nil {
		return
	}

	response := WebSocketMessage{
		Type: EventTypeTyping,
		Data: TypingEvent{
			UserID:   client.userID,
			Username: sender.Nickname,
			ChatWith: int(chatWith),
		},
	}

	// Send to the user being chatted with
	h.SendToUser(int(chatWith), response)
}

// handleStopTyping handles stop typing indicator events
func (h *Hub) handleStopTyping(client *Client, msg map[string]interface{}) {
	chatWith, ok := msg["chatWith"].(float64)
	if !ok {
		return
	}

	response := WebSocketMessage{
		Type: EventTypeStopTyping,
		Data: TypingEvent{
			UserID:   client.userID,
			ChatWith: int(chatWith),
		},
	}

	// Send to the user being chatted with
	h.SendToUser(int(chatWith), response)
}
