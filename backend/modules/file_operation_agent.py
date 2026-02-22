import os
import shutil
import glob
from typing import List, Dict, Any
import logging
from PIL import Image  # 圖像処理用
import zipfile

logger = logging.getLogger(__name__)

class FileOperationAgent:
    def __init__(self, base_path=None):
        # デフォルトはデスクトップ
        user_desktop = os.path.join(os.path.expanduser("~"), "Desktop")
        self.base_path = base_path if base_path else user_desktop
        
        # プロジェクトルートの特定 (Sage_Final_Unified)
        self.project_root = None
        possible_roots = [
            os.path.join(user_desktop, "Sage_Final_Unified"),
            os.path.join(os.path.expanduser("~"), "Sage_Final_Unified"),
            os.getcwd(),
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))) # backend/modules/agent -> root
        ]
        
        for root in possible_roots:
            if os.path.exists(root) and os.path.isdir(root):
                # check for critical files to confirm it's the project
                if os.path.exists(os.path.join(root, "backend")) or os.path.exists(os.path.join(root, "frontend")):
                    self.project_root = root
                    logging.info(f"FileOperationAgent: Project Root Detected at {self.project_root}")
                    break
        
        if not self.project_root:
            logging.warning("FileOperationAgent: Could not detect project root. Defaulting to base_path.")
            self.project_root = self.base_path

    def list_files(self, path: str = None, extension: str = None) -> Dict[str, Any]:
        """指定されたパス（またはデスクトップ）のファイルをリストアップ"""
        target_path = path if path else self.base_path
        
        # 安全対策: ユーザーフォルダの外には出ない
        if not os.path.abspath(target_path).startswith(os.path.expanduser("~")):
             return {"status": "error", "message": "Access denied: Cannot access outside user directory"}

        if not os.path.exists(target_path):
            return {"status": "error", "message": f"Path not found: {target_path}"}

        try:
            files = []
            dirs = []
            if extension:
                search_pattern = os.path.join(target_path, f"*{extension}")
                files = glob.glob(search_pattern)
                # If extension is specified, we only list files matching that extension, not all files and directories.
                # Directories are not relevant when an extension is specified for files.
            else:
                items = os.listdir(target_path)
                files = [os.path.join(target_path, f) for f in items if os.path.isfile(os.path.join(target_path, f))]
                dirs = [os.path.join(target_path, f) for f in items if os.path.isdir(os.path.join(target_path, f))]
            
            return {
                "status": "success",
                "path": target_path,
                "count": len(files) + len(dirs),
                "files": [os.path.basename(f) for f in files],
                "directories": [os.path.basename(d) for d in dirs]
            }
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def move_file(self, src_filename: str, dest_folder_name: str) -> Dict[str, Any]:
        """ファイルを移動します（移動先フォルダがなければ作成）。プロジェクトルートやCWDも検索します。"""
        try:
            # 検索ロジック: フルパス指定がない場合、複数の場所から探す
            src_path = None
            
            # Candidates for source file
            candidates = []
            if os.path.isabs(src_filename):
                candidates.append(src_filename)
            else:
                # 1. Base Path (Desktop)
                candidates.append(os.path.join(self.base_path, src_filename))
                # 2. Project Root (Sage_Final_Unified)
                if self.project_root:
                    candidates.append(os.path.join(self.project_root, src_filename))
                # 3. Current Working Directory
                candidates.append(os.path.join(os.getcwd(), src_filename))
                # 4. Explicit 'Sage_Final_Unified' in Desktop (Legacy fallback)
                candidates.append(os.path.join(self.base_path, "Sage_Final_Unified", src_filename))

            # Find first existing file
            for p in candidates:
                if os.path.exists(p) and os.path.isfile(p):
                    src_path = p
                    break
            
            if not src_path:
                return {"status": "error", "message": f"File not found: {src_filename} (Searched in: {[c for c in candidates]})"}
            
            # Destination logic
            dest_path = dest_folder_name
            if not os.path.isabs(dest_path):
                # If destination is relative, prefer Project Root, then Desktop
                if self.project_root:
                    dest_path = os.path.join(self.project_root, dest_folder_name)
                else:
                    dest_path = os.path.join(self.base_path, dest_folder_name)
            
            if not os.path.exists(dest_path):
                os.makedirs(dest_path)
                logger.info(f"Created directory: {dest_path}")

            final_path = os.path.join(dest_path, os.path.basename(src_path))
            shutil.move(src_path, final_path)
            
            return {
                "status": "success", 
                "message": f"Moved {os.path.basename(src_path)} to {os.path.basename(dest_path)}",
                "source": src_path,
                "destination": final_path
            }
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def create_pdf_from_images(self, folder_path: str = None, output_filename: str = "combined_images.pdf") -> Dict[str, Any]:
        """フォルダ内の画像（PNG, JPG）を全て一つのPDFにまとめる（再帰検索付き）"""
        
        # 検索対象パスの候補
        search_paths = []
        if folder_path:
            search_paths.append(folder_path)
        
        # Base path
        search_paths.append(self.base_path)
        
        # Current Working Directory
        search_paths.append(os.getcwd())
        
        # Sage Project Dir
        if self.project_root:
            search_paths.append(self.project_root)
            if folder_path and not os.path.isabs(folder_path):
                search_paths.append(os.path.join(self.project_root, folder_path))

        final_images = []
        found_path = ""

        # 各パスで検索
        for p in search_paths:
            if not os.path.exists(p): continue
            
            logger.info(f"Searching images in: {p}")
            image_files = []
            
            # Recursive glob + Flat glob
            for ext in ['**/*.png', '**/*.jpg', '**/*.jpeg', '*.png', '*.jpg', '*.jpeg']:
                # recursive=True matches **
                image_files.extend(glob.glob(os.path.join(p, ext), recursive=True))
            
            if image_files:
                found_path = p
                logger.info(f"Found {len(image_files)} images in {p}")
                
                # Sort and process
                image_files.sort()
                for f in image_files:
                    try:
                        img = Image.open(f)
                        if img.mode != 'RGB':
                            img = img.convert('RGB')
                        final_images.append(img)
                    except Exception:
                        pass
                
                if final_images:
                    break # 画像が見つかったらそこで終了（混ざらないように）

        if not final_images:
            return {"status": "error", "message": f"No images found in paths: {search_paths}"}

        try:
            # Output to the found folder
            output_path = os.path.join(found_path, output_filename)
            final_images[0].save(
                output_path, 
                "PDF", 
                resolution=100.0, 
                save_all=True, 
                append_images=final_images[1:]
            )
            
            return {
                "status": "success",
                "message": f"Created PDF with {len(final_images)} images from {found_path}",
                "path": output_path
            }
        except Exception as e:
            return {"status": "error", "message": str(e)}
