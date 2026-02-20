# 🧪 Sage Pilot 論文知識 - Single Source of Truth (聖典)

## 📌 基本方針

本フォルダ (`backend/brain/paper_knowledge/`) は、Sageが論文調査・技術調査を行う際の**唯一の正本 (Single Source of Truth)** です。
生成AIが「もっともらしく嘘を吐く (Hallucination)」ことを防ぐため、以下のガイドラインを強制します。

## 📜 調査・生成ガイドライン

1. **証拠の固定**:
   - 調査結果には必ず `## 🧪 Research Context & Evidence` セクションを付与し、Query, Used-guidelines, URLs/Sources, Date を明記すること。
2. **優先参照**:
   - Web検索よりも先に、ChromaDBの `research_summary` および本フォルダの情報を優先して引用すること。
3. **成果物フォーマット**:
   - 専門用語には用語解説を付加し、読者が一次ソース（論文DOI等）に辿り着ける情報を残すこと。

## 🚫 禁止事項

- 本フォルダ以外に調査ロジックの「正本」を分散させることの禁止（二重知識構造の禁止）。
- 根拠のない「断定」の回避。不明な点は「現時点の調査範囲では不明」と明記すること。

## 🔄 運用フロー

1. 研究テーマの選定
2. 本聖典に基づくコンテキスト注入
3. コンテンツ生成
4. 生成サマリーのBrain (ChromaDB) への再統合 (統合C)
