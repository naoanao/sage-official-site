import os
import json
import random
import urllib.request
import requests
from datetime import datetime, date

BLUESKY_HANDLE = os.environ["BLUESKY_HANDLE"]
BLUESKY_PASSWORD = os.environ["BLUESKY_APP_PASSWORD"]
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")

POOL = [
    {"topic": "AI that runs while you sleep", "cat": "build"},
    {"topic": "Stop writing viral posts. Write honest ones.", "cat": "insight"},
    {"topic": "Positioning is not a tagline, it is a filter", "cat": "marketing"},
    {"topic": "Features vs outcomes in marketing copy", "cat": "insight"},
    {"topic": "Automation without audience is just logging", "cat": "build"},
    {"topic": "The question every solopreneur avoids", "cat": "insight"},
    {"topic": "3C analysis changed my restaurant pricing", "cat": "marketing"},
    {"topic": "What breaks in your system when you are not watching", "cat": "build"},
]

def bluesky_login():
    data = json.dumps({"identifier": BLUESKY_HANDLE, "password": BLUESKY_PASSWORD}).encode()
    req = urllib.request.Request(
        "https://bsky.social/xrpc/com.atproto.server.createSession",
        data=data,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        d = json.loads(resp.read())
    return d["accessJwt"], d["did"]

def generate(topic, cat):
    day = (date.today() - date(2025, 6, 1)).days + 1
    if not GROQ_API_KEY:
        return "Day " + str(day) + ". " + topic
    if cat == "build":
        prompt = "Write a BUILD-IN-PUBLIC post. Open with 'Day " + str(day) + ".' About: " + topic + ". AI is the hero. Max 220 chars. No hashtags."
    elif cat == "marketing":
        prompt = "ONE marketing principle from real experience about: " + topic + ". Max 220 chars."
    else:
        prompt = "Share ONE insight about: " + topic + ". End with a question. Max 220 chars."
    r = requests.post(
        "https://api.groq.com/openai/v1/chat/completions",
        json={"model": "llama-3.3-70b-versatile", "messages": [{"role": "user", "content": prompt}], "max_tokens": 120},
        headers={"Authorization": "Bearer " + GROQ_API_KEY}
    )
    return r.json()["choices"][0]["message"]["content"].strip()

def post_to_bluesky(token, did, text):
    full = text + "\n\n#BuildInPublic #SageAI"
    if len(full) > 300:
        full = text[:260] + "...\n#BuildInPublic"
    data = json.dumps({
        "repo": did,
        "collection": "app.bsky.feed.post",
        "record": {
            "$type": "app.bsky.feed.post",
            "text": full,
            "createdAt": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S.000Z")
        }
    }).encode()
    req = urllib.request.Request(
        "https://bsky.social/xrpc/com.atproto.repo.createRecord",
        data=data,
        headers={"Authorization": "Bearer " + token, "Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read()).get("uri", "")

item = random.choice(POOL)
print("Topic: " + item["topic"])
text = generate(item["topic"], item["cat"])
print("Text: " + text)
token, did = bluesky_login()
print("Logged in as " + BLUESKY_HANDLE)
uri = post_to_bluesky(token, did, text)
print("Posted: " + uri)
