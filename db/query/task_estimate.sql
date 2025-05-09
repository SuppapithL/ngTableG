-- name: CreateTaskEstimate :one
INSERT INTO task_estimates (
  task_id,
  estimate_day,
  note,
  created_by_user_id
) VALUES (
  $1, $2, $3, $4
) RETURNING *;

-- name: GetTaskEstimate :one
SELECT * FROM task_estimates
WHERE id = $1 LIMIT 1;

-- name: ListTaskEstimatesByTask :many
SELECT * FROM task_estimates
WHERE task_id = $1
ORDER BY created_at DESC;

-- name: ListTaskEstimatesByUser :many
SELECT * FROM task_estimates
WHERE created_by_user_id = $1
ORDER BY created_at DESC
LIMIT $2
OFFSET $3;

-- name: UpdateTaskEstimate :one
UPDATE task_estimates
SET 
  estimate_day = $2,
  note = $3
WHERE id = $1
RETURNING *;

-- name: DeleteTaskEstimate :exec
DELETE FROM task_estimates
WHERE id = $1; 