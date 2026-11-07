"""
Smart Employee Management System – Payroll & Attendance
Backend Application: Flask (Python 3.10+) with Plain mysql.connector
Strictly NO ORM. Raw Parameterized SQL (%s) and Stored Routines throughout.
"""
import os
import secrets
import csv
import io
from datetime import datetime, date
from functools import wraps
from flask import (
    Flask, render_template, request, redirect, url_for,
    flash, session, abort, Response
)
from werkzeug.security import generate_password_hash, check_password_hash
import mysql.connector

from config import Config
import db

app = Flask(__name__)
app.config.from_object(Config)

# Month Names Utility Map
MONTH_NAMES = [
    '', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
]

@app.context_processor
def inject_globals():
    """Inject company metadata and helpers globally into all Jinja2 templates."""
    return {
        'config': Config,
        'month_names': MONTH_NAMES,
        'current_year': datetime.now().year,
        'today_str': date.today().isoformat()
    }

# -----------------------------------------------------------------------------
# AUTHENTICATION & CSRF DECORATORS
# -----------------------------------------------------------------------------
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('user_id'):
            flash('Please log in to access this page.', 'error')
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('user_id') or session.get('role') != 'Admin':
            abort(403)
        return f(*args, **kwargs)
    return decorated_function

@app.before_request
def verify_csrf():
    """Simple CSRF protection verifying session csrf_token on all state-changing POST requests."""
    if request.method == 'POST':
        # Ensure session exists
        if not session.get('csrf_token'):
            session['csrf_token'] = secrets.token_hex(16)
            
        token = request.form.get('csrf_token')
        if not token or token != session.get('csrf_token'):
            flash('Security session mismatch or invalid CSRF token. Please retry.', 'error')
            return redirect(request.referrer or url_for('login'))

# -----------------------------------------------------------------------------
# AUTHENTICATION ROUTES
# -----------------------------------------------------------------------------
@app.route('/login', methods=['GET', 'POST'])
def login():
    if session.get('user_id'):
        if session.get('role') == 'Admin':
            return redirect(url_for('admin_dashboard'))
        return redirect(url_for('employee_dashboard'))

    if not session.get('csrf_token'):
        session['csrf_token'] = secrets.token_hex(16)

    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '').strip()

        if not username or not password:
            flash('Username and password are required.', 'error')
            return render_template('login.html')

        user = db.execute_query(
            """SELECT u.user_id, u.username, u.password_hash, u.role, u.employee_id,
                      e.employee_name, e.employment_status, e.designation, d.department_name
               FROM users u
               LEFT JOIN employees e ON u.employee_id = e.employee_id
               LEFT JOIN departments d ON e.department_id = d.department_id
               WHERE u.username = %s""",
            (username,), fetchone=True
        )

        if not user or not check_password_hash(user['password_hash'], password):
            flash('Invalid username or password.', 'error')
            return render_template('login.html')

        if user['role'] == 'Employee' and user['employment_status'] == 'Inactive':
            flash('This employee account has been deactivated. Contact HR.', 'error')
            return render_template('login.html')

        # Establish secure session
        session.clear()
        session['csrf_token'] = secrets.token_hex(16)
        session['user_id'] = user['user_id']
        session['username'] = user['username']
        session['role'] = user['role']
        session['employee_id'] = user['employee_id']
        session['employee_name'] = user['employee_name'] or 'Administrator'
        session['department_name'] = user['department_name'] or 'Corporate'

        flash(f'Welcome back, {session["employee_name"]}!', 'success')
        if user['role'] == 'Admin':
            return redirect(url_for('admin_dashboard'))
        return redirect(url_for('employee_dashboard'))

    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    flash('You have been signed out safely.', 'info')
    return redirect(url_for('login'))

@app.route('/')
def index():
    if session.get('user_id'):
        if session.get('role') == 'Admin':
            return redirect(url_for('admin_dashboard'))
        return redirect(url_for('employee_dashboard'))
    return redirect(url_for('login'))

# -----------------------------------------------------------------------------
# ADMIN DASHBOARD
# -----------------------------------------------------------------------------
@app.route('/admin/dashboard')
@admin_required
def admin_dashboard():
    today = date.today().isoformat()
    now = datetime.now()
    cur_month = now.month
    cur_year = now.year

    # 1. Staff Headcount
    emp_stats = db.execute_query(
        """SELECT 
            COUNT(*) AS total_employees,
            SUM(CASE WHEN employment_status = 'Active' THEN 1 ELSE 0 END) AS active_employees,
            SUM(CASE WHEN employment_status = 'Inactive' THEN 1 ELSE 0 END) AS inactive_employees
           FROM employees""",
        fetchone=True
    )

    # 2. Total Departments
    dept_count = db.execute_query("SELECT COUNT(*) AS c FROM departments", fetchone=True)['c']

    # 3. Attendance Today
    today_att = db.execute_query(
        """SELECT 
            SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) AS present_today,
            SUM(CASE WHEN status = 'Late' THEN 1 ELSE 0 END) AS late_today,
            SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) AS absent_today
           FROM attendance WHERE attendance_date = %s""",
        (today,), fetchone=True
    )

    # 4. Pending Leaves Count
    pending_leaves = db.execute_query(
        "SELECT COUNT(*) AS c FROM leave_requests WHERE leave_status = 'Pending'",
        fetchone=True
    )['c']

    # 5. Monthly Payroll Total
    payroll_stat = db.execute_query(
        """SELECT COALESCE(SUM(net_salary), 0) AS total_payroll 
           FROM payroll WHERE month = %s AND year = %s AND payment_status = 'Paid'""",
        (cur_month, cur_year), fetchone=True
    )
    payroll_sum = float(payroll_stat['total_payroll']) if payroll_stat else 0.0

    # If no paid payroll in current month, check previous month
    p_month, p_year = cur_month, cur_year
    if payroll_sum == 0.0:
        prev_m = 12 if cur_month == 1 else cur_month - 1
        prev_y = cur_year - 1 if cur_month == 1 else cur_year
        prev_stat = db.execute_query(
            """SELECT COALESCE(SUM(net_salary), 0) AS total_payroll 
               FROM payroll WHERE month = %s AND year = %s AND payment_status = 'Paid'""",
            (prev_m, prev_y), fetchone=True
        )
        if prev_stat and float(prev_stat['total_payroll']) > 0:
            payroll_sum = float(prev_stat['total_payroll'])
            p_month, p_year = prev_m, prev_y

    metrics = {
        'total_employees': emp_stats['total_employees'] or 0,
        'active_employees': emp_stats['active_employees'] or 0,
        'inactive_employees': emp_stats['inactive_employees'] or 0,
        'total_departments': dept_count,
        'present_today': (today_att['present_today'] or 0) + (today_att['late_today'] or 0),
        'late_today': today_att['late_today'] or 0,
        'absent_today': today_att['absent_today'] or 0,
        'pending_leaves': pending_leaves,
        'monthly_payroll_total': payroll_sum,
        'payroll_month': p_month,
        'payroll_year': p_year
    }

    # Department distribution
    dept_distribution = db.execute_query(
        """SELECT d.department_name, COUNT(e.employee_id) AS count
           FROM departments d
           LEFT JOIN employees e ON d.department_id = e.department_id AND e.employment_status = 'Active'
           GROUP BY d.department_id, d.department_name
           ORDER BY count DESC""",
        fetchall=True
    )

    # Monthly Payroll Summary Bar Trends (Last 3 Periods)
    payroll_trends = db.execute_query(
        """SELECT month, year, CONCAT(SUBSTRING(MONTHNAME(STR_TO_DATE(month, '%m')), 1, 3), ' ', year) AS period_label,
                  COALESCE(SUM(net_salary), 0) AS total_net
           FROM payroll
           GROUP BY year, month
           ORDER BY year DESC, month DESC
           LIMIT 4""",
        fetchall=True
    )
    if payroll_trends:
        payroll_trends.reverse()

    # Recent Pending Leaves
    recent_leaves = db.execute_query(
        """SELECT l.leave_id, e.employee_name, d.department_name, l.leave_type,
                  DATE_FORMAT(l.start_date, '%d %b') AS start_date,
                  DATE_FORMAT(l.end_date, '%d %b') AS end_date,
                  DATEDIFF(l.end_date, l.start_date) + 1 AS duration_days,
                  l.reason, l.leave_status
           FROM leave_requests l
           JOIN employees e ON l.employee_id = e.employee_id
           LEFT JOIN departments d ON e.department_id = d.department_id
           WHERE l.leave_status = 'Pending'
           ORDER BY l.leave_id DESC
           LIMIT 5""",
        fetchall=True
    )

    # Recent Attendance Swipes Today
    recent_punches = db.execute_query(
        """SELECT a.attendance_id, e.employee_name, d.department_name,
                  TIME_FORMAT(a.check_in, '%H:%i') AS check_in,
                  TIME_FORMAT(a.check_out, '%H:%i') AS check_out,
                  a.status
           FROM attendance a
           JOIN employees e ON a.employee_id = e.employee_id
           LEFT JOIN departments d ON e.department_id = d.department_id
           WHERE a.attendance_date = %s
           ORDER BY a.attendance_id DESC
           LIMIT 6""",
        (today,), fetchall=True
    )

    return render_template(
        'admin_dashboard.html',
        metrics=metrics,
        dept_distribution=dept_distribution,
        payroll_trends=payroll_trends,
        recent_leaves=recent_leaves,
        recent_punches=recent_punches
    )

# -----------------------------------------------------------------------------
# EMPLOYEE MANAGEMENT (CRUD with Pagination & Filters)
# -----------------------------------------------------------------------------
@app.route('/admin/employees')
@admin_required
def employees_list():
    search = request.args.get('search', '').strip()
    dept_id = request.args.get('department_id', '')
    status = request.args.get('status', '')
    page = int(request.args.get('page', 1))
    per_page = 8
    offset = (page - 1) * per_page

    where_clauses = ["1=1"]
    params = []

    if search:
        where_clauses.append("(e.employee_name LIKE %s OR e.email LIKE %s OR e.designation LIKE %s)")
        wildcard = f"%{search}%"
        params.extend([wildcard, wildcard, wildcard])

    if dept_id:
        where_clauses.append("e.department_id = %s")
        params.append(int(dept_id))

    if status:
        where_clauses.append("e.employment_status = %s")
        params.append(status)

    where_sql = " AND ".join(where_clauses)

    count_sql = f"SELECT COUNT(*) AS c FROM employees e WHERE {where_sql}"
    total_count = db.execute_query(count_sql, tuple(params), fetchone=True)['c']
    total_pages = max(1, (total_count + per_page - 1) // per_page)

    query_sql = f"""
        SELECT e.employee_id, e.employee_name, e.email, e.phone, e.designation,
               e.basic_salary, e.employment_status, e.joining_date,
               d.department_name
        FROM employees e
        LEFT JOIN departments d ON e.department_id = d.department_id
        WHERE {where_sql}
        ORDER BY e.employee_id DESC
        LIMIT %s OFFSET %s
    """
    params.extend([per_page, offset])
    employees = db.execute_query(query_sql, tuple(params), fetchall=True)
    departments = db.execute_query("SELECT department_id, department_name FROM departments ORDER BY department_name", fetchall=True)

    return render_template(
        'employees.html',
        employees=employees,
        departments=departments,
        total_count=total_count,
        current_page=page,
        total_pages=total_pages,
        search_query=search,
        selected_dept=int(dept_id) if dept_id else '',
        selected_status=status
    )

@app.route('/admin/employees/add', methods=['GET', 'POST'])
@admin_required
def employee_add():
    departments = db.execute_query("SELECT department_id, department_name FROM departments ORDER BY department_name", fetchall=True)

    if request.method == 'POST':
        name = request.form.get('employee_name', '').strip()
        email = request.form.get('email', '').strip()
        phone = request.form.get('phone', '').strip() or None
        gender = request.form.get('gender', 'Male')
        dob = request.form.get('date_of_birth') or None
        joining_date = request.form.get('joining_date')
        dept_id = request.form.get('department_id') or None
        designation = request.form.get('designation', '').strip()
        salary_str = request.form.get('basic_salary', '0').strip()
        address = request.form.get('address', '').strip() or None
        username = request.form.get('username', '').strip() or email.split('@')[0]
        plain_pass = request.form.get('password', '').strip() or 'Emp@123'

        if not name or not email or not joining_date or not designation or not salary_str:
            flash('Name, email, joining date, designation, and basic salary are required.', 'error')
            return render_template('employee_form.html', employee=None, departments=departments)

        try:
            basic_salary = float(salary_str)
            if basic_salary < 0:
                raise ValueError("Salary must be positive")
        except ValueError:
            flash('Basic salary must be a valid non-negative number.', 'error')
            return render_template('employee_form.html', employee=None, departments=departments)

        hashed_pass = generate_password_hash(plain_pass)

        # Execute Stored Procedure sp_add_employee inside atomic transaction
        conn = None
        cursor = None
        try:
            conn = db.get_db_connection()
            cursor = conn.cursor()
            
            # OUT param container
            args = [
                name, email, phone, address, gender, dob, joining_date,
                int(dept_id) if dept_id else None, designation, basic_salary,
                username, hashed_pass, 0
            ]
            result_args = cursor.callproc('sp_add_employee', args)
            conn.commit()
            new_emp_id = result_args[12]

            flash(f'Employee {name} registered successfully (ID: EMP-{new_emp_id:04d}). Login username: {username}', 'success')
            return redirect(url_for('employees_list'))
        except mysql.connector.Error as err:
            if conn:
                conn.rollback()
            if err.errno == 1062:
                flash('An employee or user with this email or username already exists (UNIQUE violation).', 'error')
            else:
                flash(f'Database error: {err.msg}', 'error')
            return render_template('employee_form.html', employee=None, departments=departments)
        finally:
            if cursor: cursor.close()
            if conn: conn.close()

    return render_template('employee_form.html', employee=None, departments=departments)

@app.route('/admin/employees/<int:emp_id>/edit', methods=['GET', 'POST'])
@admin_required
def employee_edit(emp_id):
    emp = db.execute_query("SELECT * FROM employees WHERE employee_id = %s", (emp_id,), fetchone=True)
    if not emp:
        flash('Employee not found.', 'error')
        return redirect(url_for('employees_list'))

    departments = db.execute_query("SELECT department_id, department_name FROM departments ORDER BY department_name", fetchall=True)

    if request.method == 'POST':
        name = request.form.get('employee_name', '').strip()
        email = request.form.get('email', '').strip()
        phone = request.form.get('phone', '').strip() or None
        gender = request.form.get('gender', 'Male')
        dob = request.form.get('date_of_birth') or None
        joining_date = request.form.get('joining_date')
        dept_id = request.form.get('department_id') or None
        designation = request.form.get('designation', '').strip()
        salary_str = request.form.get('basic_salary', '0').strip()
        address = request.form.get('address', '').strip() or None
        status = request.form.get('employment_status', 'Active')

        try:
            basic_salary = float(salary_str)
        except ValueError:
            flash('Invalid salary figure.', 'error')
            return render_template('employee_form.html', employee=emp, departments=departments)

        try:
            # Modifying basic_salary fires trigger: trg_employees_after_salary_update
            db.execute_query(
                """UPDATE employees SET 
                    employee_name = %s, email = %s, phone = %s, gender = %s,
                    date_of_birth = %s, joining_date = %s, department_id = %s,
                    designation = %s, basic_salary = %s, address = %s,
                    employment_status = %s
                   WHERE employee_id = %s""",
                (name, email, phone, gender, dob, joining_date,
                 int(dept_id) if dept_id else None, designation, basic_salary,
                 address, status, emp_id),
                commit=True
            )
            flash(f'Employee details updated. (If basic salary was changed, revision was captured by trigger).', 'success')
            return redirect(url_for('employee_detail', emp_id=emp_id))
        except mysql.connector.Error as err:
            flash(f'Database update error: {err.msg}', 'error')

    return render_template('employee_form.html', employee=emp, departments=departments)

@app.route('/admin/employees/<int:emp_id>/detail')
@admin_required
def employee_detail(emp_id):
    emp = db.execute_query("SELECT * FROM vw_employee_details WHERE employee_id = %s", (emp_id,), fetchone=True)
    if not emp:
        flash('Employee not found.', 'error')
        return redirect(url_for('employees_list'))

    audit_logs = db.execute_query(
        """SELECT audit_id, old_salary, new_salary, changed_at, changed_by 
           FROM salary_audit WHERE employee_id = %s ORDER BY audit_id DESC""",
        (emp_id,), fetchall=True
    )
    return render_template('employee_detail.html', employee=emp, audit_logs=audit_logs)

@app.route('/admin/employees/<int:emp_id>/toggle-status', methods=['POST'])
@admin_required
def employee_toggle_status(emp_id):
    emp = db.execute_query("SELECT employment_status, employee_name FROM employees WHERE employee_id = %s", (emp_id,), fetchone=True)
    if not emp:
        flash('Employee not found.', 'error')
        return redirect(url_for('employees_list'))

    new_status = 'Inactive' if emp['employment_status'] == 'Active' else 'Active'
    db.execute_query("UPDATE employees SET employment_status = %s WHERE employee_id = %s", (new_status, emp_id), commit=True)
    flash(f"{emp['employee_name']} marked as {new_status} (Soft-Delete demonstration).", 'info')
    return redirect(request.referrer or url_for('employees_list'))

@app.route('/admin/employees/<int:emp_id>/delete', methods=['POST'])
@admin_required
def employee_delete(emp_id):
    emp = db.execute_query("SELECT employee_name FROM employees WHERE employee_id = %s", (emp_id,), fetchone=True)
    if not emp:
        flash('Employee not found.', 'error')
        return redirect(url_for('employees_list'))

    try:
        # ON DELETE CASCADE handles users, attendance, leave_requests, payroll
        db.execute_query("DELETE FROM employees WHERE employee_id = %s", (emp_id,), commit=True)
        flash(f"Employee {emp['employee_name']} and all cascaded relational records were purged permanently.", 'info')
    except mysql.connector.Error as err:
        flash(f"Deletion failed: {err.msg}", 'error')

    return redirect(url_for('employees_list'))

# -----------------------------------------------------------------------------
# DEPARTMENT MANAGEMENT
# -----------------------------------------------------------------------------
@app.route('/admin/departments', methods=['GET', 'POST'])
@admin_required
def departments_list():
    edit_id = request.args.get('edit')
    edit_dept = None
    if edit_id:
        edit_dept = db.execute_query("SELECT * FROM departments WHERE department_id = %s", (int(edit_id),), fetchone=True)

    if request.method == 'POST':
        name = request.form.get('department_name', '').strip()
        desc = request.form.get('description', '').strip() or None

        if not name:
            flash('Department name is required.', 'error')
            return redirect(url_for('departments_list'))

        try:
            db.execute_query("INSERT INTO departments (department_name, description) VALUES (%s, %s)", (name, desc), commit=True)
            flash(f"Department '{name}' created successfully.", 'success')
        except mysql.connector.Error as err:
            if err.errno == 1062:
                flash('A department with this name already exists.', 'error')
            else:
                flash(f"Database error: {err.msg}", 'error')
        return redirect(url_for('departments_list'))

    depts = db.execute_query(
        """SELECT d.department_id, d.department_name, d.description,
                  COUNT(e.employee_id) AS total_employees,
                  SUM(CASE WHEN e.employment_status = 'Active' THEN 1 ELSE 0 END) AS active_employees
           FROM departments d
           LEFT JOIN employees e ON d.department_id = e.department_id
           GROUP BY d.department_id, d.department_name, d.description
           ORDER BY d.department_name ASC""",
        fetchall=True
    )
    return render_template('departments.html', departments=depts, edit_dept=edit_dept)

@app.route('/admin/departments/<int:dept_id>/edit', methods=['POST'])
@admin_required
def department_edit(dept_id):
    name = request.form.get('department_name', '').strip()
    desc = request.form.get('description', '').strip() or None

    if not name:
        flash('Department name is required.', 'error')
        return redirect(url_for('departments_list'))

    try:
        db.execute_query("UPDATE departments SET department_name = %s, description = %s WHERE department_id = %s", (name, desc, dept_id), commit=True)
        flash(f"Department '{name}' updated.", 'success')
    except mysql.connector.Error as err:
        flash(f"Update failed: {err.msg}", 'error')

    return redirect(url_for('departments_list'))

@app.route('/admin/departments/<int:dept_id>/delete', methods=['POST'])
@admin_required
def department_delete(dept_id):
    # Foreign key check: block deleting department with employees
    staff = db.execute_query("SELECT COUNT(*) AS c FROM employees WHERE department_id = %s", (dept_id,), fetchone=True)['c']
    if staff > 0:
        flash(f'Cannot delete department: {staff} employees are currently assigned to it. Reassign employees first.', 'error')
        return redirect(url_for('departments_list'))

    try:
        db.execute_query("DELETE FROM departments WHERE department_id = %s", (dept_id,), commit=True)
        flash('Department deleted.', 'info')
    except mysql.connector.Error as err:
        flash(f"Error deleting department: {err.msg}", 'error')

    return redirect(url_for('departments_list'))

# -----------------------------------------------------------------------------
# ATTENDANCE MANAGEMENT
# -----------------------------------------------------------------------------
@app.route('/admin/attendance')
@admin_required
def admin_attendance():
    sel_date = request.args.get('date', date.today().isoformat())
    sel_dept = request.args.get('department_id', '')
    sel_status = request.args.get('status', '')

    where_clauses = ["a.attendance_date = %s"]
    params = [sel_date]

    if sel_dept:
        where_clauses.append("e.department_id = %s")
        params.append(int(sel_dept))

    if sel_status:
        where_clauses.append("a.status = %s")
        params.append(sel_status)

    where_sql = " AND ".join(where_clauses)
    records = db.execute_query(
        f"""SELECT a.attendance_id, a.employee_id, e.employee_name, d.department_name,
                  TIME_FORMAT(a.check_in, '%H:%i') AS check_in,
                  TIME_FORMAT(a.check_out, '%H:%i') AS check_out,
                  a.status
           FROM attendance a
           JOIN employees e ON a.employee_id = e.employee_id
           LEFT JOIN departments d ON e.department_id = d.department_id
           WHERE {where_sql}
           ORDER BY a.employee_id ASC""",
        tuple(params), fetchall=True
    )

    departments = db.execute_query("SELECT department_id, department_name FROM departments ORDER BY department_name", fetchall=True)
    active_employees = db.execute_query("SELECT employee_id, employee_name, designation FROM employees WHERE employment_status = 'Active' ORDER BY employee_name", fetchall=True)

    return render_template(
        'attendance.html',
        attendance_records=records,
        departments=departments,
        active_employees=active_employees,
        selected_date=sel_date,
        selected_dept=int(sel_dept) if sel_dept else '',
        selected_status=sel_status
    )

@app.route('/admin/attendance/mark', methods=['POST'])
@admin_required
def admin_attendance_mark():
    emp_id = request.form.get('employee_id')
    att_date = request.form.get('attendance_date')
    status = request.form.get('status')
    check_in = request.form.get('check_in') or None
    check_out = request.form.get('check_out') or None

    if status == 'Absent':
        check_in = None
        check_out = None

    try:
        # Protected by trigger: trg_attendance_before_insert (blocks future dates, inactive staff)
        db.execute_query(
            """INSERT INTO attendance (employee_id, attendance_date, check_in, check_out, status)
               VALUES (%s, %s, %s, %s, %s)
               ON DUPLICATE KEY UPDATE 
                 check_in = VALUES(check_in),
                 check_out = VALUES(check_out),
                 status = VALUES(status)""",
            (emp_id, att_date, check_in, check_out, status),
            commit=True
        )
        flash('Attendance record updated successfully.', 'success')
    except mysql.connector.Error as err:
        flash(f"Validation failure: {err.msg}", 'error')

    return redirect(url_for('admin_attendance', date=att_date))

@app.route('/admin/attendance/bulk', methods=['POST'])
@admin_required
def admin_attendance_bulk():
    att_date = request.form.get('attendance_date', date.today().isoformat())
    
    # Bulk insert for all active employees without records on date
    conn = None
    try:
        conn = db.get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO attendance (employee_id, attendance_date, check_in, check_out, status)
               SELECT e.employee_id, %s, '09:00:00', '18:00:00', 'Present'
               FROM employees e
               WHERE e.employment_status = 'Active'
                 AND NOT EXISTS (
                     SELECT 1 FROM attendance a 
                     WHERE a.employee_id = e.employee_id AND a.attendance_date = %s
                 )""",
            (att_date, att_date)
        )
        count = cursor.rowcount
        conn.commit()
        cursor.close()
        flash(f"Bulk attendance recorded: {count} active employees marked as Present for {att_date}.", 'success')
    except mysql.connector.Error as err:
        if conn: conn.rollback()
        flash(f"Bulk operation failed: {err.msg}", 'error')
    finally:
        if conn: conn.close()

    return redirect(url_for('admin_attendance', date=att_date))

# -----------------------------------------------------------------------------
# LEAVE APPROVAL WORKFLOW
# -----------------------------------------------------------------------------
@app.route('/admin/leaves')
@admin_required
def admin_leaves():
    status = request.args.get('status', '')
    where_sql = "WHERE 1=1"
    params = []
    if status:
        where_sql += " AND l.leave_status = %s"
        params.append(status)

    leaves = db.execute_query(
        f"""SELECT l.leave_id, l.employee_id, e.employee_name, d.department_name,
                  l.leave_type, l.start_date, l.end_date,
                  DATEDIFF(l.end_date, l.start_date) + 1 AS duration_days,
                  l.reason, l.leave_status, l.applied_date, l.action_by, l.action_comment
           FROM leave_requests l
           JOIN employees e ON l.employee_id = e.employee_id
           LEFT JOIN departments d ON e.department_id = d.department_id
           {where_sql}
           ORDER BY l.leave_id DESC""",
        tuple(params), fetchall=True
    )
    return render_template('leave.html', leaves=leaves, selected_status=status)

@app.route('/admin/leaves/<int:leave_id>/status', methods=['POST'])
@admin_required
def admin_leave_status(leave_id):
    status = request.form.get('status')
    comment = request.form.get('comment', '').strip() or None

    if status not in ('Approved', 'Rejected'):
        flash('Invalid status.', 'error')
        return redirect(url_for('admin_leaves'))

    try:
        db.execute_query(
            """UPDATE leave_requests SET 
                leave_status = %s, action_by = %s, action_comment = %s
               WHERE leave_id = %s""",
            (status, session.get('username'), comment, leave_id),
            commit=True
        )
        flash(f"Leave request marked as {status}.", 'success')
    except mysql.connector.Error as err:
        flash(f"Failed to update leave: {err.msg}", 'error')

    return redirect(request.referrer or url_for('admin_leaves'))

# -----------------------------------------------------------------------------
# PAYROLL & SALARY SLIPS
# -----------------------------------------------------------------------------
@app.route('/admin/payroll')
@admin_required
def admin_payroll():
    now = datetime.now()
    month = int(request.args.get('month', now.month))
    year = int(request.args.get('year', now.year))

    payroll_records = db.execute_query(
        """SELECT p.payroll_id, p.employee_id, e.employee_name, e.designation,
                  d.department_name, p.basic_salary, p.allowances, p.deductions,
                  p.working_days, p.present_days, p.net_salary, p.payment_status
           FROM payroll p
           JOIN employees e ON p.employee_id = e.employee_id
           LEFT JOIN departments d ON e.department_id = d.department_id
           WHERE p.month = %s AND p.year = %s
           ORDER BY p.payroll_id DESC""",
        (month, year), fetchall=True
    )

    totals = {
        'gross': sum(float(r['basic_salary'] + r['allowances']) for r in payroll_records),
        'deductions': sum(float(r['deductions']) for r in payroll_records),
        'net': sum(float(r['net_salary']) for r in payroll_records)
    }

    active_employees = db.execute_query(
        "SELECT employee_id, employee_name, basic_salary FROM employees WHERE employment_status = 'Active' ORDER BY employee_name",
        fetchall=True
    )

    return render_template(
        'payroll.html',
        payroll_records=payroll_records,
        totals=totals,
        active_employees=active_employees,
        selected_month=month,
        selected_year=year
    )

@app.route('/admin/payroll/generate-single', methods=['POST'])
@admin_required
def admin_payroll_generate_single():
    emp_id = int(request.form.get('employee_id'))
    month = int(request.form.get('month'))
    year = int(request.form.get('year'))
    allow_str = request.form.get('allowances', '').strip()
    deduct_str = request.form.get('deductions', '').strip()

    allowances = float(allow_str) if allow_str else None
    deductions = float(deduct_str) if deduct_str else None

    try:
        # Calls stored procedure: sp_calculate_monthly_payroll(emp_id, month, year, allowances, deductions)
        db.execute_procedure('sp_calculate_monthly_payroll', (emp_id, month, year, allowances, deductions))
        flash(f"Payroll generated for Employee ID {emp_id} using sp_calculate_monthly_payroll.", 'success')
    except mysql.connector.Error as err:
        flash(f"Payroll generation error: {err.msg}", 'error')

    return redirect(url_for('admin_payroll', month=month, year=year))

@app.route('/admin/payroll/generate-all', methods=['POST'])
@admin_required
def admin_payroll_generate_all():
    """
    Batch generation for ALL active employees wrapped in an explicit ACID transaction:
    START TRANSACTION ... COMMIT with ROLLBACK on any failure and SAVEPOINT demonstration.
    """
    month = int(request.form.get('month'))
    year = int(request.form.get('year'))

    conn = None
    cursor = None
    try:
        conn = db.get_db_connection()
        conn.autocommit = False
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT employee_id, basic_salary FROM employees WHERE employment_status = 'Active'")
        active_list = cursor.fetchall()

        # Transaction check-point
        cursor.execute("SAVEPOINT batch_start")

        count = 0
        for emp in active_list:
            emp_id = emp['employee_id']
            basic = float(emp['basic_salary'])
            std_allow = round(basic * 0.10, 2)
            std_deduct = round(basic * 0.05, 2)

            cursor.callproc('sp_calculate_monthly_payroll', (emp_id, month, year, std_allow, std_deduct))
            # Consume any stored results
            for res in cursor.stored_results():
                res.fetchall()
            count += 1

        conn.commit()
        flash(f"Transaction Committed: Successfully batch-generated payroll for {count} active staff for {month}/{year}.", 'success')
    except mysql.connector.Error as err:
        if conn:
            conn.rollback()
        flash(f"Transaction Aborted & Rolled Back: {err.msg}", 'error')
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

    return redirect(url_for('admin_payroll', month=month, year=year))

@app.route('/admin/payroll/<int:payroll_id>/pay', methods=['POST'])
@admin_required
def admin_payroll_pay(payroll_id):
    try:
        db.execute_query("UPDATE payroll SET payment_status = 'Paid' WHERE payroll_id = %s", (payroll_id,), commit=True)
        flash('Payment status marked as Paid.', 'success')
    except mysql.connector.Error as err:
        flash(f"Update failed: {err.msg}", 'error')
    return redirect(request.referrer or url_for('admin_payroll'))

@app.route('/payroll/<int:payroll_id>/slip')
@login_required
def salary_slip_view(payroll_id):
    slip = db.execute_query("SELECT * FROM vw_employee_payroll_summary WHERE payroll_id = %s", (payroll_id,), fetchone=True)
    if not slip:
        abort(404)

    # RBAC Data Isolation Check
    if session.get('role') != 'Admin' and session.get('employee_id') != slip['employee_id']:
        abort(403)

    return render_template('salary_slip.html', slip=slip)

# -----------------------------------------------------------------------------
# MASTER REPORTS (10 Academic DBMS Viva Reports)
# -----------------------------------------------------------------------------
REPORTS_CATALOGUE = [
    {
        'id': 1,
        'title': 'All Employees Complete Directory',
        'category': 'Basic SELECT with Relational JOIN',
        'viva_concept': 'Simple relational projection with an INNER/LEFT JOIN to resolve foreign key department IDs into textual names.',
        'sql': """SELECT e.employee_id, e.employee_name, e.email, e.designation,
       COALESCE(d.department_name, 'Unassigned') AS department,
       e.basic_salary, e.employment_status, e.joining_date
FROM employees e
LEFT JOIN departments d ON e.department_id = d.department_id
ORDER BY e.employee_id ASC;"""
    },
    {
        'id': 2,
        'title': 'Department-wise Headcount & Budget',
        'category': 'GROUP BY & Aggregation (COUNT, SUM, AVG)',
        'viva_concept': 'Demonstrates GROUP BY with aggregate functions COUNT(), SUM(), and AVG() alongside a LEFT OUTER JOIN to include empty departments.',
        'sql': """SELECT d.department_id, d.department_name,
       COUNT(e.employee_id) AS total_staff,
       COALESCE(ROUND(AVG(e.basic_salary), 2), 0) AS average_salary,
       COALESCE(SUM(e.basic_salary), 0) AS total_monthly_budget
FROM departments d
LEFT JOIN employees e ON d.department_id = e.department_id
GROUP BY d.department_id, d.department_name
ORDER BY total_monthly_budget DESC;"""
    },
    {
        'id': 3,
        'title': 'Daily Attendance Swipe Log',
        'category': 'Temporal Date Filtering & Status Aggregation',
        'viva_concept': 'Filtering attendance by exact calendar DATE with calculated status distributions and check-in/out order enforcement.',
        'sql': """SELECT a.attendance_date, a.status,
       COUNT(a.attendance_id) AS swipe_count
FROM attendance a
GROUP BY a.attendance_date, a.status
ORDER BY a.attendance_date DESC, a.status ASC;"""
    },
    {
        'id': 4,
        'title': 'Monthly Attendance Summary (SQL View)',
        'category': 'Database View & Calculated Units',
        'viva_concept': 'Queries the permanent database view vw_monthly_attendance_summary. Computes fractional units: Present=1, Late=1, Half Day=0.5, Absent=0.',
        'sql': """SELECT employee_id, employee_name, department_name,
       attendance_month, attendance_year,
       present_count, late_count, half_day_count, absent_count,
       effective_present_days
FROM vw_monthly_attendance_summary
ORDER BY attendance_year DESC, attendance_month DESC, effective_present_days DESC;"""
    },
    {
        'id': 5,
        'title': 'Employee-wise Attendance Performance',
        'category': 'Stored Function UDF fn_total_present_days',
        'viva_concept': 'Executes stored function fn_total_present_days directly within the SQL SELECT projection list.',
        'sql': """SELECT e.employee_id, e.employee_name, e.designation,
       fn_total_present_days(e.employee_id, MONTH(CURRENT_DATE), YEAR(CURRENT_DATE)) AS current_month_present_units
FROM employees e
WHERE e.employment_status = 'Active'
ORDER BY current_month_present_units DESC;"""
    },
    {
        'id': 6,
        'title': 'Leave Approval Audit & Duration',
        'category': 'Date Arithmetic (DATEDIFF) & Status Filtering',
        'viva_concept': 'Computes leave duration in days via DATEDIFF(end_date, start_date) + 1 and displays approval action history.',
        'sql': """SELECT l.leave_id, e.employee_name, l.leave_type,
       l.start_date, l.end_date,
       DATEDIFF(l.end_date, l.start_date) + 1 AS duration_days,
       l.leave_status, l.action_by, l.action_comment
FROM leave_requests l
JOIN employees e ON l.employee_id = e.employee_id
ORDER BY l.leave_id DESC;"""
    },
    {
        'id': 7,
        'title': 'Monthly Payroll Ledger (SQL View)',
        'category': 'Financial View & Mathematical Deduction',
        'viva_concept': 'Queries vw_employee_payroll_summary. Displays Gross Salary (Basic + Allowances) and Net Salary (Gross - Deductions).',
        'sql': """SELECT payroll_id, employee_name, designation, month, year,
       basic_salary, allowances, gross_salary, deductions,
       working_days, present_days, net_salary, payment_status
FROM vw_employee_payroll_summary
ORDER BY year DESC, month DESC, net_salary DESC;"""
    },
    {
        'id': 8,
        'title': 'Highest-Paid Employee in Each Department',
        'category': 'Correlated Subquery',
        'viva_concept': 'In a correlated subquery, the inner query references outer columns (e.department_id). Evaluates once per outer candidate row.',
        'sql': """SELECT e.employee_id, e.employee_name, d.department_name,
       e.designation, e.basic_salary
FROM employees e
INNER JOIN departments d ON e.department_id = d.department_id
WHERE e.basic_salary = (
    SELECT MAX(sub_e.basic_salary)
    FROM employees sub_e
    WHERE sub_e.department_id = e.department_id
)
ORDER BY e.basic_salary DESC;"""
    },
    {
        'id': 9,
        'title': 'Departments with High Average Salary (HAVING)',
        'category': 'GROUP BY with HAVING Filter',
        'viva_concept': 'Distinguishes WHERE (filters rows before aggregation) from HAVING (filters post-aggregated groups with AVG(basic_salary) >= 60,000).',
        'sql': """SELECT d.department_id, d.department_name,
       COUNT(e.employee_id) AS staff_count,
       ROUND(AVG(e.basic_salary), 2) AS avg_basic_salary,
       SUM(e.basic_salary) AS total_payroll_expenditure
FROM departments d
INNER JOIN employees e ON d.department_id = e.department_id
WHERE e.employment_status = 'Active'
GROUP BY d.department_id, d.department_name
HAVING avg_basic_salary >= 60000.00
ORDER BY avg_basic_salary DESC;"""
    },
    {
        'id': 10,
        'title': 'Employees with Absent Days Logged',
        'category': 'Correlated Subquery with EXISTS',
        'viva_concept': 'Uses relational EXISTS to retrieve only employees with at least one attendance record marked as Absent.',
        'sql': """SELECT e.employee_id, e.employee_name, d.department_name, e.designation,
       (SELECT COUNT(*) FROM attendance a WHERE a.employee_id = e.employee_id AND a.status = 'Absent') AS total_absences
FROM employees e
LEFT JOIN departments d ON e.department_id = d.department_id
WHERE EXISTS (
    SELECT 1 FROM attendance a
    WHERE a.employee_id = e.employee_id AND a.status = 'Absent'
)
ORDER BY total_absences DESC;"""
    }
]

@app.route('/admin/reports')
@admin_required
def reports_view():
    report_id = int(request.args.get('report_id', 1))
    report_meta = next((r for r in REPORTS_CATALOGUE if r['id'] == report_id), REPORTS_CATALOGUE[0])
    
    # Execute raw SQL on MySQL
    rows = db.execute_query(report_meta['sql'], fetchall=True)

    return render_template(
        'reports.html',
        reports_list=REPORTS_CATALOGUE,
        active_report=report_meta,
        result_rows=rows
    )

@app.route('/admin/reports/<int:report_id>/export-csv')
@admin_required
def report_export_csv(report_id):
    report_meta = next((r for r in REPORTS_CATALOGUE if r['id'] == report_id), None)
    if not report_meta:
        abort(404)

    rows = db.execute_query(report_meta['sql'], fetchall=True)
    if not rows:
        flash('No data available to export.', 'info')
        return redirect(url_for('reports_view', report_id=report_id))

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=rows[0].keys())
    writer.writeheader()
    for r in rows:
        writer.writerow(r)

    response = Response(output.getvalue(), mimetype='text/csv')
    response.headers['Content-Disposition'] = f'attachment; filename=report_{report_id}_{date.today().isoformat()}.csv'
    return response

# -----------------------------------------------------------------------------
# EMPLOYEE SELF-SERVICE PORTAL
# -----------------------------------------------------------------------------
@app.route('/employee/dashboard')
@login_required
def employee_dashboard():
    emp_id = session.get('employee_id')
    if not emp_id and session.get('role') == 'Admin':
        return redirect(url_for('admin_dashboard'))

    today = date.today().isoformat()
    now = datetime.now()

    profile = db.execute_query("SELECT * FROM vw_employee_details WHERE employee_id = %s", (emp_id,), fetchone=True)
    today_att = db.execute_query("SELECT check_in, check_out, status FROM attendance WHERE employee_id = %s AND attendance_date = %s", (emp_id, today), fetchone=True)

    # Monthly Attendance Credits via UDF
    att_summary = db.execute_query(
        """SELECT fn_total_present_days(%s, %s, %s) AS effective_days,
                  SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) AS present_count,
                  SUM(CASE WHEN status = 'Late' THEN 1 ELSE 0 END) AS late_count,
                  SUM(CASE WHEN status = 'Half Day' THEN 1 ELSE 0 END) AS half_day_count,
                  SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) AS absent_count
           FROM attendance WHERE employee_id = %s AND MONTH(attendance_date) = %s AND YEAR(attendance_date) = %s""",
        (emp_id, now.month, now.year, emp_id, now.month, now.year), fetchone=True
    )

    work_days = db.execute_query("SELECT fn_working_days(%s, %s) AS wdays", (now.month, now.year), fetchone=True)['wdays']

    recent_leaves = db.execute_query(
        """SELECT leave_type, start_date, end_date, DATEDIFF(end_date, start_date) + 1 AS duration_days, leave_status
           FROM leave_requests WHERE employee_id = %s ORDER BY leave_id DESC LIMIT 3""",
        (emp_id,), fetchall=True
    )

    latest_payroll = db.execute_query(
        "SELECT * FROM payroll WHERE employee_id = %s ORDER BY year DESC, month DESC LIMIT 1",
        (emp_id,), fetchone=True
    )

    return render_template(
        'employee_dashboard.html',
        profile=profile,
        today_attendance=today_att,
        att_summary=att_summary or {'effective_days': 0, 'present_count': 0, 'late_count': 0, 'half_day_count': 0, 'absent_count': 0},
        working_days=work_days,
        recent_leaves=recent_leaves,
        latest_payroll=latest_payroll
    )

@app.route('/employee/punch-in', methods=['POST'])
@login_required
def employee_punch_in():
    emp_id = session.get('employee_id')
    today = date.today().isoformat()
    now_time = datetime.now().strftime('%H:%M:%S')

    hours = datetime.now().hour
    minutes = datetime.now().minute
    status = 'Late' if (hours > 9 or (hours == 9 and minutes > 30)) else 'Present'

    try:
        db.execute_query(
            """INSERT INTO attendance (employee_id, attendance_date, check_in, status)
               VALUES (%s, %s, %s, %s)
               ON DUPLICATE KEY UPDATE 
                 check_in = COALESCE(check_in, VALUES(check_in)),
                 status = COALESCE(status, VALUES(status))""",
            (emp_id, today, now_time, status), commit=True
        )
        flash(f'Punch in recorded at {now_time[:5]} ({status}).', 'success')
    except mysql.connector.Error as err:
        flash(f"Swipe rejected by trigger: {err.msg}", 'error')

    return redirect(url_for('employee_dashboard'))

@app.route('/employee/punch-out', methods=['POST'])
@login_required
def employee_punch_out():
    emp_id = session.get('employee_id')
    today = date.today().isoformat()
    now_time = datetime.now().strftime('%H:%M:%S')

    try:
        res = db.execute_query(
            "UPDATE attendance SET check_out = %s WHERE employee_id = %s AND attendance_date = %s",
            (now_time, emp_id, today), commit=True
        )
        if res.get('affected_rows', 0) == 0:
            flash('No check-in found for today. Please punch in first.', 'error')
        else:
            flash(f'Punch out recorded at {now_time[:5]}.', 'success')
    except mysql.connector.Error as err:
        flash(f"Swipe rejected: {err.msg}", 'error')

    return redirect(url_for('employee_dashboard'))

@app.route('/employee/attendance')
@login_required
def employee_attendance():
    emp_id = session.get('employee_id')
    now = datetime.now()
    month = int(request.args.get('month', now.month))
    year = int(request.args.get('year', now.year))

    records = db.execute_query(
        """SELECT attendance_id, attendance_date, check_in, check_out, status
           FROM attendance
           WHERE employee_id = %s AND MONTH(attendance_date) = %s AND YEAR(attendance_date) = %s
           ORDER BY attendance_date ASC""",
        (emp_id, month, year), fetchall=True
    )

    summary = db.execute_query(
        """SELECT fn_total_present_days(%s, %s, %s) AS effective_days,
                  SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) AS present_count,
                  SUM(CASE WHEN status = 'Late' THEN 1 ELSE 0 END) AS late_count,
                  SUM(CASE WHEN status = 'Half Day' THEN 1 ELSE 0 END) AS half_day_count,
                  SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) AS absent_count
           FROM attendance WHERE employee_id = %s AND MONTH(attendance_date) = %s AND YEAR(attendance_date) = %s""",
        (emp_id, month, year, emp_id, month, year), fetchone=True
    )

    return render_template(
        'employee_attendance.html',
        records=records,
        summary=summary or {'effective_days': 0, 'present_count': 0, 'late_count': 0, 'half_day_count': 0, 'absent_count': 0},
        selected_month=month,
        selected_year=year
    )

@app.route('/employee/leaves', methods=['GET', 'POST'])
@login_required
def employee_leaves():
    emp_id = session.get('employee_id')

    if request.method == 'POST':
        leave_type = request.form.get('leave_type')
        start_date = request.form.get('start_date')
        end_date = request.form.get('end_date')
        reason = request.form.get('reason', '').strip()

        if not leave_type or not start_date or not end_date or not reason:
            flash('All leave application fields are required.', 'error')
            return redirect(url_for('employee_leaves'))

        # 1. Check Constraint end_date >= start_date
        if end_date < start_date:
            flash('End date cannot be earlier than start date (Constraint violation).', 'error')
            return redirect(url_for('employee_leaves'))

        # 2. Business Logic: Block overlapping leave requests
        overlap = db.execute_query(
            """SELECT leave_id, leave_type, start_date, end_date FROM leave_requests
               WHERE employee_id = %s AND leave_status IN ('Pending', 'Approved')
                 AND (%s <= end_date AND %s >= start_date)""",
            (emp_id, start_date, end_date), fetchone=True
        )
        if overlap:
            flash(f"Overlapping leave request: You already have a {overlap['leave_type']} from {overlap['start_date']} to {overlap['end_date']}.", 'error')
            return redirect(url_for('employee_leaves'))

        try:
            db.execute_query(
                "INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, reason) VALUES (%s, %s, %s, %s, %s)",
                (emp_id, leave_type, start_date, end_date, reason), commit=True
            )
            flash('Leave request submitted. Awaiting HR approval.', 'success')
        except mysql.connector.Error as err:
            flash(f"Submission failed: {err.msg}", 'error')

        return redirect(url_for('employee_leaves'))

    leaves = db.execute_query(
        """SELECT leave_id, leave_type, start_date, end_date,
                  DATEDIFF(end_date, start_date) + 1 AS duration_days,
                  reason, leave_status, action_comment
           FROM leave_requests WHERE employee_id = %s ORDER BY leave_id DESC""",
        (emp_id,), fetchall=True
    )
    return render_template('employee_leaves.html', leaves=leaves)

@app.route('/employee/payroll')
@login_required
def employee_payroll():
    emp_id = session.get('employee_id')
    slips = db.execute_query(
        """SELECT payroll_id, month, year, basic_salary, allowances, deductions,
                  working_days, present_days, net_salary, payment_status
           FROM payroll WHERE employee_id = %s ORDER BY year DESC, month DESC""",
        (emp_id,), fetchall=True
    )
    return render_template('employee_payroll.html', slips=slips)

@app.route('/employee/profile', methods=['GET', 'POST'])
@login_required
def employee_profile():
    emp_id = session.get('employee_id')
    if request.method == 'POST':
        phone = request.form.get('phone', '').strip() or None
        address = request.form.get('address', '').strip() or None
        db.execute_query("UPDATE employees SET phone = %s, address = %s WHERE employee_id = %s", (phone, address, emp_id), commit=True)
        flash('Contact details updated successfully.', 'success')
        return redirect(url_for('employee_profile'))

    profile = db.execute_query("SELECT * FROM vw_employee_details WHERE employee_id = %s", (emp_id,), fetchone=True)
    return render_template('profile.html', profile=profile)

# -----------------------------------------------------------------------------
# ERROR HANDLERS (403, 404, 500)
# -----------------------------------------------------------------------------
@app.errorhandler(403)
def forbidden(e):
    return render_template('error.html', code=403, title="Access Forbidden", message="You do not have permission to access another employee's records or administrative controls."), 403

@app.errorhandler(404)
def not_found(e):
    return render_template('error.html', code=404, title="Page Not Found", message="The resource you requested could not be located in this application."), 404

@app.errorhandler(500)
def server_error(e):
    return render_template('error.html', code=500, title="Database / Server Error", message="An unexpected error occurred while executing database operations."), 500

if __name__ == '__main__':
    print("=" * 60)
    print("🚀 Smart Employee Management System (Flask + MySQL 8)")
    print(f"📡 Running locally at: http://127.0.0.1:5000")
    print(f"🏢 Company:           {Config.COMPANY_NAME}")
    print(f"🗄️ Database:          {Config.DB_NAME} on {Config.DB_HOST}")
    print("=" * 60)
    app.run(host='0.0.0.0', port=5000, debug=True)

