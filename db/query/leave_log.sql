-- name: CreateLeaveLog :one
INSERT INTO leave_logs (
  user_id,
  type,
  date,
  note
) VALUES (
  $1, $2, $3, $4
) RETURNING *;

-- name: GetLeaveLog :one
SELECT * FROM leave_logs
WHERE id = $1 LIMIT 1;

-- name: ListLeaveLogsByUser :many
SELECT * FROM leave_logs
WHERE user_id = $1
ORDER BY date DESC
LIMIT $2
OFFSET $3;

-- name: ListLeaveLogsByType :many
SELECT * FROM leave_logs
WHERE user_id = $1 AND type = $2
ORDER BY date DESC
LIMIT $3
OFFSET $4;

-- name: ListLeaveLogsByDateRange :many
SELECT * FROM leave_logs
WHERE user_id = $1 AND date BETWEEN $2 AND $3
ORDER BY date DESC;

-- name: ListLeaveLogsByYear :many
SELECT * FROM leave_logs
WHERE user_id = $1 AND EXTRACT(YEAR FROM date) = $2
ORDER BY date DESC;

-- name: UpdateLeaveLog :one
UPDATE leave_logs
SET 
  type = $2,
  date = $3,
  note = $4
WHERE id = $1
RETURNING *;

-- name: DeleteLeaveLog :exec
DELETE FROM leave_logs
WHERE id = $1; 