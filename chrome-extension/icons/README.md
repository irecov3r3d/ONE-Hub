# Extension Icons

This directory should contain the following icon files:

- `icon16.png` - 16x16 pixels
- `icon32.png` - 32x32 pixels
- `icon48.png` - 48x48 pixels
- `icon128.png` - 128x128 pixels

## Creating Icons

You can create icons using any image editor. Here are some options:

### Option 1: Using Online Tools
1. Go to https://www.favicon-generator.org/
2. Upload your logo/design
3. Generate icons in all required sizes

### Option 2: Using Figma/Photoshop/GIMP
1. Create a square design (128x128 recommended)
2. Export in different sizes: 16x16, 32x32, 48x48, 128x128
3. Save as PNG files with the names above

### Option 3: Using ImageMagick (Command Line)
```bash
# Create a simple icon with ImageMagick
convert -size 128x128 xc:none -fill "#667eea" -draw "circle 64,64 64,10" \
  -fill white -font Arial-Bold -pointsize 60 -gravity center -annotate 0 "🎵" \
  icon128.png

# Generate other sizes
convert icon128.png -resize 48x48 icon48.png
convert icon128.png -resize 32x32 icon32.png
convert icon128.png -resize 16x16 icon16.png
```

## Temporary Workaround

If you want to test the extension without custom icons, you can use placeholder icons from:
https://via.placeholder.com/128x128/667eea/ffffff?text=ONE

Download and save as the required icon files.
