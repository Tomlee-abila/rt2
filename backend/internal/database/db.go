package database

import (
	"database/sql"
	"io/ioutil"
	"log"

	_ "github.com/mattn/go-sqlite3"
)

var DB *sql.DB

// InitDB initializes the database connection and runs migrations
func InitDB() error {
	var err error
	DB, err = sql.Open("sqlite3", "./forum.db")
	if err != nil {
		return err
	}

	if err = DB.Ping(); err != nil {
		return err
	}

	// Run migrations
	if err = runMigrations(); err != nil {
		return err
	}

	log.Println("Database initialized successfully")
	return nil
}

// runMigrations executes all migration files in order
func runMigrations() error {
	migrationFiles := []string{
		"migrations/001_init.sql",
		"migrations/002_add_user_status.sql",
	}

	for _, file := range migrationFiles {
		if err := executeMigrationFile(file); err != nil {
			log.Printf("Error executing migration %s: %v", file, err)
			return err
		}
		log.Printf("Migration %s executed successfully", file)
	}

	return nil
}

// executeMigrationFile reads and executes a migration file
func executeMigrationFile(filename string) error {
	content, err := ioutil.ReadFile(filename)
	if err != nil {
		return err
	}

	// Special handling for the user status migration
	if filename == "migrations/002_add_user_status.sql" {
		return executeUserStatusMigration()
	}

	_, err = DB.Exec(string(content))
	return err
}

// executeUserStatusMigration handles the user status migration with column existence checks
func executeUserStatusMigration() error {
	// Check if is_online column exists
	var columnExists bool
	err := DB.QueryRow(`
		SELECT COUNT(*) > 0
		FROM pragma_table_info('users')
		WHERE name = 'is_online'
	`).Scan(&columnExists)

	if err != nil {
		return err
	}

	// Add columns only if they don't exist
	if !columnExists {
		_, err = DB.Exec("ALTER TABLE users ADD COLUMN is_online BOOLEAN DEFAULT FALSE")
		if err != nil {
			return err
		}

		_, err = DB.Exec("ALTER TABLE users ADD COLUMN last_seen DATETIME DEFAULT CURRENT_TIMESTAMP")
		if err != nil {
			return err
		}
	}

	// Create indexes (these are safe to run multiple times)
	_, err = DB.Exec("CREATE INDEX IF NOT EXISTS idx_users_is_online ON users(is_online)")
	if err != nil {
		return err
	}

	_, err = DB.Exec("CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users(last_seen DESC)")
	if err != nil {
		return err
	}

	// Create trigger (safe to run multiple times)
	_, err = DB.Exec(`
		CREATE TRIGGER IF NOT EXISTS update_users_last_seen
		AFTER UPDATE OF is_online ON users
		FOR EACH ROW
		WHEN NEW.is_online = 1
		BEGIN
			UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = NEW.id;
		END
	`)

	return err
}

// CloseDB closes the database connection
func CloseDB() error {
	if DB != nil {
		return DB.Close()
	}
	return nil
}
