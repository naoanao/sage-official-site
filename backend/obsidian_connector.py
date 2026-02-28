import os
import pathlib
import logging
import time
from datetime import datetime
from typing import Optional

logger = logging.getLogger(__name__)

class ObsidianConnector:
    def __init__(self, vault_path="obsidian_vault"):
        """
        Initializes the Obsidian connector.
        
        Args:
            vault_path: Path to the Obsidian vault root.
        """
        self.vault_path = pathlib.Path(vault_path)
        self.knowledge_path = self.vault_path / "knowledge"
        self.drafts_path = self.vault_path / "drafts"
        
        # Ensure directories exist
        self.knowledge_path.mkdir(parents=True, exist_ok=True)
        self.drafts_path.mkdir(parents=True, exist_ok=True)
        
        logger.info(f"ObsidianConnector initialized. Vault: {self.vault_path.absolute()}")

    def create_knowledge_note(self, content: str, metadata: dict = None) -> Optional[pathlib.Path]:
        """
        Creates a markdown note in the knowledge directory.
        
        Args:
            content: Markdown content of the note.
            metadata: Optional metadata dictionary.
            
        Returns:
            Path to the created note, or None if failed.
        """
        try:
            topic = metadata.get("topic", "unknown") if metadata else "unknown"
            # Sanitize topic for filename
            safe_topic = "".join([c if c.isalnum() or c in ("-", "_") else "_" for c in topic])
            
            # Add frontmatter if metadata provided
            if metadata:
                frontmatter = "---\n"
                for k, v in metadata.items():
                    frontmatter += f"{k}: {v}\n"
                frontmatter += "---\n\n"
                content = frontmatter + content

            filename = f"course_{safe_topic}_{int(time.time())}.md"
            note_path = self.knowledge_path / filename
            
            with open(note_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            logger.info(f"Successfully created Obsidian knowledge note: {note_path}")
            return note_path
        except Exception as e:
            logger.error(f"Error creating Obsidian knowledge note: {e}")
            return None

    def create_draft(self, content: str, title: str = "draft") -> Optional[pathlib.Path]:
        """
        Creates a markdown note in the drafts directory.
        """
        try:
            safe_title = "".join([c if c.isalnum() or c in ("-", "_") else "_" for c in title])
            filename = f"draft_{safe_title}_{int(time.time())}.md"
            draft_path = self.drafts_path / filename
            
            with open(draft_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            logger.info(f"Successfully created Obsidian draft: {draft_path}")
            return draft_path
        except Exception as e:
            logger.error(f"Error creating Obsidian draft: {e}")
            return None

    def list_recent_research(self, limit: int = 10) -> list:
        """
        Lists recent research files from the knowledge directory.
        """
        try:
            files = list(self.knowledge_path.glob("research_*.md"))
            files.sort(key=lambda x: x.stat().st_mtime, reverse=True)
            return files[:limit]
        except Exception as e:
            logger.error(f"Error listing recent research: {e}")
            return []
