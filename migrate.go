package main

import (
	"database/sql"
	"fmt"
	"log"
	"time"

	_ "github.com/lib/pq"
)

func main() {
	fmt.Println("Starting database migration...")

	// Connect to PostgreSQL with the correct credentials found in the codebase
	connStr := "postgres://postgres:Suppapith2@localhost:5432/file_manager?sslmode=disable"
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Test connection
	err = db.Ping()
	if err != nil {
		log.Fatalf("Database connection error: %v", err)
	}

	log.Println("Database connection successful!")

	// Create quota_plans table if it doesn't exist
	err = createQuotaPlansTable(db)
	if err != nil {
		log.Fatalf("Failed to create quota_plans table: %v", err)
	}

	// Update annual_records table to add quota_plan_id column if needed
	err = updateAnnualRecordsTable(db)
	if err != nil {
		log.Fatalf("Failed to update annual_records table: %v", err)
	}

	// Get current year
	currentYear := time.Now().Year()

	// Insert default quota plans for current year and next year if they don't exist
	years := []int{currentYear, currentYear + 1}
	err = insertDefaultQuotaPlans(db, years)
	if err != nil {
		log.Fatalf("Failed to insert default quota plans: %v", err)
	}

	log.Println("Database migration completed successfully!")
}

// createQuotaPlansTable creates the quota_plans table if it doesn't exist
func createQuotaPlansTable(db *sql.DB) error {
	createTableSQL := `
	CREATE TABLE IF NOT EXISTS quota_plans (
		id SERIAL PRIMARY KEY,
		plan_name VARCHAR(255) NOT NULL,
		year INTEGER NOT NULL,
		quota_vacation_day FLOAT NOT NULL,
		quota_medical_expense_baht FLOAT NOT NULL,
		created_by_user_id INTEGER,
		created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		UNIQUE(plan_name, year)
	);
	`

	_, err := db.Exec(createTableSQL)
	if err != nil {
		return fmt.Errorf("failed to create quota_plans table: %w", err)
	}

	log.Println("quota_plans table created or already exists")
	return nil
}

// insertDefaultQuotaPlans inserts default quota plans for the specified years if they don't exist
func insertDefaultQuotaPlans(db *sql.DB, years []int) error {
	// Check existing plans
	for _, year := range years {
		var count int
		err := db.QueryRow("SELECT COUNT(*) FROM quota_plans WHERE year = $1", year).Scan(&count)
		if err != nil {
			return fmt.Errorf("error checking existing quota plans for year %d: %w", year, err)
		}

		if count == 0 {
			// Insert default quota plan for this year
			_, err = db.Exec(`
				INSERT INTO quota_plans 
				(plan_name, year, quota_vacation_day, quota_medical_expense_baht, created_at, updated_at)
				VALUES 
				($1, $2, $3, $4, $5, $5)`,
				fmt.Sprintf("Default %d", year),
				year,
				10.0,
				20000.0,
				time.Now(),
			)
			if err != nil {
				return fmt.Errorf("failed to insert default quota plan for year %d: %w", year, err)
			}

			// Insert premium quota plan for this year
			_, err = db.Exec(`
				INSERT INTO quota_plans 
				(plan_name, year, quota_vacation_day, quota_medical_expense_baht, created_at, updated_at)
				VALUES 
				($1, $2, $3, $4, $5, $5)`,
				fmt.Sprintf("Premium %d", year),
				year,
				20.0,
				50000.0,
				time.Now(),
			)
			if err != nil {
				return fmt.Errorf("failed to insert premium quota plan for year %d: %w", year, err)
			}

			// Insert basic quota plan for this year
			_, err = db.Exec(`
				INSERT INTO quota_plans 
				(plan_name, year, quota_vacation_day, quota_medical_expense_baht, created_at, updated_at)
				VALUES 
				($1, $2, $3, $4, $5, $5)`,
				fmt.Sprintf("Basic %d", year),
				year,
				5.0,
				10000.0,
				time.Now(),
			)
			if err != nil {
				return fmt.Errorf("failed to insert basic quota plan for year %d: %w", year, err)
			}

			log.Printf("Created default quota plans for year %d", year)
		} else {
			log.Printf("Quota plans for year %d already exist, skipping", year)
		}
	}

	return nil
}

// updateAnnualRecordsTable ensures the annual_records table has a quota_plan_id column
func updateAnnualRecordsTable(db *sql.DB) error {
	// Check if quota_plan_id column exists in annual_records table
	var columnExists bool
	err := db.QueryRow(`
		SELECT EXISTS (
			SELECT 1 
			FROM information_schema.columns 
			WHERE table_name = 'annual_records' AND column_name = 'quota_plan_id'
		)
	`).Scan(&columnExists)

	if err != nil {
		return fmt.Errorf("error checking quota_plan_id column: %w", err)
	}

	if !columnExists {
		// Add quota_plan_id column to annual_records table
		_, err = db.Exec(`
			ALTER TABLE annual_records 
			ADD COLUMN quota_plan_id INTEGER REFERENCES quota_plans(id)
		`)
		if err != nil {
			return fmt.Errorf("failed to add quota_plan_id column to annual_records: %w", err)
		}
		log.Println("Added quota_plan_id column to annual_records table")
	} else {
		log.Println("quota_plan_id column already exists in annual_records table")
	}

	return nil
}
