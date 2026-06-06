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
