"""
Database Connection & Query Helper Module
Implements plain parameterized SQL execution using mysql.connector.
Strictly NO ORM. Every query uses parameterized placeholders (%s).
"""
import mysql.connector
from mysql.connector import Error, errorcode
from config import Config

def get_db_connection(dictionary=True):
    """
    Creates and returns a raw MySQL database connection.
    Caller is responsible for closing the connection or using it with context managers.
    """
    try:
        conn = mysql.connector.connect(
            host=Config.DB_HOST,
            port=Config.DB_PORT,
            user=Config.DB_USER,
            password=Config.DB_PASSWORD,
            database=Config.DB_NAME,
            autocommit=False  # Explicit transaction control
        )
        return conn
    except Error as err:
        print(f"[DB ERROR] Connection failed: {err}")
        raise err

def execute_query(sql, params=None, fetchone=False, fetchall=False, commit=False):
    """
    Universal parameterized query helper with error logging.
    Guarantees parameterization to prevent SQL injection vulnerabilities.
    
    :param sql: Parameterized SQL string with %s placeholders
    :param params: Tuple or list of parameter values
    :param fetchone: If True, returns a single dictionary row
    :param fetchall: If True, returns a list of dictionary rows
    :param commit: If True, commits the transaction immediately
    :return: Query results or lastrowid/affected_rows
    """
    conn = None
    cursor = None
    try:
        conn = get_db_connection(dictionary=True)
        cursor = conn.cursor(dictionary=True)
        cursor.execute(sql, params or ())
        
        result = None
        if fetchone:
            result = cursor.fetchone()
        elif fetchall:
            result = cursor.fetchall()
        else:
            result = {
                'last_insert_id': cursor.lastrowid,
                'affected_rows': cursor.rowcount
            }
            
        if commit:
            conn.commit()
            
        return result
    except Error as err:
        if conn and commit:
            conn.rollback()
        print(f"[DB EXECUTION ERROR] {err.msg} (SQLState: {err.sqlstate}, Code: {err.errno})")
        raise err
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

def execute_procedure(proc_name, params=None):
    """
    Calls a stored procedure with explicit IN parameters and extracts result sets.
    """
    conn = None
    cursor = None
    try:
        conn = get_db_connection(dictionary=True)
        cursor = conn.cursor(dictionary=True)
        cursor.callproc(proc_name, params or ())
        
        results = []
        for result in cursor.stored_results():
            results.extend(result.fetchall())
            
        conn.commit()
        return results
    except Error as err:
        if conn:
            conn.rollback()
        print(f"[DB PROCEDURE ERROR] {err.msg}")
        raise err
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

