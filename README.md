# P'Keng TableG

This project uses PostgreSQL and SQLC to generate type-safe Go code for database operations.

## Project Structure

```
.
├── db
│   ├── db.go               # Database connection code
│   ├── schema              # SQL schema definitions
│   │   └── schema.sql      # Database tables DDL
│   ├── query               # SQL queries for SQLC
│   │   ├── user.sql
│   │   ├── annual_record.sql
│   │   ├── holiday.sql
│   │   ├── task_category.sql
│   │   ├── task.sql
│   │   ├── task_estimate.sql
│   │   ├── task_log.sql
│   │   ├── medical_expense.sql
│   │   └── leave_log.sql
│   └── sqlc                # Generated Go code by SQLC
├── sqlc.yaml               # SQLC configuration
└── .env                    # Environment variables
```

## Setup

1. Create a PostgreSQL database:

```sql
CREATE DATABASE file_manager;
```

2. Create a `.env` file with your database connection string:

```
DATABASE_URL="postgres://postgres:Suppapith2@localhost:5432/file_manager?sslmode=disable"
```

3. Create the database schema:

```bash
psql -U postgres -d file_manager -f db/schema/schema.sql
```

## Generating SQLC Code

Install SQLC:

```bash
go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest
```

Generate Go code from SQL queries:

```bash
sqlc generate
```

## Dependencies

Install required Go dependencies:

```bash
go mod init github.com/yourusername/pkeng-tableg
go get github.com/jackc/pgx/v5
go get github.com/joho/godotenv
```

## Usage Example

```go
package main

import (
	"context"
	"fmt"
	"log"

	"github.com/yourusername/pkeng-tableg/db"
)

func main() {
	// Connect to database
	database, err := db.New()
	if err != nil {
		log.Fatalf("Error connecting to database: %v", err)
	}
	defer database.Close()

	// Create a new user
	ctx := context.Background()
	user, err := database.Queries.CreateUser(ctx, db.CreateUserParams{
		Username: "newuser",
		Password: "$2b$10$hashedpassword",
		UserType: "user",
		Email:    "newuser@example.com",
	})
	if err != nil {
		log.Fatalf("Error creating user: %v", err)
	}

	fmt.Printf("Created user: %+v\n", user)
} 