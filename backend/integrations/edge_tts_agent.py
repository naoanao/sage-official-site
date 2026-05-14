"""
edge_tts_agent.py
-----------------
Microsoft Edge TTS (無料・APIキー不要) を使った多言語TTS生成エージェント。

インストール: pip install edge-tts

英語デフォルト: en-US-AriaNeural  (女性・自然な話し声)
日本語デフォルト: ja-JP-NanamiNeural

使い方:
    from backend.integrations.edge_tts_agent import generate_narration_en, is_edge_tts_available

    if is_edge_tts_available():
        result = generate_narration_en("Hello, this is Sage AI.", language="en")
        # result["local_path"] → MP3ファイルのパス
"""

import os
import time
import asyncio
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# ==================== 設定 ====================

OUTPUT_DIR = Path(os.getenv("EDGE_TTS_OUTPUT_DIR", "generated_videos/narration"))

# 音声一覧（主要なもの）
VOICES_EN = {
    "aria":    "en-US-AriaNeural",    # 女性・自然 (デフォルト)
    "guy":     "en-US-GuyNeural",     # 男性・自然
    "jenny":   "en-US-JennyNeural",   # 女性・フレンドリー
    "sonia":   "en-GB-SoniaNeural",   # 女性・英国英語
    "ryan":    "en-GB-RyanNeural",    # 男性・英国英語
    "natasha": "en-AU-NatashaNeural", # 女性・オーストラリア英語
}

VOICES_JA = {
    "nanami": "ja-JP-NanamiNeural",  # 女性・自然 (デフォルト)
    "keita":  "ja-JP-KeitaNeural",   # 男性・自然
}

DEFAULT_VOICE_EN = "en-US-AriaNeural"
DEFAULT_VOICE_JA = "ja-JP-NanamiNeural"


# ==================== ユーティリティ ====================

def is_edge_tts_available() -> bool:
    """edge-tts パッケージが使えるかチェック"""
    try:
        import edge_tts  # noqa: F401
        return True
    except ImportError:
        return False


def _speed_to_rate_str(speed: float) -> str:
    """話速倍率 → Edge TTS rate文字列変換 (例: 1.1 → '+10%', 0.9 → '-10%')"""
    pct = int((speed - 1.0) * 100)
    return f"+{pct}%" if pct >= 0 else f"{pct}%"


def _estimate_mp3_duration(mp3_path: str, text: str, speed: float = 1.0) -> float:
    """MP3ファイルの再生時間を概算する。複数の方法でフォールバック。"""
    # 方法1: mutagen (高精度)
    try:
        from mutagen.mp3 import MP3
        return MP3(mp3_path).info.length
    except Exception:
        pass

    # 方法2: pydub
    try:
        from pydub import AudioSegment
        return len(AudioSegment.from_mp3(mp3_path)) / 1000.0
    except Exception:
        pass

    # 方法3: ファイルサイズから概算 (128kbps MP3前提)
    try:
        size = os.path.getsize(mp3_path)
        return (size * 8) / (128 * 1000)  # bits / bitrate
    except Exception:
        pass

    # 方法4: テキスト長から概算
    word_count = len(text.split())
    char_count = len(text)
    is_cjk = char_count > 0 and sum(1 for c in text if ord(c) > 0x2E80) / char_count > 0.3
    if is_cjk:
        duration = (char_count / 5.0) / speed   # 日本語: ~5文字/秒
    else:
        duration = (word_count / 2.5) / speed   # 英語: ~2.5語/秒
    return max(duration, 0.5)


# ==================== メイン関数 ====================

async def _synthesize_async(
    text: str,
    voice: str,
    output_path: str,
    rate: str,
    volume: str,
) -> None:
    """非同期でEdge TTSを実行してMP3を保存する"""
    import edge_tts
    communicate = edge_tts.Communicate(text, voice, rate=rate, volume=volume)
    await communicate.save(output_path)


def generate_narration_en(
    text: str,
    voice: Optional[str] = None,
    speed: float = 1.1,
    volume: float = 1.0,
    output_path: Optional[str] = None,
    language: str = "en",
) -> dict:
    """
    テキストを音声に変換してMP3ファイルとして保存する（Edge TTS使用）。

    Parameters
    ----------
    text        : 読み上げるテキスト
    voice       : Edge TTS音声名（省略時は言語に応じた自動選択）
                  英語: "en-US-AriaNeural" など
                  日本語: "ja-JP-NanamiNeural" など
    speed       : 話速倍率 (0.5〜2.0, デフォルト1.1)
    volume      : 音量 (0.0〜2.0, デフォルト1.0)
    output_path : 保存先パス（省略時は自動生成）
    language    : 言語コード "en" | "ja" （voiceが省略時のデフォルト選択に使用）

    Returns
    -------
    dict: {
        "status"      : "success" | "error",
        "local_path"  : str,          # MP3ファイルの絶対パス
        "duration_sec": float,         # 音声長さ（概算）
        "text"        : str,
        "voice"       : str,
        "error"       : str            # エラー時のみ
    }
    """
    if not text or not text.strip():
        return {"status": "error", "error": "テキストが空です", "local_path": None}

    if not is_edge_tts_available():
        logger.error("[EdgeTTS] edge-tts not installed. Run: pip install edge-tts")
        return {
            "status": "error",
            "error": "edge-tts not installed. Run: pip install edge-tts",
            "local_path": None,
            "text": text,
        }

    # 音声の自動選択
    if voice is None:
        voice = DEFAULT_VOICE_JA if language == "ja" else DEFAULT_VOICE_EN

    rate_str = _speed_to_rate_str(speed)
    vol_pct = int((volume - 1.0) * 100)
    vol_str = f"+{vol_pct}%" if vol_pct >= 0 else f"{vol_pct}%"

    try:
        # 保存先決定
        if output_path is None:
            OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
            timestamp = int(time.time() * 1000)
            safe_voice = voice.replace("-", "_")
            output_path = str(OUTPUT_DIR / f"narration_{timestamp}_{safe_voice}.mp3")
        else:
            Path(output_path).parent.mkdir(parents=True, exist_ok=True)

        # 非同期実行 (asyncio.run はイベントループを自動管理)
        try:
            asyncio.run(_synthesize_async(text, voice, output_path, rate_str, vol_str))
        except RuntimeError:
            # 既存のイベントループ内で呼ばれた場合 (Jupyter等)
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(
                _synthesize_async(text, voice, output_path, rate_str, vol_str)
            )
            loop.close()

        # ファイル確認
        if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
            return {
                "status": "error",
                "error": "音声ファイルの生成に失敗しました（ファイルサイズ0）",
                "local_path": None,
                "text": text,
                "voice": voice,
            }

        duration_sec = _estimate_mp3_duration(output_path, text, speed)

        logger.info(f"[EdgeTTS] 音声生成完了: {output_path} ({duration_sec:.2f}秒, voice={voice})")
        return {
            "status":       "success",
            "local_path":   str(Path(output_path).resolve()),
            "duration_sec": duration_sec,
            "text":         text,
            "voice":        voice,
        }

    except Exception as e:
        logger.error(f"[EdgeTTS] 音声生成エラー: {e}")
        return {
            "status": "error",
            "error": str(e),
            "local_path": None,
            "text": text,
            "voice": voice,
        }


def generate_narration_batch_en(
    texts: list[str],
    language: str = "en",
    voice: Optional[str] = None,
    speed: float = 1.1,
) -> list[dict]:
    """複数テキストをまとめて音声化する。"""
    results = []
    for text in texts:
        result = generate_narration_en(text, voice=voice, speed=speed, language=language)
        results.append(result)
        if result["status"] == "success":
            time.sleep(0.1)  # API負荷軽減
    return results


# ==================== CLI テスト ====================

if __name__ == "__main__":
    import sys

    test_text = sys.argv[1] if len(sys.argv) > 1 else "Hello, this is Sage AI. Automating your social media."
    language  = sys.argv[2] if len(sys.argv) > 2 else "en"

    print(f"EdgeTTS利用可能: {is_edge_tts_available()}")
    if not is_edge_tts_available():
        print("pip install edge-tts を実行してください。")
        sys.exit(1)

    print(f"テキスト: {test_text}")
    print(f"言語: {language}")

    result = generate_narration_en(test_text, language=language)
    print(f"結果: {result['status']}")

    if result["status"] == "success":
        print(f"\n音声ファイル: {result['local_path']}")
        print(f"長さ: {result['duration_sec']:.2f}秒")
        print(f"音声: {result['voice']}")
    else:
        print(f"\nエラー: {result['error']}")
