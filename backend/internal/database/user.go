package database

import (
	"database/sql"
	"real-time-forum/backend/internal/models"
	"strings"

	"golang.org/x/crypto/bcrypt"
)

// CreateUser creates a new user in the database
func CreateUser(user *models.User, password string) error {
	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	// Insert user
	result, err := DB.Exec(`
		INSERT INTO users (nickname, email, password_hash, first_name, last_name, age, gender, avatar_color)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`, user.Nickname, user.Email, string(hashedPassword), user.FirstName, user.LastName, user.Age, user.Gender, user.AvatarColor)

	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE constraint failed") {
			return ErrUserAlreadyExists
		}
		return err
	}

	userID, _ := result.LastInsertId()
	user.ID = int(userID)
	return nil
}

// AuthenticateUser authenticates a user by email/nickname and password
func AuthenticateUser(identifier, password string) (*models.User, error) {
	var user models.User
	var passwordHash string

	err := DB.QueryRow(`
		SELECT id, nickname, email, password_hash, first_name, last_name, age, gender, avatar_color
		FROM users WHERE email = ? OR nickname = ?
	`, identifier, identifier).Scan(
		&user.ID, &user.Nickname, &user.Email, &passwordHash,
		&user.FirstName, &user.LastName, &user.Age, &user.Gender, &user.AvatarColor,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrInvalidCredentials
		}
		return nil, err
	}

	// Check password
	if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(password)); err != nil {
		return nil, ErrInvalidCredentials
	}

	return &user, nil
}

// GetUserByID retrieves a user by their ID
func GetUserByID(userID int) (*models.User, error) {
	var user models.User
	err := DB.QueryRow(`
		SELECT id, nickname, email, first_name, last_name, age, gender, avatar_color, is_online, last_seen
		FROM users WHERE id = ?
	`, userID).Scan(
		&user.ID, &user.Nickname, &user.Email,
		&user.FirstName, &user.LastName, &user.Age, &user.Gender, &user.AvatarColor,
		&user.IsOnline, &user.LastSeen,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrUserNotFound
		}
		return nil, err
	}

	return &user, nil
}

// GetAllUsers retrieves all users from the database
func GetAllUsers() ([]models.User, error) {
	var users []models.User
	rows, err := DB.Query(`
		SELECT id, nickname, email, first_name, last_name, age, gender, avatar_color, is_online, last_seen
		FROM users
		ORDER BY nickname
	`)

	if err != nil {
		return users, err
	}
	defer rows.Close()

	for rows.Next() {
		var user models.User
		err := rows.Scan(&user.ID, &user.Nickname, &user.Email,
			&user.FirstName, &user.LastName, &user.Age, &user.Gender, &user.AvatarColor,
			&user.IsOnline, &user.LastSeen)
		if err != nil {
			return users, err
		}
		users = append(users, user)
	}

	return users, nil
}

// UpdateUserOnlineStatus updates a user's online status
func UpdateUserOnlineStatus(userID int, isOnline bool) error {
	_, err := DB.Exec(`
		UPDATE users SET is_online = ?, last_seen = CURRENT_TIMESTAMP
		WHERE id = ?
	`, isOnline, userID)
	return err
}

// GetOnlineUsers retrieves all currently online users
func GetOnlineUsers() ([]models.User, error) {
	var users []models.User
	rows, err := DB.Query(`
		SELECT id, nickname, email, first_name, last_name, age, gender, avatar_color, is_online, last_seen
		FROM users
		WHERE is_online = 1
		ORDER BY nickname
	`)

	if err != nil {
		return users, err
	}
	defer rows.Close()

	for rows.Next() {
		var user models.User
		err := rows.Scan(&user.ID, &user.Nickname, &user.Email,
			&user.FirstName, &user.LastName, &user.Age, &user.Gender, &user.AvatarColor,
			&user.IsOnline, &user.LastSeen)
		if err != nil {
			return users, err
		}
		users = append(users, user)
	}

	return users, nil
}
