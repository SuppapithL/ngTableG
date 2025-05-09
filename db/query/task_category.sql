-- name: CreateTaskCategory :one
INSERT INTO task_categories (
  name,
  parent_id,
  description
) VALUES (
  $1, $2, $3
) RETURNING *;

-- name: GetTaskCategory :one
SELECT * FROM task_categories
WHERE id = $1 LIMIT 1;

-- name: ListTaskCategories :many
SELECT * FROM task_categories
ORDER BY name
LIMIT $1
OFFSET $2;

-- name: ListTaskCategoriesByParent :many
SELECT * FROM task_categories
WHERE parent_id = $1
ORDER BY name;

-- name: ListRootTaskCategories :many
SELECT * FROM task_categories
WHERE parent_id IS NULL
ORDER BY name;

-- name: UpdateTaskCategory :one
UPDATE task_categories
SET 
  name = COALESCE($2, name),
  parent_id = $3,
  description = COALESCE($4, description),
  updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: DeleteTaskCategory :exec
DELETE FROM task_categories
WHERE id = $1; 