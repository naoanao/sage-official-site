with open("backend/flask_server.py", "r", encoding="utf-8") as f:
    content = f.read()

# 追記するコード（psutil fallback + handle_pid_lock呼び出し + app.run）
append_code = """
    try:
        import psutil
        HAS_PSUTIL = True
    except ImportError:
        HAS_PSUTIL = False
        print("⚠️ psutil not installed. PID lock disabled.")

    if HAS_PSUTIL:
        handle_pid_lock()
    else:
        current_pid = os.getpid()
        with open(PID_FILE, 'w') as f:
            f.write(str(current_pid))
        print(f"🔒 PID written (no psutil): {current_pid}")

    app.run(host="0.0.0.0", port=port, debug=debug_mode, use_reloader=False)
"""

# 既に追記済みでないか確認
if "app.run(" not in content:
    content = content + append_code
    with open("backend/flask_server.py", "w", encoding="utf-8") as f:
        f.write(content)
    print("✅ app.run() を追記しました")
else:
    print("ℹ️ app.run() は既に存在します")

# 構文チェック
import ast
try:
    ast.parse(content)
    print("✅ 構文チェック OK")
except SyntaxError as e:
    print(f"❌ 構文エラー: {e}")
