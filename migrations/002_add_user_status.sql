-- User status tracking for online/offline functionality

-- Add columns for tracking user online status
-- Note: This migration will only run if the columns don't already exist
-- The application code handles checking for existing columns

-- Add is_online column if it doesn't exist
ALTER TABLE users ADD COLUMN is_online BOOLEAN DEFAULT FALSE;

-- Add last_seen column if it doesn't exist
ALTER TABLE users ADD COLUMN last_seen DATETIME DEFAULT CURRENT_TIMESTAMP;

-- Create index for better performance when querying online users
CREATE INDEX IF NOT EXISTS idx_users_is_online ON users(is_online);
CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users(last_seen DESC);

-- Update trigger to automatically update last_seen when user status changes
CREATE TRIGGER IF NOT EXISTS update_users_last_seen
    AFTER UPDATE OF is_online ON users
    FOR EACH ROW
    WHEN NEW.is_online = 1
BEGIN
    UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
