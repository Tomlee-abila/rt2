package database

import (
	"real-time-forum/backend/internal/models"
	"time"
)

// CreatePost creates a new post in the database
func CreatePost(post *models.Post) error {
	result, err := DB.Exec(`
		INSERT INTO posts (user_id, title, content, category_id, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?)
	`, post.UserID, post.Title, post.Content, post.CategoryID, time.Now().Format("2006-01-02 15:04:05"), time.Now().Format("2006-01-02 15:04:05"))
	if err != nil {
		return err
	}

	postID, err := result.LastInsertId()
	if err != nil {
		return err
	}
	post.ID = int(postID)

	// Get category name
	var categoryName string
	err = DB.QueryRow("SELECT name FROM categories WHERE id = ?", post.CategoryID).Scan(&categoryName)
	if err != nil {
		return err
	}
	post.CategoryName = categoryName

	return nil
}

// GetPosts retrieves posts, optionally filtered by category_id
func GetPosts(categoryID int) ([]models.Post, error) {
	var posts []models.Post
	var query string
	var args []interface{}

	if categoryID != 0 {
		query = `
			SELECT p.id, p.user_id, p.title, p.content, p.category_id, c.name, p.created_at, p.updated_at, u.nickname, u.avatar_color,
				(SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
			FROM posts p
			JOIN users u ON p.user_id = u.id
			JOIN categories c ON p.category_id = c.id
			WHERE p.category_id = ?
			ORDER BY p.created_at DESC
		`
		args = append(args, categoryID)
	} else {
		query = `
			SELECT p.id, p.user_id, p.title, p.content, p.category_id, c.name, p.created_at, p.updated_at, u.nickname, u.avatar_color,
				(SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
			FROM posts p
			JOIN users u ON p.user_id = u.id
			JOIN categories c ON p.category_id = c.id
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
		if err := rows.Scan(&post.ID, &post.UserID, &post.Title, &post.Content, &post.CategoryID, &post.CategoryName, &post.CreatedAt, &post.UpdatedAt, &post.Author, &post.AuthorColor, &post.ReplyCount); err != nil {
			return posts, err
		}
		posts = append(posts, post)
	}

	return posts, nil
}

// CreateComment creates a new comment in the database
func CreateComment(comment *models.Comment) error {
	result, err := DB.Exec(`
		INSERT INTO comments (post_id, user_id, content, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?)
	`, comment.PostID, comment.UserID, comment.Content, time.Now().Format("2006-01-02 15:04:05"), time.Now().Format("2006-01-02 15:04:05"))
	if err != nil {
		return err
	}

	commentID, err := result.LastInsertId()
	if err != nil {
		return err
	}
	comment.ID = int(commentID)

	return nil
}

// GetComments retrieves comments for a specific post
func GetComments(postID int) ([]models.Comment, error) {
	var comments []models.Comment
	rows, err := DB.Query(`
		SELECT c.id, c.post_id, c.user_id, c.content, c.created_at, c.updated_at, u.nickname, u.avatar_color
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
		if err := rows.Scan(&comment.ID, &comment.PostID, &comment.UserID, &comment.Content, &comment.CreatedAt, &comment.UpdatedAt, &comment.Author, &comment.AuthorColor); err != nil {
			return comments, err
		}
		comments = append(comments, comment)
	}

	return comments, nil
}