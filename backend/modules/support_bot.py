"""
SupportBot v1.0 — AI自動サポート応答システム
代行サービスなしで購入者・見込み客の質問に24時間対応する。

用途:
  1. メール問い合わせへの自動応答（Flask endpoint: /api/support/email）
  2. SageMiniChatの製品サポートモード
  3. Webhookからのお問い合わせ処理（Make.com経由）

SOUL.md準拠: 誠実・正確な回答のみ。不確かな場合は「わかりません」と伝える。
"""
import os
import logging
from pathlib import Path
from functools import lru_cache

logger = logging.getLogger(__name__)

SUPPORT_FAQ_PATH = Path("backend/sage_knowledge_base/SUPPORT_FAQ.md")
PRODUCT_STRATEGY_PATH = Path("PRODUCT_STRATEGY.md")


@lru_cache(maxsize=1)
def _load_knowledge_base() -> str:
    """FAQと商品情報を読み込んでキャッシュする"""
    content = []

    if SUPPORT_FAQ_PATH.exists():
        content.append(SUPPORT_FAQ_PATH.read_text(encoding="utf-8"))

    if PRODUCT_STRATEGY_PATH.exists():
        # 商品情報の上部だけ取得（価格・URL）
        strategy = PRODUCT_STRATEGY_PATH.read_text(encoding="utf-8")
        content.append(strategy[:2000])

    return "\n\n---\n\n".join(content)


def _build_support_prompt(user_question: str, language: str = "auto") -> str:
    """サポート応答用のプロンプトを生成する"""
    knowledge = _load_knowledge_base()

    lang_instruction = {
        "ja": "日本語で回答してください。",
        "en": "Reply in English.",
        "auto": "Detect the language of the question and reply in the same language (Japanese or English).",
    }.get(language, "Detect the language and reply accordingly.")

    return f"""You are the Sage AI customer support bot. You answer questions from customers and prospects about the Sage AI product.

KNOWLEDGE BASE:
{knowledge}

INSTRUCTIONS:
- {lang_instruction}
- Be helpful, concise, and honest.
- If the answer is in the knowledge base, use it directly.
- If you don't know the answer, say so clearly and direct them to support@sage-ai.app.
- Never make up prices, features, or guarantees not listed in the knowledge base.
- Keep replies under 200 words unless a detailed technical explanation is needed.
- End every reply with: "Further questions? Email support@sage-ai.app"

CUSTOMER QUESTION:
{user_question}

REPLY:"""


class SupportBot:
    """
    AI自動サポートボット。
    購入者・見込み客の質問に知識ベースを使って自動回答する。
    """

    def __init__(self):
        self.groq_api_key = os.getenv("GROQ_API_KEY", "")
        self.support_email = os.getenv("VITE_SUPPORT_EMAIL", "support@sage-ai.app")

    def answer(self, question: str, language: str = "auto") -> str:
        """
        質問に対してAI応答を生成する。
        Groq APIが使えない場合はFAQから直接回答を試みる。
        """
        if not question or len(question.strip()) < 3:
            return "ご質問の内容が短すぎます。詳しく教えていただけますか？"

        # Groq APIで生成
        if self.groq_api_key:
            try:
                from groq import Groq
                client = Groq(api_key=self.groq_api_key)
                prompt = _build_support_prompt(question, language)
                resp = client.chat.completions.create(
                    messages=[{"role": "user", "content": prompt}],
                    model="llama-3.3-70b-versatile",
                    max_tokens=400,
                    temperature=0.3,
                )
                answer = resp.choices[0].message.content.strip()
                logger.info(f"SupportBot answered: {question[:60]}...")
                return answer
            except Exception as e:
                logger.error(f"SupportBot Groq error: {e}")

        # フォールバック
        return (
            "ご質問ありがとうございます。現在AIサポートが一時的に利用できない状態です。"
            f"{self.support_email} までメールをお送りください。24時間以内に回答いたします。"
        )

    def handle_email_inquiry(self, sender_email: str, subject: str, body: str) -> dict:
        """
        メール問い合わせを受け取りAI応答を生成する。
        Make.comのWebhook経由で呼び出される。

        Returns:
            {
                "to": sender_email,
                "subject": "Re: ...",
                "body": "...",
                "should_send": bool
            }
        """
        from backend.modules.gatekeeper import gatekeeper
        if not gatekeeper.verify_action("email_send", {"to": sender_email, "type": "support"}):
            return {"should_send": False, "reason": "blocked_by_gatekeeper"}

        # 言語推定
        has_japanese = any(ord(c) > 0x3000 for c in body)
        language = "ja" if has_japanese else "en"

        question = f"Subject: {subject}\n\n{body}"
        response_body = self.answer(question, language)

        if language == "ja":
            reply_subject = f"Re: {subject}"
            footer = f"\n\n---\nSage AI サポート\n{self.support_email}"
        else:
            reply_subject = f"Re: {subject}"
            footer = f"\n\n---\nSage AI Support\n{self.support_email}"

        return {
            "to": sender_email,
            "subject": reply_subject,
            "body": response_body + footer,
            "should_send": True,
            "language": language,
        }


# Flask endpoint用のヘルパー
def register_support_endpoints(app):
    """FlaskアプリにサポートAPIエンドポイントを登録する"""
    from flask import request, jsonify
    bot = SupportBot()

    @app.route("/api/support/ask", methods=["POST"])
    def support_ask():
        """SageMiniChat・外部ウィジェットからの質問に回答"""
        data = request.json or {}
        question = data.get("question", "")
        language = data.get("language", "auto")
        if not question:
            return jsonify({"error": "question is required"}), 400
        answer = bot.answer(question, language)
        return jsonify({"answer": answer})

    @app.route("/api/support/email-webhook", methods=["POST"])
    def support_email_webhook():
        """Make.com経由のメール問い合わせWebhookを処理"""
        data = request.json or {}
        sender = data.get("from", "")
        subject = data.get("subject", "")
        body = data.get("body", "")
        if not sender or not body:
            return jsonify({"error": "from and body are required"}), 400
        result = bot.handle_email_inquiry(sender, subject, body)
        return jsonify(result)

    logger.info("✅ SupportBot endpoints registered: /api/support/ask, /api/support/email-webhook")
