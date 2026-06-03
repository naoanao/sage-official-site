import tkinter as tk
from tkinter import scrolledtext
import subprocess
import urllib.request
import urllib.error
import json
import threading

TOKEN = "vca_8k7c1ulgwg3KdByCkC5O6ywrdpdt8oLzFhAYv1GagpKdAN9xMP06wgrk"
GIT_DIR = r"C:\Users\nao\Desktop\Sage_Final_Unified\ai-marketing-app"

root = tk.Tk()
root.title("Vercel Fix Tool")
root.geometry("700x500")
root.configure(bg="#1e1e1e")

log_box = scrolledtext.ScrolledText(root, bg="#252526", fg="#d4d4d4", font=("Consolas", 10), state="disabled")
log_box.pack(fill="both", expand=True, padx=10, pady=10)

btn_frame = tk.Frame(root, bg="#1e1e1e")
btn_frame.pack(pady=5)

def log(msg):
    log_box.configure(state="normal")
    log_box.insert("end", msg + "\n")
    log_box.see("end")
    log_box.configure(state="disabled")
    root.update()

def vercel_api(method, path, body=None):
    url = f"https://api.vercel.com{path}"
    headers = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return {"error": e.read().decode()}

def run_all():
    btn_run.configure(state="disabled")

    def worker():
        log("=" * 50)
        log("【1】Vercel プロジェクト確認...")
        projects = vercel_api("GET", "/v9/projects?limit=10")
        if "error" in str(projects):
            log(f"エラー: {projects}")
        else:
            for p in projects.get("projects", []):
                log(f"  {p['name']} | rootDir: {p.get('rootDirectory','null')} | repo: {p.get('link',{}).get('repo','?')}")

        log("")
        log("【2】growl-app の rootDirectory を ai-marketing-app に修正...")
        result = vercel_api("PATCH", "/v9/projects/growl-app", {"rootDirectory": "ai-marketing-app"})
        if "rootDirectory" in result:
            log(f"  ✅ 修正完了: rootDirectory = {result['rootDirectory']}")
        else:
            log(f"  結果: {result}")

        log("")
        log("【3】git push origin main...")
        try:
            proc = subprocess.run(
                ["git", "push", "origin", "main"],
                cwd=GIT_DIR,
                capture_output=True, text=True, timeout=60
            )
            if proc.returncode == 0:
                log("  ✅ push 成功!")
                log(proc.stdout or proc.stderr)
            else:
                log(f"  ⚠ exit code {proc.returncode}")
                log(proc.stdout)
                log(proc.stderr)
        except Exception as e:
            log(f"  エラー: {e}")

        log("")
        log("=" * 50)
        log("完了！Vercel が自動デプロイを開始します。")
        log("growl-app.vercel.app を数分後に確認してください。")
        btn_run.configure(state="normal")

    threading.Thread(target=worker, daemon=True).start()

btn_run = tk.Button(btn_frame, text="▶  全自動修正 (Vercel API + git push)", bg="#0e639c", fg="white",
                    font=("", 12, "bold"), padx=20, pady=8, command=run_all, relief="flat")
btn_run.pack()

log("準備完了。ボタンを押してください。")
root.mainloop()
