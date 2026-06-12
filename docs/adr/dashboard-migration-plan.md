# ADR: Sage 旧管理ダッシュボード → Growl 移植計画

## ステータス

Draft（2026-06-12） — 解析・設計のみ。実装未着手。

---

## 1. 現状分析

### 1.1 移管元資産

旧 Sage 3.0 フロントエンド（`frontend/`）に存在する管理画面関連コード：

| ファイル | 行数 | 役割 | API依存 |
|----------|------|------|---------|
| `pages/admin/Dashboard.jsx` | 114 | 管理画面メインページ（4xKPI + 4widget） | `/api/system/stats/detailed` |
| `components/SystemMetricsWidget.jsx` | 138 | システムメトリクス + SNS内訳 | `/api/system/stats/detailed`, `/api/sns/stats` |
| `components/BrainStatsWidget.jsx` | 61 | Neuromorphic Brain 統計 | `/api/brain/stats` |
| `components/KnowledgeBankWidget.jsx` | 73 | ナレッジベース検索 + トピック | `/api/knowledge/stats` |
| `components/ContentDashboardWidget.jsx` | 65 | コンテンツパイプライン統計 | `/api/content/stats` |
| `components/SpaceBackground.jsx` | 94 | Canvas 星空背景アニメーション | **なし**（完全自己完結） |
| `utils/tracking.js` | 45 | ファネルイベント追跡 | `/api/track` |
| `utils/env.js` | 26 | 環境判定 | なし |

### 1.2 API エンドポイント互換性評価

| エンドポイント | 旧Flask | Growl Next.js | 状態 |
|---------------|---------|---------------|------|
| `/api/system/stats/detailed` | **未実装（broken）** | なし | 🔴 そもそも動かない |
| `/api/brain/stats` | ✅ `brain.py:590` | なし | 🟡 Flask稼働時のみ |
| `/api/knowledge/stats` | **未実装（broken）** | なし | 🔴 そもそも動かない |
| `/api/content/stats` | **未実装（broken）** | なし | 🔴 そもそも動かない |
| `/api/sns/stats` | ✅ `publish.py:19` | なし | 🟡 Flask稼働時のみ |
| `/api/track` | ✅ CF Functions `track.js` | なし | 🟢 CF側で代替可能 |

**結論**: 旧管理画面は **6 エンドポイント中 3 つが既に壊れており**、Growl との API 互換性は **ゼロ**。

### 1.3 コード結合度マトリクス

| コンポーネント | 外部npm依存 | 内部依存 | 移植難易度 |
|---------------|-----------|---------|-----------|
| SpaceBackground | reactのみ | なし | **L1: そのまま移植可能** |
| tracking.js | なし | env.js | **L1: CF Function が代替** |
| Dashboard.jsx | react, axios | 4widget | L3: 全widget次第 |
| BrainStatsWidget | react, axios, react-icons/fi | なし | L2: API作成が必要 |
| SystemMetricsWidget | react, axios, react-icons/fi | なし | L3: 2API中1つbroken |
| KnowledgeBankWidget | react, axios, react-icons/fi | なし | L3: API broken |
| ContentDashboardWidget | react, axios, react-icons/fi | なし | L3: API broken |

---

## 2. 移植候補と優先順位

### Phase 1 🟢: SpaceBackground（即日・ゼロリスク）

**ファイル**: `frontend/src/components/SpaceBackground.jsx` → `ai-marketing-app/components/SpaceBackground.tsx`

**難易度**: 最低。TypeScript 化 + Tailwind 調整のみ。

**作業**:
1. `SpaceBackground.tsx` として新規作成（JSX → TSX、型付け）
2. Growl の既存 LP（`app/page.tsx`）または管理画面に `className="fixed inset-0 -z-10 pointer-events-none"` で配置
3. `npm run lint` 確認

**リスク**: なし。既存画面に影響を与えず背景レイヤーとして追加可能。

**推定工数**: 30分

### Phase 2 🟡: tracking.js 統合

**現状**: Growl の `components/AdBoostCard.tsx` などにインラインで `track()` が分散。統一の価値はあるが現状でも動作している。

**判断**: **保留**。現状の分散 tracking は機能している。CF Pages Function `track.js` は既存。統合するメリットが現時点では薄い。

### Phase 3 🟡: 管理ダッシュボード（KPI カード＋BrainStats）

**ファイル**: `Dashboard.jsx` + `BrainStatsWidget.jsx`

**前提条件**: Flask バックエンドが `run_sage.ps1` で起動していること。

**設計判断**:
- Growl 内に `/admin` ルートを生やし、Flask がオンラインの場合のみデータ表示
- Flask のエンドポイントを Growl の Next.js API Route から BFF (Backend For Frontend) 経由でプロキシ
- BrainStatsWidget と SystemMetricsWidget（SNS部分のみ）が表示可能
- KnowledgeBankWidget / ContentDashboardWidget は API が壊れているため移植対象外

**推定工数**: 2〜3時間

### Phase X 🔴: 全機能再設計

KnowledgeBank / ContentDashboard の旧 API は broken。Growl のデータモデル（Supabase users, weekly_sessions, revenue_events）から新しい指標を設計すべき。旧コードの移植ではなく、Growl ネイティブの管理画面として再設計する。

**判断**: 有料ユーザーが増え、管理画面の需要が生じてから着手。

---

## 3. 最短実装手順（Phase 1 のみ確定）

```
Step 1: ai-marketing-app/components/SpaceBackground.tsx 作成（TSX変換）
Step 2: app/page.tsx の hero セクションに background として追加
Step 3: npm run lint 確認
Step 4: commit → candidate ブランチ
```

### SpaceBackground.tsx インターフェース設計

```typescript
// props: なし（完全自動）
// 内部で useRef + requestAnimationFrame ループ
// Canvas 200 星 パララックス + きらめき
// position: fixed, z-index: -1
// 背景色: #000 に固定（Growl の white/indigo テーマと要調整）
```

---

## 4. リスク評価

| リスク | 確度 | 影響 | 対策 |
|--------|------|------|------|
| SpaceBackground が白背景ページと衝突 | 低 | 中 | `pointer-events-none` + `-z-10`、白背景ページでは非表示に |
| BrainStatsWidget の API が空データを返す | 中 | 低 | fallback UI（「Flaskが起動していません」）を表示 |
| 管理画面ルート追加で認証バイパス | 低 | 高 | `/admin` には ADMIN_SECRET 必須 or localhost only |
| 旧API broken に気づかず移植して無駄工数 | — | — | ✅ 本ADRで事前特定済み |

---

## 5. 移植しないと判断したもの

| 資産 | 理由 |
|------|------|
| KnowledgeBankWidget | API broken、Growl に該当データなし |
| ContentDashboardWidget | API broken、Growl に該当データなし |
| SystemMetricsWidget（完全版） | API broken（token budget等はFlask固有） |
| tracking.js 統合 | 現状の分散 tracking が機能しており、優先度低い |
| App.jsx のルーティング | React Router → Next.js App Router に性質が違いすぎる |

---

## 6. 参考：Growl が現在持っている管理系データ

| データ | 取得元 | 用途 |
|--------|--------|------|
| ユーザープラン | Supabase `users.plan` | 課金状態 |
| 売上サマリー | Supabase `revenue_events` | 収益レポート |
| 週次アクション完了率 | Supabase `weekly_sessions.completed_count` | エンゲージメント |
| 診断結果 | Supabase `power_diagnoses` | 診断統計 |
| API 使用量 | localStorage `growl_monthly_usage` | FreeProgressBar |

これらを元にした「Growl 管理画面」の設計は Phase X で別途検討。
