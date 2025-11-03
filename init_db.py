#!/usr/bin/env python3
"""
Database initialization script for the RAG Chatbot Platform.

This script creates the necessary SQLite database and tables
for storing chatbot and document metadata.

Usage:
    python init_db.py [--reset]

Options:
    --reset     Drop existing tables and recreate them (WARNING: deletes all data)
"""
import sys
import os
from models.database import init_database, reset_database


def main():
    """Main entry point for database initialization."""
    # Check for reset flag
    if len(sys.argv) > 1 and sys.argv[1] == '--reset':
        print("WARNING: This will delete all existing data!")
        response = input("Are you sure you want to reset the database? (yes/no): ")
        
        if response.lower() == 'yes':
            reset_database()
            print("\n✓ Database has been reset successfully")
        else:
            print("Database reset cancelled")
            sys.exit(0)
    else:
        # Normal initialization
        init_database()
        print("\n✓ Database initialized successfully")
        print("\nYou can now start the Flask application.")


if __name__ == '__main__':
    main()
