package database

import "real-time-forum/backend/internal/models"

// CreateMessage creates a new message in the database
func CreateMessage(message *models.Message) error {
	result, err := DB.Exec(`
		INSERT INTO messages (sender_id, recipient_id, content)
		VALUES (?, ?, ?)
	`, message.SenderID, message.RecipientID, message.Content)

	if err != nil {
		return err
	}

	messageID, _ := result.LastInsertId()
	message.ID = int(messageID)
	return nil
}

// GetMessages retrieves messages between two users with pagination
func GetMessages(userID, otherUserID, offset int) ([]models.Message, error) {
	var messages []models.Message
	rows, err := DB.Query(`
		SELECT m.id, m.sender_id, m.recipient_id, m.content, m.created_at,
		       s.nickname as sender, r.nickname as recipient
		FROM messages m
		JOIN users s ON m.sender_id = s.id
		JOIN users r ON m.recipient_id = r.id
		WHERE (m.sender_id = ? AND m.recipient_id = ?) 
		   OR (m.sender_id = ? AND m.recipient_id = ?)
		ORDER BY m.created_at DESC
		LIMIT 10 OFFSET ?
	`, userID, otherUserID, otherUserID, userID, offset)

	if err != nil {
		return messages, err
	}
	defer rows.Close()

	for rows.Next() {
		var message models.Message
		err := rows.Scan(&message.ID, &message.SenderID, &message.RecipientID,
			&message.Content, &message.CreatedAt, &message.Sender, &message.Recipient)
		if err != nil {
			return messages, err
		}
		messages = append(messages, message)
	}

	return messages, nil
}

// GetConversations retrieves all conversations for a user
func GetConversations(userID int) ([]models.Message, error) {
	var messages []models.Message
	rows, err := DB.Query(`
		SELECT DISTINCT 
			m.id, m.sender_id, m.recipient_id, m.content, m.created_at,
			s.nickname as sender, r.nickname as recipient
		FROM messages m
		JOIN users s ON m.sender_id = s.id
		JOIN users r ON m.recipient_id = r.id
		WHERE m.sender_id = ? OR m.recipient_id = ?
		ORDER BY m.created_at DESC
	`, userID, userID)

	if err != nil {
		return messages, err
	}
	defer rows.Close()

	for rows.Next() {
		var message models.Message
		err := rows.Scan(&message.ID, &message.SenderID, &message.RecipientID,
			&message.Content, &message.CreatedAt, &message.Sender, &message.Recipient)
		if err != nil {
			return messages, err
		}
		messages = append(messages, message)
	}

	return messages, nil
}
