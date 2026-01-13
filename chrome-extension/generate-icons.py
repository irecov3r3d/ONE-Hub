#!/usr/bin/env python3
"""
Generate placeholder icons for ONE-Hub Chrome Extension
Creates simple colored square icons with a music note symbol
"""

try:
    from PIL import Image, ImageDraw, ImageFont
    import os
except ImportError:
    print("PIL (Pillow) is not installed.")
    print("Please install it with: pip install Pillow")
    print("Or create icons manually (see icons/README.md)")
    exit(1)

# Configuration
ICON_SIZES = [16, 32, 48, 128]
BG_COLOR = (102, 126, 234)  # #667eea
TEXT_COLOR = (255, 255, 255)  # white
ICON_DIR = "icons"

# Create icons directory
os.makedirs(ICON_DIR, exist_ok=True)

print("Generating icons for ONE-Hub Chrome Extension...")

for size in ICON_SIZES:
    # Create a new image with the background color
    img = Image.new('RGB', (size, size), BG_COLOR)
    draw = ImageDraw.Draw(img)

    # Try to add text (music note)
    try:
        # Calculate font size based on icon size
        font_size = int(size * 0.6)

        # Try to load a font, fall back to default if not available
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size)
        except:
            try:
                font = ImageFont.truetype("Arial.ttf", font_size)
            except:
                font = ImageFont.load_default()

        # Draw music note symbol
        text = "♪"

        # Get text bounding box for centering
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]

        # Calculate position to center the text
        x = (size - text_width) // 2 - bbox[0]
        y = (size - text_height) // 2 - bbox[1]

        # Draw the text
        draw.text((x, y), text, fill=TEXT_COLOR, font=font)

    except Exception as e:
        print(f"Note: Could not add text to icon: {e}")
        # Draw a simple circle as fallback
        margin = size // 4
        draw.ellipse([margin, margin, size - margin, size - margin],
                     outline=TEXT_COLOR, width=max(2, size // 32))

    # Save the icon
    filename = f"{ICON_DIR}/icon{size}.png"
    img.save(filename, "PNG")
    print(f"Created {filename}")

print("All icons generated successfully!")
print(f"Icons are located in the {ICON_DIR}/ directory")
