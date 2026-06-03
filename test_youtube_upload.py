"""
YouTube Shorts パイプライン エンドツーエンドテスト
================================================
実行: python test_youtube_upload.py

テスト内容:
  1. .env 読み込み確認
  2. OAuth アクセストークン取得
  3. ミニ動画生成 (3秒, 縦型 1080x1920)
  4. YouTube Shorts アップロード (unlisted)
  5. アップロードURL確認

成功すれば本番パイプラインも動作可能。
"""

import sys, os, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

print("=" * 55)
print("  YouTube Shorts パイプライン テスト")
print("=" * 55)

# ─── Step 1: .env 読み込み ─────────────────────────────
print("\n[Step 1] .env 読み込み...")
try:
    from dotenv import dotenv_values
    env = dotenv_values(".env")
except Exception:
    env = {}

client_id     = env.get("YOUTUBE_CLIENT_ID") or os.getenv("YOUTUBE_CLIENT_ID", "")
client_secret = env.get("YOUTUBE_CLIENT_SECRET") or os.getenv("YOUTUBE_CLIENT_SECRET", "")
refresh_token = env.get("YOUTUBE_REFRESH_TOKEN") or os.getenv("YOUTUBE_REFRESH_TOKEN", "")

ok = all([client_id, client_secret, refresh_token])
print(f"  CLIENT_ID     : {'✅' if client_id     else '❌'} {client_id[:30] if client_id else 'MISSING'}...")
print(f"  CLIENT_SECRET : {'✅' if client_secret else '❌'} {client_secret[:10] if client_secret else 'MISSING'}...")
print(f"  REFRESH_TOKEN : {'✅' if refresh_token else '❌'} {refresh_token[:20] if refresh_token else 'MISSING'}...")
if not ok:
    print("\n❌ .env に YouTube 認証情報がありません。中断します。")
    sys.exit(1)

# ─── Step 2: OAuth トークン ────────────────────────────
print("\n[Step 2] OAuth アクセストークン取得...")
import requests
resp = requests.post("https://oauth2.googleapis.com/token", data={
    "client_id": client_id,
    "client_secret": client_secret,
    "refresh_token": refresh_token,
    "grant_type": "refresh_token",
}, timeout=15)
data = resp.json()
if "access_token" not in data:
    print(f"❌ 失敗: {data}")
    sys.exit(1)
access_token = data["access_token"]
print(f"  ✅ トークン取得 (有効期限: {data.get('expires_in', '?')}秒)")

# ─── Step 3: テスト動画生成 ───────────────────────────
print("\n[Step 3] テスト動画生成 (3秒, 1080x1920)...")
try:
    from PIL import Image, ImageDraw
    import numpy as np

    w, h = 1080, 1920
    frames = []
    for i in range(90):  # 3秒 @ 30fps
        img = Image.new("RGB", (w, h), (15, 15, 50))
        draw = ImageDraw.Draw(img)
        for y in range(0, h, 8):
            c = int(30 + 80 * (1 - y / h))
            draw.rectangle([(0, y), (w, y + 8)], fill=(c // 4, c // 4, c))
        draw.rectangle([(60, 640), (w - 60, 1200)], fill=(0, 0, 0))
        draw.text((w // 2, 760),  "Sage AI System",         fill=(255, 215, 0),   anchor="mm")
        draw.text((w // 2, 880),  "YouTube Shorts",         fill=(255, 255, 255), anchor="mm")
        draw.text((w // 2, 970),  "自動投稿テスト",          fill=(200, 200, 255), anchor="mm")
        draw.text((w // 2, 1060), f"frame {i:03d}",         fill=(120, 120, 120), anchor="mm")
        draw.text((w // 2, 1150), "#Shorts #AI #automation",fill=(100, 200, 255), anchor="mm")
        frames.append(np.array(img))

    try:
        from moviepy.editor import ImageSequenceClip  # moviepy v1
    except ImportError:
        from moviepy import ImageSequenceClip          # moviepy v2

    import tempfile
    tmp = tempfile.NamedTemporaryFile(suffix=".mp4", delete=False)
    video_path = tmp.name
    tmp.close()

    clip = ImageSequenceClip(frames, fps=30)
    # moviepy v1 / v2 両対応
    try:
        clip.write_videofile(video_path, fps=30, codec="libx264", audio=False, verbose=False, logger=None)
    except TypeError:
        clip.write_videofile(video_path, fps=30, codec="libx264", audio=False)

    file_size = os.path.getsize(video_path)
    print(f"  ✅ 動画生成: {video_path}")
    print(f"     サイズ: {file_size // 1024} KB")

except Exception as e:
    print(f"  ❌ 動画生成失敗: {e}")
    sys.exit(1)

# ─── Step 4: YouTube Shorts アップロード ──────────────
print("\n[Step 4] YouTube Shorts アップロード...")

body = {
    "snippet": {
        "title": "【Sage AI テスト】YouTube Shorts 自動投稿 #Shorts",
        "description": (
            "Sage AIシステムによる自動投稿テストです。\n\n"
            "このVideoはテスト後に削除されます。\n\n"
            "#Shorts #AI #automation #自動化 #SageAI"
        ),
        "tags": ["Shorts", "AI", "automation", "SageAI", "テスト"],
        "categoryId": "27",
    },
    "status": {
        "privacyStatus": "unlisted",   # テストなのでunlisted
        "selfDeclaredMadeForKids": False,
        "notifySubscribers": False,
    },
}

headers = {
    "Authorization": f"Bearer {access_token}",
    "X-Upload-Content-Type": "video/mp4",
    "X-Upload-Content-Length": str(file_size),
}

init_resp = requests.post(
    "https://www.googleapis.com/upload/youtube/v3/videos"
    "?uploadType=resumable&part=snippet,status",
    headers=headers, json=body, timeout=30
)
if init_resp.status_code not in (200, 201):
    print(f"  ❌ 初期化失敗 ({init_resp.status_code}): {init_resp.text[:300]}")
    sys.exit(1)

upload_url = init_resp.headers.get("Location")
print(f"  📤 アップロードURL取得 ✅")

with open(video_path, "rb") as f:
    up_resp = requests.put(
        upload_url,
        data=f,
        headers={"Content-Type": "video/mp4", "Content-Length": str(file_size)},
        timeout=120,
    )

result = up_resp.json() if up_resp.content else {}

if up_resp.status_code in (200, 201) and "id" in result:
    vid_id = result["id"]
    url = f"https://www.youtube.com/shorts/{vid_id}"
    print(f"\n  ✅✅ アップロード成功!")
    print(f"  Video ID : {vid_id}")
    print(f"  URL      : {url}")
    print(f"  Status   : unlisted (本番はpublic)")
else:
    print(f"  ❌ アップロード失敗 ({up_resp.status_code})")
    import json
    print(json.dumps(result, indent=2, ensure_ascii=False)[:500])
    sys.exit(1)

# クリーンアップ
os.unlink(video_path)

# ─── 完了 ──────────────────────────────────────────────
print("\n" + "=" * 55)
print("  ✅ 全テスト通過！本番パイプライン稼働可能。")
print("=" * 55)
print(f"\n確認URL: {url}")
print("\nPress any key to exit...")
input()
