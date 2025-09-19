// Initialize OpenTelemetry before other imports
require('./tracing');

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const winston = require('winston');
require('dotenv').config();

// Configure Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

const app = express();
const port = process.env.PORT || 3000;

// Database connection
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'taskdb',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:8080'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.RATE_LIMIT_MAX || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// General middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0'
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Database connection failed'
    });
  }
});

// Ready check endpoint for Kubernetes
app.get('/ready', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ status: 'ready' });
  } catch (error) {
    logger.error('Ready check failed:', error);
    res.status(503).json({ status: 'not ready' });
  }
});

// Metrics endpoint for Prometheus
app.get('/metrics', (req, res) => {
  // In a real application, you would use prom-client here
  res.set('Content-Type', 'text/plain');
  res.send(`
# HELP task_api_requests_total Total number of requests
# TYPE task_api_requests_total counter
task_api_requests_total ${Math.floor(Math.random() * 1000)}

# HELP task_api_response_time Response time in milliseconds
# TYPE task_api_response_time histogram
task_api_response_time_bucket{le="100"} ${Math.floor(Math.random() * 50)}
task_api_response_time_bucket{le="500"} ${Math.floor(Math.random() * 100)}
task_api_response_time_bucket{le="+Inf"} ${Math.floor(Math.random() * 200)}
  `.trim());
});

// Validation middleware
const validateTask = [
  body('title').isLength({ min: 1, max: 255 }).trim().escape(),
  body('description').optional().isLength({ max: 1000 }).trim().escape(),
  body('status').optional().isIn(['pending', 'in_progress', 'completed']),
  body('priority').optional().isIn(['low', 'medium', 'high'])
];

// GET /listTasks - List all tasks with pagination
app.get('/listTasks', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const status = req.query.status;
    
    let query = 'SELECT * FROM tasks';
    let countQuery = 'SELECT COUNT(*) FROM tasks';
    const params = [];
    
    if (status) {
      query += ' WHERE status = $1';
      countQuery += ' WHERE status = $1';
      params.push(status);
    }
    
    query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);
    
    const [tasksResult, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, status ? [status] : [])
    ]);
    
    const totalTasks = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalTasks / limit);
    
    logger.info(`Listed ${tasksResult.rows.length} tasks for page ${page}`);
    
    res.json({
      tasks: tasksResult.rows,
      pagination: {
        currentPage: page,
        totalPages,
        totalTasks,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    logger.error('Error listing tasks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /addTask - Add a new task
app.post('/addTask', validateTask, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { title, description, priority } = req.body;
    const id = uuidv4();
    
    const result = await pool.query(
      'INSERT INTO tasks (id, title, description, status, priority) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [id, title, description || '', 'pending', priority || 'medium']
    );
    
    logger.info(`Task created: ${id}`);
    res.status(201).json({
      message: 'Task created successfully',
      task: result.rows[0]
    });
  } catch (error) {
    logger.error('Error creating task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /deleteTask/:id - Delete a task
app.delete('/deleteTask/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('DELETE FROM tasks WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    logger.info(`Task deleted: ${id}`);
    res.json({
      message: 'Task deleted successfully',
      task: result.rows[0]
    });
  } catch (error) {
    logger.error('Error deleting task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /updateTask/:id - Update a task
app.put('/updateTask/:id', validateTask, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { id } = req.params;
    const { title, description, status, priority } = req.body;
    
    const result = await pool.query(
      'UPDATE tasks SET title = $2, description = $3, status = $4, priority = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [id, title, description || '', status || 'pending', priority || 'medium']
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    logger.info(`Task updated: ${id}`);
    res.json({
      message: 'Task updated successfully',
      task: result.rows[0]
    });
  } catch (error) {
    logger.error('Error updating task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Initialize database tables
async function initializeDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id UUID PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
        priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
    `);
    logger.info('Database tables initialized successfully');
  } catch (error) {
    logger.error('Database initialization failed:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    pool.end();
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    pool.end();
  });
});

// Start server
const server = app.listen(port, async () => {
  await initializeDatabase();
  logger.info(`Task API server running on port ${port}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
