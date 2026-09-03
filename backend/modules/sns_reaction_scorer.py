"""sns_reaction_scorer.py — 前に出した投稿の反応を読み、次に何を出すかに反映する。

これまで `sns_performance.json` は **溜まるだけ**だった。
書くのは backend/flask_server.py（なおのPCで動くFlask）、
読むのは routes/sns_writer.py の要約API——**投稿する側は一度も開いていなかった**。
だから393投稿ぶんの実測があっても、次の1投稿は何も学ばずに出ていた
（learned:true は 393件中31件）。

ここが投稿側とデータを繋ぐ最後の一本。やることは2つだけ:
  ① どの型（category）が反応されたかを平均で出す
  ② **ゼロが続いた型は、しばらく出さない**

⚠️ 凝った学習はしない。母数が小さく（最高でも3いいね）、
   細かい最適化をしても差が出ないのに、壊れたとき誰も気づけなくなる。
"""
from __future__ import annotations

import json
import logging
import re
from pathlib import Path

logger = logging.getLogger("SNS_Reaction_Scorer")

ROOT = Path(__file__).resolve().parents[2]
PERFORMANCE_PATH = ROOT / "backend" / "data" / "sns_performance.json"

# 反応の重み。返信とリポストは「読んで手を動かした」ぶん、いいねより重い。
_W_LIKE, _W_REPOST, _W_REPLY = 1.0, 3.0, 3.0

# 直近この件数だけを見る。
_RECENT = 60

# この件数連続でスコア0なら、その型を避ける。
_DEAD_STREAK = 8

# 🔴 これより前の投稿は、学習の材料にしない。
# 記録に残る393投稿は 2026-04-17〜05-21 のもので、**売っていた商品も誘導先も違う**
# （175件が sage-official-site.pages.dev を指していた）。
# 別商品の反応で「この型は当たらない」と判断すると、いま一番強い材料まで捨てる——
# 実際 2026-09-01 の dry run で、自社測定の材料（94点なのに0/8）が
# insight 判定で外されかけた。**売っていない商品の実績に、今の発信を決めさせない。**
_ERA_START = "2026-08-24"  # 自社測定 self-audit-report.json を取った日＝現商品の姿が確定した日

# この件数に満たなければ「まだ判断材料が足りない」として何も避けない。
_MIN_SAMPLE = 10


def _score(post: dict) -> float:
    return (
        _W_LIKE * int(post.get("likes") or 0)
        + _W_REPOST * int(post.get("reposts") or 0)
        + _W_REPLY * int(post.get("replies") or 0)
    )


def _load_posts() -> list[dict]:
    try:
        d = json.loads(PERFORMANCE_PATH.read_text(encoding="utf-8"))
    except Exception as e:
        logger.info(f"[scorer] performance data unavailable: {e}")
        return []
    posts = list((d.get("posts") or {}).values())
    # 現商品になってから出した投稿だけを残す（理由は _ERA_START の注記）
    posts = [p for p in posts if str(p.get("created_at") or "") >= _ERA_START]
    posts.sort(key=lambda p: str(p.get("created_at") or ""))
    return posts[-_RECENT:]


def _infer_category(post: dict) -> str:
    """過去の投稿には category が保存されていないので、本文から推定する。

    ⚠️ これは**過去データを捨てないための橋渡し**。
    今後の投稿は category を持って保存されるので、そちらを優先して読む。
    """
    c = post.get("category")
    if c:
        return str(c)
    t = (post.get("text") or "").lower()
    if "?" in t:
        return "question"
    if re.search(r"\bi (built|shipped|ran|tried|spent|kept)\b", t):
        return "build_in_public"
    if re.search(r"https?://|\.com\b", t):
        return "growl_cta"
    return "insight"


def category_scores() -> dict[str, dict]:
    """型ごとの {avg, n, zero_streak} を返す。データが無ければ空 dict。"""
    posts = _load_posts()
    if not posts:
        return {}
    buckets: dict[str, list[float]] = {}
    for p in posts:
        buckets.setdefault(_infer_category(p), []).append(_score(p))
    out: dict[str, dict] = {}
    for cat, scores in buckets.items():
        streak = 0
        for s in reversed(scores):  # 新しい順に見て、0が何件続いているか
            if s > 0:
                break
            streak += 1
        out[cat] = {
            "avg": round(sum(scores) / len(scores), 3),
            "n": len(scores),
            "zero_streak": streak,
        }
    return out


def categories_to_avoid() -> set[str]:
    """反応が途切れて久しい型。**全滅しているときは何も避けない。**

    全部の型がゼロ続きのとき（実際いまがそれに近い）に全部避けると、
    投稿が1件も出せなくなる。それは「学習」ではなく停止なので、
    **避けるのは、生きている型が1つ以上あるときだけ**にする。
    """
    scores = category_scores()
    if not scores:
        return set()
    sample = sum(v["n"] for v in scores.values())
    if sample < _MIN_SAMPLE:
        logger.info(f"[scorer] only {sample} posts since {_ERA_START} — too few to steer anything.")
        return set()
    alive = {c for c, v in scores.items() if v["zero_streak"] < _DEAD_STREAK}
    if not alive:
        logger.info("[scorer] every category is cold — not filtering anything.")
        return set()
    dead = {c for c, v in scores.items() if v["zero_streak"] >= _DEAD_STREAK}
    if dead:
        logger.info(f"[scorer] avoiding cold categories: {sorted(dead)}")
    return dead
