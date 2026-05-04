# マーケティング分析ウィザード — 実装指示書

## 概要
`ai-marketing-app`（Next.js / Vercel）に新機能「マーケティング分析ウィザード」を追加する。
ユーザーが自社情報を入力し、AIがマーケティングフレームワーク（PEST・3C・STP・4Pなど）を
自動で埋めてくれる学習＋実行ツール。日本語特化、個人・中小企業向け。

---

## 作成ファイル一覧

```
app/
  marketing/
    page.tsx                ← メインページ（フォーム＋シチュエーション選択）
    analyze/
      page.tsx              ← 分析結果表示ページ
api/
  marketing/
    analyze/
      route.ts              ← Gemini/Groq呼び出し → フレームワーク生成
components/
  marketing/
    CompanyForm.tsx         ← 自社情報入力フォーム
    SituationSelector.tsx  ← 4つのシチュエーション選択UI
    FrameworkResult.tsx    ← 分析結果表示コンポーネント
    LearningPanel.tsx      ← 各フレームの学習解説パネル
```

---

## ステップ 1: API Route — `/api/marketing/analyze`

**ファイル**: `app/api/marketing/analyze/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { companyName, product, target, situation, framework, url } = body

  const systemPrompt = `あなたはプロのマーケティングストラテジストです。
日本の中小企業・個人事業主向けに、具体的で実践的なマーケティング分析を提供します。
必ずJSON形式で返答してください。`

  const frameworkPrompts: Record<string, string> = {
    pest: `以下の会社のPEST分析を行ってください。
会社名: ${companyName}
商品・サービス: ${product}
ターゲット: ${target}
${url ? `Webサイト: ${url}` : ''}

以下のJSON形式で返答:
{
  "framework": "PEST分析",
  "description": "なぜPEST分析が重要か（2〜3文）",
  "items": {
    "P（政治・法規制）": "具体的な分析内容（箇条書き3点）",
    "E（経済・市場動向）": "具体的な分析内容（箇条書き3点）",
    "S（社会・トレンド）": "具体的な分析内容（箇条書き3点）",
    "T（技術・AI）": "具体的な分析内容（箇条書き3点）"
  },
  "insight": "この会社にとっての最大のチャンスと注意点（1〜2文）",
  "next_action": "次に行うべきフレームワーク分析（例: 3C分析）"
}`,

    "3c": `以下の会社の3C分析を行ってください。
会社名: ${companyName}
商品・サービス: ${product}
ターゲット: ${target}

以下のJSON形式で返答:
{
  "framework": "3C分析",
  "description": "なぜ3C分析が重要か（2〜3文）",
  "items": {
    "Customer（顧客・市場）": "顧客が本当に求めていること、市場の変化（箇条書き3点）",
    "Competitor（競合）": "競合の強みと弱み、差別化のヒント（箇条書き3点）",
    "Company（自社）": "自社の強みと活かすべきリソース（箇条書き3点）"
  },
  "insight": "3Cから見えてくる自社の勝ち筋（1〜2文）",
  "next_action": "次に行うべきフレームワーク分析"
}`,

    swot: `以下の会社のSWOT分析を行ってください。
会社名: ${companyName}
商品・サービス: ${product}
ターゲット: ${target}

以下のJSON形式で返答:
{
  "framework": "SWOT分析",
  "description": "なぜSWOT分析が重要か（2〜3文）",
  "items": {
    "Strength（強み）": "競合に勝てる自社の強み（箇条書き3点）",
    "Weakness（弱み）": "改善が必要な自社の課題（箇条書き3点）",
    "Opportunity（機会）": "市場・トレンドから見える追い風（箇条書き3点）",
    "Threat（脅威）": "注意すべき外部リスク（箇条書き3点）"
  },
  "insight": "SO戦略（強みで機会を活かす）の具体的な一手（1〜2文）",
  "next_action": "次に行うべきフレームワーク分析"
}`,

    stp: `以下の会社のSTP分析を行ってください。
会社名: ${companyName}
商品・サービス: ${product}
ターゲット: ${target}

以下のJSON形式で返答:
{
  "framework": "STP分析",
  "description": "なぜSTP分析が重要か（2〜3文）",
  "items": {
    "Segmentation（市場細分化）": "市場を分ける軸と各セグメントの特徴（箇条書き3点）",
    "Targeting（ターゲット選定）": "狙うべきセグメントとその理由（箇条書き3点）",
    "Positioning（ポジショニング）": "競合と差別化できるポジションと打ち出し方（箇条書き3点）"
  },
  "insight": "このSTPに基づく最も刺さるキャッチコピーの方向性（1〜2文）",
  "next_action": "次に行うべきフレームワーク分析"
}`,

    "4p": `以下の会社の4P/4C分析を行ってください。
会社名: ${companyName}
商品・サービス: ${product}
ターゲット: ${target}

以下のJSON形式で返答:
{
  "framework": "4P / 4C分析",
  "description": "なぜ4P/4C分析が重要か（2〜3文）",
  "items": {
    "Product / Customer Value（商品価値）": "提供すべき商品・機能と顧客が得る価値（箇条書き3点）",
    "Price / Cost（価格設定）": "適切な価格帯とその根拠、顧客の心理的コスト（箇条書き3点）",
    "Place / Convenience（販売チャネル）": "どこで売るか・買いやすさの設計（箇条書き3点）",
    "Promotion / Communication（プロモーション）": "どう知らせ、どう対話するか（箇条書き3点）"
  },
  "insight": "最初に着手すべきPとその具体的なアクション（1〜2文）",
  "next_action": "次に行うべきフレームワーク分析"
}`,

    vrio: `以下の会社のVRIO分析を行ってください。
会社名: ${companyName}
商品・サービス: ${product}
ターゲット: ${target}

以下のJSON形式で返答:
{
  "framework": "VRIO分析",
  "description": "なぜVRIO分析が重要か（2〜3文）",
  "items": {
    "Value（経済価値）": "顧客課題を解決し利益を生む強みはあるか（箇条書き3点）",
    "Rarity（希少性）": "競合が持っていない珍しいリソース・能力（箇条書き3点）",
    "Imitability（模倣困難性）": "他社が真似しにくい参入障壁（箇条書き3点）",
    "Organization（組織体制）": "強みを最大化できる仕組み・体制（箇条書き3点）"
  },
  "insight": "持続的競争優位を生む最大の強みとその磨き方（1〜2文）",
  "next_action": "次に行うべきフレームワーク分析"
}`,

    aeo: `以下の会社のAEO（AI検索最適化）戦略を立案してください。
会社名: ${companyName}
商品・サービス: ${product}
ターゲット: ${target}

以下のJSON形式で返答:
{
  "framework": "AEO（AI検索最適化）戦略",
  "description": "2026年のAI検索時代に自社ブランドをAIに「推薦される存在」にする戦略（2〜3文）",
  "items": {
    "AI Visibility Audit（現在地確認）": "ChatGPT/Gemini/Perplexityに自社ブランドを聞いたときの対策（箇条書き3点）",
    "Answer-first コンテンツ設計": "AIが引用しやすい結論先行型コンテンツの作り方（箇条書き3点）",
    "E-E-A-T（権威性の証明）": "専門家としての信頼を証明する方法（箇条書き3点）",
    "LLM Citation戦略": "AIに引用・推薦される情報発信の具体策（箇条書き3点）"
  },
  "insight": "最初の1ヶ月でAI検索に引用されるために最優先でやること（1〜2文）",
  "next_action": "週次アクションに追加してPDCAを回す"
}`
  }

  const prompt = frameworkPrompts[framework] || frameworkPrompts.pest

  // Try Gemini first, then Groq
  let result = null

  // Gemini
  try {
    const geminiKey = process.env.GEMINI_API_KEY
    if (geminiKey) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 1500 }
          })
        }
      )
      const data = await res.json()
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) result = JSON.parse(jsonMatch[0])
    }
  } catch (e) {
    console.error('Gemini failed:', e)
  }

  // Groq fallback
  if (!result) {
    try {
      const groqKey = process.env.GROQ_API_KEY
      if (groqKey) {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${groqKey}`
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: prompt }
            ],
            max_tokens: 1500,
            temperature: 0.7
          })
        })
        const data = await res.json()
        const text = data?.choices?.[0]?.message?.content || ''
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (jsonMatch) result = JSON.parse(jsonMatch[0])
      }
    } catch (e) {
      console.error('Groq failed:', e)
    }
  }

  if (!result) {
    return NextResponse.json({ error: 'AI生成に失敗しました' }, { status: 500 })
  }

  return NextResponse.json({ result })
}
```

---

## ステップ 2: メインページ — `/marketing`

**ファイル**: `app/marketing/page.tsx`

UIデザインは既存のGrowlページ（`app/dashboard/page.tsx`）のスタイルに合わせること。

含める内容：
1. **ヘッダー**: 「マーケティング分析ウィザード」タイトル＋説明文
2. **CompanyFormコンポーネント**: 自社情報入力フォーム
3. **SituationSelectorコンポーネント**: 4つのシチュエーション選択カード
4. **フレームワーク選択**: シチュエーション選択後に出てくるFW選択UI
5. **「分析を始める」ボタン**: フォーム送信 → `/marketing/analyze?...` へルーティング

**URL構造**:
```
/marketing/analyze?company=xxx&product=xxx&target=xxx&framework=pest
```

---

## ステップ 3: 分析結果ページ — `/marketing/analyze`

**ファイル**: `app/marketing/analyze/page.tsx`

含める内容：
1. URLパラメータから情報を取得
2. `useEffect`で `/api/marketing/analyze` を呼び出し
3. ローディング状態の表示
4. **FrameworkResultコンポーネント**: フレームワーク結果をきれいなカード形式で表示
   - フレームワーク名＋「なぜ重要か」の解説（学習パネル）
   - 各項目をアコーディオン or グリッドで表示
   - Insightをハイライトカード表示
5. **アクションボタン**:
   - 「コピー」: テキスト形式でクリップボードへ
   - 「別のフレームワークを分析する」: `/marketing` へ戻る
   - 「Growlアクションに追加」: この分析から3つのアクションを生成してlocalStorageに追加

---

## ステップ 4: ナビゲーションへの追加

**ファイル**: 既存のナビゲーションコンポーネント（`components/`以下にある場合）

`/marketing` へのリンクを追加する。
アイコン: 📊 または チャートアイコン
ラベル: 「マーケ分析」

---

## ステップ 5: 4シチュエーション × フレームワーク定義

```typescript
// lib/marketing-frameworks.ts として作成

export const SITUATIONS = [
  {
    id: 'situation1',
    title: '市場を知る',
    subtitle: '環境分析・勝ち筋の発見',
    description: '自分たちの立ち位置と参入すべき「空き地（ブルーオーシャン）」を特定する',
    icon: '🔭',
    frameworks: [
      { id: 'pest', name: 'PEST分析', desc: '政治・経済・社会・技術の大きな流れを掴む', time: '5分' },
      { id: '3c', name: '3C分析', desc: '顧客・競合・自社の3つの視点で現状を整理する', time: '5分' },
      { id: 'swot', name: 'SWOT分析', desc: '自社の強み・弱みと外部の機会・脅威を整理する', time: '5分' },
    ]
  },
  {
    id: 'situation2',
    title: '選ばれる理由を磨く',
    subtitle: '価値設計・差別化',
    description: '競合が逆立ちしても真似できない、自社独自の価値を定義する',
    icon: '💎',
    frameworks: [
      { id: 'vrio', name: 'VRIO分析', desc: '自社の強みを冷徹に評価し、持続的競争優位を見つける', time: '5分' },
      { id: 'jobs', name: 'ジョブ理論', desc: '顧客が本当に「片付けたいこと」を特定する', time: '5分' },
    ]
  },
  {
    id: 'situation3',
    title: '戦略を立てる',
    subtitle: 'ターゲティング・商品設計',
    description: '誰に・何を・どう売るかの戦略を明確にする',
    icon: '🎯',
    frameworks: [
      { id: 'stp', name: 'STP分析', desc: '市場を絞り、自社のポジションを確立する', time: '5分' },
      { id: '4p', name: '4P / 4C分析', desc: '商品・価格・チャネル・プロモーションを設計する', time: '5分' },
    ]
  },
  {
    id: 'situation4',
    title: 'Web集客・AI検索対応',
    subtitle: '2026年最新戦略',
    description: 'SNSで話題になり、AIに推薦される存在になる方法',
    icon: '🚀',
    frameworks: [
      { id: 'ulssas', name: 'ULSSAS分析', desc: 'SNS時代の拡散モデルで集客の循環を設計する', time: '5分' },
      { id: 'aeo', name: 'AEO戦略', desc: 'ChatGPT・Gemini・Perplexityに推薦される戦略を立てる', time: '5分' },
    ]
  }
]
```

---

## ステップ 6: TypeScriptチェック＆動作確認

```bash
cd ai-marketing-app
npx tsc --noEmit
npm run dev
```

ブラウザで `http://localhost:3000/marketing` を開き、以下を確認：
1. フォームに自社情報を入力できる
2. シチュエーションを選択するとフレームワークが表示される
3. 「分析を始める」で結果ページに遷移する
4. AIが分析結果を生成して表示される
5. 「コピー」が機能する

---

## ステップ 7: git commit & push

```bash
git add -A
git commit -m "feat: marketing framework wizard - PEST/3C/SWOT/STP/4P/VRIO/AEO analyzer"
git push origin main
```

---

## デザイン指針

- 既存のGrowlアプリのデザイン（Tailwind CSS）に完全に合わせる
- カラー: 既存のアクセントカラーを踏襲
- モバイルファーストで設計
- ローディング状態は必ず表示（Gemini呼び出しに3〜5秒かかる）
- 「なぜこのフレームワークを使うのか」の解説を必ず各画面に表示（学習機能）

---

## 補足：「Growlアクションに追加」の実装

分析結果から3つの週次アクションを生成してlocalStorageに追加：

```typescript
// 分析結果を受け取った後
async function addToGrowlActions(result: FrameworkResult) {
  const actionsPrompt = `
以下のマーケティング分析結果から、今週中に実行できる具体的なアクションを3つ生成してください。
分析結果: ${JSON.stringify(result)}

3つのアクションをJSON配列で返答:
[
  { "title": "アクション名", "description": "具体的な内容（1文）", "duration": "30分" },
  ...
]
`
  // Gemini/Groq呼び出しでアクション生成
  // → localStorageのGrowlセッションに追加
  // → /dashboard へリダイレクト
}
```

---

## 既存コードの確認事項

実装前に以下を確認すること：

1. `app/dashboard/page.tsx` — デザインパターン・スタイルの参照用
2. `app/api/generate-actions/route.ts` — Gemini/Groq呼び出しパターンの参照用
3. `lib/gemini.ts` — Gemini APIの既存実装（同じパターンを使う）
4. 既存ナビゲーションコンポーネントの場所確認
