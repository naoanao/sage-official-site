Set WshShell = CreateObject("WScript.Shell")
Dim repo
repo = "C:\Users\nao\Desktop\Sage_Final_Unified"

' Make empty commit to retrigger Vercel webhook for f782f84 fix
WshShell.Run "cmd /c cd /d """ & repo & """ && git commit --allow-empty -m ""chore: trigger Vercel build for marketing null bytes fix"" > trigger_result.txt 2>&1", 0, True
WshShell.Run "cmd /c cd /d """ & repo & """ && git push origin main >> trigger_result.txt 2>&1", 0, True

MsgBox "Done! Check trigger_result.txt for details.", 64, "Vercel Trigger"
