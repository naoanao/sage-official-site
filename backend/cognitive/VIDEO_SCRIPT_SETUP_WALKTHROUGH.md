# 動画スクリプト：Sage AI Blueprint — Technical Walkthrough
> 対象: Python・APIに慣れている技術者・AIエンジニア
> 収録時間目安：25〜35分（英語収録推奨・日本語でもOK）
> 一度収録すれば全購入者が視聴できます

---

## 冒頭（0:00〜1:30）

「Hi, I'm nao. I built Sage AI — an autonomous content system that's been running 24/7 since January 2026.

In this video I'll walk you through setting up the exact same system on your machine — from zero to your first automated post.

Fair warning: this takes half a day. It's not a no-code tool. But once it's running, you won't have to touch it again.

Let's get into it.」

---

## Part 0: 何を作るか見せる（1:30〜4:00）

**画面録画：実際に動いているダッシュボードを見せる**

「Before we start, let me show you what we're building.

This is the SageOS dashboard. Every morning at 9am JST, this Cloudflare Worker fires — it pulls a topic from this Notion database, generates a post with Llama 3.3, and publishes it to Bluesky and Instagram automatically.

[Notionのコンテンツプールを見せる]

This is the content pool. Topics queue up here. The replenisher worker refills it every Sunday automatically.

[Cloudflare Workersのログを見せる]
And this is the worker log — every execution, timestamped.

The whole thing runs whether your PC is on or off. Let's build it.」

---

## Part 1: 環境確認（4:00〜7:00）

「First, let's verify your environment.

[ターミナルを開く]

```bash
python --version   # Need 3.9+
node --version     # Need 18+
```

If you're on Windows, I recommend running everything in PowerShell as Administrator.」

**APIキー取得リスト（画面に表示）:**
```
必須:
  Groq API key        → console.groq.com (free)
  Notion token        → notion.so/my-integrations
  Bluesky app password → bsky.app → Settings → App Passwords
  Cloudflare account  → cloudflare.com (free)
  ngrok authtoken     → dashboard.ngrok.com (free)

任意（後から追加可）:
  Telegram bot token  → @BotFather on Telegram
  Instagram token     → Meta Developer (requires Business account)
  Groq is enough to start. Get the others as you go.
```

---

## Part 2: setup.py の実行（7:00〜14:00）

「Now run the setup wizard:

[ターミナル]
```bash
python setup.py
```

[対話形式の画面を見せながら]

It'll ask for each API key one by one. For keys you don't have yet, just press Enter to skip — you can add them to .env later.

The wizard auto-generates your SAGE_ADMIN_TOKEN and installs Python packages. Say yes to both.」

**Cloudflare のAccount ID取得を実演:**
「For the Cloudflare account ID — open dash.cloudflare.com, look at the URL. It's the string right after the domain. Copy that.」

---

## Part 3: setup_verify.py — 全接続テスト（14:00〜18:00）

「After setup.py finishes, run this:

[ターミナル]
```bash
python setup_verify.py
```

[テスト結果画面を見せる]

This tests every connection — Groq, Bluesky, Notion, Node.js, everything.

If something fails, it tells you exactly what's wrong and how to fix it. If Groq passes but Notion fails, that's fine — you can start without Notion.

[AI診断の部分を見せる]
If multiple things fail, the AI diagnosis at the bottom will analyze them and suggest fixes in Japanese or English.」

---

## Part 4: SOUL.md のカスタマイズ（18:00〜21:00）

「Before starting the server, open SOUL.md.

[エディタでSOUL.mdを開く]

This is the identity file. Change:
- The brand name (line 8)
- The niche (line 12)
- The tone (line 52)
- The target audience (line 13)

This one file controls the voice of every piece of content Sage generates. It's the most important thing to get right.

Also open backend/config/identity.json and update the brand_name and target_audience fields.」

---

## Part 5: ローカル起動（21:00〜24:00）

**Windows:**
「[PowerShellを開く]
```powershell
.\run_sage.ps1
```

This starts Flask on port 8080, then starts ngrok with your static domain.

[ブラウザを開く: localhost:8080]

You should see the SageOS dashboard. Try the Chat tab — type 'hello' and Sage should respond.」

**Mac/Linux:**
「For Mac or Linux:
```bash
python backend/flask_server.py &
```
Then separately start ngrok:
```bash
ngrok http 8080 --domain=your-static-domain.ngrok-free.app
```」

---

## Part 6: Cloudflare Workers デプロイ（24:00〜31:00）

「Now the most important part — deploying the workers that run 24/7 without your PC.

[ターミナル]
```bash
cd workers/sage-sns-worker
npx wrangler login    # Opens browser — authorize Cloudflare
npm install
npm run deploy
```

Now set the secrets:
```bash
wrangler secret put GROQ_API_KEY
wrangler secret put NOTION_API_KEY
wrangler secret put BLUESKY_APP_PASSWORD
```
[各コマンドで値を貼り付ける動作を見せる]

Then deploy the content replenisher:
```bash
cd ../sage-content-replenisher
npm install
npm run deploy
wrangler secret put GROQ_API_KEY
wrangler secret put NOTION_API_KEY
```

[Cloudflare Dashboardを開く]

Verify both workers appear in your Workers list. Click on sage-sns-worker → Triggers → confirm the cron is set to `0 0 * * *`.

Now test it:
```
https://sage-sns-worker.[your-subdomain].workers.dev/run
```
You should get `{"status":"success"}` or `{"status":"skipped","reason":"no_content"}`.
Both are correct responses.」

---

## Part 7: Notionコンテンツプールの準備（31:00〜34:00）

「Last step — add content to the queue.

[Notionを開く]
Open your content pool database. Add 5-10 topics like:
- "How to automate Instagram with Groq API"
- "Building a passive income system with AI agents"
- "LangGraph vs CrewAI: which to use in 2026"

Set each Status to "Scheduled".

The replenisher worker will auto-add more every Sunday. But you need at least a few to start.

First post fires tomorrow at 9am JST. You're done.」

---

## 締め（34:00〜35:00）

「That's the full setup.

If something's not working, run `python setup_verify.py` first. It diagnoses most issues automatically.

For anything else, email support@sage-ai.app. AI responds 24/7. If it can't solve it, I'll look at it personally.

Good luck. Let the system work while you sleep.」

---

## 収録注意事項

- **英語推奨**: ターゲットは英語圏技術者が主
- **日本語版**: 別途作成する場合は同じ内容で日本語で収録
- **画面収録**: OBS Studio（無料）または Loom推奨
- **実際の環境で収録**: スクリプト通りに自分の環境でやると自然になる
- **アップロード先**: YouTube限定公開 または Loom → GumroadのContent欄にURLを貼る
- **収録後の動画は二度と作り直さなくていい**: サポートはAIがやるので
