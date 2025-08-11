package models


// User data structures, validation, and business logic
type User struct {
	ID          int       `json:"id"`
	Nickname    string    `json:"nickname"`
	Email       string    `json:"email"`
	FirstName   string    `json:"firstName"`
	LastName    string    `json:"lastName"`
	Age         int       `json:"age"`
	Gender      string    `json:"gender"`
	AvatarColor string    `json:"avatarColor"`
	IsOnline    bool      `json:"isOnline"`
	LastSeen    string `json:"lastSeen"`
}

// ValidateUser validates user input data
func (u *User) ValidateUser() error {
	if u.Nickname == "" {
		return ErrInvalidNickname
	}
	if u.Email == "" {
		return ErrInvalidEmail
	}
	if u.FirstName == "" {
		return ErrInvalidFirstName
	}
	if u.LastName == "" {
		return ErrInvalidLastName
	}
	if u.Age < 13 {
		return ErrInvalidAge
	}
	if u.Gender == "" {
		return ErrInvalidGender
	}
	return nil
}

// IsValidGender checks if the gender value is valid
func IsValidGender(gender string) bool {
	validGenders := []string{"male", "female", "other", "prefer_not_to_say"}
	for _, valid := range validGenders {
		if gender == valid {
			return true
		}
	}
	return false
}
