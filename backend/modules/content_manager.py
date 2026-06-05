import os
import json
import yaml
import logging
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

class ContentManager:
    """
    Manages the lifecycle of generated content (blogs, articles, memos).
    Enforces a strict directory structure: backend/content/{type}/{YYYY}/{MM}/
    Uses Markdown + YAML Frontmatter for metadata.
    """
    def __init__(self, base_dir: str = None):
        if base_dir:
            self.base_dir = Path(base_dir)
        else:
            # Default to backend/content relative to this file
            self.base_dir = Path(__file__).parent.parent / "content"
        
        self.base_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"📂 ContentManager initialized at {self.base_dir}")

    def save_content(self, content_type: str, title: str, body: str, metadata: Dict = None) -> str:
        """
        Saves content to disk with frontmatter.
        Returns the relative path to the saved file.
        """
        try:
            timestamp = datetime.now()
            year = timestamp.strftime("%Y")
            month = timestamp.strftime("%m")
            
            # Sanitize filename
            safe_title = "".join([c if c.isalnum() else "_" for c in title])[:50]
            filename = f"{timestamp.strftime('%d_%H%M%S')}_{safe_title}.md"
            
            # Prepare directory
            target_dir = self.base_dir / content_type / year / month
            target_dir.mkdir(parents=True, exist_ok=True)
            
            file_path = target_dir / filename
            
            # Prepare Frontmatter
            frontmatter = {
                "title": title,
                "type": content_type,
                "created_at": timestamp.isoformat(),
                "status": "draft",
                **(metadata or {})
            }
            
            # Write File (Force UTF-8)
            with open(file_path, "w", encoding="utf-8") as f:
                f.write("---\n")
                yaml.dump(frontmatter, f, default_flow_style=False, allow_unicode=True)
                f.write("---\n\n")
                f.write(body)
                
            logger.info(f"✅ Content saved: {file_path}")
            return str(file_path.relative_to(self.base_dir))
            
        except Exception as e:
            logger.error(f"❌ Failed to save content: {e}")
            raise e

    def list_content(self, content_type: str = None, limit: int = 50) -> List[Dict]:
        """
        Lists content files with metadata. 
        Non-recursive or limited depth to prevent crashes.
        Sorted by newset first.
        """
        results = []
        try:
            # Walk top-down, but limit to useful depth
            # Strategy: Look at the most recent months first?
            # For simplicity: glob all .md files (if count < 1000 it's fast)
            # If volume grows, we need specific month querying.
            
            search_pattern = f"{content_type}/**/*.md" if content_type else "**/*.md"
            all_files = list(self.base_dir.glob(search_pattern))
            
            # Sort by mtime descending
            all_files.sort(key=os.path.getmtime, reverse=True)
            
            for f_path in all_files[:limit]:
                try:
                    stats = f_path.stat()
                    # Peek frontmatter
                    meta = {}
                    with open(f_path, "r", encoding="utf-8") as f:
                        # Simple manual parse to avoid reading whole file if huge
                        first_line = f.readline().strip()
                        if first_line == "---":
                            fm_lines = []
                            for _ in range(20): # Max 20 lines of header
                                line = f.readline()
                                if line.strip() == "---":
                                    break
                                fm_lines.append(line)
                            meta = yaml.safe_load("".join(fm_lines)) or {}
                            
                    results.append({
                        "path": str(f_path.relative_to(self.base_dir)),
                        "filename": f_path.name,
                        "size": stats.st_size,
                        "created_at": datetime.fromtimestamp(stats.st_ctime).isoformat(),
                        "metadata": meta
                    })
                except Exception as ex:
                    logger.warning(f"Skipping bad file {f_path}: {ex}")
                    continue
                    
            return results
            
        except Exception as e:
            logger.error(f"List content error: {e}")
            return []

# Singleton instance
content_manager = ContentManager()
