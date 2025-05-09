package clickup

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// OAuthConfig holds the OAuth configuration
type OAuthConfig struct {
	ClientID     string
	ClientSecret string
	RedirectURI  string
}

// TokenResponse holds the response from the token endpoint
type TokenResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
}

// OAuth2Client is a client for ClickUp's OAuth2 API
type OAuth2Client struct {
	Config     OAuthConfig
	HTTPClient *http.Client
}

// NewOAuth2Client creates a new OAuth2 client
func NewOAuth2Client(config OAuthConfig) *OAuth2Client {
	return &OAuth2Client{
		Config: config,
		HTTPClient: &http.Client{
			Timeout: time.Second * 30,
		},
	}
}

// GetAuthorizationURL returns the URL to redirect the user to for authorization
func (c *OAuth2Client) GetAuthorizationURL(state string) string {
	// ClickUp requires app.clickup.com for the authorization URL (browser flow)
	baseURL := "https://app.clickup.com/api/v2/oauth/authorize"

	params := url.Values{}
	params.Add("client_id", c.Config.ClientID)
	params.Add("redirect_uri", c.Config.RedirectURI)
	params.Add("response_type", "code")

	if state != "" {
		params.Add("state", state)
	}

	authURL := baseURL + "?" + params.Encode()
	log.Printf("Generated ClickUp authorization URL: %s", authURL)
	return authURL
}

// ExchangeCodeForToken exchanges an authorization code for an access token
func (c *OAuth2Client) ExchangeCodeForToken(code string) (*TokenResponse, error) {
	// ClickUp requires api.clickup.com for API requests
	tokenURL := "https://api.clickup.com/api/v2/oauth/token"

	data := url.Values{}
	data.Set("client_id", c.Config.ClientID)
	data.Set("client_secret", c.Config.ClientSecret)
	data.Set("code", code)
	data.Set("grant_type", "authorization_code")

	log.Printf("Exchanging code for token with ClickUp API at: %s", tokenURL)
	log.Printf("Using client_id: %s", c.Config.ClientID)
	log.Printf("Using redirect_uri: %s", c.Config.RedirectURI)

	req, err := http.NewRequest("POST", tokenURL, strings.NewReader(data.Encode()))
	if err != nil {
		log.Printf("Error creating token request: %v", err)
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Add("Content-Type", "application/x-www-form-urlencoded")

	log.Printf("Sending token request to ClickUp API...")
	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		log.Printf("Error sending token request: %v", err)
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("Error reading response body: %v", err)
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	log.Printf("ClickUp API response status: %d", resp.StatusCode)
	log.Printf("ClickUp API response body: %s", string(body))

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("ClickUp API returned error: %s", string(body))
	}

	var tokenResp TokenResponse
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		log.Printf("Error unmarshaling token response: %v", err)
		return nil, fmt.Errorf("failed to unmarshal token response: %w", err)
	}

	log.Printf("Successfully obtained ClickUp OAuth token")
	return &tokenResp, nil
}

// GetClientFromToken creates a ClickUp client using the provided access token
func GetClientFromToken(accessToken string) *Client {
	return &Client{
		APIKey:  accessToken,
		BaseURL: "https://api.clickup.com/api/v2",
		HTTPClient: &http.Client{
			Timeout: time.Second * 30,
		},
		TokenType: "oauth", // Set the token type to OAuth
	}
}
