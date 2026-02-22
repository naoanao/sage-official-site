
import gspread
from google.oauth2.service_account import Credentials
from typing import List, Dict, Any
import logging
import os
import json

logger = logging.getLogger(__name__)

class SheetsAgent:
    def __init__(self, credentials_path: str = "backend/config/credentials.json"):
        """Google Sheets Agent初期化"""
        # Absolute path resolution
        if not os.path.isabs(credentials_path):
             # Assuming backend is root for relative, but safer to anchor to this file
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            credentials_path = os.path.join(base_dir, "config", "credentials.json")

        self.credentials_path = credentials_path

        try:
            if not os.path.exists(credentials_path):
                logger.warning(f"⚠️ Credentials not found at {credentials_path}. Sheets Agent in Mock Mode.")
                self.active = False
                return

            scope = [
                'https://spreadsheets.google.com/feeds',
                'https://www.googleapis.com/auth/drive'
            ]
            creds = Credentials.from_service_account_file(
                credentials_path, 
                scopes=scope
            )
            self.client = gspread.authorize(creds)
            self.active = True
            logger.info("✅ Sheets Agent initialized")
        except Exception as e:
            logger.warning(f"⚠️ Sheets Agent init failed: {e}")
            self.active = False
    
    def read_sheet(self, spreadsheet_id: str, worksheet_name: str = "Sheet1") -> Dict[str, Any]:
        """Sheetsからデータ読み込み"""
        if not self.active:
            return {"status": "error", "message": "Sheets Agent not active (Check credentials.json)"}
        
        try:
            sheet = self.client.open_by_key(spreadsheet_id)
            worksheet = sheet.worksheet(worksheet_name)
            data = worksheet.get_all_records()
            
            logger.info(f"✅ Read {len(data)} rows from Sheets")
            return {
                "status": "success",
                "data": data,
                "rows": len(data)
            }
        except Exception as e:
            logger.error(f"❌ Sheets read error: {e}")
            return {"status": "error", "message": str(e)}
    
    def write_sheet(self, spreadsheet_id: str, worksheet_name: str, data: List[List], range_name: str = "A1") -> Dict:
        """Sheetsにデータ書き込み"""
        if not self.active:
            return {"status": "error", "message": "Sheets Agent not active"}
        
        try:
            sheet = self.client.open_by_key(spreadsheet_id)
            worksheet = sheet.worksheet(worksheet_name)
            worksheet.update(range_name, data)
            
            logger.info(f"✅ Wrote {len(data)} rows to Sheets")
            return {
                "status": "success",
                "rows_written": len(data)
            }
        except Exception as e:
            logger.error(f"❌ Sheets write error: {e}")
            return {"status": "error", "message": str(e)}
    
    def append_row(self, spreadsheet_id: str, worksheet_name: str, row_data: List) -> Dict:
        """Sheetsに行を追加"""
        if not self.active:
            return {"status": "error", "message": "Sheets Agent not active"}
        
        try:
            sheet = self.client.open_by_key(spreadsheet_id)
            try:
                worksheet = sheet.worksheet(worksheet_name)
            except gspread.WorksheetNotFound:
                # If worksheet doesn't exist, try to create it, or default to first sheet
                try:
                    worksheet = sheet.add_worksheet(title=worksheet_name, rows=100, cols=20)
                except Exception as create_err:
                     logger.warning(f"Could not create worksheet '{worksheet_name}': {create_err}. Using first sheet.")
                     worksheet = sheet.get_worksheet(0)
                
            worksheet.append_row(row_data)
            
            logger.info(f"✅ Appended row to Sheets")
            return {"status": "success"}
        except Exception as e:
            logger.error(f"❌ Sheets append error: {e}")
            return {"status": "error", "message": str(e)}
    
    def analyze_and_update(self, query: str, spreadsheet_id: str) -> Dict:
        """データ分析 → Sheets更新（統合機能）"""
        # 1. データ取得
        # In a real scenario, we might read to analyze. For now, we assume this triggers an update based on analysis.
        # But per user request, we read first.
        
        # Default worksheet
        worksheet_name = "Sheet1"
        data_res = self.read_sheet(spreadsheet_id, worksheet_name)
        
        if data_res["status"] != "success":
            return data_res
        
        # 2. LLMで分析（簡易版 - Placeholder until Brain integration）
        # Simulating analysis based on the query.
        summary_text = f"Analyzed {data_res['rows']} rows based on query: '{query}'"
        
        # 3. Sheets更新（サマリー行を追加）
        # We append a log of this analysis
        from datetime import datetime
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        row_data = [timestamp, "Analysis", query, summary_text]
        
        result = self.append_row(
            spreadsheet_id, 
            worksheet_name, 
            row_data
        )
        
        return {
            "status": "success",
            "summary": summary_text,
            "update_result": result,
            "data_preview": data_res['data'][:3] if data_res['rows'] > 0 else []
        }
