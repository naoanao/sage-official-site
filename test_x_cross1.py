import os
import tweepy

# Consumer Keys from Set 4
api_key = "jRZgGxG3BcXv6jtKtPu9HM9bf"
api_secret = "J7SyMS9BrBEjIHEcfEveUDjNCczLk7jWQ6I80ohobr6POEJjah"

# Access Tokens from Set 3
access_token = "2017422095643512836-Q3p0Y7Ab795dzYEuaqOPqcbnXGRy1z"
access_token_secret = "ofaH1qjKIZIQdPYTU1FCXxgSlxXTkmHR153EyM0PnmV28"

print(f"Testing X API (Set 4 Consumer + Set 3 Tokens)...")

try:
    client = tweepy.Client(
        consumer_key=api_key,
        consumer_secret=api_secret,
        access_token=access_token,
        access_token_secret=access_token_secret
    )
    response = client.create_tweet(text="Sage AI D1 Loop Connection Test (Cross Sample). #SageAI")
    print(f"✅ Success! Tweet ID: {response.data['id']}")
except Exception as e:
    print(f"❌ Error: {e}")
