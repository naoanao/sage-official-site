"""
SunoAgent v2.0 — HuggingFace MusicGen版（無料・HF_TOKEN使用）
Phase 2: 動画パイプライン BGM自動生成

AIML API（有料）→ HuggingFace MusicGen（無料）に切り替え
モデル: facebook/musicgen-stereo-medium
ライセンス: CC-BY-NC-4.0（非商用・個人・研究用途）

HF_TOKEN は既存の .env から取得。追加コストゼロ。
"""
import os
import time
import json
import logging
import requests
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

# HuggingFace Inference API
HF_API_BASE = "https://api-inference.huggingface.co/models"

# 用途別モデル選択
MODELS = {
    "quality": "facebook/musicgen-stereo-medium",   # 高品質・ステレオ（推奨）
    "fast":    "facebook/musicgen-small",            # 高速・軽量
    "large":   "facebook/musicgen-stereo-large",    # 最高品質（低速）
}


class SunoAgent:
    """
    HuggingFace MusicGen経由のBGM自動生成エージェント。
    ブログ記事のトピック・ニッチから音楽スタイルを判定し、
    BGMを生成してローカルに保存する。

    AIML API（有料）の完全代替。HF_TOKENのみ必要。
    """

    STYLE_MAP = {
        "developer":      "ambient electronic, lo-fi coding music, calm, 80bpm, instrumental",
        "ai automation":  "futuristic synthwave, electronic, pulsing rhythm, 90bpm, instrumental",
        "solopreneur":    "upbeat acoustic guitar, motivational, energetic, 100bpm, instrumental",
        "passive income": "chill lofi hip hop, relaxed, laid-back, 75bpm, instrumental",
        "fitness":        "energetic EDM, driving beat, high tempo, 128bpm, instrumental",
        "finance":        "smooth jazz, professional corporate, clean piano, 85bpm, instrumental",
        "default":        "calm ambient, neutral background music, 80bpm, instrumental, no vocals",
    }

    def __init__(self, quality: str = "quality"):
        self.hf_token = os.getenv("HF_TOKEN", "")
        self.model_id = MODELS.get(quality, MODELS["quality"])
        self.output_dir = Path(os.getcwd()) / "generated_audios"
        self.output_dir.mkdir(exist_ok=True)
        self.dry_run = os.getenv("SAGE_DRY_RUN", "false").lower() == "true"

        if self.hf_token:
            logger.info(f"✅ SunoAgent (HF MusicGen) initialized: {self.model_id}")
        else:
            logger.warning("SunoAgent: HF_TOKEN not set")

    def _detect_style(self, niche: str, topic: str) -> str:
        combined = f"{niche} {topic}".lower()
        for keyword, style in self.STYLE_MAP.items():
            if keyword in combined:
                return style
        return self.STYLE_MAP["default"]

    def generate_bgm(
        self,
        topic: str,
        niche: str = "",
        duration_seconds: int = 30,
    ) -> dict:
        """
        トピックに合ったBGMを生成する。

        Args:
            topic: コンテンツのトピック
            niche: identity.jsonのniche値
            duration_seconds: 目標長さ（秒）。MusicGenは最大30秒推奨。

        Returns:
            {"status": "success", "local_path": "...", "style": "..."}
        """
        style = self._detect_style(niche, topic)
        prompt = f"{style}, background music for content about {topic[:80]}"

        if self.dry_run or not self.hf_token:
            logger.info(f"[MusicGen][DRY_RUN] style={style[:50]}")
            return {
                "status": "dry_run",
                "style": style,
                "prompt": prompt,
                "local_path": None,
                "audio_url": None,
            }

        headers = {"Authorization": f"Bearer {self.hf_token}"}
        # MusicGenは tokens で長さを制御（約50token/秒）
        max_tokens = min(duration_seconds * 50, 1500)

        payload = {
            "inputs": prompt,
            "parameters": {
                "max_new_tokens": max_tokens,
                "do_sample": True,
                "guidance_scale": 3.0,
            },
        }

        try:
            logger.info(f"[MusicGen] Generating {duration_seconds}s BGM: {prompt[:60]}...")
            url = f"{HF_API_BASE}/{self.model_id}"

            # モデルのロード待ちに対応（最初のリクエストは503が返ることがある）
            for attempt in range(3):
                resp = requests.post(url, headers=headers, json=payload, timeout=120)

                if resp.status_code == 503:
                    # モデルロード中 — 待機してリトライ
                    wait = resp.json().get("estimated_time", 30)
                    logger.info(f"[MusicGen] Model loading, waiting {wait}s...")
                    time.sleep(min(wait, 30))
                    continue
                elif resp.status_code == 200:
                    break
                else:
                    logger.error(f"[MusicGen] HTTP {resp.status_code}: {resp.text[:200]}")
                    return {"status": "error", "message": f"HTTP {resp.status_code}"}

            audio_bytes = resp.content
            if len(audio_bytes) < 1000:
                logger.error(f"[MusicGen] Response too small ({len(audio_bytes)} bytes) — likely error")
                return {"status": "error", "message": "Invalid audio response"}

            # ローカルに保存
            slug = topic.lower().replace(" ", "_")[:30]
            filename = f"bgm_{slug}_{int(time.time())}.wav"
            path = self.output_dir / filename
            path.write_bytes(audio_bytes)

            logger.info(f"[MusicGen] ✅ BGM saved: {path} ({len(audio_bytes)//1024}KB)")
            return {
                "status": "success",
                "style": style,
                "local_path": str(path),
                "audio_url": None,  # ローカル保存のみ
                "model": self.model_id,
                "duration_requested": duration_seconds,
            }

        except requests.exceptions.Timeout:
            logger.error("[MusicGen] Request timed out — model may be overloaded")
            return {"status": "error", "message": "Request timed out"}
        except Exception as e:
            logger.error(f"[MusicGen] Generation failed: {e}")
            return {"status": "error", "message": str(e)}


if __name__ == "__main__":
    agent = SunoAgent()
    result = agent.generate_bgm(
        topic="How to build autonomous AI systems",
        niche="autonomous AI systems for developers",
        duration_seconds=15,
    )
    print(json.dumps(result, indent=2, ensure_ascii=False, default=str))
