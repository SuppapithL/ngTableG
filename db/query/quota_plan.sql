-- name: CreateQuotaPlan :one
INSERT INTO quota_plans (
  plan_name,
  year,
  quota_vacation_day,
  quota_medical_expense_baht,
  created_by_user_id
) VALUES (
  @plan_name, @year, @quota_vacation_day, @quota_medical_expense_baht, @created_by_user_id
) RETURNING *;

-- name: GetQuotaPlan :one
SELECT * FROM quota_plans
WHERE id = @id LIMIT 1;

-- name: GetQuotaPlanByNameAndYear :one
SELECT * FROM quota_plans
WHERE plan_name = @plan_name AND year = @year
LIMIT 1;

-- name: ListQuotaPlans :many
SELECT * FROM quota_plans
ORDER BY year DESC, plan_name;

-- name: ListQuotaPlansByYear :many
SELECT * FROM quota_plans
WHERE year = @year
ORDER BY plan_name;

-- name: UpdateQuotaPlan :one
UPDATE quota_plans
SET 
  plan_name = COALESCE(@plan_name, plan_name),
  year = COALESCE(@year, year),
  quota_vacation_day = COALESCE(@quota_vacation_day, quota_vacation_day),
  quota_medical_expense_baht = COALESCE(@quota_medical_expense_baht, quota_medical_expense_baht),
  updated_at = NOW()
WHERE id = @id
RETURNING *;

-- name: DeleteQuotaPlan :exec
DELETE FROM quota_plans
WHERE id = @id; 