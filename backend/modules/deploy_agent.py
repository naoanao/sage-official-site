import os
import subprocess
import logging
from datetime import datetime

logger = logging.getLogger("DeployAgent")

class DeployAgent:
    """
    Handles autonomous deployment from Local Brain to Web/Domain.
    """
    def __init__(self, project_root=None):
        self.project_root = project_root or os.getcwd()

    def publish_blog(self, title: str, content: str, category: str = "Sage Update"):
        """
        1. Formats MDX
        2. Writes to src/blog/posts/
        3. Runs Git Push
        """
        try:
            # Format Slug
            slug = title.lower().replace(" ", "-").replace("/", "-")
            # Scrub invalid chars
            slug = "".join([c for c in slug if c.isalnum() or c == "-"])
            
            mdx_content = f"""---
title: "{title}"
date: "{datetime.now().strftime("%Y-%m-%d")}"
category: "{category}"
---

{content}
"""
            post_dir = os.path.join(self.project_root, "src", "blog", "posts")
            os.makedirs(post_dir, exist_ok=True)
            post_path = os.path.join(post_dir, f"{slug}.mdx")
            
            with open(post_path, 'w', encoding='utf-8') as f:
                f.write(mdx_content)
            
            logger.info(f"MDX written to {post_path}")
            
            # Git Push
            cmd = "git add . && git commit -m 'feat: auto-blog-post' && git push origin main"
            res = subprocess.run(cmd, shell=True, capture_output=True, text=True, cwd=self.project_root)
            
            return {
                "status": "success" if res.returncode == 0 else "warning",
                "path": post_path,
                "git_output": res.stdout or res.stderr,
                "message": "Published successfully" if res.returncode == 0 else "MDX saved but Git Push failed"
            }
        except Exception as e:
            logger.error(f"Publish failed: {e}")
            return {"status": "error", "message": str(e)}

    def deploy_to_web(self):
        """Runs a general sync/deploy"""
        cmd = "git push origin main"
        res = subprocess.run(cmd, shell=True, capture_output=True, text=True, cwd=self.project_root)
        return res.stdout or res.stderr
