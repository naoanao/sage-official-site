"""
Code Editor Agent
Enables code editing and modification for Screen Sage
"""
import os
import logging
import re
from pathlib import Path
from typing import Optional, List, Dict, Tuple
import difflib

logger = logging.getLogger(__name__)

class CodeEditorAgent:
    """
    コード編集エージェント
    
    機能:
    - 既存コード修正
    - 関数追加・削除
    - インポート文管理
    - コメント追加
    - リファクタリング
    """
    
    def __init__(self, base_path: Optional[str] = None):
        """
        Initialize Code Editor Agent
        
        Args:
            base_path: Base directory for operations
        """
        self.base_path = Path(base_path or os.getcwd())
        logger.info(f"💻 CodeEditorAgent initialized: {self.base_path}")
    
    def find_function(self, filepath: str, function_name: str) -> Optional[Tuple[int, int]]:
        """
        Find function definition in file
        
        Args:
            filepath: Path to file
            function_name: Name of function to find
        
        Returns:
            tuple of (start_line, end_line) or None
        """
        full_path = self.base_path / filepath
        
        if not full_path.exists():
            return None
        
        with open(full_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        # Find function start
        start_line = None
        for i, line in enumerate(lines):
            if re.match(rf'^\s*def\s+{re.escape(function_name)}\s*\(', line):
                start_line = i
                break
        
        if start_line is None:
            return None
        
        # Find function end (next def or class, or end of file)
        indent_level = len(lines[start_line]) - len(lines[start_line].lstrip())
        end_line = len(lines)
        
        for i in range(start_line + 1, len(lines)):
            line = lines[i]
            if line.strip() and not line.strip().startswith('#'):
                current_indent = len(line) - len(line.lstrip())
                if current_indent <= indent_level and (line.strip().startswith('def ') or line.strip().startswith('class ')):
                    end_line = i
                    break
        
        return (start_line + 1, end_line)  # 1-indexed
    
    def replace_function(self, filepath: str, function_name: str, new_code: str) -> Dict:
        """
        Replace function with new code
        
        Args:
            filepath: Path to file
            function_name: Name of function to replace
            new_code: New function code
        
        Returns:
            dict with status, changes
        """
        try:
            logger.info(f"💻 Replacing function: {function_name} in {filepath}")
            
            full_path = self.base_path / filepath
            
            if not full_path.exists():
                return {"status": "error", "message": f"File not found: {filepath}"}
            
            # Find function location
            location = self.find_function(filepath, function_name)
            if not location:
                return {"status": "error", "message": f"Function '{function_name}' not found"}
            
            start_line, end_line = location
            
            # Read file
            with open(full_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            
            # Backup
            backup_path = full_path.with_suffix(full_path.suffix + '.bak')
            with open(backup_path, 'w', encoding='utf-8') as f:
                f.writelines(lines)
            
            # Replace function
            old_code = ''.join(lines[start_line-1:end_line])
            new_lines = lines[:start_line-1] + [new_code + '\n'] + lines[end_line:]
            
            # Write back
            with open(full_path, 'w', encoding='utf-8') as f:
                f.writelines(new_lines)
            
            # Generate diff
            diff = list(difflib.unified_diff(
                old_code.splitlines(keepends=True),
                new_code.splitlines(keepends=True),
                fromfile=f'{filepath} (old)',
                tofile=f'{filepath} (new)'
            ))
            
            logger.info(f"✅ Function replaced: {function_name}")
            
            return {
                'status': 'success',
                'filepath': str(filepath),
                'function': function_name,
                'lines_changed': (start_line, end_line),
                'diff': ''.join(diff),
                'backup': str(backup_path)
            }
            
        except Exception as e:
            logger.error(f"Failed to replace function: {e}", exc_info=True)
            return {"status": "error", "message": str(e)}
    
    def add_import(self, filepath: str, import_statement: str) -> Dict:
        """
        Add import statement to file
        
        Args:
            filepath: Path to file
            import_statement: Import statement to add
        
        Returns:
            dict with status
        """
        try:
            full_path = self.base_path / filepath
            
            if not full_path.exists():
                return {"status": "error", "message": f"File not found: {filepath}"}
            
            with open(full_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            
            # Check if import already exists
            if any(import_statement in line for line in lines):
                return {"status": "info", "message": "Import already exists"}
            
            # Find position to insert (after last import or at start)
            insert_pos = 0
            for i, line in enumerate(lines):
                if line.strip().startswith(('import ', 'from ')):
                    insert_pos = i + 1
            
            # Insert import
            lines.insert(insert_pos, import_statement + '\n')
            
            # Write back
            with open(full_path, 'w', encoding='utf-8') as f:
                f.writelines(lines)
            
            logger.info(f"✅ Import added: {import_statement}")
            
            return {
                'status': 'success',
                'filepath': str(filepath),
                'import': import_statement,
                'line': insert_pos + 1
            }
            
        except Exception as e:
            logger.error(f"Failed to add import: {e}")
            return {"status": "error", "message": str(e)}
    
    def insert_code(self, filepath: str, line_number: int, code: str) -> Dict:
        """
        Insert code at specific line
        
        Args:
            filepath: Path to file
            line_number: Line number to insert at (1-indexed)
            code: Code to insert
        
        Returns:
            dict with status
        """
        try:
            full_path = self.base_path / filepath
            
            if not full_path.exists():
                return {"status": "error", "message": f"File not found: {filepath}"}
            
            with open(full_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            
            # Insert code
            lines.insert(line_number - 1, code + '\n')
            
            # Write back
            with open(full_path, 'w', encoding='utf-8') as f:
                f.writelines(lines)
            
            logger.info(f"✅ Code inserted at line {line_number}")
            
            return {
                'status': 'success',
                'filepath': str(filepath),
                'line': line_number,
                'inserted': len(code.split('\n'))
            }
            
        except Exception as e:
            logger.error(f"Failed to insert code: {e}")
            return {"status": "error", "message": str(e)}

# For testing
if __name__ == "__main__":
    editor = CodeEditorAgent()
    
    # Test: Find function
    result = editor.find_function("backend/flask_server.py", "health_check")
    if result:
        print(f"✅ Found function at lines {result[0]}-{result[1]}")
    else:
        print(f"❌ Function not found")
