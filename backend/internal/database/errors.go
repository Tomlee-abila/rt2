package database

import "errors"

// Database operation errors
var (
	ErrUserAlreadyExists   = errors.New("user already exists")
	ErrInvalidCredentials  = errors.New("invalid credentials")
	ErrUserNotFound        = errors.New("user not found")
	ErrPostNotFound        = errors.New("post not found")
	ErrCommentNotFound     = errors.New("comment not found")
	ErrMessageNotFound     = errors.New("message not found")
	ErrSessionNotFound     = errors.New("session not found")
	ErrSessionExpired      = errors.New("session expired")
)
