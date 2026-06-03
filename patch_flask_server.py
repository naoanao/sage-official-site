import ast

target_file = r"C:\Users\nao\Desktop\Sage_Final_Unified\backend\flask_server.py"

print("[INFO] Reading flask_server.py...")
with open(target_file, "r", encoding="utf-8") as f:
    content = f.read()

# Target broken tail
target_str = "    # Try importing psutil, safe fallback if missing"

replacement_str = """    # Try importing psutil, safe fallback if missing
    try:
        import psutil
    except ImportError:
        class DummyPsutil:
            @staticmethod
            def pid_exists(pid):
                try:
                    import ctypes
                    handle = ctypes.windll.kernel32.OpenProcess(0x1000, False, pid)
                    if handle:
                        ctypes.windll.kernel32.CloseHandle(handle)
                        return True
                    return False
                except Exception:
                    return False
        psutil = DummyPsutil()
        
    handle_pid_lock()
    
    try:
        logger.info(f"Starting Flask application on port {port}...")
        app.run(host='0.0.0.0', port=port, debug=debug_mode, use_reloader=False)
    except Exception as e:
        logger.critical(f"Flask failed to start: {e}")
        print(f"🚫 Flask failed to start: {e}")"""

if target_str in content:
    print("[INFO] Applying patch...")
    content = content.replace(target_str, replacement_str, 1)
    with open(target_file, "w", encoding="utf-8") as f:
        f.write(content)
    print("[SUCCESS] Patch applied successfully.")
    
    # Check syntax correctness
    try:
        ast.parse(content)
        print("[SUCCESS] Syntax check passed. No compilation errors.")
    except Exception as e:
        print(f"[ERROR] Syntax check failed: {e}")
else:
    print("[WARNING] Target string not found. The patch might already be applied or the file structure is different.")
