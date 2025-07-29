package utils

import "errors"

// Utility errors
var (
	ErrPasswordTooShort = errors.New("password must be at least 8 characters")
)
