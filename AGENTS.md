## 3段階チェックリスト
### 1. 起動の固定
- まず `AGENTS.md`、`SAGE_MASTER_CONTEXT.md`、`docs/adr/progress-log.md` を読む。
- 今回のゴールを1つに絞り、変更対象と非対象を明記する。
- OpenCode は plan 系の流れから開始し、いきなり実装しない。

### 2. 実行の分離
- Plan では調査と設計だけを行う。
- Build では最小差分だけを変更する。
- 1タスクごとに tests / lint / typecheck を実行する。
- 重い処理は可能なら非同期ジョブへ逃がす。
- 軽量タスクは軽量モデル、難所だけ重いモデルを使う。

### 3. 停止と再開（自律セーブ＆OODA自己修復ルール）
- 完了時は必ず `docs/adr/progress-log.md` を更新する。
- **main への直接コミットは禁止。** テスト検証が完了したら、隔離ブランチ `candidate/YYYYMMDD-<desc>` 上で commit candidate を作成せよ。これは main への直コミット禁止を補助する運用ルールである。
- 隔離ブランチでのコミット手順: `git checkout -b candidate/YYYYMMDD-<desc>` → `git add .` → `git commit -m "..."`。
- 【OODA型自己修復ループ】もしGitコマンドがエラー（ロックファイルの衝突、改行コード警告以外の致命的エラー、インデックス破損等）を返した場合、AIは即座に以下のOODAループを自律実行して修正せよ：
  1. [Observe] エラーログを解析し、原因（プロセスロック、未追跡ファイルの不整合等）を特定せよ。
  2. [Orient] 過去の git-001/vercel-001 等の既知の解決策（SAGE_MASTER_CONTEXT.md記載）と照合せよ。
  3. [Decide] インデックス再構築（git reset HEAD）やゾンビプロセス強制終了（taskkill）などの最適な修復手段を決定せよ。
  4. [Act] 決定した修復コマンドを実行し、再度コミットを試みよ。
- コミットが正常に成功するまでこのループを最大3回まわし、どうしても解決できない例外時のみログを要約して人間にエスカレーション（Stop here）せよ。
- セーブ成功時は次回再開用の短い handoff prompt を残して「Stop here」で停止せよ。

# AGENTS.md
## Mission
Preserve behavior while making the system more modular, testable, and restart-friendly.

## Non-negotiables
- Do not make broad refactors without a written plan.
- Add or update characterization tests before changing behavior.
- Prefer minimal diffs over clever rewrites.
- Do not touch unrelated files.
- Stop and report if external APIs, auth, billing, or destructive actions are involved.

## Completion gate
A task is complete only when relevant tests pass, changes are summarized, and the next steps are defined.

---

## SageOS Autonomy Ladder & Closeout Rules

AIエージェント（OpenCode / Sage）は、操作の危険度、影響範囲、および復旧可能性（可逆性）に応じて以下の「自律レベル（L1〜L3）」を厳格に遵守し、タスク完了時には必ず「知識の圧縮（Closeout）」を行うこと。

### 自律レベル（Autonomy Ladder）

#### L1: 完全自律実行（可逆操作・ローカル作業）
AIは人間の許可を待たずに、自律的に判断して実行・テスト・OODAループを回してよい。
- **境界条件**: いつでも1コマンド（`git reset`等）で元に戻せる（可逆性がある）操作に限定する。
- **許可タスク**:
  - `candidate/YYYYMMDD-<desc>` ブランチの作成と、同ブランチ内でのコード編集・コミット。
  - ローカル環境でのテスト実行とデバッグ（SNS自動化テスト等を含む）。
  - Playwright MCPを利用した競合リサーチやブラウザ巡回。
  - フレームワーク分析、広告コピーのテキスト生成。

#### L2: 実行後一時停止・報告（環境設定変更・起動経路の変更）
AIは操作を実行・提示してもよいが、次のステップに進む前に必ず理由を報告し、人間の確認（レビュー）を待つこと。
- **境界条件**: アプリケーションの動作前提を変える操作や、全体に波及するが復旧手順が確立されている操作。
- **許可タスク（報告必須）**:
  - **設定・認証・スケジューラ・起動経路（`flask_server.py`の初期化プロセス等）の変更。**
  - 新しいライブラリ（npm, pip等）の追加、依存関係の更新。
  - データベースのスキーマ変更、複数ファイルにまたがる一括置換。
- **行動原則**: 変更をコミット（または提示）した後、「Stop here.」で待機すること。

#### L3: 人間承認必須（不可逆操作・コスト発生・破壊的変更）
AIは**絶対に独断で実行してはならない**。必ず計画を提示し、最高司令官（人間）の明示的な承認（Approve）を得てから実行すること。
- **境界条件**: 一度実行すると元の状態に戻せない（不可逆）、または外部に重大な影響や費用を発生させる操作。
- **禁止/承認必須タスク**:
  - `candidate` ブランチから `main` ブランチへの結合（マージ）。
  - 本番環境（Vercel, Cloudflare Pages等）へのデプロイ実行。
  - Meta広告APIへの本番出稿など、外部への副作用・コスト（広告費等）が発生する操作。
  - **APIキーや本番用クレデンシャル、トークンなどの「再発行」「ローテーション」「削除」操作。**
  - プロジェクトの基幹ディレクトリやデータベースの大規模な「削除（Destructive actions）」。

### 知識の圧縮と蓄積（Closeout Rule）

AIはタスクを完了（またはL2/L3で待機）する際、必ず以下のフォーマットで自己の経験を抽象化し、ナレッジとして記録すること。

- **実行ルール**:
  セッション終了時、必ず `docs/adr/progress-log.md`（または指定のログファイル）に以下の項目を自動追記すること。
  1. **Root Cause（根本原因）**: エラーや問題の真の原因はシステム的に何だったか。
  2. **Fix（修正内容）**: どの部分をどう直したか（簡潔に）。
  3. **Abstract Lesson（抽象教訓）**: 今回の事象から得た、システムやプロンプト設計における「普遍的な1行の教訓」。
