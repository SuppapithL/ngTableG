package main

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/tonk/pkeng-tableg/db/sqlc"
)

// TaskCategoryResponse is the response format for task category data
type TaskCategoryResponse struct {
	ID          int32                  `json:"id"`
	Name        string                 `json:"name"`
	ParentID    *int32                 `json:"parent_id,omitempty"`
	Description string                 `json:"description,omitempty"`
	CreatedAt   pgtype.Timestamptz     `json:"created_at"`
	UpdatedAt   pgtype.Timestamptz     `json:"updated_at"`
	Children    []TaskCategoryResponse `json:"children,omitempty"`
}

// TaskCategoryRequest represents the request body for creating or updating a task category
type TaskCategoryRequest struct {
	Name        string `json:"name"`
	ParentID    *int32 `json:"parent_id"`
	Description string `json:"description"`
}

func getTaskCategories(w http.ResponseWriter, r *http.Request) {
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

	// Get task categories from database
	categories, err := database.ListTaskCategories(ctx, sqlc.ListTaskCategoriesParams{
		Limit:  int32(limit),
		Offset: int32(offset),
	})
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Error fetching task categories: "+err.Error())
		return
	}

	// Convert to response format
	response := make([]TaskCategoryResponse, 0, len(categories))
	for _, category := range categories {
		var parentID *int32
		if category.ParentID.Valid {
			parentID = &category.ParentID.Int32
		}

		response = append(response, TaskCategoryResponse{
			ID:          category.ID,
			Name:        category.Name,
			ParentID:    parentID,
			Description: category.Description.String,
			CreatedAt:   category.CreatedAt,
			UpdatedAt:   category.UpdatedAt,
		})
	}

	respondWithJSON(w, http.StatusOK, response)
}

func getTaskCategory(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	vars := mux.Vars(r)

	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid task category ID")
		return
	}

	category, err := database.GetTaskCategory(ctx, int32(id))
	if err != nil {
		respondWithError(w, http.StatusNotFound, "Task category not found")
		return
	}

	var parentID *int32
	if category.ParentID.Valid {
		parentID = &category.ParentID.Int32
	}

	response := TaskCategoryResponse{
		ID:          category.ID,
		Name:        category.Name,
		ParentID:    parentID,
		Description: category.Description.String,
		CreatedAt:   category.CreatedAt,
		UpdatedAt:   category.UpdatedAt,
	}

	respondWithJSON(w, http.StatusOK, response)
}

func createTaskCategory(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	var req TaskCategoryRequest

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Validate request
	if req.Name == "" {
		respondWithError(w, http.StatusBadRequest, "Name is required")
		return
	}

	// Prepare the database parameters
	params := sqlc.CreateTaskCategoryParams{
		Name:        req.Name,
		Description: pgtype.Text{String: req.Description, Valid: req.Description != ""},
	}

	// Set parent_id if provided
	if req.ParentID != nil {
		params.ParentID = pgtype.Int4{Int32: *req.ParentID, Valid: true}
	}

	// Create task category in database
	category, err := database.CreateTaskCategory(ctx, params)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Error creating task category: "+err.Error())
		return
	}

	var parentID *int32
	if category.ParentID.Valid {
		parentID = &category.ParentID.Int32
	}

	response := TaskCategoryResponse{
		ID:          category.ID,
		Name:        category.Name,
		ParentID:    parentID,
		Description: category.Description.String,
		CreatedAt:   category.CreatedAt,
		UpdatedAt:   category.UpdatedAt,
	}

	respondWithJSON(w, http.StatusCreated, response)
}

func updateTaskCategory(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	vars := mux.Vars(r)

	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid task category ID")
		return
	}

	var req TaskCategoryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Prepare the database parameters
	params := sqlc.UpdateTaskCategoryParams{
		ID:          int32(id),
		Name:        req.Name,
		Description: pgtype.Text{String: req.Description, Valid: req.Description != ""},
	}

	// Set parent_id if provided
	if req.ParentID != nil {
		params.ParentID = pgtype.Int4{Int32: *req.ParentID, Valid: true}
	} else {
		params.ParentID = pgtype.Int4{Valid: false}
	}

	// Update task category in database
	category, err := database.UpdateTaskCategory(ctx, params)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Error updating task category: "+err.Error())
		return
	}

	var parentID *int32
	if category.ParentID.Valid {
		parentID = &category.ParentID.Int32
	}

	response := TaskCategoryResponse{
		ID:          category.ID,
		Name:        category.Name,
		ParentID:    parentID,
		Description: category.Description.String,
		CreatedAt:   category.CreatedAt,
		UpdatedAt:   category.UpdatedAt,
	}

	respondWithJSON(w, http.StatusOK, response)
}

func deleteTaskCategory(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	vars := mux.Vars(r)

	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid task category ID")
		return
	}

	if err := database.DeleteTaskCategory(ctx, int32(id)); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Error deleting task category: "+err.Error())
		return
	}

	respondWithJSON(w, http.StatusOK, map[string]string{"result": "success"})
}

func getHierarchicalTaskCategories(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()

	// First, get all root categories (with no parent)
	rootCategories, err := database.ListRootTaskCategories(ctx)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Error fetching root task categories: "+err.Error())
		return
	}

	// Then build hierarchical response
	response := buildHierarchicalCategories(ctx, rootCategories)
	respondWithJSON(w, http.StatusOK, response)
}

// Helper function to build hierarchical structure
func buildHierarchicalCategories(ctx context.Context, categories []sqlc.TaskCategory) []TaskCategoryResponse {
	result := make([]TaskCategoryResponse, 0, len(categories))

	for _, category := range categories {
		// Get children for this category
		children, err := database.ListTaskCategoriesByParent(ctx, pgtype.Int4{Int32: category.ID, Valid: true})
		if err != nil {
			// Log error but continue
			continue
		}

		var parentID *int32
		if category.ParentID.Valid {
			parentID = &category.ParentID.Int32
		}

		categoryResponse := TaskCategoryResponse{
			ID:          category.ID,
			Name:        category.Name,
			ParentID:    parentID,
			Description: category.Description.String,
			CreatedAt:   category.CreatedAt,
			UpdatedAt:   category.UpdatedAt,
		}

		// Recursively get children if there are any
		if len(children) > 0 {
			categoryResponse.Children = buildHierarchicalCategories(ctx, children)
		}

		result = append(result, categoryResponse)
	}

	return result
}
