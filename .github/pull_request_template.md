# 🚀 Pull Request Template

## 🧠 D1: Knowledge Loop Compliance

本PRが「賢者の知能（知識統合ループ）」に与える影響を確認してください。

- [ ] **D1 Gate (Actions) がパスしているか**: `D1 Knowledge Loop (Mock)` ワークフローが正常終了していることを確認してください。
- [ ] **知識の循環（Loop）が維持されているか**: 修正により、生成されたコンテンツが Brain (ChromaDB) に再統合されるフローが壊れていないか確認してください。
- [ ] **メタデータ・スキーマの遵守**: 新しいメタデータを追加する場合、`retrieved_at` 等の既存スキーマと整合しているか確認してください。

## 📊 検証エビデンス (CI Artifacts)

GitHub Actions の `ci_debug_bundle` をダウンロードして、以下の証拠を確認することを推奨します。

1. **`ci_metadata_snapshot.json`**:
   - 統合された知識のメタデータが期待通りか（`topic`, `note_path`, `sources` 等）。
2. **`ci_flask.log`**:
   - `🧪 Paper Knowledge injected successfully.` が出力されているか（正本参照の証拠）。
   - `🧠 Research summary integrated back into Brain.` が出力されているか（統合の証拠）。

## 📝 変更内容の概要
<!-- ここに修正内容を記述してください -->

## ⚠️ 注意事項

- 添付の `course_production_pipeline.py` は古い版が混在する可能性があるため、必ず本リポジトリの `main/HEAD` を正本として扱ってください。
