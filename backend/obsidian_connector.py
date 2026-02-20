
import os
import json
from pathlib import Path
from datetime import datetime
import re


class ObsidianConnector:
    def __init__(self, vault_path=None):
        if vault_path is None:
            # 環境変数から取得、なければ現在のディレクトリからの相対パス
            base_dir = os.path.dirname(os.path.abspath(__file__))
            vault_path = os.getenv('OBSIDIAN_VAULT_PATH', os.path.join(base_dir, '..', 'obsidian_vault'))

        self.vault_path = Path(vault_path)
        self.vault_path.mkdir(exist_ok=True, parents=True)
        
    def _sanitize_filename(self, text):
        """
        テキストからファイル名として無効な文字を削除または置換する。
        """
        # 無効な文字をアンダースコアに置換
        sanitized_text = re.sub(r'[\/:*?"<>|]', '_', text)
        # 先頭または末尾のスペース、ドットを削除
        sanitized_text = sanitized_text.strip(' .')
        # 長すぎるファイル名を切り詰める
        if len(sanitized_text) > 100:
            sanitized_text = sanitized_text[:100]
        return sanitized_text

    def create_conversation_note(self, conversation_id, history):
        """会話履歴をObsidianノートとして保存"""
        note_path = self.vault_path / f"conversations/{conversation_id}.md"
        note_path.parent.mkdir(exist_ok=True)
        
        with open(note_path, 'w', encoding='utf-8') as f:
            f.write(f"# 会話: {conversation_id}\n\n")
            f.write(f"作成日: {datetime.now().isoformat()}\n\n")
            for turn in history:
                f.write(f"## {turn['sender'].title()}\n")
                f.write(f"{turn['message']}\n\n")
                
    def create_project_context_note(self, context_data):
        """
        プロジェクト情報をObsidianノートとして保存。
        既存のノートがあれば更新する。
        """
        note_path = self.vault_path / "project_context.md"
        # JSONデータをマークダウン形式で構造化
        with open(note_path, 'w', encoding='utf-8') as f:
            f.write(f"# プロジェクトコンテキスト\n\n")
            f.write(f"最終更新日: {datetime.now().isoformat()}\n\n")
            f.write("```json\n")
            f.write(json.dumps(context_data, indent=4, ensure_ascii=False))
            f.write("\n```\n")

    def create_knowledge_note(self, text_content, metadata=None):
        """
        知識ベースのエントリをObsidianノートとして保存または更新する。
        """
        if metadata is None:
            metadata = {}

        # ノート名を生成。metadataにtitleがあればそれを使用、なければtext_contentから生成
        title = metadata.get("title") or text_content.split('\n')[0]
        sanitized_title = self._sanitize_filename(title)
        
        # 知識ノートを保存するディレクトリ
        knowledge_dir = self.vault_path / "knowledge"
        knowledge_dir.mkdir(exist_ok=True)

        note_path = knowledge_dir / f"{sanitized_title}.md"

        with open(note_path, 'w', encoding='utf-8') as f:
            if not text_content.strip().startswith('#'):
                f.write(f"# {title}\n\n")
            f.write(f"作成日: {datetime.now().isoformat()}\n\n")
            if metadata:
                f.write("## メタデータ\n")
                f.write("```json\n")
                f.write(json.dumps(metadata, indent=4, ensure_ascii=False))
                f.write("\n```\n\n")
            if not text_content.strip().startswith('#'):
                f.write("## 内容\n")
            f.write(text_content)
            f.write("\n")
        return note_path

    def get_all_markdown_files(self):
        """
        Obsidian Vault内のすべてのMarkdownファイル（.md）のパスをリストで返す。
        """
        markdown_files = []
        for path in self.vault_path.rglob("*.md"):
            if path.is_file():
                markdown_files.append(path)
        return markdown_files
