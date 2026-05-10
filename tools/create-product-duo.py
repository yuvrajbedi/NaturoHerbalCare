from pathlib import Path
from shutil import copyfile


ROOT = Path(__file__).resolve().parents[1]
IMG = ROOT / "assets" / "img"
SOURCE = IMG / "product-duo-source.png"
OUT = IMG / "product-duo.png"

copyfile(SOURCE, OUT)
print(f"Copied {SOURCE.relative_to(ROOT)} to {OUT.relative_to(ROOT)}")
