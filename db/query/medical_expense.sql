-- name: CreateMedicalExpense :one
INSERT INTO medical_expenses (
  user_id,
  amount,
  receipt_name,
  receipt_date,
  note
) VALUES (
  $1, $2, $3, $4, $5
) RETURNING *;

-- name: GetMedicalExpense :one
SELECT * FROM medical_expenses
WHERE id = $1 LIMIT 1;

-- name: ListMedicalExpensesByUser :many
SELECT * FROM medical_expenses
WHERE user_id = $1
ORDER BY receipt_date DESC
LIMIT $2
OFFSET $3;

-- name: ListMedicalExpensesByYear :many
SELECT * FROM medical_expenses
WHERE user_id = $1 AND EXTRACT(YEAR FROM receipt_date) = $2
ORDER BY receipt_date DESC;

-- name: UpdateMedicalExpense :one
UPDATE medical_expenses
SET 
  amount = $2,
  receipt_name = $3,
  receipt_date = $4,
  note = $5
WHERE id = $1
RETURNING *;

-- name: DeleteMedicalExpense :exec
DELETE FROM medical_expenses
WHERE id = $1; 