-- name: CreateTaskLog :one
INSERT INTO task_logs (
  task_id,
  worked_day,
  created_by_user_id,
  worked_date,
  is_work_on_holiday
) VALUES (
  $1, $2, $3, $4, $5
) RETURNING *;

-- name: GetTaskLog :one
SELECT * FROM task_logs
WHERE id = $1 LIMIT 1;

-- name: ListTaskLogsByTask :many
SELECT * FROM task_logs
WHERE task_id = $1
ORDER BY worked_date DESC;

-- name: ListTaskLogsByUser :many
SELECT * FROM task_logs
WHERE created_by_user_id = $1
ORDER BY worked_date DESC
LIMIT $2
OFFSET $3;

-- name: ListTaskLogsByDateRange :many
SELECT * FROM task_logs
WHERE worked_date BETWEEN $1 AND $2
ORDER BY worked_date DESC;

-- name: ListTaskLogsByUserAndDateRange :many
SELECT * FROM task_logs
WHERE created_by_user_id = $1 AND worked_date BETWEEN $2 AND $3
ORDER BY worked_date DESC;

-- name: UpdateTaskLog :one
UPDATE task_logs
SET 
  worked_day = $2,
  worked_date = $3,
  is_work_on_holiday = $4
WHERE id = $1
RETURNING *;

-- name: DeleteTaskLog :exec
DELETE FROM task_logs
WHERE id = $1; 