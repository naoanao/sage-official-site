# test_video_quality.py -- Video quality test script
# Usage:
#   cd C:/Users/nao/Desktop/Sage_Final_Unified
#   python test_video_quality.py
#
# Options:
#   --no-narration   Skip narration (if VOICEVOX is not running)
#   --no-bgm         Skip BGM (if HuggingFace API is not available)
#   --simple         Simplest mode, no effects (fastest)

import sys
import os
import logging
import argparse

# .env を自動ロード（CMD から直接実行した場合でも API キーを使えるようにする）
try:
    from dotenv import load_dotenv
    _env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    load_dotenv(_env_path, override=False)
except ImportError:
    pass

# ログ設定
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s"
)

sys.path.insert(0, '.')

def main():
    parser = argparse.ArgumentParser(description="Sage AI 動画品質テスト v3")
    parser.add_argument("--no-narration", action="store_true", help="ナレーションなし")
    parser.add_argument("--no-bgm",       action="store_true", help="BGMなし")
    parser.add_argument("--no-ken-burns", action="store_true", help="Kenバーンズ効果なし")
    parser.add_argument("--no-fadein",    action="store_true", help="テキストフェードインなし")
    parser.add_argument("--simple",       action="store_true", help="すべてのエフェクトなし（最速）")
    parser.add_argument("--v3",           action="store_true", help="v3.0全機能（AIディレクター+フック+キネティック+クロスフェード）")
    parser.add_argument("--video-bg",     action="store_true", help="Pexels動画背景（--v3と併用）")
    parser.add_argument("--open",         action="store_true", default=True, help="生成後に自動で動画を開く")
    parser.add_argument("--no-open",      action="store_true", help="生成後に自動で動画を開かない")
    args = parser.parse_args()

    enable_narration   = not args.no_narration and not args.simple
    enable_bgm         = not args.no_bgm       and not args.simple
    enable_ken_burns   = not args.no_ken_burns  and not args.simple
    enable_text_fadein = not args.no_fadein     and not args.simple
    enable_v3          = args.v3
    enable_video_bg    = args.video_bg
    auto_open          = args.open and not args.no_open

    mode = "v3.0 (プロクオリティ)" if enable_v3 else "v2"
    print("=" * 60)
    print(f"  Sage AI 動画品質テスト [{mode}]")
    print("=" * 60)
    print(f"  ナレーション  : {'ON  (VOICEVOX)' if enable_narration else 'OFF'}")
    print(f"  BGM          : {'ON  (HF MusicGen)' if enable_bgm else 'OFF'}")
    if enable_v3:
        print(f"  AIディレクター: ON (Groq)")
        print(f"  フックスライド: ON")
        print(f"  キネティック  : ON (単語ポップイン)")
        print(f"  クロスフェード: ON")
        print(f"  動画背景      : {'ON (Pexels Video)' if enable_video_bg else 'OFF (静止画)'}")
    else:
        print(f"  Kenバーンズ   : {'ON' if enable_ken_burns else 'OFF'}")
        print(f"  テキストFade  : {'ON' if enable_text_fadein else 'OFF'}")
    print()

    try:
        from backend.integrations.video_generator import generate_sns_short_video
    except ImportError as e:
        print(f"[ERROR] video_generator のインポートに失敗: {e}")
        print("  → カレントディレクトリが Sage_Final_Unified であることを確認してください")
        sys.exit(1)

    print("[INFO] 動画生成を開始します...")
    print()

    video_path = generate_sns_short_video(
        title='AIで副業を始める3ステップ',
        slides=[
            'Step1: AIツールで作業を自動化',
            'Step2: コンテンツを毎日自動生成',
            'Step3: 収益化の仕組みを構築',
            'ソロ開発者でも月10万円達成',
            'まずは今日1つだけ自動化してみよう',
        ],
        cta_text='チャンネル登録で最新情報をゲット',
        enable_narration=enable_narration,
        narration_language='ja',
        enable_bgm=enable_bgm,
        enable_ken_burns=enable_ken_burns,
        enable_text_fadein=enable_text_fadein,
        # v3.0
        enable_v3=enable_v3,
        enable_video_bg=enable_video_bg,
    )

    print()
    print("=" * 60)
    if video_path and os.path.exists(video_path):
        size_mb = os.path.getsize(video_path) / (1024 * 1024)
        print(f"  ✅ 動画生成成功!")
        print(f"  パス: {video_path}")
        print(f"  サイズ: {size_mb:.2f} MB")
        print("=" * 60)

        if auto_open:
            print()
            print("[INFO] 動画を開いています...")
            import subprocess
            try:
                # Windows: start コマンドで関連付けアプリ（メディアプレーヤー等）で開く
                subprocess.Popen(['start', '', video_path], shell=True)
                print("[INFO] ✅ 動画を開きました。目視で品質を確認してください。")
            except Exception as e:
                print(f"[WARN] 自動オープンに失敗: {e}")
                print(f"  → 手動でこのパスを開いてください: {video_path}")
    else:
        print(f"  ❌ 動画生成に失敗しました")
        print(f"  返り値: {video_path}")
        print("=" * 60)
        sys.exit(1)

    print()
    print("【確認ポイント】")
    print("  □ 文字が正しく表示されている（文字化けなし）")
    print("  □ スライドが正しい順序で切り替わる")
    print("  □ 動画が縦型 (9:16) になっている")
    if enable_v3:
        print("  □ [v3] 最初にフックスライド（大きな文字・高コントラスト）が表示される")
        print("  □ [v3] 単語ごとにポップインするキネティックテキストが動いている")
        print("  □ [v3] スライド切り替えにクロスフェードがかかっている")
        print("  □ [v3] アクセントカラーがAI指定のカラーテーマになっている")
        if enable_video_bg:
            print("  □ [v3] 背景が動画になっている")
    else:
        print("  □ テキストがフェードインしている")
        print("  □ ズームイン（Kenバーンズ）が動いている")
    if enable_bgm:
        print("  □ BGMが流れている")
    if enable_narration:
        print("  □ ナレーション音声が流れている")
    print()


if __name__ == "__main__":
    main()
