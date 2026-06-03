Dim wsh, fso
Set wsh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

Dim outFile
outFile = "C:\Users\nao\Desktop\Sage_Final_Unified\push_growl_result.txt"

If fso.FileExists(outFile) Then fso.DeleteFile outFile

' Push to growl remote
wsh.Run "cmd /c cd /d C:\Users\nao\Desktop\Sage_Final_Unified && git push growl main > """ & outFile & """ 2>&1", 0, True

If fso.FileExists(outFile) Then
    Dim ts
    Set ts = fso.OpenTextFile(outFile, 1)
    Dim content
    content = ts.ReadAll
    ts.Close
    MsgBox content, 0, "Git Push Growl Result"
Else
    MsgBox "No output file created", 0, "Error"
End If
