-- name: CreateAnnualRecord :one
INSERT INTO annual_records (
  user_id,
  year,
  quota_plan_id,
  rollover_vacation_day,
  used_vacation_day,
  used_sick_leave_day,
  worked_on_holiday_day,
  worked_day,
  used_medical_expense_baht
) VALUES (
  @user_id, @year, @quota_plan_id, @rollover_vacation_day, 
  @used_vacation_day, @used_sick_leave_day, @worked_on_holiday_day, 
  @worked_day, @used_medical_expense_baht
) RETURNING *;

-- name: GetAnnualRecord :one
SELECT * FROM annual_records
WHERE id = @id LIMIT 1;

-- name: GetAnnualRecordByUserAndYear :one
SELECT ar.*, qp.quota_vacation_day, qp.quota_medical_expense_baht
FROM annual_records ar
LEFT JOIN quota_plans qp ON ar.quota_plan_id = qp.id
WHERE ar.user_id = @user_id AND ar.year = @year LIMIT 1;

-- name: ListAnnualRecordsByUser :many
SELECT ar.*, qp.quota_vacation_day, qp.quota_medical_expense_baht
FROM annual_records ar
LEFT JOIN quota_plans qp ON ar.quota_plan_id = qp.id
WHERE ar.user_id = @user_id
ORDER BY ar.year DESC;

-- name: ListAnnualRecordsByYear :many
SELECT ar.*, qp.quota_vacation_day, qp.quota_medical_expense_baht
FROM annual_records ar
LEFT JOIN quota_plans qp ON ar.quota_plan_id = qp.id
WHERE ar.year = @year
ORDER BY ar.user_id;

-- name: UpdateAnnualRecord :one
UPDATE annual_records
SET 
  quota_plan_id = COALESCE(@quota_plan_id, quota_plan_id),
  rollover_vacation_day = COALESCE(@rollover_vacation_day, rollover_vacation_day),
  used_vacation_day = COALESCE(@used_vacation_day, used_vacation_day),
  used_sick_leave_day = COALESCE(@used_sick_leave_day, used_sick_leave_day),
  worked_on_holiday_day = COALESCE(@worked_on_holiday_day, worked_on_holiday_day),
  worked_day = COALESCE(@worked_day, worked_day),
  used_medical_expense_baht = COALESCE(@used_medical_expense_baht, used_medical_expense_baht),
  updated_at = NOW()
WHERE user_id = @user_id AND year = @year
RETURNING *;

-- name: DeleteAnnualRecord :exec
DELETE FROM annual_records
WHERE id = @id;

-- name: CreateNextYearAnnualRecords :many
WITH user_list AS (
    SELECT id FROM users
),
default_quota_plan AS (
    SELECT id 
    FROM quota_plans 
    WHERE year = @next_year AND plan_name = 'Default'
    LIMIT 1
),
current_year_records AS (
    SELECT 
        ar.user_id,
        ar.used_vacation_day,
        ar.worked_on_holiday_day,
        qp.quota_vacation_day
    FROM annual_records ar
    LEFT JOIN quota_plans qp ON ar.quota_plan_id = qp.id
    WHERE ar.year = @this_year
),
rollover_calculation AS (
    SELECT 
        ul.id AS user_id,
        @next_year AS year,
        (SELECT id FROM default_quota_plan) AS quota_plan_id,
        COALESCE(
            GREATEST(
                COALESCE(cyr.quota_vacation_day, 0) + 
                COALESCE(cyr.worked_on_holiday_day, 0) - 
                COALESCE(cyr.used_vacation_day, 0),
                0
            ),
            0
        ) AS rollover_vacation_day,
        0 AS used_vacation_day,
        0 AS used_sick_leave_day,
        0 AS worked_on_holiday_day,
        0 AS worked_day,
        0 AS used_medical_expense_baht
    FROM user_list ul
    LEFT JOIN current_year_records cyr ON ul.id = cyr.user_id
)
INSERT INTO annual_records (
    user_id,
    year,
    quota_plan_id,
    rollover_vacation_day,
    used_vacation_day,
    used_sick_leave_day,
    worked_on_holiday_day,
    worked_day,
    used_medical_expense_baht
)
SELECT 
    user_id,
    year,
    quota_plan_id,
    rollover_vacation_day,
    used_vacation_day,
    used_sick_leave_day,
    worked_on_holiday_day,
    worked_day,
    used_medical_expense_baht
FROM rollover_calculation
WHERE NOT EXISTS (
    SELECT 1 FROM annual_records 
    WHERE annual_records.user_id = rollover_calculation.user_id 
    AND annual_records.year = @next_year
)
RETURNING *;

-- name: AssignQuotaPlanToAllUsers :exec
WITH user_list AS (
    SELECT id FROM users
)
-- Update existing records
UPDATE annual_records
SET 
    quota_plan_id = @quota_plan_id,
    updated_at = NOW()
WHERE year = @year;

-- Insert records for users who don't have one yet
INSERT INTO annual_records (
    user_id,
    year,
    quota_plan_id,
    rollover_vacation_day,
    used_vacation_day,
    used_sick_leave_day,
    worked_on_holiday_day,
    worked_day,
    used_medical_expense_baht
)
SELECT 
    ul.id,
    @year,
    @quota_plan_id,
    0, -- rollover_vacation_day
    0, -- used_vacation_day
    0, -- used_sick_leave_day
    0, -- worked_on_holiday_day
    0, -- worked_day
    0  -- used_medical_expense_baht
FROM user_list ul
WHERE NOT EXISTS (
    SELECT 1 FROM annual_records ar
    WHERE ar.user_id = ul.id AND ar.year = @year
);

-- name: UpsertAnnualRecordForUser :one
INSERT INTO annual_records (
    user_id,
    year,
    quota_plan_id,
    rollover_vacation_day,
    used_vacation_day,
    used_sick_leave_day,
    worked_on_holiday_day,
    worked_day,
    used_medical_expense_baht
)
VALUES (
    @user_id,
    @year,
    @quota_plan_id,
    COALESCE(@rollover_vacation_day, 0),
    COALESCE(@used_vacation_day, 0),
    COALESCE(@used_sick_leave_day, 0),
    COALESCE(@worked_on_holiday_day, 0),
    COALESCE(@worked_day, 0),
    COALESCE(@used_medical_expense_baht, 0)
)
ON CONFLICT (user_id, year) DO UPDATE SET
    quota_plan_id = @quota_plan_id,
    updated_at = NOW()
RETURNING *; 