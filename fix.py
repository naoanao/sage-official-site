import re

with open('SAGE_MASTER_CONTEXT.md', 'r', encoding='utf-8') as f:
    text = f.read()

# The text contains some messed up lines around kling_agent, fish_audio_integration, voicevox, etc.
# We will find the section between "### 🎵 視聴覚・音楽生成系自律アセット" and "### 📄 ドキュメント・eBook自律生成＆ナレッジ構築系" and rewrite it entirely.

start_marker = "### 🎵 視聴覚・音楽生成系自律アセット"
end_marker = "### 📄 ドキュメント・eBook自律生成＆ナレッジ構築系"

start_idx = text.find(start_marker)
end_idx = text.find(end_marker)

if start_idx != -1 and end_idx != -1:
    new_section = f'''{start_marker}
*   **無料クラウド動画生成 (kling_agent.py)**: Kling APIから移行し、HuggingFaceの **LTX-Video** (Lightricks/LTX-Video-0.9.8-13B-distilled) 等を無料かつ無制限に活用。9:16縦型（512x912）に自動最適化。
*   **自律BGM作曲 (suno_agent.py)**: HuggingFaceの **MusicGen** (acebook/musicgen-stereo-medium) に移行し、トピック（lo-fi, synthwave等）からBGMを自動作曲。
*   **本人音声クローン TTS (ish_audio_integration.py)**: Fish Audio API を介し、ナオさん本人の短いリファレンス音声（WAV/MP3）から本人の声質を100%クローンしたナレーション（MP3）を一括生成。
*   **VoiceVox ローカル音声合成 (oicevox_agent.py)**: 外部APIに依存せず、ローカルのVoiceVoxエンジンを使用して高品質な日本語音声を自律生成。
*   **Edge TTS 音声合成 (edge_tts_agent.py)**: Microsoft EdgeのTTS APIを活用し、無料で制限のない多言語音声合成を実行。
*   **LangGraph AIオーケストレーター (langgraph_orchestrator.py)**: 複数のAIエージェントのワークフローをLangGraphを用いて連携・制御。イースターエッグ（合言葉でLLM推論をスキップする機能）を内包。
*   **Chromeセッション自動抽出 (extract_chrome_cookies.py)**: ローカルのChromeブラウザからCookieとセッション情報を自律的に抽出し、APIを使わずにログイン必須の外部サービスへのアクセスを突破。

'''
    
    text = text[:start_idx] + new_section + text[end_idx:]

with open('SAGE_MASTER_CONTEXT.md', 'w', encoding='utf-8') as f:
    f.write(text)
