package models

import "errors"

// Model validation errors
var (
	// User errors
	ErrInvalidNickname  = errors.New("invalid nickname")
	ErrInvalidEmail     = errors.New("invalid email")
	ErrInvalidFirstName = errors.New("invalid first name")
	ErrInvalidLastName  = errors.New("invalid last name")
	ErrInvalidAge       = errors.New("invalid age: must be at least 13")
	ErrInvalidGender    = errors.New("invalid gender")

	// Post errors
	ErrInvalidTitle    = errors.New("invalid title")
	ErrInvalidContent  = errors.New("invalid content")
	ErrInvalidCategory = errors.New("invalid category")
	ErrInvalidPostID   = errors.New("invalid post ID")

	// Message errors
	ErrInvalidSenderID    = errors.New("invalid sender ID")
	ErrInvalidRecipientID = errors.New("invalid recipient ID")
	ErrSelfMessage        = errors.New("cannot send message to yourself")
)
