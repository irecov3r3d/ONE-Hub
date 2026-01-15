#!/bin/bash

echo "=================================================="
echo "🎵 Starting Local Music Generation Server"
echo "=================================================="
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed!"
    echo "Please install Python 3.8+ from https://python.org"
    exit 1
fi

echo "✅ Python found: $(python3 --version)"
echo ""

# Check if dependencies are installed
if ! python3 -c "import audiocraft" 2>/dev/null; then
    echo "📦 Installing dependencies (this may take 5-10 minutes)..."
    pip3 install -r requirements.txt

    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        echo "Try: pip3 install --user -r requirements.txt"
        exit 1
    fi

    echo "✅ Dependencies installed!"
    echo ""
fi

echo "🚀 Starting server..."
echo "   This will run on: http://localhost:8000"
echo "   Keep this terminal open!"
echo ""
echo "   To stop: Press Ctrl+C"
echo ""
echo "=================================================="
echo ""

# Start the server
python3 server.py
