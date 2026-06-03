#!/usr/bin/env python3
"""
LearnAI server.py
  - ポート 8000 でファイルを配信 (python -m http.server の代替)
  - POST/GET /api/notion/*      → Notion API へ CORS プロキシ転送
  - POST     /api/sambanova/*   → SambaNova API へ CORS プロキシ転送
  - POST     /api/cerebras/*    → Cerebras API へ CORS プロキシ転送
  - POST     /api/huggingface/* → HuggingFace Inference API へ CORS プロキシ転送
  - POST     /api/proxima/*     → Proxima MCP（ask_gemini/ask_claude等）経由でAIを呼び出す
  - 使い方: python server.py
"""

import http.server
import urllib.request
import urllib.error
import json
import os
import sys
import base64
import io
import threading
import subprocess
import time
import asyncio

# ── OCR（EasyOCR）オプション機能 ────────────────────────────────────────
# 使い方: pip install easyocr
# インストールしていなくても起動可能。OCR未使用時はVision APIにフォールバック。
try:
    import easyocr
    from PIL import Image
    import numpy as np
    _ocr_engine = None
    _ocr_ready   = threading.Event()  # 初期化完了を通知するイベント
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False
    _ocr_ready = None

def _warmup_ocr():
    """サーバー起動直後にバックグラウンドでEasyOCRを初期化する"""
    global _ocr_engine
    try:
        print("  [OCR] EasyOCR バックグラウンド初期化中…")
        _ocr_engine = easyocr.Reader(['ja', 'en'], gpu=False, verbose=False)
        print("  [OCR] EasyOCR 初期化完了 ✅")
    except Exception as e:
        print(f"  [OCR] 初期化失敗: {e}")
    finally:
        _ocr_ready.set()  # 失敗しても set して待機解除

PORT = 8000

# プロキシ先の設定
PROXY_ROUTES = {
    "/api/notion/":    {
        "base": "https://api.notion.com/v1",
        "strip": "/api/notion",
        "extra_headers": {"Notion-Version": "2022-06-28"},
    },
    "/api/sambanova/": {
        "base": "https://api.sambanova.ai/v1",
        "strip": "/api/sambanova",
        "extra_headers": {},
    },
    "/api/cerebras/":  {
        "base": "https://api.cerebras.ai/v1",
        "strip": "/api/cerebras",
        "extra_headers": {},
    },
    "/api/huggingface/": {
        "base": "https://router.huggingface.co",  # OpenAI互換エンドポイント（/v1/chat/completions対応）
        "strip": "/api/huggingface",
        "extra_headers": {},
    },
    "/api/hf-check/": {
        "base": "https://huggingface.co",
        "strip": "/api/hf-check",
        "extra_headers": {},
    },
}

# ── Proxima MCP 設定 ────────────────────────────────────────────────────────
PROXIMA_MCP_PATH = r"C:\Users\nao\AppData\Local\Programs\Proxima\resources\app.asar.unpacked\src\mcp-server-v3.js"

def _call_proxima_mcp(tool_name: str, params: dict, timeout: int = 90) -> str:
    """
    Proxima の MCP サーバー（stdio）を呼び出してテキスト結果を返す。
    非同期 spawn で tools/call の応答を正しく待機する。
    失敗時は例外を raise する。
    """
    async def _run():
        proc = await asyncio.create_subprocess_exec(
            "node", PROXIMA_MCP_PATH,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        # initialize 送信
        init_msg = json.dumps({
            "jsonrpc": "2.0", "id": 1, "method": "initialize",
            "params": {
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {"name": "learnai-server", "version": "1.0"}
            }
        }) + "\n"
        proc.stdin.write(init_msg.encode())
        await proc.stdin.drain()
        # initialize 応答を待つ（最大10秒）
        try:
            init_line = await asyncio.wait_for(proc.stdout.readline(), timeout=10.0)
            json.loads(init_line)  # 応答を確認（パース失敗なら例外）
        except asyncio.TimeoutError:
            proc.kill()
            raise RuntimeError("Proxima MCP initialize timeout")
        # initialized 通知を送る（MCP仕様: tools/call 前に必須）
        notif_msg = json.dumps({
            "jsonrpc": "2.0", "method": "notifications/initialized", "params": {}
        }) + "\n"
        proc.stdin.write(notif_msg.encode())
        await proc.stdin.drain()
        # tools/call 送信
        call_msg = json.dumps({
            "jsonrpc": "2.0", "id": 2, "method": "tools/call",
            "params": {"name": tool_name, "arguments": params}
        }) + "\n"
        proc.stdin.write(call_msg.encode())
        await proc.stdin.drain()
        # tools/call の応答を待つ（id:2 が返るまでループ）
        result_text = None
        deadline = asyncio.get_event_loop().time() + timeout
        while asyncio.get_event_loop().time() < deadline:
            try:
                remaining = deadline - asyncio.get_event_loop().time()
                line = await asyncio.wait_for(proc.stdout.readline(), timeout=min(remaining, 5.0))
            except asyncio.TimeoutError:
                break
            if not line:
                break
            try:
                data = json.loads(line.decode("utf-8", errors="replace"))
                if data.get("id") == 2:
                    content = data.get("result", {}).get("content", [])
                    for item in content:
                        if item.get("type") == "text":
                            result_text = item["text"]
                            break
                    if result_text is None:
                        err = data.get("error", {})
                        raise RuntimeError(err.get("message", "Proxima MCP error"))
                    break
            except json.JSONDecodeError:
                continue
        proc.kill()
        await proc.wait()
        if result_text is None:
            raise RuntimeError(f"Proxima MCP: no response from {tool_name} (timeout={timeout}s)")
        return result_text

    # asyncio ループの取得または作成
    try:
        loop = asyncio.get_event_loop()
        if loop.is_closed():
            raise RuntimeError()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop.run_until_complete(_run())


class LearnAIHandler(http.server.SimpleHTTPRequestHandler):

    # ── CORS プリフライト ──────────────────────────────
    def do_OPTIONS(self):
        self.send_response(200)
        self._add_cors()
        self.end_headers()

    # ── POST ──────────────────────────────────────────
    def do_POST(self):
        # ── /api/ocr : ローカルOCR（EasyOCR） ──
        if self.path == '/api/ocr':
            self._handle_ocr()
            return
        # ── /api/proxima/chat/completions : Proxima MCP 経由 ──
        if self.path == '/api/proxima/chat/completions':
            self._handle_proxima()
            return
        route = self._match_route()
        if route:
            self._proxy(route, "POST")
        else:
            self.send_response(404)
            self.end_headers()

    # ── PATCH ─────────────────────────────────────────
    def do_PATCH(self):
        route = self._match_route()
        if route:
            self._proxy(route, "PATCH")
        else:
            self.send_response(404)
            self.end_headers()

    # ── GET ───────────────────────────────────────────
    def do_GET(self):
        # /api/proxima/ping: Proxima MCP 疎通確認（起動確認のみ。initialize応答でOK判定）
        if self.path == '/api/proxima/ping':
            try:
                proc = subprocess.Popen(
                    ["node", PROXIMA_MCP_PATH],
                    stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE
                )
                init_msg = json.dumps({"jsonrpc":"2.0","id":1,"method":"initialize",
                    "params":{"protocolVersion":"2024-11-05","capabilities":{},
                    "clientInfo":{"name":"ping","version":"1.0"}}}) + "\n"
                proc.stdin.write(init_msg.encode())
                proc.stdin.flush()
                # initialize 応答を待つ
                import select, platform
                ok = False
                deadline = time.time() + 10
                while time.time() < deadline:
                    if platform.system() == 'Windows':
                        # Windowsでは select がパイプに使えないので、定期読み取り
                        try:
                            line = proc.stdout.readline()
                            if line:
                                data = json.loads(line)
                                if data.get('id') == 1:
                                    ok = True
                                    break
                        except:
                            time.sleep(0.2)
                    else:
                        rlist, _, _ = select.select([proc.stdout], [], [], 0.5)
                        if rlist:
                            try:
                                line = proc.stdout.readline()
                                data = json.loads(line)
                                if data.get('id') == 1:
                                    ok = True
                                    break
                            except:
                                pass
                proc.kill()
                proc.wait()
                self._send_json(200, json.dumps({"available": ok}).encode())
            except Exception as e:
                self._send_json(200, json.dumps({"available": False, "error": str(e)}).encode())
            return
        # /api/ocr/ping: OCR可否を即座に返す（エンジン初期化なし・可用性チェック専用）
        if self.path == '/api/ocr/ping':
            self._send_json(200, json.dumps({
                "available": OCR_AVAILABLE,
                "engine": "easyocr" if OCR_AVAILABLE else "none",
            }).encode())
            return
        route = self._match_route()
        if route:
            self._proxy(route, "GET")
        else:
            super().do_GET()

    # ── ルートマッチング ──────────────────────────────
    def _match_route(self):
        for prefix, cfg in PROXY_ROUTES.items():
            if self.path.startswith(prefix):
                return cfg
        return None

    # ── 汎用プロキシ本体 ──────────────────────────────
    def _proxy(self, cfg, method):
        # パス変換: /api/sambanova/chat/completions → /v1/chat/completions
        strip  = cfg["strip"]
        suffix = self.path[len(strip):]
        target = cfg["base"] + suffix

        auth  = self.headers.get("Authorization", "")
        clen  = int(self.headers.get("Content-Length", 0))
        body  = self.rfile.read(clen) if clen > 0 else None

        headers = {
            "Authorization": auth,
            "Content-Type":  "application/json",
        }
        headers.update(cfg.get("extra_headers", {}))

        req = urllib.request.Request(
            target,
            data    = body,
            method  = method,
            headers = headers,
        )

        # HuggingFaceはコールドスタートで時間がかかるため長めに設定
        timeout = 90 if "/api/huggingface/" in self.path else 60
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                data = resp.read()
                self._send_json(resp.status, self._ensure_json(data))
        except urllib.error.HTTPError as e:
            data = e.read()
            self._send_json(e.code, self._ensure_json(data))
        except Exception as e:
            self._send_json(500, json.dumps({"error": {"message": str(e)}}).encode())

    def _ensure_json(self, data):
        """レスポンスが JSON でない場合は {"error":{"message":"..."}} に変換"""
        try:
            json.loads(data)
            return data
        except Exception:
            text = data.decode("utf-8", errors="replace")
            return json.dumps({"error": {"message": text}}).encode()

    def _send_json(self, status, data):
        self.send_response(status)
        self._add_cors()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _add_cors(self):
        self.send_header("Access-Control-Allow-Origin",  "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS")
        self.send_header("Access-Control-Allow-Headers",
                         "Authorization, Content-Type, Notion-Version")

    # ── /api/proxima/chat/completions : Proxima MCP 経由でAI呼び出し ──
    def _handle_proxima(self):
        """
        OpenAI互換の /chat/completions リクエストを受け取り、
        Proxima MCP の ask_gemini / ask_claude / ask_chatgpt を使って回答を返す。
        リクエストボディ: { model: "gemini"|"claude"|"chatgpt"|"auto", messages: [...] }
        """
        try:
            clen = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(clen))
            model = body.get("model", "auto").lower()
            messages = body.get("messages", [])

            # messagesの最後のユーザーメッセージを取得
            prompt_parts = []
            for msg in messages:
                role = msg.get("role", "")
                content = msg.get("content", "")
                # content が配列の場合（vision形式）はテキスト部分のみ抽出
                if isinstance(content, list):
                    for part in content:
                        if isinstance(part, dict) and part.get("type") == "text":
                            prompt_parts.append(f"[{role}] {part['text']}")
                else:
                    if role in ("user", "assistant"):
                        prompt_parts.append(f"[{role}] {content}")
                    elif role == "system":
                        prompt_parts.insert(0, f"[system] {content}")

            prompt = "\n".join(prompt_parts)
            if not prompt.strip():
                raise ValueError("No prompt found in messages")

            # モデル選択 → MCPツール名を決定
            # enabled-providers.json に従い有効なプロバイダーのみ使用
            # 現在有効: gemini, perplexity
            tool_map = {
                "gemini":     "ask_gemini",
                "perplexity": "ask_perplexity",
                "auto":       "ask_gemini",   # デフォルトはgemini（有効・高品質）
                # 無効プロバイダー（enabled-providers.jsonで未設定）:
                # "claude":  "ask_claude",   → 無効
                # "chatgpt": "ask_chatgpt",  → 無効
            }
            # モデル名の部分一致で選択（未知モデルはgeminiにフォールバック）
            tool_name = "ask_gemini"
            for key, tool in tool_map.items():
                if key in model:
                    tool_name = tool
                    break

            # パラメータ名もツールごとに異なる
            if tool_name == "smart_query":
                params = {"message": prompt}
            else:
                params = {"message": prompt}

            print(f"  [Proxima] {tool_name}({model}) called")
            t0 = time.time()
            result_text = _call_proxima_mcp(tool_name, params, timeout=60)
            elapsed = time.time() - t0
            print(f"  [Proxima] 完了 ({elapsed:.1f}s, {len(result_text)} chars)")

            # OpenAI互換レスポンスを返す
            resp = {
                "id": f"proxima-{int(time.time())}",
                "object": "chat.completion",
                "model": f"proxima-{tool_name}",
                "choices": [{
                    "index": 0,
                    "message": {"role": "assistant", "content": result_text},
                    "finish_reason": "stop"
                }],
                "usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
            }
            self._send_json(200, json.dumps(resp, ensure_ascii=False).encode("utf-8"))

        except subprocess.TimeoutExpired:
            self._send_json(503, json.dumps(
                {"error": {"message": "Proxima MCP timeout"}}).encode())
        except Exception as e:
            print(f"  [Proxima] エラー: {e}")
            self._send_json(500, json.dumps(
                {"error": {"message": str(e)}}).encode())

    # ── /api/ocr : EasyOCR でテキスト抽出 ───────────
    def _handle_ocr(self):
        if not OCR_AVAILABLE:
            self._send_json(200, json.dumps({
                "available": False, "text": "", "line_count": 0,
                "hint": "pip install easyocr"
            }).encode())
            return

        try:
            clen = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(clen)
            data = json.loads(body)
            b64_str = data.get("image", "")

            if not b64_str:
                self._send_json(400, json.dumps({"error": "image field required"}).encode())
                return

            # バックグラウンド初期化完了を最大30秒待つ
            if not _ocr_ready.is_set():
                print("  [OCR] 初期化待機中…")
                _ocr_ready.wait(timeout=30)

            if _ocr_engine is None:
                self._send_json(200, json.dumps({
                    "available": False, "text": "", "line_count": 0,
                    "error": "EasyOCR初期化失敗"
                }).encode())
                return

            # base64 → PIL Image → 960px幅に縮小（OCRは高解像度不要・速度優先）
            img_bytes = base64.b64decode(b64_str)
            img = Image.open(io.BytesIO(img_bytes)).convert('RGB')
            w, h = img.size
            if w > 960:
                img = img.resize((960, int(h * 960 / w)), Image.LANCZOS)
            img_np = np.array(img)

            # OCR実行（信頼度0.4以上のみ採用）
            result = _ocr_engine.readtext(img_np)

            lines = []
            for (_bbox, text, conf) in result:
                if conf >= 0.4 and text.strip():
                    lines.append(text.strip())

            text = "\n".join(lines)
            self._send_json(200, json.dumps({
                "available": True,
                "text": text,
                "line_count": len(lines),
                "char_count": len(text),
            }).encode())

        except Exception as e:
            self._send_json(200, json.dumps({
                "available": True, "text": "", "line_count": 0, "error": str(e)
            }).encode())

    # ── ログをすっきりさせる ──────────────────────────
    def log_message(self, fmt, *args):
        if args and len(args) >= 2 and str(args[1]).startswith("2"):
            return
        super().log_message(fmt, *args)


if __name__ == "__main__":
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)

    # EasyOCRをバックグラウンドで事前初期化（起動直後から並行して実行）
    if OCR_AVAILABLE:
        t = threading.Thread(target=_warmup_ocr, daemon=True)
        t.start()

    addr = ("", PORT)
    with http.server.HTTPServer(addr, LearnAIHandler) as httpd:
        print("=" * 60)
        print(f"  LearnAI サーバー起動中")
        print(f"  → http://localhost:{PORT}/LearnAI.html")
        print(f"  プロキシ: /api/notion/  /api/sambanova/  /api/cerebras/  /api/huggingface/")
        if OCR_AVAILABLE:
            print(f"  OCR: ✅ EasyOCR バックグラウンド初期化中…（初回キャプチャ時には完了します）")
        else:
            print(f"  OCR: ⚠  未インストール → Vision APIを使用（制限あり）")
            print(f"       インストール: pip install easyocr")
        print(f"  終了: Ctrl + C")
        print("=" * 60)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nサーバーを停止しました。")
            sys.exit(0)
