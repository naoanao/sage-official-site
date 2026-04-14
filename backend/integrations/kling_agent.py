"""
KlingAgent v1.0 — AI動画生成（ショート動画）
Phase 2: 動画パイプライン

Kling v2.1はREST API対応。静止画 + テキストから動画を生成する。
用途: ブログ記事 → 画像(FLUX) → 動画(Kling) → Instagram Reels投稿

Kling API: https://platform.klingai.com
代替: Seedance 1.0 Pro Fast（APIエンドポイント対応・量産向き）
"""
import os
import json
import time
import logging
import requests
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

KLING_API_BASE = "https://api.klingai.com/v1"


class KlingAgent:
    """
    Kling v2.1 REST API経由の動画生成エージェント。
    FLUX生成画像 + テキストプロンプト → 5〜10秒の動画を生成。
    Instagram Reels / TikTok向けの縦型（9:16）にも対応。
    """

    def __init__(self):
        self.api_key = os.getenv("KLING_API_KEY", "")
        self.output_dir = Path(os.getcwd()) / "generated_videos"
        self.output_dir.mkdir(exist_ok=True)
        self.dry_run = os.getenv("SAGE_DRY_RUN", "false").lower() == "true"

        if self.api_key:
            logger.info("✅ KlingAgent initialized (Kling v2.1 REST API)")
        else:
            logger.warning("KlingAgent: KLING_API_KEY not set — will use dry_run mode")

    def generate_video(
        self,
        prompt: str,
        image_url: str = None,
        duration: int = 5,
        aspect_ratio: str = "9:16",
        model: str = "kling-v2-1",
    ) -> dict:
        """
        動画を生成する。

        Args:
            prompt: 動画の説明テキスト
            image_url: スタート画像のURL（任意・あると品質が上がる）
            duration: 動画の長さ（秒）: 5 または 10
            aspect_ratio: "9:16"（縦型Reels）or "16:9"（横型）or "1:1"
            model: "kling-v2-1"（高品質）or "kling-v1-5"（高速）

        Returns:
            {"status": "success", "video_url": "...", "local_path": "..."}
        """
        if self.dry_run or not self.api_key:
            logger.info(f"[Kling][DRY_RUN] Would generate {duration}s {aspect_ratio} video: {prompt[:60]}")
            return {
                "status": "dry_run",
                "prompt": prompt,
                "duration": duration,
                "aspect_ratio": aspect_ratio,
                "video_url": None,
                "local_path": None,
            }

        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            }

            payload = {
                "model": model,
                "prompt": prompt,
                "duration": duration,
                "aspect_ratio": aspect_ratio,
                "mode": "standard",
            }

            # 画像がある場合はimage-to-videoエンドポイントを使用
            if image_url:
                payload["image_url"] = image_url
                endpoint = f"{KLING_API_BASE}/videos/image2video"
            else:
                endpoint = f"{KLING_API_BASE}/videos/text2video"

            resp = requests.post(endpoint, headers=headers, json=payload, timeout=30)
            resp.raise_for_status()
            data = resp.json()

            task_id = data.get("data", {}).get("task_id") or data.get("task_id")
            if not task_id:
                logger.error(f"[Kling] No task_id in response: {data}")
                return {"status": "error", "message": "No task_id returned"}

            # 生成完了をポーリング（最大5分）
            video_url = self._poll_result(task_id, headers, max_wait=300)
            if not video_url:
                return {"status": "error", "message": "Video generation timed out"}

            # ローカルに保存
            local_path = self._download_video(video_url, prompt)

            logger.info(f"[Kling] ✅ Video generated: {local_path}")
            return {
                "status": "success",
                "video_url": video_url,
                "local_path": str(local_path) if local_path else None,
                "duration": duration,
                "aspect_ratio": aspect_ratio,
            }

        except requests.exceptions.HTTPError as e:
            logger.error(f"[Kling] HTTP error: {e}")
            return {"status": "error", "message": str(e)}
        except Exception as e:
            logger.error(f"[Kling] Generation failed: {e}")
            return {"status": "error", "message": str(e)}

    def _poll_result(self, task_id: str, headers: dict, max_wait: int = 300) -> str | None:
        """動画生成の完了をポーリング"""
        for _ in range(max_wait // 10):
            try:
                resp = requests.get(
                    f"{KLING_API_BASE}/videos/tasks/{task_id}",
                    headers=headers,
                    timeout=10,
                )
                data = resp.json()
                task_data = data.get("data", data)
                status = task_data.get("task_status", "")

                if status in ("succeed", "completed", "done"):
                    works = task_data.get("task_result", {}).get("videos", [])
                    if works:
                        return works[0].get("url") or works[0].get("download_url")
                    return task_data.get("video_url") or task_data.get("download_url")

                elif status in ("failed", "error"):
                    logger.error(f"[Kling] Task failed: {task_data}")
                    return None

                time.sleep(10)
            except Exception as e:
                logger.warning(f"[Kling] Poll error: {e}")
                time.sleep(10)
        return None

    def _download_video(self, url: str, prompt: str) -> Path | None:
        """動画をローカルに保存"""
        try:
            slug = prompt.lower().replace(" ", "_")[:30]
            filename = f"video_{slug}_{int(time.time())}.mp4"
            path = self.output_dir / filename
            resp = requests.get(url, timeout=60, stream=True)
            resp.raise_for_status()
            with open(path, "wb") as f:
                for chunk in resp.iter_content(chunk_size=8192):
                    f.write(chunk)
            return path
        except Exception as e:
            logger.error(f"[Kling] Download failed: {e}")
            return None


if __name__ == "__main__":
    agent = KlingAgent()
    result = agent.generate_video(
        prompt="An AI robot writing code on a futuristic computer, cinematic, 4K",
        aspect_ratio="9:16",
        duration=5,
    )
    print(json.dumps(result, indent=2, ensure_ascii=False, default=str))
