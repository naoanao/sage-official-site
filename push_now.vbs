Dim wsh, fso
Set wsh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

Dim outFile
outFile = "C:\Users\nao\Desktop\Sage_Final_Unified\push_result2.txt"

' Delete old result file
If fso.FileExists(outFile) Then fso.DeleteFile outFile

' Run git push with output captured
wsh.Run "cmd /c cd /d C:\Users\nao\Desktop\Sage_Final_Unified && git push origin main > """ & outFile & """ 2>&1", 0, True

' Show result
If fso.FileExists(outFile) Then
    Dim ts
    Set ts = fso.OpenTextFile(outFile, 1)
    Dim content
    content = ts.ReadAll
    ts.Close
    MsgBox content, 0, "Git Push Result"
Else
    MsgBox "No output file created", 0, "Error"
End If
