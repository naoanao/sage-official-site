import os
import google.generativeai as genai
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'backend', '.env'))

class GeminiLPGenerator:
    """
    Sage LP Generator: Creates Landing Page directly from specification file.
    Uses Gemini 1.5 Pro (2M context window) to process SAGE_MASTER_BRAIN.md.
    """
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            # Fallback to other keys if GEMINI_API_KEY is missing but others exist
            api_key = os.getenv("GOOGLE_API_KEY")
            
        if not api_key:
            raise ValueError("GEMINI_API_KEY is not set in .env")
        
        genai.configure(api_key=api_key)
        # Gemini 3 Flash (Verified 2026 Model)
        self.model = genai.GenerativeModel("gemini-3-flash-preview")

    def generate_lp(self, spec_file_path="backend/docs/SAGE_MASTER_BRAIN.md"):
        """仕様書を読み込み、販売用LPのHTMLを生成する"""
        
        # Ensure absolute path
        if not os.path.isabs(spec_file_path):
            spec_file_path = os.path.join(os.getcwd(), spec_file_path)
            
        print(f"[INFO] Uploading specification: {spec_file_path}...")
        
        if not os.path.exists(spec_file_path):
             return f"Error: Specification file not found at {spec_file_path}"

        # 1. ファイルをテキストとして読み込み
        try:
            with open(spec_file_path, 'r', encoding='utf-8') as f:
                spec_content = f.read()
            print(f"[SUCCESS] File loaded: {len(spec_content)} bytes")
        except Exception as e:
            return f"Error reading file: {str(e)}"

        # 2. プロンプト作成
        prompt = f"""
    あなたはプロのWebマーケター兼エンジニアです。
    以下の仕様書「SAGE_MASTER_BRAIN.md」の内容を深く理解し、
    「Sage Lite ($29)」の販売用ランディングページ（LP）をHTML5/Tailwind CSSで作成してください。

    --- 仕様書開始 ---
    {spec_content}
    --- 仕様書終了 ---

    **必須要件:**
    1. **デザイン**: "Cyberpunk / High-Tech" (黒背景、ネオンカラー、近未来的)
    2. **コピーライティング**: ユーザーの感情を揺さぶる、魅力的で力強い文章。
    3. **CTAボタン**: 
       - メイン: "PayPalで購入する ($29)" -> リンク先: `https://paypal.me/japanletgo`
       - サブ: "クレジットカードで購入 (Stripe)" -> リンク先: `#` (Coming Soonと明記)
    4. **構成**:
       - Hero Section: インパクトのある見出しと画像プレースホルダー
       - Problem/Solution: ユーザーの悩みを解決する提案
       - Features: Sage Liteの主な機能
       - Pricing: $29 (一回払い)
       - FAQ: よくある質問
       - Footer: コピーライト
    
    出力はHTMLコードのみを含み、マークダウンのコードブロック(```html)で囲んでください。
    説明文は最小限にしてください。
    """

        print("[INFO] Gemini is thinking...")
        
        # 3. 生成実行
        try:
            # Pass only the prompt text
            response = self.model.generate_content(prompt)
            if not response.text:
                return "Error: Empty response from Gemini"
                
            html_content = response.text
            
            # HTMLタグの抽出（Markdown記法除去）
            if "```html" in html_content:
                html_content = html_content.split("```html")[1].split("```")[0].strip()
            # Also handle if it just returns markdown without html tag
            elif "```" in html_content:
                 html_content = html_content.split("```")[1].strip()

            # 保存
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            # output_filename = f"sage_lite_lp_{timestamp}.html" # Keeping timestamp for history if needed, but primary is LATEST
            output_filename = "sage_lite_lp_LATEST.html"
            desktop_path = os.path.join(os.environ['USERPROFILE'], "Desktop", output_filename)
            
            with open(desktop_path, "w", encoding="utf-8") as f:
                f.write(html_content)
                
            return f"[SUCCESS] LP Generated Successfully: {desktop_path}"
            
        except Exception as e:
            return f"Error generating content: {str(e)}"

if __name__ == "__main__":
    generator = GeminiLPGenerator()
    result = generator.generate_lp()
    print(result)
