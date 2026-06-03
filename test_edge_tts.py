import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from backend.integrations.edge_tts_agent import is_edge_tts_available, generate_narration_en

print("=== Edge TTS Test ===")
print(f"Edge TTS available: {is_edge_tts_available()}")

if not is_edge_tts_available():
    print("ERROR: edge-tts not installed. Run: pip install edge-tts")
    sys.exit(1)

# 英語テスト
print("\n[English]")
result_en = generate_narration_en(
    "Hello, this is Sage AI. We automate your social media with artificial intelligence.",
    language="en"
)
print(f"Status: {result_en['status']}")
if result_en["status"] == "success":
    print(f"File: {result_en['local_path']}")
    print(f"Duration: {round(result_en['duration_sec'], 2)} sec")
    print(f"Voice: {result_en['voice']}")
    print("SUCCESS: English narration OK")
else:
    print(f"ERROR: {result_en.get('error')}")
    sys.exit(1)

# 日本語テスト (Edge TTSの日本語音声)
print("\n[Japanese via Edge TTS]")
result_ja = generate_narration_en(
    "こんにちは、Sage AIです。SNSを自動化します。",
    language="ja"
)
print(f"Status: {result_ja['status']}")
if result_ja["status"] == "success":
    print(f"File: {result_ja['local_path']}")
    print(f"Duration: {round(result_ja['duration_sec'], 2)} sec")
    print(f"Voice: {result_ja['voice']}")
    print("SUCCESS: Japanese (Edge TTS) narration OK")
else:
    print(f"ERROR: {result_ja.get('error')}")
