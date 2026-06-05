import json
import os
import stripe
from flask import Blueprint, request, jsonify, current_app

store_bp = Blueprint('store_bp', __name__)


@store_bp.route('/api/stripe/webhook', methods=['POST'])
def stripe_webhook():
    payload = request.get_data()
    sig_header = request.headers.get('Stripe-Signature')
    if not sig_header:
        return jsonify({'error': 'Missing Stripe-Signature header'}), 400
    endpoint_secret = current_app.config.get('STRIPE_WEBHOOK_SECRET', os.getenv('STRIPE_WEBHOOK_SECRET'))
    if not endpoint_secret:
        return jsonify({'error': 'Stripe webhook secret not configured'}), 500
    try:
        event = stripe.Webhook.construct_event(payload, sig_header, endpoint_secret)
    except ValueError:
        return jsonify({'error': 'Invalid payload'}), 400
    except stripe.error.SignatureVerificationError:
        return jsonify({'error': 'Invalid signature'}), 400
    event_type = event.get('type')
    if event_type == 'checkout.session.completed':
        session = event['data']['object']
        current_app.logger.info(f"Stripe checkout completed: {session.get('id')}")
    return jsonify({'status': 'ok'}), 200


@store_bp.route('/api/stripe/create-checkout-session', methods=['POST'])
def create_checkout_session():
    data = request.get_json()
    if not data or not data.get('price_id'):
        return jsonify({'error': 'price_id is required'}), 400
    price_id = data['price_id']
    success_url = data.get('success_url', 'http://localhost:5173/success')
    cancel_url = data.get('cancel_url', 'http://localhost:5173/cancel')
    try:
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{'price': price_id, 'quantity': 1}],
            mode='subscription',
            success_url=success_url,
            cancel_url=cancel_url,
        )
        return jsonify({'url': checkout_session.url}), 200
    except stripe.error.StripeError as e:
        return jsonify({'error': str(e)}), 500


@store_bp.route('/api/paypal/webhook', methods=['POST'])
def paypal_webhook():
    payload = request.get_data(as_text=True)
    if not payload:
        return jsonify({'error': 'Empty payload'}), 400
    headers = dict(request.headers)
    paypal_config = current_app.config.get('PAYPAL')
    if paypal_config and hasattr(paypal_config, 'verify_webhook'):
        verified = paypal_config.verify_webhook(headers, payload)
        if not verified:
            return jsonify({'error': 'Webhook verification failed'}), 400
    return jsonify({'status': 'ok'}), 200


@store_bp.route('/api/whop/webhook', methods=['POST'])
def whop_webhook():
    payload = request.get_data(as_text=True)
    if not payload:
        return jsonify({'error': 'Empty payload'}), 400
    return jsonify({'status': 'ok'}), 200


@store_bp.route('/api/gumroad/webhook', methods=['POST'])
def gumroad_webhook():
    payload = request.get_data(as_text=True)
    if not payload:
        return jsonify({'error': 'Empty payload'}), 400
    return jsonify({'status': 'ok'}), 200


@store_bp.route('/api/store/products', methods=['GET'])
def list_products():
    return jsonify([])


@store_bp.route('/api/store/products', methods=['POST'])
def create_product():
    data = request.get_json()
    if not data or not data.get('name'):
        return jsonify({'error': 'name is required'}), 400
    return jsonify({'status': 'created', 'product': data}), 200


@store_bp.route('/api/store/products', methods=['PUT'])
def update_product():
    data = request.get_json()
    if not data or not data.get('id'):
        return jsonify({'error': 'id is required'}), 400
    return jsonify({'status': 'updated', 'product': data}), 200


@store_bp.route('/api/store/products', methods=['DELETE'])
def delete_product():
    data = request.get_json()
    if not data or not data.get('id'):
        return jsonify({'error': 'id is required'}), 400
    return jsonify({'status': 'deleted'}), 200


@store_bp.route('/api/store/orders', methods=['GET'])
def list_orders():
    return jsonify([])


@store_bp.route('/api/store/verify', methods=['POST'])
def verify_purchase():
    data = request.get_json()
    if not data or not data.get('product_id'):
        return jsonify({'error': 'product_id is required'}), 400
    return jsonify({'status': 'verified'}), 200
