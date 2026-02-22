"""
File Operations Agent
Enables file system operations for Screen Sage
"""
import os
import logging
import subprocess
from pathlib import Path
from typing import Optional, List, Dict, Union
import shutil
from datetime import datetime

logger = logging.getLogger(__name__)

class FileOperationsAgent:
    """
    ファイル操作エージェント
    
    機能:
    - ファイル読み書き
    - ディレクトリ操作
    - ファイル検索
    - コマンド実行（安全対策付き）
    """
    
    # 保護ファイル（書き込み禁止）
    PROTECTED_FILES = {
        '.env', 'database.db', 'knowledge.db', 
        '.git/config', 'token.json', 'credentials.json'
    }
    
    # 許可されたコマンド接頭辞
    ALLOWED_COMMANDS = {
        'pip', 'npm', 'node', 'python', 'git', 
        'ls', 'dir', 'cat', 'type', 'echo',
        'cd', 'pwd', 'mkdir', 'touch'
    }
    
    # 禁止されたコマンドパターン
    FORBIDDEN_PATTERNS = {
        'rm -rf', 'del /f', 'format', 'mkfs',
        'dd if=', '>>', '|', '&&', ';'
    }
    
    def __init__(self, base_path: Optional[str] = None):
        """
        Initialize File Operations Agent
        
        Args:
            base_path: Base directory for operations (default: current dir)
        """
        self.base_path = Path(base_path or os.getcwd())
        logger.info(f"📁 FileOperationsAgent initialized: {self.base_path}")
    
    def _is_safe_path(self, path: Union[str, Path]) -> bool:
        """Check if path is safe (within base_path)"""
        try:
            full_path = (self.base_path / path).resolve()
            return str(full_path).startswith(str(self.base_path.resolve()))
        except:
            return False
    
    def _is_protected(self, path: Union[str, Path]) -> bool:
        """Check if file is protected"""
        path_str = str(Path(path))
        return any(protected in path_str for protected in self.PROTECTED_FILES)
    
    def read_file(self, path: str, encoding: str = 'utf-8') -> Dict:
        """
        Read file contents
        
        Args:
            path: File path (relative to base_path)
            encoding: File encoding
        
        Returns:
            dict with status, content
        """
        try:
            if not self._is_safe_path(path):
                return {"status": "error", "message": "Path outside base directory"}
            
            full_path = self.base_path / path
            
            if not full_path.exists():
                return {"status": "error", "message": f"File not found: {path}"}
            
            if not full_path.is_file():
                return {"status": "error", "message": f"Not a file: {path}"}
            
            with open(full_path, 'r', encoding=encoding) as f:
                content = f.read()
            
            logger.info(f"📖 Read file: {path} ({len(content)} chars)")
            
            return {
                "status": "success",
                "path": str(path),
                "content": content,
                "size": len(content),
                "lines": len(content.split('\n'))
            }
            
        except Exception as e:
            logger.error(f"Failed to read file {path}: {e}")
            return {"status": "error", "message": str(e)}
    
    def write_file(self, path: str, content: str, overwrite: bool = False) -> Dict:
        """
        Write file
        
        Args:
            path: File path
            content: File content
            overwrite: Allow overwriting existing files
        
        Returns:
            dict with status
        """
        try:
            if not self._is_safe_path(path):
                return {"status": "error", "message": "Path outside base directory"}
            
            if self._is_protected(path):
                return {"status": "error", "message": f"Protected file: {path}"}
            
            full_path = self.base_path / path
            
            if full_path.exists() and not overwrite:
                return {"status": "error", "message": "File exists (set overwrite=True)"}
            
            # Create parent directories
            full_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Backup if overwriting
            if full_path.exists():
                backup_path = full_path.with_suffix(full_path.suffix + '.backup')
                shutil.copy2(full_path, backup_path)
                logger.info(f"💾 Backup created: {backup_path}")
            
            with open(full_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            logger.info(f"✍️  Wrote file: {path} ({len(content)} chars)")
            
            return {
                "status": "success",
                "path": str(path),
                "size": len(content),
                "backed_up": full_path.exists()
            }
            
        except Exception as e:
            logger.error(f"Failed to write file {path}: {e}")
            return {"status": "error", "message": str(e)}
    
    def list_directory(self, path: str = ".", pattern: str = "*") -> Dict:
        """
        List directory contents
        
        Args:
            path: Directory path
            pattern: File pattern (e.g., "*.py" or "*.png,*.jpg,*.jpeg" for multiple)
        
        Returns:
            dict with files and directories
        """
        try:
            # 🔥 CRITICAL FIX: Absolute path support (no base_path restriction if absolute)
            if os.path.isabs(path):
                full_path = Path(path)
                logger.info(f"🖥️ Using absolute path: {full_path}")
            else:
                if not self._is_safe_path(path):
                    return {"status": "error", "message": "Path outside base directory"}
                full_path = self.base_path / path
            
            if not full_path.exists():
                return {"status": "error", "message": f"Directory not found: {path}"}
            
            if not full_path.is_dir():
                return {"status": "error", "message": f"Not a directory: {path}"}
            
            files = []
            directories = []
            
            # 🔥 ENHANCED: Support multiple patterns (comma-separated)
            patterns = [p.strip() for p in pattern.split(',')]
            logger.info(f"📂 Listing with patterns: {patterns}")
            
            for pat in patterns:
                for item in full_path.glob(pat):
                    # Avoid duplicates
                    relative_path = item.relative_to(full_path) if not os.path.isabs(path) else item
                    
                    if item.is_file():
                        file_info = {
                            "name": item.name,
                            "path": str(relative_path),
                            "size": item.stat().st_size,
                            "modified": item.stat().st_mtime
                        }
                        if file_info not in files:  # Deduplicate
                            files.append(file_info)
                    elif item.is_dir():
                        dir_info = {
                            "name": item.name,
                            "path": str(relative_path)
                        }
                        if dir_info not in directories:  # Deduplicate
                            directories.append(dir_info)
            
            logger.info(f"📂 Listed: {path} ({len(files)} files, {len(directories)} dirs)")
            
            return {
                "status": "success",
                "path": str(path),
                "files": sorted(files, key=lambda x: x['name']),
                "directories": sorted(directories, key=lambda x: x['name']),
                "total": len(files) + len(directories)
            }
            
        except Exception as e:
            logger.error(f"Failed to list directory {path}: {e}")
            return {"status": "error", "message": str(e)}
    
    def search_files(self, pattern: str, directory: str = ".", recursive: bool = True) -> Dict:
        """
        Search for files
        
        Args:
            pattern: File name pattern
            directory: Search directory
            recursive: Search recursively
        
        Returns:
            dict with matching files
        """
        try:
            if not self._is_safe_path(directory):
                return {"status": "error", "message": "Path outside base directory"}
            
            full_path = self.base_path / directory
            
            if recursive:
                matches = list(full_path.rglob(pattern))
            else:
                matches = list(full_path.glob(pattern))
            
            files = [
                {
                    "name": item.name,
                    "path": str(item.relative_to(self.base_path)),
                    "size": item.stat().st_size if item.is_file() else 0
                }
                for item in matches
            ]
            
            logger.info(f"🔍 Found {len(files)} files matching '{pattern}'")
            
            return {
                "status": "success",
                "pattern": pattern,
                "directory": str(directory),
                "files": files,
                "count": len(files)
            }
            
        except Exception as e:
            logger.error(f"Failed to search files: {e}")
            return {"status": "error", "message": str(e)}
    
    def execute_command(self, command: str, cwd: Optional[str] = None, 
                       timeout: int = 30) -> Dict:
        """
        Execute shell command (with safety checks)
        
        Args:
            command: Command to execute
            cwd: Working directory
            timeout: Timeout in seconds
        
        Returns:
            dict with status, output, error
        """
        try:
            # Safety checks
            command_lower = command.lower()
            
            # Check forbidden patterns
            for pattern in self.FORBIDDEN_PATTERNS:
                if pattern in command_lower:
                    return {
                        "status": "error",
                        "message": f"Forbidden pattern detected: {pattern}"
                    }
            
            # Check allowed commands
            cmd_start = command.split()[0] if command.split() else ""
            if cmd_start not in self.ALLOWED_COMMANDS:
                return {
                    "status": "error",
                    "message": f"Command not in whitelist: {cmd_start}"
                }
            
            # Set working directory
            work_dir = self.base_path / cwd if cwd else self.base_path
            
            if not self._is_safe_path(work_dir):
                return {"status": "error", "message": "Working directory outside base"}
            
            logger.info(f"⚡ Executing: {command}")
            
            # Execute command
            result = subprocess.run(
                command,
                shell=True,
                cwd=str(work_dir),
                capture_output=True,
                text=True,
                timeout=timeout
            )
            
            return {
                "status": "success" if result.returncode == 0 else "error",
                "command": command,
                "return_code": result.returncode,
                "stdout": result.stdout,
                "stderr": result.stderr
            }
            
        except subprocess.TimeoutExpired:
            logger.error(f"Command timeout: {command}")
            return {"status": "error", "message": f"Command timeout ({timeout}s)"}
        except Exception as e:
            logger.error(f"Failed to execute command: {e}")
            return {"status": "error", "message": str(e)}
    

    def delete_file(self, path: str, confirm: bool = False) -> Dict:
        """
        Delete file (requires confirmation)
        
        Args:
            path: File path
            confirm: Confirmation flag
        
        Returns:
            dict with status
        """
        try:
            if not confirm:
                return {
                    "status": "error",
                    "message": "Deletion requires confirmation (set confirm=True)"
                }
            
            if not self._is_safe_path(path):
                return {"status": "error", "message": "Path outside base directory"}
            
            if self._is_protected(path):
                return {"status": "error", "message": f"Protected file: {path}"}
            
            full_path = self.base_path / path
            
            if not full_path.exists():
                return {"status": "error", "message": f"File not found: {path}"}
            
            full_path.unlink()
            logger.info(f"🗑️  Deleted file: {path}")
            
            return {"status": "success", "path": str(path)}
            
        except Exception as e:
            logger.error(f"Failed to delete file {path}: {e}")
            return {"status": "error", "message": str(e)}

    def move_file(self, source: str, destination: str) -> Dict:
        """
        Move file or directory
        
        Args:
            source: Source path
            destination: Destination path
        
        Returns:
            dict with status
        """
        try:
            if not self._is_safe_path(source) or not self._is_safe_path(destination):
                return {"status": "error", "message": "Path outside base directory"}
            
            if self._is_protected(source):
                return {"status": "error", "message": f"Source is protected: {source}"}
            if self._is_protected(destination):
                return {"status": "error", "message": f"Destination is protected: {destination}"}

            src_path = self.base_path / source
            dst_path = self.base_path / destination

            if not src_path.exists():
                 return {"status": "error", "message": f"Source not found: {source}"}

            # If destination is a directory, append filename
            if dst_path.is_dir():
                dst_path = dst_path / src_path.name

            # Ensure parent exists
            dst_path.parent.mkdir(parents=True, exist_ok=True)
            
            shutil.move(str(src_path), str(dst_path))
            logger.info(f"🚚 Moved: {source} -> {destination}")
            
            return {
                "status": "success",
                "source": str(source),
                "destination": str(destination)
            }
            
        except Exception as e:
            logger.error(f"Failed to move file {source} to {destination}: {e}")
            return {"status": "error", "message": str(e)}

    def collect_images(self, source_dir: str, destination_folder: Optional[str] = None, 
                      recursive: bool = True, move: bool = False) -> Dict:
        """
        Collect all image files from a directory and organize them into a single folder
        
        Args:
            source_dir: Directory to search for images
            destination_folder: Target folder name (auto-generated if None)
            recursive: Search subdirectories
            move: Move files instead of copying
        
        Returns:
            dict with status, destination, and list of collected files
        """
        try:
            # Image extensions to search for
            image_extensions = {'.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg', '.ico', '.tiff', '.tif'}
            
            # Determine source path (support absolute paths)
            if os.path.isabs(source_dir):
                source_path = Path(source_dir)
            else:
                source_path = self.base_path / source_dir
            
            if not source_path.exists():
                return {"status": "error", "message": f"Source directory not found: {source_dir}"}
            
            if not source_path.is_dir():
                return {"status": "error", "message": f"Not a directory: {source_dir}"}
            
            # Create destination folder
            if destination_folder is None:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                destination_folder = f"Images_Collection_{timestamp}"
            
            # Determine destination path
            if os.path.isabs(source_dir):
                dest_path = source_path / destination_folder
            else:
                dest_path = self.base_path / source_dir / destination_folder
            
            dest_path.mkdir(parents=True, exist_ok=True)
            logger.info(f"📁 Created collection folder: {dest_path}")
            
            # Search for image files
            collected_files = []
            image_files = []
            
            logger.info(f"🔍 Searching for images in: {source_path}")

            try:
                # Use robust iteration instead of list comprehension to handle permission errors
                iterator = source_path.rglob('*') if recursive else source_path.glob('*')
                
                for f in iterator:
                    try:
                        if f.is_file() and f.suffix.lower() in image_extensions:
                            image_files.append(f)
                    except PermissionError:
                        # logger.warning(f"⚠️ Permission denied accessing: {f}") # Reduce spam
                        continue
                    except Exception as inner_e:
                        logger.warning(f"⚠️ Error accessing file {f}: {inner_e}")
                        continue
                        
            except Exception as e:
                 logger.error(f"❌ Critical error during glob iteration: {e}")
            
            # Collect images
            for img_file in image_files:
                # Skip files already in destination folder
                if dest_path in img_file.parents:
                    continue
                
                # Generate unique filename if conflict
                target_name = img_file.name
                target_path = dest_path / target_name
                counter = 1
                while target_path.exists():
                    stem = img_file.stem
                    suffix = img_file.suffix
                    target_name = f"{stem}_{counter}{suffix}"
                    target_path = dest_path / target_name
                    counter += 1
                
                # Copy or move file
                try:
                    if move:
                        shutil.move(str(img_file), str(target_path))
                        action = "Moved"
                    else:
                        shutil.copy2(str(img_file), str(target_path))
                        action = "Copied"
                    
                    collected_files.append({
                        "original": str(img_file.relative_to(source_path if not os.path.isabs(source_dir) else source_path)),
                        "destination": str(target_path.name),
                        "size": img_file.stat().st_size
                    })
                    logger.info(f"🖼️  {action}: {img_file.name} -> {destination_folder}/")
                except Exception as e:
                    logger.warning(f"Failed to collect {img_file.name}: {e}")
            
            if len(collected_files) == 0:
                # Remove empty folder if no files collected
                try:
                    dest_path.rmdir()
                except:
                    pass
                return {
                    "status": "info",
                    "message": f"No image files found in {source_dir}",
                    "searched_extensions": list(image_extensions)
                }
            
            logger.info(f"✅ Collected {len(collected_files)} images into {destination_folder}")
            
            return {
                "status": "success",
                "destination": str(dest_path),
                "files_collected": len(collected_files),
                "action": "moved" if move else "copied",
                "files": collected_files,
                "total_size": sum(f['size'] for f in collected_files)
            }
            
        except Exception as e:
            logger.error(f"Failed to collect images: {e}")
            return {"status": "error", "message": str(e)}

# For testing
if __name__ == "__main__":
    agent = FileOperationsAgent()
    
    # Test: List current directory
    result = agent.list_directory(".")
    print(f"✅ Listed {result.get('total')} items")
    
    # Test: Write file
    test_content = "# Test File\nHello from FileOperationsAgent"
    result = agent.write_file("test_file.md", test_content)
    print(f"✅ Write: {result.get('status')}")
    
    # Test: Read file
    result = agent.read_file("test_file.md")
    print(f"✅ Read: {len(result.get('content', ''))} chars")
    
    # Test: Execute safe command
    result = agent.execute_command("echo Hello Sage")
    print(f"✅ Execute: {result.get('stdout', '').strip()}")
