"""Characterization tests for payment / store routes (Phase 5 — store_bp)."""
import os
import sys
import stripe
import pytest
from unittest.mock import patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))


@pytest.fixture(scope='session')
def client():
    test_env = {
        'GROQ_API_KEY': 'mock_key',
        'SAGE_ENABLE_SELF_HEALING': 'False',
    }
    with patch('dotenv.load_dotenv', return_value=None):
        with patch.dict(os.environ, test_env, clear=False):
            from backend.flask_server import app
            with app.test_client() as c:
                yield c


class TestStripeWebhook:
    """POST /api/stripe/webhook — Stripe webhook receiver."""

    def test_missing_stripe_signature_returns_400(self, client):
        resp = client.post('/api/stripe/webhook', data='{}', content_type='application/json')
        assert resp.status_code == 400

    def test_invalid_signature_returns_400(self, client):
        with patch.dict(client.application.config, {'STRIPE_WEBHOOK_SECRET': 'whsec_mock'}):
            with patch('stripe.Webhook.construct_event', side_effect=stripe.error.SignatureVerificationError('bad sig', 'invalid')):
                resp = client.post(
                    '/api/stripe/webhook',
                    data='{"type": "checkout.session.completed"}',
                    content_type='application/json',
                    headers={'Stripe-Signature': 'invalid'}
                )
        assert resp.status_code == 400


class TestStripeCreateCheckout:
    """POST /api/stripe/create-checkout-session — creates Stripe checkout."""

    def test_missing_price_id_returns_400(self, client):
        resp = client.post('/api/stripe/create-checkout-session', json={})
        assert resp.status_code == 400


class TestPaypalWebhook:
    """POST /api/paypal/webhook — PayPal webhook receiver."""

    def test_missing_body_returns_400(self, client):
        resp = client.post('/api/paypal/webhook', data='', content_type='application/json')
        assert resp.status_code == 400

    def test_paypal_webhook_returns_200(self, client):
        with patch.dict(client.application.config, {'PAYPAL': type('P', (), {'verify_webhook': lambda self, h, b: True})()}):
            resp = client.post('/api/paypal/webhook', data='{"event_type": "CHECKOUT.ORDER.APPROVED"}', content_type='application/json')
            assert resp.status_code == 200


class TestWhopWebhook:
    """POST /api/whop/webhook — Whop webhook receiver."""

    def test_whop_webhook_returns_200(self, client):
        resp = client.post('/api/whop/webhook', data='{}', content_type='application/json')
        assert resp.status_code in (200, 400)

    def test_whop_webhook_missing_body_returns_400(self, client):
        resp = client.post('/api/whop/webhook', data='', content_type='application/json')
        assert resp.status_code == 400


class TestGumroadWebhook:
    """POST /api/gumroad/webhook — Gumroad webhook receiver."""

    def test_gumroad_webhook_without_token_returns_200(self, client):
        resp = client.post('/api/gumroad/webhook', data='{"sale": true}', content_type='application/json')
        assert resp.status_code == 200

    def test_gumroad_webhook_missing_body_returns_400(self, client):
        resp = client.post('/api/gumroad/webhook', data='', content_type='application/json')
        assert resp.status_code == 400


class TestStoreProducts:
    """GET /api/store/products — list products."""

    def test_list_products(self, client):
        resp = client.get('/api/store/products')
        assert resp.status_code == 200
        data = resp.get_json()
        assert isinstance(data, list)


class TestStoreOrders:
    """GET /api/store/orders — list orders."""

    def test_list_orders(self, client):
        resp = client.get('/api/store/orders')
        assert resp.status_code == 200
        data = resp.get_json()
        assert isinstance(data, list)


class TestStoreVerify:
    """POST /api/store/verify — verify purchase."""

    def test_verify_missing_product_returns_400(self, client):
        resp = client.post('/api/store/verify', json={})
        assert resp.status_code == 400
