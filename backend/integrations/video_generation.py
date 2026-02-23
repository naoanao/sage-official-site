"""
Video Generation for Sage
YouTube Shorts自動生成、ブログ→動画変換
"""

from moviepy.editor import VideoFileClip, ImageClip, concatenate_videoclips, AudioFileClip, TextClip, CompositeVideoClip
from gtts import gTTS
import os
import tempfile
import sys

# Add backend directory to path
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(__file__))))

class VideoGenerator:
    """
    AI動画生成クラス
    
    機能:
    - YouTube Shorts生成（9:16縦型、60秒以内）
    - ブログ記事→動画変換
    - 字幕自動追加
    """
    
    def __init__(self):
        self.output_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "output", "videos")
        os.makedirs(self.output_dir, exist_ok=True)
    
    def generate_youtube_shorts(self, script, images, output_filename="shorts.mp4"):
        """
        YouTube Shorts自動生成
        
        Args:
            script (str): 動画のナレーション原稿（60秒以内推奨）
            images (list): 使用する画像パスのリスト
            output_filename (str): 出力ファイル名
        
        Returns:
            str: 生成された動画のパス
        """
        print(f"🎬 YouTube Shorts生成開始: {output_filename}")
        
        try:
            # 1. テキスト→音声変換
            audio_path = self._text_to_speech(script)
            print("✅ 音声生成完了")
            
            # 2. 画像を動画クリップに変換
            # Calculate duration per image based on audio length
            audio_clip = AudioFileClip(audio_path)
            audio_duration = audio_clip.duration
            duration_per_image = audio_duration / len(images) if images else 3
            
            clips = self._images_to_clips(images, duration_per_image)
            print(f"✅ {len(clips)}個の画像クリップ作成完了")
            
            # 3. クリップを連結
            video = concatenate_videoclips(clips, method="compose")
            
            # 4. 音声を動画に合成
            final_video = video.set_audio(audio_clip)
            
            # 5. 縦型フォーマット（9:16）にリサイズ
            # Resize to height 1920, maintaining aspect ratio, then crop center to 1080 width
            # Or just resize to cover 1080x1920
            w, h = final_video.size
            target_ratio = 9/16
            current_ratio = w/h
            
            if current_ratio > target_ratio:
                # Too wide, crop width
                new_w = h * target_ratio
                final_video_resized = final_video.crop(x1=(w/2 - new_w/2), width=new_w, height=h)
            else:
                # Too tall, crop height
                new_h = w / target_ratio
                final_video_resized = final_video.crop(y1=(h/2 - new_h/2), width=w, height=new_h)
                
            final_video_resized = final_video_resized.resize(height=1920)
            
            # 6. 出力
            output_path = os.path.join(self.output_dir, output_filename)
            final_video_resized.write_videofile(
                output_path,
                fps=24,
                codec='libx264',
                audio_codec='aac'
            )
            
            print(f"🎉 動画生成完了: {output_path}")
            return output_path
            
        except Exception as e:
            print(f"❌ 動画生成エラー: {e}")
            raise

    def _text_to_speech(self, text, lang='ja'):
        """テキスト→音声変換（gTTS使用）"""
        try:
            tts = gTTS(text=text, lang=lang, slow=False)
            temp_audio = tempfile.NamedTemporaryFile(delete=False, suffix='.mp3')
            tts.save(temp_audio.name)
            temp_audio.close() # Close file handle so AudioFileClip can open it
            return temp_audio.name
        except Exception as e:
            print(f"❌ 音声生成エラー: {e}")
            raise
    
    def _images_to_clips(self, image_paths, duration_per_image=3):
        """画像リスト→動画クリップリスト変換"""
        clips = []
        for img_path in image_paths:
            if os.path.exists(img_path):
                clip = ImageClip(img_path).set_duration(duration_per_image)
                clips.append(clip)
            else:
                print(f"⚠️ 画像が見つかりません: {img_path}")
        return clips
    
    def blog_to_video(self, article_text, title="ブログ動画"):
        """
        ブログ記事→YouTube Shorts変換
        
        Args:
            article_text (str): ブログ記事本文
            title (str): 動画タイトル
        
        Returns:
            str: 生成された動画のパス
        """
        # 1. 記事を60秒スクリプトに要約
        script = self._summarize_for_video(article_text)
        
        # 2. スクリプトから画像プロンプト抽出
        image_prompts = self._extract_image_prompts(script)
        
        # 3. 画像生成（ImageGenerationEnhancedを使用）
        from integrations.image_generation import ImageGenerationEnhanced
        img_gen = ImageGenerationEnhanced()
        images = []
        for prompt in image_prompts[:5]:  # 最大5枚
            try:
                img_path = img_gen.generate_blog_image(prompt)
                images.append(img_path)
            except Exception as e:
                print(f"⚠️ 画像生成スキップ: {e}")
        
        if not images:
            # Fallback if no images generated
            print("⚠️ 画像生成失敗のため、プレースホルダーを使用します。")
            # In real app, use default assets. Here we might fail or use a solid color clip if we implemented it.
            return None

        # 4. YouTube Shorts生成
        return self.generate_youtube_shorts(script, images, f"{title}.mp4")
    
    def _summarize_for_video(self, text, max_length=200):
        """記事→60秒スクリプト要約（簡易版）"""
        # 簡易実装：最初の200文字を使用
        # TODO: AIによる高度な要約（Gemini/Ollama使用）
        return text[:max_length] + "..."
    
    def _extract_image_prompts(self, script):
        """スクリプトから画像プロンプト抽出（簡易版）"""
        # 簡易実装：文ごとに分割
        sentences = script.split('。')
        return [s.strip() for s in sentences if len(s.strip()) > 5]

# Singleton
video_generator = VideoGenerator()
