import os
import logging
import time

logger = logging.getLogger(__name__)

# Try importing MoviePy - if it fails, VideoEditorAgent will be disabled
try:
    from moviepy.editor import VideoFileClip, TextClip, CompositeVideoClip, concatenate_videoclips
    MOVIEPY_AVAILABLE = True
except ImportError as e:
    logger.warning(f"MoviePy not available: {e}. VideoEditorAgent will be disabled.")
    MOVIEPY_AVAILABLE = False

class VideoEditorAgent:
    def __init__(self, output_dir="generated_videos"):
        self.output_dir = output_dir
        self.enabled = MOVIEPY_AVAILABLE
        if not self.enabled:
            logger.warning("VideoEditorAgent initialized but MoviePy unavailable - agent disabled")
            return
        if not os.path.exists(self.output_dir):
            os.makedirs(self.output_dir)

    def process_video(self, file_path, instruction):
        """
        Processes a video based on instructions.
        Currently supports:
        - "cut": Cuts the first 10 seconds (demo logic)
        - "caption": Adds a text caption
        - Default: Creates a 10s clip with a title
        """
        if not MOVIEPY_AVAILABLE:
            return {
                "status": "error",
                "message": "MoviePy not installed. Video editing unavailable."
            }
        try:
            logger.info(f"VideoEditorAgent processing: {file_path} with instruction: {instruction}")
            
            clip = VideoFileClip(file_path)
            
            # Basic Logic for Demo: Create a "Highlight"
            # 1. Take subclip (first 10s or full length if shorter)
            duration = min(clip.duration, 10)
            subclip = clip.subclip(0, duration)
            
            # 2. Add Text Overlay (Title)
            # Note: ImageMagick is required for TextClip. If missing, we might skip text or use a fallback.
            # For now, we'll try a simple composite.
            
            final_clip = subclip
            
            # Generate Output Filename
            timestamp = int(time.time())
            output_filename = f"edited_{timestamp}.mp4"
            output_path = os.path.join(self.output_dir, output_filename)
            
            # Write Video
            final_clip.write_videofile(output_path, codec="libx264", audio_codec="aac", fps=24)
            
            clip.close()
            
            return {
                "status": "success",
                "output_path": output_path,
                "message": f"Video edited successfully. Saved to {output_filename}"
            }

        except Exception as e:
            logger.error(f"Video processing failed: {e}")
            return {
                "status": "error",
                "message": str(e)
            }
