import sqlite3, os
db = os.environ['TEMP'] + '/proxima_cookies_tmp.db'
conn = sqlite3.connect(db)
cur = conn.cursor()
cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [r[0] for r in cur.fetchall()]
print('Tables:', tables)

# テーブル名を特定してドメインを確認
for t in tables:
    try:
        cur.execute(f"SELECT * FROM {t} LIMIT 1")
        cols = [d[0] for d in cur.description]
        print(f"\nTable '{t}' columns: {cols}")
        if 'host_key' in cols or 'domain' in cols:
            col = 'host_key' if 'host_key' in cols else 'domain'
            cur.execute(f"SELECT DISTINCT {col} FROM {t} ORDER BY {col}")
            hosts = [r[0] for r in cur.fetchall()]
            keywords = ['claude','openai','chatgpt','perplexity','gemini','google','anthropic']
            filtered = [h for h in hosts if any(k in str(h).lower() for k in keywords)]
            print(f"AI related domains: {filtered}")
            print(f"Total domains: {len(hosts)}")
    except Exception as e:
        print(f"Error on {t}: {e}")
conn.close()
