from PIL import Image, ImageDraw, ImageFont

for size in (16, 48, 128):
    img = Image.new("RGB", (size, size), color=(30, 144, 255))
    d = ImageDraw.Draw(img)
    d.text((size//4, size//4), "T", fill=(255,255,255))
    img.save(f"icon{size}.png")