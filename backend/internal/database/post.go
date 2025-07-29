package database

import (
	"real-time-forum/backend/internal/models"
	"time"
)

// CreatePost creates a new post in the database
func CreatePost(post *models.Post) error {
	result, err := DB.Exec(`
		INSERT INTO posts (user_id, title, content, category)
		VALUES (?, ?, ?, ?)
	`, post.UserID, post.Title, post.Content, post.Category)

	if err != nil {
		return err
	}

	postID, _ := result.LastInsertId()
	post.ID = int(postID)
	post.CreatedAt = time.Now()
	return nil
}

// GetPosts retrieves posts, optionally filtered by category
func GetPosts(category string) ([]models.Post, error) {
	var posts []models.Post
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

	rows, err := DB.Query(query, args...)
	if err != nil {
		return posts, err
	}
	defer rows.Close()

	for rows.Next() {
		var post models.Post
		err := rows.Scan(&post.ID, &post.UserID, &post.Title, &post.Content,
			&post.Category, &post.CreatedAt, &post.Author)
		if err != nil {
			return posts, err
		}
		posts = append(posts, post)
	}

	return posts, nil
}

// CreateComment creates a new comment in the database
func CreateComment(comment *models.Comment) error {
	result, err := DB.Exec(`
		INSERT INTO comments (post_id, user_id, content)
		VALUES (?, ?, ?)
	`, comment.PostID, comment.UserID, comment.Content)

	if err != nil {
		return err
	}

	commentID, _ := result.LastInsertId()
	comment.ID = int(commentID)
	comment.CreatedAt = time.Now()
	return nil
}

// GetComments retrieves comments for a specific post
func GetComments(postID int) ([]models.Comment, error) {
	var comments []models.Comment
	rows, err := DB.Query(`
		SELECT c.id, c.post_id, c.user_id, c.content, c.created_at, u.nickname
		FROM comments c
		JOIN users u ON c.user_id = u.id
		WHERE c.post_id = ?
		ORDER BY c.created_at ASC
	`, postID)

	if err != nil {
		return comments, err
	}
	defer rows.Close()

	for rows.Next() {
		var comment models.Comment
		err := rows.Scan(&comment.ID, &comment.PostID, &comment.UserID,
			&comment.Content, &comment.CreatedAt, &comment.Author)
		if err != nil {
			return comments, err
		}
		comments = append(comments, comment)
	}

	return comments, nil
}
