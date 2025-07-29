package models

import "time"

// Message models for real-time communication
type Message struct {
	ID          int       `json:"id"`
	SenderID    int       `json:"senderId"`
	RecipientID int       `json:"recipientId"`
	Content     string    `json:"content"`
	CreatedAt   time.Time `json:"createdAt"`
	Sender      string    `json:"sender"`
	Recipient   string    `json:"recipient"`
}

// ValidateMessage validates message input data
func (m *Message) ValidateMessage() error {
	if m.Content == "" {
		return ErrInvalidContent
	}
	if m.SenderID <= 0 {
		return ErrInvalidSenderID
	}
	if m.RecipientID <= 0 {
		return ErrInvalidRecipientID
	}
	if m.SenderID == m.RecipientID {
		return ErrSelfMessage
	}
	return nil
}
