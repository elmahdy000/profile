import os
from PIL import Image

def generate_favicons():
    public_dir = r"c:\Users\engel\Desktop\profile\artifacts\dr-mahmoud\public"
    logo_path = os.path.join(public_dir, "logo.jpg")
    
    if not os.path.exists(logo_path):
        print(f"Error: Logo file not found at {logo_path}")
        return

    print("Opening logo image...")
    img = Image.open(logo_path)
    
    # Crop to 1:1 square if not square
    width, height = img.size
    if width != height:
        print(f"Cropping non-square image ({width}x{height}) to square...")
        min_dim = min(width, height)
        left = (width - min_dim) / 2
        top = (height - min_dim) / 2
        right = (width + min_dim) / 2
        bottom = (height + min_dim) / 2
        img = img.crop((left, top, right, bottom))
    
    # Save standard PNGs
    sizes = {
        "favicon-96x96.png": (96, 96),
        "apple-touch-icon.png": (180, 180),
        "web-app-manifest-192x192.png": (192, 192),
        "web-app-manifest-512x512.png": (512, 512)
    }
    
    for filename, size in sizes.items():
        out_path = os.path.join(public_dir, filename)
        resized = img.resize(size, Image.Resampling.LANCZOS)
        resized.save(out_path, "PNG")
        print(f"Generated {filename} ({size[0]}x{size[1]})")
        
    # Save favicon.ico (multi-resolution)
    ico_path = os.path.join(public_dir, "favicon.ico")
    ico_sizes = [(16, 16), (32, 32), (48, 48)]
    ico_imgs = [img.resize(size, Image.Resampling.LANCZOS) for size in ico_sizes]
    ico_imgs[0].save(ico_path, format="ICO", append_images=ico_imgs[1:], sizes=[(img.width, img.height) for img in ico_imgs])
    print("Generated favicon.ico (16x16, 32x32, 48x48)")

    # Delete the problematic red svg favicon if it exists
    svg_path = os.path.join(public_dir, "favicon.svg")
    if os.path.exists(svg_path):
        os.remove(svg_path)
        print("Deleted favicon.svg to prevent Google from indexing the red placeholder icon")

if __name__ == "__main__":
    generate_favicons()
