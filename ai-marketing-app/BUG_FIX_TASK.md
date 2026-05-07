# バグ修正タスク — ai-marketing-app

コミット済みコード（commit: 80e4f76）に対するバグ修正指示書。
テスト報告書に基づくP1（緊急）→ P2（中）→ P3（低）の順で修正すること。

---

## P1（緊急バグ）

### ① ドメイン誤り修正 — `app/complete/[id]/page.tsx`

**問題**: `APP_URL` のデフォルト値が `https://ai-marke-bucho.vercel.app`（旧ドメイン）になっている。
シェアテキストに誤ったURLが含まれてしまう。

**修正箇所**: `app/complete/[id]/page.tsx` 7行目

```diff
- const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://ai-marke-bucho.vercel.app";
+ const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://growl-app.vercel.app";
```

---

### ② オンボーディング中間ページのセッションガード

**問題**: `/onboarding/business`、`/onboarding/target`、`/onboarding/strength`、`/onboarding/goal` などの中間ページに直接URLアクセスすると、前のステップのデータが空のまま処理が進む。
`loadOnboarding()` で `industry` が空なら最初のページにリダイレクトするべき。

**修正対象ファイル**: 以下の各オンボーディングページ（`industry` 以外すべて）
- `app/onboarding/business/page.tsx`
- `app/onboarding/target/page.tsx`
- `app/onboarding/strength/page.tsx`
- `app/onboarding/goal/page.tsx`

**各ファイルに追加するパターン**（`useEffect` でチェック）:

```typescript
// ページコンポーネントの先頭付近（既存のuseEffectがあればその中に統合）
useEffect(() => {
  const data = loadOnboarding();
  if (!data.industry) {
    router.replace("/onboarding/industry");
  }
}, [router]);
```

`goal/page.tsx` はすでに `useEffect` があるので、その中に `if (!data.industry) { router.replace("/onboarding/industry"); return; }` を先頭行に追加する。

---

### ③ マーケティング入力バリデーション強化 — `app/marketing/page.tsx`

**問題**: 現在は `!name.trim()` の空チェックのみ。記号だけ・数字だけ・1文字などの無効入力がAI APIに送られてしまう。

**修正箇所**: `app/marketing/page.tsx` の `handleFormSubmit` 関数（83〜87行目）

以下のバリデーション関数を追加し、`handleFormSubmit` 内で呼び出す:

```typescript
function isValidInput(str: string): boolean {
  const trimmed = str.trim();
  if (trimmed.length < 2) return false; // 1文字以下は無効
  // 記号・数字のみは無効（少なくとも1文字以上の日本語・英字を含む）
  if (/^[\d\s\W]+$/.test(trimmed)) return false;
  return true;
}
```

`handleFormSubmit` を以下のように修正:

```typescript
function handleFormSubmit(e: React.FormEvent) {
  e.preventDefault();
  if (!isValidInput(name) || !isValidInput(product) || !isValidInput(target)) {
    setFormError("会社名・商品・ターゲット顧客は2文字以上の具体的な内容を入力してください");
    return;
  }
  setFormError(null);
  setStep("situation");
}
```

`useState` に `const [formError, setFormError] = useState<string | null>(null);` を追加し、
フォームのsubmitボタン直上にエラー表示を追加:

```tsx
{formError && (
  <div className="text-red-500 text-sm bg-red-50 border border-red-100 rounded-xl px-4 py-3">
    {formError}
  </div>
)}
```

---

## P2（中程度のバグ）

### ④ 必須フィールド未入力時のエラーメッセージ — `app/marketing/page.tsx`

**問題**: submitボタンが `disabled` になるだけで、どのフィールドが未入力かユーザーに伝わらない。

**修正**: 各 `<label>` に未入力時の視覚フィードバックを追加。
また「次へ」ボタンをクリックしたときに（disabledでない場合）、空フィールドにフォーカスを当てる。
もしくは、`required` 属性に加えて各フィールドに以下のように `onBlur` エラー表示を追加:

各フィールドの `<input>` / `<textarea>` に:
```tsx
onBlur={(e) => {
  if (!e.target.value.trim()) {
    e.target.classList.add("border-red-300");
  } else {
    e.target.classList.remove("border-red-300");
  }
}}
```

---

### ⑤ フォーム修正時のフレームワーク選択リセット — `app/marketing/page.tsx`

**問題**: 「← 自社情報を修正」ボタンを押してステップ1に戻ったとき、`selectedSituation` と `selectedFw` がリセットされない。
ステップ2に戻ったとき古い選択が残ってしまう。

**修正箇所**: `app/marketing/page.tsx` 227行目の「← 自社情報を修正」ボタン

```diff
- <button onClick={() => setStep("form")} className="text-gray-400 text-sm mb-4 hover:text-gray-600">← 自社情報を修正</button>
+ <button onClick={() => { setStep("form"); setSelectedSituation(null); setSelectedFw(null); }} className="text-gray-400 text-sm mb-4 hover:text-gray-600">← 自社情報を修正</button>
```

---

### ⑥ SWOT分析プロンプトの現代化 — `app/api/marketing/analyze/route.ts`

**問題**: SWOT分析の `Threat（脅威）` セクションでCOVID-19など古い情報が生成される可能性がある。
2026年の最新状況を前提とした分析を要求するよう修正。

**修正箇所**: `route.ts` の `swot` プロンプト関数（46〜64行目）

プロンプト冒頭の指示文を修正:

```diff
- swot: (c) => `あなたはプロのマーケティングストラテジストです。以下の会社のSWOT分析を日本語で行ってください。
+ swot: (c) => `あなたはプロのマーケティングストラテジストです。以下の会社のSWOT分析を日本語で行ってください。
+ 分析は2026年現在の市場環境を前提にしてください。COVID-19はすでに収束済みとして扱い、コロナ禍の影響ではなく現在進行中のトレンド（AI活用、物価高騰、人口減少、SNSマーケティング等）を脅威・機会として分析してください。
```

具体的には、プロンプト内の説明文の直後（会社情報フィールドの後）に追記:

```
分析は2026年現在の市場環境を前提にしてください。COVID-19はすでに収束済みとして扱い、現在進行中のトレンド（AI技術の普及、物価高騰、人口減少・高齢化、Z世代消費行動、SNSマーケティングの変化等）を反映した脅威・機会として分析してください。
```

---

### ⑦ カスタム404ページ追加 — `app/not-found.tsx`（新規作成）

**問題**: 存在しないURLにアクセスするとNext.jsのデフォルト404ページが表示される。

**新規ファイル**: `app/not-found.tsx`

```tsx
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 text-center">
      <div className="text-6xl mb-6">🔍</div>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">ページが見つかりません</h1>
      <p className="text-gray-500 text-sm mb-8 leading-relaxed">
        お探しのページは存在しないか、<br />移動した可能性があります。
      </p>
      <Link
        href="/"
        className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold px-6 py-3 rounded-2xl transition-colors"
      >
        ホームに戻る
      </Link>
    </main>
  );
}
```

---

## P3（軽微・UX改善）

### ⑧ フッターにリーガルリンク追加

**問題**: プライバシーポリシー・利用規約・お問い合わせリンクが存在しない。

**修正対象**: `app/layout.tsx`（グローバルフッター）または各ページの `<footer>` タグ

`app/marketing/page.tsx` のフッター（401〜403行目）を修正:

```diff
- <footer className="text-center py-6 text-xs text-gray-300 border-t border-gray-100">
-   © 2026 Growl
- </footer>
+ <footer className="text-center py-8 text-xs text-gray-300 border-t border-gray-100">
+   <div className="flex items-center justify-center gap-4 mb-2">
+     <a href="/privacy" className="hover:text-gray-500 transition-colors">プライバシーポリシー</a>
+     <a href="/terms" className="hover:text-gray-500 transition-colors">利用規約</a>
+     <a href="mailto:contact@growl-app.vercel.app" className="hover:text-gray-500 transition-colors">お問い合わせ</a>
+   </div>
+   © 2026 Growl
+ </footer>
```

同様に `app/page.tsx` のフッター（76〜78行目）も同じ内容に修正。

あわせて `app/privacy/page.tsx` と `app/terms/page.tsx` をシンプルなプレースホルダーとして新規作成:

**`app/privacy/page.tsx`**:
```tsx
import Link from "next/link";
export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-6 py-16 max-w-lg mx-auto">
      <Link href="/" className="text-gray-400 text-sm hover:text-gray-600">← ホームに戻る</Link>
      <h1 className="text-2xl font-bold text-gray-800 mt-6 mb-4">プライバシーポリシー</h1>
      <p className="text-gray-500 text-sm leading-relaxed">
        本サービス（Growl）は、ユーザーが入力した情報をAI分析にのみ使用し、第三者に提供しません。
        入力情報はサーバーに保存されず、セッション完了後に破棄されます。
      </p>
      <p className="text-gray-400 text-xs mt-8">最終更新: 2026年5月</p>
    </main>
  );
}
```

**`app/terms/page.tsx`**:
```tsx
import Link from "next/link";
export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-6 py-16 max-w-lg mx-auto">
      <Link href="/" className="text-gray-400 text-sm hover:text-gray-600">← ホームに戻る</Link>
      <h1 className="text-2xl font-bold text-gray-800 mt-6 mb-4">利用規約</h1>
      <p className="text-gray-500 text-sm leading-relaxed">
        本サービスは現在ベータ版として提供しています。AIが生成する分析結果は参考情報であり、
        ビジネス判断の最終責任はユーザー自身が負うものとします。
        サービス内容は予告なく変更・終了する場合があります。
      </p>
      <p className="text-gray-400 text-xs mt-8">最終更新: 2026年5月</p>
    </main>
  );
}
```

---

### ⑨ AEO説明文のテキスト折り返し改善 — `app/marketing/page.tsx`

**問題**: フレームワーク選択ボタン内の `desc` テキストが狭い画面でCSSによって省略される可能性がある。
特にAEO戦略の説明文「ChatGPT・Geminiに推薦されるブランドになる」が選択時（白テキスト on インディゴ背景）に視認しにくい場合がある。

**修正箇所**: `app/marketing/page.tsx` 272行目のdesc `<p>` タグ

```diff
- <p className={`text-xs mt-0.5 ${selectedFw === fw.id ? "text-indigo-100" : "text-gray-400"}`}>{fw.desc}</p>
+ <p className={`text-xs mt-0.5 leading-relaxed break-words ${selectedFw === fw.id ? "text-indigo-100" : "text-gray-400"}`}>{fw.desc}</p>
```

---

### ⑩ 「そのまま使える」バッジの条件修正 — `components/ActionCard.tsx`

**問題**: `content` があるアクションすべてに「そのまま使える」バッジが表示されるが、
一部のアクションは下書き・参考情報であり「そのまま使える」とは言えない場合がある。

**修正箇所**: `components/ActionCard.tsx` 96〜98行目

`content_type` が投稿文・配信文など直接使えるタイプのみバッジを表示するよう条件を追加:

```typescript
const DIRECTLY_USABLE_TYPES = [
  "Instagram投稿文", "X(Twitter)投稿文", "LINE配信文", "メール文", "告知文", "チラシ文"
];
```

```diff
- <span className="text-xs text-indigo-500 font-medium bg-indigo-100 px-2 py-0.5 rounded-full">
-   そのまま使える
- </span>
+ {DIRECTLY_USABLE_TYPES.includes(action.content_type) && (
+   <span className="text-xs text-indigo-500 font-medium bg-indigo-100 px-2 py-0.5 rounded-full">
+     そのまま使える
+   </span>
+ )}
```

---

## 修正完了後の手順

```bash
# TypeScript エラー確認
cd C:\Users\nao\Desktop\Sage_Final_Unified\ai-marketing-app
npx tsc --noEmit

# 問題なければコミット
git add -A
git commit -m "fix: P1-P3 bug fixes from test report"
git push origin main
```

### 動作確認チェックリスト

- [ ] `/marketing` でバリデーション: 1文字入力 → エラーメッセージ表示
- [ ] `/marketing` でフォーム修正ボタン → situation/fw選択がリセットされる
- [ ] `/onboarding/goal` に直接アクセス → `/onboarding/industry` にリダイレクト
- [ ] `/onboarding/business` に直接アクセス → `/onboarding/industry` にリダイレクト
- [ ] `/complete/[id]` のシェアテキストに `growl-app.vercel.app` が含まれる
- [ ] SWOT分析結果にCOVID-19が登場しない（2026年トレンドが反映される）
- [ ] 存在しないURL → カスタム404ページが表示される
- [ ] `/privacy`、`/terms` → ページが表示される
- [ ] フッターにプライバシー・利用規約・お問い合わせリンクが表示される
- [ ] フレームワーク選択時にAEOの説明文が正しく表示される
- [ ] 「そのまま使える」バッジが投稿文タイプのみに表示される
