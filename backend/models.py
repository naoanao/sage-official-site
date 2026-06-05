from extensions import db, bcrypt
import uuid
from datetime import datetime, timedelta

class User(db.Model):
    __tablename__ = 'users'
    __table_args__ = {'extend_existing': True}

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    api_key = db.Column(db.String(36), unique=True, nullable=False, default=lambda: str(uuid.uuid4()))
    plan = db.Column(db.String(20), nullable=False, default='free') # e.g., 'free', 'pro'
    contract_analysis_count = db.Column(db.Integer, nullable=False, default=3) # Remaining analyses for free users
    contract_analysis_reset_date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow) # Date when count resets
    summarization_count = db.Column(db.Integer, nullable=False, default=5) # Default to 5 free summaries
    summarization_reset_date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow) # Date when summarization count resets
    api_call_count = db.Column(db.Integer, nullable=False, default=0)
    api_call_reset_date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    stripe_subscription_id = db.Column(db.String(255), nullable=True)
    stripe_customer_id = db.Column(db.String(255), nullable=True)
    achievements = db.Column(db.JSON, nullable=False, default=lambda: []) # New field for gamification
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    def __init__(self, username, email):
        self.username = username
        self.email = email

    def __repr__(self):
        return '<User %r>' % self.username

    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')

    def check_password(self, password):
        import logging
        # logging.basicConfig(level=logging.DEBUG) # Removed to avoid conflict
        logging.debug(f"check_password: Stored hash: {self.password_hash}, Type: {type(self.password_hash)}, Length: {len(self.password_hash)}")
        logging.debug(f"check_password: Provided password: {password}, Type: {type(password)}, Length: {len(password)}")
        try:
            return bcrypt.check_password_hash(self.password_hash, password)
        except ValueError as e:
            logging.error(f"ValueError during password check: {e}")
            return False

    def to_dict(self):
        """Returns a dictionary representation of the user, safe for JSON serialization."""
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'plan': self.plan,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Task(db.Model):
    __tablename__ = 'tasks'
    __table_args__ = {'extend_existing': True}

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    status = db.Column(db.String(30), nullable=False, default='queued') # e.g., 'queued', 'processing', 'generating content', 'posting', 'completed', 'failed'
    prompt = db.Column(db.Text, nullable=True)
    result = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    updated_at = db.Column(db.DateTime, server_default=db.func.now(), onupdate=db.func.now())

    user = db.relationship('User', backref=db.backref('tasks', lazy=True))

    def to_dict(self):
        return {
            'id': self.id,
            'status': self.status,
            'prompt': self.prompt,
            'result': self.result,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return f'<Task {self.id}>'
