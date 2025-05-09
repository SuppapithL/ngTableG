package main

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/gorilla/mux"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/tonk/pkeng-tableg/db/sqlc"
)

// TaskLogResponse is the response format for task log data
type TaskLogResponse struct {
	ID              int32              `json:"id"`
	TaskID          int32              `json:"task_id"`
	WorkedDay       float64            `json:"worked_day"`
	CreatedByUserID int32              `json:"created_by_user_id"`
	WorkedDate      time.Time          `json:"worked_date"`
	IsWorkOnHoliday bool               `json:"is_work_on_holiday"`
	CreatedAt       pgtype.Timestamptz `json:"created_at"`
	Username        string             `json:"username,omitempty"`   // Added for response only
	TaskTitle       string             `json:"task_title,omitempty"` // Added for response only
}

// TaskLogRequest represents the request body for creating or updating a task log
type TaskLogRequest struct {
	TaskID          int32     `json:"task_id"`
	WorkedDay       float64   `json:"worked_day"`
	WorkedDate      time.Time `json:"worked_date"`
	IsWorkOnHoliday bool      `json:"is_work_on_holiday"`
}

func getTaskLogs(w http.ResponseWriter, r *http.Request) {
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

	// Get task logs from database for this user
	logs, err := database.ListTaskLogsByUser(ctx, sqlc.ListTaskLogsByUserParams{
		CreatedByUserID: currentUser.ID,
		Limit:           int32(limit),
		Offset:          int32(offset),
	})
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Error fetching task logs: "+err.Error())
		return
	}

	// Convert to response format with enriched data
	response := make([]TaskLogResponse, 0, len(logs))
	for _, log := range logs {
		// Convert numeric to float64
		workedDay, _ := log.WorkedDay.Float64Value()
		workedDayValue := float64(0)
		if workedDay.Valid {
			workedDayValue = workedDay.Float64
		}

		// Check if worked date is valid
		var workedDate time.Time
		if log.WorkedDate.Valid {
			workedDate = log.WorkedDate.Time.UTC()
		}

		// Check if holiday flag is valid
		isWorkOnHoliday := false
		if log.IsWorkOnHoliday.Valid {
			isWorkOnHoliday = log.IsWorkOnHoliday.Bool
		}

		resp := TaskLogResponse{
			ID:              log.ID,
			TaskID:          log.TaskID,
			WorkedDay:       workedDayValue,
			CreatedByUserID: log.CreatedByUserID,
			WorkedDate:      workedDate,
			IsWorkOnHoliday: isWorkOnHoliday,
			CreatedAt:       log.CreatedAt,
			Username:        currentUser.Username, // Set the current user's username
		}

		// Get task info to enrich the response
		task, err := database.GetTask(ctx, log.TaskID)
		if err == nil && task.Title.Valid {
			resp.TaskTitle = task.Title.String
		}

		response = append(response, resp)
	}

	respondWithJSON(w, http.StatusOK, response)
}

func getTaskLog(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	vars := mux.Vars(r)

	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid task log ID")
		return
	}

	log, err := database.GetTaskLog(ctx, int32(id))
	if err != nil {
		respondWithError(w, http.StatusNotFound, "Task log not found")
		return
	}

	// Get user who created this log
	user, err := database.GetUser(ctx, log.CreatedByUserID)
	if err != nil {
		// Continue even if we can't get the user
		user = sqlc.User{
			Username: "Unknown",
		}
	}

	// Get task info
	task, err := database.GetTask(ctx, log.TaskID)
	taskTitle := ""
	if err == nil && task.Title.Valid {
		taskTitle = task.Title.String
	}

	// Convert numeric to float64
	workedDay, _ := log.WorkedDay.Float64Value()
	workedDayValue := float64(0)
	if workedDay.Valid {
		workedDayValue = workedDay.Float64
	}

	// Check if worked date is valid
	var workedDate time.Time
	if log.WorkedDate.Valid {
		workedDate = log.WorkedDate.Time.UTC()
	}

	// Check if holiday flag is valid
	isWorkOnHoliday := false
	if log.IsWorkOnHoliday.Valid {
		isWorkOnHoliday = log.IsWorkOnHoliday.Bool
	}

	response := TaskLogResponse{
		ID:              log.ID,
		TaskID:          log.TaskID,
		WorkedDay:       workedDayValue,
		CreatedByUserID: log.CreatedByUserID,
		WorkedDate:      workedDate,
		IsWorkOnHoliday: isWorkOnHoliday,
		CreatedAt:       log.CreatedAt,
		Username:        user.Username,
		TaskTitle:       taskTitle,
	}

	respondWithJSON(w, http.StatusOK, response)
}

func createTaskLog(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	var req TaskLogRequest

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
	if req.WorkedDay <= 0 {
		respondWithError(w, http.StatusBadRequest, "Worked day must be positive")
		return
	}

	// Check if task exists
	_, err = database.GetTask(ctx, req.TaskID)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Task not found")
		return
	}

	// Prepare numeric value
	workedDay := pgtype.Numeric{}
	workedDay.Valid = true
	workedDay.Scan(strconv.FormatFloat(req.WorkedDay, 'f', -1, 64))

	// Create task log in database
	params := sqlc.CreateTaskLogParams{
		TaskID:          req.TaskID,
		WorkedDay:       workedDay,
		CreatedByUserID: currentUser.ID,
		WorkedDate:      pgtype.Date{Time: req.WorkedDate, Valid: !req.WorkedDate.IsZero()},
		IsWorkOnHoliday: pgtype.Bool{Bool: req.IsWorkOnHoliday, Valid: true},
	}

	log, err := database.CreateTaskLog(ctx, params)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Error creating task log: "+err.Error())
		return
	}

	// Convert numeric to float64 for response
	workedDayValue, _ := log.WorkedDay.Float64Value()
	workedDayFloat := float64(0)
	if workedDayValue.Valid {
		workedDayFloat = workedDayValue.Float64
	}

	// Check if worked date is valid
	var workedDate time.Time
	if log.WorkedDate.Valid {
		workedDate = log.WorkedDate.Time.UTC()
	}

	// Check if holiday flag is valid
	isWorkOnHoliday := false
	if log.IsWorkOnHoliday.Valid {
		isWorkOnHoliday = log.IsWorkOnHoliday.Bool
	}

	response := TaskLogResponse{
		ID:              log.ID,
		TaskID:          log.TaskID,
		WorkedDay:       workedDayFloat,
		CreatedByUserID: log.CreatedByUserID,
		WorkedDate:      workedDate,
		IsWorkOnHoliday: isWorkOnHoliday,
		CreatedAt:       log.CreatedAt,
		Username:        currentUser.Username,
	}

	respondWithJSON(w, http.StatusCreated, response)
}

func updateTaskLog(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	vars := mux.Vars(r)

	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid task log ID")
		return
	}

	var req TaskLogRequest
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

	// Check if log exists and belongs to current user
	existingLog, err := database.GetTaskLog(ctx, int32(id))
	if err != nil {
		respondWithError(w, http.StatusNotFound, "Task log not found")
		return
	}

	if existingLog.CreatedByUserID != currentUser.ID {
		respondWithError(w, http.StatusForbidden, "You can only update your own logs")
		return
	}

	// Validate request
	if req.WorkedDay <= 0 {
		respondWithError(w, http.StatusBadRequest, "Worked day must be positive")
		return
	}

	// Prepare numeric value
	workedDay := pgtype.Numeric{}
	workedDay.Valid = true
	workedDay.Scan(strconv.FormatFloat(req.WorkedDay, 'f', -1, 64))

	// Update task log in database
	params := sqlc.UpdateTaskLogParams{
		ID:              int32(id),
		WorkedDay:       workedDay,
		WorkedDate:      pgtype.Date{Time: req.WorkedDate, Valid: !req.WorkedDate.IsZero()},
		IsWorkOnHoliday: pgtype.Bool{Bool: req.IsWorkOnHoliday, Valid: true},
	}

	log, err := database.UpdateTaskLog(ctx, params)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Error updating task log: "+err.Error())
		return
	}

	// Convert numeric to float64 for response
	workedDayValue, _ := log.WorkedDay.Float64Value()
	workedDayFloat := float64(0)
	if workedDayValue.Valid {
		workedDayFloat = workedDayValue.Float64
	}

	// Check if worked date is valid
	var workedDate time.Time
	if log.WorkedDate.Valid {
		workedDate = log.WorkedDate.Time.UTC()
	}

	// Check if holiday flag is valid
	isWorkOnHoliday := false
	if log.IsWorkOnHoliday.Valid {
		isWorkOnHoliday = log.IsWorkOnHoliday.Bool
	}

	response := TaskLogResponse{
		ID:              log.ID,
		TaskID:          log.TaskID,
		WorkedDay:       workedDayFloat,
		CreatedByUserID: log.CreatedByUserID,
		WorkedDate:      workedDate,
		IsWorkOnHoliday: isWorkOnHoliday,
		CreatedAt:       log.CreatedAt,
		Username:        currentUser.Username,
	}

	respondWithJSON(w, http.StatusOK, response)
}

func deleteTaskLog(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	vars := mux.Vars(r)

	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid task log ID")
		return
	}

	// Get current user
	currentUser, err := getCurrentUserFromRequest(r)
	if err != nil {
		respondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Check if log exists and belongs to current user
	existingLog, err := database.GetTaskLog(ctx, int32(id))
	if err != nil {
		respondWithError(w, http.StatusNotFound, "Task log not found")
		return
	}

	if existingLog.CreatedByUserID != currentUser.ID {
		respondWithError(w, http.StatusForbidden, "You can only delete your own logs")
		return
	}

	if err := database.DeleteTaskLog(ctx, int32(id)); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Error deleting task log: "+err.Error())
		return
	}

	respondWithJSON(w, http.StatusOK, map[string]string{"result": "success"})
}

func getTaskLogsByTask(w http.ResponseWriter, r *http.Request) {
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

	// Get task logs from database
	logs, err := database.ListTaskLogsByTask(ctx, int32(taskID))
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Error fetching task logs: "+err.Error())
		return
	}

	// Convert to response format with usernames
	response := make([]TaskLogResponse, 0, len(logs))
	for _, log := range logs {
		// Get user info
		user, err := database.GetUser(ctx, log.CreatedByUserID)
		username := "Unknown"
		if err == nil {
			username = user.Username
		}

		// Convert numeric to float64
		workedDay, _ := log.WorkedDay.Float64Value()
		workedDayValue := float64(0)
		if workedDay.Valid {
			workedDayValue = workedDay.Float64
		}

		// Check if worked date is valid
		var workedDate time.Time
		if log.WorkedDate.Valid {
			workedDate = log.WorkedDate.Time.UTC()
		}

		// Check if holiday flag is valid
		isWorkOnHoliday := false
		if log.IsWorkOnHoliday.Valid {
			isWorkOnHoliday = log.IsWorkOnHoliday.Bool
		}

		resp := TaskLogResponse{
			ID:              log.ID,
			TaskID:          log.TaskID,
			WorkedDay:       workedDayValue,
			CreatedByUserID: log.CreatedByUserID,
			WorkedDate:      workedDate,
			IsWorkOnHoliday: isWorkOnHoliday,
			CreatedAt:       log.CreatedAt,
			Username:        username,
		}

		if task.Title.Valid {
			resp.TaskTitle = task.Title.String
		}

		response = append(response, resp)
	}

	respondWithJSON(w, http.StatusOK, response)
}

func getTaskLogsByDateRange(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()

	// Parse date range parameters
	startDateParam := r.URL.Query().Get("start_date")
	endDateParam := r.URL.Query().Get("end_date")

	if startDateParam == "" || endDateParam == "" {
		respondWithError(w, http.StatusBadRequest, "Start date and end date are required")
		return
	}

	startDate, err := time.Parse("2006-01-02", startDateParam)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid start date format (should be YYYY-MM-DD)")
		return
	}

	endDate, err := time.Parse("2006-01-02", endDateParam)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid end date format (should be YYYY-MM-DD)")
		return
	}

	// Get user from request
	currentUser, err := getCurrentUserFromRequest(r)
	if err != nil {
		respondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get task logs by date range for current user
	logs, err := database.ListTaskLogsByUserAndDateRange(ctx, sqlc.ListTaskLogsByUserAndDateRangeParams{
		CreatedByUserID: currentUser.ID,
		WorkedDate:      pgtype.Date{Time: startDate, Valid: true},
		WorkedDate_2:    pgtype.Date{Time: endDate, Valid: true},
	})
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Error fetching task logs: "+err.Error())
		return
	}

	// Convert to response format with task titles
	response := make([]TaskLogResponse, 0, len(logs))
	for _, log := range logs {
		// Convert numeric to float64
		workedDay, _ := log.WorkedDay.Float64Value()
		workedDayValue := float64(0)
		if workedDay.Valid {
			workedDayValue = workedDay.Float64
		}

		// Check if worked date is valid
		var workedDate time.Time
		if log.WorkedDate.Valid {
			workedDate = log.WorkedDate.Time.UTC()
		}

		// Check if holiday flag is valid
		isWorkOnHoliday := false
		if log.IsWorkOnHoliday.Valid {
			isWorkOnHoliday = log.IsWorkOnHoliday.Bool
		}

		resp := TaskLogResponse{
			ID:              log.ID,
			TaskID:          log.TaskID,
			WorkedDay:       workedDayValue,
			CreatedByUserID: log.CreatedByUserID,
			WorkedDate:      workedDate,
			IsWorkOnHoliday: isWorkOnHoliday,
			CreatedAt:       log.CreatedAt,
			Username:        currentUser.Username,
		}

		// Get task title
		task, err := database.GetTask(ctx, log.TaskID)
		if err == nil && task.Title.Valid {
			resp.TaskTitle = task.Title.String
		}

		response = append(response, resp)
	}

	respondWithJSON(w, http.StatusOK, response)
}
