@echo off
echo ==================================================
echo 🎵 Starting Local Music Generation Server
echo ==================================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python 3 is not installed!
    echo Please install Python 3.8+ from https://python.org
    pause
    exit /b 1
)

echo ✅ Python found
echo.

REM Check if dependencies are installed
python -c "import audiocraft" >nul 2>&1
if errorlevel 1 (
    echo 📦 Installing dependencies (this may take 5-10 minutes)...
    pip install -r requirements.txt

    if errorlevel 1 (
        echo ❌ Failed to install dependencies
        echo Try: pip install --user -r requirements.txt
        pause
        exit /b 1
    )

    echo ✅ Dependencies installed!
    echo.
)

echo 🚀 Starting server...
echo    This will run on: http://localhost:8000
echo    Keep this window open!
echo.
echo    To stop: Press Ctrl+C
echo.
echo ==================================================
echo.

REM Start the server
python server.py
