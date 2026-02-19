import os

import sqlite3

import logging

from datetime import datetime



logger = logging.getLogger(__name__)



class APIMonitor:

    def __init__(self, db_path="backend/logs/api_usage.db"):

        self.db_path = db_path

        self._init_db()

        logger.info(f"孱・・APIMonitor initialized. tracking usage in {db_path}")



    def _init_db(self):

        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)

        conn = sqlite3.connect(self.db_path)

        cursor = conn.cursor()

        cursor.execute('''

            CREATE TABLE IF NOT EXISTS api_usage (

                timestamp TEXT,

                model TEXT,

                tokens_used INTEGER,

                cost REAL

            )

        ''')

        conn.commit()

        conn.close()



    def log_usage(self, model, tokens):

        conn = sqlite3.connect(self.db_path)

        cursor = conn.cursor()

        cursor.execute('INSERT INTO api_usage VALUES (?, ?, ?, ?)', 

                       (datetime.now().isoformat(), model, tokens, 0.0))

        conn.commit()

        conn.close()

    def get_usage_stats(self):
        """Returns summary stats for the last 24 hours"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('SELECT COUNT(*), SUM(tokens_used) FROM api_usage')
        row = cursor.fetchone()
        conn.close()
        
        return {
            "total_calls": row[0] or 0,
            "total_tokens": row[1] or 0,
            "daily_limit": int(os.getenv("SAGE_API_DAILY_LIMIT", "1000"))
        }



api_monitor = APIMonitor()

