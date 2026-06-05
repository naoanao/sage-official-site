import enum
import os
import logging
from flask import Blueprint, request, jsonify, g
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from models import User
from sqlalchemy.exc import IntegrityError
from extensions import db

# Configure logging for auth.py
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')

    if not username or not email or not password:
        return jsonify({"error": "Missing username, email, or password"}), 400

    existing_user = User.query.filter_by(email=data['email']).first()
    if existing_user:
        return jsonify({"error": "Email already registered"}), 409

    new_user = User(username=username, email=email)
    new_user.set_password(password)
    try:
        db.session.add(new_user)
        db.session.commit()
        # 登録成功時にアクセストークンを生成して返す
        access_token = create_access_token(identity=str(new_user.id))
        return jsonify({"message": f"User {username} created successfully", "access_token": access_token, "user": new_user.to_dict()}), 201
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "Email already registered (race condition)"}), 409

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    logger.debug(f"Login attempt for email: {email}")
    logger.debug(f"Password provided: {password}")

    if not email or not password:
        return jsonify({"error": "Missing email or password"}), 400

    user = User.query.filter_by(email=email).first()

    if user and user.check_password(password):
        access_token = create_access_token(identity=str(user.id))
        return jsonify({"access_token": access_token, "user": user.to_dict()}), 200
    else:
        logger.debug(f"Password check failed for user {email}")
        return jsonify({"error": "Invalid credentials"}), 401

class AuthStrategy(enum.Enum):
    PUBLIC = "public"
    ADMIN_TOKEN = "admin_token"
    TEST_MODE = "test_mode"


def require_admin_token():
    token = request.headers.get('X-SAGE-ADMIN-TOKEN', '')
    env_token = os.getenv('SAGE_ADMIN_TOKEN', '')
    if env_token and token != env_token:
        return jsonify({'error': 'Unauthorized'}), 401
    return None


def admin_required(f):
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        resp = require_admin_token()
        if resp:
            return resp
        return f(*args, **kwargs)
    return decorated


def apply_public_strategy():
    g.auth_strategy = AuthStrategy.PUBLIC


@auth_bp.route('/protected', methods=['GET'])
@jwt_required()
def protected():
    current_user_id = get_jwt_identity()
    return jsonify(logged_in_as=current_user_id), 200
