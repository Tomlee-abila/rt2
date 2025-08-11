package database

import (
	"real-time-forum/backend/internal/models"
)

// CreateMessage creates a new message in the database
func CreateMessage(message *models.Message) error {
	result, err := DB.Exec(`
		INSERT INTO messages (sender_id, recipient_id, content, is_read, created_at)
		VALUES (?, ?, ?, ?, ?)
	`, message.SenderID, message.RecipientID, message.Content, message.IsRead, message.CreatedAt)
	if err != nil {
		return err
	}

	messageID, err := result.LastInsertId()
	if err != nil {
		return err
	}
	message.ID = int(messageID)

	// Populate Sender and Recipient names
	sender, err := GetUserByID(message.SenderID)
	if err != nil {
		return err
	}
	recipient, err := GetUserByID(message.RecipientID)
	if err != nil {
		return err
	}
	message.Sender = sender.Nickname
	message.Recipient = recipient.Nickname

	return nil
}

// GetMessages retrieves messages between two users
func GetMessages(userID, otherUserID, offset int) ([]models.Message, error) {
	var messages []models.Message
	rows, err := DB.Query(`
		SELECT m.id, m.sender_id, m.recipient_id, m.content, m.is_read, m.created_at,
			s.nickname AS sender, r.nickname AS recipient
		FROM messages m
		JOIN users s ON m.sender_id = s.id
		JOIN users r ON m.recipient_id = r.id
		WHERE (m.sender_id = ? AND m.recipient_id = ?) OR (m.sender_id = ? AND m.recipient_id = ?)
		ORDER BY m.created_at DESC
		LIMIT 20 OFFSET ?
	`, userID, otherUserID, otherUserID, userID, offset)
	if err != nil {
		return messages, err
	}
	defer rows.Close()

	for rows.Next() {
		var msg models.Message
		if err := rows.Scan(&msg.ID, &msg.SenderID, &msg.RecipientID, &msg.Content, &msg.IsRead, &msg.CreatedAt, &msg.Sender, &msg.Recipient); err != nil {
			return messages, err
		}
		messages = append(messages, msg)
	}

	return messages, nil
}