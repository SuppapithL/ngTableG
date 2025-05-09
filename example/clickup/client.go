package clickup

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// Client is a ClickUp API client
type Client struct {
	APIKey     string
	BaseURL    string
	HTTPClient *http.Client
	TokenType  string // "personal" or "oauth"
}

// ClickUpTask represents a task in ClickUp
type ClickUpTask struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Status      Status    `json:"status"`
	URL         string    `json:"url"`
	DateCreated time.Time `json:"date_created"`
	DateUpdated time.Time `json:"date_updated"`
	ListID      string    `json:"list_id"`
	FolderID    string    `json:"folder_id"`
	SpaceID     string    `json:"space_id"`
}

// Status represents a task status in ClickUp
type Status struct {
	Status     string `json:"status"`
	Color      string `json:"color"`
	Type       string `json:"type"`
	Orderindex int    `json:"orderindex"`
}

// CreateTaskRequest is the request body for creating a task
type CreateTaskRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Status      string `json:"status,omitempty"`
	ListID      string `json:"list_id"`
}

// NewClient creates a new ClickUp API client
func NewClient(apiKey string) *Client {
	// Detect token type based on prefix
	tokenType := "personal"
	if strings.HasPrefix(apiKey, "Bearer ") || strings.HasPrefix(apiKey, "bearer ") {
		tokenType = "oauth"
		// Remove Bearer prefix if it's included
		apiKey = strings.TrimPrefix(strings.TrimPrefix(apiKey, "Bearer "), "bearer ")
	}

	return &Client{
		APIKey:  apiKey,
		BaseURL: "https://api.clickup.com/api/v2",
		HTTPClient: &http.Client{
			Timeout: time.Second * 30,
		},
		TokenType: tokenType,
	}
}

// setAuthHeader sets the appropriate Authorization header based on token type
func (c *Client) setAuthHeader(req *http.Request) {
	if c.TokenType == "oauth" {
		req.Header.Set("Authorization", "Bearer "+c.APIKey)
	} else {
		req.Header.Set("Authorization", c.APIKey)
	}
}

// CreateTask creates a new task in ClickUp
func (c *Client) CreateTask(req CreateTaskRequest) (*ClickUpTask, error) {
	// If APIKey is empty, we're in disabled mode - just return a fake success
	if c.APIKey == "" {
		// Return a dummy successful response
		return &ClickUpTask{
			ID:          "disabled-123",
			Name:        req.Name,
			Description: req.Description,
			Status: Status{
				Status: "To Do",
				Color:  "#d3d3d3",
			},
			URL:         "https://app.clickup.com/disabled-integration",
			DateCreated: time.Now(),
			DateUpdated: time.Now(),
			ListID:      req.ListID,
		}, nil
	}

	url := fmt.Sprintf("%s/list/%s/task", c.BaseURL, req.ListID)

	jsonBody, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	httpReq, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonBody))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	c.setAuthHeader(httpReq)
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := c.HTTPClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("clickup API returned error: %s", string(body))
	}

	var response struct {
		Task ClickUpTask `json:"task"`
	}

	if err := json.Unmarshal(body, &response); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %w", err)
	}

	return &response.Task, nil
}

// GetTask retrieves a task from ClickUp by ID
func (c *Client) GetTask(taskID string) (*ClickUpTask, error) {
	// If APIKey is empty, we're in disabled mode - just return a fake success
	if c.APIKey == "" {
		// Return a dummy successful response
		return &ClickUpTask{
			ID:          taskID,
			Name:        "Disabled Task",
			Description: "This is a placeholder task as ClickUp integration is disabled",
			Status: Status{
				Status: "To Do",
				Color:  "#d3d3d3",
			},
			URL:         "https://app.clickup.com/disabled-integration",
			DateCreated: time.Now(),
			DateUpdated: time.Now(),
		}, nil
	}

	url := fmt.Sprintf("%s/task/%s", c.BaseURL, taskID)

	httpReq, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	c.setAuthHeader(httpReq)

	resp, err := c.HTTPClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("clickup API returned error: %s", string(body))
	}

	var task ClickUpTask
	if err := json.Unmarshal(body, &task); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %w", err)
	}

	return &task, nil
}

// UpdateTask updates a task in ClickUp
func (c *Client) UpdateTask(taskID string, req map[string]interface{}) (*ClickUpTask, error) {
	// If APIKey is empty, we're in disabled mode - just return a fake success
	if c.APIKey == "" {
		// Return a dummy successful response
		name := "Updated Task"
		if n, ok := req["name"].(string); ok {
			name = n
		}

		desc := "This is a placeholder task as ClickUp integration is disabled"
		if d, ok := req["description"].(string); ok {
			desc = d
		}

		return &ClickUpTask{
			ID:          taskID,
			Name:        name,
			Description: desc,
			Status: Status{
				Status: "To Do",
				Color:  "#d3d3d3",
			},
			URL:         "https://app.clickup.com/disabled-integration",
			DateCreated: time.Now(),
			DateUpdated: time.Now(),
		}, nil
	}

	url := fmt.Sprintf("%s/task/%s", c.BaseURL, taskID)

	jsonBody, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	httpReq, err := http.NewRequest("PUT", url, bytes.NewBuffer(jsonBody))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	c.setAuthHeader(httpReq)
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := c.HTTPClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("clickup API returned error: %s", string(body))
	}

	var task ClickUpTask
	if err := json.Unmarshal(body, &task); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %w", err)
	}

	return &task, nil
}

// ExtractTaskIDFromURL extracts the task ID from a ClickUp task URL
func ExtractTaskIDFromURL(url string) string {
	// Expected format: https://app.clickup.com/t/abc123
	parts := strings.Split(url, "/t/")
	if len(parts) != 2 {
		return ""
	}
	return parts[1]
}
