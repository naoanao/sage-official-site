"""
voicevox_agent.py
-----------------
VOICEVOX HTTP API を使った日本語TTS生成エージェント。

VOICEVOX はローカルで起動しておく必要があります（デフォルト: http://localhost:50021）。
インストール・起動: https://voicevox.hiroshiba.jp/

使い方:
    from backend.integrations.voicevox_agent import generate_narration, is_voicevox_running

    if is_voicevox_running():
        result = generate_narration("こんにちは、Sageです。", speaker_id=1)
        # result["local_path"] → WAVファイルのパス
    else:
        print("VOICEVOXが起動していません")
"""

import os
import json
import time
import tempfile
import logging
import requests
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# ==================== 設定 ====================

VOICEVOX_URL = os.getenv("VOICEVOX_URL", "http://localhost:50021")
VOICEVOX_TIMEOUT = int(os.getenv("VOICEVOX_TIMEOUT", "30"))

# VOICEVOX スピーカーID 一覧（主要なもの）
SPEAKER_IDS = {
    "四国めたん_normal":    2,
    "四国めたん_tsun":      6,
    "四国めたん_sexy":      4,
    "四国めたん_whisper":   36,
    "ずんだもん_normal":    3,
    "ずんだもん_tsun":      7,
    "ずんだもん_sexy":      5,
    "ずんだもん_whisper":   22,
    "春日部つむぎ_normal":  8,
    "波音リツ_normal":      9,
    "雨晴はう_normal":      10,
    "玄野武宏_normal":      11,
    "白上虎太郎_normal":    12,
    "青山龍星_normal":      13,
    "冥鳴ひまり_normal":    14,
    "九州そら_normal":      16,
    "もち子さん_normal":    20,
    "剣崎雌雄_normal":      21,
    "WhiteCUL_normal":     23,
    "後鬼_normal":          27,
    "No.7_normal":          29,
    "ちび式じい_normal":    42,
    "櫻歌ミコ_normal":      43,
    "小夜_normal":          46,
    "ナースロボ_タイプT":    47,
}

DEFAULT_SPEAKER_ID = 1          # ずんだもん(normal) … ID=1は旧バージョン互換。3推奨
OUTPUT_DIR = Path(os.getenv("VOICEVOX_OUTPUT_DIR", "generated_videos/narration"))


# ==================== ユーティリティ ====================

def is_voicevox_running(url: str = VOICEVOX_URL) -> bool:
    """VOICEVOXが起動中かチェック（/version エンドポイントを叩く）"""
    try:
        r = requests.get(f"{url}/version", timeout=3)
        return r.status_code == 200
    except Exception:
        return False


def get_voicevox_speakers(url: str = VOICEVOX_URL) -> list:
    """利用可能なスピーカー一覧を取得"""
    try:
        r = requests.get(f"{url}/speakers", timeout=10)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        logger.error(f"[VOICEVOX] スピーカー一覧取得失敗: {e}")
        return []


# ==================== メイン関数 ====================

def generate_narration(
    text: str,
    speaker_id: int = DEFAULT_SPEAKER_ID,
    speed: float = 1.1,
    pitch: float = 0.0,
    intonation: float = 1.0,
    volume: float = 1.0,
    output_path: Optional[str] = None,
    url: str = VOICEVOX_URL,
) -> dict:
    """
    テキストを音声に変換してWAVファイルとして保存する。

    Parameters
    ----------
    text        : 読み上げるテキスト（日本語）
    speaker_id  : スピーカーID（デフォルト: 1=ずんだもん）
    speed       : 話速（0.5〜2.0、デフォルト1.1）
    pitch       : 音高（-0.15〜0.15）
    intonation  : 抑揚（0.0〜2.0）
    volume      : 音量（0.0〜2.0）
    output_path : 保存先パス（省略時は自動生成）
    url         : VOICEVOX URL

    Returns
    -------
    dict: {
        "status": "success" | "error",
        "local_path": str,       # WAVファイルの絶対パス
        "duration_sec": float,   # 音声の秒数（概算）
        "text": str,
        "speaker_id": int,
        "error": str             # エラー時のみ
    }
    """
    if not text or not text.strip():
        return {"status": "error", "error": "テキストが空です", "local_path": None}

    # VOICEVOX 起動確認
    if not is_voicevox_running(url):
        logger.warning("[VOICEVOX] サーバーが起動していません。ナレーションをスキップします。")
        return {
            "status": "error",
            "error": "VOICEVOX_NOT_RUNNING",
            "local_path": None,
            "text": text,
            "speaker_id": speaker_id,
        }

    try:
        # Step 1: audio_query（音声合成クエリの生成）
        params = {"text": text, "speaker": speaker_id}
        r = requests.post(f"{url}/audio_query", params=params, timeout=VOICEVOX_TIMEOUT)
        r.raise_for_status()
        audio_query = r.json()

        # パラメータ上書き
        audio_query["speedScale"]      = speed
        audio_query["pitchScale"]      = pitch
        audio_query["intonationScale"] = intonation
        audio_query["volumeScale"]     = volume
        audio_query["prePhonemeLength"] = 0.1
        audio_query["postPhonemeLength"] = 0.1

        # Step 2: synthesis（音声生成）
        headers = {"Content-Type": "application/json"}
        r2 = requests.post(
            f"{url}/synthesis",
            params={"speaker": speaker_id},
            data=json.dumps(audio_query),
            headers=headers,
            timeout=VOICEVOX_TIMEOUT,
        )
        r2.raise_for_status()
        wav_bytes = r2.content

        # 保存先決定
        if output_path is None:
            OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
            timestamp = int(time.time() * 1000)
            output_path = str(OUTPUT_DIR / f"narration_{timestamp}_{speaker_id}.wav")

        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "wb") as f:
            f.write(wav_bytes)

        # 音声長さ概算（WAVヘッダから取得）
        duration_sec = _estimate_wav_duration(wav_bytes)

        logger.info(f"[VOICEVOX] 音声生成完了: {output_path} ({duration_sec:.2f}秒)")
        return {
            "status":       "success",
            "local_path":   str(Path(output_path).resolve()),
            "duration_sec": duration_sec,
            "text":         text,
            "speaker_id":   speaker_id,
        }

    except requests.exceptions.ConnectionError:
        msg = "VOICEVOX接続失敗（起動していますか？）"
        logger.error(f"[VOICEVOX] {msg}")
        return {"status": "error", "error": msg, "local_path": None, "text": text, "speaker_id": speaker_id}
    except Exception as e:
        logger.error(f"[VOICEVOX] 音声生成エラー: {e}")
        return {"status": "error", "error": str(e), "local_path": None, "text": text, "speaker_id": speaker_id}


def generate_narration_batch(
    texts: list[str],
    speaker_id: int = DEFAULT_SPEAKER_ID,
    speed: float = 1.1,
    **kwargs,
) -> list[dict]:
    """
    複数テキストをまとめて音声化する。
    各スライドのテキストリストを渡すと、それぞれのWAVパスが返る。

    Returns: list of generate_narration() results
    """
    results = []
    for text in texts:
        result = generate_narration(text, speaker_id=speaker_id, speed=speed, **kwargs)
        results.append(result)
        # VOICEVOX負荷軽減のため少し待つ
        if result["status"] == "success":
            time.sleep(0.2)
    return results


# ==================== 内部ユーティリティ ====================

def _estimate_wav_duration(wav_bytes: bytes) -> float:
    """WAVバイト列から音声長さを計算する（ヘッダ解析）"""
    try:
        import struct
        # WAV RIFF ヘッダのサンプルレートとデータサイズから計算
        # offset 24: サンプルレート (4 bytes)
        # offset 28: バイトレート (4 bytes)
        if len(wav_bytes) < 44:
            return 0.0
        byte_rate = struct.unpack_from("<I", wav_bytes, 28)[0]
        # データチャンクサイズ: offset 40 (4 bytes)
        data_size = struct.unpack_from("<I", wav_bytes, 40)[0]
        if byte_rate > 0:
            return data_size / byte_rate
        return 0.0
    except Exception:
        return 0.0


# ==================== CLI テスト ====================

if __name__ == "__main__":
    import sys

    test_text = sys.argv[1] if len(sys.argv) > 1 else "こんにちは、Sageです。AIで自動生成した動画です。"
    speaker_id = int(sys.argv[2]) if len(sys.argv) > 2 else 1

    print(f"VOICEVOX起動確認: {is_voicevox_running()}")
    if not is_voicevox_running():
        print("VOICEVOXが起動していません。")
        print("https://voicevox.hiroshiba.jp/ からダウンロード・起動してください。")
        sys.exit(1)

    print(f"テキスト: {test_text}")
    print(f"スピーカーID: {speaker_id}")

    result = generate_narration(test_text, speaker_id=speaker_id)
    print(f"結果: {result}")

    if result["status"] == "success":
        print(f"\n✅ 音声ファイル: {result['local_path']}")
        print(f"   長さ: {result['duration_sec']:.2f}秒")
    else:
        print(f"\n❌ エラー: {result['error']}")
