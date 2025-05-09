-- Check if the holidays table exists and drop it if it does
DROP TABLE IF EXISTS holidays;

-- Create the holidays table with all required fields
CREATE TABLE holidays (
    id serial PRIMARY KEY,
    date date NOT NULL,
    name varchar(255) NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now()
);

-- Add some example holidays
INSERT INTO holidays (date, name, note) VALUES 
    ('2025-01-01', 'New Year''s Day', 'National holiday'),
    ('2025-12-25', 'Christmas Day', 'National holiday'),
    ('2025-04-30', 'Test Holiday', 'This is a test holiday'); 