# Sage AI — 商品戦略（2026-04-14 最終確定版）

## 判断の経緯

Gumroadに7商品が存在することが判明（全て Sales: 0 / Revenue: $0）。
選択肢が多すぎて誰も買わない状態。「最初の1件」を取ることに全集中する方針に転換。

---

## 確定した商品構成

### 🥇 唯一のCTA（全コンテンツで訴求する商品）

**Sage 3.0 Developer Blueprint — $49（一回購入）**
- URL: `https://naofumi3.gumroad.com/l/apvbzh`
- ターゲット: AI・自動化に興味がある技術者・エンジニア
- 内容: 本番稼働中のAI自動化システムの完全技術実装ガイド
- 理由:
  - $49は技術者が試しやすい価格帯
  - 「Developer Blueprint」という名前が技術者に刺さる
  - すでに商品画像あり（他より本物感がある）
  - 一回購入＝シンプルで説明しやすい

---

## 他の6商品の扱い

| 商品 | 価格 | 対応 |
|------|------|------|
| 2026 AI Influencer Monetization Express | $29.99 | Unpublish推奨（古いブランド名） |
| Sage 3.0: Wisdom Edition | $99 | Unpublish推奨（何が入っているか不明瞭） |
| Sage 3.0 Fortress Edition | $299 | 保留（将来の上位商品として残す） |
| Sage 3.0 Ultimate Edition | $249 | Unpublish推奨（Fortressと重複） |
| Sage 3.0 Professional Edition | $149 | 保留（Developer Blueprintの上位として将来活用） |
| Sage 3.0 Starter Edition | $79 | Unpublish推奨（Developer Blueprintより高い） |

**Gumroad手動対応（naoさんが実施）:**
上記「Unpublish推奨」の4商品を非公開にする。

---

## 全CTAリンク（コード統一済み）

```
Primary CTA: https://naofumi3.gumroad.com/l/apvbzh ($49)
.env GUMROAD_PRODUCT_URL: 同上
blog_scheduler.py: 同上
seo_blog_agent.py: 同上
sns_daily_scheduler.py: 同上
src/config/links.js gumroad.monetization: 同上
course_production_pipeline.py: 同上
Gumroad_Sales_Page_Copy.md: 同上
```

---

## Gumroad販売文（手動貼り付け用）

`backend/cognitive/Gumroad_Sales_Page_Copy.md` の内容を
`apvbzh`（Sage 3.0 Developer Blueprint）の商品ページに貼り付け。
価格は $49 に設定。

---

## 次のマイルストーン

**Goal: 最初の1件の売上**

現状の最大の問題はトラフィックゼロ。以下の順で対処する:
1. Gumroadの不要商品をUnpublish（今すぐできる）
2. Instagramのbioリンクをapvbzhに変更（今すぐできる）
3. ブログ・SNSコンテンツが技術者向けのキーワードで流入するまで待つ
4. 最初の購入者にDMでフォローアップ → レビューを得る

最終更新: 2026-04-14
