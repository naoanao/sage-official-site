import os
import logging
import cv2
import numpy as np
from typing import List
from PIL import Image, ImageDraw, ImageFont

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class VideoAgent:
    def __init__(self, output_dir="generated_videos"):
        self.output_dir = os.path.join(os.getcwd(), output_dir)
        os.makedirs(self.output_dir, exist_ok=True)

    def create_slideshow(self, image_paths, output_filename="slideshow.mp4", duration_per_slide=3, fps=30):
        """
        Creates a video slideshow from a list of image paths.
        """
        if not image_paths:
            logger.error("No image paths provided.")
            return {"status": "error", "message": "No images provided"}

        output_path = os.path.join(self.output_dir, output_filename)
        logger.info(f"Creating slideshow at: {output_path}")
        print(f"DEBUG: VideoAgent.create_slideshow called. Output: {output_path}")

        try:
            # 1. Determine Video Dimensions from the first image
            first_img = Image.open(image_paths[0])
            width, height = first_img.size
            # Ensure even dimensions for some codecs
            if width % 2 != 0: width -= 1
            if height % 2 != 0: height -= 1
            
            # 2. Initialize Video Writer
            # Try 'mp4v' for MP4. If it fails, fallback to 'MJPG' for AVI.
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
            
            if not out.isOpened():
                logger.warning("mp4v codec failed, falling back to MJPG (.avi)")
                output_path = output_path.replace(".mp4", ".avi")
                fourcc = cv2.VideoWriter_fourcc(*'MJPG')
                out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

            # 3. Write Frames
            for img_path in image_paths:
                try:
                    img = Image.open(img_path).resize((width, height))
                    # Convert to OpenCV format (BGR)
                    frame = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
                    
                    # Write the same frame for 'duration_per_slide' seconds
                    for _ in range(int(fps * duration_per_slide)):
                        out.write(frame)
                except Exception as e:
                    logger.error(f"Failed to process image {img_path}: {e}")
                    continue

            out.release()
            logger.info("Video generation complete.")
            return {"status": "success", "path": output_path}

        except Exception as e:
            logger.error(f"Video generation failed: {e}", exc_info=True)
            return {"status": "error", "message": str(e)}

    def create_video_from_script(self, script: str, image_paths: List[str], output_filename: str = "script_video.mp4"):
        """
        Creates a video combining images and (future) audio from script.
        For now, it creates a slideshow with the images.
        """
        logger.info("Creating video from script and images...")
        # TODO: Integrate gTTS here to generate audio from 'script'
        # audio_path = self.generate_audio(script)
        
        return self.create_slideshow(image_paths, output_filename)

if __name__ == "__main__":
    # Self-test if run directly
    print("Running VideoAgent self-test...")
    agent = VideoAgent()
    
    # Create dummy images
    dummy_images = []
    colors = [(255, 0, 0), (0, 255, 0), (0, 0, 255)]
    for i, color in enumerate(colors):
        img = Image.new('RGB', (640, 480), color)
        d = ImageDraw.Draw(img)
        d.text((10, 10), f"Slide {i+1}", fill=(255, 255, 255))
        path = f"dummy_{i}.png"
        img.save(path)
        dummy_images.append(path)
    
    # Generate video
    result = agent.create_slideshow(dummy_images, "test_video.mp4")
    print(f"Result: {result}")
    
    # Cleanup
    for p in dummy_images:
        if os.path.exists(p):
            os.remove(p)
