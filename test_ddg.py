from duckduckgo_search import DDGS
try:
    with DDGS() as ddgs:
        results = ddgs.text("AI Influencer Stats 2026", max_results=3)
        for r in results:
            print(f"Title: {r['title']}")
            print(f"URL: {r['href']}")
            print("-" * 20)
except Exception as e:
    print(f"Error: {e}")
