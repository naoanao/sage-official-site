@echo off
cd /d %~dp0
echo === Edge TTS Test ===
pip install edge-tts mutagen --quiet
python test_edge_tts.py
pause
