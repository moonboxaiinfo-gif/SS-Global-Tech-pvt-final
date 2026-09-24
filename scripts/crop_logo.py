from PIL import Image

source = "/home/ubuntu/webdev-static-assets/0012-000.png"
target = "/home/ubuntu/webdev-static-assets/ss-global-tech-logo.png"
image = Image.open(source).convert("RGBA")
alpha = image.getchannel("A")
bbox = alpha.getbbox()
if bbox:
    image = image.crop(bbox)
image.save(target, "PNG", optimize=True)
print(f"Saved cropped logo {image.size} to {target}")
