package utils

import (
	"database/sql"
	"net/http"
	"real-time-forum/backend/internal/database"
	"time"

	"github.com/gofrs/uuid"
)

// CreateSession creates a new session for a user
func CreateSession(userID int) (string, error) {
	sessionID := uuid.Must(uuid.NewV4()).String()
	expiresAt := time.Now().Add(7 * 24 * time.Hour) // 7 days

	_, err := database.DB.Exec(`
		INSERT INTO sessions (id, user_id, expires_at)
		VALUES (?, ?, ?)
	`, sessionID, userID, expiresAt)

	if err != nil {
		return "", err
	}

	return sessionID, nil
}

// GetUserIDFromSession retrieves user ID from session cookie
func GetUserIDFromSession(r *http.Request) (int, error) {
	cookie, err := r.Cookie("session_id")
	if err != nil {
		return 0, err
	}

	var userID int
	err = database.DB.QueryRow(`
		SELECT user_id FROM sessions 
		WHERE id = ? AND expires_at > CURRENT_TIMESTAMP
	`, cookie.Value).Scan(&userID)

	if err != nil {
		if err == sql.ErrNoRows {
			return 0, database.ErrSessionNotFound
		}
		return 0, err
	}

	return userID, nil
}

// DeleteSession removes a session from the database
func DeleteSession(sessionID string) error {
	_, err := database.DB.Exec("DELETE FROM sessions WHERE id = ?", sessionID)
	return err
}

// SetSessionCookie sets the session cookie in the response
func SetSessionCookie(w http.ResponseWriter, sessionID string) {
	http.SetCookie(w, &http.Cookie{
		Name:     "session_id",
		Value:    sessionID,
		Path:     "/",
		HttpOnly: true,
		MaxAge:   86400 * 7, // 7 days
	})
}

// ClearSessionCookie clears the session cookie
func ClearSessionCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     "session_id",
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		MaxAge:   -1,
	})
}

// ValidatePassword checks if password meets minimum requirements
func ValidatePassword(password string) error {
	if len(password) < 8 {
		return ErrPasswordTooShort
	}
	return nil
}
