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

    clip = ImageClip(frame).with_duration(duration)
    return clip.transform(zoom_frame)  # MoviePy 2.x: fl() → transform()


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

    clip = ImageClip(frame_bg).with_duration(duration)
    return clip.transform(render_frame)  # MoviePy 2.x: fl() → transform()


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
    font_candidates = [
        str(_FONT_DIR / ("ipaexg.ttf" if not bold else "ipaexg.ttf")),
        "/usr/share/fonts/opentype/ipaexfont-gothic/ipaexg.otf",
        "/usr/share/fonts/truetype/ipafont-gothic/ipagp.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ]
    for path in font_candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    # フォントが見つからない場合はデフォルト（文字化けするが動作する）
    try:
        return ImageFont.load_default()
    except Exception:
        return None


def _wrap_text(text: str, font: ImageFont.FreeTypeFont, max_width: int, draw: ImageDraw.Draw) -> list[str]:
    """テキストをmax_width内に折り返す。"""
    lines = []
    for paragraph in text.split("\n"):
        if not paragraph.strip():
            lines.append("")
            continue
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

def _create_title_slide(title: str, subtitle: str = "", bg_image_path: Optional[str] = None) -> np.ndarray:
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

    # 背景画像があれば半透明で合成
    if bg_image_path and os.path.exists(bg_image_path):
        try:
            bg = Image.open(bg_image_path).convert("RGBA").resize((VIDEO_WIDTH, VIDEO_HEIGHT))
            # 暗くして重ねる
            overlay = Image.new("RGBA", (VIDEO_WIDTH, VIDEO_HEIGHT), (0, 0, 0, 160))
            bg_darkened = Image.alpha_composite(bg, overlay)
            img = Image.alpha_composite(img, Image.new("RGBA", (VIDEO_WIDTH, VIDEO_HEIGHT), (0, 0, 0, 0)))
            img.paste(bg_darkened, (0, 0))
            draw = ImageDraw.Draw(img, "RGBA")
        except Exception as e:
            logger.warning(f"[Video] bg_image load failed: {e}")

    # ロゴ/ブランド帯（上部）
    draw.rectangle([(0, 0), (VIDEO_WIDTH, 120)], fill=BRAND_BLUE + (200,))
    font_brand = _load_font(40, bold=True)
    if font_brand:
        draw.text((VIDEO_WIDTH // 2, 60), "⚡ SAGE AI", font=font_brand,
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
    icon: str = "💡",
) -> np.ndarray:
    """コンテンツスライドを生成する。"""
    img = Image.new("RGBA", (VIDEO_WIDTH, VIDEO_HEIGHT), BRAND_DARK + (255,))
    draw = ImageDraw.Draw(img, "RGBA")

    # 背景
    for y in range(VIDEO_HEIGHT):
        ratio = y / VIDEO_HEIGHT
        r = int(26 + 10 * ratio)
        g = int(26 + 10 * ratio)
        b = int(77 + 20 * ratio)
        draw.line([(0, y), (VIDEO_WIDTH, y)], fill=(r, g, b, 255))

    # 上部バー
    draw.rectangle([(0, 0), (VIDEO_WIDTH, 100)], fill=accent_color + (220,))
    font_brand = _load_font(34, bold=True)
    if font_brand:
        draw.text((VIDEO_WIDTH // 2, 50), "⚡ SAGE AI", font=font_brand,
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


def _create_cta_slide(cta_text: str, url: str = "sage-official-site.pages.dev") -> np.ndarray:
    """CTAスライドを生成する（最終スライド）。"""
    img = Image.new("RGBA", (VIDEO_WIDTH, VIDEO_HEIGHT), BRAND_DARK + (255,))
    draw = ImageDraw.Draw(img, "RGBA")

    # グラデーション背景
    for y in range(VIDEO_HEIGHT):
        ratio = y / VIDEO_HEIGHT
        r = int(BRAND_DARK[0] + (BRAND_BLUE[0] - BRAND_DARK[0]) * ratio * 0.6)
        g = int(BRAND_DARK[1] + (BRAND_BLUE[1] - BRAND_DARK[1]) * ratio * 0.6)
        b = int(BRAND_DARK[2] + (BRAND_BLUE[2] - BRAND_DARK[2]) * ratio * 0.8)
        draw.line([(0, y), (VIDEO_WIDTH, y)], fill=(r, g, b, 255))

    # ブランド
    font_brand = _load_font(50, bold=True)
    if font_brand:
        draw.text((VIDEO_WIDTH // 2, 160), "⚡ SAGE AI", font=font_brand,
                  fill=BRAND_WHITE, anchor="mm")

    # CTAカード
    card_y = VIDEO_HEIGHT // 2 - 220
    draw.rounded_rectangle(
        [(80, card_y), (VIDEO_WIDTH - 80, card_y + 440)],
        radius=50,
        fill=(255, 255, 255, 25)
    )

    # CTAテキスト
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
        draw.text((VIDEO_WIDTH // 2, VIDEO_HEIGHT - 80), "フォロー & いいね で応援よろしく🙏",
                  font=font_footer, fill=TEXT_GRAY, anchor="mm")

    return np.array(img.convert("RGB"))


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

    # アクセントカラーのローテーション
    accent_colors = [BRAND_BLUE, (80, 180, 120), (200, 100, 60), (140, 80, 200)]
    icons = ["💡", "🚀", "⚡", "🎯", "📈", "🔥"]

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

    # ── タイトルスライド ─────────────────────────────────────────────────────
    _title_dur = slide_durations[0]
    title_frame = _create_title_slide(title, subtitle=subtitle, bg_image_path=bg_image_path)
    if enable_ken_burns or enable_text_fadein:
        title_bg_frame = _create_title_slide("", subtitle="", bg_image_path=bg_image_path)
        clip = _make_fadein_clip(title_bg_frame, title_frame, _title_dur, fps,
                                  fade_duration=text_fade_duration if enable_text_fadein else 0,
                                  use_ken_burns=enable_ken_burns)
    else:
        clip = ImageClip(title_frame).with_duration(_title_dur)
    if enable_narration and narration_audios:
        clip = _attach_narration(clip, narration_audios[0], narration_volume)
    clips.append(clip)
    logger.info(f"[Video v2] Title slide ready ({_title_dur:.1f}s)")

    # ── コンテンツスライド ───────────────────────────────────────────────────
    total_content = len(slides)
    for i, slide_text in enumerate(slides):
        accent = accent_colors[i % len(accent_colors)]
        icon = icons[i % len(icons)]
        _slide_dur = slide_durations[1 + i]
        frame_full = _create_content_slide(slide_text, i + 1, total_content,
                                           accent_color=accent, icon=icon)
        if enable_ken_burns or enable_text_fadein:
            frame_bg = _create_content_slide("", i + 1, total_content,
                                             accent_color=accent, icon="")
            clip = _make_fadein_clip(frame_bg, frame_full, _slide_dur, fps,
                                      fade_duration=text_fade_duration if enable_text_fadein else 0,
                                      use_ken_burns=enable_ken_burns)
        else:
            clip = ImageClip(frame_full).with_duration(_slide_dur)
        if enable_narration and narration_audios and len(narration_audios) > 1 + i:
            clip = _attach_narration(clip, narration_audios[1 + i], narration_volume)
        clips.append(clip)
        logger.info(f"[Video v2] Content slide {i+1}/{total_content} ready ({_slide_dur:.1f}s)")

    # ── CTAスライド ──────────────────────────────────────────────────────────
    _cta_dur = slide_durations[-1]
    cta_frame = _create_cta_slide(cta_text, url=url)
    if enable_ken_burns or enable_text_fadein:
        cta_bg = _create_cta_slide("", url=url)
        clip = _make_fadein_clip(cta_bg, cta_frame, _cta_dur, fps,
                                  fade_duration=text_fade_duration if enable_text_fadein else 0,
                                  use_ken_burns=enable_ken_burns)
    else:
        clip = ImageClip(cta_frame).with_duration(_cta_dur)
    if enable_narration and narration_audios:
        clip = _attach_narration(clip, narration_audios[-1], narration_volume)
    clips.append(clip)
    logger.info(f"[Video v2] CTA slide ready ({_cta_dur:.1f}s)")

    # ── 結合 ─────────────────────────────────────────────────────────────────
    total_duration = sum(slide_durations)
    logger.info(f"[Video v2] Concatenating clips... Total duration: {total_duration:.1f}s")
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
    """
    SNSテキスト投稿から動画を自動生成するショートカット。
    sns_daily_scheduler._post_now() から呼び出す用。

    Args:
        bs_text: Bluesky投稿テキスト（スライドに分割して使用）
        topic: トピック（タイトルに使用）
        category: 投稿カテゴリ（スタイルに影響）
        image_path: 背景画像パス（任意）

    Returns:
        mp4ファイルパス、失敗時はNone
    """
    # テキストを文単位でスライドに分割（最大5スライド）
    import re
    sentences = re.split(r'[。！？\.\!\?]\s*', bs_text.strip())
    sentences = [s.strip() for s in sentences if len(s.strip()) > 5][:5]

    if not sentences:
        sentences = [bs_text[:80]]

    title = topic or bs_text[:40]
    subtitle = f"#{category.replace('_', ' ').title()}"

    # カテゴリに合わせたCTA
    cta_map = {
        "soft_cta": "今すぐチェック！",
        "question": "コメントで教えてください 💬",
        "build_in_public": "一緒に作ろう 🚀",
        "insight": "参考になったらいいね！ ❤️",
        "marketing_lesson": "保存して後で読み返して 📌",
    }
    cta_text = cta_map.get(category, "フォローして最新情報をゲット！")

    return generate_sns_short_video(
        title=title,
        slides=sentences,
        cta_text=cta_text,
        subtitle=subtitle,
        bg_image_path=image_path,
        duration_per_slide=3.5,
    )


# ── CLI テスト ─────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import argparse
    logging.basicConfig(level=logging.INFO)

    parser = argparse.ArgumentParser(description="Sage AI SNS Short Video Generator v2")
    parser.add_argument("--no-bgm",        action="store_true", help="BGMなしで生成")
    parser.add_argument("--no-ken-burns",  action="store_true", help="Kenバーンズなし")
    parser.add_argument("--no-fadein",     action="store_true", help="テキストフェードインなし")
    args = parser.parse_args()

    print("=== Sage AI SNS Short Video Generator v2 ===")
    print(f"  BGM:        {'OFF' if args.no_bgm       else 'ON (HF MusicGen)'}")
    print(f"  Ken Burns:  {'OFF' if args.no_ken_burns else 'ON'}")
    print(f"  Text Fade:  {'OFF' if args.no_fadein    else 'ON'}")
    print()

    out = generate_sns_short_video(
        title="AIで全自動SNS運用を\n実現した話",
        subtitle="#BuildInPublic",
        slides=[
            "半年前、SNS投稿を毎日手動でやっていた",
            "今はSage AIが自動で投稿・分析・返信まで",
            "ポイントは「スケジュール x AI生成 x 品質ゲート」",
            "1日3回、JST 8時・13時・20時に全自動投稿",
            "ソロ開発者でも大企業並みのSNS運用が可能に",
        ],
        cta_text="詳しくはプロフのリンクから",
        url="sage-official-site.pages.dev",
        bgm_niche="ai automation",
        enable_bgm=not args.no_bgm,
        enable_ken_burns=not args.no_ken_burns,
        enable_text_fadein=not args.no_fadein,
    )
    print(f"\nVideo: {out}")
