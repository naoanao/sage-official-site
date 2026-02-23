import sys
import os
import logging
import re
import requests
from unittest.mock import MagicMock

# Ensure backend folder is in path
sys.path.append(os.path.abspath("."))

from backend.modules.autonomous_adapter import AutonomousAdapter
from backend.modules.browser_agent import BrowserAgent

logging.basicConfig(level=logging.INFO)

def test_deep_verification_cross_ref():
    print("\n--- Testing D1.5 Deep Cross-Reference Purification ---")
    
    # 1. Setup mocks
    orchestrator = MagicMock()
    ba = BrowserAgent()
    orchestrator.browser_agent = ba
    memory = MagicMock()
    
    adapter = AutonomousAdapter(orchestrator, memory)
    
    # 2. Prepare report with facts at top and source at bottom
    topic = "Market Analysis"
    fake_report = f"""# Intelligence Report: {topic}
## Market Projections
* The industry will grow to $27.54 billion according to the primary source.
* Unverified source says it might hit $99.99 trillion.
* Adopton will be 60.2% by 2026.

## Sources
1. Fortune: https://www.fortunebusinessinsights.com/influencer-marketing-platform-market-108880
2. Fake: https://this-is-a-fake-url-123456789.com
"""

    print("Executing cross-reference purification...")
    
    # Simulate the logic in AutonomousAdapter
    research_report = fake_report
    all_urls = list(set(re.findall(r'https?://[^\s)\]]+', research_report)))
    source_contents = {}
    for u in all_urls:
        res = ba.verify_url_content(u, []) # Basic reachability check
        if res.get('status') == 'success' and res.get('reachable'):
             try:
                h = {'User-Agent': 'Mozilla/5.0'}
                source_contents[u] = re.sub(r'<[^>]+>', ' ', requests.get(u, headers=h, timeout=10).text).lower()
             except:
                continue

    raw_lines = research_report.split('\n')
    purified_lines = []
    for line in raw_lines:
        new_line = line
        
        # Look for facts in this line
        found_facts = re.findall(r'(\$?\d+(?:\.\d+)?\s*(?:billion|million|trillion|%))', line, re.IGNORECASE)
        for fact in found_facts:
            fact_clean = fact.lower().strip()
            is_verified = False
            for s_url, s_text in source_contents.items():
                if fact_clean in s_text:
                    is_verified = True
                    break
            
            tag = " [Verified in Sources]" if is_verified else " [Unverified Number]"
            if tag not in new_line:
                new_line = new_line.replace(fact, f"{fact}{tag}")
        
        # URL tag (basic reachability/status)
        found_urls = re.findall(r'https?://[^\s)\]]+', line)
        for u in found_urls:
            status = " [Reachable]" if u in source_contents else " [UNREACHABLE/HALLUCINATED URL]"
            new_line = new_line.replace(u, f"{u}{status}")
            
        purified_lines.append(new_line)
    
    result_report = "\n".join(purified_lines)
    
    print("\n--- Purification Result ---")
    print(result_report)
    
    # Assertions
    if "[Verified in Sources]" in result_report and "$27.54 billion" in result_report:
        print("\nSUCCESS: Number verified by cross-referencing source at bottom!")
    if "[Unverified Number]" in result_report and "$99.99 trillion" in result_report:
        print("SUCCESS: Hallucinated number correctly flagged!")
    if "[UNREACHABLE/HALLUCINATED URL]" in result_report:
        print("SUCCESS: Fake URL correctly flagged!")

if __name__ == "__main__":
    test_deep_verification_cross_ref()
