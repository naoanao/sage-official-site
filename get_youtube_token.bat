@echo off
cd /d %~dp0
echo === YouTube OAuth2 Token Setup ===
pip install google-auth-oauthlib --quiet
python get_youtube_token.py
pause
