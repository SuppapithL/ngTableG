package main

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/kengtableg/pkeng-tableg/db/sqlc"
)

// TaskEstimateResponse is the response format for task estimate data
type TaskEstimateResponse struct {
	ID              int32              `json:"id"`
	TaskID          int32              `json:"task_id"`
	EstimateDay     float64            `json:"estimate_day"`
	Note            string             `json:"note,omitempty"`
	CreatedByUserID int32              `json:"created_by_user_id"`
	CreatedAt       pgtype.Timestamptz `json:"created_at"`
	Username        string             `json:"username,omitempty"`   // Added for response only
	TaskTitle       string             `json:"task_title,omitempty"` // Added for response only
}

// TaskEstimateRequest represents the request body for creating a task estimate
type TaskEstimateRequest struct {
	TaskID      int32   `json:"task_id"`
	EstimateDay float64 `json:"estimate_day"`
	Note        string  `json:"note"`
}

func getTaskEstimates(w http.ResponseWriter, r *http.Request) {
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

	// Get user from request to use for filtering
	currentUser, err := getCurrentUserFromRequest(r)
	if err != nil {
		respondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get task estimates from database for this user
	estimates, err := database.ListTaskEstimatesByUser(ctx, sqlc.ListTaskEstimatesByUserParams{
		CreatedByUserID: currentUser.ID,
		Limit:           int32(limit),
		Offset:          int32(offset),
	})
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Error fetching task estimates: "+err.Error())
		return
	}

	// Convert to response format with enriched data
	response := make([]TaskEstimateResponse, 0, len(estimates))
	for _, estimate := range estimates {
		// Convert numeric to float64
		estimateDay, _ := estimate.EstimateDay.Float64Value()
		estimateDayValue := float64(0)
		if estimateDay.Valid {
			estimateDayValue = estimateDay.Float64
		}

		resp := TaskEstimateResponse{
			ID:              estimate.ID,
			TaskID:          estimate.TaskID,
			EstimateDay:     estimateDayValue,
			Note:            estimate.Note.String,
			CreatedByUserID: estimate.CreatedByUserID,
			CreatedAt:       estimate.CreatedAt,
			Username:        currentUser.Username, // Set the current user's username
		}

		// Get task info to enrich the response
		task, err := database.GetTask(ctx, estimate.TaskID)
		if err == nil && task.Title.Valid {
			resp.TaskTitle = task.Title.String
		}

		response = append(response, resp)
	}

	respondWithJSON(w, http.StatusOK, response)
}

func getTaskEstimate(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	vars := mux.Vars(r)

	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid task estimate ID")
		return
	}

	estimate, err := database.GetTaskEstimate(ctx, int32(id))
	if err != nil {
		respondWithError(w, http.StatusNotFound, "Task estimate not found")
		return
	}

	// Get user who created this estimate
	user, err := database.GetUser(ctx, estimate.CreatedByUserID)
	if err != nil {
		// Continue even if we can't get the user
		user = sqlc.User{
			Username: "Unknown",
		}
	}

	// Get task info
	task, err := database.GetTask(ctx, estimate.TaskID)
	taskTitle := ""
	if err == nil && task.Title.Valid {
		taskTitle = task.Title.String
	}

	// Convert numeric to float64
	estimateDay, _ := estimate.EstimateDay.Float64Value()
	estimateDayValue := float64(0)
	if estimateDay.Valid {
		estimateDayValue = estimateDay.Float64
	}

	response := TaskEstimateResponse{
		ID:              estimate.ID,
		TaskID:          estimate.TaskID,
		EstimateDay:     estimateDayValue,
		Note:            estimate.Note.String,
		CreatedByUserID: estimate.CreatedByUserID,
		CreatedAt:       estimate.CreatedAt,
		Username:        user.Username,
		TaskTitle:       taskTitle,
	}

	respondWithJSON(w, http.StatusOK, response)
}

func createTaskEstimate(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	var req TaskEstimateRequest

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Get current user
	currentUser, err := getCurrentUserFromRequest(r)
	if err != nil {
		respondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Validate request
	if req.EstimateDay <= 0 {
		respondWithError(w, http.StatusBadRequest, "Estimate day must be positive")
		return
	}

	// Check if task exists
	_, err = database.GetTask(ctx, req.TaskID)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Task not found")
		return
	}

	// Prepare numeric value
	estimateDay := pgtype.Numeric{}
	estimateDay.Valid = true
	estimateDay.Scan(strconv.FormatFloat(req.EstimateDay, 'f', -1, 64))

	// Create task estimate in database
	params := sqlc.CreateTaskEstimateParams{
		TaskID:          req.TaskID,
		EstimateDay:     estimateDay,
		Note:            pgtype.Text{String: req.Note, Valid: req.Note != ""},
		CreatedByUserID: currentUser.ID,
	}

	estimate, err := database.CreateTaskEstimate(ctx, params)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Error creating task estimate: "+err.Error())
		return
	}

	// Convert numeric to float64 for response
	estimateDayValue, _ := estimate.EstimateDay.Float64Value()
	estimateDayFloat := float64(0)
	if estimateDayValue.Valid {
		estimateDayFloat = estimateDayValue.Float64
	}

	response := TaskEstimateResponse{
		ID:              estimate.ID,
		TaskID:          estimate.TaskID,
		EstimateDay:     estimateDayFloat,
		Note:            estimate.Note.String,
		CreatedByUserID: estimate.CreatedByUserID,
		CreatedAt:       estimate.CreatedAt,
		Username:        currentUser.Username,
	}

	respondWithJSON(w, http.StatusCreated, response)
}

func updateTaskEstimate(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	vars := mux.Vars(r)

	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid task estimate ID")
		return
	}

	var req TaskEstimateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Get current user
	currentUser, err := getCurrentUserFromRequest(r)
	if err != nil {
		respondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Check if estimate exists and belongs to current user
	existingEstimate, err := database.GetTaskEstimate(ctx, int32(id))
	if err != nil {
		respondWithError(w, http.StatusNotFound, "Task estimate not found")
		return
	}

	if existingEstimate.CreatedByUserID != currentUser.ID {
		respondWithError(w, http.StatusForbidden, "You can only update your own estimates")
		return
	}

	// Validate request
	if req.EstimateDay <= 0 {
		respondWithError(w, http.StatusBadRequest, "Estimate day must be positive")
		return
	}

	// Prepare numeric value
	estimateDay := pgtype.Numeric{}
	estimateDay.Valid = true
	estimateDay.Scan(strconv.FormatFloat(req.EstimateDay, 'f', -1, 64))

	// Update task estimate in database
	params := sqlc.UpdateTaskEstimateParams{
		ID:          int32(id),
		EstimateDay: estimateDay,
		Note:        pgtype.Text{String: req.Note, Valid: req.Note != ""},
	}

	estimate, err := database.UpdateTaskEstimate(ctx, params)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Error updating task estimate: "+err.Error())
		return
	}

	// Convert numeric to float64 for response
	estimateDayValue, _ := estimate.EstimateDay.Float64Value()
	estimateDayFloat := float64(0)
	if estimateDayValue.Valid {
		estimateDayFloat = estimateDayValue.Float64
	}

	response := TaskEstimateResponse{
		ID:              estimate.ID,
		TaskID:          estimate.TaskID,
		EstimateDay:     estimateDayFloat,
		Note:            estimate.Note.String,
		CreatedByUserID: estimate.CreatedByUserID,
		CreatedAt:       estimate.CreatedAt,
		Username:        currentUser.Username,
	}

	respondWithJSON(w, http.StatusOK, response)
}

func deleteTaskEstimate(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	vars := mux.Vars(r)

	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid task estimate ID")
		return
	}

	// Get current user
	currentUser, err := getCurrentUserFromRequest(r)
	if err != nil {
		respondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Check if estimate exists and belongs to current user
	existingEstimate, err := database.GetTaskEstimate(ctx, int32(id))
	if err != nil {
		respondWithError(w, http.StatusNotFound, "Task estimate not found")
		return
	}

	if existingEstimate.CreatedByUserID != currentUser.ID {
		respondWithError(w, http.StatusForbidden, "You can only delete your own estimates")
		return
	}

	if err := database.DeleteTaskEstimate(ctx, int32(id)); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Error deleting task estimate: "+err.Error())
		return
	}

	respondWithJSON(w, http.StatusOK, map[string]string{"result": "success"})
}

func getTaskEstimatesByTask(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	vars := mux.Vars(r)

	taskID, err := strconv.Atoi(vars["task_id"])
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid task ID")
		return
	}

	// Check if task exists
	task, err := database.GetTask(ctx, int32(taskID))
	if err != nil {
		respondWithError(w, http.StatusNotFound, "Task not found")
		return
	}

	// Get task estimates from database
	estimates, err := database.ListTaskEstimatesByTask(ctx, int32(taskID))
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Error fetching task estimates: "+err.Error())
		return
	}

	// Convert to response format with usernames
	response := make([]TaskEstimateResponse, 0, len(estimates))
	for _, estimate := range estimates {
		// Get user info
		user, err := database.GetUser(ctx, estimate.CreatedByUserID)
		username := "Unknown"
		if err == nil {
			username = user.Username
		}

		// Convert numeric to float64
		estimateDay, _ := estimate.EstimateDay.Float64Value()
		estimateDayValue := float64(0)
		if estimateDay.Valid {
			estimateDayValue = estimateDay.Float64
		}

		resp := TaskEstimateResponse{
			ID:              estimate.ID,
			TaskID:          estimate.TaskID,
			EstimateDay:     estimateDayValue,
			Note:            estimate.Note.String,
			CreatedByUserID: estimate.CreatedByUserID,
			CreatedAt:       estimate.CreatedAt,
			Username:        username,
		}

		if task.Title.Valid {
			resp.TaskTitle = task.Title.String
		}

		response = append(response, resp)
	}

	respondWithJSON(w, http.StatusOK, response)
}
