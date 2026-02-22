import json
import random
import time
import os

class EvolutionEngine:
    def __init__(self, db_path="backend/data/strategies.json"):
        self.db_path = db_path
        self.hooks = [
            "Secret hack:", "Nobody tells you this:", "Game changer:", "My honest advice:", 
            "Don't ignore this:", "The truth about {problem}:", "How to win at {problem}:"
        ]
        self.closers = [
            "Link in bio.", "Get it now: {link}", "Try it free: {link}", "Full guide here: {link}", 
            "Steal my workflow: {link}", "Don't miss out: {link}"
        ]
        self.structures = [
            "{hook} You can {benefit} by using {product}. {closer}",
            "If you want to {benefit}, you need to stop {problem}. {product} fixes this. {closer}",
            "Why is everyone struggling with {problem}? I used {product} and it changed everything. {closer}",
            "{hook} {product} is the best way to {benefit}. Stop {problem} today. {closer}"
        ]

    def load_strategies(self):
        if not os.path.exists(self.db_path):
            return {}
        try:
            with open(self.db_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except:
            return {}

    def save_strategies(self, data):
        with open(self.db_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4, ensure_ascii=False)

    def evolve(self):
        """Generates a new template and adds it to a random category."""
        data = self.load_strategies()
        if not data:
            print("[🧬 EVOLUTION] ❌ Database not found.")
            return

        # Pick a random category to upgrade
        category = random.choice(list(data.keys()))
        
        # Generate new template
        hook = random.choice(self.hooks)
        closer = random.choice(self.closers)
        structure = random.choice(self.structures)
        
        new_template = structure.format(hook=hook, closer=closer, benefit="{benefit}", product="{product}", problem="{problem}", link="{link}")
        
        # Add to database
        if new_template not in data[category]["templates"]:
            data[category]["templates"].append(new_template)
            self.save_strategies(data)
            print(f"[🧬 EVOLUTION] 🧠 Learned new {category.upper()} strategy: '{new_template[:50]}...'")
            return True
        return False

if __name__ == "__main__":
    engine = EvolutionEngine()
    engine.evolve()
