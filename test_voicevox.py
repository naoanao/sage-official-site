import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from backend.integrations.voicevox_agent import is_voicevox_running, generate_narration

print("=== VOICEVOX 動作テスト ===")
print(f"VOICEVOX起動確認: {is_voicevox_running()}")

if not is_voicevox_running():
    print("ERROR: VOICEVOXが起動していません。アプリを起動してください。")
    sys.exit(1)

print("音声生成テスト中...")
result = generate_narration("こんにちは、Sageです。AIで自動投稿しています。", speaker_id=1)
print(f"結果: {result['status']}")

if result["status"] == "success":
    print(f"WAVファイル: {result['local_path']}")
    print(f"音声長さ: {round(result['duration_sec'], 2)} 秒")
    print("")
    print("SUCCESS: VOICEVOXナレーション正常動作")
else:
    print(f"ERROR: {result.get('error')}")
    sys.exit(1)
