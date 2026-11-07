"""
Database Setup & Migration Script for Python / Flask
Executes all SQL files in strict dependency order:
1. schema.sql
2. views.sql
3. functions.sql
4. procedures.sql
5. triggers.sql
6. sample_data.sql
7. access_control.sql
"""
import os
import re
import mysql.connector
from config import Config

def clean_sql_comments(sql_content):
    """Cleanly strip block comments and standalone line comments."""
    cleaned = re.sub(r'/\*[\s\S]*?\*/', '', sql_content)
    cleaned = re.sub(r'--.*$', '', cleaned, flags=re.MULTILINE)
    return cleaned

def execute_sql_file(cursor, file_path):
    """
    Executes an SQL file handling standard statements and DELIMITER // blocks.
    Consumes any unread result sets immediately.
    """
    filename = os.path.basename(file_path)
    print(f"Executing {filename}...")

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    cleaned = clean_sql_comments(content)

    if 'DELIMITER' not in content:
        statements = cleaned.split(';')
        for stmt in statements:
            stmt = stmt.strip()
            if stmt:
                try:
                    cursor.execute(stmt)
                    # If query returned a result set (e.g. SHOW GRANTS), consume it
                    if cursor.with_rows:
                        cursor.fetchall()
                except mysql.connector.Error as err:
                    print(f"Error in {filename}: {err.msg}")
                    print(f"Statement: {stmt[:120]}...")
                    raise err
        return

    # Handle custom DELIMITER // routines
    delimiter_regex = re.compile(r'DELIMITER\s+([^\r\n]+)', re.IGNORECASE)
    last_idx = 0
    current_delim = ';'
    chunks = []

    for match in delimiter_regex.finditer(cleaned):
        chunk_before = cleaned[last_idx:match.start()].strip()
        if chunk_before:
            chunks.append((current_delim, chunk_before))
        current_delim = match.group(1).strip()
        last_idx = match.end()

    remaining = cleaned[last_idx:].strip()
    if remaining:
        chunks.append((current_delim, remaining))

    for delim, block in chunks:
        stmts = block.split(delim)
        for s in stmts:
            s = s.strip()
            if not s:
                continue
            if s.endswith('//'):
                s = s[:-2].strip()
            if s.endswith(';'):
                s = s[:-1].strip()
            if not s:
                continue
            try:
                cursor.execute(s)
                if cursor.with_rows:
                    cursor.fetchall()
            except mysql.connector.Error as err:
                print(f"Error in routine of {filename}: {err.msg}")
                print(f"Statement: {s[:140]}...")
                raise err

def run_setup():
    print("=" * 65)
    print("Smart Employee Management System - Database Initializer")
    print(f"Target: MySQL Server at {Config.DB_HOST}:{Config.DB_PORT}")
    print("=" * 65)

    # 1. Connect without database to ensure database exists
    root_conn = mysql.connector.connect(
        host=Config.DB_HOST,
        port=Config.DB_PORT,
        user=Config.DB_USER,
        password=Config.DB_PASSWORD
    )
    root_cursor = root_conn.cursor()
    root_cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{Config.DB_NAME}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
    root_conn.commit()
    root_cursor.close()
    root_conn.close()
    print(f"Database `{Config.DB_NAME}` verified/created.")

    # 2. Connect to database and execute ordered assets
    conn = mysql.connector.connect(
        host=Config.DB_HOST,
        port=Config.DB_PORT,
        user=Config.DB_USER,
        password=Config.DB_PASSWORD,
        database=Config.DB_NAME
    )
    cursor = conn.cursor()

    base_dir = os.path.dirname(os.path.abspath(__file__))
    sql_files = [
        'schema.sql',
        'views.sql',
        'functions.sql',
        'procedures.sql',
        'triggers.sql',
        'sample_data.sql',
        'access_control.sql'
    ]

    for file_name in sql_files:
        full_path = os.path.join(base_dir, 'database', file_name)
        if os.path.exists(full_path):
            execute_sql_file(cursor, full_path)
            conn.commit()
            print(f"✓ {file_name} completed.")
        else:
            print(f"Warning: {file_name} not found.")

    cursor.close()
    conn.close()

    print("\n" + "=" * 65)
    print("✓ All Database Assets Successfully Installed & Seeded!")
    print("=" * 65)
    print("Demo Logins:")
    print("  Administrator: username = 'admin',   password = 'Admin@123'")
    print("  Employee:      username = 'emp101',  password = 'Emp@123'")
    print("                 username = 'emp102',  password = 'Emp@123'")
    print("                 username = 'emp103',  password = 'Emp@123'")
    print("=" * 65)

if __name__ == '__main__':
    run_setup()
