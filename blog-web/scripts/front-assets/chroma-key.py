#!/usr/bin/env python3
"""Remove a near-solid key background and report whether it was truly uniform."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--report", type=Path)
    parser.add_argument("--audit", type=Path)
    parser.add_argument("--key", help="RGB key as #RRGGBB; defaults to border median")
    parser.add_argument("--inner", type=float, default=5.0)
    parser.add_argument("--outer", type=float, default=140.0)
    parser.add_argument("--tile-size", type=int, default=32)
    parser.add_argument("--border-p95-limit", type=float, default=6.0)
    parser.add_argument("--tile-p95-limit", type=float, default=10.0)
    parser.add_argument("--tile-max-limit", type=float, default=20.0)
    return parser.parse_args()


def parse_key(value: str) -> np.ndarray:
    raw = value.removeprefix("#")
    if len(raw) != 6:
        raise ValueError("--key must use #RRGGBB")
    return np.array([int(raw[index : index + 2], 16) for index in (0, 2, 4)], dtype=np.float32)


def percentile(values: np.ndarray, points: list[int]) -> list[float]:
    if values.size == 0:
        return [math.nan for _ in points]
    return [round(float(value), 3) for value in np.percentile(values, points)]


def sample_border(rgb: np.ndarray, width: int) -> np.ndarray:
    return np.concatenate(
        (
            rgb[:width].reshape(-1, 3),
            rgb[-width:].reshape(-1, 3),
            rgb[width:-width, :width].reshape(-1, 3),
            rgb[width:-width, -width:].reshape(-1, 3),
        )
    )


def background_tile_distances(
    rgb: np.ndarray,
    key: np.ndarray,
    tile_size: int,
    probe_distance: float = 80.0,
    local_mad_limit: float = 8.0,
) -> np.ndarray:
    height, width, _ = rgb.shape
    medians: list[np.ndarray] = []
    for top in range(0, height, tile_size):
        for left in range(0, width, tile_size):
            tile = rgb[top : top + tile_size, left : left + tile_size].reshape(-1, 3)
            median = np.median(tile, axis=0)
            local_distance = np.linalg.norm(tile - median, axis=1)
            if np.linalg.norm(median - key) <= probe_distance and np.median(local_distance) <= local_mad_limit:
                medians.append(median)
    if not medians:
        return np.array([], dtype=np.float32)
    return np.linalg.norm(np.stack(medians) - key, axis=1)


def smooth_alpha(distance: np.ndarray, inner: float, outer: float) -> np.ndarray:
    if outer <= inner:
        raise ValueError("--outer must be greater than --inner")
    value = np.clip((distance - inner) / (outer - inner), 0.0, 1.0)
    return value * value * (3.0 - 2.0 * value)


def decontaminate(rgb: np.ndarray, alpha: np.ndarray, key: np.ndarray) -> np.ndarray:
    result = rgb.copy()
    partial = (alpha > 0.02) & (alpha < 0.995)
    if np.any(partial):
        a = alpha[partial, None]
        result[partial] = np.clip((rgb[partial] - (1.0 - a) * key) / np.maximum(a, 0.02), 0.0, 255.0)
    result[alpha <= 0.02] = 0.0
    return result


def checkerboard(size: tuple[int, int], cell: int = 24) -> Image.Image:
    image = Image.new("RGB", size, "#f7f7f7")
    draw = ImageDraw.Draw(image)
    for top in range(0, size[1], cell):
        for left in range(0, size[0], cell):
            if (left // cell + top // cell) % 2:
                draw.rectangle((left, top, left + cell - 1, top + cell - 1), fill="#d9d9d9")
    return image


def make_audit(foreground: Image.Image, output: Path) -> None:
    preview_size = (512, 512)
    source = foreground.resize(preview_size, Image.Resampling.LANCZOS)
    backgrounds = [
        Image.new("RGB", preview_size, "#fff8f5"),
        Image.new("RGB", preview_size, "#4b315b"),
        checkerboard(preview_size),
    ]
    labels = ["WARM WHITE", "DEEP SAKURA PURPLE", "CHECKERBOARD"]
    board = Image.new("RGB", (preview_size[0] * 3, preview_size[1] + 42), "white")
    draw = ImageDraw.Draw(board)
    for index, (background, label) in enumerate(zip(backgrounds, labels, strict=True)):
        background.paste(source, (0, 0), source)
        left = index * preview_size[0]
        board.paste(background, (left, 42))
        draw.text((left + 12, 13), label, fill="#321f3d")
    output.parent.mkdir(parents=True, exist_ok=True)
    board.save(output, format="PNG", optimize=True)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> None:
    args = parse_args()
    source_image = Image.open(args.input).convert("RGBA")
    source = np.asarray(source_image, dtype=np.float32)
    rgb = source[:, :, :3]
    source_alpha = source[:, :, 3] / 255.0
    border_width = max(4, min(source_image.size) // 50)
    border = sample_border(rgb, border_width)
    key = parse_key(args.key) if args.key else np.median(border, axis=0)

    border_distance = np.linalg.norm(border - key, axis=1)
    tile_distance = background_tile_distances(rgb, key, args.tile_size)
    border_stats = percentile(border_distance, [50, 95, 99, 100])
    tile_stats = percentile(tile_distance, [50, 95, 99, 100])
    uniform = (
        border_stats[1] <= args.border_p95_limit
        and tile_distance.size > 0
        and tile_stats[1] <= args.tile_p95_limit
        and tile_stats[3] <= args.tile_max_limit
    )

    distance = np.linalg.norm(rgb - key, axis=2)
    alpha = smooth_alpha(distance, args.inner, args.outer) * source_alpha
    clean_rgb = decontaminate(rgb, alpha, key)
    output_array = np.dstack((clean_rgb, alpha[:, :, None] * 255.0)).round().astype(np.uint8)
    output_image = Image.fromarray(output_array, mode="RGBA")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    output_image.save(args.output, format="PNG", optimize=True)

    if args.audit:
        make_audit(output_image, args.audit)

    report = {
        "algorithm": "solid-color-rgb-distance-v1",
        "input": str(args.input.as_posix()),
        "output": str(args.output.as_posix()),
        "input_sha256": sha256(args.input),
        "output_sha256": sha256(args.output),
        "size": list(source_image.size),
        "key_rgb": [round(float(channel), 3) for channel in key],
        "thresholds": {
            "inner": args.inner,
            "outer": args.outer,
            "border_p95_limit": args.border_p95_limit,
            "tile_p95_limit": args.tile_p95_limit,
            "tile_max_limit": args.tile_max_limit,
        },
        "uniformity": {
            "passed": uniform,
            "border_width": border_width,
            "border_distance_p50_p95_p99_max": border_stats,
            "background_tile_count": int(tile_distance.size),
            "tile_median_distance_p50_p95_p99_max": tile_stats,
        },
        "alpha": {
            "transparent_pixel_ratio": round(float(np.mean(alpha <= 0.001)), 6),
            "partial_pixel_ratio": round(float(np.mean((alpha > 0.001) & (alpha < 0.999))), 6),
            "opaque_pixel_ratio": round(float(np.mean(alpha >= 0.999)), 6),
        },
        "decision": "candidate-for-visual-audit" if uniform else "reject-chroma-key-use-birefnet",
    }
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
