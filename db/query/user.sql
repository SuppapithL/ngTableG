-- name: CreateUser :one
INSERT INTO users (
  username,
  password,
  user_type,
  email
) VALUES (
  @username, @password, @user_type, @email
) RETURNING *;

-- name: GetUser :one
SELECT * FROM users
WHERE id = @id LIMIT 1;

-- name: GetUserByUsername :one
SELECT * FROM users
WHERE username = @username LIMIT 1;

-- name: GetUserByEmail :one
SELECT * FROM users
WHERE email = @email LIMIT 1;

-- name: ListUsers :many
SELECT * FROM users
ORDER BY id
LIMIT @row_limit
OFFSET @row_offset;

-- name: UpdateUser :one
UPDATE users
SET 
  username = COALESCE(@username, username),
  password = COALESCE(@password, password),
  user_type = COALESCE(@user_type, user_type),
  email = COALESCE(@email, email),
  updated_at = NOW()
WHERE id = @id
RETURNING *;

-- name: DeleteUser :exec
DELETE FROM users
WHERE id = @id; 