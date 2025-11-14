"""
Database schema and utility functions for the RAG Chatbot Platform.
"""
import sqlite3
import os
from contextlib import contextmanager
from typing import Optional
from datetime import datetime


# Database configuration
DATABASE_PATH = os.getenv('DATABASE_PATH', './data/chatbots.db')


def get_connection():
    """
    Create and return a database connection.
    
    Returns:
        sqlite3.Connection: Database connection object
    """
    # Ensure the data directory exists
    os.makedirs(os.path.dirname(DATABASE_PATH), exist_ok=True)
    
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row  # Enable column access by name
    
    # Enable foreign key constraints
    conn.execute("PRAGMA foreign_keys = ON")
    
    return conn


@contextmanager
def get_db_connection():
    """
    Context manager for database connections.
    Automatically handles connection closing.
    
    Usage:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(...)
    """
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()


def init_database():
    """
    Initialize the database with required tables.
    Creates chatbots and documents tables if they don't exist.
    """
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Create chatbots table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS chatbots (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                system_prompt TEXT NOT NULL,
                model TEXT DEFAULT 'gemini-2.5-flash',
                status TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create documents table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                id TEXT PRIMARY KEY,
                chatbot_id TEXT NOT NULL,
                filename TEXT NOT NULL,
                file_type TEXT NOT NULL,
                file_size INTEGER NOT NULL,
                file_path TEXT NOT NULL,
                status TEXT NOT NULL,
                uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (chatbot_id) REFERENCES chatbots(id) ON DELETE CASCADE
            )
        """)
        
        # Create indexes for better query performance
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_documents_chatbot_id 
            ON documents(chatbot_id)
        """)
        
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_chatbots_status 
            ON chatbots(status)
        """)
        
        conn.commit()
        print(f"Database initialized successfully at {DATABASE_PATH}")


def drop_tables():
    """
    Drop all tables from the database.
    WARNING: This will delete all data!
    """
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DROP TABLE IF EXISTS documents")
        cursor.execute("DROP TABLE IF EXISTS chatbots")
        conn.commit()
        print("All tables dropped successfully")


def reset_database():
    """
    Reset the database by dropping and recreating all tables.
    WARNING: This will delete all data!
    """
    drop_tables()
    init_database()
    print("Database reset complete")


def migrate_add_model_field():
    """
    Migration to add model field to chatbots table.
    Safe to run multiple times - checks if column exists first.
    """
    with get_db_connection() as conn:
        cursor = conn.cursor()

        # Check if model column exists
        cursor.execute("PRAGMA table_info(chatbots)")
        columns = [row[1] for row in cursor.fetchall()]

        if 'model' not in columns:
            # Add model column with default value
            cursor.execute("""
                ALTER TABLE chatbots
                ADD COLUMN model TEXT DEFAULT 'gemini-2.5-flash'
            """)
            conn.commit()
            print("Added 'model' column to chatbots table")
        else:
            print("Column 'model' already exists in chatbots table")
