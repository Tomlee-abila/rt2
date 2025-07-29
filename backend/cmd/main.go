package main

import (
	"log"
	"net/http"
	"real-time-forum/backend/internal/api"
	"real-time-forum/backend/internal/database"
	"real-time-forum/backend/internal/websocket"
)

func main() {
	// Initialize database
	if err := database.InitDB(); err != nil {
		log.Fatal("Failed to initialize database:", err)
	}
	defer database.CloseDB()

	// Create WebSocket hub
	hub := websocket.NewHub()
	go hub.Run()

	// Create handlers
	handlers := api.NewHandlers(hub)

	// Setup routes
	setupRoutes(handlers)

	log.Println("Server starting on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

func setupRoutes(handlers *api.Handlers) {
	// Static files
	http.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir("frontend/static/"))))

	// Main page
	http.HandleFunc("/", handlers.ServeHome)

	// API routes
	http.HandleFunc("/api/register", handlers.HandleRegister)
	http.HandleFunc("/api/login", handlers.HandleLogin)
	http.HandleFunc("/api/logout", handlers.HandleLogout)
	http.HandleFunc("/api/posts", handlers.HandlePosts)
	http.HandleFunc("/api/comments", handlers.HandleComments)
	http.HandleFunc("/api/messages", handlers.HandleMessages)
	http.HandleFunc("/api/users", handlers.HandleUsers)

	// WebSocket endpoint
	http.HandleFunc("/ws", handlers.HandleWebSocket)
}
