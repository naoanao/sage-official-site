Option Explicit

Dim oShell, oFS, sDir, oHTTP, serverOK, i
Set oShell = CreateObject("WScript.Shell")
Set oFS   = CreateObject("Scripting.FileSystemObject")
sDir = oFS.GetParentFolderName(WScript.ScriptFullName)

Dim appDir
appDir = sDir & "\ai-marketing-app"

If Not oFS.FolderExists(appDir) Then
  MsgBox "ai-marketing-app フォルダが見つかりません。" & vbCrLf & appDir, 16, "Growl"
  WScript.Quit 1
End If

' ── ポート 3000 の残存プロセスを終了 ──
oShell.Run "cmd /c for /f ""tokens=5"" %a in ('netstat -ano ^| findstr :3000') do taskkill /PID %a /F >nul 2>&1", 0, True

' ── npm run dev を起動（バックグラウンド） ──
oShell.Run "cmd /c cd /d """ & appDir & """ && npm run dev", 0, False

' ── 起動待ち（最大30秒）──
serverOK = False
For i = 1 To 20
  WScript.Sleep 1500
  Set oHTTP = CreateObject("MSXML2.XMLHTTP")
  On Error Resume Next
  oHTTP.Open "GET", "http://localhost:3000", False
  oHTTP.Send
  If Err.Number = 0 Then
    If oHTTP.Status >= 200 And oHTTP.Status < 500 Then
      serverOK = True
    End If
  End If
  Err.Clear
  On Error GoTo 0
  If serverOK Then Exit For
Next

' ── ブラウザを開く ──
If serverOK Then
  oShell.Run "http://localhost:3000"
Else
  ' 起動が確認できなくてもとりあえず開く
  oShell.Run "http://localhost:3000"
End If
