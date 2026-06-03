"""
Utilities for reading published note.com articles as writing references.

This module is intentionally read-only. It never posts or edits note.com.
It tries note's public JSON endpoint first, then falls back to page metadata.
"""

from __future__ import annotations

import json
import re
from dataclasses import asdict, dataclass
from html import unescape
from typing import Any

import requests


NOTE_KEY_RE = re.compile(r"/n/(?P<key>n[a-zA-Z0-9]+)")


@dataclass
class NoteArticleAnalysis:
    url: str
    note_key: str
    title: str
    body_text: str
    char_count: int
    line_count: int
    source: str
    voice_notes: list[str]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def extract_note_key(url: str) -> str:
    match = NOTE_KEY_RE.search(url)
    if not match:
        raise ValueError(f"Could not find note key in URL: {url}")
    return match.group("key")


def _strip_html(value: str) -> str:
    value = re.sub(r"<br\s*/?>", "\n", value, flags=re.I)
    value = re.sub(r"</p\s*>", "\n", value, flags=re.I)
    value = re.sub(r"<[^>]+>", "", value)
    value = unescape(value)
    value = re.sub(r"\n{3,}", "\n\n", value)
    return value.strip()


def _find_text_payload(data: Any) -> tuple[str, str]:
    """Return title/body from the public JSON shape without assuming stability."""
    if isinstance(data, dict):
        title = ""
        for key in ("title", "name"):
            if isinstance(data.get(key), str):
                title = data[key]
                break
        body = ""
        for key in ("body", "text", "content", "description"):
            if isinstance(data.get(key), str) and len(data[key]) > len(body):
                body = data[key]

        for value in data.values():
            child_title, child_body = _find_text_payload(value)
            title = title or child_title
            if len(child_body) > len(body):
                body = child_body
        return title, body

    if isinstance(data, list):
        best_title = ""
        best_body = ""
        for item in data:
            title, body = _find_text_payload(item)
            best_title = best_title or title
            if len(body) > len(best_body):
                best_body = body
        return best_title, best_body

    return "", ""


def _fetch_from_api(note_key: str) -> tuple[str, str]:
    res = requests.get(
        f"https://note.com/api/v3/notes/{note_key}",
        headers={"User-Agent": "Mozilla/5.0"},
        timeout=20,
    )
    res.raise_for_status()
    title, body = _find_text_payload(res.json())
    return title.strip(), _strip_html(body)


def _fetch_from_html(url: str) -> tuple[str, str]:
    res = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=20)
    res.raise_for_status()
    html = res.text

    title_match = re.search(r'<meta property="og:title" content="([^"]*)"', html)
    desc_match = re.search(r'<meta property="og:description" content="([^"]*)"', html)
    title = unescape(title_match.group(1)).strip() if title_match else ""
    body = unescape(desc_match.group(1)).strip() if desc_match else ""
    return title, body


def _voice_notes(body: str) -> list[str]:
    lines = [line.strip() for line in body.splitlines() if line.strip()]
    notes: list[str] = []
    if lines:
        avg_len = sum(len(line) for line in lines) / len(lines)
        notes.append(f"平均行長: {avg_len:.1f}字")
    if any("正直" in line for line in lines):
        notes.append("正直な感情を入れている")
    if any(re.search(r"\d", line) for line in lines):
        notes.append("数字で現場感を出している")
    if body.find("とは") > -1 and body.find("とは") < 200:
        notes.append("冒頭が定義寄りになっている可能性あり")
    else:
        notes.append("冒頭は定義よりストーリー寄り")
    return notes


def analyze_note_article(url: str) -> NoteArticleAnalysis:
    note_key = extract_note_key(url)
    source = "api"
    try:
        title, body = _fetch_from_api(note_key)
    except Exception:
        source = "html"
        title, body = _fetch_from_html(url)

    body = body.strip()
    return NoteArticleAnalysis(
        url=url,
        note_key=note_key,
        title=title,
        body_text=body,
        char_count=len(body),
        line_count=len([line for line in body.splitlines() if line.strip()]),
        source=source,
        voice_notes=_voice_notes(body),
    )


if __name__ == "__main__":
    import sys

    if len(sys.argv) != 2:
        raise SystemExit("Usage: python -m backend.modules.note_article_analyzer <note_url>")
    result = analyze_note_article(sys.argv[1])
    print(json.dumps(result.to_dict(), ensure_ascii=False, indent=2))
