-- name: SyncAnnualRecordVacationDays :one
-- This query synchronizes the used vacation days and sick leave days for a specific user and year
WITH vacation_days AS (
    SELECT 
        SUM(CASE WHEN ll.type = 'vacation' THEN 1 ELSE 0 END) AS vacation_count,
        SUM(CASE WHEN ll.type = 'sick' THEN 1 ELSE 0 END) AS sick_count
    FROM leave_logs ll
    WHERE ll.user_id = @user_id AND EXTRACT(YEAR FROM ll.date) = @year
)
UPDATE annual_records ar
SET 
    used_vacation_day = COALESCE((SELECT vacation_count FROM vacation_days), 0),
    used_sick_leave_day = COALESCE((SELECT sick_count FROM vacation_days), 0),
    updated_at = NOW()
WHERE ar.user_id = @user_id AND ar.year = @year
RETURNING *;

-- name: SyncAnnualRecordWorkDays :one
-- This query synchronizes the worked days and worked on holiday days for a specific user and year
WITH work_days AS (
    SELECT 
        SUM(tl.worked_day) AS total_worked_days,
        SUM(CASE WHEN tl.is_work_on_holiday = true THEN tl.worked_day ELSE 0 END) AS holiday_worked_days
    FROM task_logs tl
    WHERE tl.created_by_user_id = @user_id AND EXTRACT(YEAR FROM tl.worked_date) = @year
)
UPDATE annual_records ar
SET 
    worked_day = COALESCE((SELECT total_worked_days FROM work_days), 0),
    worked_on_holiday_day = COALESCE((SELECT holiday_worked_days FROM work_days), 0),
    updated_at = NOW()
WHERE ar.user_id = @user_id AND ar.year = @year
RETURNING *;

-- name: SyncAllAnnualRecordsByYear :many
-- This query synchronizes all annual records for a specific year
WITH user_stats AS (
    SELECT 
        u.id AS user_id,
        COALESCE(SUM(CASE WHEN ll.type = 'vacation' THEN 1 ELSE 0 END), 0) AS vacation_days,
        COALESCE(SUM(CASE WHEN ll.type = 'sick' THEN 1 ELSE 0 END), 0) AS sick_days,
        COALESCE((SELECT SUM(tl.worked_day) 
                  FROM task_logs tl 
                  WHERE tl.created_by_user_id = u.id 
                  AND EXTRACT(YEAR FROM tl.worked_date) = @year), 0) AS total_worked_days,
        COALESCE((SELECT SUM(CASE WHEN tl.is_work_on_holiday = true THEN tl.worked_day ELSE 0 END) 
                  FROM task_logs tl 
                  WHERE tl.created_by_user_id = u.id 
                  AND EXTRACT(YEAR FROM tl.worked_date) = @year), 0) AS holiday_worked_days
    FROM users u
    LEFT JOIN leave_logs ll ON u.id = ll.user_id AND EXTRACT(YEAR FROM ll.date) = @year
    GROUP BY u.id
)
UPDATE annual_records ar
SET 
    used_vacation_day = us.vacation_days,
    used_sick_leave_day = us.sick_days,
    worked_day = us.total_worked_days,
    worked_on_holiday_day = us.holiday_worked_days,
    updated_at = NOW()
FROM user_stats us
WHERE ar.user_id = us.user_id AND ar.year = @year
RETURNING *; 