#!/usr/bin/env python3
"""
Social's Way asset pipeline.

Turns the generated source plates into production layers:
  - keys out the flat grey background (flood fill from edges + distance falloff)
  - despills grey from edge pixels
  - crops to alpha bbox with bleed padding
  - splits the door plate into left/right panels
  - unifies the grade toward the warm cream palette
  - exports responsive WebP sets with a JSON manifest

Run:  python3 tools/process_layers.py
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "src"
OUT = ROOT / "assets" / "layers"
CARDS = ROOT / "assets" / "cards"
OUT.mkdir(parents=True, exist_ok=True)
CARDS.mkdir(parents=True, exist_ok=True)

GREY_TOL = 34          # distance in RGB space considered "background grey"
FEATHER = 1.6          # px gaussian feather on alpha edges
DESAT_MIX = 0.55       # how strongly edge pixels get despilled


def load(name):
    return Image.open(SRC / name).convert("RGB")


def grey_key_mask(img: Image.Image, tol: float = GREY_TOL) -> np.ndarray:
    """
    Alpha mask where 255 = subject, 0 = flat grey background.
    Seeds a flood fill from the image border so only background-connected
    grey is removed (grey-ish parts of the subject survive).
    """
    arr = np.asarray(img).astype(np.int16)
    h, w, _ = arr.shape

    # reference grey = median of border pixels
    border = np.concatenate([
        arr[0, :, :], arr[-1, :, :], arr[:, 0, :], arr[:, -1, :]
    ])
    ref = np.median(border, axis=0)

    dist = np.sqrt(((arr - ref) ** 2).sum(axis=2))
    candidate = dist < tol                      # possibly background

    # flood fill from all border candidate pixels, 4-connected
    visited = np.zeros((h, w), dtype=bool)
    stack = []
    for x in range(w):
        if candidate[0, x]:
            stack.append((0, x))
        if candidate[h - 1, x]:
            stack.append((h - 1, x))
    for y in range(h):
        if candidate[y, 0]:
            stack.append((y, 0))
        if candidate[y, w - 1]:
            stack.append((y, w - 1))
    while stack:
        y, x = stack.pop()
        if visited[y, x] or not candidate[y, x]:
            continue
        visited[y, x] = True
        if y > 0:
            stack.append((y - 1, x))
        if y < h - 1:
            stack.append((y + 1, x))
        if x > 0:
            stack.append((y, x - 1))
        if x < w - 1:
            stack.append((y, x + 1))

    alpha = np.where(visited, 0, 255).astype(np.uint8)

    # Second pass: remove any remaining grey pixels that the flood fill
    # couldn't reach (trapped between fine details like flower stems).
    # These pixels match the grey reference color but aren't border-connected.
    # Use a tighter tolerance since we're now targeting interior grey directly.
    interior_grey = dist < tol * 0.7
    alpha = np.where(interior_grey, 0, alpha).astype(np.uint8)

    # soften the keyed edge: blur then slightly erode toward subject
    a_img = Image.fromarray(alpha, "L").filter(ImageFilter.GaussianBlur(FEATHER))
    alpha = np.asarray(a_img)
    return alpha, ref


def despill(img: Image.Image, alpha: np.ndarray, ref) -> Image.Image:
    """Pull grey fringe out of semi-transparent edge pixels."""
    arr = np.asarray(img).astype(np.float32)
    edge = (alpha > 8) & (alpha < 247)
    if edge.any():
        lum = arr.mean(axis=2, keepdims=True)
        # blend edge pixels toward their own luminance to kill grey cast,
        # then push slightly warm so the edge melts into the scene grade
        arr[edge] = (arr[edge] * (1 - DESAT_MIX)
                     + lum[edge] * DESAT_MIX)
        arr[edge, 0] *= 1.04   # warm the red channel a touch
        arr[edge, 2] *= 0.96
    out = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGB")
    return out


def grade(img: Image.Image, warm=1.03, contrast=1.03, lift=4) -> Image.Image:
    """Subtle shared grade: warm, gentle contrast, tiny black lift."""
    arr = np.asarray(img).astype(np.float32)
    arr[..., 0] *= warm
    arr[..., 2] /= warm ** 0.6
    arr = (arr - 128) * contrast + 128 + lift
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))


def crop_to_alpha(img: Image.Image, pad_frac: float = 0.04):
    """Crop to alpha bbox plus padding. Returns (image, bbox)."""
    a = np.asarray(img.getchannel("A"))
    ys, xs = np.where(a > 4)
    if len(xs) == 0:
        return img, (0, 0, img.width, img.height)
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    px, py = int(img.width * pad_frac), int(img.height * pad_frac)
    box = (max(0, x0 - px), max(0, y0 - py),
           min(img.width, x1 + px), min(img.height, y1 + py))
    return img.crop(box), tuple(int(v) for v in box)


def save_webp(img: Image.Image, path: Path, width: int, q: int = 82):
    if img.width > width:
        h = round(img.height * width / img.width)
        img = img.resize((width, h), Image.LANCZOS)
    img.save(path, "WEBP", quality=q, method=6)
    return {"file": path.name, "w": img.width, "h": img.height,
            "kb": round(path.stat().st_size / 1024)}


manifest = {"layers": [], "cards": []}

# ---------------------------------------------------------------- background
bg = grade(load("bg-00.jpg"), warm=1.02, contrast=1.02, lift=2)
for w, tag in [(1600, "1x"), (2752, "2x")]:
    e = save_webp(bg, OUT / f"bg-00-{tag}.webp", w, q=80)
    manifest["layers"].append(dict(id="00-background", **e, role="opaque sky plate",
                                   anchor="center", depth=0))

# ---------------------------------------------------------------- midground
mid = load("mid-20.jpg")
alpha, ref = grey_key_mask(mid, tol=30)
mid_rgba = despill(mid, alpha, ref).convert("RGBA")
mid_rgba.putalpha(Image.fromarray(alpha))
mid_rgba, mid_box = crop_to_alpha(mid_rgba, pad_frac=0.02)
mid_rgba = grade(mid_rgba.convert("RGB"), warm=1.05, contrast=1.04).convert("RGBA")
mid_rgba.putalpha(mid_rgba.getchannel("A"))  # keep alpha after grade
# reapply alpha lost in grade round-trip
alpha2 = np.asarray(Image.open(OUT / "unused.png")) if False else None
# (grade() drops alpha; restore from earlier)
mid_final = Image.open(SRC / "mid-20.jpg").convert("RGB")
alpha, ref = grey_key_mask(mid_final, tol=30)
mid_rgb = despill(mid_final, alpha, ref)
mid_rgb = grade(mid_rgb, warm=1.05, contrast=1.04)
mid_rgba = mid_rgb.convert("RGBA")
mid_rgba.putalpha(Image.fromarray(alpha))
mid_rgba, mid_box = crop_to_alpha(mid_rgba, pad_frac=0.02)
for w, tag in [(1400, "1x"), (2400, "2x")]:
    e = save_webp(mid_rgba, OUT / f"mid-20-{tag}.webp", w, q=84)
    manifest["layers"].append(dict(id="20-midground", **e, role="table + objects",
                                   anchor="bottom-center", depth=2,
                                   srcCrop=mid_box))

# ---------------------------------------------------------------- hero
def components(mask: np.ndarray):
    """Label 4-connected components of a boolean mask. Returns (labels, n)."""
    h, w = mask.shape
    lab = np.zeros((h, w), dtype=np.int32)
    n = 0
    for y0 in range(h):
        for x0 in range(w):
            if mask[y0, x0] and lab[y0, x0] == 0:
                n += 1
                stack = [(y0, x0)]
                lab[y0, x0] = n
                while stack:
                    y, x = stack.pop()
                    for ny, nx in ((y-1,x),(y+1,x),(y,x-1),(y,x+1)):
                        if 0 <= ny < h and 0 <= nx < w and \
                           mask[ny, nx] and lab[ny, nx] == 0:
                            lab[ny, nx] = n
                            stack.append((ny, nx))
    return lab, n


hero = load("hero-30.jpg")
harr = np.asarray(hero).astype(np.float32)
hh, hw, _ = harr.shape
# Background is a smooth grey gradient; the cast shadow is the same grey hue,
# just darker. The case is warm: its red channel sits well above blue.
# So: subject score = (R - B) warmth + saturation. Shadow stays near 0.
r, g, b = harr[..., 0], harr[..., 1], harr[..., 2]
warmth = r - b
mx = harr.max(axis=2); mn = harr.min(axis=2)
sat = mx - mn
score = np.clip(warmth, 0, None) + sat * 0.6
alpha_f = np.clip((score - 14) * 10, 0, 255)     # soft threshold
# Also keep darker warm pixels (stitching, spine groove)
dark_warm = ((warmth > 10) & (mx < 120)).astype(np.float32) * 255
alpha_f = np.maximum(alpha_f, dark_warm)
alpha = alpha_f.astype(np.uint8)
alpha = np.asarray(Image.fromarray(alpha).filter(ImageFilter.GaussianBlur(2.0)))
# largest-component cleanup to drop stray warm specks in the background
small = np.asarray(Image.fromarray(alpha).resize(
    (hw // 4, hh // 4), Image.BILINEAR)) > 96
lab, n = components(small)
if n > 1:
    sizes = sorted((((lab == i).sum(), i) for i in range(1, n + 1)),
                   reverse=True)
    main = lab == sizes[0][1]
    keep_small = (main * 255).astype(np.uint8)
    keep_full = np.asarray(Image.fromarray(keep_small).resize(
        (hw, hh), Image.BILINEAR)) > 64
    alpha = np.where(keep_full, alpha, 0).astype(np.uint8)
    alpha = np.asarray(Image.fromarray(alpha).filter(
        ImageFilter.GaussianBlur(FEATHER)))
# Final cleanup: remove any remaining grey/neutral pixels (low warmth AND
# low saturation) that survived the warmth pass — these are shadow remnants.
# The cast shadow has a slight warm tint from reflected light, so we target
# low saturation (grey-ish) rather than just low warmth.
neutral_mask = (sat < 22) & (mx < 145)
alpha = np.where(neutral_mask, 0, alpha).astype(np.uint8)
alpha = np.asarray(Image.fromarray(alpha).filter(
    ImageFilter.GaussianBlur(FEATHER)))
hero_rgb = despill(hero, alpha, np.array([128, 128, 128]))
hero_rgb = grade(hero_rgb, warm=1.04, contrast=1.05)
hero_rgba = hero_rgb.convert("RGBA")
hero_rgba.putalpha(Image.fromarray(alpha))
hero_rgba, hero_box = crop_to_alpha(hero_rgba, pad_frac=0.03)
for w, tag in [(900, "1x"), (1600, "2x")]:
    e = save_webp(hero_rgba, OUT / f"hero-30-{tag}.webp", w, q=86)
    manifest["layers"].append(dict(id="30-hero", **e,
                                   role="leather portfolio case with soft shadow",
                                   anchor="bottom-center", depth=3,
                                   srcCrop=hero_box))

# ---------------------------------------------------------------- doors
# The plate shows: sidelight panel (x~100-340), outer frame, then two leaves
# meeting at a center seam with handles (x~1320-1420). We cut both leaves at
# the seam; each becomes a full-height foreground occluder. The right leaf is
# flipped horizontally so its brass handle sits at the outer edge, matching
# the left leaf's mirrored handle position, and its wood grain reads as the
# opposite door of the same pair.
doors = load("doors-40.jpg")
alpha, ref = grey_key_mask(doors, tol=30)
doors_rgb = despill(doors, alpha, ref)
doors_rgb = grade(doors_rgb, warm=1.03, contrast=1.03)
doors_rgba = doors_rgb.convert("RGBA")
doors_rgba.putalpha(Image.fromarray(alpha))

SEAM_L, SEAM_R = 1340, 1400     # center post between the two leaves
FRAME_L, FRAME_R = 700, 2000    # outer frame posts of the door pair
H = doors.height

door_l = doors_rgba.crop((FRAME_L, 0, SEAM_L, H))          # left leaf + frame
door_r = doors_rgba.crop((SEAM_R, 0, FRAME_R, H))          # right leaf + frame
door_r = door_r.transpose(Image.FLIP_LEFT_RIGHT)           # handle to outside

door_l, dl_box = crop_to_alpha(door_l, pad_frac=0.02)
door_r, dr_box = crop_to_alpha(door_r, pad_frac=0.02)
for name, im, box, side in [("40-door-left", door_l, dl_box, "left"),
                            ("41-door-right", door_r, dr_box, "right")]:
    for w, tag in [(1000, "1x"), (1800, "2x")]:
        e = save_webp(im, OUT / f"{name}-{tag}.webp", w, q=84)
        manifest["layers"].append(dict(id=name, **e, role=f"foreground {side} door",
                                       anchor=f"bottom-{side}", depth=4,
                                       srcCrop=[int(v) for v in box]))

# ---------------------------------------------------------------- cards
card_names = {
    1: "brand-strategy", 2: "identity-design", 3: "content-editorial",
    4: "social-campaigns", 5: "web-digital", 6: "research-insight",
}
for i, slug in card_names.items():
    im = grade(load(f"card-{i}.jpg"), warm=1.02, contrast=1.02, lift=2)
    e = save_webp(im, CARDS / f"{slug}.webp", 900, q=80)
    manifest["cards"].append(dict(id=slug, **e))

with open(ROOT / "assets" / "manifest.json", "w") as f:
    json.dump(manifest, f, indent=2)

print(json.dumps(manifest, indent=2)[:1200])
print("OK")
