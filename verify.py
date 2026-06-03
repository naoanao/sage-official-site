with open('SAGE_MASTER_CONTEXT.md', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines[135:145]):
    print(f"{i+135}: {line.strip()}")
