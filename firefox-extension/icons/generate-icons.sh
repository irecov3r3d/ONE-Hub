#!/bin/bash
# Generate placeholder PNG icons from SVG for Firefox extension

# Base SVG icon
SVG_CONTENT='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea"/>
      <stop offset="100%" style="stop-color:#764ba2"/>
    </linearGradient>
  </defs>
  <rect width="128" height="128" rx="24" fill="url(#grad)"/>
  <circle cx="64" cy="48" r="16" fill="white"/>
  <path d="M42 85 L64 65 L86 85 L78 85 L78 105 L50 105 L50 85 Z" fill="white"/>
</svg>'

# Create icon directory if it doesn't exist
mkdir -p icons

# Save base SVG
echo "$SVG_CONTENT" > icons/icon.svg

# Generate PNG icons using ImageMagick (if available) or create placeholder files
for size in 16 32 48 96 128; do
  if command -v convert &> /dev/null; then
    convert -background none -resize ${size}x${size} icons/icon.svg icons/icon-${size}.png
  elif command -v rsvg-convert &> /dev/null; then
    rsvg-convert -w $size -h $size icons/icon.svg > icons/icon-${size}.png
  else
    # Create a simple 1x1 pixel PNG as placeholder
    printf '\x89PNG\r\n\x1a\n' > icons/icon-${size}.png
    echo "Warning: No image conversion tool available. Created placeholder for icon-${size}.png"
  fi
done

echo "Icons generated in icons/ directory"
