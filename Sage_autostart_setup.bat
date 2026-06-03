@echo off
:: Sage 3.0 自動起動セットアップ
:: このファイルを一回だけ実行すると、Windows起動時にSageが自動スタートします

set SAGE_DIR=%~dp0
set TASK_NAME=Sage3_AutoStart

echo Sageの自動起動を設定中...

:: 既存タスクを削除（再登録のため）
schtasks /delete /tn "%TASK_NAME%" /f >nul 2>&1

:: ログイン時に自動実行するタスクを登録
schtasks /create /tn "%TASK_NAME%" ^
  /tr "wscript.exe //nologo \"%SAGE_DIR%Sage_start.vbs\"" ^
  /sc onlogon ^
  /delay 0001:00 ^
  /rl highest ^
  /f

if %errorlevel% == 0 (
  echo.
  echo ✅ 設定完了！
  echo 次回Windowsにログインしたとき、Sageが自動で起動します。
  echo.
  echo 確認: タスクスケジューラ → %TASK_NAME%
) else (
  echo.
  echo ❌ 設定に失敗しました。管理者として実行してください。
  echo 右クリック → 管理者として実行
)

pause
