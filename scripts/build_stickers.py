#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
stickers_src/ に置かれた透過PNGを読み、
箱形式のパック .json（base64束ね）を stickers/ に生成し、
stickers/index.json（カタログ）を追記マージで再構築する。
"""

import os
import re
import json
import base64
import hashlib
import datetime

SRC_DIR = "stickers_src"
OUT_DIR = "stickers"
INDEX = os.path.join(OUT_DIR, "index.json")

PALETTE = [
    "#f5b301", "#e23b3b", "#3aa3a3", "#3a6ea3", "#8a7a5a", "#9a7b4f",
    "#4a7c59", "#d94f8a", "#e0962f", "#7a5ac2", "#2f9e6f", "#c2662f",
    "#5a7ad9", "#b0562f", "#6f9a2f", "#9a2f6f",
]


def natural_key(s):
    return [int(t) if t.isdigit() else t.lower()
            for t in re.split(r"(\d+)", s)]


def slug_for(name):
    if re.fullmatch(r"[A-Za-z0-9_-]+", name):
        return name.lower()
    return "p" + hashlib.sha1(name.encode("utf-8")).hexdigest()[:8]


def png_to_data_uri(path):
    with open(path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode("ascii")
    return "data:image/png;base64," + b64


def load_json(path, default):
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return default


def build_pack(folder):
    folder_name = os.path.basename(folder.rstrip("/"))
    meta = load_json(os.path.join(folder, "meta.json"), {})

    pack_id = meta.get("id") or ("stk." + slug_for(folder_name))
    slug = slug_for(folder_name)
    file_name = f"{slug}.json"
    name = meta.get("name") or folder_name

    pngs = sorted(
        [f for f in os.listdir(folder) if f.lower().endswith(".png")],
        key=natural_key,
    )
    stickers = []
    for p in pngs:
        stickers.append({
            "name": os.path.splitext(p)[0],
            "data": png_to_data_uri(os.path.join(folder, p)),
        })

    if not stickers:
        return None, None

    pack_json = {
        "_myStickers": 1,
        "app": "箱",
        "version": "depot",
        "packs": [{"name": name, "stickers": stickers}],
    }

    color = meta.get("color") or PALETTE[
        int(hashlib.sha1(pack_id.encode()).hexdigest(), 16) % len(PALETTE)
    ]
    desc = meta.get("desc") or f"{len(stickers)}個のスタンプ"
    icon = meta.get("icon") or "📦"

    entry = {
        "id": pack_id,
        "name": name,
        "icon": icon,
        "color": color,
        "desc": desc,
        "records": len(stickers),
        "file": file_name,
    }
    if meta.get("category"):
        entry["category"] = meta["category"]

    return pack_json, entry


def main():
    os.makedirs(OUT_DIR, exist_ok=True)

    index = load_json(INDEX, {
        "_boxCatalog": 1,
        "kind": "sticker",
        "title": "スタンプ倉庫",
        "packs": [],
    })
    existing = index.get("packs", [])
    id_pos = {p["id"]: i for i, p in enumerate(existing)}

    if not os.path.isdir(SRC_DIR):
        print(f"{SRC_DIR}/ が無いので何もしません。")
        return

    built = 0
    for folder_name in sorted(os.listdir(SRC_DIR)):
        folder = os.path.join(SRC_DIR, folder_name)
        if not os.path.isdir(folder):
            continue

        pack_json, entry = build_pack(folder)
        if entry is None:
            continue

        with open(os.path.join(OUT_DIR, entry["file"]), "w",
                  encoding="utf-8") as f:
            json.dump(pack_json, f, ensure_ascii=False)

        if entry["id"] in id_pos:
            existing[id_pos[entry["id"]]] = entry
        else:
            existing.append(entry)
            id_pos[entry["id"]] = len(existing) - 1

        built += 1
        print(f"  OK {entry['name']} ({entry['records']}) -> {entry['file']}")

    index["packs"] = existing
    index["updated"] = datetime.date.today().isoformat()

    with open(INDEX, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False)

    print(f"完了：{built}パック生成、カタログ全{len(existing)}パック。")


if __name__ == "__main__":
    main()
