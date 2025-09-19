-- Database initialization script for Task Management System
-- This script creates the necessary tables and indexes for the application

-- Create the tasks table with proper constraints and indexes
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_updated_at ON tasks(updated_at DESC);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at on task updates
CREATE TRIGGER update_tasks_updated_at 
    BEFORE UPDATE ON tasks 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data for testing (optional)
INSERT INTO tasks (id, title, description, priority, status) VALUES
    (gen_random_uuid(), 'Set up CI/CD Pipeline', 'Configure GitHub Actions for automated testing and deployment', 'high', 'in_progress'),
    (gen_random_uuid(), 'Implement Monitoring', 'Deploy Prometheus and Grafana for application monitoring', 'medium', 'pending'),
    (gen_random_uuid(), 'Security Audit', 'Review and implement security best practices', 'high', 'pending'),
    (gen_random_uuid(), 'Performance Testing', 'Run load tests with Locust to validate scalability', 'medium', 'completed'),
    (gen_random_uuid(), 'Documentation Update', 'Update README and deployment guides', 'low', 'pending')
ON CONFLICT (id) DO NOTHING;

-- Create a view for task statistics (useful for monitoring)
CREATE OR REPLACE VIEW task_stats AS
SELECT 
    COUNT(*) as total_tasks,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_tasks,
    COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_tasks,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tasks,
    COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_priority_tasks,
    COUNT(CASE WHEN priority = 'medium' THEN 1 END) as medium_priority_tasks,
    COUNT(CASE WHEN priority = 'low' THEN 1 END) as low_priority_tasks,
    AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_completion_time_seconds
FROM tasks;

-- Grant necessary permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON tasks TO app_user;
-- GRANT SELECT ON task_stats TO app_user;

-- Optional: Create additional tables for future features
CREATE TABLE IF NOT EXISTS task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    author VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_created_at ON task_comments(created_at DESC);
