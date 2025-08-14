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



	_, err = DB.Exec(string(content))
	return err
}



// CloseDB closes the database connection
func CloseDB() error {
	if DB != nil {
		return DB.Close()
	}
	return nil
}