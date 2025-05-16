package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	db "github.com/kengtableg/pkeng-tableg/db/sqlc"
)

// AnnualRecordSyncService handles the synchronization of annual records with leave logs and task logs
type AnnualRecordSyncService struct {
	store db.Querier
}

// NewAnnualRecordSyncService creates a new instance of the annual record sync service
func NewAnnualRecordSyncService(store db.Querier) *AnnualRecordSyncService {
	return &AnnualRecordSyncService{
		store: store,
	}
}

// SyncUserRecordForYear synchronizes a specific user's annual record for a given year
func (s *AnnualRecordSyncService) SyncUserRecordForYear(ctx context.Context, userID int32, year int32) (*db.AnnualRecord, error) {
	// First, sync the vacation and sick leave days
	vacationRecord, err := s.store.SyncAnnualRecordVacationDays(ctx, db.SyncAnnualRecordVacationDaysParams{
		UserID: userID,
		Year:   year,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to sync vacation days: %v", err)
	}

	// Then, sync the work days and holiday work days
	workRecord, err := s.store.SyncAnnualRecordWorkDays(ctx, db.SyncAnnualRecordWorkDaysParams{
		UserID: userID,
		Year:   year,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to sync work days: %v", err)
	}

	// Return the most recently updated record
	if workRecord.UpdatedAt.Time.After(vacationRecord.UpdatedAt.Time) {
		return &workRecord, nil
	}
	return &vacationRecord, nil
}

// SyncAllRecordsForYear synchronizes all users' annual records for a given year
func (s *AnnualRecordSyncService) SyncAllRecordsForYear(ctx context.Context, year int32) ([]db.AnnualRecord, error) {
	syncedRows, err := s.store.SyncAllAnnualRecordsByYear(ctx, year)
	if err != nil {
		return nil, fmt.Errorf("failed to sync all annual records for year %d: %v", year, err)
	}

	// Convert SyncAllAnnualRecordsByYearRow to AnnualRecord
	records := make([]db.AnnualRecord, len(syncedRows))
	for i, row := range syncedRows {
		records[i] = db.AnnualRecord{
			ID:                     row.ID,
			UserID:                 row.UserID,
			Year:                   row.Year,
			QuotaPlanID:            row.QuotaPlanID,
			RolloverVacationDay:    row.RolloverVacationDay,
			UsedVacationDay:        row.UsedVacationDay,
			UsedSickLeaveDay:       row.UsedSickLeaveDay,
			WorkedOnHolidayDay:     row.WorkedOnHolidayDay,
			WorkedDay:              row.WorkedDay,
			UsedMedicalExpenseBaht: row.UsedMedicalExpenseBaht,
			CreatedAt:              row.CreatedAt,
			UpdatedAt:              row.UpdatedAt,
		}
	}

	return records, nil
}

// EnsureAnnualRecordExists ensures that an annual record exists for the given user and year
// If it doesn't exist, it creates one
func (s *AnnualRecordSyncService) EnsureAnnualRecordExists(ctx context.Context, userID int32, year int32) (*db.AnnualRecord, error) {
	// Try to get the existing record
	record, err := s.store.GetAnnualRecordByUserAndYear(ctx, db.GetAnnualRecordByUserAndYearParams{
		UserID: userID,
		Year:   year,
	})

	// If there's no error, the record exists, return it
	if err == nil {
		return &db.AnnualRecord{
			ID:                     record.ID,
			UserID:                 record.UserID,
			Year:                   record.Year,
			QuotaPlanID:            record.QuotaPlanID,
			RolloverVacationDay:    record.RolloverVacationDay,
			UsedVacationDay:        record.UsedVacationDay,
			UsedSickLeaveDay:       record.UsedSickLeaveDay,
			WorkedOnHolidayDay:     record.WorkedOnHolidayDay,
			WorkedDay:              record.WorkedDay,
			UsedMedicalExpenseBaht: record.UsedMedicalExpenseBaht,
			CreatedAt:              record.CreatedAt,
			UpdatedAt:              record.UpdatedAt,
		}, nil
	}

	// Get the default quota plan for the year
	quotaPlans, err := s.store.ListQuotaPlansByYear(ctx, year)
	if err != nil || len(quotaPlans) == 0 {
		log.Printf("No quota plan found for year %d, using default values", year)
		// Continue with nil quota plan
	}

	// Use the first quota plan if available
	var quotaPlanID pgtype.Int4
	if len(quotaPlans) > 0 {
		quotaPlanID.Int32 = quotaPlans[0].ID
		quotaPlanID.Valid = true
	}

	// Create a new annual record
	newRecord, err := s.store.UpsertAnnualRecordForUser(ctx, db.UpsertAnnualRecordForUserParams{
		UserID:      userID,
		Year:        year,
		QuotaPlanID: quotaPlanID,
	})
	if err != nil {
		return nil, err
	}

	return &newRecord, nil
}

// ScheduleYearEndRollover schedules the rollover of vacation days at year-end
func (s *AnnualRecordSyncService) ScheduleYearEndRollover(ctx context.Context) error {
	// Get the current year
	currentYear := int32(time.Now().Year())
	nextYear := currentYear + 1

	// Create records for the next year with rollover from the current year
	_, err := s.store.CreateNextYearAnnualRecords(ctx, db.CreateNextYearAnnualRecordsParams{
		NextYear: nextYear,
		ThisYear: currentYear,
	})

	return err
}

// GetAnnualRecord gets a specific user's annual record for a given year without syncing
func (s *AnnualRecordSyncService) GetAnnualRecord(ctx context.Context, userID int32, year int32) (*db.AnnualRecord, error) {
	// Get the existing record
	record, err := s.store.GetAnnualRecordByUserAndYear(ctx, db.GetAnnualRecordByUserAndYearParams{
		UserID: userID,
		Year:   year,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to get annual record: %v", err)
	}

	return &db.AnnualRecord{
		ID:                     record.ID,
		UserID:                 record.UserID,
		Year:                   record.Year,
		QuotaPlanID:            record.QuotaPlanID,
		RolloverVacationDay:    record.RolloverVacationDay,
		UsedVacationDay:        record.UsedVacationDay,
		UsedSickLeaveDay:       record.UsedSickLeaveDay,
		WorkedOnHolidayDay:     record.WorkedOnHolidayDay,
		WorkedDay:              record.WorkedDay,
		UsedMedicalExpenseBaht: record.UsedMedicalExpenseBaht,
		CreatedAt:              record.CreatedAt,
		UpdatedAt:              record.UpdatedAt,
	}, nil
}

// GetAllAnnualRecordsForYear gets all users' annual records for a given year without syncing
func (s *AnnualRecordSyncService) GetAllAnnualRecordsForYear(ctx context.Context, year int32) ([]db.AnnualRecord, error) {
	records, err := s.store.ListAnnualRecordsByYear(ctx, year)
	if err != nil {
		return nil, fmt.Errorf("failed to get annual records for year %d: %v", year, err)
	}

	result := make([]db.AnnualRecord, len(records))
	for i, record := range records {
		result[i] = db.AnnualRecord{
			ID:                     record.ID,
			UserID:                 record.UserID,
			Year:                   record.Year,
			QuotaPlanID:            record.QuotaPlanID,
			RolloverVacationDay:    record.RolloverVacationDay,
			UsedVacationDay:        record.UsedVacationDay,
			UsedSickLeaveDay:       record.UsedSickLeaveDay,
			WorkedOnHolidayDay:     record.WorkedOnHolidayDay,
			WorkedDay:              record.WorkedDay,
			UsedMedicalExpenseBaht: record.UsedMedicalExpenseBaht,
			CreatedAt:              record.CreatedAt,
			UpdatedAt:              record.UpdatedAt,
		}
	}

	return result, nil
}
