package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gorilla/mux"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/kengtableg/pkeng-tableg/db/sqlc"
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
	TaskID          int32   `json:"task_id"`
	WorkedDay       float64 `json:"worked_day"`
	WorkedDate      string  `json:"worked_date"` // Changed to string to match frontend format
	IsWorkOnHoliday bool    `json:"is_work_on_holiday"`
}

// Validate that total time logged for a date doesn't exceed 1 day
func validateDayLimit(ctx context.Context, userID int32, date time.Time, workedDay float64, excludeLogID int32) error {
	// Format the date as a string in the format needed for database queries
	dateStr := date.Format("2006-01-02")

	// Query task logs for this date and user (excluding the current log if updating)
	query := `
		SELECT COALESCE(SUM(CAST(worked_day AS float8)), 0)
		FROM task_logs
		WHERE 
			created_by_user_id = $1 AND 
			CAST(worked_date AS DATE) = $2 AND
			($3 = 0 OR id != $3)
	`
	var taskLogsTotal float64
	err := database.Pool.QueryRow(ctx, query, userID, dateStr, excludeLogID).Scan(&taskLogsTotal)
	if err != nil {
		return fmt.Errorf("error querying task logs: %w", err)
	}

	// Query leave logs for this date and user
	leaveQuery := `
		SELECT COUNT(*)
		FROM leave_logs
		WHERE 
			user_id = $1 AND 
			CAST(date AS DATE) = $2
	`
	var leaveLogsCount int
	err = database.Pool.QueryRow(ctx, leaveQuery, userID, dateStr).Scan(&leaveLogsCount)
	if err != nil {
		return fmt.Errorf("error querying leave logs: %w", err)
	}

	// Each leave log counts as 1 day
	leaveLogsTotal := float64(leaveLogsCount)

	// Calculate total time
	totalTime := taskLogsTotal + leaveLogsTotal + workedDay

	// If total exceeds 1 day, return an error
	if totalTime > 1.0 {
		return fmt.Errorf("total time logged for this date would exceed 1 day (current: %.2f + new: %.2f = %.2f)",
			taskLogsTotal+leaveLogsTotal, workedDay, totalTime)
	}

	return nil
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

	// Parse date from string (yyyy-MM-dd format)
	workedDate, err := time.Parse("2006-01-02", req.WorkedDate)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid date format. Expected yyyy-MM-dd")
		return
	}

	// Validate time limit for the day
	err = validateDayLimit(ctx, currentUser.ID, workedDate, req.WorkedDay, 0)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, err.Error())
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
		WorkedDate:      pgtype.Date{Time: workedDate, Valid: true},
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
	var responseWorkedDate time.Time
	if log.WorkedDate.Valid {
		responseWorkedDate = log.WorkedDate.Time.UTC()
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
		WorkedDate:      responseWorkedDate,
		IsWorkOnHoliday: isWorkOnHoliday,
		CreatedAt:       log.CreatedAt,
		Username:        currentUser.Username,
	}

	// Add sync function to call after changes
	syncTaskLogUser(ctx, currentUser.ID, workedDate)

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

	// Parse date from string (yyyy-MM-dd format)
	workedDate, err := time.Parse("2006-01-02", req.WorkedDate)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid date format. Expected yyyy-MM-dd")
		return
	}

	// Validate time limit for the day (excluding current log)
	err = validateDayLimit(ctx, currentUser.ID, workedDate, req.WorkedDay, int32(id))
	if err != nil {
		respondWithError(w, http.StatusBadRequest, err.Error())
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
		WorkedDate:      pgtype.Date{Time: workedDate, Valid: true},
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
	var responseWorkedDate time.Time
	if log.WorkedDate.Valid {
		responseWorkedDate = log.WorkedDate.Time.UTC()
	}

	// Check if holiday flag is valid
	isWorkOnHoliday := false
	if log.IsWorkOnHoliday.Valid {
		isWorkOnHoliday = log.IsWorkOnHoliday.Bool
	}

	// Add sync function to call after changes
	syncTaskLogUser(ctx, currentUser.ID, workedDate)

	response := TaskLogResponse{
		ID:              log.ID,
		TaskID:          log.TaskID,
		WorkedDay:       workedDayFloat,
		CreatedByUserID: log.CreatedByUserID,
		WorkedDate:      responseWorkedDate,
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

	// Add sync function to call after changes
	syncTaskLogUser(ctx, currentUser.ID, time.Now())

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

	log.Printf("getTaskLogsByDateRange called with start_date=%s, end_date=%s", startDateParam, endDateParam)

	startDate, err := time.Parse("2006-01-02", startDateParam)
	if err != nil {
		log.Printf("Invalid start date format: %v", err)
		respondWithError(w, http.StatusBadRequest, "Invalid start date format (should be YYYY-MM-DD)")
		return
	}

	endDate, err := time.Parse("2006-01-02", endDateParam)
	if err != nil {
		log.Printf("Invalid end date format: %v", err)
		respondWithError(w, http.StatusBadRequest, "Invalid end date format (should be YYYY-MM-DD)")
		return
	}

	// Get user from request
	currentUser, err := getCurrentUserFromRequest(r)
	if err != nil {
		log.Printf("Unauthorized request: %v", err)
		respondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	log.Printf("Fetching logs for user ID %d between %s and %s", currentUser.ID, startDate.Format("2006-01-02"), endDate.Format("2006-01-02"))

	// Get task logs by date range for current user
	logs, err := database.ListTaskLogsByUserAndDateRange(ctx, sqlc.ListTaskLogsByUserAndDateRangeParams{
		CreatedByUserID: currentUser.ID,
		WorkedDate:      pgtype.Date{Time: startDate, Valid: true},
		WorkedDate_2:    pgtype.Date{Time: endDate, Valid: true},
	})
	if err != nil {
		log.Printf("Error fetching task logs: %v", err)
		respondWithError(w, http.StatusInternalServerError, "Error fetching task logs: "+err.Error())
		return
	}

	log.Printf("Found %d logs for date range", len(logs))

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

	// Add sync function to call after changes
	syncTaskLogUser(ctx, currentUser.ID, time.Now())

	respondWithJSON(w, http.StatusOK, response)
}

// Add sync function to call after changes
func syncTaskLogUser(ctx context.Context, userID int32, taskDate time.Time) {
	year := time.Now().Year()
	if taskDate.Year() > 0 {
		year = taskDate.Year()
	}

	syncService := NewAnnualRecordSyncService(database)
	_, err := syncService.SyncUserRecordForYear(ctx, userID, int32(year))
	if err != nil {
		log.Printf("Warning: Failed to sync annual record for task log: %v", err)
	} else {
		log.Printf("Successfully synced annual record for user %d, year %d after task log change", userID, year)
	}
}
