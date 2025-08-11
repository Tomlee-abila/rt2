package models

// Message models for real-time communication
type Message struct {
	ID          int    `json:"id"`
	SenderID    int    `json:"sender_id"`
	RecipientID int    `json:"recipient_id"`
	Content     string `json:"content"`
	IsRead      bool   `json:"is_read"`
	CreatedAt   string `json:"created_at"`
	Sender      string `json:"sender"`
	Recipient   string `json:"recipient"`
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
