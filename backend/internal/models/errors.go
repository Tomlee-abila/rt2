package models

import "errors"

// Model validation errors
var (
	// User errors
	ErrInvalidNickname    = errors.New("invalid nickname")
	ErrInvalidEmail       = errors.New("invalid email")
	ErrInvalidFirstName   = errors.New("invalid first name")
	ErrInvalidLastName    = errors.New("invalid last name")
	ErrInvalidAge         = errors.New("invalid age: must be between 13 and 120")
	ErrInvalidGender      = errors.New("invalid gender")
	ErrInvalidPassword    = errors.New("invalid password: must be at least 8 characters")
	ErrInvalidIdentifier  = errors.New("invalid identifier: email or nickname required")

	// Post errors
	ErrInvalidTitle       = errors.New("invalid title")
	ErrInvalidContent     = errors.New("invalid content")
	ErrInvalidCategory    = errors.New("invalid category")
	ErrInvalidPostID      = errors.New("invalid post ID")

	// Message errors
	ErrInvalidSenderID    = errors.New("invalid sender ID")
	ErrInvalidRecipientID = errors.New("invalid recipient ID")
	ErrSelfMessage        = errors.New("cannot send message to yourself")

	// Database errors
	ErrUserNotFound       = errors.New("user not found")
	ErrPostNotFound       = errors.New("post not found")
	ErrMessageNotFound    = errors.New("message not found")
	ErrDuplicateEmail     = errors.New("email already exists")
	ErrDuplicateNickname  = errors.New("nickname already exists")
)
