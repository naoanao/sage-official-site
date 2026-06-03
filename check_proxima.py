#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os
from pathlib import Path

base = Path(r"C:\Users\nao\AppData\Local\Programs\Proxima")
src  = base / "resources" / "app.asar.unpacked" / "src"

print(f"src ディレクトリ: {src}")
print(f"存在: {src.exists()}\n")

if src.exists():
    for f in sorted(src.iterdir()):
        print(f"  {f.name}")
else:
    # app.asar.unpacked 全体を探索
    unpacked = base / "resources" / "app.asar.unpacked"
    if unpacked.exists():
        print("app.asar.unpacked 直下:")
        for f in sorted(unpacked.iterdir()):
            print(f"  {f.name}")
    else:
        print("resources 以下:")
        res = base / "resources"
        if res.exists():
            for f in sorted(res.iterdir()):
                print(f"  {f.name}")

input("\nEnterで終了")
