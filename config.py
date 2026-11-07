"""
Configuration Module for Smart Employee Management System
Reads configuration from environment variables with safe development defaults.
"""
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Flask Security
    SECRET_KEY = os.getenv('SECRET_KEY', 'technova-super-secret-key-capstone-2026-viva')
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    PERMANENT_SESSION_LIFETIME = 86400  # 24 hours in seconds

    # Database Configuration (MySQL 8 / MariaDB 10.4+)
    DB_HOST = os.getenv('DB_HOST', 'localhost')
    DB_PORT = int(os.getenv('DB_PORT', 3306))
    DB_USER = os.getenv('DB_USER', 'root')
    DB_PASSWORD = os.getenv('DB_PASSWORD', '')
    DB_NAME = os.getenv('DB_NAME', 'smart_employee_db')

    # Company Metadata (Shown on Salary Slips & Header)
    COMPANY_NAME = os.getenv('COMPANY_NAME', 'TechNova Solutions Pvt. Ltd.')
    COMPANY_ADDRESS = os.getenv('COMPANY_ADDRESS', 'TechNova Tower, 4th Floor, Electronic City Phase 1, Bengaluru, Karnataka - 560100')
    COMPANY_EMAIL = os.getenv('COMPANY_EMAIL', 'hr@technova.com')
    COMPANY_PHONE = os.getenv('COMPANY_PHONE', '+91 (080) 4123-4567')

