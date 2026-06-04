# ADR-0002: Unified Authentication — Blueprint-Level Auth Design

- **Status**: [Fully Implemented / Closed]
- **Date**: 2026-06-04
- **Drivers**: nao (Owner), Sage v4.0 Architecture

---

## Context

現在、認証は各エンドポイントにインライン実装されており、以下の問題がある:

1. **一貫性の欠如**: 同じ `X-SAGE-ADMIN-TOKEN` チェックが `system.py` と `flask_server.py` に重複
2. **見落としリスク**: Store BP 内に認証なしルートが11件存在 (Webhook除く)
3. **メンテナンス負荷**: 新しいBP追加時に認証パターンを再実装する必要がある
4. **テスト困難**: 認証ロジックが分散しており、一括モックできない

現在の認証パターン:
- **Admin Token**: `X-SAGE-ADMIN-TOKEN` ヘッダー + `SAGE_ADMIN_TOKEN` env var (brake toggle, admin endpoints)
- **Test Mode**: `X-Sage-Test-Mode` ヘッダー (productize endpoints)
- **Webhook Signature**: Stripe (`Stripe-Signature`), Whop (`X-Whop-Signature-256`)
- **Public**: チェックアウト, ストアCRUD, ステータス系 — 認証なし

---

## Decision

各Blueprintの `before_request` ハンドラで認証を共通化する。
`flask.g` に認証結果を保存し、各ルートから参照可能にする。

### 設計案

```python
# backend/utils/auth.py （実装済み）

import logging
import os
from enum import Enum
from functools import wraps
from flask import g, jsonify, request

logger = logging.getLogger(__name__)

class AuthStrategy(Enum):
    PUBLIC = "public"
    ADMIN_TOKEN = "admin_token"
    TEST_MODE = "test_mode"

def require_admin_token():
    """X-SAGE-ADMIN-TOKEN と SAGE_ADMIN_TOKEN を比較"""
    admin_token = os.getenv("SAGE_ADMIN_TOKEN")
    if not admin_token:
        return None  # env未設定の場合はスキップ（後方互換）
    provided = request.headers.get("X-SAGE-ADMIN-TOKEN")
    if not provided or provided != admin_token:
        logger.warning(f"Unauthorized admin access attempt from {request.remote_addr}")
        return jsonify({"status": "error", "message": "Unauthorized"}), 401
    return None

def admin_required(f):
    """Decorator: require valid admin token for a route."""
    @wraps(f)
    def wrapper(*args, **kwargs):
        result = require_admin_token()
        if result:
            return result
        return f(*args, **kwargs)
    return wrapper

def apply_public_strategy():
    """No-op: mark request as public and continue."""
    g.auth_strategy = AuthStrategy.PUBLIC.value
```

### Blueprintへの適用パターン

**パターンA: Blueprint単位の一括認証**（`store_bp` など全ルート共通の場合）

```python
# backend/routes/store.py
@store_bp.before_request
def store_auth():
    g.auth = {"strategy": "public"}
    # 必要に応じてここで ADMIN_TOKEN チェック
```

**パターンB: ルート単位の個別認証**（`system_bp` など混在の場合）

Blueprintの `before_request` では軽い前処理のみ行い、
ルートごとにデコレータで認証を適用:

```python
# backend/routes/system.py
@system_bp.before_request
def system_auth():
    g.auth_checked = False

def admin_required(f):
    """ルート単位のadmin token要求デコレータ"""
    from functools import wraps
    @wraps(f)
    def wrapper(*args, **kwargs):
        token = os.getenv("SAGE_ADMIN_TOKEN", "")
        provided = request.headers.get("X-SAGE-ADMIN-TOKEN", "")
        if token and provided != token:
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return wrapper
```

### 移行計画

| Phase | 内容 | 状態 |
|-------|------|------|
| **Phase 1** | `backend/utils/auth.py` 作成、`AuthStrategy` enum + ヘルパー関数 | ✅ 完了 |
| **Phase 2** | `store_bp` に `before_request` 導入 (PUBLIC戦略) — 12 tests green | ✅ 完了 |
| **Phase 3** | `system_bp` に `before_request` + `api_brake_toggle` に `@admin_required` | ✅ 完了 |
| **Phase 4** | `flask_server.py` 内インライン認証のBP移行 | ✅ 完了 |
| **Phase 5** | テスト: 認証モックの共通化 (`conftest.py` に `mock_auth` fixture) | ⏳ 未着手 |

---

## Consequences

- **Good**: 新しいBlueprint追加時、認証戦略を選ぶだけで済む
- **Good**: `flask.g` に認証情報を保存 → ルート内で `g.current_user` 等に拡張可能
- **Good**: テストで BP単位の認証モックが容易になる
- **Risky**: Webhook署名検証はルート固有のロジックのため、`before_request` ではなくルート内に残す
- **Risky**: 既存の `@app.before_request` (request tracking) と競合しない設計にする
- **Risky**: Phase 2 (Store BP) のルートは現在すべて認証なし — 認証追加時は破壊的変更になりうる

---

## Rejected Alternatives

1. **Flask-HTTPAuth ライブラリ**: 依存追加。現状のシンプルなトークンチェックにはオーバーキル
2. **ミドルウェア (WSGI)**: ルート単位の制御が難しく、Blueprintの利点を活かせない
3. **`@app.before_request` 共通ハンドラ**: 全ルートに一律適用 → 公開エンドポイントに影響

---

## Implementation Log

### 2026-06-04 — Phase 1〜3 実装完了 (system.py + store.py)

**作成**: `backend/utils/__init__.py`, `backend/utils/auth.py`
**変更**:
- `backend/routes/system.py`: `@system_bp.before_request` + `api_brake_toggle` に `@admin_required`
- `backend/routes/store.py`: `@store_bp.before_request` (PUBLIC)
**確認**: 12/12 payment characterization tests green ✅
**既存のURL/レスポンス**: 変更なし

---

## Follow-up

- Phase 5: 認証テスト用 conftest 拡張 (`mock_auth` fixture) — optional future work
- SNS/Publishing BP 分割時には本デザインに従って `before_request` を追加 (済)

## Implementation Log

### 2026-06-04 — Phase 4 完了 (flask_server.py inline auth → @admin_required)

**変更**:
- `backend/flask_server.py`: `admin_strategy` ルートのインライン `X-SAGE-ADMIN-TOKEN` チェックを削除し、`backend.utils.auth.admin_required` デコレータに置換
**確認**: 45/45 characterization tests green ✅
**残存インライン認証**: 0件 — 全認証がBlueprintレベルまたは共有ユーティリティに統合済み
