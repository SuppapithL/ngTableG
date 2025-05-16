package main

import (
	"log"
	"net/http"
	"os"
	"time"

	"github.com/kengtableg/pkeng-tableg/example/clickup"
)

// OAuthState represents a session state for OAuth
type OAuthState struct {
	State     string    `json:"state"`
	CreatedAt time.Time `json:"created_at"`
}

var (
	// In-memory store of active OAuth states (in a real app, use a database)
	oauthStates = make(map[string]OAuthState)
	// In-memory store for the OAuth token (in a real app, use a database or secure storage)
	oauthToken string
)

// getOAuthClient returns a configured OAuth client
func getOAuthClient() *clickup.OAuth2Client {
	clientID := os.Getenv("CLICKUP_CLIENT_ID")
	clientSecret := os.Getenv("CLICKUP_CLIENT_SECRET")
	redirectURI := os.Getenv("CLICKUP_REDIRECT_URI")

	// Use defaults if environment variables aren't set
	if clientID == "" {
		clientID = "P3497LBAUFF512Q0G9WFEXSQDVSZ4P8N"
	}
	if clientSecret == "" {
		clientSecret = "2YLZYNP2P7PZXGD70SJDIZFWIW9KLK5EX6T2PEVFLXDOXEXW9DDTZEVOZ16EETBK"
	}
	if redirectURI == "" {
		// Default to localhost for development - must match exactly what's in ClickUp
		redirectURI = "http://localhost:8080/api/oauth/callback"
	}

	log.Printf("ClickUp OAuth initialized with client_id: %s, redirect_uri: %s", clientID, redirectURI)

	config := clickup.OAuthConfig{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		RedirectURI:  redirectURI,
	}

	return clickup.NewOAuth2Client(config)
}

// Temporary placeholder handlers to satisfy the router
func initiateOAuthHandler(w http.ResponseWriter, r *http.Request) {
	log.Printf("initiateOAuthHandler called, but not implemented")
	respondWithJSON(w, http.StatusOK, map[string]string{"status": "OAuth flow initiated"})
}

func oauthCallbackHandler(w http.ResponseWriter, r *http.Request) {
	log.Printf("oauthCallbackHandler called, but not implemented")
	respondWithJSON(w, http.StatusOK, map[string]string{"status": "OAuth callback received"})
}

func getCurrentTokenHandler(w http.ResponseWriter, r *http.Request) {
	log.Printf("getCurrentTokenHandler called, but not implemented")
	respondWithJSON(w, http.StatusOK, map[string]string{"token": "dummy-token"})
}

// Min returns the smaller of x or y
func Min(x, y int) int {
	if x < y {
		return x
	}
	return y
}
