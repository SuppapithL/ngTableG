package main

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gorilla/mux"
)

// SyncRequest represents the request for syncing an annual record
type SyncRequest struct {
	UserID int32 `json:"user_id"`
	Year   int32 `json:"year"`
}

// AnnualRecordSyncHandler handles HTTP requests for annual record sync operations
type AnnualRecordSyncHandler struct {
	syncService *AnnualRecordSyncService
}

// NewAnnualRecordSyncHandler creates a new instance of annual record sync handler
func NewAnnualRecordSyncHandler(syncService *AnnualRecordSyncService) *AnnualRecordSyncHandler {
	return &AnnualRecordSyncHandler{
		syncService: syncService,
	}
}

// RegisterRoutes registers the HTTP routes for this handler
func (h *AnnualRecordSyncHandler) RegisterRoutes(router *mux.Router) {
	router.HandleFunc("/api/annual-records/sync", h.SyncUserRecord).Methods("POST")
	router.HandleFunc("/api/annual-records/sync/all/{year}", h.SyncAllRecords).Methods("POST")
	router.HandleFunc("/api/annual-records/ensure/{user_id}/{year}", h.EnsureAnnualRecord).Methods("POST")
	router.HandleFunc("/api/annual-records/rollover", h.ScheduleYearEndRollover).Methods("POST")
}

// SyncUserRecord handles the request to sync a specific user's annual record
func (h *AnnualRecordSyncHandler) SyncUserRecord(w http.ResponseWriter, r *http.Request) {
	var req SyncRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// If year is not provided, use the current year
	if req.Year == 0 {
		req.Year = int32(time.Now().Year())
	}

	// Instead of syncing, we now get the record directly
	// This is now done automatically via the periodic sync or when leave/task logs change
	log.Printf("Manual sync request received - using automatic sync instead for user %d, year %d", req.UserID, req.Year)

	// Get the existing record
	record, err := h.syncService.GetAnnualRecord(r.Context(), req.UserID, req.Year)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(record)
}

// SyncAllRecords handles the request to sync all users' annual records for a specific year
func (h *AnnualRecordSyncHandler) SyncAllRecords(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	yearStr := vars["year"]

	var year int32
	if yearStr == "" {
		// If year is not provided, use the current year
		year = int32(time.Now().Year())
	} else {
		yearInt, err := strconv.Atoi(yearStr)
		if err != nil {
			http.Error(w, "Invalid year format", http.StatusBadRequest)
			return
		}
		year = int32(yearInt)
	}

	// Instead of syncing all records, we now just get all records for the year
	// Syncing is done automatically via the periodic sync or when leave/task logs change
	log.Printf("Manual sync all request received - using automatic sync instead for year %d", year)

	// Get all records for the year
	records, err := h.syncService.GetAllAnnualRecordsForYear(r.Context(), year)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(records)
}

// EnsureAnnualRecord handles the request to ensure an annual record exists for a specific user and year
func (h *AnnualRecordSyncHandler) EnsureAnnualRecord(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	userIDStr := vars["user_id"]
	yearStr := vars["year"]

	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		http.Error(w, "Invalid user ID format", http.StatusBadRequest)
		return
	}

	var year int
	if yearStr == "" {
		// If year is not provided, use the current year
		year = time.Now().Year()
	} else {
		year, err = strconv.Atoi(yearStr)
		if err != nil {
			http.Error(w, "Invalid year format", http.StatusBadRequest)
			return
		}
	}

	// Ensure the annual record exists
	record, err := h.syncService.EnsureAnnualRecordExists(r.Context(), int32(userID), int32(year))
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(record)
}

// ScheduleYearEndRollover handles the request to schedule the year-end rollover of vacation days
func (h *AnnualRecordSyncHandler) ScheduleYearEndRollover(w http.ResponseWriter, r *http.Request) {
	err := h.syncService.ScheduleYearEndRollover(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"message": "Year-end rollover scheduled successfully"}`))
}
