"""sns_number_guard.py — 投稿文に出てきた数字が、元データに実在するかを機械的に確かめる。

背景: プロンプトには前から "Never make up numbers" と書いてあった。**書いてあるだけだった。**
LLM は指示を破るし、破ったことは誰にも見えない（投稿は自動で外に出ていく）。
CLAUDE.md の完了判定にある「外に出す数字は、別の数え方でもう一度数えてから出す」を
人ではなくコードにやらせるのがここ。

判定は単純: **本文に現れた数字トークンが1つでも許可集合に無ければ落とす。**
落ちたら書き直させ、それでもダメなら**投稿しない**。
黙って出すより、出さないほうがいい（訂正は取り消せない）。
"""
from __future__ import annotations

import re

# 数字そのものではなく「言い回しの一部」として現れるもの。
# ここを許さないと、日常的な英語（24/7, one-on-one）まで落ちて投稿が消える。
_SAFE_PHRASES = (
    "24/7",
    "day 1",
    "1:1",
    "one-on-one",
    "gpt-4",
    "gpt-5",
    "web3",
    "b2b",
    "b2c",
)

# 年（2020〜2039）は事実として書かれることが多く、捏造の温床になりにくい。
_YEAR = re.compile(r"^20[2-3]\d$")

_NUM = re.compile(r"\d[\d,]*(?:\.\d+)?")


def _normalize(tok: str) -> str:
    """"3,000" と "3000" を同じものとして扱う。末尾の小数 .0 も落とす。"""
    t = tok.replace(",", "")
    if t.endswith(".0"):
        t = t[:-2]
    return t


def extract_numbers(text: str) -> list[str]:
    """本文から、検査対象になる数字トークンを取り出す。

    先に「言い回し」を伏せてから数える——伏せないと 24/7 の 24 と 7 が
    捏造扱いになって、正しい文章が落ちる。
    """
    low = text.lower()
    for p in _SAFE_PHRASES:
        low = low.replace(p, " ")
    # URL の中の数字は本文の主張ではないので見ない
    low = re.sub(r"https?://\S+", " ", low)
    # ハッシュタグの中の数字も主張ではない
    low = re.sub(r"#\S+", " ", low)
    out = []
    for m in _NUM.finditer(low):
        t = _normalize(m.group(0))
        if _YEAR.match(t):
            continue
        out.append(t)
    return out


def verify_numbers(text: str, allowed: list[str] | None) -> tuple[bool, list[str]]:
    """本文の数字がすべて許可集合に入っているか。

    戻り値は (通ったか, 許可されていなかった数字).
    `allowed` が空/None のときは **数字を1つも書いてはいけない** と解釈する
    （材料に数字が無いのに数字が出てきたら、それは発明されたもの）。
    """
    ok_set = {_normalize(a) for a in (allowed or [])}
    bad = [n for n in extract_numbers(text) if n not in ok_set]
    return (not bad), bad
