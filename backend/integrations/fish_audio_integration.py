"""
Fish Audio Integration
Voice cloning and text-to-speech narration using Fish Audio API (Direct HTTP)
"""
import os
import logging
import requests
from pathlib import Path
from typing import Optional, Dict, List
import time

logger = logging.getLogger(__name__)

class FishAudioIntegration:
    """
    Fish Audio API統合（Direct HTTP）
    
    機能:
    - テキスト→音声生成（ナレーション）
    - 音声クローン（リファレンス音声から即時生成）
    - MP3ファイル出力
    """
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize Fish Audio Integration
        
        Args:
            api_key: Fish Audio API key
        """
        self.api_key = api_key or os.getenv('FISH_AUDIO_API_KEY') or os.getenv('FISH_API_KEY')
        self.base_url = "https://api.fish.audio/v1"
        self.output_dir = Path("generated_audio")
        self.output_dir.mkdir(exist_ok=True)
        
        self.enabled = bool(self.api_key)
        if self.enabled:
            logger.info("🐟 Fish Audio initialized (Direct API)")
        else:
            logger.warning("🐟 Fish Audio API key not found")
    
    def generate_narration(self, text: str, reference_audio: Optional[str] = None,
                          reference_text: Optional[str] = None,
                          output_filename: Optional[str] = None) -> Dict:
        """
        Generate narration from text
        
        Args:
            text: Text to convert to speech
            reference_audio: Path to reference audio for voice cloning
            reference_text: Text of reference audio (optional)
            output_filename: Custom output filename
        
        Returns:
            dict with status, path, duration
        """
        if not self.enabled:
            logger.error("🐟 Fish Audio not enabled")
            return {"status": "error", "message": "Fish Audio not enabled"}
        
        logger.info(f"🐟 Generating narration ({len(text)} chars)")
        
        try:
            headers = {
                'Authorization': f'Bearer {self.api_key}',
            }
            
            # Build request
            data = {
                'text': text,
                'format': 'mp3',
            }
            
            # Add reference audio if provided (instant voice cloning)
            files = None
            if reference_audio and os.path.exists(reference_audio):
                logger.info(f"🎙️  Using reference audio: {reference_audio}")
                with open(reference_audio, 'rb') as f:
                    files = {
                        'reference': f,
                    }
                    if reference_text:
                        data['reference_text'] = reference_text
                    
                    # POST request with file upload
                    response = requests.post(
                        f"{self.base_url}/tts",
                        headers=headers,
                        data=data,
                        files=files,
                        timeout=60
                    )
            else:
                # POST request without file
                response = requests.post(
                    f"{self.base_url}/tts",
                    headers=headers,
                    json=data,
                    timeout=60
                )
            
            if response.status_code == 200:
                # Save audio file
                if not output_filename:
                    output_filename = f"narration_{int(time.time())}.mp3"
                
                output_path = self.output_dir / output_filename
                
                with open(output_path, 'wb') as f:
                    f.write(response.content)
                
                logger.info(f"✅ Narration saved: {output_path}")
                
                return {
                    'status': 'success',
                    'path': str(output_path),
                    'filename': output_filename,
                    'text_length': len(text),
                    'has_cloned_voice': reference_audio is not None,
                    'size_bytes': len(response.content)
                }
            else:
                error_msg = f"TTS failed: {response.status_code} - {response.text}"
                logger.error(error_msg)
                return {"status": "error", "message": error_msg}
                
        except Exception as e:
            logger.error(f"🐟 Narration generation error: {e}", exc_info=True)
            return {"status": "error", "message": str(e)}
    
    def generate_course_narrations(self, sections: List[Dict], 
                                   reference_audio: Optional[str] = None,
                                   reference_text: Optional[str] = None) -> List[Dict]:
        """
        Generate narrations for all course sections
        
        Args:
            sections: List of section dicts with 'title' and 'content'
            reference_audio: Path to reference audio for voice cloning
            reference_text: Text of reference audio
        
        Returns:
            list of narration results
        """
        narrations = []
        
        for i, section in enumerate(sections, 1):
            logger.info(f"🎙️  Generating narration {i}/{len(sections)}: {section.get('title')}")
            
            # Combine title and content for narration
            full_text = f"{section.get('title')}. {section.get('content')}"
            
            result = self.generate_narration(
                text=full_text,
                reference_audio=reference_audio,
                reference_text=reference_text,
                output_filename=f"section_{i:02d}.mp3"
            )
            
            narrations.append({
                'section': i,
                'title': section.get('title'),
                **result
            })
            
            # Rate limiting (avoid API throttling)
            if i < len(sections):
                time.sleep(1)
        
        logger.info(f"✅ Generated {len(narrations)} narrations")
        return narrations

# For testing
if __name__ == "__main__":
    import sys
    
    fish = FishAudioIntegration()
    
    if not fish.enabled:
        print("❌ Fish Audio not enabled")
        print(f"   API key: {'SET' if fish.api_key else 'MISSING'}")
        sys.exit(1)
    
    print("✅ Fish Audio initialized")
    
    # Test basic TTS
    test_text = "Hello! This is a test of Fish Audio text to speech integration using direct HTTP API."
    result = fish.generate_narration(test_text)
    
    if result and result.get('status') == 'success':
        print(f"✅ Test narration created: {result['path']}")
        print(f"   Size: {result.get('size_bytes', 0)} bytes")
    else:
        print(f"❌ Test failed: {result.get('message')}")


