@echo off
cd /d "C:\Users\nao\Desktop\Sage_Final_Unified"
echo === git push 開始 === > git_push_log.txt 2>&1
git push origin main >> git_push_log.txt 2>&1
echo === 終了コード: %ERRORLEVEL% === >> git_push_log.txt 2>&1
echo 完了。git_push_log.txt を確認してください。
pause
