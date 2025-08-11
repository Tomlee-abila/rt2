package websocket

import "time"

// WebSocket event types and message structure definitions
type EventType string

const (
	EventTypePrivateMessage EventType = "private_message"
	EventTypeNewMessage     EventType = "new_message"
	EventTypeOnlineUsers    EventType = "online_users"
	EventTypeUserJoined     EventType = "user_joined"
	EventTypeUserLeft       EventType = "user_left"
	EventTypeTyping         EventType = "typing"
	EventTypeStopTyping     EventType = "stop_typing"
	EventTypeNewPost        EventType = "new_post"
	EventTypeNewComment     EventType = "new_comment"
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

// NewPostEvent represents a new post notification
type NewPostEvent struct {
	ID           int       `json:"id"`
	UserID       int       `json:"userId"`
	Title        string    `json:"title"`
	Content      string    `json:"content"`
	CategoryID   int       `json:"categoryId"`
	CategoryName string    `json:"categoryName"`
	Nickname     string    `json:"nickname"`
	AvatarColor  string    `json:"avatarColor"`
	Timestamp    time.Time `json:"timestamp"`
}

// NewCommentEvent represents a new comment notification
type NewCommentEvent struct {
	ID          int       `json:"id"`
	PostID      int       `json:"postId"`
	UserID      int       `json:"userId"`
	Content     string    `json:"content"`
	Nickname    string    `json:"nickname"`
	AvatarColor string    `json:"avatarColor"`
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