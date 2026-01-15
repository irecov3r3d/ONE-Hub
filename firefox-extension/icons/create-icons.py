#!/usr/bin/env python3
"""Generate PNG icons for Firefox extension using PIL/Pillow"""

import os
from pathlib import Path

# Try to use PIL if available
try:
    from PIL import Image, ImageDraw
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

def create_icon(size):
    """Create a simple icon at the given size"""
    if not HAS_PIL:
        return None

    # Create image with gradient background
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Draw rounded rectangle background with gradient-like effect
    padding = size // 8
    corner_radius = size // 5

    # Simplified solid color background (purple)
    draw.rounded_rectangle(
        [0, 0, size-1, size-1],
        radius=corner_radius,
        fill=(102, 126, 234, 255)
    )

    # Draw recording circle (top)
    circle_radius = size // 8
    circle_center = (size // 2, size // 3)
    draw.ellipse(
        [
            circle_center[0] - circle_radius,
            circle_center[1] - circle_radius,
            circle_center[0] + circle_radius,
            circle_center[1] + circle_radius
        ],
        fill=(255, 255, 255, 240)
    )

    # Inner red dot
    inner_radius = circle_radius // 2
    draw.ellipse(
        [
            circle_center[0] - inner_radius,
            circle_center[1] - inner_radius,
            circle_center[0] + inner_radius,
            circle_center[1] + inner_radius
        ],
        fill=(220, 53, 69, 255)
    )

    # Draw play arrow (bottom)
    arrow_size = size // 3
    arrow_top = size // 2 + size // 10
    arrow_center_x = size // 2

    # Triangle pointing down (like a download/repeat arrow)
    points = [
        (arrow_center_x - arrow_size // 2, arrow_top),
        (arrow_center_x + arrow_size // 2, arrow_top),
        (arrow_center_x, arrow_top + arrow_size)
    ]
    draw.polygon(points, fill=(255, 255, 255, 240))

    return img

def main():
    sizes = [16, 32, 48, 96, 128]
    icons_dir = Path(__file__).parent

    if not HAS_PIL:
        print("PIL/Pillow not available. Creating placeholder files.")
        print("Install with: pip install Pillow")
        # Create minimal PNG placeholders
        for size in sizes:
            icon_path = icons_dir / f"icon-{size}.png"
            # Minimal valid PNG (1x1 transparent pixel)
            minimal_png = bytes([
                0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,  # PNG signature
                0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,  # IHDR chunk
                0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,  # 1x1 dimensions
                0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
                0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
                0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
                0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
                0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
                0x42, 0x60, 0x82
            ])
            icon_path.write_bytes(minimal_png)
            print(f"Created placeholder: {icon_path}")
        return

    for size in sizes:
        img = create_icon(size)
        if img:
            icon_path = icons_dir / f"icon-{size}.png"
            img.save(icon_path, 'PNG')
            print(f"Created: {icon_path}")

if __name__ == "__main__":
    main()
