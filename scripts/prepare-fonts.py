import sys
from pathlib import Path
from fontTools.ttLib import TTFont

destination = Path(__file__).resolve().parent.parent / "public" / "fonts"
destination.mkdir(parents=True, exist_ok=True)
for source, name in zip(sys.argv[1:], ["noto-sans-sc.woff2", "inter.woff2"]):
    font = TTFont(source)
    font.flavor = "woff2"
    font.save(destination / name)
    print(f"{name}: {(destination / name).stat().st_size:,} bytes")
