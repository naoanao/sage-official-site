#!/usr/bin/env python3
"""
market_signals テーブル作成スクリプト
Sage/Growl統合 Phase1 — マーケットシグナル共有テーブル

Usage:
    cd Sage_Final_Unified
    python scripts/migrate_market_signals.py
"""

import os
import subprocess
import sys
import urllib.request
import urllib.error
import json

SQL = """
-- market_signals: Sage→Growl データブリッジテーブル
CREATE TABLE IF NOT EXISTS market_signals (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  industry     text NOT NULL,
  signal_date  date NOT NULL DEFAULT CURRENT_DATE,
  raw_summary  text,
  created_at   timestamptz DEFAULT now(),
  UNIQUE(industry, signal_date)
);

ALTER TABLE market_signals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'market_signals'
    AND policyname = 'service_full_access'
  ) THEN
    EXECUTE 'CREATE POLICY "service_full_access" ON market_signals FOR ALL USING (true) WITH CHECK (true)';
  END IF;
END $$;
"""

def load_env():
    """ai-marketing-app/.env.local から環境変数を読み込む"""
    env_path = os.path.join(os.path.dirname(__file__), '..', 'ai-marketing-app', '.env.local')
    env = {}
    if os.path.exists(env_path):
        with open(env_path, encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if '=' in line and not line.startswith('#'):
                    key, val = line.split('=', 1)
                    env[key.strip()] = val.strip()
    return env

def try_supabase_cli(project_ref: str, sql: str) -> bool:
    """Supabase CLIでSQLを実行する（インストール済みの場合）"""
    try:
        result = subprocess.run(
            ["supabase", "db", "execute", "--project-ref", project_ref],
            input=sql, capture_output=True, text=True, timeout=30
        )
        if result.returncode == 0:
            return True
        print(f"  Supabase CLI error: {result.stderr.strip()}")
        return False
    except FileNotFoundError:
        return False
    except subprocess.TimeoutExpired:
        print("  Supabase CLI timeout")
        return False

def try_direct_postgres(project_ref: str, password: str, sql: str) -> bool:
    """psqlで直接接続して実行する（psqlがある場合）"""
    conn_str = f"postgresql://postgres.{project_ref}:{password}@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres"
    try:
        result = subprocess.run(
            ["psql", conn_str, "-c", sql],
            capture_output=True, text=True, timeout=30
        )
        return result.returncode == 0
    except FileNotFoundError:
        return False
    except Exception:
        return False

def main():
    print("=" * 50)
    print("Sage/Growl 統合 — market_signals テーブル作成")
    print("=" * 50)

    env = load_env()
    supabase_url = env.get("NEXT_PUBLIC_SUPABASE_URL", os.getenv("NEXT_PUBLIC_SUPABASE_URL", ""))
    project_ref = supabase_url.replace("https://", "").split(".")[0] if supabase_url else ""

    if not project_ref:
        print("❌ NEXT_PUBLIC_SUPABASE_URL が見つかりません")
        sys.exit(1)

    print(f"  Project ref: {project_ref}")

    # ── 方法1: Supabase CLI ──────────────────────────────────────────────────
    print("\n[1/2] Supabase CLI を試行中...")
    if try_supabase_cli(project_ref, SQL):
        print("✅ 完了！market_signals テーブルが作成されました。")
        return

    print("  → Supabase CLI が見つかりません（未インストール or 未ログイン）")

    # ── 方法2: psql 直接接続 ────────────────────────────────────────────────
    print("\n[2/2] psql 直接接続を試行中...")
    db_password = env.get("DB_PASSWORD", os.getenv("DB_PASSWORD", ""))
    if db_password and try_direct_postgres(project_ref, db_password, SQL):
        print("✅ 完了！market_signals テーブルが作成されました。")
        return

    # ── フォールバック: SQL を出力 ────────────────────────────────────────────
    print("\n" + "─" * 50)
    print("⚠️  自動実行できませんでした。")
    print("以下のSQLをSupabase SQL Editorで実行してください：")
    print(f"\n🔗 {supabase_url.replace('https://', 'https://supabase.com/dashboard/project/')}/sql/new")
    print("\n" + "─" * 50)
    print(SQL)
    print("─" * 50)
    print("\n📋 上記のSQLをコピーしてSupabase SQL Editorに貼り付けて「RUN」を押してください。")
    print("    所要時間: 約30秒")

if __name__ == "__main__":
    main()
