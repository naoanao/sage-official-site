import os
import sys
from crewai import Agent, Task, Crew, Process, LLM
from langchain.tools import tool

# Set dummy API key for Ollama
os.environ["OPENAI_API_KEY"] = "NA"

# Import existing agents
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
from backend.modules.image_agent import ImageAgent
from backend.modules.video_agent import VideoAgent
from backend.automation.twitter_automation import TwitterAutomation

# --- Tool Definitions ---

class SageTools:
    @tool("Generate Image")
    def generate_image(prompt: str):
        """Generates an image based on the prompt. Returns the file path."""
        agent = ImageAgent()
        result = agent.generate_image(prompt)
        if result['status'] == 'success':
            return result['path']
        else:
            return f"Error: {result['message']}"

    @tool("Create Video")
    def create_video(image_paths_str: str):
        """Creates a video from a list of image paths (comma separated string). Returns the video path."""
        # CrewAI often passes lists as strings, so we parse it
        if "," in image_paths_str:
            image_paths = [p.strip() for p in image_paths_str.split(",")]
        else:
            image_paths = [image_paths_str.strip()]
            
        agent = VideoAgent()
        # Create a unique filename
        import time
        filename = f"video_{int(time.time())}.mp4"
        result = agent.create_slideshow(image_paths, filename)
        if result['status'] == 'success':
            return result['path']
        else:
            return f"Error: {result['message']}"

    @tool("Post to Twitter")
    def post_to_twitter(text: str, image_path: str = None):
        """Posts a tweet with optional image. Returns the tweet URL."""
        agent = TwitterAutomation()
        # Handle "None" string from LLM
        if image_path == "None" or image_path == "":
            image_path = None
            
        result = agent.post_tweet(text, image_path)
        if result['success']:
            return result['url']
        else:
            return f"Error: {result.get('error')}"

# --- Orchestrator Class ---

class CrewAIOrchestrator:
    def __init__(self):
        # Configure LLM (Ollama) using native CrewAI LLM
        self.llm = LLM(
            model="ollama/qwen2.5:7b",
            base_url="http://localhost:11434"
        )

    def run_mission(self, user_request):
        """
        Runs the CrewAI mission based on the user request.
        """
        # --- Agents ---
        
        # 1. Creative Director (Plans the content)
        director = Agent(
            role='Creative Director',
            goal='Plan engaging content based on user requests.',
            backstory='You are a visionary creative director who knows what goes viral.',
            llm=self.llm,
            verbose=True,
            allow_delegation=True
        )

        # 2. Content Creator (Generates assets)
        creator = Agent(
            role='Content Creator',
            goal='Generate high-quality images and videos.',
            backstory='You are a digital artist and video editor.',
            tools=[SageTools.generate_image, SageTools.create_video],
            llm=self.llm,
            verbose=True
        )

        # 3. Social Media Manager (Posts content)
        social_manager = Agent(
            role='Social Media Manager',
            goal='Post content to social media to maximize engagement.',
            backstory='You are a social media expert who knows how to write catchy captions.',
            tools=[SageTools.post_to_twitter],
            llm=self.llm,
            verbose=True
        )

        # --- Tasks ---

        task1 = Task(
            description=f"Analyze the request: '{user_request}'. Plan the visual assets needed (e.g., an image of X). Define the prompt for the image.",
            agent=director,
            expected_output="A detailed plan with image prompts."
        )

        task2 = Task(
            description="Generate the image using the prompt from the Director. Then, if a video is requested, create a video from it. Return the file paths.",
            agent=creator,
            expected_output="File paths of the generated image and/or video."
        )

        task3 = Task(
            description="Write a catchy tweet about the content. Post the generated image (using the path from the previous task) to Twitter.",
            agent=social_manager,
            expected_output="The URL of the posted tweet."
        )

        # --- Crew ---
        crew = Crew(
            agents=[director, creator, social_manager],
            tasks=[task1, task2, task3],
            process=Process.sequential,
            verbose=True
        )

        result = crew.kickoff()
        return result

if __name__ == "__main__":
    print("🚀 Starting CrewAI Test...")
    orch = CrewAIOrchestrator()
    res = orch.run_mission("Generate a cyberpunk city image and post it to Twitter saying 'Hello Future!'")
    print(f"✅ Result: {res}")
