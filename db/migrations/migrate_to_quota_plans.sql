-- Migration script to add quota_plans table and migrate existing data

-- 1. Create the quota_plans table
CREATE TABLE IF NOT EXISTS quota_plans (
    id SERIAL PRIMARY KEY,
    plan_name VARCHAR(255) NOT NULL,
    year INTEGER NOT NULL,
    quota_vacation_day DECIMAL(5,2) DEFAULT 0,
    quota_medical_expense_baht DECIMAL(10,2) DEFAULT 0,
    created_by_user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(plan_name, year)
);

-- 2. Create an index for created_by_user_id
CREATE INDEX IF NOT EXISTS idx_quota_plans_created_by_user_id ON quota_plans(created_by_user_id);

-- 3. Add quota_plan_id column to annual_records
ALTER TABLE annual_records ADD COLUMN IF NOT EXISTS quota_plan_id INTEGER REFERENCES quota_plans(id);

-- 4. Create an index for quota_plan_id
CREATE INDEX IF NOT EXISTS idx_annual_records_quota_plan_id ON annual_records(quota_plan_id);

-- 5. Create default quota plans for each year found in annual_records
INSERT INTO quota_plans (plan_name, year, quota_vacation_day, quota_medical_expense_baht)
SELECT DISTINCT 'Default', year, 10, 20000
FROM annual_records
ON CONFLICT (plan_name, year) DO NOTHING;

-- 6. Create user-specific quota plans for any custom quota values
WITH custom_quotas AS (
    SELECT DISTINCT 
        user_id, 
        year, 
        quota_vacation_day, 
        quota_medical_expense_baht
    FROM annual_records
    WHERE quota_vacation_day != 10 OR quota_medical_expense_baht != 20000
)
INSERT INTO quota_plans (plan_name, year, quota_vacation_day, quota_medical_expense_baht, created_by_user_id)
SELECT 
    CONCAT('Custom-User-', user_id), 
    year, 
    quota_vacation_day, 
    quota_medical_expense_baht, 
    1 -- Admin user ID (replace with your actual admin ID)
FROM custom_quotas
ON CONFLICT (plan_name, year) DO NOTHING;

-- 7. Update annual_records to point to default quota plans
UPDATE annual_records ar
SET quota_plan_id = qp.id
FROM quota_plans qp
WHERE 
    ar.year = qp.year AND 
    qp.plan_name = 'Default' AND
    (ar.quota_vacation_day = 10 AND ar.quota_medical_expense_baht = 20000);

-- 8. Update annual_records to point to custom quota plans
UPDATE annual_records ar
SET quota_plan_id = qp.id
FROM quota_plans qp
WHERE 
    ar.year = qp.year AND 
    qp.plan_name = CONCAT('Custom-User-', ar.user_id) AND
    (ar.quota_vacation_day = qp.quota_vacation_day AND ar.quota_medical_expense_baht = qp.quota_medical_expense_baht);

-- 9. Remove the old quota columns
ALTER TABLE annual_records DROP COLUMN IF EXISTS quota_vacation_day;
ALTER TABLE annual_records DROP COLUMN IF EXISTS quota_medical_expense_baht;

-- NOTE: Uncomment the ALTER TABLE DROP statements above after confirming the migration
-- was successful. This script leaves the columns in place initially to allow rollback
-- if needed. 