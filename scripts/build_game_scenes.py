"""Compose locally served scene derivatives from the same pinned CC0 art library."""
import hashlib
import json

from PIL import Image, ImageEnhance, ImageOps

from build_game_art import ROOT, REVISION, source

SCENES = {
    "thanh-van": ("maps", "battlemap1_background"),
    "van-truc": ("scenes/shimzar", "midground"),
    "hac-phong": ("maps", "battlemap3_background"),
    "van-tuong": ("maps", "battlemap7_background"),
}
output = ROOT / "FE/public/art/scenes"
output.mkdir(parents=True, exist_ok=True)
provenance = {"revision": REVISION, "images": {}}
for identity, (group, name) in SCENES.items():
    path = source(group, name, "png")
    image = Image.open(path).convert("RGBA")
    if identity == "van-truc":
        # The source is a parallax layer. Keep the painted forest/temple, not its empty right edge.
        image = image.crop((0, 0, round(image.width * .58), image.height))
    image = ImageOps.fit(image, (1280, 720), method=Image.Resampling.LANCZOS)
    backdrop = Image.new("RGBA", image.size, "#173c43")
    backdrop.alpha_composite(image)
    image = ImageEnhance.Color(backdrop.convert("RGB")).enhance(.72)
    image.save(output / f"{identity}.webp", quality=87, method=6)
    provenance["images"][identity] = {"source": f"{group}/{name}.png", "sourceSHA256": hashlib.sha256(path.read_bytes()).hexdigest(), "adaptation": "1280x720 crop, matte and 72% saturation; forest uses left 58% of parallax layer"}
path = source("maps/shimzar", "midground", "png")
arena = Image.open(path).convert("RGBA").resize((1100, 712), Image.Resampling.LANCZOS)
arena.save(output / "arena.webp", quality=90, method=6)
provenance["images"]["arena"] = {"source": "maps/shimzar/midground.png", "sourceSHA256": hashlib.sha256(path.read_bytes()).hexdigest(), "adaptation": "resized to 1100x712, transparent WebP"}
(ROOT / "FE/art/scenes.json").write_text(json.dumps(provenance, indent=2) + "\n")
print("Generated four scene backdrops and arena")
