-- name: CreateTask :one
INSERT INTO tasks (
  url,
  task_category_id,
  note,
  title,
  status,
  status_color
) VALUES (
  $1, $2, $3, $4, $5, $6
) RETURNING *;

-- name: GetTask :one
SELECT * FROM tasks
WHERE id = $1 LIMIT 1;

-- name: ListTasks :many
SELECT * FROM tasks
ORDER BY created_at DESC
LIMIT $1
OFFSET $2;

-- name: ListTasksByCategory :many
SELECT * FROM tasks
WHERE task_category_id = $1
ORDER BY created_at DESC;

-- name: ListTasksByCategoryWithSubcategories :many
WITH RECURSIVE subcategories AS (
  -- Base case: the input category
  SELECT tc.id FROM task_categories tc WHERE tc.id = $1
  UNION ALL
  -- Recursive case: find all child categories
  SELECT tc.id FROM task_categories tc
  JOIN subcategories sc ON tc.parent_id = sc.id
)
SELECT t.* FROM tasks t
WHERE t.task_category_id IN (SELECT sc.id FROM subcategories sc)
ORDER BY t.created_at DESC;

-- name: UpdateTask :one
UPDATE tasks
SET 
  url = $2,
  task_category_id = $3,
  note = $4,
  title = $5,
  status = $6,
  status_color = $7,
  updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: DeleteTask :exec
DELETE FROM tasks
WHERE id = $1; 