-- PostgreSQL schema for P'Keng TableG

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    user_type VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE annual_records (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    year INTEGER NOT NULL,
    rollover_vacation_day DECIMAL(5,2) DEFAULT 0,
    quota_vacation_day DECIMAL(5,2) DEFAULT 0,
    used_vacation_day DECIMAL(5,2) DEFAULT 0,
    used_sick_leave_day DECIMAL(5,2) DEFAULT 0,
    worked_on_holiday_day DECIMAL(5,2) DEFAULT 0,
    worked_day DECIMAL(5,2) DEFAULT 0,
    quota_medical_expense_baht DECIMAL(10,2) DEFAULT 0,
    used_medical_expense_baht DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, year)
);

CREATE TABLE holidays (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE task_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    parent_id INTEGER REFERENCES task_categories(id),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    url TEXT,
    task_category_id INTEGER REFERENCES task_categories(id),
    note TEXT,
    title TEXT,
    status TEXT,
    status_color TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE task_estimates (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks(id),
    estimate_day DECIMAL(5,2) NOT NULL,
    note TEXT,
    created_by_user_id INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE task_logs (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks(id),
    worked_day DECIMAL(5,2) NOT NULL,
    created_by_user_id INTEGER NOT NULL REFERENCES users(id),
    worked_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_work_on_holiday BOOLEAN DEFAULT FALSE
);

CREATE TABLE medical_expenses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    amount DECIMAL(10,2) NOT NULL,
    receipt_name VARCHAR(255),
    receipt_date DATE,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE leave_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    type VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for foreign keys
CREATE INDEX idx_annual_records_user_id ON annual_records(user_id);
CREATE INDEX idx_task_categories_parent_id ON task_categories(parent_id);
CREATE INDEX idx_tasks_task_category_id ON tasks(task_category_id);
CREATE INDEX idx_task_estimates_task_id ON task_estimates(task_id);
CREATE INDEX idx_task_estimates_created_by_user_id ON task_estimates(created_by_user_id);
CREATE INDEX idx_task_logs_task_id ON task_logs(task_id);
CREATE INDEX idx_task_logs_created_by_user_id ON task_logs(created_by_user_id);
CREATE INDEX idx_medical_expenses_user_id ON medical_expenses(user_id);
CREATE INDEX idx_leave_logs_user_id ON leave_logs(user_id); 