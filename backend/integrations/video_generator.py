"""
video_generator.py — Sage AI SNS用ショート動画自動生成モジュール v2

テキスト＋画像のスライドショー動画を生成する（15〜30秒）
対象プラットフォーム: Bluesky / Instagram Reels

v2 追加機能:
  - BGM自動合成 (HuggingFace MusicGen / SunoAgent)
  - Kenバーンズ効果 (スライドにズームイン/アウトアニメーション)
  - テキストフェードイン (スライド表示時にテキストをフェードイン)

依存: moviepy>=2.1, Pillow (PIL), numpy
"""

import os
import logging
import textwrap
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import numpy as np
from PIL import Image, ImageDraw, ImageFont

# .env を自動ロード（CMDなど環境変数が未設定の場合でも API キーを使えるようにする）
try:
    from dotenv import load_dotenv as _load_dotenv
    _load_dotenv(Path(__file__).parent.parent.parent / ".env", override=False)
except Exception:
    pass

logger = logging.getLogger("VideoGenerator")

# ── Path constants ─────────────────────────────────────────────────────────────
_BASE_DIR = Path(__file__).parent.parent.parent
_VIDEO_OUTPUT_DIR = _BASE_DIR / "backend" / "data" / "videos"
_FONT_DIR = Path(__file__).parent.parent / "assets" / "fonts"
_ASSETS_DIR = Path(__file__).parent.parent / "assets"

# ── Video specs ────────────────────────────────────────────────────────────────
# Instagram Reels / Bluesky共通: 1080x1920 (9:16縦型)
VIDEO_WIDTH = 1080
VIDEO_HEIGHT = 1920
VIDEO_FPS = 24

# ── Color palette (Sage AI brand) ──────────────────────────────────────────────
BRAND_DARK = (26, 26, 77)          # ダークネイビー
BRAND_BLUE = (51, 140, 230)        # ブルー
BRAND_LIGHT = (245, 247, 255)      # ライトグレー
BRAND_WHITE = (255, 255, 255)
BRAND_GOLD = (255, 196, 57)        # アクセントゴールド
TEXT_GRAY = (180, 185, 210)        # サブテキスト


def _ensure_output_dir() -> Path:
    _VIDEO_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    return _VIDEO_OUTPUT_DIR


# ══════════════════════════════════════════════════════════════════════════════
# 背景画像取得
# ══════════════════════════════════════════════════════════════════════════════

def _make_gradient_bg() -> np.ndarray:
    """
    ネットワーク不要のプログラム生成グラデーション背景。
    テック・AI テーマの深紺→紫グラデーション＋幾何学的ドット装飾。
    Returns: RGB numpy array (H, W, 3)
    """
    img = Image.new("RGB", (VIDEO_WIDTH, VIDEO_HEIGHT))
    draw = ImageDraw.Draw(img)

    # 垂直グラデーション: 深紺 → 暗紫
    top_col    = (8, 8, 32)
    bottom_col = (22, 8, 48)
    for y in range(VIDEO_HEIGHT):
        t = y / VIDEO_HEIGHT
        r = int(top_col[0] + (bottom_col[0] - top_col[0]) * t)
        g = int(top_col[1] + (bottom_col[1] - top_col[1]) * t)
        b = int(top_col[2] + (bottom_col[2] - top_col[2]) * t)
        draw.line([(0, y), (VIDEO_WIDTH, y)], fill=(r, g, b))

    # 微細ドットグリッド装飾（テック感）
    dot_color = (255, 255, 255, 18)
    dot_img = Image.new("RGBA", (VIDEO_WIDTH, VIDEO_HEIGHT), (0, 0, 0, 0))
    dot_draw = ImageDraw.Draw(dot_img)
    spacing = 48
    for gy in range(0, VIDEO_HEIGHT, spacing):
        for gx in range(0, VIDEO_WIDTH, spacing):
            dot_draw.ellipse([gx - 1, gy - 1, gx + 1, gy + 1], fill=dot_color)

    # 対角ライン装飾（右上アクセント）
    line_color = (80, 120, 255, 12)
    for i in range(0, VIDEO_WIDTH + VIDEO_HEIGHT, 120):
        dot_draw.line([(i, 0), (0, i)], fill=line_color, width=1)

    base = img.convert("RGBA")
    base.alpha_composite(dot_img)
    return np.array(base.convert("RGB"))


# テーマ別の Picsum 厳選シード（テック・ビジネス向け写真に対応しやすい値）
_PICSUM_THEME_SEEDS: dict = {
    "tech":       [10, 48, 119, 160, 180, 239, 326, 397, 447, 503],
    "business":   [20, 42, 76,  98,  150, 210, 270, 330, 400, 460],
    "city":       [11, 29, 55,  83,  142, 196, 250, 312, 380, 430],
    "abstract":   [15, 37, 67,  99,  155, 218, 288, 345, 412, 478],
    "dark":       [18, 44, 72,  100, 163, 225, 295, 360, 420, 485],
}
_TECH_KEYWORDS = [
    "ai", "ml", "python", "data", "code", "programming", "software",
    "digital", "cloud", "api", "automation", "robot", "machine",
    "ツール", "自動化", "ai", "エンジニア", "プログラム", "データ",
]
_BUSINESS_KEYWORDS = [
    "business", "marketing", "money", "income", "profit", "work",
    "副業", "収入", "稼ぐ", "ビジネス", "マーケ", "売上",
]
_CITY_KEYWORDS = [
    "city", "urban", "street", "life", "lifestyle",
    "生活", "暮らし", "日常",
]


def _pick_picsum_seed(keyword: str) -> int:
    """キーワードに合ったテーマシードを返す（常に同じ結果）"""
    import random as _r
    kw_lower = keyword.lower()
    if any(k in kw_lower for k in _TECH_KEYWORDS):
        seeds = _PICSUM_THEME_SEEDS["tech"]
    elif any(k in kw_lower for k in _BUSINESS_KEYWORDS):
        seeds = _PICSUM_THEME_SEEDS["business"]
    elif any(k in kw_lower for k in _CITY_KEYWORDS):
        seeds = _PICSUM_THEME_SEEDS["city"]
    else:
        seeds = _PICSUM_THEME_SEEDS["abstract"]
    # キーワードのハッシュで固定選択（毎回同じ画像）
    return seeds[abs(hash(keyword)) % len(seeds)]


def _fetch_background_image(keyword: str) -> Optional[np.ndarray]:
    """
    動画の背景画像を取得する。
    1. PEXELS_API_KEY が設定されている場合: Pexels API で検索
    2. Picsum Photos フォールバック（テーマ別厳選シード）
    3. 最終フォールバック: プログラム生成グラデーション（常に成功）

    Returns: RGB numpy array (H, W, 3)  ※ None は返さない
    """
    import io as _io
    import urllib.request as _urlreq
    import urllib.parse as _urlparse
    import json as _json

    pexels_key = os.environ.get("PEXELS_API_KEY", "").strip()

    if pexels_key:
        try:
            encoded = _urlparse.quote(keyword)
            url = (f"https://api.pexels.com/v1/search"
                   f"?query={encoded}&orientation=portrait&per_page=5&size=medium")
            req = _urlreq.Request(url, headers={"Authorization": pexels_key})
            with _urlreq.urlopen(req, timeout=8) as resp:
                data = _json.loads(resp.read().decode("utf-8"))
            photos = data.get("photos", [])
            if photos:
                import random as _r
                photo = _r.choice(photos[:5])
                img_url = photo["src"].get("portrait", photo["src"]["original"])
                req2 = _urlreq.Request(img_url, headers={"User-Agent": "SageAI/2.0"})
                with _urlreq.urlopen(req2, timeout=15) as img_resp:
                    img_bytes = img_resp.read()
                img = Image.open(_io.BytesIO(img_bytes)).convert("RGB")
                img = img.resize((VIDEO_WIDTH, VIDEO_HEIGHT), Image.LANCZOS)
                logger.info(f"[Video BG] Pexels 取得成功: '{keyword}'")
                return np.array(img)
        except Exception as e:
            logger.warning(f"[Video BG] Pexels API エラー: {e}")

    # Picsum Photos フォールバック（テーマ別厳選シード）
    try:
        seed = _pick_picsum_seed(keyword)
        url = f"https://picsum.photos/seed/{seed}/{VIDEO_WIDTH}/{VIDEO_HEIGHT}"
        req = _urlreq.Request(url, headers={"User-Agent": "SageAI/2.0"})
        with _urlreq.urlopen(req, timeout=15) as resp:
            img_bytes = resp.read()
        img = Image.open(_io.BytesIO(img_bytes)).convert("RGB")
        img = img.resize((VIDEO_WIDTH, VIDEO_HEIGHT), Image.LANCZOS)
        logger.info(f"[Video BG] Picsum 取得成功 (seed={seed}, keyword='{keyword}')")
        return np.array(img)
    except Exception as e:
        logger.warning(f"[Video BG] Picsum Photos エラー: {e}")

    # 最終フォールバック: プログラム生成グラデーション（ネットワーク不要）
    logger.info("[Video BG] グラデーション背景を使用")
    return _make_gradient_bg()



import re as _re

def _strip_emoji(text: str) -> str:
    """絵文字（PIL描画不可）のみ除去。日本語・CJK文字はそのまま保持。"""
    # Only strip actual emoji codepoints, leave CJK/Japanese intact
    emoji_pattern = _re.compile(
        "["
        "😀-🙏"   # emoticons
        "🌀-🗿"   # symbols & pictographs (no CJK overlap)
        "🚀-🛿"   # transport & map symbols
        "🜀-🝿"   # alchemical symbols
        "🞀-🟿"   # geometric shapes extended
        "🠀-🣿"   # supplemental arrows
        "🤀-🧿"   # supplemental symbols & pictographs
        "🨀-🩯"   # chess symbols
        "🩰-🫿"   # symbols & pictographs extended-A
        "✂-➰"   # dingbats
        "‍"              # zero width joiner
        "️"              # variation selector-16
        "☀-⛿"   # misc symbols (excl. CJK)
        "]+", flags=_re.UNICODE)
    return emoji_pattern.sub('', text).strip()

def _apply_bg_to_slide(img: Image.Image,
                        bg_image: Optional[np.ndarray],
                        overlay_alpha: int = 155,
                        brand_blend: float = 0.20) -> Image.Image:
    """
    背景画像をスライドに適用する。
    - ダークオーバーレイで文字の可読性を確保
    - ブランドカラーを薄く重ねてSage AI感を残す
    """
    if bg_image is None:
        return img
    try:
        bg_pil = Image.fromarray(bg_image).convert("RGBA")
        bg_pil = bg_pil.resize((VIDEO_WIDTH, VIDEO_HEIGHT), Image.LANCZOS)
        # ① ダーク + ブルー寄りのオーバーレイ
        overlay = Image.new("RGBA", (VIDEO_WIDTH, VIDEO_HEIGHT), (5, 5, 40, overlay_alpha))
        bg_dark = Image.alpha_composite(bg_pil, overlay)
        # ② ブランドグラデーションをごく薄く重ねる
        brand_layer = img.convert("RGBA") if img.mode != "RGBA" else img
        result = Image.blend(bg_dark, brand_layer, brand_blend)
        return result
    except Exception as e:
        logger.warning(f"[Video BG] 背景適用エラー: {e}")
        return img


def _clip_fl(clip, func):
    """MoviePy 1.x / 2.x 互換: フレーム変換関数を適用する"""
    try:
        return clip.fl(func)        # MoviePy 1.x
    except AttributeError:
        return clip.transform(func) # MoviePy 2.x


def _clip_set_duration(clip, duration):
    """MoviePy 1.x / 2.x 互換: クリップに長さを設定する"""
    try:
        return clip.set_duration(duration)  # MoviePy 1.x
    except AttributeError:
        return clip.with_duration(duration) # MoviePy 2.x


# ══════════════════════════════════════════════════════════════════════════════
# v2 ヘルパー: Kenバーンズ効果
# ══════════════════════════════════════════════════════════════════════════════

def _make_ken_burns_clip(frame: np.ndarray, duration: float, fps: int,
                          zoom_start: float = 1.0, zoom_end: float = 1.10) -> "ImageClip":
    """
    静止画フレームにKenバーンズ効果（ゆっくりズームイン）を適用したClipを返す。

    Args:
        frame: numpy RGB配列 (H, W, 3)
        duration: クリップの長さ（秒）
        fps: フレームレート
        zoom_start: 開始ズーム倍率 (1.0 = 等倍)
        zoom_end: 終了ズーム倍率 (1.10 = 10%拡大)
    """
    try:
        from moviepy import ImageClip
    except ImportError:
        from moviepy.editor import ImageClip

    h, w = frame.shape[:2]

    def zoom_frame(get_frame, t):
        progress = t / duration if duration > 0 else 1.0
        scale = zoom_start + (zoom_end - zoom_start) * progress
        new_w = int(w * scale)
        new_h = int(h * scale)
        img = Image.fromarray(get_frame(t))
        resized = img.resize((new_w, new_h), Image.LANCZOS)
        # センタークロップ
        left = (new_w - w) // 2
        top = (new_h - h) // 2
        cropped = resized.crop((left, top, left + w, top + h))
        return np.array(cropped)

    clip = _clip_set_duration(ImageClip(frame), duration)
    return _clip_fl(clip, zoom_frame)


# ══════════════════════════════════════════════════════════════════════════════
# v2 ヘルパー: テキストフェードイン
# ══════════════════════════════════════════════════════════════════════════════

def _make_fadein_clip(frame_bg: np.ndarray, frame_full: np.ndarray,
                      duration: float, fps: int,
                      fade_duration: float = 0.7,
                      use_ken_burns: bool = True) -> "ImageClip":
    """
    フレームをテキストフェードイン + Kenバーンズで合成したClipを返す。

    - fade_duration秒かけてbg→fullにアルファブレンド
    - 残り時間はfull表示（Kenバーンズ継続）
    """
    try:
        from moviepy import ImageClip
    except ImportError:
        from moviepy.editor import ImageClip

    h, w = frame_bg.shape[:2]
    fade_dur = min(fade_duration, duration * 0.5)

    # ズーム倍率（Kenバーンズ用）
    zoom_end = 1.10 if use_ken_burns else 1.0

    def render_frame(get_frame, t):
        # ── Kenバーンズ計算 ─────────────────────────────────────────────
        scale = 1.0 + (zoom_end - 1.0) * (t / duration)
        new_w = int(w * scale)
        new_h = int(h * scale)

        # ── ベースをズーム ──────────────────────────────────────────────
        alpha = min(t / fade_dur, 1.0) if fade_dur > 0 else 1.0
        # フレードin: alpha=0でbg、alpha=1でfull
        blended = (frame_bg.astype(np.float32) * (1 - alpha) +
                   frame_full.astype(np.float32) * alpha).clip(0, 255).astype(np.uint8)

        # ── ズーム ─────────────────────────────────────────────────────
        img = Image.fromarray(blended)
        resized = img.resize((new_w, new_h), Image.LANCZOS)
        left = (new_w - w) // 2
        top = (new_h - h) // 2
        cropped = resized.crop((left, top, left + w, top + h))
        return np.array(cropped)

    clip = _clip_set_duration(ImageClip(frame_bg), duration)
    return _clip_fl(clip, render_frame)


# ══════════════════════════════════════════════════════════════════════════════
# v2 ヘルパー: BGM合成
# ══════════════════════════════════════════════════════════════════════════════

def _add_bgm_to_clip(final_clip, topic: str, niche: str = "",
                     total_duration: float = 30.0, volume: float = 0.12):
    """
    SunoAgent (HuggingFace MusicGen) でBGMを生成してclipに合成する。
    失敗時は元のclipをそのまま返す（サイレントフォールバック）。
    """
    try:
        from moviepy import AudioFileClip
    except ImportError:
        try:
            from moviepy.editor import AudioFileClip
        except ImportError:
            logger.warning("[Video BGM] moviepy AudioFileClip not available")
            return final_clip

    try:
        import sys, os
        sys.path.insert(0, str(_BASE_DIR / "backend" / "integrations"))
        from suno_agent import SunoAgent

        agent = SunoAgent(quality="fast")   # fast = musicgen-small (高速)
        result = agent.generate_bgm(
            topic=topic,
            niche=niche,
            duration_seconds=min(int(total_duration) + 5, 30),
        )

        if result.get("status") not in ("success",):
            logger.info(f"[Video BGM] SunoAgent returned: {result.get('status')} — no audio")
            return final_clip

        bgm_path = result["local_path"]
        if not bgm_path or not os.path.exists(bgm_path):
            logger.warning("[Video BGM] BGM file not found")
            return final_clip

        audio = AudioFileClip(bgm_path)

        # 動画より短い場合はループ
        if audio.duration < total_duration:
            from moviepy import concatenate_audioclips
            loops = int(total_duration / audio.duration) + 2
            audio = concatenate_audioclips([audio] * loops)

        audio = audio.subclipped(0, total_duration).multiply_volume(volume)
        result_clip = final_clip.with_audio(audio)
        logger.info(f"[Video BGM] ✅ BGM merged (vol={volume}, path={bgm_path})")
        return result_clip

    except Exception as e:
        logger.warning(f"[Video BGM] Failed to add BGM: {e} — continuing without audio")
        return final_clip


def _load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    """フォントを読み込む。日本語対応フォントを優先。"""
    # Windowsシステムフォントディレクトリ
    win_fonts = os.path.join(os.environ.get("WINDIR", "C:\\Windows"), "Fonts")

    font_candidates = [
        # プロジェクト同梱フォント（最優先）
        str(_FONT_DIR / ("ipaexg.ttf" if not bold else "ipaexg.ttf")),
        # Windows: Yu Gothic (Windows 8.1以降標準日本語フォント)
        os.path.join(win_fonts, "YuGothB.ttc") if bold else os.path.join(win_fonts, "YuGothM.ttc"),
        os.path.join(win_fonts, "YuGothR.ttc"),
        # Windows: Meiryo (Vista以降標準日本語フォント)
        os.path.join(win_fonts, "meiryo.ttc"),
        os.path.join(win_fonts, "meiryob.ttc"),
        # Windows: MS Gothic
        os.path.join(win_fonts, "msgothic.ttc"),
        # Windows: NotoSans CJK (インストール済みの場合)
        os.path.join(win_fonts, "NotoSansCJK-Regular.ttc"),
        os.path.join(win_fonts, "NotoSansJP-Regular.ttf"),
        # Linux: IPA フォント
        "/usr/share/fonts/opentype/ipaexfont-gothic/ipaexg.otf",
        "/usr/share/fonts/truetype/ipafont-gothic/ipagp.ttf",
        # Linux: DejaVu / Liberation (日本語非対応だが最終フォールバック)
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ]
    for path in font_candidates:
        if path and os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    # フォントが見つからない場合はデフォルト（文字化けするが動作する）
    logger.warning(f"[Font] 日本語フォントが見つかりません。文字化けする可能性があります。"
                   f" backend/assets/fonts/ipaexg.ttf を配置することを推奨します。")
    try:
        return ImageFont.load_default()
    except Exception:
        return None


def _wrap_text(text: str, font: ImageFont.FreeTypeFont, max_width: int, draw: ImageDraw.Draw) -> list[str]:
    """テキストをmax_width内に折り返す。日本語（スペースなし）対応。"""
    lines = []
    for paragraph in text.split("\n"):
        if not paragraph.strip():
            lines.append("")
            continue

        # 日本語判定: スペースが少ない場合は文字単位で折り返す
        has_spaces = " " in paragraph.strip()
        is_cjk = any('　' <= c <= '鿿' or '＀' <= c <= '￯' for c in paragraph)

        if is_cjk or not has_spaces:
            # 文字単位での折り返し（日本語・中国語等）
            current_line = ""
            for char in paragraph:
                test_line = current_line + char
                bbox = draw.textbbox((0, 0), test_line, font=font)
                if bbox[2] <= max_width:
                    current_line = test_line
                else:
                    if current_line:
                        lines.append(current_line)
                    current_line = char
            if current_line:
                lines.append(current_line)
        else:
            # 単語単位での折り返し（英語等スペース区切り）
            words = paragraph.split()
            current_line = ""
            for word in words:
                test_line = f"{current_line} {word}".strip()
                bbox = draw.textbbox((0, 0), test_line, font=font)
                if bbox[2] <= max_width:
                    current_line = test_line
                else:
                    if current_line:
                        lines.append(current_line)
                    current_line = word
            if current_line:
                lines.append(current_line)
    return lines


def _draw_rounded_rect(draw: ImageDraw.Draw, xy: tuple, radius: int, fill: tuple, alpha: int = 255):
    """角丸矩形を描画する。"""
    x1, y1, x2, y2 = xy
    if alpha < 255:
        # 透過対応（RGBAの場合）
        fill_rgba = fill + (alpha,) if len(fill) == 3 else fill
    else:
        fill_rgba = fill
    draw.rounded_rectangle(xy, radius=radius, fill=fill_rgba)


# ══════════════════════════════════════════════════════════════════════════════
# スライド画像生成
# ══════════════════════════════════════════════════════════════════════════════

def _create_title_slide(title: str, subtitle: str = "",
                         bg_image_path: Optional[str] = None,
                         bg_image: Optional[np.ndarray] = None) -> np.ndarray:
    """タイトルスライドを生成する（RGBA numpy array）。"""
    img = Image.new("RGBA", (VIDEO_WIDTH, VIDEO_HEIGHT), BRAND_DARK + (255,))
    draw = ImageDraw.Draw(img, "RGBA")

    # 背景グラデーション効果（単色グラデーション擬似）
    for y in range(VIDEO_HEIGHT):
        ratio = y / VIDEO_HEIGHT
        r = int(BRAND_DARK[0] * (1 - ratio * 0.3))
        g = int(BRAND_DARK[1] * (1 - ratio * 0.3))
        b = int(BRAND_DARK[2] + (BRAND_BLUE[2] - BRAND_DARK[2]) * ratio * 0.4)
        draw.line([(0, y), (VIDEO_WIDTH, y)], fill=(r, g, b, 255))

    # 背景画像（自動取得 or パス指定）を合成
    if bg_image is not None:
        img = _apply_bg_to_slide(img, bg_image, overlay_alpha=150, brand_blend=0.18)
        draw = ImageDraw.Draw(img, "RGBA")
    elif bg_image_path and os.path.exists(bg_image_path):
        try:
            bg = Image.open(bg_image_path).convert("RGBA").resize((VIDEO_WIDTH, VIDEO_HEIGHT))
            overlay = Image.new("RGBA", (VIDEO_WIDTH, VIDEO_HEIGHT), (0, 0, 0, 160))
            bg_darkened = Image.alpha_composite(bg, overlay)
            img.paste(bg_darkened, (0, 0))
            draw = ImageDraw.Draw(img, "RGBA")
        except Exception as e:
            logger.warning(f"[Video] bg_image load failed: {e}")

    # ロゴ/ブランド帯（上部）
    draw.rectangle([(0, 0), (VIDEO_WIDTH, 120)], fill=BRAND_BLUE + (200,))
    font_brand = _load_font(40, bold=True)
    if font_brand:
        draw.text((VIDEO_WIDTH // 2, 60), "★ SAGE AI", font=font_brand,
                  fill=BRAND_WHITE, anchor="mm")

    # タイトル
    font_title = _load_font(72, bold=True)
    if font_title:
        padding = 80
        max_w = VIDEO_WIDTH - padding * 2
        lines = _wrap_text(title, font_title, max_w, draw)
        y_start = VIDEO_HEIGHT // 2 - len(lines) * 80 // 2
        for line in lines:
            draw.text((VIDEO_WIDTH // 2, y_start), line, font=font_title,
                      fill=BRAND_WHITE, anchor="mm",
                      stroke_width=2, stroke_fill=BRAND_DARK)
            y_start += 90

    # サブタイトル
    if subtitle:
        font_sub = _load_font(42)
        if font_sub:
            sub_y = VIDEO_HEIGHT // 2 + len(title.split("\n")) * 50 + 60
            sub_lines = _wrap_text(subtitle, font_sub, VIDEO_WIDTH - 120, draw)
            for line in sub_lines:
                draw.text((VIDEO_WIDTH // 2, sub_y), line, font=font_sub,
                          fill=TEXT_GRAY, anchor="mm")
                sub_y += 55

    # 下部デコライン
    draw.rectangle([(0, VIDEO_HEIGHT - 120), (VIDEO_WIDTH, VIDEO_HEIGHT)], fill=BRAND_DARK + (230,))
    font_footer = _load_font(32)
    if font_footer:
        draw.text((VIDEO_WIDTH // 2, VIDEO_HEIGHT - 60), "sage-official-site.pages.dev",
                  font=font_footer, fill=BRAND_GOLD, anchor="mm")

    return np.array(img.convert("RGB"))


def _create_content_slide(
    text: str,
    slide_num: int,
    total_slides: int,
    accent_color: tuple = BRAND_BLUE,
    icon: str = "★",
    bg_image: Optional[np.ndarray] = None,
) -> np.ndarray:
    """コンテンツスライドを生成する。"""
    img = Image.new("RGBA", (VIDEO_WIDTH, VIDEO_HEIGHT), BRAND_DARK + (255,))
    draw = ImageDraw.Draw(img, "RGBA")

    # 背景グラデーション
    for y in range(VIDEO_HEIGHT):
        ratio = y / VIDEO_HEIGHT
        r = int(26 + 10 * ratio)
        g = int(26 + 10 * ratio)
        b = int(77 + 20 * ratio)
        draw.line([(0, y), (VIDEO_WIDTH, y)], fill=(r, g, b, 255))

    # 背景画像を合成
    if bg_image is not None:
        img = _apply_bg_to_slide(img, bg_image, overlay_alpha=160, brand_blend=0.22)
        draw = ImageDraw.Draw(img, "RGBA")

    # 上部バー
    draw.rectangle([(0, 0), (VIDEO_WIDTH, 100)], fill=accent_color + (220,))
    font_brand = _load_font(34, bold=True)
    if font_brand:
        draw.text((VIDEO_WIDTH // 2, 50), "★ SAGE AI", font=font_brand,
                  fill=BRAND_WHITE, anchor="mm")

    # スライド番号インジケーター（上部右）
    font_num = _load_font(28)
    if font_num:
        draw.text((VIDEO_WIDTH - 50, 50), f"{slide_num}/{total_slides}",
                  font=font_num, fill=BRAND_WHITE, anchor="mm")

    # アイコン + テキストカード
    card_margin = 60
    card_top = 180
    card_bottom = VIDEO_HEIGHT - 200
    card_rect = [(card_margin, card_top), (VIDEO_WIDTH - card_margin, card_bottom)]
    draw.rounded_rectangle(card_rect, radius=40, fill=(255, 255, 255, 18))
    draw.rounded_rectangle(
        [(card_margin, card_top), (VIDEO_WIDTH - card_margin, card_top + 6)],
        radius=3,
        fill=accent_color + (255,)
    )

    # アイコン
    font_icon = _load_font(90)
    if font_icon:
        draw.text((VIDEO_WIDTH // 2, card_top + 90), icon,
                  font=font_icon, fill=BRAND_WHITE, anchor="mm")

    # テキスト
    font_text = _load_font(52, bold=True)
    if font_text:
        text_x = VIDEO_WIDTH // 2
        text_start_y = card_top + 220
        lines = _wrap_text(text, font_text, VIDEO_WIDTH - card_margin * 2 - 40, draw)
        for line in lines[:6]:  # 最大6行
            draw.text((text_x, text_start_y), line, font=font_text,
                      fill=BRAND_WHITE, anchor="mm",
                      stroke_width=1, stroke_fill=(0, 0, 0))
            text_start_y += 68

    # プログレスバー（下部）
    bar_y = VIDEO_HEIGHT - 80
    bar_height = 8
    bar_full_w = VIDEO_WIDTH - 120
    bar_x = 60
    draw.rounded_rectangle([(bar_x, bar_y), (bar_x + bar_full_w, bar_y + bar_height)],
                            radius=4, fill=(255, 255, 255, 50))
    progress_w = int(bar_full_w * slide_num / total_slides)
    if progress_w > 0:
        draw.rounded_rectangle([(bar_x, bar_y), (bar_x + progress_w, bar_y + bar_height)],
                                radius=4, fill=accent_color + (255,))

    return np.array(img.convert("RGB"))


def _create_cta_slide(cta_text: str, url: str = "sage-official-site.pages.dev",
                       bg_image: Optional[np.ndarray] = None) -> np.ndarray:
    """CTAスライドを生成する（最終スライド）。"""
    img = Image.new("RGBA", (VIDEO_WIDTH, VIDEO_HEIGHT), BRAND_DARK + (255,))
    _draw_bg = ImageDraw.Draw(img, "RGBA")

    # グラデーション背景
    for y in range(VIDEO_HEIGHT):
        ratio = y / VIDEO_HEIGHT
        r = int(BRAND_DARK[0] + (BRAND_BLUE[0] - BRAND_DARK[0]) * ratio * 0.6)
        g = int(BRAND_DARK[1] + (BRAND_BLUE[1] - BRAND_DARK[1]) * ratio * 0.6)
        b = int(BRAND_DARK[2] + (BRAND_BLUE[2] - BRAND_DARK[2]) * ratio * 0.8)
        _draw_bg.line([(0, y), (VIDEO_WIDTH, y)], fill=(r, g, b, 255))

    # 背景画像を合成
    if bg_image is not None:
        img = _apply_bg_to_slide(img, bg_image, overlay_alpha=115, brand_blend=0.10)

    # Save opaque background, draw elements on transparent canvas
    _cta_bg_rgb = img.convert("RGB")
    _cta_canvas = Image.new("RGBA", (VIDEO_WIDTH, VIDEO_HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(_cta_canvas)

    # ブランド
    font_brand = _load_font(50, bold=True)
    if font_brand:
        draw.text((VIDEO_WIDTH // 2, 160), "★ SAGE AI", font=font_brand,
                  fill=BRAND_WHITE, anchor="mm")

    # CTAカード
    card_y = VIDEO_HEIGHT // 2 - 220
    draw.rounded_rectangle(
        [(80, card_y), (VIDEO_WIDTH - 80, card_y + 440)],
        radius=50,
        fill=(255, 255, 255, 25)
    )

    # CTAテキスト（絵文字除去）
    cta_text = _strip_emoji(cta_text)
    font_cta = _load_font(62, bold=True)
    if font_cta:
        cta_y = card_y + 80
        lines = _wrap_text(cta_text, font_cta, VIDEO_WIDTH - 200, draw)
        for line in lines[:4]:
            draw.text((VIDEO_WIDTH // 2, cta_y), line, font=font_cta,
                      fill=BRAND_WHITE, anchor="mm",
                      stroke_width=2, stroke_fill=(0, 0, 40))
            cta_y += 80

    # URLボタン風
    btn_y = card_y + 330
    draw.rounded_rectangle(
        [(160, btn_y), (VIDEO_WIDTH - 160, btn_y + 90)],
        radius=45,
        fill=BRAND_GOLD + (255,)
    )
    font_url = _load_font(36, bold=True)
    if font_url:
        draw.text((VIDEO_WIDTH // 2, btn_y + 45), f"→ {url}",
                  font=font_url, fill=BRAND_DARK, anchor="mm")

    # 下部
    font_footer = _load_font(30)
    if font_footer:
        draw.text((VIDEO_WIDTH // 2, VIDEO_HEIGHT - 80), "フォロー & いいね で応援よろしく",
                  font=font_footer, fill=TEXT_GRAY, anchor="mm")

    _cta_result = Image.alpha_composite(_cta_bg_rgb.convert("RGBA"), _cta_canvas)
    return np.array(_cta_result.convert("RGB"))


# ══════════════════════════════════════════════════════════════════════════════
# v3.0: AIディレクター + フック + キネティックテロップ + 動画背景 + クロスフェード
# ══════════════════════════════════════════════════════════════════════════════

def _ai_director(title: str, slides: list, niche: str = "") -> dict:
    """
    Groq APIでコンテンツを分析し、クリエイティブ方向性を決定する。
    世界トップクラスのSNSクリエイターのように、最適な演出パラメータを返す。

    Returns:
        dict: tone / hook_text / color_theme / animation_style /
              key_emphasis / restructured_slides
    """
    default = {
        "tone": "energetic",
        "hook_text": (title[:22] + "…") if len(title) > 22 else title,
        "color_theme": "blue",
        "bgm_style": "upbeat electronic",
        "animation_style": "medium",
        "key_emphasis": [],
        "restructured_slides": slides,
    }

    groq_key = os.environ.get("GROQ_API_KEY", "")
    if not groq_key:
        logger.warning("[AIDirector] GROQ_API_KEY未設定。デフォルト設定を使用します。")
        return default

    try:
        import json as _json
        import urllib.request as _ureq

        slide_text = "\n".join(f"{i+1}. {s}" for i, s in enumerate(slides[:6]))
        prompt = (
            "あなたは世界トップクラスのSNSショート動画クリエイターです。\n"
            f"タイトル: {title}\n"
            f"スライド内容:\n{slide_text}\n\n"
            "このコンテンツを分析し、バイラルになるSNS動画の演出方向性を"
            "以下のJSONのみで返してください（説明不要）:\n"
            '{"tone":"energetic|educational|urgent|calm|inspiring のいずれか",'
            '"hook_text":"視聴者が止まる強烈な一言（20文字以内、日本語）",'
            '"color_theme":"blue|red|green|purple|gold のいずれか",'
            '"animation_style":"fast|medium|slow のいずれか",'
            '"key_emphasis":["強調キーワード1","キーワード2"],'
            '"restructured_slides":["改善スライド1（18文字以内）","スライド2","スライド3","スライド4","スライド5"]}'
        )

        payload = _json.dumps({
            "model": "llama-3.1-8b-instant",
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 450,
            "temperature": 0.75,
        }).encode()

        req = _ureq.Request(
            "https://api.groq.com/openai/v1/chat/completions",
            data=payload,
            headers={
                "Authorization": f"Bearer {groq_key}",
                "Content-Type": "application/json",
            },
        )
        with _ureq.urlopen(req, timeout=15) as resp:
            raw = _json.loads(resp.read())

        content = raw["choices"][0]["message"]["content"].strip()
        s_idx = content.find("{")
        e_idx = content.rfind("}") + 1
        if s_idx >= 0 and e_idx > s_idx:
            parsed = _json.loads(content[s_idx:e_idx])
            for k, v in default.items():
                if k not in parsed:
                    parsed[k] = v
            logger.info(
                f"[AIDirector] ✅ tone={parsed.get('tone')}, "
                f"hook='{parsed.get('hook_text', '')[:18]}', "
                f"theme={parsed.get('color_theme')}"
            )
            return parsed

    except Exception as ex:
        logger.warning(f"[AIDirector] API呼び出し失敗: {ex}。デフォルト設定を使用します。")

    return default


# v3.0カラーテーママップ
_V3_THEME_COLORS: dict = {
    "blue":   BRAND_BLUE,
    "red":    (220, 55, 55),
    "green":  (45, 170, 85),
    "purple": (130, 65, 210),
    "gold":   BRAND_GOLD,
}


def _fetch_background_video(keyword: str) -> Optional[str]:
    """
    Pexels Video APIから縦型動画を検索・ダウンロードしてローカルパスを返す。
    キャッシュあり。失敗時はNoneを返す。
    """
    pexels_key = os.environ.get("PEXELS_API_KEY", "")
    if not pexels_key:
        logger.warning("[VideoBG] PEXELS_API_KEY未設定")
        return None

    try:
        import json as _json
        import urllib.request as _ureq
        import urllib.parse as _uparse
        import tempfile

        # 日本語 → 英語キーワード変換テーブル
        _jp_to_en = [
            ("AI", "artificial intelligence technology"),
            ("SNS", "social media digital"),
            ("自動", "automation technology"),
            ("ビジネス", "business success"),
            ("お金", "money finance wealth"),
            ("マーケ", "marketing digital"),
            ("成功", "success achievement"),
            ("技術", "technology innovation"),
            ("投資", "investment finance"),
            ("副業", "side hustle freelance"),
        ]
        eng = keyword
        for jp, en in _jp_to_en:
            if jp in keyword:
                eng = en
                break
        else:
            # 日本語文字が含まれる場合は汎用
            if any("぀" <= c <= "鿿" for c in keyword):
                eng = "technology abstract digital particles"
        eng = eng[:40]

        url = (
            f"https://api.pexels.com/videos/search"
            f"?query={_uparse.quote(eng)}"
            f"&orientation=portrait&size=medium&per_page=8"
        )
        req = _ureq.Request(url, headers={"Authorization": pexels_key})
        with _ureq.urlopen(req, timeout=20) as resp:
            data = _json.loads(resp.read())

        videos = data.get("videos", [])
        if not videos:
            logger.warning(f"[VideoBG] '{eng}' の動画が見つかりません")
            return None

        # 縦型動画を優先選択
        portrait = [v for v in videos if v.get("height", 0) > v.get("width", 0)]
        video = portrait[0] if portrait else videos[0]

        # 適切な解像度ファイルを選択（480p〜1080p）
        files = sorted(video.get("video_files", []), key=lambda x: x.get("height", 0))
        best = None
        for f in files:
            h = f.get("height", 0)
            if 480 <= h <= 1920:
                best = f
                break
        if not best and files:
            best = files[0]
        if not best:
            return None

        # キャッシュチェック
        cache_dir = Path(tempfile.gettempdir()) / "sage_video_cache"
        cache_dir.mkdir(exist_ok=True)
        vid_id = video.get("id", "0")
        local_path = str(cache_dir / f"bgvid_{vid_id}.mp4")

        if os.path.exists(local_path) and os.path.getsize(local_path) > 100_000:
            logger.info(f"[VideoBG] キャッシュ使用: {local_path}")
            return local_path

        logger.info(f"[VideoBG] ダウンロード中 (id={vid_id}, {best.get('height')}p)...")
        _ureq.urlretrieve(best["link"], local_path)
        logger.info(f"[VideoBG] ✅ ダウンロード完了: {local_path}")
        return local_path

    except Exception as ex:
        logger.warning(f"[VideoBG] 動画取得失敗: {ex}")
        return None


def _create_hook_slide(
    hook_text: str,
    subtitle: str = "",
    accent_color: tuple = BRAND_BLUE,
    bg_image: Optional[np.ndarray] = None,
) -> np.ndarray:
    """
    フックスライド生成（最初の3秒・スクロールストッパーデザイン）。
    大きなテキスト、高コントラスト、グロー効果で視聴者の目を止める。
    """
    img = Image.new("RGBA", (VIDEO_WIDTH, VIDEO_HEIGHT), (5, 5, 20, 255))
    draw = ImageDraw.Draw(img, "RGBA")

    # ダイナミックグラデーション背景
    ar, ag, ab = accent_color
    for y in range(VIDEO_HEIGHT):
        ratio = y / VIDEO_HEIGHT
        r = int(5  + ar * ratio * 0.22)
        g = int(5  + ag * ratio * 0.18)
        b = int(20 + ab * ratio * 0.38)
        draw.line([(0, y), (VIDEO_WIDTH, y)], fill=(r, g, b, 255))

    # 背景画像合成
    if bg_image is not None:
        img = _apply_bg_to_slide(img, bg_image, overlay_alpha=85, brand_blend=0.06)
        draw = ImageDraw.Draw(img, "RGBA")

    # 上部アテンションバー
    bar_h = 135
    draw.rectangle([(0, 0), (VIDEO_WIDTH, bar_h)], fill=accent_color + (235,))
    font_top = _load_font(44, bold=True)
    if font_top:
        draw.text((VIDEO_WIDTH // 2, bar_h // 2), "⚡ SAGE AI",
                  font=font_top, fill=BRAND_WHITE, anchor="mm")

    # バーの下部にラインアクセント
    draw.rectangle([(0, bar_h), (VIDEO_WIDTH, bar_h + 5)], fill=BRAND_GOLD + (255,))

    # メインフックテキスト（画面中央・巨大）
    font_hook = _load_font(84, bold=True)
    if font_hook:
        pad = 65
        lines = _wrap_text(hook_text, font_hook, VIDEO_WIDTH - pad * 2, draw)
        y_center = int(VIDEO_HEIGHT * 0.44)
        total_h = len(lines) * 108
        y_s = y_center - total_h // 2

        for line in lines[:4]:
            # グロー（複数シャドウ）
            for ox, oy, oa in [(5, 5, 80), (3, 3, 120), (0, 0, 255)]:
                col = (0, 0, 0, oa) if oa < 255 else BRAND_WHITE
                sw = 4 if oa == 255 else 0
                draw.text(
                    (VIDEO_WIDTH // 2 + ox, y_s + oy), line,
                    font=font_hook, fill=col, anchor="mm",
                    stroke_width=sw, stroke_fill=(0, 0, 0),
                )
            y_s += 112

    # サブテキスト（あれば）
    if subtitle:
        font_sub = _load_font(46)
        if font_sub:
            sub_y = int(VIDEO_HEIGHT * 0.72)
            draw.text((VIDEO_WIDTH // 2, sub_y), subtitle,
                      font=font_sub, fill=TEXT_GRAY, anchor="mm")

    # 下部 CTA（スワイプ誘導）
    arrow_y = VIDEO_HEIGHT - 195
    font_arrow = _load_font(68)
    if font_arrow:
        draw.text((VIDEO_WIDTH // 2, arrow_y), "▼",
                  font=font_arrow, fill=accent_color + (215,), anchor="mm")

    font_swipe = _load_font(36)
    if font_swipe:
        draw.text((VIDEO_WIDTH // 2, VIDEO_HEIGHT - 115), "スワイプして詳細を見る",
                  font=font_swipe, fill=TEXT_GRAY, anchor="mm")

    # ブランドフッター
    draw.rectangle(
        [(0, VIDEO_HEIGHT - 70), (VIDEO_WIDTH, VIDEO_HEIGHT)],
        fill=BRAND_DARK + (210,)
    )
    font_footer = _load_font(28)
    if font_footer:
        draw.text((VIDEO_WIDTH // 2, VIDEO_HEIGHT - 35), "sage-official-site.pages.dev",
                  font=font_footer, fill=BRAND_GOLD, anchor="mm")

    return np.array(img.convert("RGB"))


def _make_hook_clip(
    hook_text: str,
    subtitle: str = "",
    accent_color: tuple = BRAND_BLUE,
    bg_image: Optional[np.ndarray] = None,
    duration: float = 3.0,
    fps: int = VIDEO_FPS,
) -> object:
    """
    フックスライドのアニメーションVideoClipを生成する。
    Phase1: アクセントカラーフラッシュ (0-0.35s)
    Phase2: タイトルが下から滑り上がる ease-out (0.35-1.6s)
    Phase3: 安定 + サブタイトルフェードイン (1.6s-)
    """
    try:
        from moviepy import VideoClip
    except ImportError:
        from moviepy.editor import VideoClip

    # ─── フォント事前ロード ─────────────────────────────────────────────────
    f_top    = _load_font(44, bold=True)
    f_hook   = _load_font(88, bold=True)   # 静止画版より大きく
    f_sub    = _load_font(46)
    f_arrow  = _load_font(68)
    f_footer = _load_font(28)

    # ─── ベース背景（テキストなし）を事前生成 ───────────────────────────────
    base_img = Image.new("RGBA", (VIDEO_WIDTH, VIDEO_HEIGHT), (5, 5, 20, 255))
    base_draw = ImageDraw.Draw(base_img, "RGBA")
    ar, ag, ab = accent_color
    for y in range(VIDEO_HEIGHT):
        ratio = y / VIDEO_HEIGHT
        r = int(5  + ar * ratio * 0.22)
        g = int(5  + ag * ratio * 0.18)
        b = int(20 + ab * ratio * 0.38)
        base_draw.line([(0, y), (VIDEO_WIDTH, y)], fill=(r, g, b, 255))
    if bg_image is not None:
        base_img = _apply_bg_to_slide(base_img, bg_image, overlay_alpha=85, brand_blend=0.06)
    base_arr = np.array(base_img.convert("RGB"))

    # ─── フックテキスト折り返し ─────────────────────────────────────────────
    dummy     = Image.new("RGB", (VIDEO_WIDTH, VIDEO_HEIGHT))
    dummy_drw = ImageDraw.Draw(dummy)
    hook_lines = _wrap_text(hook_text, f_hook, VIDEO_WIDTH - 130, dummy_drw) if f_hook else [hook_text]
    hook_lines = hook_lines[:4]
    n_lines    = len(hook_lines)
    line_h     = 118                       # フックテキスト行間
    target_y   = int(VIDEO_HEIGHT * 0.44) - (n_lines * line_h) // 2

    def make_frame(t: float) -> np.ndarray:
        img  = Image.fromarray(base_arr).copy().convert("RGBA")
        draw = ImageDraw.Draw(img, "RGBA")

        bar_h = 135
        # ── 上部バー（常時） ────────────────────────────────────────────────
        draw.rectangle([(0, 0), (VIDEO_WIDTH, bar_h)], fill=accent_color + (235,))
        draw.rectangle([(0, bar_h), (VIDEO_WIDTH, bar_h + 5)], fill=BRAND_GOLD + (255,))
        if f_top:
            draw.text((VIDEO_WIDTH // 2, bar_h // 2), ">> SAGE AI",
                      font=f_top, fill=BRAND_WHITE, anchor="mm")

        # ── フッター（常時） ────────────────────────────────────────────────
        draw.rectangle([(0, VIDEO_HEIGHT - 70), (VIDEO_WIDTH, VIDEO_HEIGHT)],
                       fill=BRAND_DARK + (210,))
        if f_footer:
            draw.text((VIDEO_WIDTH // 2, VIDEO_HEIGHT - 35), "sage-official-site.pages.dev",
                      font=f_footer, fill=BRAND_GOLD, anchor="mm")

        # ── テキストエリアのスクリム（常時・フェードイン） ──────────────────
        scrim_top    = max(bar_h + 5, target_y - 90)
        scrim_bottom = min(VIDEO_HEIGHT - 70, target_y + n_lines * line_h + 180)
        scrim_a = 0
        if t >= 0.2:
            scrim_a = min(170, int(170 * (t - 0.2) / 0.6))
        if scrim_a > 0:
            draw.rectangle([(0, scrim_top), (VIDEO_WIDTH, scrim_bottom)],
                           fill=(0, 0, 0, scrim_a))

        if t < 0.35:
            # ── Phase1: カラーフラッシュ ─────────────────────────────────
            flash_a = int(210 * (1.0 - t / 0.35))
            draw.rectangle([(0, bar_h + 5), (VIDEO_WIDTH, VIDEO_HEIGHT - 70)],
                           fill=accent_color + (flash_a,))
        elif t < 1.6:
            # ── Phase2: タイトルが下からスライドイン ─────────────────────
            progress = (t - 0.35) / 1.25
            ease     = 1.0 - (1.0 - progress) ** 3
            start_y  = int(VIDEO_HEIGHT * 0.75)
            cur_y    = int(start_y + (target_y - start_y) * ease)
            alpha    = min(255, int(255 * progress * 1.6))
            for i, line in enumerate(hook_lines):
                ly = cur_y + i * line_h
                draw.text((VIDEO_WIDTH // 2, ly), line,
                          font=f_hook, fill=(*BRAND_WHITE, alpha),
                          anchor="mm", stroke_width=5, stroke_fill=(0, 0, 0))
        else:
            # ── Phase3: 安定 + サブタイトルフェードイン ─────────────────
            t3 = t - 1.6
            for i, line in enumerate(hook_lines):
                ly = target_y + i * line_h
                draw.text((VIDEO_WIDTH // 2, ly), line,
                          font=f_hook, fill=BRAND_WHITE + (255,),
                          anchor="mm", stroke_width=5, stroke_fill=(0, 0, 0))
            # サブタイトル フェードイン
            if subtitle and f_sub:
                sub_a = min(255, int(255 * (t3 - 0.1) / 0.4)) if t3 > 0.1 else 0
                if sub_a > 0:
                    sub_y = target_y + n_lines * line_h + 80
                    draw.text((VIDEO_WIDTH // 2, sub_y), subtitle,
                              font=f_sub, fill=(*BRAND_GOLD, sub_a), anchor="mm")
            # 下向き矢印 フェードイン
            if f_arrow:
                arr_a = min(255, int(255 * (t3 - 0.3) / 0.5)) if t3 > 0.3 else 0
                if arr_a > 0:
                    draw.text((VIDEO_WIDTH // 2, VIDEO_HEIGHT - 195), "v",
                              font=f_arrow, fill=accent_color + (arr_a,), anchor="mm")

        return np.array(img.convert("RGB"))

    try:
        from moviepy import VideoClip as _VC
    except ImportError:
        from moviepy.editor import VideoClip as _VC
    clip = _VC(make_frame, duration=duration)
    clip.fps = fps
    return clip


def _make_kinetic_text_clip(
    text: str,
    duration: float,
    fps: int,
    accent_color: tuple = BRAND_BLUE,
    bg_image: Optional[np.ndarray] = None,
    bg_video_clip=None,          # Optional VideoFileClip for moving background
    slide_num: int = 1,
    total_slides: int = 5,
    icon: str = "★",
    key_emphasis: Optional[list] = None,
) -> object:
    """
    キネティックタイポグラフィクリップを生成。
    単語ごとにポップイン（フェード + アクセントカラー強調）するアニメーション。
    bg_video_clip を渡すと動画背景をサンプリングしてムービングBGとして使用する。

    Returns:
        MoviePy VideoClip
    """
    try:
        from moviepy import VideoClip
    except ImportError:
        from moviepy.editor import VideoClip

    key_emphasis = key_emphasis or []

    # ─── フォント事前ロード ───────────────────────────────────────────────────
    f_brand    = _load_font(34, bold=True)
    f_num      = _load_font(28)
    f_icon     = _load_font(80)
    f_text     = _load_font(70, bold=True)
    f_text_big = _load_font(84, bold=True)   # スケールバウンス用（20%大）

    # ─── レイアウト定数 ──────────────────────────────────────────────────────
    card_margin = 55
    card_top    = int(VIDEO_HEIGHT * 0.18)   # 346px — background visible above
    card_bottom = int(VIDEO_HEIGHT * 0.82)   # 1574px — background visible below
    text_area_w = VIDEO_WIDTH - card_margin * 2 - 40

    # ─── テキスト折り返し事前計算 ────────────────────────────────────────────
    dummy = Image.new("RGB", (VIDEO_WIDTH, VIDEO_HEIGHT))
    dummy_draw = ImageDraw.Draw(dummy)
    all_lines = _wrap_text(text, f_text, text_area_w, dummy_draw) if f_text else [text]

    # ─── アニメーショントークン数を render-loop と一致させる ─────────────────
    # text.split() はスペース区切りなので日本語折り返し後のトークンとずれる。
    # all_lines の各行を line.split() したトークン総数を使う（render-loop と同じ）。
    render_tokens = [tok for line in all_lines[:6] for tok in (line.split() if line.strip() else [])]
    n_words = max(1, len(render_tokens))

    # タイミング設定（全トークンが duration の 80% 以内に揃う速度）
    intro         = 0.20
    word_interval = max(0.07, min(0.28, (duration * 0.80 - intro) / n_words))

    # ─── ベース背景を事前生成（パフォーマンス最適化） ────────────────────────
    # bg_video_clipがない場合のみ事前生成（動画BGは毎フレームサンプリング）
    cached_base: Optional[np.ndarray] = None
    if bg_video_clip is None:
        base_img = Image.new("RGBA", (VIDEO_WIDTH, VIDEO_HEIGHT), BRAND_DARK + (255,))
        base_draw = ImageDraw.Draw(base_img, "RGBA")
        for y in range(0, VIDEO_HEIGHT, 2):
            ratio = y / VIDEO_HEIGHT
            r = int(26 + 10 * ratio)
            g = int(26 + 10 * ratio)
            b = int(77 + 20 * ratio)
            base_draw.line([(0, y), (VIDEO_WIDTH, y + 1)], fill=(r, g, b, 255))
        if bg_image is not None:
            base_img = _apply_bg_to_slide(base_img, bg_image, overlay_alpha=90, brand_blend=0.08)
        cached_base = np.array(base_img)

    def make_frame(t: float) -> np.ndarray:
        n_visible = 0 if t < intro else min(n_words, int((t - intro) / word_interval) + 1)

        # ─── 背景 ──────────────────────────────────────────────────────────
        if bg_video_clip is not None:
            # 動画背景をサンプリング
            vt = t % bg_video_clip.duration
            try:
                vframe = bg_video_clip.get_frame(vt)
            except Exception:
                vframe = np.zeros((VIDEO_HEIGHT, VIDEO_WIDTH, 3), dtype=np.uint8)
            vimg = Image.fromarray(vframe).resize((VIDEO_WIDTH, VIDEO_HEIGHT))
            bg_arr = np.array(vimg)
            base_img_t = Image.new("RGBA", (VIDEO_WIDTH, VIDEO_HEIGHT), BRAND_DARK + (255,))
            base_img_t = _apply_bg_to_slide(base_img_t, bg_arr, overlay_alpha=90, brand_blend=0.08)
            img = base_img_t
        else:
            img = Image.fromarray(cached_base).copy().convert("RGBA")

        # Save opaque background for proper alpha compositing at return
        _bg_rgb = img.convert("RGB")
        _canvas = Image.new("RGBA", (VIDEO_WIDTH, VIDEO_HEIGHT), (0, 0, 0, 0))
        draw = ImageDraw.Draw(_canvas)

        # ─── 上部バー ───────────────────────────────────────────────────────
        draw.rectangle([(0, 0), (VIDEO_WIDTH, 100)], fill=accent_color + (220,))
        if f_brand:
            draw.text((VIDEO_WIDTH // 2, 50), "★ SAGE AI",
                      font=f_brand, fill=BRAND_WHITE, anchor="mm")
        if f_num:
            draw.text((VIDEO_WIDTH - 50, 50), f"{slide_num}/{total_slides}",
                      font=f_num, fill=BRAND_WHITE, anchor="mm")

        # ─── コンテンツカード ────────────────────────────────────────────────
        draw.rounded_rectangle(
            [(card_margin, card_top), (VIDEO_WIDTH - card_margin, card_bottom)],
            radius=40, fill=(8, 12, 45, 60))
        draw.rounded_rectangle(
            [(card_margin, card_top), (VIDEO_WIDTH - card_margin, card_bottom)],
            radius=40, outline=accent_color + (80,), width=2)
        draw.rounded_rectangle(
            [(card_margin, card_top), (VIDEO_WIDTH - card_margin, card_top + 7)],
            radius=4, fill=accent_color + (255,))

        # ─── アイコン（フェードイン） ────────────────────────────────────────
        icon_alpha = min(255, int(255 * t / 0.35))
        if f_icon and icon_alpha > 0:
            draw.text((VIDEO_WIDTH // 2, card_top + 70), icon,
                      font=f_icon, fill=(*accent_color, icon_alpha), anchor="mm")

        # ─── キネティックテキスト（縦中央配置） ─────────────────────────────
        _line_h = 86
        if f_text and n_visible > 0:
            # テキストブロックを縦中央に配置
            _n_txt_lines = len(all_lines[:6])
            _block_h = _n_txt_lines * _line_h
            _content_top = card_top + 160   # アイコンエリア下
            _content_bot = card_bottom - 40
            _avail_h = _content_bot - _content_top
            text_y = _content_top + max(0, (_avail_h - _block_h) // 2)
            word_count = 0

            for line in all_lines[:6]:
                line_words = line.split()
                visible_parts = []  # (word_str, is_emphasis, alpha, is_popping)

                for word in line_words:
                    if word_count < n_visible:
                        wi      = word_count
                        elapsed = t - intro - wi * word_interval
                        pop_dur = 0.20                            # バウンス時間
                        is_popping = 0 < elapsed < pop_dur
                        pop_phase  = (elapsed / pop_dur) if is_popping else (1.0 if elapsed >= pop_dur else 0.0)
                        pop_alpha  = min(255, int(255 * pop_phase)) if is_popping else 255
                        is_emph    = any(kw in word for kw in key_emphasis) if key_emphasis else False
                        visible_parts.append((word, is_emph, pop_alpha, is_popping, pop_phase))
                    word_count += 1

                if not visible_parts:
                    text_y += _line_h
                    continue

                # ライン全体の幅で中央揃えX座標を計算（通常フォントで統一）
                full_line_text = " ".join(w for w, _, _, _, _ in visible_parts)
                bbox = draw.textbbox((0, 0), full_line_text, font=f_text)
                line_w = bbox[2] - bbox[0]
                x = (VIDEO_WIDTH - line_w) // 2

                for word, is_emph, alpha, is_popping, pop_phase in visible_parts:
                    if is_popping:
                        # ── スケールバウンス: 前半=大フォント+アクセント, 後半=通常フォント ──
                        if pop_phase < 0.5:
                            cur_font = f_text_big
                            cur_alpha = int(255 * pop_phase * 2)   # 0→255
                            col = accent_color                      # 光る色
                        else:
                            cur_font = f_text
                            cur_alpha = 255
                            col = accent_color if is_emph else BRAND_WHITE
                    else:
                        cur_font  = f_text
                        cur_alpha = alpha
                        col = accent_color if is_emph else BRAND_WHITE

                    draw.text(
                        (x, text_y), word,
                        font=cur_font,
                        fill=(*col, cur_alpha),
                        anchor="lm",
                        stroke_width=2,
                        stroke_fill=(0, 0, 0),
                    )
                    sp = draw.textbbox((0, 0), word + " ", font=cur_font)
                    x += sp[2] - sp[0]

                text_y += _line_h

        # ─── プログレスバー ──────────────────────────────────────────────────
        bar_y  = VIDEO_HEIGHT - 80
        bar_h  = 8
        bar_w  = VIDEO_WIDTH - 120
        bar_x  = 60
        draw.rounded_rectangle([(bar_x, bar_y), (bar_x + bar_w, bar_y + bar_h)],
                                radius=4, fill=(255, 255, 255, 50))
        prog_w = int(bar_w * slide_num / total_slides)
        if prog_w > 0:
            draw.rounded_rectangle([(bar_x, bar_y), (bar_x + prog_w, bar_y + bar_h)],
                                    radius=4, fill=accent_color + (255,))

        _result = Image.alpha_composite(_bg_rgb.convert("RGBA"), _canvas)
        return np.array(_result.convert("RGB"))

    return VideoClip(make_frame, duration=duration)


def _make_crossfade_sequence(clips: list, crossfade_dur: float = 0.35) -> object:
    """
    クリップリストにクロスフェードトランジションを追加して結合する。
    MoviePy 1.x / 2.x 両対応。
    """
    try:
        from moviepy import concatenate_videoclips
    except ImportError:
        from moviepy.editor import concatenate_videoclips

    if not clips:
        return None
    if len(clips) == 1:
        return clips[0]

    faded = [clips[0]]
    for clip in clips[1:]:
        try:
            # MoviePy 1.x
            c = clip.crossfadein(crossfade_dur)
        except AttributeError:
            try:
                # MoviePy 2.x
                from moviepy.video.fx import CrossFadeIn
                c = clip.with_effects([CrossFadeIn(crossfade_dur)])
            except Exception:
                c = clip   # フォールバック: エフェクトなし
        faded.append(c)

    try:
        return concatenate_videoclips(faded, method="compose", padding=-crossfade_dur)
    except Exception:
        return concatenate_videoclips(faded, method="compose")


# ══════════════════════════════════════════════════════════════════════════════
# メイン: ショート動画生成
# ══════════════════════════════════════════════════════════════════════════════

def generate_sns_short_video(
    title: str,
    slides: list[str],
    cta_text: str = "詳しくはプロフのリンクから",
    url: str = "sage-official-site.pages.dev",
    duration_per_slide: float = 3.5,
    title_duration: float = 3.0,
    cta_duration: float = 4.0,
    output_filename: Optional[str] = None,
    bg_image_path: Optional[str] = None,
    subtitle: str = "",
    fps: int = VIDEO_FPS,
    # ── v2 拡張オプション ──────────────────────────────────────────────────
    enable_bgm: bool = True,           # BGM自動合成 (HF MusicGen)
    enable_ken_burns: bool = True,     # Kenバーンズ効果
    enable_text_fadein: bool = True,   # テキストフェードイン
    bgm_volume: float = 0.12,         # BGM音量 (0.0〜1.0)
    bgm_niche: str = "",              # BGMスタイル判定用ニッチ
    ken_burns_zoom: float = 1.10,     # ズーム倍率 (1.05〜1.20推奨)
    text_fade_duration: float = 0.6,  # テキストフェードイン秒数
    # ── v2.1 ナレーション (VOICEVOX / Edge TTS) ──────────────────────────
    enable_narration: bool = False,     # ナレーション有効フラグ
    narration_language: str = "ja",     # "ja" → VOICEVOX / "en" → Edge TTS
    narration_speaker: int = 1,         # VOICEVOX スピーカーID (日本語時のみ使用)
    narration_voice: str = "",          # Edge TTS 音声名 (英語時のみ・省略時は自動)
    narration_speed: float = 1.1,       # 話速
    narration_volume: float = 0.9,      # ナレーション音量 (0.0〜1.0)
    narration_bgm_volume: float = 0.06, # ナレーション有効時のBGM音量（小さくする）
    min_slide_duration: float = 2.0,    # ナレーション長さに合わせる最低秒数
    # ── v2.2 背景画像フェッチ ────────────────────────────────────────────────
    enable_bg_fetch: bool = True,       # Picsum/Pexels から背景画像を自動取得
    # ── v3.0 プロクオリティ機能 ───────────────────────────────────────────────
    enable_v3: bool = False,            # v3.0全機能有効化（AIディレクター+フック+キネティック+クロスフェード）
    enable_video_bg: bool = False,      # Pexels動画背景（enable_v3=Trueと併用推奨）
    v3_crossfade_dur: float = 0.35,    # クロスフェード秒数
) -> Optional[str]:
    """
    SNS用ショート動画（縦型 1080x1920）を生成する。

    v2 追加機能:
        enable_bgm: TrueでHF MusicGenによるBGMを自動生成・合成
        enable_ken_burns: Trueでスライドにゆっくりズームイン効果
        enable_text_fadein: Trueでテキストをフェードイン表示

    Args:
        title: 動画タイトル（タイトルスライドに表示）
        slides: コンテンツスライドのテキストリスト（3〜6件推奨）
        cta_text: 最終CTAスライドのテキスト
        url: CTA URL
        duration_per_slide: 各コンテンツスライドの表示秒数
        title_duration: タイトルスライドの表示秒数
        cta_duration: CTAスライドの表示秒数
        output_filename: 出力ファイル名（省略時は自動生成）
        bg_image_path: タイトルスライド背景画像パス（任意）
        subtitle: タイトルスライドのサブタイトル
        fps: フレームレート

    Returns:
        生成されたmp4ファイルのパス文字列、失敗時はNone
    """
    try:
        from moviepy import ImageClip, concatenate_videoclips, CompositeVideoClip
    except ImportError:
        try:
            from moviepy.editor import ImageClip, concatenate_videoclips
        except ImportError:
            logger.error("moviepy not installed. Run: pip install moviepy")
            return None

    _ensure_output_dir()

    if not output_filename:
        safe = "".join(c for c in title if c.isalnum() or c in " _-")[:30].strip().replace(" ", "_")
        ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        output_filename = f"sns_video_{safe}_{ts}.mp4"

    output_path = str(_VIDEO_OUTPUT_DIR / output_filename)

    # ── v2.2: 背景画像フェッチ ───────────────────────────────────────────────
    fetched_bg: Optional[np.ndarray] = None
    if enable_bg_fetch:
        logger.info(f"[Video v2.2] 背景画像を取得中: keyword='{title}'")
        fetched_bg = _fetch_background_image(title)
        if fetched_bg is not None:
            logger.info("[Video v2.2] 背景画像の取得に成功しました")
        else:
            logger.warning("[Video v2.2] 背景画像の取得に失敗。ソリッド背景を使用します")

    # ── v3.0: AIディレクターでクリエイティブ方向性を決定 ─────────────────────
    v3_config: dict = {}
    v3_accent_color = BRAND_BLUE
    v3_hook_text    = title
    v3_key_emphasis: list = []
    v3_slides       = [_strip_emoji(s) for s in slides]

    if enable_v3:
        logger.info("[Video v3] AIディレクターを起動中...")
        v3_config = _ai_director(title, slides, niche=bgm_niche)
        v3_accent_color = _V3_THEME_COLORS.get(v3_config.get("color_theme", "blue"), BRAND_BLUE)
        v3_hook_text    = _strip_emoji(v3_config.get("hook_text", title))
        v3_key_emphasis = v3_config.get("key_emphasis", [])
        restructured    = v3_config.get("restructured_slides", slides)
        # 再構成されたスライドが有効なリストならそちらを使用
        if isinstance(restructured, list) and len(restructured) > 0:
            v3_slides = restructured
        logger.info(f"[Video v3] ✅ hook='{v3_hook_text[:18]}', accent={v3_config.get('color_theme')}")

    # ── v3.0: 動画背景ダウンロード ────────────────────────────────────────────
    bg_video_clip = None
    if enable_v3 and enable_video_bg:
        logger.info("[Video v3] Pexels動画背景を取得中...")
        bg_video_path = _fetch_background_video(title)
        if bg_video_path:
            try:
                from moviepy import VideoFileClip
            except ImportError:
                from moviepy.editor import VideoFileClip
            try:
                bg_video_clip = VideoFileClip(bg_video_path, audio=False)
                logger.info(f"[Video v3] ✅ 動画背景ロード完了: {bg_video_path}")
            except Exception as ex:
                logger.warning(f"[Video v3] 動画背景ロード失敗: {ex}")

    # アクセントカラーのローテーション
    accent_colors = (
        [v3_accent_color, (80, 180, 120), (200, 100, 60), (140, 80, 200)]
        if enable_v3 else
        [BRAND_BLUE, (80, 180, 120), (200, 100, 60), (140, 80, 200)]
    )
    icons = ["★", "◆", "●", "▶", "■", "◀"]

    clips = []
    logger.info(f"[Video v2] Generating {len(slides)+2} slides "
                f"(bgm={enable_bgm}, ken_burns={enable_ken_burns}, fadein={enable_text_fadein}, "
                f"narration={enable_narration})")

    # ── v2.1: ナレーション音声を事前生成 ────────────────────────────────────
    narration_audios = []   # [title_audio, slide1_audio, ..., cta_audio]
    slide_durations = []    # 各スライドの実際の長さ（ナレーション長に合わせる）

    if enable_narration:
        try:
            from moviepy import AudioFileClip
        except ImportError:
            from moviepy.editor import AudioFileClip

        # ── TTS エンジンの選択 ─────────────────────────────────────────────
        tts_ready = False

        if narration_language == "ja":
            # 日本語: VOICEVOX
            try:
                from backend.integrations.voicevox_agent import (
                    generate_narration as _voicevox_narration, is_voicevox_running
                )
            except ImportError:
                from voicevox_agent import (
                    generate_narration as _voicevox_narration, is_voicevox_running
                )

            if not is_voicevox_running():
                logger.warning("[Video v2.1] VOICEVOXが起動していません。ナレーションをスキップします。")
                enable_narration = False
            else:
                tts_ready = True
                logger.info(f"[Video v2.1] TTS: VOICEVOX (speaker={narration_speaker})")

            def _tts_generate(text):
                return _voicevox_narration(
                    text, speaker_id=narration_speaker, speed=narration_speed
                )

        else:
            # 英語 (または他言語): Edge TTS
            try:
                from backend.integrations.edge_tts_agent import (
                    generate_narration_en as _edge_narration, is_edge_tts_available
                )
            except ImportError:
                from edge_tts_agent import (
                    generate_narration_en as _edge_narration, is_edge_tts_available
                )

            if not is_edge_tts_available():
                logger.warning("[Video v2.1] edge-tts未インストール。pip install edge-tts を実行してください。")
                enable_narration = False
            else:
                tts_ready = True
                _voice = narration_voice or None  # 省略時は自動選択
                logger.info(f"[Video v2.1] TTS: Edge TTS (lang={narration_language}, voice={_voice or 'auto'})")

            def _tts_generate(text):
                return _edge_narration(
                    text,
                    voice=narration_voice or None,
                    speed=narration_speed,
                    language=narration_language,
                )

        if tts_ready:
            # 全スライドのナレーションテキスト (タイトル / コンテンツ / CTA)
            narr_texts = (
                [title]        # タイトルスライド
                + slides       # コンテンツスライド
                + [cta_text]   # CTAスライド
            )
            _buffer = 0.5  # 音声終了後のバッファ秒

            for idx, text in enumerate(narr_texts):
                result = _tts_generate(text)
                if result["status"] == "success":
                    narration_audios.append(result["local_path"])
                    dur = max(result["duration_sec"] + _buffer, min_slide_duration)
                    slide_durations.append(dur)
                    logger.info(f"[Video v2.1] ナレーション {idx+1}/{len(narr_texts)}: "
                                f"{dur:.2f}s ({result['local_path']})")
                else:
                    narration_audios.append(None)
                    if idx == 0:
                        slide_durations.append(title_duration)
                    elif idx == len(narr_texts) - 1:
                        slide_durations.append(cta_duration)
                    else:
                        slide_durations.append(duration_per_slide)

            # ナレーション有効時は BGM を小さくする
            if narration_audios and any(a is not None for a in narration_audios):
                bgm_volume = narration_bgm_volume
                logger.info(f"[Video v2.1] BGM音量をナレーション用に調整: {bgm_volume}")

    # ── ナレーションなし時のデフォルト秒数設定 ───────────────────────────────
    if not slide_durations:
        slide_durations = (
            [title_duration]
            + [duration_per_slide] * len(slides)
            + [cta_duration]
        )

    def _attach_narration(clip, audio_path: Optional[str], volume: float = 0.9):
        """クリップにナレーション音声を合成する"""
        if not audio_path:
            return clip
        try:
            narr_audio = AudioFileClip(audio_path).with_effects(
                [lambda a: a.with_volume_scaled(volume)]
            )
            # クリップ長に合わせてトリム or パディング
            if narr_audio.duration > clip.duration:
                narr_audio = narr_audio.subclipped(0, clip.duration)
            return clip.with_audio(narr_audio)
        except Exception as e:
            logger.warning(f"[Video v2.1] ナレーション合成エラー: {e}")
            return clip

    # ── タイトル / フックスライド ──────────────────────────────────────────────
    _title_dur = slide_durations[0]
    if enable_v3:
        # v3: フックスライド（アニメーション付きスクロールストッパー）
        _hook_subtitle = (subtitle or f"#{bgm_niche}") if bgm_niche else (subtitle or "")
        clip = _make_hook_clip(
            hook_text=v3_hook_text,
            subtitle=_hook_subtitle,
            accent_color=v3_accent_color,
            bg_image=fetched_bg,
            duration=_title_dur,
            fps=fps,
        )
    else:
        title_frame = _create_title_slide(title, subtitle=subtitle, bg_image_path=bg_image_path,
                                          bg_image=fetched_bg)
        if enable_ken_burns or enable_text_fadein:
            title_bg_frame = _create_title_slide("", subtitle="", bg_image_path=bg_image_path,
                                                 bg_image=fetched_bg)
            clip = _make_fadein_clip(title_bg_frame, title_frame, _title_dur, fps,
                                      fade_duration=text_fade_duration if enable_text_fadein else 0,
                                      use_ken_burns=enable_ken_burns)
        else:
            clip = _clip_set_duration(ImageClip(title_frame), _title_dur)
    if enable_narration and narration_audios:
        clip = _attach_narration(clip, narration_audios[0], narration_volume)
    clips.append(clip)
    _ver = "3" if enable_v3 else "2"
    _slide_lbl = "Hook" if enable_v3 else "Title"
    logger.info(f"[Video v{_ver}] {_slide_lbl} slide ready ({_title_dur:.1f}s)")

    # ── コンテンツスライド ───────────────────────────────────────────────────
    _active_slides = v3_slides if enable_v3 else slides
    total_content  = len(_active_slides)
    for i, slide_text in enumerate(_active_slides):
        accent     = accent_colors[i % len(accent_colors)]
        icon       = icons[i % len(icons)]
        _slide_dur = slide_durations[1 + i] if (1 + i) < len(slide_durations) else duration_per_slide

        if enable_v3:
            clip = _make_kinetic_text_clip(
                text=slide_text,
                duration=_slide_dur,
                fps=fps,
                accent_color=accent,
                bg_image=fetched_bg,
                bg_video_clip=bg_video_clip,
                slide_num=i + 1,
                total_slides=total_content,
                icon=icon,
                key_emphasis=v3_key_emphasis,
            )
        else:
            frame_full = _create_content_slide(slide_text, i + 1, total_content,
                                               accent_color=accent, icon=icon,
                                               bg_image=fetched_bg)
            if enable_ken_burns or enable_text_fadein:
                frame_bg = _create_content_slide("", i + 1, total_content,
                                                 accent_color=accent, icon="",
                                                 bg_image=fetched_bg)
                clip = _make_fadein_clip(frame_bg, frame_full, _slide_dur, fps,
                                          fade_duration=text_fade_duration if enable_text_fadein else 0,
                                          use_ken_burns=enable_ken_burns)
            else:
                clip = _clip_set_duration(ImageClip(frame_full), _slide_dur)

        if enable_narration and narration_audios and len(narration_audios) > 1 + i:
            clip = _attach_narration(clip, narration_audios[1 + i], narration_volume)
        clips.append(clip)
        logger.info(f"[Video v{_ver}] Content slide {i+1}/{total_content} ready ({_slide_dur:.1f}s)")

    # ── CTAスライド ──────────────────────────────────────────────────────────
    _cta_dur = slide_durations[-1]
    cta_frame = _create_cta_slide(cta_text, url=url, bg_image=fetched_bg)
    if enable_ken_burns or enable_text_fadein:
        cta_bg = _create_cta_slide("", url=url, bg_image=fetched_bg)
        clip = _make_fadein_clip(cta_bg, cta_frame, _cta_dur, fps,
                                  fade_duration=text_fade_duration if enable_text_fadein else 0,
                                  use_ken_burns=enable_ken_burns)
    else:
        clip = _clip_set_duration(ImageClip(cta_frame), _cta_dur)
    if enable_narration and narration_audios:
        clip = _attach_narration(clip, narration_audios[-1], narration_volume)
    clips.append(clip)
    logger.info(f"[Video v{_ver}] CTA slide ready ({_cta_dur:.1f}s)")

    # ── クリップ結合 ────────────────────────────────────────────────────────
    total_duration = sum(slide_durations)
    logger.info(f"[Video v3] Concatenating clips... Total duration: {total_duration:.1f}s")
    if enable_v3 and v3_crossfade_dur > 0:
        final = _make_crossfade_sequence(clips, crossfade_dur=v3_crossfade_dur)
    else:
        final = concatenate_videoclips(clips, method="compose")

    # ── BGM合成 ───────────────────────────────────────────────────────────────
    if enable_bgm:
        logger.info("[Video v2] Adding BGM via SunoAgent (HF MusicGen)...")
        final = _add_bgm_to_clip(
            final, topic=title, niche=bgm_niche,
            total_duration=total_duration, volume=bgm_volume
        )

    # ── 書き出し ──────────────────────────────────────────────────────────────
    logger.info(f"[Video v2] Writing to: {output_path}")
    has_audio = (enable_bgm and final.audio is not None) or enable_narration
    final.write_videofile(
        output_path,
        fps=fps,
        codec="libx264",
        audio_codec="aac" if has_audio else None,
        audio=has_audio,
        preset="fast",
        ffmpeg_params=["-crf", "23", "-pix_fmt", "yuv420p"],
        logger=None,
    )

    logger.info(f"[Video v2] ✅ SNS short video generated: {output_path}")
    return output_path


# ══════════════════════════════════════════════════════════════════════════════
# SNSDailyScheduler 連携ラッパー
# ══════════════════════════════════════════════════════════════════════════════

def generate_video_from_sns_post(
    bs_text: str,
    topic: str = "",
    category: str = "insight",
    image_path: Optional[str] = None,
) -> Optional[str]:
    import re
    sentences = re.split(r"[。！？\.\!\?]\s*", bs_text.strip())
    sentences = [s.strip() for s in sentences if len(s.strip()) > 5][:5]
    if not sentences:
        sentences = [bs_text[:80]]
    title = topic or bs_text[:40]
    subtitle = f"#{category.replace(chr(95), chr(32)).title()}"
    cta_map = {
        "soft_cta": "今すぐチェック！",
        "question": "コメントで教えてください 💬",
        "build_in_public": "一緒に作ろう 🚀",
        "insight": "参考になったらいいね！ ❤️",
        "marketing_lesson": "保存して後で読み返して 📌",
    }
    cta_text = cta_map.get(category, "フォローして最新情報をゲット！")
    return generate_sns_short_video(
        title=title, slides=sentences, cta_text=cta_text,
        subtitle=subtitle, bg_image_path=image_path, duration_per_slide=3.5,
    )


# ── CLI テスト ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import argparse
    logging.basicConfig(level=logging.INFO)
    parser = argparse.ArgumentParser(description="Sage AI SNS Short Video Generator v3")
    parser.add_argument("--no-bgm",       action="store_true")
    parser.add_argument("--no-ken-burns", action="store_true")
    parser.add_argument("--no-fadein",    action="store_true")
    parser.add_argument("--v3",           action="store_true", default=True)
    args = parser.parse_args()
    out = generate_sns_short_video(
        title="AIで全自動SNS運用を 実現した話",
        subtitle="#BuildInPublic",
        slides=[
            "半年前、SNS投稿を毎日手動でやっていた",
            "今はSage AIが自動で投稿・分析・返信まで",
            "ポイントは「スケジュール x AI生成 x 品質ゲート」",
            "1日3回、JST 8時・13時・20時に全自動投稿",
            "ソロ開発者でも大企業並みSNS運用が可能に",
        ],
        cta_text="詳しくはプロフのリンクから",
        url="sage-official-site.pages.dev",
        bgm_niche="ai automation",
        enable_bgm=not args.no_bgm,
        enable_ken_burns=not args.no_ken_burns,
        enable_text_fadein=not args.no_fadein,
        enable_v3=True,
    )
    print("Video:", out)
