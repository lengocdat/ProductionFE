"""Adapt pinned CC0 sprite sheets; requires Pillow. Run from any directory.
Usage: python FE/scripts/build_game_art.py FE/art/characters.json
"""
import argparse
import colorsys
import hashlib
import io
import json
from pathlib import Path
from urllib.request import urlopen

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
REVISION = "9fd0a16b611be8c9b991806ec5a6f602aa981823"
BASE = f"https://raw.githubusercontent.com/t73liu/open-duelyst-assets/{REVISION}/assets/"
CACHE = ROOT / ".runtime" / "duelyst-source-pinned"
PUBLIC = ROOT / "FE/public/art/sprites"


def source(group, name, extension):
    path = CACHE / group / f"{name}.{extension}"
    if not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        with urlopen(f"{BASE}{group}/{name}.{extension}", timeout=60) as response:
            path.write_bytes(response.read())
    return path


def recolor(image, palette):
    if not palette:
        return image
    ramps = {
        "jade": ((19, 40, 47), (64, 117, 111), (215, 237, 206)),
        "ivory": ((33, 52, 63), (133, 171, 162), (249, 237, 196)),
        "violet": ((30, 28, 49), (106, 93, 150), (220, 207, 241)),
        "bronze": ((43, 38, 35), (152, 106, 60), (240, 211, 145)),
    }
    low, mid, high = ramps[palette]
    replacements = {}
    pixels = image.get_flattened_data()
    for pixel in set(pixels):
        r, g, b, a = pixel
        hue, saturation, value = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
        # Replace source crimson cloth/energy, retaining skin, gold and steel.
        if a and saturation > .35 and (hue > .86 or hue < .045):
            t = value * 2
            start, end = (low, mid) if t <= 1 else (mid, high)
            t = min(1, t if t <= 1 else t - 1)
            replacements[pixel] = (*[round(x + (y - x) * t) for x, y in zip(start, end)], a)
    result = image.copy()
    result.putdata([replacements.get(pixel, pixel) for pixel in pixels])
    return result


def build_asset(spec):
    group, name, identity = spec.get("group", "units"), spec["source"], spec["id"]
    metadata = json.loads(source(group, name, "json").read_text())
    sheet_path = source(group, name, "png")
    sheet = recolor(Image.open(sheet_path).convert("RGBA"), spec.get("palette"))
    available = metadata["frames"]
    choices = spec.get("actions", {
        "idle": ["breathing", "idle"], "attack": ["attack"],
        "cast": ["cast", "casting", "idle"], "hit": ["hit", "hurt"],
        "meditate": ["castloop", "idle"], "death": ["death"],
    })
    selected = {}
    for action, candidates in choices.items():
        if isinstance(candidates, str):
            candidates = [candidates]
        key = next((key for key in candidates if available.get(key)), None)
        if key is None:
            raise ValueError(f"{identity}: no source frames for {action}: {candidates}")
        selected[action] = available[key]
    width = max(frame["width"] for frames in selected.values() for frame in frames)
    height = max(frame["height"] for frames in selected.values() for frame in frames)
    frames_by_action = {}
    boxes = []
    for action, frames in selected.items():
        frames_by_action[action] = []
        for frame in frames:
            crop = sheet.crop((frame["x0"], frame["y0"], frame["x1"], frame["y1"]))
            canvas = Image.new("RGBA", (width, height))
            canvas.paste(crop, ((width - crop.width) // 2, height - crop.height))
            if spec.get("flip"):
                canvas = canvas.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
            frames_by_action[action].append(canvas)
            if canvas.getbbox():
                boxes.append(canvas.getbbox())
    bounds = (min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes))
    idle = frames_by_action.get("idle", next(iter(frames_by_action.values())))[0]
    idle_bounds = idle.getbbox() or bounds
    output_width, output_height = bounds[2] - bounds[0], bounds[3] - bounds[1]
    result = {
        "width": output_width, "height": output_height,
        "anchorX": (idle_bounds[0] + idle_bounds[2]) / 2 - bounds[0],
        "anchorY": idle_bounds[3] - bounds[1],
        "bodyHeight": idle_bounds[3] - idle_bounds[1],
        "bodyWidth": idle_bounds[2] - idle_bounds[0],
        "source": f"{group}/{name}", "palette": spec.get("palette"),
        "sourceSHA256": hashlib.sha256(sheet_path.read_bytes()).hexdigest(),
        "animations": {},
    }
    PUBLIC.mkdir(parents=True, exist_ok=True)
    for action, frames in frames_by_action.items():
        strip = Image.new("RGBA", (output_width * len(frames), output_height))
        for index, frame in enumerate(frames):
            strip.paste(frame.crop(bounds), (index * output_width, 0))
        filename = f"{identity}-{action}.png"
        strip.save(PUBLIC / filename, optimize=True)
        result["animations"][action] = {"src": f"/art/sprites/{filename}", "frames": len(frames)}
    return result


def build_config(path):
    specs = json.loads(path.read_text())
    assets = {spec["id"]: build_asset(spec) for spec in specs}
    destination = ROOT / "FE/src/game/art" / path.name
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(assets, ensure_ascii=False, separators=(",", ":")) + "\n")
    print(f"Built {len(assets)} assets: {destination.relative_to(ROOT)}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("config", type=Path)
    build_config(parser.parse_args().config)
