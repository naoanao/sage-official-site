"""
KlingAgent v2.0 — HuggingFace LTX-Video版（無料・HF_TOKEN使用）
Phase 2: 動画パイプライン

Kling API（サイト不在）→ HuggingFace LTX-Video（無料）に切り替え
モデル: Lightricks/LTX-Video-0.9.8-13B-distilled（高速・高品質）
代替:   tencent/HunyuanVideo（超高品質・低速）

HF_TOKEN は既存の .env から取得。追加コストゼロ。
縦型（9:16）Instagram Reels対応。
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

HF_API_BASE = "https://api-inference.huggingface.co/models"

# 用途別モデル選択
MODELS = {
    "fast":    "Lightricks/LTX-Video-0.9.8-13B-distilled",  # 高速（推奨）
    "quality": "tencent/HunyuanVideo",                       # 高品質・低速
    "light":   "stabilityai/stable-video-diffusion-img2vid-xt",  # 軽量
}


class KlingAgent:
    """
    HuggingFace LTX-Video経由の動画生成エージェント。
    テキストまたは画像+テキストから縦型（9:16）動画を生成。

    Kling v2.1 REST API（サイト不在）の完全代替。
    HF_TOKENのみ必要。
    """

    def __init__(self, mode: str = "fast"):
        self.hf_token = os.getenv("HF_TOKEN", "")
        self.model_id = MODELS.get(mode, MODELS["fast"])
        self.output_dir = Path(os.getcwd()) / "generated_videos"
        self.output_dir.mkdir(exist_ok=True)
        self.dry_run = os.getenv("SAGE_DRY_RUN", "false").lower() == "true"

        if self.hf_token:
            logger.info(f"✅ KlingAgent (HF LTX-Video) initialized: {self.model_id}")
        else:
            logger.warning("KlingAgent: HF_TOKEN not set")

    def generate_video(
        self,
        prompt: str,
        image_url: str = None,
        duration: int = 5,
        aspect_ratio: str = "9:16",
        model: str = None,
    ) -> dict:
        """
        動画を生成する。

        Args:
            prompt: 動画の説明テキスト
            image_url: スタート画像のURL（任意）
            duration: 動画の長さ（秒）— LTX-Videoでは推奨5秒
            aspect_ratio: "9:16"（縦型Reels）or "16:9"（横型）
            model: モデル上書き（省略時はインスタンスのmodel_id）

        Returns:
            {"status": "success", "local_path": "...", "video_url": None}
        """
        use_model = model or self.model_id

        if self.dry_run or not self.hf_token:
            logger.info(f"[LTX-Video][DRY_RUN] {aspect_ratio} {duration}s: {prompt[:60]}")
            return {
                "status": "dry_run",
                "prompt": prompt,
                "duration": duration,
                "aspect_ratio": aspect_ratio,
                "video_url": None,
                "local_path": None,
            }

        # アスペクト比を幅×高さに変換
        size_map = {
            "9:16": (512, 912),   # Reels縦型
            "16:9": (912, 512),   # 横型
            "1:1":  (704, 704),   # 正方形
        }
        w, h = size_map.get(aspect_ratio, (512, 912))

        headers = {
            "Authorization": f"Bearer {self.hf_token}",
            "Content-Type": "application/json",
        }

        # LTX-Videoのペイロード（HF Inference API形式）
        payload = {
            "inputs": prompt,
            "parameters": {
                "num_frames": duration * 24,      # 24fps × 秒数
                "width": w,
                "height": h,
                "num_inference_steps": 25,
                "guidance_scale": 7.5,
            },
        }

        try:
            api_url = f"{HF_API_BASE}/{use_model}"
            logger.info(f"[LTX-Video] Generating {duration}s {aspect_ratio} video...")

            # ロード待ちリトライ
            for attempt in range(3):
                resp = requests.post(api_url, headers=headers, json=payload, timeout=300)

                if resp.status_code == 503:
                    wait = resp.json().get("estimated_time", 60)
                    logger.info(f"[LTX-Video] Model loading, waiting {wait}s...")
                    time.sleep(min(wait, 60))
                    continue
                elif resp.status_code == 200:
                    break
                else:
                    logger.error(f"[LTX-Video] HTTP {resp.status_code}: {resp.text[:300]}")
                    return {"status": "error", "message": f"HTTP {resp.status_code}: {resp.text[:200]}"}

            video_bytes = resp.content
            if len(video_bytes) < 10000:
                logger.error(f"[LTX-Video] Response too small ({len(video_bytes)} bytes)")
                return {"status": "error", "message": "Invalid video response"}

            # ローカルに保存
            slug = prompt.lower().replace(" ", "_")[:30]
            filename = f"video_{slug}_{int(time.time())}.mp4"
            path = self.output_dir / filename
            path.write_bytes(video_bytes)

            logger.info(f"[LTX-Video] ✅ Video saved: {path} ({len(video_bytes)//1024}KB)")
            return {
                "status": "success",
                "video_url": None,       # ローカル保存のみ
                "local_path": str(path),
                "duration": duration,
                "aspect_ratio": aspect_ratio,
                "model": use_model,
            }

        except requests.exceptions.Timeout:
            logger.error("[LTX-Video] Request timed out")
            return {"status": "error", "message": "Request timed out (>5 min)"}
        except Exception as e:
            logger.error(f"[LTX-Video] Generation failed: {e}")
            return {"status": "error", "message": str(e)}


if __name__ == "__main__":
    agent = KlingAgent()
    result = agent.generate_video(
        prompt="An AI developer coding on a futuristic computer, clean tech aesthetic, 9:16 vertical",
        aspect_ratio="9:16",
        duration=5,
    )
    print(json.dumps(result, indent=2, ensure_ascii=False, default=str))
