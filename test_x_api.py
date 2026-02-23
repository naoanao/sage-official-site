import os
from dotenv import load_dotenv
import tweepy

load_dotenv()

api_key = os.getenv("TWITTER_API_KEY")
api_secret = os.getenv("TWITTER_API_SECRET")
access_token = os.getenv("TWITTER_ACCESS_TOKEN")
access_token_secret = os.getenv("TWITTER_ACCESS_TOKEN_SECRET")

print(f"Testing X API with Key: {api_key[:5]}...")

try:
    client = tweepy.Client(
        consumer_key=api_key,
        consumer_secret=api_secret,
        access_token=access_token,
        access_token_secret=access_token_secret
    )
    me = client.get_me()
    if me.data:
        print(f"✅ Success! Logged in as: {me.data['username']} (ID: {me.data['id']})")
    else:
        print("❌ Failed to get user info.")
except Exception as e:
    print(f"❌ Error: {e}")
