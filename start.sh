#!/bin/bash
# Startup script for RAG Chatbot Platform (Unix/Linux/macOS)

echo "============================================================"
echo "RAG Chatbot Platform - Startup Script"
echo "============================================================"
echo ""

# Check if virtual environment exists
if [ ! -f "venv/bin/activate" ]; then
    echo "Virtual environment not found!"
    echo "Please run: python3 -m venv venv"
    echo "Then run: source venv/bin/activate"
    echo "Then run: pip install -r requirements.txt"
    exit 1
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo ".env file not found!"
    echo "Please copy .env.example to .env and configure it."
    echo "Run: cp .env.example .env"
    exit 1
fi

# Run the application
echo "Starting application..."
echo ""
python run.py
