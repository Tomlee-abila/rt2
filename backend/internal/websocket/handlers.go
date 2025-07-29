package websocket

import (
	"log"
	"net/http"
	"real-time-forum/backend/internal/utils"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow connections from any origin
	},
}

// HandleWebSocket handles WebSocket upgrade and authentication
func HandleWebSocket(hub *Hub, w http.ResponseWriter, r *http.Request) {
	// Authenticate user
	userID, err := utils.GetUserIDFromSession(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Upgrade connection
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}

	// Create and register client
	client := NewClient(hub, conn, userID)
	hub.RegisterClient(client)

	// Start client pumps
	client.Run()
}
