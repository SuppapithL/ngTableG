package main

import (
	"context"
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/kengtableg/pkeng-tableg/db"
	"github.com/kengtableg/pkeng-tableg/db/sqlc"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Println("Usage: go run db/dbtools/main.go [check|migrate|create-quotas]")
		os.Exit(1)
	}

	command := os.Args[1]

	switch command {
	case "check":
		checkDatabaseStructure()
	case "migrate":
		runMigration()
	case "create-quotas":
		createDefaultQuotas()
	default:
		fmt.Printf("Unknown command: %s\n", command)
		fmt.Println("Usage: go run db/dbtools/main.go [check|migrate|create-quotas]")
		os.Exit(1)
	}
}

func checkDatabaseStructure() {
	// Connect to database
	database, err := db.New()
	if err != nil {
		log.Fatalf("Error connecting to database: %v", err)
	}
	defer database.Close()

	ctx := context.Background()

	// Check if the quota_plans table exists
	var exists bool
	err = database.Pool.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT FROM information_schema.tables 
			WHERE table_schema = 'public' 
			AND table_name = 'quota_plans'
		)
	`).Scan(&exists)

	if err != nil {
		log.Fatalf("Error checking if quota_plans table exists: %v", err)
	}

	if exists {
		fmt.Println("The quota_plans table exists in the database.")

		// Check if there are any records in the quota_plans table
		var count int
		err = database.Pool.QueryRow(ctx, "SELECT COUNT(*) FROM quota_plans").Scan(&count)
		if err != nil {
			log.Fatalf("Error counting quota plans: %v", err)
		}
		fmt.Printf("There are %d records in the quota_plans table.\n", count)
	} else {
		fmt.Println("The quota_plans table does NOT exist in the database.")
	}

	// Check if annual_records has quota_plan_id column
	err = database.Pool.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT FROM information_schema.columns 
			WHERE table_schema = 'public' 
			AND table_name = 'annual_records'
			AND column_name = 'quota_plan_id'
		)
	`).Scan(&exists)

	if err != nil {
		log.Fatalf("Error checking if quota_plan_id column exists: %v", err)
	}

	if exists {
		fmt.Println("The annual_records table has a quota_plan_id column.")
	} else {
		fmt.Println("The annual_records table does NOT have a quota_plan_id column.")
	}

	// Check if annual_records still has the old quota columns
	var hasQuotaVacationDay, hasQuotaMedicalExpenseBaht bool

	database.Pool.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT FROM information_schema.columns 
			WHERE table_schema = 'public' 
			AND table_name = 'annual_records'
			AND column_name = 'quota_vacation_day'
		)
	`).Scan(&hasQuotaVacationDay)

	database.Pool.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT FROM information_schema.columns 
			WHERE table_schema = 'public' 
			AND table_name = 'annual_records'
			AND column_name = 'quota_medical_expense_baht'
		)
	`).Scan(&hasQuotaMedicalExpenseBaht)

	if hasQuotaVacationDay {
		fmt.Println("The annual_records table still has the quota_vacation_day column.")
	}

	if hasQuotaMedicalExpenseBaht {
		fmt.Println("The annual_records table still has the quota_medical_expense_baht column.")
	}
}

func runMigration() {
	// Connect to database
	database, err := db.New()
	if err != nil {
		log.Fatalf("Error connecting to database: %v", err)
	}
	defer database.Close()

	// Read the migration script
	migrationPath := filepath.Join("db", "migrations", "migrate_to_quota_plans.sql")
	migrationSQL, err := ioutil.ReadFile(migrationPath)
	if err != nil {
		log.Fatalf("Error reading migration file: %v", err)
	}

	fmt.Printf("Running migration from file: %s\n", migrationPath)
	fmt.Println("Migration SQL:")
	fmt.Println(string(migrationSQL))

	// Execute the migration script
	ctx := context.Background()
	_, err = database.Pool.Exec(ctx, string(migrationSQL))
	if err != nil {
		log.Fatalf("Error executing migration: %v", err)
	}

	fmt.Println("Migration completed successfully!")

	// Verify the migration
	checkDatabaseStructure()
}

func createDefaultQuotas() {
	// Connect to database
	database, err := db.New()
	if err != nil {
		log.Fatalf("Error connecting to database: %v", err)
	}
	defer database.Close()

	ctx := context.Background()

	// Create default quota plans for current year and next year
	currentYear := time.Now().Year()
	years := []int{currentYear, currentYear + 1}

	for _, year := range years {
		// Check if plans already exist for this year
		plans, err := database.ListQuotaPlansByYear(ctx, int32(year))
		if err == nil && len(plans) > 0 {
			fmt.Printf("Quota plans for year %d already exist. Skipping creation.\n", year)
			continue
		}

		// Helper function to create Numeric from float
		createNumeric := func(val float64) pgtype.Numeric {
			var num pgtype.Numeric
			num.Valid = true
			// Convert float to string and then scan into numeric
			num.Scan(strconv.FormatFloat(val, 'f', 2, 64))
			return num
		}

		// Default plan (10 vacation days, 20000 baht medical)
		defaultPlan, err := database.CreateQuotaPlan(ctx, sqlc.CreateQuotaPlanParams{
			PlanName:                "Default",
			Year:                    int32(year),
			QuotaVacationDay:        createNumeric(10),
			QuotaMedicalExpenseBaht: createNumeric(20000),
		})

		if err != nil {
			log.Printf("Error creating default plan for year %d: %v", year, err)
		} else {
			fmt.Printf("Created default quota plan for year %d: ID %d\n", year, defaultPlan.ID)
		}

		// Standard plan (15 vacation days, 30000 baht medical)
		standardPlan, err := database.CreateQuotaPlan(ctx, sqlc.CreateQuotaPlanParams{
			PlanName:                "Standard",
			Year:                    int32(year),
			QuotaVacationDay:        createNumeric(15),
			QuotaMedicalExpenseBaht: createNumeric(30000),
		})

		if err != nil {
			log.Printf("Error creating standard plan for year %d: %v", year, err)
		} else {
			fmt.Printf("Created standard quota plan for year %d: ID %d\n", year, standardPlan.ID)
		}

		// Executive plan (20 vacation days, 50000 baht medical)
		execPlan, err := database.CreateQuotaPlan(ctx, sqlc.CreateQuotaPlanParams{
			PlanName:                "Executive",
			Year:                    int32(year),
			QuotaVacationDay:        createNumeric(20),
			QuotaMedicalExpenseBaht: createNumeric(50000),
		})

		if err != nil {
			log.Printf("Error creating executive plan for year %d: %v", year, err)
		} else {
			fmt.Printf("Created executive quota plan for year %d: ID %d\n", year, execPlan.ID)
		}
	}

	// List all quota plans to verify using direct SQL query
	rows, err := database.Pool.Query(ctx, `
		SELECT id, plan_name, year, 
		       quota_vacation_day::float AS vacation_days,
		       quota_medical_expense_baht::float AS medical_expense
		FROM quota_plans
		ORDER BY year DESC, plan_name
	`)
	if err != nil {
		log.Fatalf("Error listing quota plans: %v", err)
	}
	defer rows.Close()

	fmt.Println("\nAll Quota Plans:")
	fmt.Println("ID\tPlan Name\tYear\tVacation Days\tMedical Expense (฿)")
	fmt.Println("--\t---------\t----\t-------------\t--------------------")

	for rows.Next() {
		var id int32
		var planName string
		var year int32
		var vacationDays float64
		var medicalExpense float64

		if err := rows.Scan(&id, &planName, &year, &vacationDays, &medicalExpense); err != nil {
			log.Printf("Error scanning row: %v", err)
			continue
		}

		fmt.Printf("%d\t%s\t%d\t%.1f\t\t%.2f\n",
			id, planName, year, vacationDays, medicalExpense)
	}

	// Assign default quota plans to annual records with NULL quota_plan_id
	result, err := database.Pool.Exec(ctx, `
		UPDATE annual_records ar
		SET quota_plan_id = qp.id
		FROM quota_plans qp
		WHERE ar.year = qp.year 
		AND qp.plan_name = 'Default'
		AND ar.quota_plan_id IS NULL
	`)

	if err != nil {
		log.Fatalf("Error assigning default quota plans: %v", err)
	}

	rowsAffected := result.RowsAffected()
	fmt.Printf("\nAssigned default quota plan to %d annual records\n", rowsAffected)
}
