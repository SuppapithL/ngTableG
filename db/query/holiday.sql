-- name: CreateHoliday :one
INSERT INTO holidays (
  date,
  name,
  note
) VALUES (
  $1, $2, $3
) RETURNING *;

-- name: GetHoliday :one
SELECT * FROM holidays
WHERE id = $1 LIMIT 1;

-- name: GetHolidayByDate :one
SELECT * FROM holidays
WHERE date = $1 LIMIT 1;

-- name: ListHolidays :many
SELECT * FROM holidays
ORDER BY date
LIMIT $1
OFFSET $2;

-- name: ListHolidaysByYear :many
SELECT * FROM holidays
WHERE EXTRACT(YEAR FROM date) = $1
ORDER BY date;

-- name: UpdateHoliday :one
UPDATE holidays
SET 
  date = COALESCE($2, date),
  name = COALESCE($3, name),
  note = COALESCE($4, note)
WHERE id = $1
RETURNING *;

-- name: DeleteHoliday :exec
DELETE FROM holidays
WHERE id = $1; 