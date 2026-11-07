# Project Progress & Requirement Traceability Matrix

## Smart Employee Management System – Payroll & Attendance
**Capstone Project - DBMS Laboratory (3rd Semester CS)**  
**Status:** **100% Complete & Verified**

---

## Phase-by-Phase Implementation Status

### Phase 1: Database Architecture & Assets (`database/`)
| Requirement | Artifact / File | Implementation Details | Verification |
|---|---|---|---|
| 3NF Relational Schema | `database/schema.sql` | 7 tables (`departments`, `employees`, `users`, `attendance`, `leave_requests`, `payroll`, `salary_audit`). InnoDB, utf8mb4, PKs, FKs, CHECKs, UNIQUEs. | **PASSED** (Executed cleanly) |
| Relational Views | `database/views.sql` | `vw_employee_details`, `vw_monthly_attendance_summary`, `vw_employee_payroll_summary`. | **PASSED** (Tested via SQL & views) |
| Stored Functions (UDFs) | `database/functions.sql` | `fn_net_salary`, `fn_working_days` (excluding Sundays), `fn_total_present_days`. | **PASSED** (Deterministic calculations verified) |
| Stored Procedures | `database/procedures.sql` | `sp_add_employee`, `sp_calculate_monthly_payroll`, `sp_attendance_summary`. | **PASSED** (Procedural upserts verified) |
| Integrity & Audit Triggers | `database/triggers.sql` | `trg_attendance_before_insert`, `trg_attendance_before_update`, `trg_payroll_before_insert`, `trg_employees_after_salary_update`. | **PASSED** (Future date rejected; salary changes audited) |
| Seed Data & Passwords | `database/sample_data.sql` | 5 departments, 12 employees, 30+ attendance records, leave requests, 3 months payroll (Aug-Oct 2026), scrypt password hashes. | **PASSED** (All 13 user accounts log in) |
| Role-Based Access Control | `database/access_control.sql` | MySQL users and grants for `hr_admin_user`, `employee_viewer`, `report_user`. | **PASSED** (Grants verified) |
| Viva Lab Queries | `database/dbms_lab_queries.sql` | 10 academic query categories (joins, unions, subqueries, group by, correlated subqueries). | **PASSED** (Executed & saved to `docs/sql_outputs.md`) |

---

### Phase 2: Database Initialization Script
| Requirement | Artifact / File | Implementation Details | Verification |
|---|---|---|---|
| Automated DB Setup | `setup_db.py` | Connects via `mysql.connector`, splits routines on `DELIMITER //`, executes scripts in dependency order, drains result sets. | **PASSED** (`python setup_db.py` runs with 0 errors) |

---

### Phase 3: Backend Core Engine & Security (`app.py`, `db.py`, `config.py`)
| Requirement | Artifact / File | Implementation Details | Verification |
|---|---|---|---|
| Configuration & Secret Key | `config.py` | Configurable DB host, port, user, password, DB name, secret key, company title ("TechNova Solutions Pvt. Ltd."). | **PASSED** |
| Connection Pool & Query Helper | `db.py` | Reusable pooled connections, `execute_query()`, `execute_proc()`, and transaction management (`with_transaction()`). | **PASSED** |
| Authentication & Session RBAC | `app.py` | `@login_required`, `@admin_required`, `@employee_required` decorators; session fixation guards; Werkzeug security hashing. | **PASSED** (Role boundaries enforced) |
| CSRF Protection | `app.py` | Token generation per session, hidden input validation on all POST requests. | **PASSED** |

---

### Phase 4: HR Administration Portal
| Route | Method | Controller Logic | View / Template |
|---|---|---|---|
| `/admin/dashboard` | GET | KPI aggregation (staff count, today's attendance, pending leaves, total payroll). | `templates/admin_dashboard.html` |
| `/admin/employees` | GET | Paginated roster with department filters and status badges. | `templates/employees.html` |
| `/admin/employees/add` | GET, POST | Calls `sp_add_employee` or transaction to register employee and auto-generate login credentials. | `templates/employee_form.html` |
| `/admin/employees/<id>/edit` | GET, POST | Updates demographics, salary (triggers audit trigger), and active/inactive status. | `templates/employee_form.html` |
| `/admin/employees/<id>/delete` | POST | Hard delete (with FK cascade) or soft delete confirmation dialog. | In-line button with JS `confirm()` |
| `/admin/departments` | GET, POST | Add new department, view department list with employee headcount counts. | `templates/departments.html` |
| `/admin/attendance` | GET, POST | Mark attendance for date, view daily list, quick-mark status. | `templates/attendance.html` |
| `/admin/leaves` | GET, POST | Approve or reject pending leave requests with reviewer notes. | `templates/leave.html` |
| `/admin/payroll` | GET, POST | Single employee or bulk batch payroll generation via `sp_calculate_monthly_payroll`. | `templates/payroll.html` |
| `/payroll/<id>/slip` | GET | Branded salary slip with earnings/deductions breakdown and print stylesheet. | `templates/salary_slip.html` |

---

### Phase 5: Employee Self-Service Portal
| Route | Method | Controller Logic | View / Template |
|---|---|---|---|
| `/employee/dashboard` | GET | Punch status for today, monthly presence percentage, upcoming leaves, latest payslip. | `templates/employee_dashboard.html` |
| `/employee/punch` | POST | Real-time Punch-In / Punch-Out recording to `attendance` table. | Dashboard action button |
| `/employee/attendance` | GET | Monthly attendance calendar view with status color coding. | `templates/employee_attendance.html` |
| `/employee/leaves` | GET, POST | Apply for leave with date range checks (`end_date >= start_date`) and overlap validation. | `templates/employee_leaves.html` |
| `/employee/payroll` | GET | Historic payslip roster with secure access isolation (cannot view peer payslips). | `templates/employee_payroll.html` |
| `/profile` | GET, POST | View contact details, change password. | `templates/profile.html` |

---

### Phase 6: Academic DBMS Reports
| Route | Method | Description | Export |
|---|---|---|---|
| `/reports` | GET | Executes 10 classic DBMS queries (salary ranking, department averages, absent lists, etc.). Collapsible SQL query viewer included. | Interactive cards |
| `/reports/export/<name>` | GET | Exports any report's live dataset directly to CSV format. | Streaming CSV download |

---

### Phase 7: Verification & Test Suite
| Test Suite / Script | Coverage | Result |
|---|---|---|
| `test_runner.py` | 10 automated test suites covering Auth, RBAC, Triggers, Cascades, Overlapping Leaves, and Procedures. | **10 / 10 Tests Passed (100%)** |
| `capture_sql_outputs.py` | Executes all queries from `database/dbms_lab_queries.sql` and writes raw formatted tabular outputs to `docs/sql_outputs.md`. | **100% Verified** |
| Playwright Screenshots | High-definition 1280x800 captures of all 10 major pages in `docs/screenshots/`. | **10 Screenshots Generated** |

---

### Phase 8: Documentation & Viva Preparation
| Document | Purpose | Status |
|---|---|---|
| `docs/Project_Report.md` | Formal 17-section academic capstone report including ER diagram, 3NF normalization analysis, and data dictionary. | **Complete** |
| `docs/Viva_Questions.md` | 45+ comprehensive questions and answers covering DBMS concepts, triggers, procedures, indexes, and normalization. | **Complete** |
| `docs/sql_outputs.md` | Actual execution outputs from MySQL for all academic lab queries. | **Complete** |
| `README.md` | Complete student setup manual, demo credentials, directory layout, and 10-minute viva presentation script. | **Ready for Review** |

