package websocket

import "time"

// WebSocket event types and message structure definitions

// EventType represents different types of WebSocket events
type EventType string

const (
	EventTypePrivateMessage EventType = "private_message"
	EventTypeNewMessage     EventType = "new_message"
	EventTypeOnlineUsers    EventType = "online_users"
	EventTypeUserJoined     EventType = "user_joined"
	EventTypeUserLeft       EventType = "user_left"
	EventTypeTyping         EventType = "typing"
	EventTypeStopTyping     EventType = "stop_typing"
)

// WebSocketMessage represents a generic WebSocket message
type WebSocketMessage struct {
	Type EventType   `json:"type"`
	Data interface{} `json:"data,omitempty"`
}

// PrivateMessageEvent represents a private message event
type PrivateMessageEvent struct {
	RecipientID int    `json:"recipientId"`
	Content     string `json:"content"`
}

// NewMessageEvent represents a new message notification
type NewMessageEvent struct {
	ID          int       `json:"id"`
	SenderID    int       `json:"senderId"`
	RecipientID int       `json:"recipientId"`
	Content     string    `json:"content"`
	Sender      string    `json:"sender"`
	Timestamp   time.Time `json:"timestamp"`
}

// OnlineUsersEvent represents online users update
type OnlineUsersEvent struct {
	Users []UserStatus `json:"users"`
}

// UserStatus represents a user's online status
type UserStatus struct {
	ID          int       `json:"id"`
	Nickname    string    `json:"nickname"`
	AvatarColor string    `json:"avatarColor"`
	IsOnline    bool      `json:"isOnline"`
	LastSeen    time.Time `json:"lastSeen"`
}

// TypingEvent represents typing indicator
type TypingEvent struct {
	UserID   int    `json:"userId"`
	Username string `json:"username"`
	ChatWith int    `json:"chatWith"`
}
