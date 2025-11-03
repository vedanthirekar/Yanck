@echo off
REM Startup script for RAG Chatbot Platform (Windows)

echo ============================================================
echo RAG Chatbot Platform - Startup Script
echo ============================================================
echo.

REM Check if virtual environment exists
if not exist "venv\Scripts\activate.bat" (
    echo Virtual environment not found!
    echo Please run: python -m venv venv
    echo Then run: venv\Scripts\activate
    echo Then run: pip install -r requirements.txt
    pause
    exit /b 1
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Check if .env file exists
if not exist ".env" (
    echo .env file not found!
    echo Please copy .env.example to .env and configure it.
    echo Run: copy .env.example .env
    pause
    exit /b 1
)

REM Run the application
echo Starting application...
echo.
python run.py

pause
