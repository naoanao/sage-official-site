【10行の起動ハーネス（毎セッション冒頭で必ずAIが自己適用すること）】
1. AGENTS.md と docs/adr/progress-log.md を最初に読む。
2. 今回のゴールを1つに絞り、変更対象と非対象を明記する。
3. まず Plan を出し、実装はまだ始めない。
4. 既存の挙動を守るために characterization tests を先に追加する。
5. Blueprint 抽出や配線変更は最小差分だけにする。
6. 共有状態は current_app.config など明示的な注入に寄せる。
7. 変更後は tests / lint / typecheck を通す。
8. 失敗したら原因を要約し、次の一手だけ提案する。
9. 完了時は progress-log を更新して残タスクを明記する。
10. テストが緑なら Stop here、次セッションに持ち越す。

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
