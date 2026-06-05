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

### 3. 停止と再開
- 完了時は必ず `docs/adr/progress-log.md` を更新する。
- テストが緑なら Stop here して止まる。
- 次回再開用の短い handoff prompt を残す。
- 残タスクは 3つ以内に分割して記録する。

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
