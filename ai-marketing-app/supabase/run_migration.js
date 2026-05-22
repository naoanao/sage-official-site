// Growl Sprint1 マイグレーション実行スクリプト
// 使い方: node run_migration.js sbp_YOUR_TOKEN
// トークン取得: https://supabase.com/dashboard/account/tokens

const https = require('https');

const PROJECT_REF = 'ylmtgrfvqaaeymwhkflo';
const pat = process.argv[2];

if (!pat || !pat.startsWith('sbp_')) {
  console.error('使い方: node run_migration.js sbp_YOUR_TOKEN');
  console.error('トークン取得: https://supabase.com/dashboard/account/tokens');
  process.exit(1);
}

const STATEMENTS = [
  {
    name: 'action_completionsテーブル作成',
    sql: `CREATE TABLE IF NOT EXISTS public.action_completions (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id      uuid NOT NULL REFERENCES public.weekly_sessions(id) ON DELETE CASCADE,
  action_index    integer NOT NULL CHECK (action_index >= 0 AND action_index <= 2),
  completed_at    timestamptz NOT NULL DEFAULT now(),
  result_memo     text,
  result_rating   smallint
)`
  },
  {
    name: 'インデックス作成',
    sql: `CREATE INDEX IF NOT EXISTS idx_action_completions_session ON public.action_completions(session_id)`
  },
  {
    name: 'users.learning_history カラム追加',
    sql: `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS learning_history jsonb NOT NULL DEFAULT '[]'::jsonb`
  },
  {
    name: 'users.feedback_state カラム追加',
    sql: `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS feedback_state text`
  },
  {
    name: 'weekly_sessions.completed_count カラム追加',
    sql: `ALTER TABLE public.weekly_sessions ADD COLUMN IF NOT EXISTS completed_count integer NOT NULL DEFAULT 0`
  }
];

function runSQL(sql) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: sql });
    const options = {
      hostname: 'api.supabase.com',
      path: `/v1/projects/${PROJECT_REF}/database/query`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${pat}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  console.log('🌱 Growl Sprint1 マイグレーション開始\n');
  let allOk = true;

  for (const stmt of STATEMENTS) {
    process.stdout.write(`  実行中: ${stmt.name} ... `);
    try {
      await runSQL(stmt.sql);
      console.log('✅ 成功');
    } catch (err) {
      const msg = err.message;
      if (msg.includes('already exists') || msg.includes('42701') || msg.includes('42P07')) {
        console.log('⚠️  スキップ（既に存在）');
      } else {
        console.log(`❌ エラー`);
        console.error(`     ${msg.slice(0, 200)}`);
        allOk = false;
      }
    }
  }

  console.log('');
  if (allOk) {
    console.log('🎉 マイグレーション完了！Sprint1 の準備が整いました。');
  } else {
    console.log('⚠️  一部エラーがありました。上記を確認してください。');
    process.exit(1);
  }
}

main();
