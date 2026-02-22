import os
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

class FlutterAgent:
    """
    Agente creating Flutter apps by generating file structures and code directly.
    Used when 'flutter create' CLI is not available.
    """
    def __init__(self, base_dir="C:/Users/nao/Desktop/Sage_Final_Unified/generated_apps"):
        self.base_dir = Path(base_dir)
        if not self.base_dir.exists():
            self.base_dir.mkdir(parents=True, exist_ok=True)

    def create_project(self, project_name: str) -> dict:
        """
        Creates a new Flutter project structure.
        """
        try:
            project_path = self.base_dir / project_name
            if project_path.exists():
                return {"status": "error", "message": f"Project '{project_name}' already exists at {project_path}"}

            # Create directories
            (project_path / "lib").mkdir(parents=True, exist_ok=True)
            (project_path / "test").mkdir(parents=True, exist_ok=True)
            (project_path / "android").mkdir(parents=True, exist_ok=True)
            (project_path / "ios").mkdir(parents=True, exist_ok=True)
            (project_path / "web").mkdir(parents=True, exist_ok=True)

            # Create pubspec.yaml
            self._create_pubspec(project_path, project_name)
            
            # Create main.dart
            self._create_main_dart(project_path, project_name)

            # Create README.md
            (project_path / "README.md").write_text(f"# {project_name}\n\nA new Flutter project created by Sage AI.")

            logger.info(f"✅ Flutter project '{project_name}' created at {project_path}")
            return {
                "status": "success",
                "message": f"Created Flutter project '{project_name}'",
                "path": str(project_path)
            }

        except Exception as e:
            logger.error(f"Failed to create Flutter project: {e}")
            return {"status": "error", "message": str(e)}

    def generate_screen(self, project_name: str, screen_name: str, description: str = "") -> dict:
        """
        Generates a new screen file in lib/screens/
        """
        try:
            project_path = self.base_dir / project_name
            if not project_path.exists():
                return {"status": "error", "message": f"Project '{project_name}' not found."}

            screens_dir = project_path / "lib" / "screens"
            screens_dir.mkdir(exist_ok=True)

            file_name = f"{screen_name.lower().replace(' ', '_')}.dart"
            class_name = screen_name.replace(" ", "").replace("_", "") + "Screen"

            code = f"""import 'package:flutter/material.dart';

class {class_name} extends StatelessWidget {{
  const {class_name}({{super.key}});

  @override
  Widget build(BuildContext context) {{
    return Scaffold(
      appBar: AppBar(
        title: const Text('{screen_name}'),
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text(
              'This is the {screen_name}',
              style: TextStyle(fontSize: 24),
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: () {{
                // TODO: Implement action
              }},
              child: const Text('Action'),
            ),
          ],
        ),
      ),
    );
  }}
}}
"""
            (screens_dir / file_name).write_text(code)
            logger.info(f"✅ Generated screen {file_name} in {project_name}")
            
            return {
                "status": "success",
                "message": f"Generated screen '{screen_name}'",
                "path": str(screens_dir / file_name)
            }

        except Exception as e:
            logger.error(f"Failed to generate screen: {e}")
            return {"status": "error", "message": str(e)}

    def _create_pubspec(self, path: Path, name: str):
        content = f"""name: {name}
description: A new Flutter project.
publish_to: 'none'
version: 1.0.0+1

environment:
  sdk: '>=3.2.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter
  cupertino_icons: ^1.0.2

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^2.0.0

flutter:
  uses-material-design: true
"""
        (path / "pubspec.yaml").write_text(content)

    def _create_main_dart(self, path: Path, name: str):
        content = f"""import 'package:flutter/material.dart';

void main() {{
  runApp(const MyApp());
}}

class MyApp extends StatelessWidget {{
  const MyApp({{super.key}});

  @override
  Widget build(BuildContext context) {{
    return MaterialApp(
      title: '{name}',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
        useMaterial3: true,
      ),
      home: const MyHomePage(title: '{name} Home Page'),
    );
  }}
}}

class MyHomePage extends StatefulWidget {{
  const MyHomePage({{super.key, required this.title}});
  final String title;

  @override
  State<MyHomePage> createState() => _MyHomePageState();
}}

class _MyHomePageState extends State<MyHomePage> {{
  int _counter = 0;

  void _incrementCounter() {{
    setState(() {{
      _counter++;
    }});
  }}

  @override
  Widget build(BuildContext context) {{
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
        title: Text(widget.title),
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: <Widget>[
            const Text(
              'You have pushed the button this many times:',
            ),
            Text(
              '$_counter',
              style: Theme.of(context).textTheme.headlineMedium,
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _incrementCounter,
        tooltip: 'Increment',
        child: const Icon(Icons.add),
      ),
    );
  }}
}}
"""
        (path / "lib" / "main.dart").write_text(content)
