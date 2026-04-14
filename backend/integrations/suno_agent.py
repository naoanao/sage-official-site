"""
SunoAgent v1.0 — AI音楽生成（BGM自動生成）
Phase 2: 動画パイプライン

Suno AIはブログ記事・SNS投稿のテーマに合ったBGMを自動生成する。
公式APIは非公開のため、AIML API（aimlapi.com）経由で呼び出す。

HEARTBEAT: ブログ記事生成後、動画パイプラインから呼び出される
用途: ブログ記事 → 台本 → BGM(Suno) → 画像(FLUX) → 動画(Kling) → Reels投稿
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

AIML_API_BASE = "https://api.aimlapi.com/v2"


class SunoAgent:
    """
    Suno AI経由のBGM自動生成エージェント。
    ブログ記事のトピック・ニッチから音楽スタイルを判定し、
    30〜60秒のBGMを生成してCloudflare R2またはローカルに保存する。
    """

    STYLE_MAP = {
        "developer": "ambient electronic, lo-fi coding music, 80bpm",
        "ai automation": "futuristic electronic, synthwave, 90bpm",
        "solopreneur": "upbeat acoustic, motivational, 100bpm",
        "passive income": "chill lofi, relaxed, 75bpm",
        "fitness": "energetic EDM, pump-up beat, 128bpm",
        "finance": "corporate jazz, professional, 85bpm",
        "default": "calm ambient, neutral, 80bpm",
    }

    def __init__(self):
        self.api_key = os.getenv("AIML_API_KEY", "")
        self.output_dir = Path(os.getcwd()) / "generated_audios"
        self.output_dir.mkdir(exist_ok=True)
        self.dry_run = os.getenv("SAGE_DRY_RUN", "false").lower() == "true"

        if self.api_key:
            logger.info("✅ SunoAgent initialized via AIML API")
        else:
            logger.warning("SunoAgent: AIML_API_KEY not set — will use dry_run mode")

    def _detect_style(self, niche: str, topic: str) -> str:
        """ニッチとトピックから音楽スタイルを自動判定"""
        combined = f"{niche} {topic}".lower()
        for keyword, style in self.STYLE_MAP.items():
            if keyword in combined:
                return style
        return self.STYLE_MAP["default"]

    def _build_lyrics_prompt(self, topic: str, niche: str) -> str:
        """トピックから歌詞プロンプトを生成（インストゥルメンタルも可）"""
        return f"Instrumental background music for content about: {topic}. Genre: {niche}. No vocals."

    def generate_bgm(self, topic: str, niche: str = "", duration_seconds: int = 30) -> dict:
        """
        トピックに合ったBGMを生成する。

        Args:
            topic: コンテンツのトピック（例: "AI automation for developers"）
            niche: identity.jsonのniche値
            duration_seconds: 目標の長さ（秒）

        Returns:
            {"status": "success", "audio_url": "...", "local_path": "...", "style": "..."}
        """
        style = self._detect_style(niche, topic)
        prompt = self._build_lyrics_prompt(topic, niche)

        if self.dry_run or not self.api_key:
            logger.info(f"[Suno][DRY_RUN] Would generate BGM: style={style} topic={topic[:50]}")
            return {
                "status": "dry_run",
                "style": style,
                "prompt": prompt,
                "audio_url": None,
                "local_path": None,
            }

        try:
            # AIML API経由でSunoを呼び出す
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            }
            payload = {
                "model": "suno-v4",  # または "suno-v3.5"
                "prompt": prompt,
                "tags": style,
                "title": f"BGM: {topic[:50]}",
                "make_instrumental": True,
                "duration": duration_seconds,
            }

            resp = requests.post(
                f"{AIML_API_BASE}/generate/audio",
                headers=headers,
                json=payload,
                timeout=30,
            )
            resp.raise_for_status()
            data = resp.json()

            # ジョブIDを取得してポーリング
            job_id = data.get("id") or data.get("generation_id")
            if not job_id:
                logger.error(f"[Suno] No job_id in response: {data}")
                return {"status": "error", "message": "No job_id returned"}

            # 最大90秒待機
            audio_url = self._poll_result(job_id, headers, max_wait=90)
            if not audio_url:
                return {"status": "error", "message": "Generation timed out"}

            # ローカルに保存
            local_path = self._download_audio(audio_url, topic)

            logger.info(f"[Suno] ✅ BGM generated: {local_path}")
            return {
                "status": "success",
                "style": style,
                "audio_url": audio_url,
                "local_path": str(local_path) if local_path else None,
                "topic": topic,
            }

        except requests.exceptions.HTTPError as e:
            logger.error(f"[Suno] HTTP error: {e} — {e.response.text[:200] if e.response else ''}")
            return {"status": "error", "message": str(e)}
        except Exception as e:
            logger.error(f"[Suno] Generation failed: {e}")
            return {"status": "error", "message": str(e)}

    def _poll_result(self, job_id: str, headers: dict, max_wait: int = 90) -> str | None:
        """生成完了をポーリングして音声URLを返す"""
        for _ in range(max_wait // 5):
            try:
                resp = requests.get(
                    f"{AIML_API_BASE}/generate/audio/{job_id}",
                    headers=headers,
                    timeout=10,
                )
                data = resp.json()
                status = data.get("status", "")

                if status in ("complete", "completed", "done"):
                    # URLの取得パターンに対応
                    return (
                        data.get("audio_url")
                        or data.get("output", {}).get("audio_url")
                        or (data.get("clips", [{}])[0].get("audio_url") if data.get("clips") else None)
                    )
                elif status in ("failed", "error"):
                    logger.error(f"[Suno] Generation failed: {data}")
                    return None

                time.sleep(5)
            except Exception as e:
                logger.warning(f"[Suno] Poll error: {e}")
                time.sleep(5)
        return None

    def _download_audio(self, url: str, topic: str) -> Path | None:
        """音声ファイルをローカルに保存"""
        try:
            slug = topic.lower().replace(" ", "_")[:30]
            filename = f"bgm_{slug}_{int(time.time())}.mp3"
            path = self.output_dir / filename
            resp = requests.get(url, timeout=30)
            resp.raise_for_status()
            path.write_bytes(resp.content)
            return path
        except Exception as e:
            logger.error(f"[Suno] Download failed: {e}")
            return None


if __name__ == "__main__":
    agent = SunoAgent()
    result = agent.generate_bgm(
        topic="How to build autonomous AI systems",
        niche="autonomous AI systems for developers",
    )
    print(json.dumps(result, indent=2, ensure_ascii=False, default=str))
