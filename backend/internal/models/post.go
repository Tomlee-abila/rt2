package models

import (
	"time"
)

// Post represents a forum post
type Post struct {
	ID           int       `json:"id" db:"id"`
	UserID       int       `json:"userId" db:"user_id"`
	Title        string    `json:"title" db:"title"`
	Content      string    `json:"content" db:"content"`
	CategoryID   int       `json:"categoryId" db:"category_id"`
	CategoryName string    `json:"category" db:"category_name"`
	Author       string    `json:"author" db:"nickname"`
	AuthorColor  string    `json:"authorColor" db:"avatar_color"`
	ReplyCount   int       `json:"reply_count" db:"comment_count"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time `json:"updated_at" db:"updated_at"`
}

// Comment represents a comment on a post
type Comment struct {
	ID          int       `json:"id" db:"id"`
	PostID      int       `json:"postId" db:"post_id"`
	UserID      int       `json:"userId" db:"user_id"`
	Content     string    `json:"content" db:"content"`
	Author      string    `json:"author" db:"nickname"`
	AuthorColor string    `json:"authorColor" db:"avatar_color"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
}

// Category represents a post category
type Category struct {
	ID          int       `json:"id" db:"id"`
	Name        string    `json:"name" db:"name"`
	Description string    `json:"description" db:"description"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
}

// CreatePostRequest represents the data needed to create a new post
type CreatePostRequest struct {
	Title      string `json:"title"`
	Content    string `json:"content"`
	CategoryID int    `json:"categoryId"`
}

// CreateCommentRequest represents the data needed to create a new comment
type CreateCommentRequest struct {
	PostID  int    `json:"postId"`
	Content string `json:"content"`
}

// Validate validates post data
func (p *CreatePostRequest) Validate() error {
	if p.Title == "" {
		return ErrInvalidTitle
	}
	if p.Content == "" {
		return ErrInvalidContent
	}
	if p.CategoryID <= 0 {
		return ErrInvalidCategory
	}
	return nil
}

// Validate validates comment data
func (c *CreateCommentRequest) Validate() error {
	if c.Content == "" {
		return ErrInvalidContent
	}
	if c.PostID <= 0 {
		return ErrInvalidPostID
	}
	return nil
}