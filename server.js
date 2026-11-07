/**
 * Smart Employee Management System – Payroll & Attendance
 * Main Application Server (Node.js + Express.js)
 */

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const config = require('./config');
const db = require('./db');

// Import route modules
const authRoutes = require('./routes/auth');
const employeeRoutes = require('./routes/employees');
const departmentRoutes = require('./routes/departments');
const attendanceRoutes = require('./routes/attendance');
const leaveRoutes = require('./routes/leaves');
const payrollRoutes = require('./routes/payroll');
const reportRoutes = require('./routes/reports');
const dashboardRoutes = require('./routes/dashboard');
const { initializeDatabase } = require('./init_db');

const app = express();

// Global Middlewares
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Request logger for debugging
app.use((req, res, next) => {
  if (!req.url.startsWith('/assets') && !req.url.endsWith('.ico')) {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  }
  next();
});

// Health Check Endpoint
app.get('/api/health', async (req, res) => {
  try {
    const dbTest = await db.query('SELECT 1 AS alive');
    res.json({
      status: 'UP',
      database: dbTest[0].alive === 1 ? 'Connected' : 'Disconnected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'DOWN',
      database: 'Error: ' + error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Database Reset/Setup Endpoint (useful for demo/viva resets)
app.post('/api/setup-db', async (req, res) => {
  try {
    await initializeDatabase();
    res.json({ success: true, message: 'Database reset and seeded successfully!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'DB setup failed: ' + err.message });
  }
});

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Serve Frontend Static Files (Vite Production Build)
const clientDistPath = path.join(__dirname, 'client', 'dist');
app.use(express.static(clientDistPath));

// Fallback to React index.html for client-side routing
app.get('*', (req, res) => {
  if (req.url.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'API route not found' });
  }
  const indexPath = path.join(clientDistPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(200).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Smart Employee Management System</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; background: #f8fafc; color: #1e293b; text-align: center; }
            .card { max-width: 600px; margin: 40px auto; background: white; padding: 32px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
            h1 { color: #1e40af; }
            code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>TechNova Smart Employee Management System</h1>
            <p>API Server is live on port ${config.PORT}.</p>
            <p>To run the frontend, run: <code>npm run build:client</code></p>
          </div>
        </body>
        </html>
      `);
    }
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Application Error:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Start Server
app.listen(config.PORT, () => {
  console.log('\n=============================================================');
  console.log(`🚀 Smart Employee Management System – Payroll & Attendance`);
  console.log(`📡 Server running at: http://localhost:${config.PORT}`);
  console.log(`🏢 Organization:     ${config.COMPANY_NAME}`);
  console.log(`🗄️  Database:         ${config.DB_NAME} on ${config.DB_HOST}:${config.DB_PORT}`);
  console.log('=============================================================\n');
});

