"""sns_state_reader.py — 「いま何をしているか」をリポジトリから読む。

これまでのSNSは `local_content_pool.json` の固定20件から random で1件選んでいた。
だから **3ヶ月投稿が止まっているあいだも「何ヶ月も自動投稿しています」と書いてある**
ネタを抱えたままだった（2026-09-01に実測で発覚）。

ここは「固定ネタ」ではなく **その日の実測** を材料にする。
材料はすべて **GitHub Actions の checkout の中にあるもの限定**——
外部APIの鍵を増やすと、鍵が欠けた瞬間にまた静かに死ぬ（実際 GROQ_API_KEY が無くて死んでいた）。

🔴 **すべての Fact は `numbers` と `source` を持つ。**
`numbers` はその文章に出してよい数字の全集合で、`sns_number_guard` がこれを使って
「LLMが数字をでっち上げていないか」を機械的に落とす。
`source` は「どこを数えたか」で、あとから同じ数え方を再現するために残す。
"""
from __future__ import annotations

import json
import logging
import re
import subprocess
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

logger = logging.getLogger("SNS_State_Reader")

# リポジトリのルート（このファイルは backend/modules/ に居る）
ROOT = Path(__file__).resolve().parents[2]


def _num_tokens(*values: Any) -> list[str]:
    """数字を「文章に出てきうる表記」に開いて集める。

    3000 は本文で "3,000" とも "3000" とも書かれうるので両方を許可に入れる。
    ここで漏らすと、正しい数字なのに guard に落とされて投稿が消える。
    """
    out: list[str] = []
    for v in values:
        if v is None:
            continue
        if isinstance(v, bool):
            continue
        if isinstance(v, (int, float)):
            n = int(v)
            out.append(str(n))
            if abs(n) >= 1000:
                out.append(f"{n:,}")
        else:
            out.extend(re.findall(r"\d[\d,]*", str(v)))
    return sorted(set(out))


def _read_json(rel: str) -> Any | None:
    p = ROOT / rel
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception as e:  # ファイルが無い環境でも SNS を止めない
        logger.info(f"[state] skip {rel}: {e}")
        return None


def _git(*args: str) -> str | None:
    """git をリポジトリルートで叩く。CIでも手元でも同じ結果になるよう cwd を固定する。"""
    try:
        r = subprocess.run(
            ["git", *args], cwd=ROOT, capture_output=True, text=True, timeout=20,
        )
        return r.stdout if r.returncode == 0 else None
    except Exception as e:
        logger.info(f"[state] git {' '.join(args)} failed: {e}")
        return None


# ── 材料1: 直近に実際に何を直したか ────────────────────────────────────
def _fact_recent_work() -> dict | None:
    """git log から「この1週間で何回手を入れたか」を数える。

    ⚠️ commit の件数だけを出す。**件名は出さない**——
    このリポジトリの commit message は日本語で、しかも内部の事情
    （鍵のローテーション、罠のID、未公開の商品名）が入る。
    外に出す文章の材料にするには危ない。
    """
    since = (datetime.now(timezone.utc) - timedelta(days=7)).strftime("%Y-%m-%d")
    out = _git("log", f"--since={since}", "--pretty=format:%h")
    if out is None:
        return None
    n = len([l for l in out.splitlines() if l.strip()])
    if n <= 0:
        return None
    return {
        "id": "state-commits-7d",
        "category": "build_in_public",
        "topic": "shipping pace",
        "content": (
            f"Over the last 7 days I made {n} commits to the product. "
            "Not features. Mostly fixing things that were quietly broken."
        ),
        "numbers": _num_tokens(n, 7),
        "source": f"git log --since={since} (count of commits)",
    }


# ── 材料2: 自分の商品を自分で測った結果 ────────────────────────────────
def _fact_self_audit() -> dict | None:
    """`self-audit-report.json` = Growl が Growl 自身を測った実測。

    ここが一番強い材料。**点数は良いのに、AIは自分を挙げない**という
    数字と結果のねじれが、そのまま商品の主張になっている。
    """
    d = _read_json("ai-marketing-app/lib/self-audit-report.json")
    if not isinstance(d, dict):
        return None
    scan = d.get("scan") or {}
    score = scan.get("score")
    asked = d.get("asked") or []
    if score is None or not asked:
        return None
    appeared = sum(1 for a in asked if a.get("appeared"))
    total = len(asked)
    return {
        "id": "state-self-audit",
        "category": "insight",
        "topic": "measuring my own site",
        "content": (
            f"I ran my own tool on my own site. The technical score came back {score} out of 100. "
            f"Then I checked whether the AI actually named me when asked: {appeared} out of {total}. "
            "A good score is not the same thing as being recommended."
        ),
        "numbers": _num_tokens(score, 100, appeared, total),
        "source": "ai-marketing-app/lib/self-audit-report.json (scan.score, asked[].appeared)",
    }


# ── 材料3: 自分のSNSの実績そのもの ─────────────────────────────────────
def _fact_own_sns_history() -> dict | None:
    """`sns_performance.json` = 過去に投げた投稿と、その反応。

    これを材料にできるのが今回の変更の肝。**自分の失敗を数字で出す**のは
    build in public として一番読まれる型で、しかも捏造しようがない。
    """
    d = _read_json("backend/data/sns_performance.json")
    if not isinstance(d, dict):
        return None
    posts = list((d.get("posts") or {}).values())
    if not posts:
        return None
    total = len(posts)
    likes = sum(int(p.get("likes") or 0) for p in posts)
    zero = sum(1 for p in posts if not int(p.get("likes") or 0))
    return {
        "id": "state-sns-history",
        "category": "build_in_public",
        "topic": "what my automated posting actually earned",
        "content": (
            f"My bot posted {total} times. Total likes across all of them: {likes}. "
            f"{zero} of those posts got zero. "
            "I kept the number instead of deleting it, because it is the only honest input I have."
        ),
        "numbers": _num_tokens(total, likes, zero),
        "source": "backend/data/sns_performance.json (posts[].likes)",
    }


# ── 材料4: 実際に公開されているページ数 ────────────────────────────────
def _count_measured_cities() -> int:
    """`ai-city-measurements.ts` に実際に入っている都市の件数。

    ⚠️ ここを `page.tsx` のファイル数で数えてはいけない。
    `guides/ai-picks/[city]/page.tsx` は**動的ルート1本で26都市ぶんを出す**ので、
    ファイルを数えると26が1になる。
    実際 2026-09-01 の dry run で「7ページ」と出て、正しくは32だった——
    **投稿する前に気づけたのは、材料を目で読んだから**（CLAUDE.md「生成物の目視」）。

    ⚠️ **正規表現でも数えないこと。** 次に `"slug":` の出現数で数えたら 28 になった——
    正しくは26で、`categories` 側の2件を巻き込んでいた。**同じ日に2回、数え方で間違えている。**
    このファイルは値がJSONそのものなので、**構造として読んで cities だけを数える。**
    """
    p = ROOT / "ai-marketing-app" / "lib" / "ai-city-measurements.ts"
    try:
        src = p.read_text(encoding="utf-8")
    except Exception:
        return 0
    try:
        start = src.index("} = {") + len("} = ")
        end = src.rindex("};")
        obj = json.loads(src[start:end + 1])
        return len(obj.get("cities") or [])
    except Exception as e:
        logger.info(f"[state] could not parse city measurements: {e}")
        return 0


def _fact_published_pages() -> dict | None:
    """実際に公開されているガイドページ数を、動的ルートを展開して数える。

    「27ページ公開した」と言うとき、**言った数ではなく在る数**を数える。
    CLAUDE.md の「外に出す数字は別の数え方でもう一度数える」に対応する。
    """
    base = ROOT / "ai-marketing-app" / "app" / "guides"
    if not base.is_dir():
        return None
    # 動的ルートのテンプレート自体は1ページではないので数から外す
    static_pages = [p for p in base.rglob("page.tsx") if "[" not in str(p)]
    cities = _count_measured_cities()
    n = len(static_pages) + cities
    if n <= 0:
        return None
    return {
        "id": "state-guides",
        "category": "marketing_lesson",
        "topic": "writing pages nobody asked for yet",
        "content": (
            f"There are {n} guide pages live on the site right now, and {cities} of them are just "
            "the raw answers the AI gave for one city. Most have never been read by a human. "
            "I write them anyway, because the AI reads them first."
        ),
        "numbers": _num_tokens(n, cities),
        "source": (
            "count of ai-marketing-app/app/guides/**/page.tsx (excluding dynamic templates) "
            "+ cities in lib/ai-city-measurements.ts"
        ),
    }


_BUILDERS = (
    _fact_self_audit,
    _fact_own_sns_history,
    _fact_recent_work,
    _fact_published_pages,
)


def collect_facts() -> list[dict]:
    """いま出せる Fact を全部集める。1つも作れなければ空リストを返す。

    空でも例外にしない——呼び出し側は固定プールにフォールバックする。
    **材料が読めないことを理由にSNSを止めない**（止まると誰も気づかない）。
    """
    facts: list[dict] = []
    for build in _BUILDERS:
        try:
            f = build()
        except Exception as e:
            logger.warning(f"[state] builder {build.__name__} failed: {e}")
            continue
        if f:
            facts.append(f)
    logger.info(f"[state] collected {len(facts)} facts: {[f['id'] for f in facts]}")
    return facts
