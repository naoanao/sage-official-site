Set wsh = CreateObject("WScript.Shell")
wsh.Run "cmd /c ""cd /d C:\Users\nao\Desktop\Sage_Final_Unified && git push origin main > C:\Users\nao\Desktop\Sage_Final_Unified\push_result.txt 2>&1""", 0, True
MsgBox "Push complete! Check push_result.txt", 0, "Git Push"
