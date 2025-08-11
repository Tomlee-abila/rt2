package models

import "errors"

// Post represents a forum post
type Post struct {
	ID           int    `json:"id"`
	UserID       int    `json:"user_id"`
	Title        string `json:"title"`
	Content      string `json:"content"`
	CategoryID   int    `json:"category_id"`
	CategoryName string `json:"category"`
	CreatedAt    string `json:"created_at"`
	UpdatedAt    string `json:"updated_at"`
	Nickname     string `json:"nickname"`
	AvatarColor  string `json:"avatar_color"`
	CommentCount int    `json:"comment_count"`
}

// Comment represents a comment on a post
type Comment struct {
	ID          int    `json:"id"`
	PostID      int    `json:"post_id"`
	UserID      int    `json:"user_id"`
	Content     string `json:"content"`
	CreatedAt   string `json:"created_at"`
	UpdatedAt   string `json:"updated_at"`
	Nickname    string `json:"nickname"`
	AvatarColor string `json:"avatar_color"`
}

// ValidatePost validates post data
func (p *Post) ValidatePost() error {
	if p.Title == "" || p.Content == "" || p.CategoryID == 0 {
		return errors.New("title, content, and category are required")
	}
	return nil
}

// ValidateComment validates comment input data
func (c *Comment) ValidateComment() error {
	if c.Content == "" {
		return ErrInvalidContent
	}
	if c.PostID <= 0 {
		return ErrInvalidPostID
	}
	return nil
}