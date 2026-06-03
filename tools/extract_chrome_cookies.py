"""
Chrome v127+ Cookie Extractor for Proxima
v20暗号化（App-Bound Encryption）対応版
"""
import os, json, sqlite3, base64, struct, ctypes
from pathlib import Path

# Chrome v127+ はApp-Bound Encryptionを使用
# キーは DPAPI ではなく Chrome の内部API経由で暗号化されている
# 回避策: Chrome DevTools Protocol (CDP) 経由でCookieを取得する

def get_cookies_via_cdp():
    """Chrome をリモートデバッグモードで起動してCookieを取得"""
    import subprocess, time, socket, urllib.request
    
    chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
    debug_port = 9222
    
    # リモートデバッグで起動（既存Chromeが閉じている必要あり）
    proc = subprocess.Popen([
        chrome_path,
        f"--remote-debugging-port={debug_port}",
        "--no-first-run",
        "--no-default-browser-check",
        "--user-data-dir=" + os.environ["LOCALAPPDATA"] + r"\Google\Chrome\User Data",
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    time.sleep(3)  # 起動待ち
    
    try:
        # CDP経由でCookieを取得
        import websocket, json as _json
        
        # /json/list でターゲット一覧取得
        resp = urllib.request.urlopen(f"http://localhost:{debug_port}/json/list", timeout=5)
        targets = _json.loads(resp.read())
        
        if not targets:
            # 新しいタブを開く
            urllib.request.urlopen(f"http://localhost:{debug_port}/json/new", timeout=5)
            time.sleep(1)
            resp = urllib.request.urlopen(f"http://localhost:{debug_port}/json/list", timeout=5)
            targets = _json.loads(resp.read())
        
        ws_url = targets[0]["webSocketDebuggerUrl"]
        
        ws = websocket.create_connection(ws_url, timeout=10)
        ws.send(_json.dumps({"id": 1, "method": "Network.getAllCookies"}))
        result = _json.loads(ws.recv())
        ws.close()
        
        return result.get("result", {}).get("cookies", [])
    finally:
        pass  # ChromeはそのままにしてOK

def simple_v20_decrypt(encrypted_value, app_bound_key):
    """v20暗号化の復号（App-Bound Encryptionキー使用）"""
    from Crypto.Cipher import AES
    # v20フォーマット: b'v20' + nonce(12) + ciphertext + tag(16)
    if encrypted_value[:3] != b'v20':
        return None
    nonce = encrypted_value[3:15]
    ciphertext = encrypted_value[15:-16]
    tag = encrypted_value[-16:]
    try:
        return AES.new(app_bound_key, AES.MODE_GCM, nonce=nonce).decrypt_and_verify(ciphertext, tag).decode('utf-8', errors='replace')
    except:
        return None

def cookies_to_proxima_format(cookies, domains):
    """Proximaが期待するJSON形式に変換"""
    results = {}
    domain_map = {
        "claude.ai": "Claude",
        "chatgpt.com": "ChatGPT", 
        "perplexity.ai": "Perplexity",
        "gemini.google.com": "Gemini",
    }
    
    for service, label in domain_map.items():
        service_cookies = [
            {
                "name": c["name"],
                "value": c["value"],
                "domain": c["domain"],
                "path": c["path"],
                "secure": c.get("secure", False),
                "httpOnly": c.get("httpOnly", False),
                "sameSite": c.get("sameSite", "no_restriction").lower().replace(" ", "_"),
            }
            for c in cookies
            if service in c.get("domain", "")
        ]
        results[label] = service_cookies
    return results

if __name__ == "__main__":
    print("Chrome DevTools Protocol (CDP) 経由でCookieを取得します...")
    print("Chromeが起動します（リモートデバッグモード）\n")
    
    try:
        import websocket
    except ImportError:
        print("websocket-clientをインストール中...")
        import subprocess
        subprocess.run(["pip", "install", "websocket-client", "-q"])
        import websocket
    
    # Chromeを閉じてからデバッグモードで再起動
    import subprocess, time
    subprocess.run(["taskkill", "/F", "/IM", "chrome.exe"], capture_output=True)
    time.sleep(2)
    
    all_cookies = get_cookies_via_cdp()
    print(f"取得したCookie総数: {len(all_cookies)}")
    
    # サービス別に分類
    results = cookies_to_proxima_format(all_cookies, ["claude.ai", "chatgpt.com", "perplexity.ai", "gemini.google.com"])
    
    out_dir = Path(os.environ["TEMP"]) / "proxima_cookies"
    out_dir.mkdir(exist_ok=True)
    
    for label, cookies in results.items():
        if not cookies:
            print(f"❌ {label}: 0件（Chromeでログインしていますか？）")
            continue
        out_file = out_dir / f"{label}.json"
        with open(out_file, "w", encoding="utf-8") as f:
            json.dump(cookies, f, ensure_ascii=False, indent=2)
        print(f"✅ {label}: {len(cookies)}件 → {out_file}")
    
    # Claudeをクリップボードにコピー
    claude_file = out_dir / "Claude.json"
    if claude_file.exists() and (out_dir / "Claude.json").stat().st_size > 10:
        subprocess.run(["powershell", "-command", f"Get-Content '{claude_file}' -Raw | Set-Clipboard"], capture_output=True)
        print("\n📋 ClaudeのCookieをクリップボードにコピーしました！")
        print("   Proxima → Claude タブ → Cookie Login → Ctrl+V → Login with Cookies")
    
    # ChatGPTもコピー
    gpt_file = out_dir / "ChatGPT.json"
    if gpt_file.exists() and gpt_file.stat().st_size > 10:
        print(f"\n💡 ChatGPTのJSONも保存済み: {gpt_file}")
    
    print(f"\n📁 全ファイル保存先: {out_dir}")
    subprocess.Popen([r"C:\Program Files\Google\Chrome\Application\chrome.exe"])
    print("✅ Chromeを通常モードで再起動しました")
