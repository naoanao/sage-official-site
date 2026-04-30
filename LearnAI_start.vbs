Option Explicit

Dim oShell, oFS, sDir, oHTTP, serverOK, i, pyCmd, logPath, serverScript
Set oShell = CreateObject("WScript.Shell")
Set oFS = CreateObject("Scripting.FileSystemObject")
sDir = oFS.GetParentFolderName(WScript.ScriptFullName)

If oFS.FileExists(sDir & "\server.py") Then
  serverScript = "server.py"
ElseIf oFS.FileExists(sDir & "\server-2.py") Then
  serverScript = "server-2.py"
Else
  MsgBox "server.py / server-2.py が見つかりません。", 16, "LearnAI"
  WScript.Quit 1
End If

oShell.Run "cmd /c for /f ""tokens=5"" %a in ('netstat -ano ^| findstr :8000') do taskkill /PID %a /F >nul 2>&1", 0, True

logPath = sDir & "\learnai_server.log"
serverOK = False

Dim tryCmds
tryCmds = Array("py", "python", "python3")

For i = 0 To UBound(tryCmds)
  pyCmd = tryCmds(i)
  If oShell.Run("cmd /c " & pyCmd & " --version >nul 2>&1", 0, True) = 0 Then
    oShell.Run "cmd /c cd /d """ & sDir & """ && " & pyCmd & " """ & serverScript & """ > """ & logPath & """ 2>&1", 0, False
    WScript.Sleep 3500

    Set oHTTP = CreateObject("MSXML2.XMLHTTP")
    On Error Resume Next
    oHTTP.Open "GET", "http://localhost:8000/LearnAI.html", False
    oHTTP.Send
    If Err.Number = 0 Then
      If oHTTP.Status = 200 Then serverOK = True
    End If
    Err.Clear
    On Error GoTo 0

    If serverOK Then Exit For
  End If
Next

If serverOK Then
  oShell.Run "http://localhost:8000/LearnAI.html"
Else
  oShell.Run """" & sDir & "\LearnAI.html"""
End If
