import os
import tweepy
from dotenv import load_dotenv

# Set 1
api_key = "nIeLoPcgOrOhOJW9DKuSfoNc9"
api_secret = "K8C7xP2VeYWOieCXTX95rhKMS4krg9apjOkkvL9UOJRdlueFlg"
access_token = "1420203466505396227-jfS8GPOwfvlUcZ4XFycdoDQFlo69SDg"
access_token_secret = "sfoVNf7zIlyvVB2LBtj05e42UZApLG5MfnSW7WqZoBi7K"

print(f"Testing X API Set 1...")

try:
    client = tweepy.Client(
        consumer_key=api_key,
        consumer_secret=api_secret,
        access_token=access_token,
        access_token_secret=access_token_secret
    )
    # Try a simple tweet instead of get_me to verify write access
    response = client.create_tweet(text="Sage AI D1 Loop Connection Test. #SageAI")
    print(f"✅ Success! Tweet ID: {response.data['id']}")
except Exception as e:
    print(f"❌ Error: {e}")
