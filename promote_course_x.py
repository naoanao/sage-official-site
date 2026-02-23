import os
import logging
from dotenv import load_dotenv
from backend.integrations.twitter_integration import TwitterIntegration
import pathlib

# Setup
load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("CoursePromotion")

def promote():
    # 1. Read Research Content for Evidence
    research_file = pathlib.Path("obsidian_vault/knowledge/research_2026_ai_influencer_revenue.md")
    if not research_file.exists():
        logger.error("Research file not found.")
        return

    with open(research_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # 2. Extract key stats (Simplified extraction for tweet)
    # Market size ~$32.55B, 171% growth
    
    tweet_text = (
        "🚀 【2026年 AIインフルエンサー収益化の正解】\n\n"
        "市場規模は2026年に325億ドルへ。ブランドのAI投資額は前年比171%増。 "
        "もはや自動化は選択ではなく生存戦略です。\n\n"
        "最新リサーチに基づく「収益化マスタークラス」を公開しました。 🧠💰\n"
        "#AI #インフルエンサー #自動化 #SageAI"
    )

    # 3. Post to X
    twitter = TwitterIntegration()
    if twitter.mock_mode:
        logger.warning("Twitter is in MOCK MODE. Check .env keys.")
        return
        
    result = twitter.post_tweet(tweet_text)
    print(f"Promotion Result: {result}")

if __name__ == "__main__":
    promote()
