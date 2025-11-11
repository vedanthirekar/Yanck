#!/usr/bin/env python3
"""
Database Migration Script: Add model field to chatbots table

This script adds the 'model' column to the chatbots table if it doesn't exist.
Safe to run multiple times.
"""

import sqlite3
import os

DATABASE_PATH = os.getenv('DATABASE_PATH', './data/chatbots.db')

def migrate_add_model_field():
    """
    Migration to add model field to chatbots table.
    Safe to run multiple times - checks if column exists first.
    """
    # Ensure the data directory exists
    os.makedirs(os.path.dirname(DATABASE_PATH), exist_ok=True)

    conn = sqlite3.connect(DATABASE_PATH)
    try:
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
            print("✅ Added 'model' column to chatbots table")
        else:
            print("ℹ️  Column 'model' already exists in chatbots table - no migration needed")

    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()


if __name__ == "__main__":
    print("=" * 60)
    print("Database Migration: Add model field to chatbots table")
    print("=" * 60)
    print()

    try:
        migrate_add_model_field()
        print()
        print("✅ Migration completed successfully!")
        print()
    except Exception as e:
        print()
        print(f"❌ Migration failed: {str(e)}")
        print()
        exit(1)
