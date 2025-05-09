package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/tonk/pkeng-tableg/example/clickup"
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

// initiateOAuthHandler starts the OAuth flow by redirecting to ClickUp
func initiateOAuthHandler(w http.ResponseWriter, r *http.Request) {
	log.Printf("OAuth initiation started")

	// Generate a random state parameter
	state := fmt.Sprintf("%d", time.Now().UnixNano())

	// Store the state in our in-memory store (use database in production)
	oauthStates[state] = OAuthState{
		State:     state,
		CreatedAt: time.Now(),
	}

	log.Printf("Generated OAuth state: %s", state)

	// Get the authorization URL
	oauthClient := getOAuthClient()
	authURL := oauthClient.GetAuthorizationURL(state)

	log.Printf("Redirecting user to ClickUp authorization URL: %s", authURL)

	// Redirect the user to ClickUp's authorization page
	http.Redirect(w, r, authURL, http.StatusFound)
}

// oauthCallbackHandler handles the callback from ClickUp after authorization
func oauthCallbackHandler(w http.ResponseWriter, r *http.Request) {
	log.Printf("OAuth callback received with parameters: %s", r.URL.RawQuery)

	// Extract the state and code from the query parameters
	state := r.URL.Query().Get("state")
	code := r.URL.Query().Get("code")
	errorParam := r.URL.Query().Get("error")

	if errorParam != "" {
		log.Printf("ClickUp authorization error: %s", errorParam)
		http.Error(w, "Authorization failed: "+errorParam, http.StatusBadRequest)
		return
	}

	if code == "" {
		log.Printf("No authorization code received")
		http.Error(w, "No authorization code received from ClickUp", http.StatusBadRequest)
		return
	}

	log.Printf("Received authorization code: %s with state: %s", code, state)

	// Validate the state parameter
	storedState, exists := oauthStates[state]
	if !exists {
		log.Printf("Invalid OAuth state: %s, not found in stored states", state)
		http.Error(w, "Invalid OAuth state", http.StatusBadRequest)
		return
	}

	// Clean up the state from our store
	delete(oauthStates, state)
	log.Printf("State %s validated and removed from store", state)

	// Check if the state has expired (30 minutes)
	if time.Since(storedState.CreatedAt) > 30*time.Minute {
		log.Printf("OAuth state expired: %s, created at: %v", state, storedState.CreatedAt)
		http.Error(w, "OAuth state expired, please try again", http.StatusBadRequest)
		return
	}

	// Exchange the code for an access token
	log.Printf("Exchanging code for access token...")
	oauthClient := getOAuthClient()
	tokenResp, err := oauthClient.ExchangeCodeForToken(code)
	if err != nil {
		log.Printf("Failed to exchange code for token: %v", err)
		http.Error(w, "Failed to exchange code for token: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Store the token for future use (in a real app, save this securely in a database)
	oauthToken = tokenResp.AccessToken
	log.Printf("Successfully obtained and stored OAuth token")

	// Set environment variable for other parts of the application to use
	os.Setenv("CLICKUP_OAUTH_TOKEN", tokenResp.AccessToken)
	log.Printf("Set CLICKUP_OAUTH_TOKEN environment variable")

	// Prepare the response to show the user
	responseData := map[string]interface{}{
		"access_token": tokenResp.AccessToken[:10] + "...", // Don't show the full token for security
		"message":      "Authorization successful! You can now use ClickUp integration.",
		"success":      true,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(responseData)
	log.Printf("OAuth callback completed successfully")
}

// getCurrentTokenHandler returns the current OAuth token if available
func getCurrentTokenHandler(w http.ResponseWriter, r *http.Request) {
	log.Printf("getCurrentTokenHandler called")

	// Check if we have a token in memory
	token := oauthToken

	// If not in memory, check environment variable
	if token == "" {
		token = os.Getenv("CLICKUP_OAUTH_TOKEN")
		log.Printf("Checking environment for CLICKUP_OAUTH_TOKEN")
	}

	if token == "" {
		// No token found, return appropriate response
		log.Printf("No OAuth token available")
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"has_token": false,
			"message":   "No OAuth token available. Please authorize with ClickUp.",
		})
		return
	}

	// Token found, return info about it (don't include the full token)
	log.Printf("OAuth token is available (starting with: %s...)", token[:Min(len(token), 10)])
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"has_token": true,
		"message":   "OAuth token is available.",
	})
}

// Min returns the smaller of x or y
func Min(x, y int) int {
	if x < y {
		return x
	}
	return y
}
