
import os
import shutil
import time
import logging
import threading
from pathlib import Path

logger = logging.getLogger(__name__)

class CacheManager:
    def __init__(self, cache_dir, max_size_mb=2048, target_size_mb=1536):
        """
        Initialize the CacheManager.
        :param cache_dir: Absolute path to the cache directory.
        :param max_size_mb: Threshold to trigger cleanup (default 2GB).
        :param target_size_mb: Target size after cleanup (default 1.5GB).
        """
        self.cache_dir = Path(cache_dir)
        self.max_size_mb = max_size_mb
        self.target_size_mb = target_size_mb
        self.lock = threading.Lock()

    def get_current_size_mb(self):
        total_size = 0
        if not self.cache_dir.exists():
            return 0
        try:
            for dirpath, dirnames, filenames in os.walk(self.cache_dir):
                for f in filenames:
                    fp = os.path.join(dirpath, f)
                    try:
                        total_size += os.path.getsize(fp)
                    except OSError:
                        pass
        except Exception as e:
            logger.error(f"[CacheManager] Error calculating size: {e}")
            return 0
            
        return total_size / (1024 * 1024)

    def clean_if_needed(self):
        """
        Checks cache size and cleans up oldest entries if limit is exceeded.
        This method is thread-safe.
        """
        with self.lock:
            current_size = self.get_current_size_mb()
            logger.info(f"[CacheManager] Checking cache: {self.cache_dir}")
            logger.info(f"[CacheManager] Current size: {current_size:.2f} MB (Limit: {self.max_size_mb} MB)")

            if current_size > self.max_size_mb:
                logger.info(f"[CacheManager] limit exceeded. Starting cleanup...")
                self._cleanup_oldest()
            else:
                logger.info("[CacheManager] Size within limits. No action needed.")

    def _cleanup_oldest(self):
        # Identify items (directories or files) in the root of cache_dir
        items = []
        try:
            for item in self.cache_dir.iterdir():
                try:
                    stats = item.stat()
                    # Use modification time
                    items.append((item, stats.st_mtime))
                except OSError:
                    pass
        except Exception as e:
            logger.error(f"[CacheManager] Error listing items: {e}")
            return

        # Sort: oldest mtime first
        items.sort(key=lambda x: x[1])

        # Delete until we are under target_size_mb
        # Note: Recalculating size after every delete is expensive.
        # We will estimate or just try to delete a chunk.
        # Better: Delete oldest 20% of items, then check?
        # Or just delete one by one until we think we are safe?
        
        # Let's verify size after every delete for safety, but maybe optimized?
        
        for item_path, mtime in items:
            if self.get_current_size_mb() < self.target_size_mb:
                logger.info(f"[CacheManager] Target size reached ({self.target_size_mb} MB). Stopping cleanup.")
                break
            
            try:
                if item_path.is_dir():
                    shutil.rmtree(item_path)
                else:
                    item_path.unlink()
                logger.info(f"[CacheManager] Deleted: {item_path.name}")
            except Exception as e:
                logger.warning(f"[CacheManager] Failed to delete {item_path.name}: {e}")

        final_size = self.get_current_size_mb()
        logger.info(f"[CacheManager] Cleanup finished. Final size: {final_size:.2f} MB")

    def start_auto_cleaner(self, interval_hours=6):
        """Starts a background thread to clean periodically."""
        thread = threading.Thread(target=self._auto_clean_loop, args=(interval_hours,), daemon=True)
        thread.start()
        logger.info(f"[CacheManager] Auto-cleaner started (Interval: {interval_hours}h)")

    def _auto_clean_loop(self, interval_hours):
        while True:
            try:
                self.clean_if_needed()
            except Exception as e:
                logger.error(f"[CacheManager] Auto-cleaner loop error: {e}")
            
            # Sleep for interval
            time.sleep(interval_hours * 3600)

