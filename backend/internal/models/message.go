package models

import (
	"time"
)

// Message models for real-time communication
type Message struct {
	ID            int       `json:"id" db:"id"`
	SenderID      int       `json:"senderId" db:"sender_id"`
	RecipientID   int       `json:"recipientId" db:"recipient_id"`
	Content       string    `json:"content" db:"content"`
	IsRead        bool      `json:"isRead" db:"is_read"`
	CreatedAt     time.Time `json:"created_at" db:"created_at"`
	SenderName    string    `json:"senderName" db:"sender_name"`
	RecipientName string    `json:"recipientName" db:"recipient_name"`
}

// CreateMessageRequest represents the data needed to create a new message
type CreateMessageRequest struct {
	RecipientID int    `json:"recipientId"`
	Content     string `json:"content"`
}

// Validate validates message input data
func (r *CreateMessageRequest) Validate() error {
	if r.Content == "" {
		return ErrInvalidContent
	}
	if r.RecipientID <= 0 {
		return ErrInvalidRecipientID
	}
	return nil
}
