Option Explicit

Dim oShell, oFS, sDir
Set oShell = CreateObject("WScript.Shell")
Set oFS   = CreateObject("Scripting.FileSystemObject")
sDir = oFS.GetParentFolderName(WScript.ScriptFullName)

' ── run_sage.ps1 の存在確認 ──────────────────────────────
If Not oFS.FileExists(sDir & "\run_sage.ps1") Then
  MsgBox "run_sage.ps1 が見つかりません。" & vbCrLf & sDir, 16, "Sage"
  WScript.Quit 1
End If

' ── 既存プロセスを停止 ────────────────────────────────────
' (run_sage.ps1 内でも処理されるが念のため)
oShell.Run "cmd /c taskkill /F /IM python.exe >nul 2>&1", 0, True
oShell.Run "cmd /c taskkill /F /IM ngrok.exe >nul 2>&1", 0, True
oShell.Run "cmd /c for /f ""tokens=5"" %a in ('netstat -ano ^| findstr :5173') do taskkill /PID %a /F >nul 2>&1", 0, True

' ── PowerShellで run_sage.ps1 をバックグラウンド起動 ───────
' ExecutionPolicy Bypass で署名なしスクリプトも実行可能にする
Dim psCmd
psCmd = "powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -File """ & sDir & "\run_sage.ps1"""
oShell.Run psCmd, 0, False

' ── サーバー起動待ち (Vite: 5173, Flask: 8080) ─────────────
Dim oHTTP, viteOK, i
viteOK = False
For i = 1 To 25
  WScript.Sleep 2000
  Set oHTTP = CreateObject("MSXML2.XMLHTTP")
  On Error Resume Next
  oHTTP.Open "GET", "http://localhost:5173", False
  oHTTP.Send
  If Err.Number = 0 Then
    If oHTTP.Status >= 200 And oHTTP.Status < 500 Then
      viteOK = True
    End If
  End If
  Err.Clear
  On Error GoTo 0
  If viteOK Then Exit For
Next

' ── ブラウザを開く ────────────────────────────────────────
oShell.Run "http://localhost:5173"
