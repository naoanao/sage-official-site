"""sns_link_guard.py — 死んだリンクを外に投げない。

実測（2026-09-01）: 過去393投稿のうち **175件が `sage-official-site.pages.dev`**、
3件が `naofumi3.gumroad.com`（現在404）を指していた。**growl-ai.com を指す投稿は0件。**
投稿は自動で出ていくので、リンクが死んだことに誰も気づかないまま数ヶ月が過ぎる。

やることは2つだけ:
  ① 本文からURLを抜き、**現行ドメイン以外が混ざっていたら落とす**
  ② 現行ドメインでも、実際に叩いて 2xx/3xx が返るか確かめる

②はネットワークに触るので、繋がらない環境では **「不明」を通す**。
CIの一時的な失敗で投稿が全部止まるほうが損（①だけでも旧ドメインは防げる）。
"""
from __future__ import annotations

import logging
import re

logger = logging.getLogger("SNS_Link_Guard")

# いま生きている唯一の誘導先。ここを増やすときは、増やす理由を書くこと。
ALLOWED_HOSTS = ("growl-ai.com", "www.growl-ai.com")

# 過去に実際に投稿へ混ざっていた、もう使ってはいけない誘導先。
# 名指しで落とす——「許可リストに無い」だけだと、typo と区別がつかない。
KNOWN_DEAD_HOSTS = (
    "sage-official-site.pages.dev",
    "naofumi3.gumroad.com",
    "growl-app.vercel.app",
    "ai-marketing-app-blush.vercel.app",
)

_URL = re.compile(r"https?://[^\s<>\"')]+", re.I)
# 「growl-ai.com」のように裸で書かれる形も拾う
_BARE = re.compile(r"\b([a-z0-9][a-z0-9.-]*\.(?:com|dev|app|io|ai|jp))\b", re.I)

# 🔴 LLMは URL の中に「見た目が同じで別物のハイフン」を入れてくる。
# 2026-09-01 の dry run で実際に `growl‑ai.com`（U+2011 非改行ハイフン）が出た。
# 目で見て気づけない・クリックしても開かない・しかも旧版の検査は
# **ホストとして認識できず素通し**していた（＝壊れたリンクだけが外に出る）。
_FANCY_DASHES = "‐‑‒–—―−－"
_DASH_TABLE = {ord(c): "-" for c in _FANCY_DASHES}


def repair_link_dashes(text: str) -> str:
    """URLらしいトークンの中の非ASCIIハイフンだけをASCIIに直す。

    本文の普通の文章（"one‑sentence" のような組版ハイフン）は触らない——
    そこは読めればよく、直す必要が無い。**壊れると困るのはリンクだけ。**
    """
    if not text:
        return text

    def fix(m: re.Match) -> str:
        return m.group(0).translate(_DASH_TABLE)

    # 「.com などで終わる、ハイフン類を含みうる連続した塊」を対象にする
    pattern = re.compile(
        r"(?:https?://)?[a-z0-9" + _FANCY_DASHES + r"][a-z0-9." + _FANCY_DASHES + r"-]*"
        r"\.(?:com|dev|app|io|ai|jp)(?:/[^\s]*)?",
        re.I,
    )
    return pattern.sub(fix, text)


def has_broken_link_dashes(text: str) -> bool:
    """URL部分に非ASCIIハイフンが残っているか（修復前の検出用）。"""
    return repair_link_dashes(text) != (text or "")


def extract_hosts(text: str) -> list[str]:
    """本文に出てくるホスト名を、http付き・裸の両方から集める。"""
    hosts = []
    for m in _URL.finditer(text or ""):
        h = re.sub(r"^https?://", "", m.group(0), flags=re.I).split("/")[0]
        hosts.append(h.lower())
    stripped = _URL.sub(" ", text or "")
    for m in _BARE.finditer(stripped):
        hosts.append(m.group(1).lower())
    return sorted(set(hosts))


def check_text(text: str) -> tuple[bool, list[str]]:
    """本文のリンクが現行の誘導先だけか。戻り値は (通ったか, 問題のホスト)。

    判定は2段階にする:
      ① **名指しの死んだ誘導先**は、許可リストに何が入っていても必ず落とす
      ② それ以外は、許可リストに無ければ落とす

    ①が要るのは、②だけだと「許可リストを広げた瞬間に旧ドメインが復活する」から。
    実際 growl-app.vercel.app は本番のエイリアスと紛らわしく、
    許可に足したくなる形をしている（足すと175投稿の再発になる）。
    """
    hosts = extract_hosts(text)
    dead = [h for h in hosts if h in KNOWN_DEAD_HOSTS]
    unknown = [h for h in hosts if h not in ALLOWED_HOSTS and h not in KNOWN_DEAD_HOSTS]
    bad = dead + unknown
    if dead:
        logger.error(f"[link] a retired destination came back: {dead}")
    return (not bad), bad


def url_is_live(url: str, timeout: float = 8.0) -> bool | None:
    """実際に叩いて生きているか。**繋がらないときは None（不明）** を返す。

    True/False/None を区別するのが肝。None を False として扱うと、
    ネットワークが不調な日にSNSが丸ごと止まる。
    """
    try:
        import requests
    except Exception:
        return None
    if not url.startswith("http"):
        url = "https://" + url
    try:
        r = requests.get(url, timeout=timeout, allow_redirects=True)
        return 200 <= r.status_code < 400
    except Exception as e:
        logger.info(f"[link] could not reach {url}: {e}")
        return None
