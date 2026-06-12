# マーケティング分析ウィザード — デプロイ＆確認指示書

## 状況
以下のファイルは実装・コミット済み（commit: 80e4f76）。pushのみ未完了。

- `app/marketing/page.tsx` — 4ステップウィザードUI（完成）
- `app/api/marketing/analyze/route.ts` — Gemini/Groq API（8フレームワーク対応、完成）
- `app/page.tsx` — トップページにバナー追加（完成）

---

## ステップ 1: git push

```bash
cd C:\Users\nao\Desktop\Sage_Final_Unified
git push origin main
```

Vercelへの自動デプロイが始まります。

---

## ステップ 2: デプロイ確認

```bash
# デプロイ完了まで待機（1〜2分）
curl -s https://growl-ai.com/api/ping
```

`{"ok":true}` が返ればデプロイ完了。

---

## ステップ 3: マーケティングAPIの動作テスト

```bash
curl -s -X POST https://growl-ai.com/api/marketing/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "name": "テストカフェ",
    "product": "地元野菜を使ったランチカフェ",
    "target": "30〜50代の健康志向の会社員",
    "framework": "3c"
  }' | python3 -m json.tool
```

期待するレスポンス構造：
```json
{
  "result": {
    "framework": "3C分析",
    "why": "...",
    "items": {
      "Customer（顧客・市場）": ["...", "...", "..."],
      "Competitor（競合）": ["...", "...", "..."],
      "Company（自社）": ["...", "...", "..."]
    },
    "insight": "...",
    "actions": ["...", "...", "..."]
  }
}
```

---

## ステップ 4: エラーが出た場合の対応

### TypeScriptエラーが出た場合
```bash
cd C:\Users\nao\Desktop\Sage_Final_Unified\ai-marketing-app
npx tsc --noEmit
```
エラーがあれば修正してから再push。

### APIが500を返す場合
Vercelのログを確認：
```bash
cd C:\Users\nao\Desktop\Sage_Final_Unified\ai-marketing-app
npx vercel logs --follow
```

よくある原因：
- `GEMINI_API_KEY` がVercelに未設定 → `vercel env add GEMINI_API_KEY production`
- `GROQ_API_KEY` がVercelに未設定 → `vercel env add GROQ_API_KEY production`

---

## ステップ 5: 完了確認チェックリスト

- [ ] `git push` 成功
- [ ] `https://growl-ai.com/api/ping` → 200
- [ ] `https://growl-ai.com/marketing` → ページが表示される
- [ ] `/api/marketing/analyze` へのPOST → JSONレスポンス返却
- [ ] トップページ（`/`）にマーケティングバナーが表示される

---

## 補足: 実装済みフレームワーク一覧

| ID | フレームワーク名 | シチュエーション |
|----|----------------|--------------|
| `pest` | PEST分析 | 市場を知る |
| `3c` | 3C分析 | 市場を知る |
| `swot` | SWOT分析 | 市場を知る |
| `vrio` | VRIO分析 | 差別化する |
| `stp` | STP分析 | 戦略を立てる |
| `4p` | 4P/4C分析 | 戦略を立てる |
| `ulssas` | ULSSAS分析 | Web集客 |
| `aeo` | AEO戦略 | Web集客 |
