package api

import (
	"encoding/json"
	"net/http"
	"real-time-forum/backend/internal/database"
	"real-time-forum/backend/internal/models"
	"real-time-forum/backend/internal/utils"
	"real-time-forum/backend/internal/websocket"
	"strconv"
	// "time"
)

// Handlers contains all HTTP handlers and dependencies
type Handlers struct {
	Hub *websocket.Hub
}

// NewHandlers creates a new handlers instance
func NewHandlers(hub *websocket.Hub) *Handlers {
	return &Handlers{
		Hub: hub,
	}
}

// ServeHome serves the main HTML file
func (h *Handlers) ServeHome(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		http.Error(w, "Not found", http.StatusNotFound)
		return
	}
	http.ServeFile(w, r, "frontend/static/index.html")
}

// HandleUsersMe retrieves the authenticated user's profile
func (h *Handlers) HandleUsersMe(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, err := utils.GetUserIDFromSession(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	user, err := database.GetUserByID(userID)
	if err != nil {
		http.Error(w, "Error retrieving user", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

// HandleProfile updates the authenticated user's profile
func (h *Handlers) HandleProfile(w http.ResponseWriter, r *http.Request) {
	if r.Method != "PUT" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, err := utils.GetUserIDFromSession(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var userData models.User
	if err := json.NewDecoder(r.Body).Decode(&userData); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	// Validate user data
	if err := userData.ValidateUser(); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Update user in database
	if err := database.UpdateUser(userID, &userData); err != nil {
		http.Error(w, "Error updating profile", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(userData)
}

// HandleRegister handles user registration
func (h *Handlers) HandleRegister(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var requestData struct {
		models.User
		Password string `json:"password"`
	}

	if err := json.NewDecoder(r.Body).Decode(&requestData); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	// Validate user data
	if err := requestData.User.ValidateUser(); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Validate password
	if err := utils.ValidatePassword(requestData.Password); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Create user
	if err := database.CreateUser(&requestData.User, requestData.Password); err != nil {
		if err == database.ErrUserAlreadyExists {
			http.Error(w, "Nickname or email already exists", http.StatusConflict)
		} else {
			http.Error(w, "Error creating user", http.StatusInternalServerError)
		}
		return
	}

	// Create session
	sessionID, err := utils.CreateSession(requestData.User.ID)
	if err != nil {
		http.Error(w, "Error creating session", http.StatusInternalServerError)
		return
	}

	// Set cookie
	utils.SetSessionCookie(w, sessionID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(requestData.User)
}

// HandleLogin handles user authentication
func (h *Handlers) HandleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var loginData struct {
		Identifier string `json:"identifier"`
		Password   string `json:"password"`
	}

	if err := json.NewDecoder(r.Body).Decode(&loginData); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	// Authenticate user
	user, err := database.AuthenticateUser(loginData.Identifier, loginData.Password)
	if err != nil {
		if err == database.ErrInvalidCredentials {
			http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		} else {
			http.Error(w, "Authentication error", http.StatusInternalServerError)
		}
		return
	}

	// Create session
	sessionID, err := utils.CreateSession(user.ID)
	if err != nil {
		http.Error(w, "Error creating session", http.StatusInternalServerError)
		return
	}

	// Set cookie
	utils.SetSessionCookie(w, sessionID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

// HandleLogout handles user logout
func (h *Handlers) HandleLogout(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	cookie, err := r.Cookie("session_id")
	if err == nil {
		// Delete session from database
		utils.DeleteSession(cookie.Value)
	}

	// Clear cookie
	utils.ClearSessionCookie(w)

	w.WriteHeader(http.StatusOK)
}

// HandlePosts handles post operations
func (h *Handlers) HandlePosts(w http.ResponseWriter, r *http.Request) {
	userID, err := utils.GetUserIDFromSession(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	switch r.Method {
	case "GET":
		categoryIDStr := r.URL.Query().Get("category_id")
		var posts []models.Post
		if categoryIDStr != "" {
			categoryID, err := strconv.Atoi(categoryIDStr)
			if err != nil {
				http.Error(w, "Invalid category ID", http.StatusBadRequest)
				return
			}
			posts, err = database.GetPosts(categoryID)
		} else {
			posts, err = database.GetPosts(0) // 0 means all categories
		}
		if err != nil {
			http.Error(w, "Error retrieving posts", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(posts)

	case "POST":
		var req models.CreatePostRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid JSON", http.StatusBadRequest)
			return
		}

		// Validate post request
		if err := req.Validate(); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		// Create post from request
		post := models.Post{
			UserID:     userID,
			Title:      req.Title,
			Content:    req.Content,
			CategoryID: req.CategoryID,
		}

		if err := database.CreatePost(&post); err != nil {
			http.Error(w, "Error creating post", http.StatusInternalServerError)
			return
		}

		// Get user info for WebSocket notification
		user, err := database.GetUserByID(userID)
		if err != nil {
			http.Error(w, "Error retrieving user info", http.StatusInternalServerError)
			return
		}

		// Parse post.CreatedAt for WebSocket notification
		// createdAt, err := time.Parse("2006-01-02 15:04:05", post.CreatedAt)
		// if err != nil {
		// 	http.Error(w, "Error parsing post creation time", http.StatusInternalServerError)
		// 	return
		// }

		// Broadcast new post event
		h.Hub.HandleNewPost(&post, user.Nickname, user.AvatarColor)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(post)
	}
}

// HandleComments handles comment operations
func (h *Handlers) HandleComments(w http.ResponseWriter, r *http.Request) {
	userID, err := utils.GetUserIDFromSession(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	switch r.Method {
	case "GET":
		postIDStr := r.URL.Query().Get("post_id")
		postID, err := strconv.Atoi(postIDStr)
		if err != nil {
			http.Error(w, "Invalid post ID", http.StatusBadRequest)
			return
		}

		comments, err := database.GetComments(postID)
		if err != nil {
			http.Error(w, "Error retrieving comments", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(comments)

	case "POST":
		var req models.CreateCommentRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid JSON", http.StatusBadRequest)
			return
		}

		// Validate comment request
		if err := req.Validate(); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		// Create comment from request
		comment := models.Comment{
			PostID:  req.PostID,
			UserID:  userID,
			Content: req.Content,
		}

		if err := database.CreateComment(&comment); err != nil {
			http.Error(w, "Error creating comment", http.StatusInternalServerError)
			return
		}

		// Get user info for WebSocket notification
		user, err := database.GetUserByID(userID)
		if err != nil {
			http.Error(w, "Error retrieving user info", http.StatusInternalServerError)
			return
		}

		// Parse comment.CreatedAt for WebSocket notification
		// createdAt, err := time.Parse("2006-01-02 15:04:05", comment.CreatedAt)
		// if err != nil {
		// 	http.Error(w, "Error parsing comment creation time", http.StatusInternalServerError)
		// 	return
		// }

		// Broadcast new comment event
		h.Hub.HandleNewComment(&comment, user.Nickname, user.AvatarColor)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(comment)
	}
}

// HandleMessages handles message operations
func (h *Handlers) HandleMessages(w http.ResponseWriter, r *http.Request) {
	userID, err := utils.GetUserIDFromSession(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	switch r.Method {
	case "GET":
		otherUserIDStr := r.URL.Query().Get("user_id")
		otherUserID, err := strconv.Atoi(otherUserIDStr)
		if err != nil {
			http.Error(w, "Invalid user ID", http.StatusBadRequest)
			return
		}

		offsetStr := r.URL.Query().Get("offset")
		offset, _ := strconv.Atoi(offsetStr)

		messages, err := database.GetMessages(userID, otherUserID, offset)
		if err != nil {
			http.Error(w, "Error retrieving messages", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(messages)
	}
}

// HandleUsers handles user operations
func (h *Handlers) HandleUsers(w http.ResponseWriter, r *http.Request) {
	_, err := utils.GetUserIDFromSession(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// If we reach here, user is authenticated
	users, err := database.GetAllUsers()
	if err != nil {
		http.Error(w, "Error retrieving users", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(users)
}

// HandleWebSocket handles WebSocket connections
func (h *Handlers) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	websocket.HandleWebSocket(h.Hub, w, r)
}

// HandleCategories retrieves all categories
func (h *Handlers) HandleCategories(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	categories, err := database.GetCategories()
	if err != nil {
		http.Error(w, "Error retrieving categories", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(categories)
}