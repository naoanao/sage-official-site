import os
import re

def update_env_file(key: str, value: str, env_path: str = '.env'):
    """Updates or adds a key-value pair in the .env file."""
    if not os.path.exists(env_path):
        with open(env_path, 'w', encoding='utf-8') as f:
            f.write(f"{key}={value}\n")
        return

    with open(env_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    updated = False
    new_lines = []
    # Key should match start of line, allowing for optional spaces
    pattern = re.compile(f"^{re.escape(key)}\s*=")

    for line in lines:
        if pattern.match(line):
            new_lines.append(f"{key}={value}\n")
            updated = True
        else:
            new_lines.append(line)

    if not updated:
        # Add a newline if the last line doesn't have one
        if new_lines and not new_lines[-1].endswith('\n'):
            new_lines[-1] += '\n'
        new_lines.append(f"{key}={value}\n")

    with open(env_path, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
