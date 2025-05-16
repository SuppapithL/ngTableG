package db

import (
	"context"
	"log"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"

	"github.com/kengtableg/pkeng-tableg/db/sqlc"
)

// DB represents the database connection pool
type DB struct {
	*pgxpool.Pool
	*sqlc.Queries
}

// New creates a new database connection
func New() (*DB, error) {
	err := godotenv.Load()
	if err != nil {
		log.Println("Warning: .env file not found, using environment variables")
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://postgres:Suppapith2@localhost:5432/file_manager?sslmode=disable"
	}

	pool, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		return nil, err
	}

	db := &DB{
		Pool:    pool,
		Queries: sqlc.New(pool),
	}

	return db, nil
}

// Close closes the database connection
func (db *DB) Close() {
	if db.Pool != nil {
		db.Pool.Close()
	}
}
