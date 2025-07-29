package models

import "time"

// Post and comment models with category validation
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

// ValidatePost validates post input data
func (p *Post) ValidatePost() error {
	if p.Title == "" {
		return ErrInvalidTitle
	}
	if p.Content == "" {
		return ErrInvalidContent
	}
	if !IsValidCategory(p.Category) {
		return ErrInvalidCategory
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

// IsValidCategory checks if the category value is valid
func IsValidCategory(category string) bool {
	validCategories := []string{"general", "technology", "random", "help"}
	for _, valid := range validCategories {
		if category == valid {
			return true
		}
	}
	return false
}
