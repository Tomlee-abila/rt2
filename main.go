package main

import (
    "database/sql"
    "encoding/json"
    "log"
    "net/http"
    "strconv"
    "strings"
    "sync"
    "time"

    "github.com/gorilla/websocket"
    "github.com/gofrs/uuid"
    "golang.org/x/crypto/bcrypt"
    _ "github.com/mattn/go-sqlite3"
)

type User struct {
    ID          int    `json:"id"`
    Nickname    string `json:"nickname"`
    Email       string `json:"email"`
    FirstName   string `json:"firstName"`
    LastName    string `json:"lastName"`
    Age         int    `json:"age"`
    Gender      string `json:"gender"`
    AvatarColor string `json:"avatarColor"`
    IsOnline    bool   `json:"isOnline"`
    LastSeen    time.Time `json:"lastSeen"`
}

type Post struct {
    ID        int       `json:"id"`
    UserID    int       `json:"userId"`
    Title     string    `json:"title"`
    Content   string    `json:"content"`
    Category  string    `json:"category"`
    CreatedAt time.Time `json:"createdAt"`
    Author    string    `json:"author"`
}

type Comment struct {
    ID        int       `json:"id"`
    PostID    int       `json:"postId"`
    UserID    int       `json:"userId"`
    Content   string    `json:"content"`
    CreatedAt time.Time `json:"createdAt"`
    Author    string    `json:"author"`
}

type Message struct {
    ID          int       `json:"id"`
    SenderID    int       `json:"senderId"`
    RecipientID int       `json:"recipientId"`
    Content     string    `json:"content"`
    CreatedAt   time.Time `json:"createdAt"`
    Sender      string    `json:"sender"`
    Recipient   string    `json:"recipient"`
}

type Client struct {
    conn   *websocket.Conn
    userID int
    send   chan []byte
}

type Hub struct {
    clients    map[*Client]bool
    broadcast  chan []byte
    register   chan *Client
    unregister chan *Client
    userClients map[int]*Client
    mu         sync.RWMutex
}

var (
    db       *sql.DB
    hub      *Hub
    upgrader = websocket.Upgrader{
        CheckOrigin: func(r *http.Request) bool {
            return true
        },
    }
)

func main() {
    initDB()
    hub = &Hub{
        clients:     make(map[*Client]bool),
        broadcast:   make(chan []byte),
        register:    make(chan *Client),
        unregister:  make(chan *Client),
        userClients: make(map[int]*Client),
    }

    go hub.run()

    http.HandleFunc("/", serveHome)
    http.HandleFunc("/api/register", handleRegister)
    http.HandleFunc("/api/login", handleLogin)
    http.HandleFunc("/api/logout", handleLogout)
    http.HandleFunc("/api/posts", handlePosts)
    http.HandleFunc("/api/comments", handleComments)
    http.HandleFunc("/api/messages", handleMessages)
    http.HandleFunc("/api/users", handleUsers)
    http.HandleFunc("/ws", handleWebSocket)

    log.Println("Server starting on :8080")
    log.Fatal(http.ListenAndServe(":8080", nil))
}

func initDB() {
    var err error
    db, err = sql.Open("sqlite3", "./forum.db")
    if err != nil {
        log.Fatal(err)
    }

    createTables()
}

func createTables() {
    queries := []string{
        `CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nickname TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            age INTEGER NOT NULL,
            gender TEXT NOT NULL,
            avatar_color TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            category TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )`,
        `CREATE TABLE IF NOT EXISTS comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            post_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (post_id) REFERENCES posts (id),
            FOREIGN KEY (user_id) REFERENCES users (id)
        )`,
        `CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender_id INTEGER NOT NULL,
            recipient_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (sender_id) REFERENCES users (id),
            FOREIGN KEY (recipient_id) REFERENCES users (id)
        )`,
        `CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            expires_at DATETIME NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )`,
    }

    for _, query := range queries {
        _, err := db.Exec(query)
        if err != nil {
            log.Fatal(err)
        }
    }
}

func (h *Hub) run() {
    for {
        select {
        case client := <-h.register:
            h.mu.Lock()
            h.clients[client] = true
            h.userClients[client.userID] = client
            h.mu.Unlock()
            
            // Update user online status
            updateUserOnlineStatus(client.userID, true)
            
            // Broadcast online status update
            h.broadcastOnlineUsers()

        case client := <-h.unregister:
            h.mu.Lock()
            if _, ok := h.clients[client]; ok {
                delete(h.clients, client)
                delete(h.userClients, client.userID)
                close(client.send)
            }
            h.mu.Unlock()
            
            // Update user offline status
            updateUserOnlineStatus(client.userID, false)
            
            // Broadcast online status update
            h.broadcastOnlineUsers()

        case message := <-h.broadcast:
            h.mu.RLock()
            for client := range h.clients {
                select {
                case client.send <- message:
                default:
                    close(client.send)
                    delete(h.clients, client)
                    delete(h.userClients, client.userID)
                }
            }
            h.mu.RUnlock()
        }
    }
}

func (h *Hub) broadcastOnlineUsers() {
    users := getOnlineUsers()
    message := map[string]interface{}{
        "type":  "online_users",
        "users": users,
    }
    
    data, _ := json.Marshal(message)
    h.broadcast <- data
}

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
    userID := getUserIDFromSession(r)
    if userID == 0 {
        http.Error(w, "Unauthorized", http.StatusUnauthorized)
        return
    }

    conn, err := upgrader.Upgrade(w, r, nil)
    if err != nil {
        log.Println(err)
        return
    }

    client := &Client{
        conn:   conn,
        userID: userID,
        send:   make(chan []byte, 256),
    }

    hub.register <- client

    go client.writePump()
    go client.readPump()
}

func (c *Client) readPump() {
    defer func() {
        hub.unregister <- c
        c.conn.Close()
    }()

    for {
        var msg map[string]interface{}
        err := c.conn.ReadJSON(&msg)
        if err != nil {
            break
        }

        switch msg["type"] {
        case "private_message":
            handlePrivateMessage(c, msg)
        }
    }
}

func (c *Client) writePump() {
    defer c.conn.Close()

    for {
        select {
        case message, ok := <-c.send:
            if !ok {
                c.conn.WriteMessage(websocket.CloseMessage, []byte{})
                return
            }
            c.conn.WriteMessage(websocket.TextMessage, message)
        }
    }
}

func handlePrivateMessage(client *Client, msg map[string]interface{}) {
    recipientID := int(msg["recipientId"].(float64))
    content := msg["content"].(string)

    // Save message to database
    _, err := db.Exec(`
        INSERT INTO messages (sender_id, recipient_id, content)
        VALUES (?, ?, ?)
    `, client.userID, recipientID, content)
    
    if err != nil {
        log.Println("Error saving message:", err)
        return
    }

    // Get sender info
    sender := getUserByID(client.userID)
    
    // Create message response
    response := map[string]interface{}{
        "type":        "new_message",
        "senderId":    client.userID,
        "recipientId": recipientID,
        "content":     content,
        "sender":      sender.Nickname,
        "timestamp":   time.Now().Format("15:04"),
    }

    data, _ := json.Marshal(response)

    // Send to recipient if online
    hub.mu.RLock()
    if recipientClient, ok := hub.userClients[recipientID]; ok {
        select {
        case recipientClient.send <- data:
        default:
            close(recipientClient.send)
            delete(hub.clients, recipientClient)
            delete(hub.userClients, recipientID)
        }
    }
    hub.mu.RUnlock()

    // Send confirmation to sender
    client.send <- data
}

func serveHome(w http.ResponseWriter, r *http.Request) {
    http.ServeFile(w, r, "index.html")
}

func handleRegister(w http.ResponseWriter, r *http.Request) {
    if r.Method != "POST" {
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
        return
    }

    var user User
    if err := json.NewDecoder(r.Body).Decode(&user); err != nil {
        http.Error(w, "Invalid JSON", http.StatusBadRequest)
        return
    }

    // Validate input
    if user.Nickname == "" || user.Email == "" || user.FirstName == "" || user.LastName == "" {
        http.Error(w, "All fields are required", http.StatusBadRequest)
        return
    }

    // Hash password
    password := r.FormValue("password")
    if len(password) < 8 {
        http.Error(w, "Password must be at least 8 characters", http.StatusBadRequest)
        return
    }

    hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
    if err != nil {
        http.Error(w, "Error hashing password", http.StatusInternalServerError)
        return
    }

    // Insert user
    result, err := db.Exec(`
        INSERT INTO users (nickname, email, password_hash, first_name, last_name, age, gender, avatar_color)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, user.Nickname, user.Email, string(hashedPassword), user.FirstName, user.LastName, user.Age, user.Gender, user.AvatarColor)

    if err != nil {
        if strings.Contains(err.Error(), "UNIQUE constraint failed") {
            http.Error(w, "Nickname or email already exists", http.StatusConflict)
        } else {
            http.Error(w, "Error creating user", http.StatusInternalServerError)
        }
        return
    }

    userID, _ := result.LastInsertId()
    user.ID = int(userID)

    // Create session
    sessionID := createSession(user.ID)
    
    // Set cookie
    http.SetCookie(w, &http.Cookie{
        Name:     "session_id",
        Value:    sessionID,
        Path:     "/",
        HttpOnly: true,
        MaxAge:   86400 * 7, // 7 days
    })

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(user)
}

func handleLogin(w http.ResponseWriter, r *http.Request) {
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

    // Find user by email or nickname
    var user User
    var passwordHash string
    err := db.QueryRow(`
        SELECT id, nickname, email, password_hash, first_name, last_name, age, gender, avatar_color
        FROM users WHERE email = ? OR nickname = ?
    `, loginData.Identifier, loginData.Identifier).Scan(
        &user.ID, &user.Nickname, &user.Email, &passwordHash,
        &user.FirstName, &user.LastName, &user.Age, &user.Gender, &user.AvatarColor,
    )

    if err != nil {
        http.Error(w, "Invalid credentials", http.StatusUnauthorized)
        return
    }

    // Check password
    if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(loginData.Password)); err != nil {
        http.Error(w, "Invalid credentials", http.StatusUnauthorized)
        return
    }

    // Create session
    sessionID := createSession(user.ID)
    
    // Set cookie
    http.SetCookie(w, &http.Cookie{
        Name:     "session_id",
        Value:    sessionID,
        Path:     "/",
        HttpOnly: true,
        MaxAge:   86400 * 7, // 7 days
    })

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(user)
}

func handleLogout(w http.ResponseWriter, r *http.Request) {
    if r.Method != "POST" {
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
        return
    }

    cookie, err := r.Cookie("session_id")
    if err == nil {
        // Delete session from database
        db.Exec("DELETE FROM sessions WHERE id = ?", cookie.Value)
    }

    // Clear cookie
    http.SetCookie(w, &http.Cookie{
        Name:     "session_id",
        Value:    "",
        Path:     "/",
        HttpOnly: true,
        MaxAge:   -1,
    })

    w.WriteHeader(http.StatusOK)
}

func handlePosts(w http.ResponseWriter, r *http.Request) {
    userID := getUserIDFromSession(r)
    if userID == 0 {
        http.Error(w, "Unauthorized", http.StatusUnauthorized)
        return
    }

    switch r.Method {
    case "GET":
        category := r.URL.Query().Get("category")
        posts := getPosts(category)
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(posts)

    case "POST":
        var post Post
        if err := json.NewDecoder(r.Body).Decode(&post); err != nil {
            http.Error(w, "Invalid JSON", http.StatusBadRequest)
            return
        }

        post.UserID = userID
        result, err := db.Exec(`
            INSERT INTO posts (user_id, title, content, category)
            VALUES (?, ?, ?, ?)
        `, post.UserID, post.Title, post.Content, post.Category)

        if err != nil {
            http.Error(w, "Error creating post", http.StatusInternalServerError)
            return
        }

        postID, _ := result.LastInsertId()
        post.ID = int(postID)
        post.CreatedAt = time.Now()

        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(post)
    }
}

func handleComments(w http.ResponseWriter, r *http.Request) {
    userID := getUserIDFromSession(r)
    if userID == 0 {
        http.Error(w, "Unauthorized", http.StatusUnauthorized)
        return
    }

    switch r.Method {
    case "GET":
        postIDStr := r.URL.Query().Get("post_id")
        postID, _ := strconv.Atoi(postIDStr)
        comments := getComments(postID)
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(comments)

    case "POST":
        var comment Comment
        if err := json.NewDecoder(r.Body).Decode(&comment); err != nil {
            http.Error(w, "Invalid JSON", http.StatusBadRequest)
            return
        }

        comment.UserID = userID
        result, err := db.Exec(`
            INSERT INTO comments (post_id, user_id, content)
            VALUES (?, ?, ?)
        `, comment.PostID, comment.UserID, comment.Content)

        if err != nil {
            http.Error(w, "Error creating comment", http.StatusInternalServerError)
            return
        }

        commentID, _ := result.LastInsertId()
        comment.ID = int(commentID)
        comment.CreatedAt = time.Now()

        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(comment)
    }
}

func handleMessages(w http.ResponseWriter, r *http.Request) {
    userID := getUserIDFromSession(r)
    if userID == 0 {
        http.Error(w, "Unauthorized", http.StatusUnauthorized)
        return
    }

    switch r.Method {
    case "GET":
        otherUserIDStr := r.URL.Query().Get("user_id")
        otherUserID, _ := strconv.Atoi(otherUserIDStr)
        offsetStr := r.URL.Query().Get("offset")
        offset, _ := strconv.Atoi(offsetStr)
        
        messages := getMessages(userID, otherUserID, offset)
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(messages)
    }
}

func handleUsers(w http.ResponseWriter, r *http.Request) {
    userID := getUserIDFromSession(r)
    if userID == 0 {
        http.Error(w, "Unauthorized", http.StatusUnauthorized)
        return
    }

    users := getAllUsers()
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(users)
}

// Helper functions
func createSession(userID int) string {
    sessionID := uuid.Must(uuid.NewV4()).String()
    expiresAt := time.Now().Add(7 * 24 * time.Hour)
    
    db.Exec(`
        INSERT INTO sessions (id, user_id, expires_at)
        VALUES (?, ?, ?)
    `, sessionID, userID, expiresAt)
    
    return sessionID
}

func getUserIDFromSession(r *http.Request) int {
    cookie, err := r.Cookie("session_id")
    if err != nil {
        return 0
    }

    var userID int
    err = db.QueryRow(`
        SELECT user_id FROM sessions 
        WHERE id = ? AND expires_at > CURRENT_TIMESTAMP
    `, cookie.Value).Scan(&userID)
    
    if err != nil {
        return 0
    }
    
    return userID
}

func getUserByID(userID int) User {
    var user User
    db.QueryRow(`
        SELECT id, nickname, email, first_name, last_name, age, gender, avatar_color
        FROM users WHERE id = ?
    `, userID).Scan(
        &user.ID, &user.Nickname, &user.Email,
        &user.FirstName, &user.LastName, &user.Age, &user.Gender, &user.AvatarColor,
    )
    return user
}

func getPosts(category string) []Post {
    var posts []Post
    var query string
    var args []interface{}

    if category != "" {
        query = `
            SELECT p.id, p.user_id, p.title, p.content, p.category, p.created_at, u.nickname
            FROM posts p
            JOIN users u ON p.user_id = u.id
            WHERE p.category = ?
            ORDER BY p.created_at DESC
        `
        args = append(args, category)
    } else {
        query = `
            SELECT p.id, p.user_id, p.title, p.content, p.category, p.created_at, u.nickname
            FROM posts p
            JOIN users u ON p.user_id = u.id
            ORDER BY p.created_at DESC
        `
    }

    rows, err := db.Query(query, args...)
    if err != nil {
        return posts
    }
    defer rows.Close()

    for rows.Next() {
        var post Post
        rows.Scan(&post.ID, &post.UserID, &post.Title, &post.Content, 
            &post.Category, &post.CreatedAt, &post.Author)
        posts = append(posts, post)
    }

    return posts
}

func getComments(postID int) []Comment {
    var comments []Comment
    rows, err := db.Query(`
        SELECT c.id, c.post_id, c.user_id, c.content, c.created_at, u.nickname
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.post_id = ?
        ORDER BY c.created_at ASC
    `, postID)
    
    if err != nil {
        return comments
    }
    defer rows.Close()

    for rows.Next() {
        var comment Comment
        rows.Scan(&comment.ID, &comment.PostID, &comment.UserID, 
            &comment.Content, &comment.CreatedAt, &comment.Author)
        comments = append(comments, comment)
    }

    return comments
}

func getMessages(userID, otherUserID, offset int) []Message {
    var messages []Message
    rows, err := db.Query(`
        SELECT m.id, m.sender_id, m.recipient_id, m.content, m.created_at,
               s.nickname as sender, r.nickname as recipient
        FROM messages m
        JOIN users s ON m.sender_id = s.id
        JOIN users r ON m.recipient_id = r.id
        WHERE (m.sender_id = ? AND m.recipient_id = ?) 
           OR (m.sender_id = ? AND m.recipient_id = ?)
        ORDER BY m.created_at DESC
        LIMIT 10 OFFSET ?
    `, userID, otherUserID, otherUserID, userID, offset)
    
    if err != nil {
        return messages
    }
    defer rows.Close()

    for rows.Next() {
        var message Message
        rows.Scan(&message.ID, &message.SenderID, &message.RecipientID,
            &message.Content, &message.CreatedAt, &message.Sender, &message.Recipient)
        messages = append(messages, message)
    }

    return messages
}

func getAllUsers() []User {
    var users []User
    rows, err := db.Query(`
        SELECT id, nickname, email, first_name, last_name, age, gender, avatar_color
        FROM users
        ORDER BY nickname
    `)
    
    if err != nil {
        return users
    }
    defer rows.Close()

    for rows.Next() {
        var user User
        rows.Scan(&user.ID, &user.Nickname, &user.Email,
            &user.FirstName, &user.LastName, &user.Age, &user.Gender, &user.AvatarColor)
        users = append(users, user)
    }

    return users
}

func getOnlineUsers() []User {
    var users []User
    hub.mu.RLock()
    for userID := range hub.userClients {
        user := getUserByID(userID)
        user.IsOnline = true
        users = append(users, user)
    }
    hub.mu.RUnlock()
    return users
}

func updateUserOnlineStatus(userID int, isOnline bool) {
    // This could be used to update a last_seen timestamp in the database
    // For now, we track online status in memory via WebSocket connections
}