# Smart Employee Management System – Payroll & Attendance
### College Capstone Project | Database Management Systems (CS304)

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://python.org)
[![Framework](https://img.shields.io/badge/Framework-Flask%203.0-lightgrey.svg)](https://flask.palletsprojects.com/)
[![Database](https://img.shields.io/badge/Database-MySQL%208.x%20%2F%20MariaDB-orange.svg)](https://www.mysql.com/)
[![Architecture](https://img.shields.io/badge/Architecture-3NF%20Relational%20Schema-green.svg)](#-database-schema-3nf)
[![No ORM](https://img.shields.io/badge/ORM-None%20(Pure%20Parameterized%20SQL)-red.svg)](#-key-features)

A complete, working, college-capstone-grade enterprise web application built for a **3rd-semester Computer Science student** to demonstrate real-world Database Management Systems (DBMS) concepts during laboratory evaluations and viva voce examinations.

Every DBMS concept in this project—from **Third Normal Form (3NF)** normalization to **Stored Procedures, Functions, Triggers, Views, and B-Tree Indexes**—is written in real, working, parameterized SQL executed against MySQL. **No Object-Relational Mappers (ORMs)** are used.

---

## 📑 Quick Navigation
- [Key Features](#-key-features)
- [Project Directory Structure](#-project-directory-structure)
- [Prerequisites & System Setup](#-prerequisites--system-setup)
- [Step-by-Step Installation & Run Guide](#-step-by-step-installation--run-guide)
- [Demo Credentials](#-demo-credentials)
- [10-Minute Viva Demonstration Script](#-10-minute-viva-demonstration-script)
- [Troubleshooting & Common Issues](#-troubleshooting--common-issues)
- [Documentation Index](#-documentation-index)

---

## 🌟 Key Features

### 🏢 Human Resources Management (Admin)
- **Employee Lifecycle:** Add, update, view, and delete employee profiles with department linkage and salary bands.
- **Dual Deletion Paradigm:** Supports hard delete with automated Foreign Key cascading (`ON DELETE CASCADE`) and corporate soft delete (`employment_status = 'Inactive'`).
- **Department Units:** Dynamic department management displaying real-time employee headcounts.

### ⏱️ Attendance & Time Tracking
- **Smart Punch-In / Punch-Out:** Biometric-style time tracking with automatic calculation of working hours.
- **Attendance Status Proration:**
  - `Present`: 1.0 day
  - `Late`: 1.0 day
  - `Half Day`: 0.5 day
  - `Absent`: 0.0 day
- **Temporal Integrity Trigger:** Prohibits attendance logging for future dates or dates preceding an employee's hire date.

### 🏖️ Leave Management Workflow
- **Application Validation:** Mandatory date sequence verification (`end_date >= start_date`).
- **Conflict Prevention:** Automated SQL detection preventing overlapping leave requests.
- **Admin Approval Hub:** Real-time inbox for HR managers to approve or reject requests with reviewer remarks.

### 💰 Automated Payroll Engine
- **Procedural Execution:** Handled via MySQL Stored Procedure `sp_calculate_monthly_payroll`.
- **Dynamic Working Days:** Computed via SQL User-Defined Function `fn_working_days(month, year)` excluding all Sundays.
- **Formula:**
  $$\text{Gross Salary} = \text{Basic Salary} + \text{Allowances}$$
  $$\text{Net Salary} = \text{Gross Salary} - \text{Deductions}$$
- **Suggested Absence Deduction Hint:** System calculates $(\text{Basic} / \text{Working Days}) \times \text{Absent Days}$ as a suggested guideline for the administrator.
- **Printable Salary Slips:** Company-branded ("TechNova Solutions Pvt. Ltd.") printable pay slips with detailed earnings/deductions breakdown.
- **Tamper-Evident Audit Logging:** Database trigger automatically records all salary revisions into `salary_audit`.

### 📊 Academic DBMS Reports & Lab Queries
- 10 interactive SQL reports covering Inner/Left/Right/Full Joins, Correlated Subqueries, Aggregate Grouping, and Window Functions.
- Live SQL query viewer showing the exact query executed.
- One-click CSV dataset export for every report.

---

## 📁 Project Directory Structure

```text
dbms-capstone/
├── app.py                      # Main Flask application with routes and controllers
├── config.py                   # Centralized configuration (DB credentials, secret keys)
├── db.py                       # MySQL connection pool & raw parameterized query helpers
├── requirements.txt            # Python dependencies (Flask, mysql-connector-python)
├── setup_db.py                 # Automated DB initialization script (runs all SQL in order)
├── test_runner.py              # Automated test suite (10 comprehensive tests)
├── database/                   # Pure SQL Database Assets
│   ├── schema.sql              # 3NF Table definitions, PKs, FKs, CHECKs, Indexes
│   ├── views.sql               # Relational views (employee details, payroll, attendance)
│   ├── functions.sql           # Stored functions (fn_net_salary, fn_working_days, etc.)
│   ├── procedures.sql          # Stored procedures (sp_calculate_monthly_payroll, etc.)
│   ├── triggers.sql            # Audit & validation triggers (future date, salary audit)
│   ├── sample_data.sql         # Seed data (5 depts, 12 staff, 3 months payroll, hashed users)
│   ├── access_control.sql      # Database users, roles, and GRANT permissions
│   └── dbms_lab_queries.sql    # 10 documented academic queries with EXPLAIN plans
├── static/                     # Frontend Static Assets (Zero CDN dependency)
│   ├── css/
│   │   └── style.css           # Modern SaaS responsive CSS theme & print stylesheet
│   └── js/
│       └── main.js             # Vanilla JS: alerts, SQL toggles, delete confirmations
├── templates/                  # Jinja2 HTML5 Templates
│   ├── base.html               # Master layout with responsive sidebar and navigation
│   ├── login.html              # Login portal with live demo credentials box
│   ├── admin_dashboard.html    # HR Executive dashboard with KPI metric cards
│   ├── employees.html          # Employee directory table with filters
│   ├── employee_form.html      # Add / Edit employee form
│   ├── employee_detail.html    # Full employee profile view
│   ├── departments.html        # Department management view
│   ├── attendance.html         # Daily attendance marking matrix
│   ├── leave.html              # Admin leave approval inbox
│   ├── payroll.html            # Payroll generation hub & batch generator
│   ├── salary_slip.html        # Official printable TechNova salary slip
│   ├── reports.html            # Academic DBMS query reports with CSV export
│   ├── employee_dashboard.html # Employee self-service dashboard with Punch clock
│   ├── employee_attendance.html# Employee monthly attendance calendar
│   ├── employee_leaves.html    # Employee leave application portal
│   ├── employee_payroll.html   # Employee historical payslip view
│   ├── profile.html            # User account settings & password change
│   └── error.html              # Custom 403, 404, 500 error display
└── docs/                       # Capstone Documentation
    ├── Project_Report.md       # 17-section formal academic project report
    ├── Viva_Questions.md       # 45+ DBMS viva questions and model answers
    ├── sql_outputs.md          # Recorded MySQL query outputs for all lab queries
    ├── PROGRESS.md             # Implementation checklist & traceability matrix
    └── screenshots/            # 10 high-resolution application screenshots
```

---

## 💻 Prerequisites & System Setup

Ensure you have the following installed on your machine:
1. **Python 3.10, 3.11, or 3.12** ([Download Python](https://www.python.org/downloads/))
2. **MySQL Server 8.x** or **XAMPP (MariaDB 10.4+)** ([Download XAMPP](https://www.apachefriends.org/))
3. **Visual Studio Code** or any code editor.

---

## 🚀 Step-by-Step Installation & Run Guide

### Step 1: Clone / Navigate to Project Directory
Open your terminal (PowerShell or Bash) and change into the project root:
```bash
cd "c:\Users\priya\Desktop\dbms cap"
```

### Step 2: Set Up Virtual Environment (Optional but Recommended)
```bash
python -m venv venv
# On Windows PowerShell:
.\venv\Scripts\Activate.ps1
# On macOS/Linux:
source venv/bin/activate
```

### Step 3: Install Required Dependencies
```bash
pip install -r requirements.txt
```

### Step 4: Start MySQL Server
- If using **XAMPP**: Open the XAMPP Control Panel and click **Start** next to **MySQL**.
- Or via terminal:
```bash
C:\xampp\mysql\bin\mysqld.exe --defaults-file=C:\xampp\mysql\bin\my.ini --standalone
```

### Step 5: Configure Database Credentials
Open `config.py` in your editor and verify your local MySQL credentials:
```python
DB_CONFIG = {
    'host': 'localhost',
    'port': 3306,
    'user': 'root',
    'password': '',          # Enter your MySQL root password (default for XAMPP is blank)
    'database': 'smart_employee_db'
}
```

### Step 6: Initialize Database Schema & Seed Data
Execute the automated database setup script. This script creates the database, all 7 tables, views, functions, stored procedures, triggers, and populates realistic sample data:
```bash
python setup_db.py
```
*Expected Output:* `Database smart_employee_db setup completed successfully!`

### Step 7: Launch the Application
```bash
python app.py
```
Open your web browser and navigate to:  
👉 **`http://127.0.0.1:5000`**

---

## 🔑 Demo Credentials

A handy "Demo Credentials" box is built directly into the login screen. You can log in using any of the following accounts:

| Role | Username | Password | Linked Employee Profile |
|---|---|---|---|
| **HR Administrator** | `admin` | `Admin@123` | System Administrator (Full Access) |
| **Senior Engineer** | `emp101` | `Emp@123` | Rajesh Kumar (IT Department) |
| **HR Manager** | `emp102` | `Emp@123` | Priya Sharma (HR Department) |
| **Finance Officer** | `emp103` | `Emp@123` | Amit Patel (Finance Department) |
| **DevOps Specialist** | `emp105` | `Emp@123` | Vikram Singh (IT Department) |
| **Marketing Lead** | `emp107` | `Emp@123` | Rahul Verma (Marketing Department) |

*(All other employees `emp104` through `emp112` also use password `Emp@123`)*.

---

## ⏱️ 10-Minute Viva Demonstration Script

Follow this step-by-step sequence to deliver a flawless project presentation to the external examiner:

| Time | Phase | What to Show & Explain | Key DBMS Concepts to Highlight |
|---|---|---|---|
| **0:00 - 1:30** | **Login & Security** | 1. Open `http://127.0.0.1:5000`. Show demo credentials box.<br>2. Log in as `admin`. Show Role-Based Access Control (RBAC).<br>3. Explain that passwords are encrypted using Scrypt/PBKDF2 hashes stored in `users.password_hash`. | Authentication, Hashing, RBAC, Data Security. |
| **1:30 - 3:00** | **Admin Dashboard & Employee Roster** | 1. Highlight dashboard KPI cards (Headcount, Present Today, Pending Leaves, Monthly Spend).<br>2. Click **Employees**. Show the list rendered from `vw_employee_details`.<br>3. Click **Add Employee**. Explain the transaction and auto-creation of login credentials. | Relational Views, Foreign Key constraints, ACID Transactions. |
| **3:00 - 4:30** | **Attendance & Integrity Trigger** | 1. Navigate to **Attendance**.<br>2. Demonstrate marking attendance.<br>3. Explain trigger `trg_attendance_before_insert`: attempting to insert future dates or inactive employee punches is rejected with error code 45000. | Database Triggers, Temporal Integrity, Signal SQLSTATE 45000. |
| **4:30 - 6:00** | **Leave Workflow & Overlap Detection** | 1. Navigate to **Leaves**.<br>2. Show pending leave requests and approve one.<br>3. Explain how SQL checks prevent inverted dates (`end_date < start_date`) and block overlapping date spans. | CHECK constraints, Temporal overlap queries. |
| **6:00 - 7:30** | **Payroll Engine & Salary Slip** | 1. Navigate to **Payroll**.<br>2. Click **Generate Payroll**. Show how the stored procedure `sp_calculate_monthly_payroll` computes working days (excluding Sundays via `fn_working_days`) and net pay.<br>3. Click **View Slip** on any record to show the branded TechNova Solutions salary slip.<br>4. Click **Print Slip** to show the print-ready CSS stylesheet. | Stored Procedures, User-Defined Functions (UDFs), Print Media Queries. |
| **7:30 - 8:45** | **Audit Trail Demonstration** | 1. Go to an employee profile and update their basic salary.<br>2. Open MySQL CLI and run: `SELECT * FROM salary_audit;`<br>3. Show the newly added audit row proving the trigger `trg_employees_after_salary_update` fired automatically. | Audit Logging, Event-driven Triggers, Data Governance. |
| **8:45 - 10:00** | **Academic Reports & Employee Self-Service** | 1. Click **DBMS Reports**. Show the 10 academic queries and click "Toggle SQL" to display the raw query.<br>2. Click **Export CSV** to demonstrate real-time dataset streaming.<br>3. Log out and log in as `emp101`. Show the employee portal (Punch In/Out, personal calendar, payslips) and demonstrate that attempting to access `/admin/employees` returns **403 Forbidden**. | Joins, Aggregation, Subqueries, CSV Generation, Authorization isolation. |

---

## 🛠️ Troubleshooting & Common Issues

### 1. `mysql.connector.errors.DatabaseError: 2003: Can't connect to MySQL server`
- **Cause:** MySQL server is not running on port 3306.
- **Solution:** Open XAMPP Control Panel and click **Start** next to MySQL, or run `C:\xampp\mysql\bin\mysqld.exe --standalone` in an administrative terminal.

### 2. `Access denied for user 'root'@'localhost'`
- **Cause:** Your local MySQL installation has a root password set, but `config.py` has an empty password.
- **Solution:** Open `config.py` and update `'password': 'your_mysql_password'`.

### 3. `Address already in use` (Port 5000)
- **Cause:** Another background instance of Flask or a web service is running on port 5000.
- **Solution:** Run the app on a different port by starting it with:
```bash
python -c "from app import app; app.run(debug=True, port=5001)"
```

### 4. Decimal Multiplication TypeError in Salary Slip
- **Cause:** MySQL `DECIMAL` fields return Python `decimal.Decimal` objects, which cannot be multiplied directly with floats in Jinja2 without casting.
- **Solution:** All calculations in `salary_slip.html` use `| float` filters (e.g., `slip.deductions | float * 0.60`).

---

## 📚 Documentation Index

| File | Content Summary |
|---|---|
| [Project_Report.md](file:///c:/Users/priya/Desktop/dbms%20cap/docs/Project_Report.md) | Full 17-section academic capstone project report with Mermaid ER diagrams, 3NF normalization proof, and data dictionary. |
| [Viva_Questions.md](file:///c:/Users/priya/Desktop/dbms%20cap/docs/Viva_Questions.md) | 45+ comprehensive questions and answers covering DBMS concepts, triggers, procedures, indexes, and normalization. |
| [sql_outputs.md](file:///c:/Users/priya/Desktop/dbms%20cap/docs/sql_outputs.md) | Documented execution outputs from MySQL for all academic laboratory queries. |
| [PROGRESS.md](file:///c:/Users/priya/Desktop/dbms%20cap/docs/PROGRESS.md) | Requirement traceability matrix mapping each phase and feature to its source file. |

---

**Developed for Academic Evaluation – Database Management Systems Capstone 2026**

#   D B M S - C a p s t o n e  
 