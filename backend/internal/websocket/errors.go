package websocket

import "errors"

// WebSocket errors
var (
	ErrClientDisconnected = errors.New("client disconnected")
	ErrInvalidMessage     = errors.New("invalid message format")
	ErrUnauthorized       = errors.New("unauthorized websocket connection")
)
