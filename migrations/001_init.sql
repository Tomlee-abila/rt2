-- Add categories table and update posts table to use foreign key

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert predefined categories
INSERT OR IGNORE INTO categories (name) VALUES
    ('General Discussion'),
    ('Technology'),
    ('Random'),
    ('Help');

-- Add temporary column for new category_id in posts
ALTER TABLE posts ADD COLUMN category_id INTEGER;

-- Migrate existing category data to category_id
UPDATE posts SET category_id = (
    SELECT id FROM categories 
    WHERE name = CASE posts.category
        WHEN 'general' THEN 'General Discussion'
        WHEN 'technology' THEN 'Technology'
        WHEN 'random' THEN 'Random'
        WHEN 'help' THEN 'Help'
    END
);

-- Drop old category column and add foreign key constraint
-- Note: SQLite doesn't support DROP COLUMN directly, so we need to create a new table
CREATE TABLE IF NOT EXISTS posts_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE RESTRICT
);

-- Copy data to new posts table
INSERT INTO posts_new (id, user_id, title, content, category_id, created_at, updated_at)
SELECT id, user_id, title, content, category_id, created_at, updated_at
FROM posts;

-- Drop old posts table and rename new one
DROP TABLE posts;
ALTER TABLE posts_new RENAME TO posts;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);

-- Recreate trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_posts_updated_at 
    AFTER UPDATE ON posts
    FOR EACH ROW
BEGIN
    UPDATE posts SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;