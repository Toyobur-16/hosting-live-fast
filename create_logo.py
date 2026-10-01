import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

def create_fakir_logo_png():
    width = 960
    height = 300
    img = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Let's save a clean transparent canvas
    os.makedirs('public', exist_ok=True)
    
    # We can also generate high-quality PIL rendering
    # Try finding bold fonts or draw precise geometric vector shapes
    print("Canvas initialized:", width, height)
    return img

if __name__ == '__main__':
    create_fakir_logo_png()
