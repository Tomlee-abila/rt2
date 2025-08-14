package models

import (
	"time"
)

// User data structures, validation, and business logic
type User struct {
	ID           int       `json:"id" db:"id"`
	FirstName    string    `json:"firstName" db:"first_name"`
	LastName     string    `json:"lastName" db:"last_name"`
	Nickname     string    `json:"nickname" db:"nickname"`
	Email        string    `json:"email" db:"email"`
	Age          int       `json:"age" db:"age"`
	Gender       string    `json:"gender" db:"gender"`
	PasswordHash string    `json:"-" db:"password_hash"`
	AvatarColor  string    `json:"avatarColor" db:"avatar_color"`
	IsOnline     bool      `json:"isOnline" db:"is_online"`
	LastSeen     time.Time `json:"lastSeen" db:"last_seen"`
	CreatedAt    time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt    time.Time `json:"updatedAt" db:"updated_at"`
}

// RegisterRequest represents the data needed to register a new user
type RegisterRequest struct {
	FirstName   string `json:"firstName"`
	LastName    string `json:"lastName"`
	Nickname    string `json:"nickname"`
	Email       string `json:"email"`
	Age         int    `json:"age"`
	Gender      string `json:"gender"`
	Password    string `json:"password"`
	AvatarColor string `json:"avatarColor"`
}

// LoginRequest represents the data needed to login
type LoginRequest struct {
	Identifier string `json:"identifier"` // email or nickname
	Password   string `json:"password"`
}

// ValidateUser validates user input data
func (u *User) ValidateUser() error {
	if u.Nickname == "" {
		return ErrInvalidNickname
	}
	if u.Email == "" {
		return ErrInvalidEmail
	}
	if u.FirstName == "" {
		return ErrInvalidFirstName
	}
	if u.LastName == "" {
		return ErrInvalidLastName
	}
	if u.Age < 13 {
		return ErrInvalidAge
	}
	if u.Gender == "" {
		return ErrInvalidGender
	}
	return nil
}

// IsValidGender checks if the gender value is valid
func IsValidGender(gender string) bool {
	validGenders := []string{"male", "female", "other", "prefer-not-to-say"}
	for _, valid := range validGenders {
		if gender == valid {
			return true
		}
	}
	return false
}

// ValidateRegisterRequest validates registration data
func (r *RegisterRequest) Validate() error {
	if r.FirstName == "" {
		return ErrInvalidFirstName
	}
	if r.LastName == "" {
		return ErrInvalidLastName
	}
	if r.Nickname == "" {
		return ErrInvalidNickname
	}
	if r.Email == "" {
		return ErrInvalidEmail
	}
	if r.Age < 13 || r.Age > 120 {
		return ErrInvalidAge
	}
	if !IsValidGender(r.Gender) {
		return ErrInvalidGender
	}
	if len(r.Password) < 8 {
		return ErrInvalidPassword
	}
	return nil
}

// ValidateLoginRequest validates login data
func (r *LoginRequest) Validate() error {
	if r.Identifier == "" {
		return ErrInvalidIdentifier
	}
	if r.Password == "" {
		return ErrInvalidPassword
	}
	return nil
}
