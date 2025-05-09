package main

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"

	"github.com/gorilla/mux"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/tonk/pkeng-tableg/db/sqlc"
	"github.com/tonk/pkeng-tableg/example/clickup"
)

// TaskResponse is the response format for task data
type TaskResponse struct {
	ID             int32              `json:"id"`
	Url            string             `json:"url,omitempty"`
	TaskCategoryID *int32             `json:"task_category_id,omitempty"`
	Note           string             `json:"note,omitempty"`
	Title          string             `json:"title,omitempty"`
	Status         string             `json:"status,omitempty"`
	StatusColor    string             `json:"status_color,omitempty"`
	CategoryName   string             `json:"category_name,omitempty"`
	CreatedAt      pgtype.Timestamptz `json:"created_at"`
	UpdatedAt      pgtype.Timestamptz `json:"updated_at"`
}

// TaskRequest represents the request body for creating or updating a task
type TaskRequest struct {
	Title          string `json:"title"`
	Note           string `json:"note"`
	TaskCategoryID *int32 `json:"task_category_id"`
	Status         string `json:"status"`
	StatusColor    string `json:"status_color"`
	ClickupListID  string `json:"clickup_list_id,omitempty"` // Only needed for creation
}

// getClickUpClient returns a new ClickUp client
func getClickUpClient() *clickup.Client {
	// Check if we have an OAuth token first
	oauthToken := os.Getenv("CLICKUP_OAUTH_TOKEN")
	if oauthToken != "" {
		log.Printf("Using OAuth token (first %d chars): %s...", min(10, len(oauthToken)), oauthToken[:min(10, len(oauthToken))])
		// Create a client with the OAuth token - add Bearer prefix
		return clickup.NewClient("Bearer " + oauthToken)
	}

	// Fall back to personal API token
	apiToken := os.Getenv("CLICKUP_API_TOKEN")
	if apiToken != "" {
		log.Printf("Using personal API token (first %d chars): %s...", min(10, len(apiToken)), apiToken[:min(10, len(apiToken))])
		return clickup.NewClient(apiToken)
	}

	// No tokens available, use disabled mode
	log.Printf("⚠️ ClickUp integration disabled - tasks will only be created locally")
	log.Printf("To enable, set CLICKUP_OAUTH_TOKEN or CLICKUP_API_TOKEN environment variables")
	return clickup.NewClient("")
}

// min returns the smaller of a or b
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// truncateString safely truncates a string to the specified length
func truncateString(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen]
}

func getTasks(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()

	// Parse pagination parameters
	limit := 50
	offset := 0

	limitParam := r.URL.Query().Get("limit")
	offsetParam := r.URL.Query().Get("offset")

	if limitParam != "" {
		parsedLimit, err := strconv.Atoi(limitParam)
		if err == nil && parsedLimit > 0 {
			limit = parsedLimit
		}
	}

	if offsetParam != "" {
		parsedOffset, err := strconv.Atoi(offsetParam)
		if err == nil && parsedOffset >= 0 {
			offset = parsedOffset
		}
	}

	// Get tasks from database
	tasks, err := database.ListTasks(ctx, sqlc.ListTasksParams{
		Limit:  int32(limit),
		Offset: int32(offset),
	})
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Error fetching tasks: "+err.Error())
		return
	}

	// Convert to response format with category names
	response := make([]TaskResponse, 0, len(tasks))
	for _, task := range tasks {
		resp := convertTaskToResponse(task)

		// If task has a category, fetch its name
		if task.TaskCategoryID.Valid {
			category, err := database.GetTaskCategory(ctx, task.TaskCategoryID.Int32)
			if err == nil {
				resp.CategoryName = category.Name
			}
		}

		response = append(response, resp)
	}

	respondWithJSON(w, http.StatusOK, response)
}

func getTask(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	vars := mux.Vars(r)

	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid task ID")
		return
	}

	task, err := database.GetTask(ctx, int32(id))
	if err != nil {
		respondWithError(w, http.StatusNotFound, "Task not found")
		return
	}

	response := convertTaskToResponse(task)

	// If task has a category, fetch its name
	if task.TaskCategoryID.Valid {
		category, err := database.GetTaskCategory(ctx, task.TaskCategoryID.Int32)
		if err == nil {
			response.CategoryName = category.Name
		}
	}

	respondWithJSON(w, http.StatusOK, response)
}

func createTask(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	var req TaskRequest

	// Debug: Read the request body into a variable so we can log it
	var bodyBytes []byte
	if r.Body != nil {
		bodyBytes, _ = io.ReadAll(r.Body)
		// Restore the body for later use
		r.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
	}

	// Log the raw request body
	println("Raw request body:", string(bodyBytes))

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		println("Error decoding JSON:", err.Error())
		respondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Log the parsed request
	reqJSON, _ := json.Marshal(req)
	println("Parsed request:", string(reqJSON))

	// Validate request
	if req.Title == "" {
		respondWithError(w, http.StatusBadRequest, "Title is required")
		return
	}

	// First, create the task in ClickUp if a list ID is provided
	var clickupTaskURL string
	if req.ClickupListID != "" {
		client := getClickUpClient()

		// Skip ClickUp integration if we're using a dummy client
		if client.APIKey == "" {
			println("Skipping ClickUp task creation (integration disabled)")
		} else {
			println("Creating task in ClickUp with API key:", client.APIKey[:10]+"...")
			println("ClickUp List ID:", req.ClickupListID)

			clickupTask, err := client.CreateTask(clickup.CreateTaskRequest{
				Name:        req.Title,
				Description: req.Note,
				Status:      req.Status,
				ListID:      req.ClickupListID,
			})
			if err != nil {
				println("ClickUp API error:", err.Error())
				respondWithError(w, http.StatusInternalServerError, "Error creating task in ClickUp: "+err.Error())
				return
			}
			clickupTaskURL = clickupTask.URL
			println("Successfully created task in ClickUp, URL:", clickupTaskURL)
		}
	}

	// Prepare database parameters
	params := sqlc.CreateTaskParams{
		Title:       pgtype.Text{String: req.Title, Valid: req.Title != ""},
		Note:        pgtype.Text{String: req.Note, Valid: req.Note != ""},
		Status:      pgtype.Text{String: req.Status, Valid: req.Status != ""},
		StatusColor: pgtype.Text{String: req.StatusColor, Valid: req.StatusColor != ""},
		Url:         pgtype.Text{String: clickupTaskURL, Valid: clickupTaskURL != ""},
	}

	// Set task_category_id if provided
	if req.TaskCategoryID != nil {
		params.TaskCategoryID = pgtype.Int4{Int32: *req.TaskCategoryID, Valid: true}
	}

	// Create task in database
	task, err := database.CreateTask(ctx, params)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Error creating task: "+err.Error())
		return
	}

	response := convertTaskToResponse(task)

	respondWithJSON(w, http.StatusCreated, response)
}

func updateTask(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	vars := mux.Vars(r)

	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid task ID")
		return
	}

	var req TaskRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// First, get the existing task
	existingTask, err := database.GetTask(ctx, int32(id))
	if err != nil {
		respondWithError(w, http.StatusNotFound, "Task not found")
		return
	}

	// If the task has a ClickUp URL, update the task in ClickUp
	if existingTask.Url.Valid && existingTask.Url.String != "" {
		taskID := clickup.ExtractTaskIDFromURL(existingTask.Url.String)
		if taskID != "" {
			client := getClickUpClient()
			updateData := map[string]interface{}{
				"name":        req.Title,
				"description": req.Note,
			}

			if req.Status != "" {
				updateData["status"] = req.Status
			}

			_, err := client.UpdateTask(taskID, updateData)
			if err != nil {
				// Log the error but continue with local update
				// We don't want to block local updates if ClickUp sync fails
			}
		}
	}

	// Prepare database parameters
	params := sqlc.UpdateTaskParams{
		ID:          int32(id),
		Title:       pgtype.Text{String: req.Title, Valid: req.Title != ""},
		Note:        pgtype.Text{String: req.Note, Valid: req.Note != ""},
		Status:      pgtype.Text{String: req.Status, Valid: req.Status != ""},
		StatusColor: pgtype.Text{String: req.StatusColor, Valid: req.StatusColor != ""},
		// Keep the existing URL
		Url: existingTask.Url,
	}

	// Set task_category_id if provided
	if req.TaskCategoryID != nil {
		params.TaskCategoryID = pgtype.Int4{Int32: *req.TaskCategoryID, Valid: true}
	} else {
		params.TaskCategoryID = pgtype.Int4{Valid: false}
	}

	// Update task in database
	task, err := database.UpdateTask(ctx, params)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Error updating task: "+err.Error())
		return
	}

	response := convertTaskToResponse(task)

	respondWithJSON(w, http.StatusOK, response)
}

func deleteTask(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	vars := mux.Vars(r)

	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid task ID")
		return
	}

	// Get the task first to check if it has a ClickUp URL
	task, err := database.GetTask(ctx, int32(id))
	if err == nil && task.Url.Valid && task.Url.String != "" {
		// If we wanted to delete in ClickUp too, we would do it here
		// But ClickUp doesn't support DELETE for tasks, only archiving
		// So we'll just delete locally
	}

	if err := database.DeleteTask(ctx, int32(id)); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Error deleting task: "+err.Error())
		return
	}

	respondWithJSON(w, http.StatusOK, map[string]string{"result": "success"})
}

func getTasksByCategory(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	vars := mux.Vars(r)

	categoryID, err := strconv.Atoi(vars["category_id"])
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid category ID")
		return
	}

	// Check if the category exists
	_, err = database.GetTaskCategory(ctx, int32(categoryID))
	if err != nil {
		respondWithError(w, http.StatusNotFound, "Category not found")
		return
	}

	// Get tasks by category including all subcategories in a single query
	tasks, err := database.ListTasksByCategoryWithSubcategories(ctx, int32(categoryID))
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Error fetching tasks: "+err.Error())
		return
	}

	// Get all categories to map IDs to names
	allCategories, err := database.ListTaskCategories(ctx, sqlc.ListTaskCategoriesParams{})
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Error fetching categories: "+err.Error())
		return
	}

	// Create a map of category IDs to names
	categoryMap := make(map[int32]string)
	for _, cat := range allCategories {
		categoryMap[cat.ID] = cat.Name
	}

	// Convert to response format with category name
	response := make([]TaskResponse, 0, len(tasks))
	for _, task := range tasks {
		resp := convertTaskToResponse(task)

		// Set the category name
		if task.TaskCategoryID.Valid {
			if name, ok := categoryMap[task.TaskCategoryID.Int32]; ok {
				resp.CategoryName = name
			}
		}

		response = append(response, resp)
	}

	respondWithJSON(w, http.StatusOK, response)
}

// Helper function to convert a task to a response
func convertTaskToResponse(task sqlc.Task) TaskResponse {
	var taskCategoryID *int32
	if task.TaskCategoryID.Valid {
		taskCategoryID = &task.TaskCategoryID.Int32
	}

	return TaskResponse{
		ID:             task.ID,
		Url:            task.Url.String,
		TaskCategoryID: taskCategoryID,
		Note:           task.Note.String,
		Title:          task.Title.String,
		Status:         task.Status.String,
		StatusColor:    task.StatusColor.String,
		CreatedAt:      task.CreatedAt,
		UpdatedAt:      task.UpdatedAt,
	}
}
