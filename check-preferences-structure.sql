-- Check the structure of user_preferences table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_preferences'
ORDER BY ordinal_position;

-- Check what data is currently stored
SELECT * FROM user_preferences LIMIT 5;

-- Check app_user_preferences structure (mobile app uses this)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'app_user_preferences'
ORDER BY ordinal_position;
