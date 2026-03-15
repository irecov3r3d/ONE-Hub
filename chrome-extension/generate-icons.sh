#!/bin/bash

# Generate placeholder icons for ONE-Hub Chrome Extension
# This script creates simple colored square icons with text

echo "Generating icons for ONE-Hub Chrome Extension..."

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "ImageMagick is not installed."
    echo "Please install it with: sudo apt-get install imagemagick"
    echo "Or create icons manually (see icons/README.md)"
    exit 1
fi

# Create icons directory if it doesn't exist
mkdir -p icons

# Generate 128x128 icon
convert -size 128x128 canvas:"#667eea" \
    -fill white -font Arial-Bold -pointsize 80 -gravity center \
    -annotate 0 "♪" \
    icons/icon128.png

echo "Created icon128.png"

# Generate other sizes from 128x128
convert icons/icon128.png -resize 48x48 icons/icon48.png
echo "Created icon48.png"

convert icons/icon128.png -resize 32x32 icons/icon32.png
echo "Created icon32.png"

convert icons/icon128.png -resize 16x16 icons/icon16.png
echo "Created icon16.png"

echo "All icons generated successfully!"
echo "Icons are located in the icons/ directory"
