# Real-Time Forum

A modern real-time forum application built with Go backend and vanilla JavaScript frontend, featuring WebSocket-based real-time messaging and user interactions.

## Features

- **Real-time Communication**: WebSocket-powered live messaging and notifications
- **User Authentication**: Secure session-based authentication with bcrypt password hashing
- **Forum Categories**: Organized discussions across multiple categories (General, Technology, Random, Help)
- **Private Messaging**: Direct messaging between users with real-time delivery
- **Online Status**: Live tracking of online/offline user status
- **Responsive Design**: Mobile-friendly interface with Tailwind CSS
- **Database Migrations**: Structured database schema management

## Architecture

The application follows a clean, modular architecture with clear separation of concerns:

### Backend Structure (`backend/`)
- **`cmd/main.go`**: Application entry point with server initialization
- **`internal/api/`**: HTTP handlers and middleware
- **`internal/database/`**: Database operations and migrations
- **`internal/models/`**: Data structures and business logic validation
- **`internal/utils/`**: Utility functions (sessions, validation)
- **`internal/websocket/`**: WebSocket management and real-time communication

### Frontend Structure (`frontend/static/`)
- **`css/`**: Stylesheets (main styles and component-specific styles)
- **`js/`**: Modular JavaScript files
  - `main.js`: Application initialization and global utilities
  - `auth.js`: Authentication and session management
  - `posts.js`: Post and comment management
  - `websocket.js`: WebSocket client and connection management
  - `messages.js`: Real-time messaging functionality
- **`templates/`**: HTML templates for different views
- **`index.html`**: Main SPA entry point

### Database (`migrations/`)
- **`001_init.sql`**: Initial schema (users, posts, comments, messages, sessions)
- **`002_add_user_status.sql`**: User online status tracking

## Technology Stack

### Backend
- **Go 1.24.3**: Main programming language
- **SQLite**: Database with migration support
- **Gorilla WebSocket**: Real-time communication
- **bcrypt**: Password hashing
- **UUID**: Session management

### Frontend
- **Vanilla JavaScript**: Modular ES6+ code
- **Tailwind CSS**: Utility-first CSS framework
- **WebSocket API**: Real-time client communication

## Getting Started

### Prerequisites
- Go 1.24.3 or higher
- Modern web browser with WebSocket support

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd real-time-forum-2
   ```

2. **Install dependencies**
   ```bash
   go mod tidy
   ```

3. **Run the application**
   ```bash
   go run ./backend/cmd/main.go
   ```

4. **Access the application**
   Open your browser and navigate to `http://localhost:8080`

### Building for Production

```bash
go build -o real_time_forum ./backend/cmd/main.go
./real_time_forum
```

## API Endpoints

### Authentication
- `POST /api/register` - User registration
- `POST /api/login` - User login
- `POST /api/logout` - User logout

### Forum
- `GET /api/posts` - Get posts (with optional category filter)
- `POST /api/posts` - Create new post
- `GET /api/comments` - Get comments for a post
- `POST /api/comments` - Create new comment

### Messaging
- `GET /api/messages` - Get message history
- `GET /api/users` - Get all users (for messaging)

### WebSocket
- `GET /ws` - WebSocket connection for real-time features

## Database Schema

The application uses SQLite with the following main tables:
- **users**: User accounts and profiles
- **posts**: Forum posts with categories
- **comments**: Post comments and replies
- **messages**: Private messages between users
- **sessions**: User authentication sessions

## Development

### Project Structure Philosophy
- **Modular Design**: Each component has a single responsibility
- **Clean Architecture**: Clear separation between layers
- **Scalability**: Easy to extend and maintain
- **Security**: Secure authentication and data validation

### Adding New Features
1. Backend: Add handlers in `internal/api/`, database operations in `internal/database/`
2. Frontend: Create new JavaScript modules in `frontend/static/js/`
3. Database: Add migration files in `migrations/`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes following the existing architecture
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
