-- Create reddit_posts table
CREATE TABLE reddit_posts (
    id SERIAL PRIMARY KEY,              -- Unique internal ID for the row
    post_id TEXT UNIQUE NOT NULL,       -- Reddit's post ID (e.g., "1jgsxur")
    created_at TIMESTAMPTZ,             -- Extracted for easy sorting/filtering
    author TEXT,                         -- Extracted for quick access
    data JSONB NOT NULL                 -- Full JSON blob including post and comments
);

-- Create indexes for performance
CREATE INDEX idx_reddit_posts_post_id ON reddit_posts(post_id);
CREATE INDEX idx_reddit_posts_created_at ON reddit_posts(created_at);
CREATE INDEX idx_reddit_posts_author ON reddit_posts(author);
CREATE INDEX idx_reddit_posts_data_gin ON reddit_posts USING GIN(data); 