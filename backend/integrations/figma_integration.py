import os
import requests
import json
import opik
from typing import Dict, Any, Optional, List

# Configure Opik
opik.configure(use_local=False)

class FigmaIntegration:
    def __init__(self):
        self.name = "Figma Integration"
        self.access_token = os.getenv("FIGMA_ACCESS_TOKEN")
        self.api_url = "https://api.figma.com/v1"
        
        if not self.access_token:
            print("[Figma] Warning: FIGMA_ACCESS_TOKEN not set. Integration will not work.")
    
    def _get_headers(self) -> Dict[str, str]:
        return {
            "X-Figma-Token": self.access_token,
            "Content-Type": "application/json"
        }
    
    @opik.track(name="figma_get_file")
    def get_file(self, file_key: str) -> Dict[str, Any]:
        """
        Figmaファイルを取得
        
        Args:
            file_key: FigmaファイルのキーまたはURL
            
        Returns:
            ファイルデータ
        """
        if not self.access_token:
            return {"error": "FIGMA_ACCESS_TOKEN not configured"}
        
        # URLからfile_keyを抽出（もし渡された場合）
        if "figma.com/file/" in file_key:
            file_key = file_key.split("/file/")[1].split("/")[0]
        
        print(f"[Figma] Getting file: {file_key}")
        
        try:
            response = requests.get(
                f"{self.api_url}/files/{file_key}",
                headers=self._get_headers(),
                timeout=30
            )
            response.raise_for_status()
            
            result = response.json()
            print(f"[Figma] File retrieved: {result.get('name', 'Unknown')}")
            
            # Log to Opik
            opik.log({
                "file_key": file_key,
                "file_name": result.get("name"),
                "document": result.get("document", {})
            })
            
            return result
            
        except Exception as e:
            print(f"[Figma] Failed to get file: {e}")
            return {"error": str(e)}
    
    @opik.track(name="figma_get_components")
    def get_components(self, file_key: str) -> List[Dict[str, Any]]:
        """
        ファイルからコンポーネント一覧を取得
        
        Args:
            file_key: FigmaファイルのキーまたはURL
            
        Returns:
            コンポーネントリスト
        """
        if not self.access_token:
            return [{"error": "FIGMA_ACCESS_TOKEN not configured"}]
        
        if "figma.com/file/" in file_key:
            file_key = file_key.split("/file/")[1].split("/")[0]
        
        print(f"[Figma] Getting components from file: {file_key}")
        
        try:
            response = requests.get(
                f"{self.api_url}/files/{file_key}/components",
                headers=self._get_headers(),
                timeout=30
            )
            response.raise_for_status()
            
            result = response.json()
            components = result.get("meta", {}).get("components", [])
            print(f"[Figma] Found {len(components)} components")
            
            return components
            
        except Exception as e:
            print(f"[Figma] Failed to get components: {e}")
            return [{"error": str(e)}]
    
    @opik.track(name="figma_export_image")
    def export_image(self, file_key: str, node_ids: List[str], format: str = "png", scale: float = 2.0) -> Dict[str, str]:
        """
        ノードを画像としてエクスポート
        
        Args:
            file_key: FigmaファイルのキーまたはURL
            node_ids: エクスポートするノードIDのリスト
            format: 画像フォーマット（png, jpg, svg, pdf）
            scale: スケール（1.0-4.0）
            
        Returns:
            ノードIDと画像URLのマッピング
        """
        if not self.access_token:
            return {"error": "FIGMA_ACCESS_TOKEN not configured"}
        
        if "figma.com/file/" in file_key:
            file_key = file_key.split("/file/")[1].split("/")[0]
        
        print(f"[Figma] Exporting {len(node_ids)} nodes as {format}")
        
        params = {
            "ids": ",".join(node_ids),
            "format": format,
            "scale": scale
        }
        
        try:
            response = requests.get(
                f"{self.api_url}/images/{file_key}",
                headers=self._get_headers(),
                params=params,
                timeout=60
            )
            response.raise_for_status()
            
            result = response.json()
            images = result.get("images", {})
            print(f"[Figma] Exported {len(images)} images")
            
            return images
            
        except Exception as e:
            print(f"[Figma] Failed to export images: {e}")
            return {"error": str(e)}
    
    @opik.track(name="figma_generate_html_css")
    def generate_html_css(self, file_key: str, node_id: str = None) -> Dict[str, str]:
        """
        FigmaデザインからHTML/CSSを生成（簡易版）
        
        Args:
            file_key: FigmaファイルのキーまたはURL
            node_id: 変換するノードID（指定なしの場合は全体）
            
        Returns:
            HTML, CSS, JSコード
        """
        print(f"[Figma] Generating HTML/CSS for file: {file_key}")
        
        # ファイル取得
        file_data = self.get_file(file_key)
        if "error" in file_data:
            return file_data
        
        # Geminiを使ってデザインをコードに変換
        try:
            import google.generativeai as genai
            
            api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
            if not api_key:
                return {"error": "GEMINI_API_KEY not configured for code generation"}
            
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel('gemini-2.5-flash')
            
            # デザイン情報をJSON化
            design_json = json.dumps(file_data.get("document", {}), indent=2)
            
            prompt = f"""
            以下のFigmaデザインデータからHTML/CSS/JavaScriptコードを生成してください。
            
            要件:
            - モダンなHTML5セマンティックタグを使用
            - レスポンシブデザイン（CSS Grid/Flexbox）
            - 美しいスタイリング（色、余白、タイポグラフィ）
            - インタラクティブな要素にはJavaScriptを追加
            
            Figmaデザインデータ（抜粋）:
            {design_json[:5000]}
            
            出力形式: JSON
            {{
                "html": "<!DOCTYPE html>...",
                "css": "/* styles */...",
                "js": "// script..."
            }}
            """
            
            response = model.generate_content(prompt)
            text = response.text
            
            # JSONを抽出
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0]
            elif "```" in text:
                text = text.split("```")[1].split("```")[0]
            
            result = json.loads(text.strip())
            print(f"[Figma] Code generation completed")
            
            return result
            
        except Exception as e:
            print(f"[Figma] Code generation failed: {e}")
            return {"error": str(e)}
    
    @opik.track(name="figma_get_comments")
    def get_comments(self, file_key: str) -> List[Dict[str, Any]]:
        """
        ファイルのコメントを取得
        
        Args:
            file_key: FigmaファイルのキーまたはURL
            
        Returns:
            コメントリスト
        """
        if not self.access_token:
            return [{"error": "FIGMA_ACCESS_TOKEN not configured"}]
        
        if "figma.com/file/" in file_key:
            file_key = file_key.split("/file/")[1].split("/")[0]
        
        print(f"[Figma] Getting comments from file: {file_key}")
        
        try:
            response = requests.get(
                f"{self.api_url}/files/{file_key}/comments",
                headers=self._get_headers(),
                timeout=30
            )
            response.raise_for_status()
            
            result = response.json()
            comments = result.get("comments", [])
            print(f"[Figma] Found {len(comments)} comments")
            
            return comments
            
        except Exception as e:
            print(f"[Figma] Failed to get comments: {e}")
            return [{"error": str(e)}]

# Singleton instance
figma_integration = FigmaIntegration()
