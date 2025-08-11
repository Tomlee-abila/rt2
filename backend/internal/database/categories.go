package database

// import (
//     "real-time-forum/backend/internal/models"
// )

// Category represents a forum category
type Category struct {
    ID   string `json:"id"`
    Name string `json:"name"`
}

// GetCategories retrieves all categories
func GetCategories() ([]Category, error) {
    rows, err := DB.Query("SELECT id, name FROM categories")
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var categories []Category
    for rows.Next() {
        var c Category
        if err := rows.Scan(&c.ID, &c.Name); err != nil {
            return nil, err
        }
        categories = append(categories, c)
    }
    return categories, nil
}