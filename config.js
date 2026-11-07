/**
 * Application Configuration
 * Smart Employee Management System – Payroll & Attendance
 */

require('dotenv').config();

module.exports = {
  // Server Port
  PORT: process.env.PORT || 5000,

  // MySQL Database Configuration
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: parseInt(process.env.DB_PORT || '3306', 10),
  DB_USER: process.env.DB_USER || 'root',
  DB_PASSWORD: process.env.DB_PASSWORD || '',
  DB_NAME: process.env.DB_NAME || 'smart_employee_db',

  // JWT Secret Key for Session Authentication
  JWT_SECRET: process.env.JWT_SECRET || 'technova_smart_employee_secret_key_2026_xyz',

  // Organization Metadata
  COMPANY_NAME: 'TechNova Solutions Pvt. Ltd.',
  COMPANY_ADDRESS: 'TechNova Tower, 4th Floor, Electronic City Phase 1, Bengaluru, Karnataka - 560100',
  COMPANY_EMAIL: 'hr@technova.com',
  COMPANY_PHONE: '+91 (080) 4123-4567'
};

