package main

import (
	"context"
	"fmt"
	"log"

	"github.com/kengtableg/pkeng-tableg/db"
	"github.com/kengtableg/pkeng-tableg/db/sqlc"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	// Connect to database
	database, err := db.New()
	if err != nil {
		log.Fatalf("Error connecting to database: %v", err)
	}
	defer database.Close()

	ctx := context.Background()

	// Get the HR user
	user, err := database.GetUserByUsername(ctx, "The_HR")
	if err != nil {
		log.Fatalf("Error getting HR user: %v", err)
	}

	// Generate hashed password
	password := "Suppapith2"
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		log.Fatalf("Error hashing password: %v", err)
	}

	// Update the user's password
	updatedUser, err := database.UpdateUser(ctx, sqlc.UpdateUserParams{
		ID:       user.ID,
		Username: user.Username,
		Password: string(hashedPassword),
		UserType: user.UserType,
		Email:    user.Email,
	})
	if err != nil {
		log.Fatalf("Error updating HR user: %v", err)
	}

	fmt.Printf("HR user password updated successfully for: %s\n", updatedUser.Username)
}
